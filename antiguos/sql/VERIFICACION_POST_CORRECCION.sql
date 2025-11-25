-- =====================================================
-- VERIFICACIÓN POST-CORRECCIÓN DE GASTOS E INGRESOS
-- Fecha: 2025-10-27
-- Objetivo: Validar que las vistas funcionan correctamente
-- =====================================================

\echo '========================================='
\echo 'VERIFICACIÓN POST-CORRECCIÓN'
\echo '========================================='

-- =====================================================
-- 1. VERIFICAR QUE LAS VISTAS EXISTEN
-- =====================================================
\echo '\n1. Verificando existencia de vistas...'

SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE viewname IN ('vw_eventos_completos', 'vw_master_facturacion')
ORDER BY viewname;

-- =====================================================
-- 2. VERIFICAR DATOS EN vw_eventos_completos
-- =====================================================
\echo '\n2. Verificando vw_eventos_completos (primeros 10 eventos)...'

SELECT 
    id,
    clave_evento,
    nombre_proyecto,
    fecha_evento,
    total as total_ingresos,
    total_gastos,
    utilidad,
    ROUND(margen_utilidad::numeric, 2) as margen_pct,
    status_pago,
    cliente_nombre
FROM vw_eventos_completos
ORDER BY fecha_evento DESC
LIMIT 10;

-- =====================================================
-- 3. VERIFICAR DATOS EN vw_master_facturacion
-- =====================================================
\echo '\n3. Verificando vw_master_facturacion (primeros 10 eventos)...'

SELECT 
    evento_id,
    clave_evento,
    evento_nombre,
    fecha_evento,
    total as total_ingresos,
    total_gastos,
    utilidad,
    ROUND(margen_utilidad::numeric, 2) as margen_pct,
    status_pago,
    status_facturacion
FROM vw_master_facturacion
LIMIT 10;

-- =====================================================
-- 4. COMPARAR CÁLCULOS: Vista vs Consulta Directa
-- =====================================================
\echo '\n4. Comparando cálculos de la vista vs consulta directa...'

WITH calculo_directo AS (
    SELECT 
        e.id,
        e.nombre_proyecto,
        COALESCE(SUM(i.total), 0) as ingresos_directos,
        COALESCE((SELECT SUM(g.total) FROM evt_gastos g WHERE g.evento_id = e.id AND g.activo = true), 0) as gastos_directos,
        COALESCE(SUM(i.total), 0) - COALESCE((SELECT SUM(g.total) FROM evt_gastos g WHERE g.evento_id = e.id AND g.activo = true), 0) as utilidad_directa
    FROM evt_eventos e
    LEFT JOIN evt_ingresos i ON e.id = i.evento_id AND i.activo = true
    WHERE e.activo = true
    GROUP BY e.id, e.nombre_proyecto
)
SELECT 
    v.id,
    v.nombre_proyecto,
    v.total as ingresos_vista,
    cd.ingresos_directos,
    v.total - cd.ingresos_directos as diff_ingresos,
    v.total_gastos as gastos_vista,
    cd.gastos_directos,
    v.total_gastos - cd.gastos_directos as diff_gastos,
    v.utilidad as utilidad_vista,
    cd.utilidad_directa,
    v.utilidad - cd.utilidad_directa as diff_utilidad
FROM vw_eventos_completos v
JOIN calculo_directo cd ON v.id = cd.id
WHERE ABS(v.total - cd.ingresos_directos) > 0.01 
   OR ABS(v.total_gastos - cd.gastos_directos) > 0.01
   OR ABS(v.utilidad - cd.utilidad_directa) > 0.01
LIMIT 10;

-- =====================================================
-- 5. VERIFICAR QUE NO EXISTEN TRIGGERS ANTIGUOS
-- =====================================================
\echo '\n5. Verificando que los triggers fueron eliminados...'

SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgtype,
    tgenabled
FROM pg_trigger
WHERE tgrelid IN ('evt_gastos'::regclass, 'evt_ingresos'::regclass)
  AND tgname LIKE '%calculate%'
  AND NOT tgisinternal;

-- =====================================================
-- 6. ESTADÍSTICAS GENERALES
-- =====================================================
\echo '\n6. Estadísticas generales del sistema...'

SELECT 
    'Eventos Activos' as concepto,
    COUNT(*) as cantidad
FROM evt_eventos 
WHERE activo = true
UNION ALL
SELECT 
    'Ingresos Activos',
    COUNT(*)
FROM evt_ingresos 
WHERE activo = true
UNION ALL
SELECT 
    'Gastos Activos',
    COUNT(*)
FROM evt_gastos 
WHERE activo = true
UNION ALL
SELECT 
    'Eventos con Ingresos',
    COUNT(DISTINCT evento_id)
FROM evt_ingresos 
WHERE activo = true
UNION ALL
SELECT 
    'Eventos con Gastos',
    COUNT(DISTINCT evento_id)
FROM evt_gastos 
WHERE activo = true;

-- =====================================================
-- 7. RESUMEN DE TOTALES
-- =====================================================
\echo '\n7. Resumen de totales generales...'

SELECT 
    COUNT(*) as total_eventos,
    SUM(total) as suma_ingresos,
    SUM(total_gastos) as suma_gastos,
    SUM(utilidad) as suma_utilidad,
    ROUND(AVG(margen_utilidad)::numeric, 2) as margen_promedio
FROM vw_eventos_completos;

-- =====================================================
-- 8. EVENTOS CON DATOS INCONSISTENTES (si los hay)
-- =====================================================
\echo '\n8. Buscando posibles inconsistencias...'

SELECT 
    id,
    nombre_proyecto,
    total as ingresos,
    total_gastos as gastos,
    utilidad,
    margen_utilidad,
    CASE 
        WHEN total < 0 THEN 'Ingresos negativos'
        WHEN total_gastos < 0 THEN 'Gastos negativos'
        WHEN total > 0 AND ABS(((total - total_gastos) - utilidad)) > 0.01 THEN 'Error en cálculo de utilidad'
        WHEN total > 0 AND ABS((((total - total_gastos) / total * 100) - margen_utilidad)) > 0.01 THEN 'Error en cálculo de margen'
        ELSE 'OK'
    END as problema
FROM vw_eventos_completos
WHERE total < 0 
   OR total_gastos < 0 
   OR (total > 0 AND ABS(((total - total_gastos) - utilidad)) > 0.01)
   OR (total > 0 AND ABS((((total - total_gastos) / total * 100) - margen_utilidad)) > 0.01)
LIMIT 10;

\echo '\n========================================='
\echo 'VERIFICACIÓN COMPLETADA'
\echo '========================================='
