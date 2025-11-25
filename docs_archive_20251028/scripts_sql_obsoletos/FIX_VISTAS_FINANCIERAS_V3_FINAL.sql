-- =====================================================
-- CORRECCIÓN CRÍTICA DE VISTAS FINANCIERAS V3
-- ERP-777 V1
-- Fecha: 2025-10-27
-- =====================================================
-- CAMBIOS EN V3:
-- - Forzar refresco de schema cache
-- - Simplificar LEFT JOIN LATERAL
-- - Agregar verificación explícita
-- =====================================================

-- Paso 1: Limpiar completamente
DROP VIEW IF EXISTS vw_eventos_completos CASCADE;
DROP VIEW IF EXISTS vw_master_facturacion CASCADE;
DROP VIEW IF EXISTS vw_eventos_pendientes CASCADE;

-- Forzar refresco del schema cache
NOTIFY pgrst, 'reload schema';

-- Paso 2: Recrear vw_eventos_completos CON FILTROS SIMPLIFICADOS

CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT 
    e.id,
    e.clave_evento,
    e.nombre_proyecto,
    e.descripcion,
    e.cliente_id,
    c.nombre_comercial as cliente_nombre,
    c.razon_social as cliente_razon_social,
    e.tipo_evento_id,
    te.nombre as tipo_evento_nombre,
    e.estado_id,
    es.nombre as estado_nombre,
    e.responsable_id,
    e.fecha_evento,
    e.fecha_fin,
    e.presupuesto_estimado,
    e.status_facturacion,
    e.created_at,
    e.updated_at,
    
    -- ✅ SOLO INGRESOS COBRADOS (subquery)
    (SELECT COALESCE(SUM(i.total), 0)
     FROM evt_ingresos i
     WHERE i.evento_id = e.id 
       AND i.cobrado = true) as total,
    
    (SELECT COUNT(*)::integer
     FROM evt_ingresos i
     WHERE i.evento_id = e.id 
       AND i.cobrado = true) as cantidad_ingresos,
    
    -- ✅ SOLO GASTOS PAGADOS (subquery)
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id 
       AND g.pagado = true) as total_gastos,
    
    (SELECT COUNT(*)::integer
     FROM evt_gastos g
     WHERE g.evento_id = e.id 
       AND g.pagado = true) as cantidad_gastos,
    
    -- UTILIDAD (solo de transacciones reales)
    (SELECT COALESCE(SUM(i.total), 0)
     FROM evt_ingresos i
     WHERE i.evento_id = e.id AND i.cobrado = true) -
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id AND g.pagado = true) as utilidad,
    
    -- MARGEN DE UTILIDAD
    CASE 
        WHEN (SELECT COALESCE(SUM(i.total), 0)
              FROM evt_ingresos i
              WHERE i.evento_id = e.id AND i.cobrado = true) > 0 
        THEN ROUND(
            ((((SELECT COALESCE(SUM(i.total), 0)
                FROM evt_ingresos i
                WHERE i.evento_id = e.id AND i.cobrado = true) -
               (SELECT COALESCE(SUM(g.total), 0)
                FROM evt_gastos g
                WHERE g.evento_id = e.id AND g.pagado = true)) /
              (SELECT COALESCE(SUM(i.total), 0)
               FROM evt_ingresos i
               WHERE i.evento_id = e.id AND i.cobrado = true)) * 100)::numeric,
            2
        )
        ELSE 0 
    END as margen_utilidad,
    
    -- PENDIENTES (para seguimiento)
    (SELECT COALESCE(SUM(i.total), 0)
     FROM evt_ingresos i
     WHERE i.evento_id = e.id AND i.cobrado = false) as ingresos_pendientes,
    
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id AND g.pagado = false) as gastos_pendientes
    
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados es ON e.estado_id = es.id;

COMMENT ON VIEW vw_eventos_completos IS 
'Vista de eventos con totales financieros. IMPORTANTE: Solo incluye ingresos COBRADOS y gastos PAGADOS. Los pendientes están en columnas separadas.';

-- Paso 3: Recrear vw_master_facturacion CON FILTROS

