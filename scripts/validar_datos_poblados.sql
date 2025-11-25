-- =========================================================================
-- SCRIPT: Validación de Datos Poblados - ERP-777 V01
-- =========================================================================
-- Propósito: Validar la coherencia de los datos generados por poblar_datos_2024_2025.mjs
-- Fecha: 11 Nov 2025
-- =========================================================================

-- ========================================
-- 1. ESTADÍSTICAS GENERALES
-- ========================================

SELECT '=== ESTADÍSTICAS GENERALES ===' as seccion;

-- Total de eventos por año
SELECT
    'Eventos por año' as metrica,
    EXTRACT(YEAR FROM fecha_evento) as anio,
    COUNT(*) as total
FROM evt_eventos
WHERE deleted_at IS NULL
GROUP BY EXTRACT(YEAR FROM fecha_evento)
ORDER BY anio;

-- Total de ingresos y gastos
SELECT
    'Totales globales' as metrica,
    (SELECT COUNT(*) FROM evt_eventos WHERE deleted_at IS NULL) as eventos,
    (SELECT COUNT(*) FROM evt_ingresos WHERE deleted_at IS NULL) as ingresos,
    (SELECT COUNT(*) FROM evt_gastos WHERE deleted_at IS NULL) as gastos;

-- ========================================
-- 2. VALIDACIÓN DE CANTIDADES POR EVENTO
-- ========================================

SELECT '=== VALIDACIÓN DE CANTIDADES ===' as seccion;

-- Verificar que cada evento tenga exactamente 8 ingresos
SELECT
    'Ingresos por evento' as validacion,
    COUNT(DISTINCT e.id) as eventos_total,
    COUNT(DISTINCT CASE WHEN ingreso_count = 8 THEN e.id END) as eventos_con_8_ingresos,
    COUNT(DISTINCT CASE WHEN ingreso_count != 8 THEN e.id END) as eventos_incorrectos
FROM evt_eventos e
LEFT JOIN (
    SELECT evento_id, COUNT(*) as ingreso_count
    FROM evt_ingresos
    WHERE deleted_at IS NULL
    GROUP BY evento_id
) i ON e.id = i.evento_id
WHERE e.deleted_at IS NULL;

-- Verificar que cada evento tenga exactamente 8 gastos
SELECT
    'Gastos por evento' as validacion,
    COUNT(DISTINCT e.id) as eventos_total,
    COUNT(DISTINCT CASE WHEN gasto_count = 8 THEN e.id END) as eventos_con_8_gastos,
    COUNT(DISTINCT CASE WHEN gasto_count != 8 THEN e.id END) as eventos_incorrectos
FROM evt_eventos e
LEFT JOIN (
    SELECT evento_id, COUNT(*) as gasto_count
    FROM evt_gastos
    WHERE deleted_at IS NULL
    GROUP BY evento_id
) g ON e.id = g.evento_id
WHERE e.deleted_at IS NULL;

-- ========================================
-- 3. VALIDACIÓN DE UTILIDADES (30-40%)
-- ========================================

SELECT '=== VALIDACIÓN DE UTILIDADES ===' as seccion;

-- Verificar margen real entre 28-42% (±2% de tolerancia)
SELECT
    'Utilidad real' as metrica,
    COUNT(*) as total_eventos,
    COUNT(CASE WHEN margen_real_pct BETWEEN 28 AND 42 THEN 1 END) as dentro_rango,
    COUNT(CASE WHEN margen_real_pct < 28 THEN 1 END) as debajo_28,
    COUNT(CASE WHEN margen_real_pct > 42 THEN 1 END) as arriba_42,
    ROUND(AVG(margen_real_pct), 2) as promedio_margen,
    ROUND(MIN(margen_real_pct), 2) as min_margen,
    ROUND(MAX(margen_real_pct), 2) as max_margen
FROM vw_eventos_analisis_financiero
WHERE ingresos_cobrados > 0;

-- ========================================
-- 4. VALIDACIÓN DE DISTRIBUCIÓN DE GASTOS
-- ========================================

SELECT '=== DISTRIBUCIÓN DE GASTOS POR CATEGORÍA ===' as seccion;

-- Gastos por categoría
SELECT
    c.nombre as categoria,
    COUNT(g.id) as total_gastos,
    ROUND(SUM(g.total), 2) as monto_total,
    ROUND(AVG(g.total), 2) as promedio_gasto,
    COUNT(CASE WHEN g.pagado THEN 1 END) as gastos_pagados,
    ROUND(COUNT(CASE WHEN g.pagado THEN 1 END)::numeric / COUNT(g.id) * 100, 1) as pct_pagado
FROM evt_gastos g
JOIN evt_categorias_gastos c ON g.categoria_id = c.id
WHERE g.deleted_at IS NULL
GROUP BY c.id, c.nombre
ORDER BY c.id;

-- ========================================
-- 5. VALIDACIÓN DE INGRESOS COBRADOS
-- ========================================

SELECT '=== DISTRIBUCIÓN DE INGRESOS ===' as seccion;

