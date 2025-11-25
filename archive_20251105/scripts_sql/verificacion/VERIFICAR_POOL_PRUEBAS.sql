-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT DE VERIFICACIÓN DEL POOL DE PRUEBAS
-- ═══════════════════════════════════════════════════════════════════════════
-- Ejecutar en Supabase SQL Editor después de generar el pool de pruebas
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. VERIFICAR TOTALES GENERALES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    'TOTALES GENERALES' as seccion,
    (SELECT COUNT(*) FROM evt_clientes WHERE activo = true) as total_clientes,
    (SELECT COUNT(*) FROM evt_eventos WHERE activo = true) as total_eventos,
    (SELECT COUNT(*) FROM evt_gastos WHERE activo = true) as total_gastos,
    (SELECT COUNT(*) FROM evt_ingresos WHERE activo = true) as total_ingresos;

-- 2. DISTRIBUCIÓN DE EVENTOS POR AÑO
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    EXTRACT(YEAR FROM fecha_evento) as año,
    COUNT(*) as total_eventos,
    COUNT(DISTINCT cliente_id) as clientes_distintos,
    MIN(fecha_evento) as primer_evento,
    MAX(fecha_evento) as ultimo_evento
FROM evt_eventos
WHERE activo = true
GROUP BY EXTRACT(YEAR FROM fecha_evento)
ORDER BY año;

-- 3. DISTRIBUCIÓN DE EVENTOS POR MES (2025)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    EXTRACT(MONTH FROM fecha_evento) as mes,
    TO_CHAR(fecha_evento, 'Month') as nombre_mes,
    COUNT(*) as total_eventos
FROM evt_eventos
WHERE activo = true 
    AND EXTRACT(YEAR FROM fecha_evento) = 2025
GROUP BY EXTRACT(MONTH FROM fecha_evento), TO_CHAR(fecha_evento, 'Month')
ORDER BY mes;

-- 4. GASTOS POR CATEGORÍA
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    cat.nombre as categoria,
    COUNT(g.id) as cantidad_gastos,
    SUM(CASE WHEN g.pagado = true THEN 1 ELSE 0 END) as gastos_pagados,
    SUM(CASE WHEN g.pagado = false THEN 1 ELSE 0 END) as gastos_pendientes,
    SUM(g.total) as total_general,
    SUM(CASE WHEN g.pagado = true THEN g.total ELSE 0 END) as total_pagado,
    SUM(CASE WHEN g.pagado = false THEN g.total ELSE 0 END) as total_pendiente,
    ROUND((SUM(g.total) / (SELECT SUM(total) FROM evt_gastos WHERE activo = true)) * 100, 2) as porcentaje_del_total
FROM evt_gastos g
INNER JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
WHERE g.activo = true
GROUP BY cat.nombre
ORDER BY total_general DESC;

-- 5. INGRESOS: COBRADOS VS PENDIENTES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    'Ingresos Totales' as tipo,
    COUNT(*) as cantidad,
    SUM(total) as monto_total
FROM evt_ingresos
WHERE activo = true

UNION ALL

SELECT 
    'Ingresos Cobrados' as tipo,
    COUNT(*) as cantidad,
    SUM(total) as monto_total
FROM evt_ingresos
WHERE activo = true AND cobrado = true

UNION ALL

SELECT 
    'Ingresos Pendientes' as tipo,
    COUNT(*) as cantidad,
    SUM(total) as monto_total
FROM evt_ingresos
WHERE activo = true AND cobrado = false;

-- 6. BALANCE FINANCIERO GENERAL
-- ═══════════════════════════════════════════════════════════════════════════
WITH totales AS (
    SELECT 
        (SELECT COALESCE(SUM(total), 0) FROM evt_gastos WHERE activo = true) as total_gastos,
        (SELECT COALESCE(SUM(total), 0) FROM evt_gastos WHERE activo = true AND pagado = true) as gastos_pagados,
        (SELECT COALESCE(SUM(total), 0) FROM evt_ingresos WHERE activo = true) as total_ingresos,
        (SELECT COALESCE(SUM(total), 0) FROM evt_ingresos WHERE activo = true AND cobrado = true) as ingresos_cobrados
)
SELECT 
    total_gastos,
    gastos_pagados,
    total_gastos - gastos_pagados as gastos_pendientes,
    total_ingresos,
    ingresos_cobrados,
    total_ingresos - ingresos_cobrados as ingresos_pendientes,
    ingresos_cobrados - gastos_pagados as balance_real,
    ROUND(((ingresos_cobrados - gastos_pagados) / NULLIF(ingresos_cobrados, 0)) * 100, 2) as margen_real_porcentaje