CREATE OR REPLACE VIEW vw_master_facturacion AS
SELECT 
    e.id as evento_id,
    e.clave_evento,
    e.nombre_proyecto as evento_nombre,
    e.descripcion,
    
    -- Cliente
    c.id as cliente_id,
    c.nombre_comercial as cliente_nombre,
    c.rfc as cliente_rfc,
    c.razon_social as cliente_razon_social,
    
    -- Clasificación
    te.id as tipo_evento_id,
    te.nombre as tipo_evento,
    es.id as estado_id,
    es.nombre as estado,
    
    -- Fechas
    e.fecha_evento,
    e.fecha_fin,
    e.created_at,
    e.updated_at,
    
    -- ✅ TOTALES SOLO DE COBRADOS/PAGADOS
    (SELECT COALESCE(SUM(i.total), 0) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id 
       AND i.cobrado = true) as total,
       
    (SELECT COALESCE(SUM(g.total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id 
       AND g.pagado = true) as total_gastos,
    
    -- UTILIDAD (solo transacciones reales)
    (SELECT COALESCE(SUM(i.total), 0) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id AND i.cobrado = true) -
    (SELECT COALESCE(SUM(g.total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id AND g.pagado = true) as utilidad,
    
    -- MARGEN DE UTILIDAD
    CASE 
        WHEN (SELECT COALESCE(SUM(i.total), 0) 
              FROM evt_ingresos i 
              WHERE i.evento_id = e.id AND i.cobrado = true) > 0
        THEN ROUND(
            ((((SELECT COALESCE(SUM(i.total), 0) 
                FROM evt_ingresos i 
                WHERE i.evento_id = e.id AND i.cobrado = true) -
               (SELECT COALESCE(SUM(g.total), 0) 
                FROM evt_gastos g 
                WHERE g.evento_id = e.id AND g.pagado = true)) / 
              (SELECT COALESCE(SUM(i.total), 0) 
               FROM evt_ingresos i 
               WHERE i.evento_id = e.id AND i.cobrado = true)) * 100)::numeric,
            2
        )
        ELSE 0 
    END as margen_utilidad,
    
    -- Status
    e.status_facturacion,
    e.presupuesto_estimado,
    
    -- PENDIENTES (para control)
    (SELECT COALESCE(SUM(i.total), 0) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id AND i.cobrado = false) as ingresos_pendientes,
     
    (SELECT COALESCE(SUM(g.total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id AND g.pagado = false) as gastos_pendientes,
    
    -- CONTEOS
    (SELECT COUNT(*) FROM evt_ingresos i WHERE i.evento_id = e.id) as total_ingresos_count,
    (SELECT COUNT(*) FROM evt_gastos g WHERE g.evento_id = e.id) as total_gastos_count

FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados es ON e.estado_id = es.id;

COMMENT ON VIEW vw_master_facturacion IS 
'Vista maestra de facturación. IMPORTANTE: Columnas total y total_gastos solo incluyen transacciones COBRADAS/PAGADAS. Los pendientes están en columnas separadas.';

-- Paso 4: Crear vista adicional para PENDIENTES

CREATE OR REPLACE VIEW vw_eventos_pendientes AS
SELECT 
    e.id as evento_id,
    e.clave_evento,
    e.nombre_proyecto,
    c.nombre_comercial as cliente_nombre,
    
    -- Ingresos pendientes
    (SELECT COALESCE(SUM(i.total), 0) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id AND i.cobrado = false) as ingresos_por_cobrar,
     
    (SELECT COUNT(*) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id AND i.cobrado = false) as cantidad_ingresos_pendientes,
    
    -- Gastos pendientes
    (SELECT COALESCE(SUM(g.total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id AND g.pagado = false) as gastos_por_pagar,
     
    (SELECT COUNT(*) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id AND g.pagado = false) as cantidad_gastos_pendientes,
    
    -- Balance pendiente
    (SELECT COALESCE(SUM(i.total), 0) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id AND i.cobrado = false) -
    (SELECT COALESCE(SUM(g.total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id AND g.pagado = false) as balance_pendiente

FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
WHERE 
    (SELECT COUNT(*) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false) > 0
    OR (SELECT COUNT(*) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = false) > 0;

COMMENT ON VIEW vw_eventos_pendientes IS 
'Vista de eventos con transacciones pendientes (no cobradas/no pagadas)';

-- Paso 5: Otorgar permisos

GRANT SELECT ON vw_eventos_completos TO authenticated;
GRANT SELECT ON vw_master_facturacion TO authenticated;
GRANT SELECT ON vw_eventos_pendientes TO authenticated;

GRANT SELECT ON vw_eventos_completos TO anon;
GRANT SELECT ON vw_master_facturacion TO anon;
GRANT SELECT ON vw_eventos_pendientes TO anon;

-- Paso 6: Verificación final con SELECT
SELECT 
    'vw_eventos_completos' as vista,
    COUNT(*) as total_eventos,
    SUM(total) as suma_ingresos,
    SUM(total_gastos) as suma_gastos,
    SUM(utilidad) as utilidad_total,
    ROUND(AVG(margen_utilidad)::numeric, 2) as margen_promedio
FROM vw_eventos_completos

UNION ALL

SELECT 
    'vw_master_facturacion' as vista,
    COUNT(*) as total_eventos,
    SUM(total) as suma_ingresos,
    SUM(total_gastos) as suma_gastos,
    SUM(utilidad) as utilidad_total,
    ROUND(AVG(margen_utilidad)::numeric, 2) as margen_promedio
FROM vw_master_facturacion

UNION ALL

SELECT 
    'vw_eventos_pendientes' as vista,
    COUNT(*) as total_eventos,
    SUM(ingresos_por_cobrar) as suma_ingresos,
    SUM(gastos_por_pagar) as suma_gastos,
    SUM(balance_pendiente) as utilidad_total,
    0 as margen_promedio
FROM vw_eventos_pendientes;

-- =====================================================
-- FIN DE LA CORRECCIÓN V3
-- =====================================================
-- SIGUIENTE PASO: Ejecutar node pruebas-modulos-completo.mjs
-- =====================================================