-- Análisis de cobros
SELECT
    'Ingresos cobrados' as metrica,
    COUNT(*) as total_ingresos,
    COUNT(CASE WHEN cobrado THEN 1 END) as ingresos_cobrados,
    ROUND(COUNT(CASE WHEN cobrado THEN 1 END)::numeric / COUNT(*) * 100, 1) as pct_cobrado,
    ROUND(SUM(total), 2) as monto_total_ingresos,
    ROUND(SUM(CASE WHEN cobrado THEN total ELSE 0 END), 2) as monto_cobrado
FROM evt_ingresos
WHERE deleted_at IS NULL;

-- ========================================
-- 6. VALIDACIÓN DE FECHAS
-- ========================================

SELECT '=== VALIDACIÓN DE FECHAS ===' as seccion;

-- Verificar coherencia de fechas
SELECT
    'Fechas coherentes' as validacion,
    COUNT(*) as total_ingresos,
    COUNT(CASE WHEN cobrado AND fecha_cobro IS NOT NULL THEN 1 END) as con_fecha_cobro,
    COUNT(CASE WHEN cobrado AND fecha_cobro IS NULL THEN 1 END) as cobrados_sin_fecha,
    COUNT(CASE WHEN NOT cobrado AND fecha_cobro IS NOT NULL THEN 1 END) as no_cobrados_con_fecha
FROM evt_ingresos
WHERE deleted_at IS NULL;

SELECT
    'Fechas gastos' as validacion,
    COUNT(*) as total_gastos,
    COUNT(CASE WHEN pagado AND fecha_pago IS NOT NULL THEN 1 END) as con_fecha_pago,
    COUNT(CASE WHEN pagado AND fecha_pago IS NULL THEN 1 END) as pagados_sin_fecha,
    COUNT(CASE WHEN NOT pagado AND fecha_pago IS NOT NULL THEN 1 END) as no_pagados_con_fecha
FROM evt_gastos
WHERE deleted_at IS NULL;

-- ========================================
-- 7. VALIDACIÓN DE PROVISIONES
-- ========================================

SELECT '=== VALIDACIÓN DE PROVISIONES ===' as seccion;

-- Verificar que provisiones sumen correctamente
SELECT
    'Provisiones' as metrica,
    COUNT(*) as total_eventos,
    ROUND(AVG(provision_combustible_peaje + provision_materiales +
              provision_recursos_humanos + provision_solicitudes_pago), 2) as promedio_provisiones,
    ROUND(MIN(provision_combustible_peaje + provision_materiales +
              provision_recursos_humanos + provision_solicitudes_pago), 2) as min_provisiones,
    ROUND(MAX(provision_combustible_peaje + provision_materiales +
              provision_recursos_humanos + provision_solicitudes_pago), 2) as max_provisiones
FROM evt_eventos
WHERE deleted_at IS NULL;

-- ========================================
-- 8. ANÁLISIS POR CLIENTE
-- ========================================

SELECT '=== ANÁLISIS POR CLIENTE ===' as seccion;

-- Eventos por cliente
SELECT
    c.razon_social as cliente,
    COUNT(e.id) as total_eventos,
    ROUND(SUM(e.ganancia_estimada), 2) as ingreso_estimado_total,
    ROUND(AVG(v.margen_real_pct), 2) as promedio_margen_real
FROM evt_eventos e
JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN vw_eventos_analisis_financiero v ON e.id = v.id
WHERE e.deleted_at IS NULL
GROUP BY c.id, c.razon_social
ORDER BY c.razon_social;

-- ========================================
-- 9. MUESTRAS DE EVENTOS
-- ========================================

SELECT '=== MUESTRA DE EVENTOS (Primeros 5) ===' as seccion;

-- Mostrar primeros 5 eventos con sus métricas
SELECT
    clave_evento,
    cliente_nombre,
    fecha_evento,
    ROUND(provisiones_total, 2) as provisiones,
    ROUND(ingreso_estimado, 2) as ingreso_est,
    ROUND(ingresos_cobrados, 2) as ing_cobrados,
    ROUND(gastos_pagados_total, 2) as gastos_pagados,
    ROUND(utilidad_real, 2) as utilidad,
    ROUND(margen_real_pct, 2) as margen_pct
FROM vw_eventos_analisis_financiero
ORDER BY fecha_evento
LIMIT 5;

-- ========================================
-- 10. RESUMEN FINAL
-- ========================================

SELECT '=== RESUMEN FINAL ===' as seccion;

SELECT
    'RESUMEN EJECUTIVO' as categoria,
    COUNT(*) as total_eventos,
    ROUND(AVG(ingresos_cobrados), 2) as promedio_ingresos,
    ROUND(AVG(gastos_pagados_total), 2) as promedio_gastos,
    ROUND(AVG(utilidad_real), 2) as promedio_utilidad,
    ROUND(AVG(margen_real_pct), 2) as promedio_margen_pct,
    ROUND(MIN(margen_real_pct), 2) as min_margen_pct,
    ROUND(MAX(margen_real_pct), 2) as max_margen_pct
FROM vw_eventos_analisis_financiero
WHERE ingresos_cobrados > 0;