FROM totales;

-- 7. DETALLE POR CLIENTE
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    c.nombre_comercial,
    COUNT(DISTINCT e.id) as total_eventos,
    COUNT(DISTINCT g.id) as total_gastos,
    COUNT(DISTINCT i.id) as total_ingresos,
    COALESCE(SUM(g.total), 0) as gastos_totales,
    COALESCE(SUM(i.total), 0) as ingresos_totales,
    COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0) as balance
FROM evt_clientes c
LEFT JOIN evt_eventos e ON e.cliente_id = c.id AND e.activo = true
LEFT JOIN evt_gastos g ON g.evento_id = e.id AND g.activo = true
LEFT JOIN evt_ingresos i ON i.evento_id = e.id AND i.activo = true
WHERE c.activo = true
GROUP BY c.id, c.nombre_comercial
ORDER BY total_eventos DESC;

-- 8. EVENTOS CON MEJOR MARGEN
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    e.clave_evento,
    e.nombre_proyecto,
    c.nombre_comercial as cliente,
    e.fecha_evento,
    e.ingreso_estimado,
    e.ganancia_estimada,
    COALESCE(SUM(i.total), 0) as ingresos_reales,
    COALESCE(SUM(g.total), 0) as gastos_reales,
    COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0) as utilidad_real,
    ROUND(
        (COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0)) / 
        NULLIF(COALESCE(SUM(i.total), 0), 0) * 100, 
        2
    ) as margen_porcentaje
FROM evt_eventos e
INNER JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_ingresos i ON i.evento_id = e.id AND i.activo = true
LEFT JOIN evt_gastos g ON g.evento_id = e.id AND g.activo = true
WHERE e.activo = true
GROUP BY e.id, e.clave_evento, e.nombre_proyecto, c.nombre_comercial, e.fecha_evento, e.ingreso_estimado, e.ganancia_estimada
ORDER BY margen_porcentaje DESC
LIMIT 10;

-- 9. EVENTOS CON PEOR MARGEN
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    e.clave_evento,
    e.nombre_proyecto,
    c.nombre_comercial as cliente,
    e.fecha_evento,
    e.ingreso_estimado,
    e.ganancia_estimada,
    COALESCE(SUM(i.total), 0) as ingresos_reales,
    COALESCE(SUM(g.total), 0) as gastos_reales,
    COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0) as utilidad_real,
    ROUND(
        (COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0)) / 
        NULLIF(COALESCE(SUM(i.total), 0), 0) * 100, 
        2
    ) as margen_porcentaje
FROM evt_eventos e
INNER JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_ingresos i ON i.evento_id = e.id AND i.activo = true
LEFT JOIN evt_gastos g ON g.evento_id = e.id AND g.activo = true
WHERE e.activo = true
GROUP BY e.id, e.clave_evento, e.nombre_proyecto, c.nombre_comercial, e.fecha_evento, e.ingreso_estimado, e.ganancia_estimada
ORDER BY margen_porcentaje ASC
LIMIT 10;

-- 10. VERIFICAR INTEGRIDAD DE DATOS
-- ═══════════════════════════════════════════════════════════════════════════
-- Eventos sin gastos
SELECT 'Eventos sin gastos' as verificacion, COUNT(*) as cantidad
FROM evt_eventos e
WHERE e.activo = true
    AND NOT EXISTS (SELECT 1 FROM evt_gastos g WHERE g.evento_id = e.id AND g.activo = true)

UNION ALL

-- Eventos sin ingresos
SELECT 'Eventos sin ingresos' as verificacion, COUNT(*) as cantidad
FROM evt_eventos e
WHERE e.activo = true
    AND NOT EXISTS (SELECT 1 FROM evt_ingresos i WHERE i.evento_id = e.id AND i.activo = true)

UNION ALL

-- Gastos huérfanos (sin evento)
SELECT 'Gastos huérfanos' as verificacion, COUNT(*) as cantidad
FROM evt_gastos g
WHERE g.activo = true
    AND NOT EXISTS (SELECT 1 FROM evt_eventos e WHERE e.id = g.evento_id)

UNION ALL

-- Ingresos huérfanos (sin evento)
SELECT 'Ingresos huérfanos' as verificacion, COUNT(*) as cantidad
FROM evt_ingresos i
WHERE i.activo = true
    AND NOT EXISTS (SELECT 1 FROM evt_eventos e WHERE e.id = i.evento_id);

-- 11. PROVISIONES VS GASTOS REALES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    e.clave_evento,
    e.nombre_proyecto,
    -- Provisiones
    e.provision_combustible_peaje,
    e.provision_materiales,
    e.provision_recursos_humanos,
    e.provision_solicitudes_pago,
    e.provision_combustible_peaje + e.provision_materiales + 
    e.provision_recursos_humanos + e.provision_solicitudes_pago as provision_total,
    -- Gastos reales
    COALESCE(SUM(CASE WHEN g.categoria_id = 6 THEN g.total ELSE 0 END), 0) as gasto_combustible,
    COALESCE(SUM(CASE WHEN g.categoria_id = 7 THEN g.total ELSE 0 END), 0) as gasto_materiales,
    COALESCE(SUM(CASE WHEN g.categoria_id = 8 THEN g.total ELSE 0 END), 0) as gasto_rh,
    COALESCE(SUM(CASE WHEN g.categoria_id = 9 THEN g.total ELSE 0 END), 0) as gasto_sps,
    COALESCE(SUM(g.total), 0) as gasto_total,
    -- Comparación
    (e.provision_combustible_peaje + e.provision_materiales + 
     e.provision_recursos_humanos + e.provision_solicitudes_pago) - 
    COALESCE(SUM(g.total), 0) as diferencia
FROM evt_eventos e
LEFT JOIN evt_gastos g ON g.evento_id = e.id AND g.activo = true
WHERE e.activo = true
GROUP BY e.id, e.clave_evento, e.nombre_proyecto, 
         e.provision_combustible_peaje, e.provision_materiales, 
         e.provision_recursos_humanos, e.provision_solicitudes_pago
ORDER BY diferencia DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════
-- RESUMEN EJECUTIVO
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    '═══════════════════════════════════════════════════════' as separador,
    'RESUMEN EJECUTIVO DEL POOL DE PRUEBAS' as titulo,
    '═══════════════════════════════════════════════════════' as separador2
    
UNION ALL

SELECT 
    '',
    CONCAT(
        'Total de registros: ',
        (SELECT COUNT(*) FROM evt_clientes WHERE activo = true), ' clientes, ',
        (SELECT COUNT(*) FROM evt_eventos WHERE activo = true), ' eventos, ',
        (SELECT COUNT(*) FROM evt_gastos WHERE activo = true), ' gastos, ',
        (SELECT COUNT(*) FROM evt_ingresos WHERE activo = true), ' ingresos'
    ),
    ''
    
UNION ALL

SELECT 
    '',
    CONCAT(
        'Balance financiero: Ingresos cobrados ',
        TO_CHAR((SELECT SUM(total) FROM evt_ingresos WHERE cobrado = true), 'FM$999,999,999.00'),
        ' - Gastos pagados ',
        TO_CHAR((SELECT SUM(total) FROM evt_gastos WHERE pagado = true), 'FM$999,999,999.00'),
        ' = ',
        TO_CHAR((SELECT SUM(total) FROM evt_ingresos WHERE cobrado = true) - 
                (SELECT SUM(total) FROM evt_gastos WHERE pagado = true), 'FM$999,999,999.00')
    ),
    '';
