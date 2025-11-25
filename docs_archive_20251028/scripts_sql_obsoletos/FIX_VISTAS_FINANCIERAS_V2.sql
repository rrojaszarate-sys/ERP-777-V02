-- =====================================================
-- CORRECCIÓN CRÍTICA DE VISTAS FINANCIERAS
-- ERP-777 V1
-- Fecha: 2025-10-27
-- =====================================================
-- PROBLEMA: Las vistas incluyen registros NO pagados/cobrados
-- SOLUCIÓN: Agregar filtros WHERE pagado=true y cobrado=true
-- =====================================================

-- Paso 1: Verificar estado ANTES de la corrección
-- DO $$
-- DECLARE
--     v_total_ingresos_vista NUMERIC;
--     v_total_gastos_vista NUMERIC;
--     v_total_ingresos_real NUMERIC;
--     v_total_gastos_real NUMERIC;
-- BEGIN
--     -- Totales en vista actual
--     SELECT 
--         COALESCE(SUM(total), 0),
--         COALESCE(SUM(total_gastos), 0)
--     INTO v_total_ingresos_vista, v_total_gastos_vista
--     FROM vw_eventos_completos;
--     
--     -- Totales reales (solo pagados/cobrados)
--     SELECT COALESCE(SUM(total), 0)
--     INTO v_total_ingresos_real
--     FROM evt_ingresos
--     WHERE cobrado = true;
--     
--     SELECT COALESCE(SUM(total), 0)
--     INTO v_total_gastos_real
--     FROM evt_gastos
--     WHERE pagado = true;
--     
--     -- RAISE NOTICE '========================================';
--     -- RAISE NOTICE 'DIAGNÓSTICO ANTES DE CORRECCIÓN';
--     -- RAISE NOTICE '========================================';
--     -- RAISE NOTICE 'Vista vw_eventos_completos:';
--     -- RAISE NOTICE '  Ingresos: $ %', v_total_ingresos_vista;
--     -- RAISE NOTICE '  Gastos:   $ %', v_total_gastos_vista;
--     -- RAISE NOTICE '';
--     -- RAISE NOTICE 'Totales REALES (pagados/cobrados):';
--     -- RAISE NOTICE '  Ingresos: $ %', v_total_ingresos_real;
--     -- RAISE NOTICE '  Gastos:   $ %', v_total_gastos_real;
--     -- RAISE NOTICE '';
--     -- RAISE NOTICE 'Diferencias:';
--     -- RAISE NOTICE '  Ingresos: $ % (% inflado)', 
--     --     v_total_ingresos_vista - v_total_ingresos_real,
--     --     CASE WHEN v_total_ingresos_real > 0 
--     --          THEN ROUND(((v_total_ingresos_vista - v_total_ingresos_real) / v_total_ingresos_real * 100)::numeric, 2)
--     --          ELSE 0 END;
--     -- RAISE NOTICE '  Gastos:   $ % (% inflado)', 
--     --     v_total_gastos_vista - v_total_gastos_real,
--     --     CASE WHEN v_total_gastos_real > 0 
--     --          THEN ROUND(((v_total_gastos_vista - v_total_gastos_real) / v_total_gastos_real * 100)::numeric, 2)
--     --          ELSE 0 END;
--     -- RAISE NOTICE '========================================';
-- END $$;

-- Paso 2: Eliminar vistas existentes
DROP VIEW IF EXISTS vw_eventos_completos CASCADE;
DROP VIEW IF EXISTS vw_master_facturacion CASCADE;
DROP VIEW IF EXISTS vw_eventos_pendientes CASCADE;

-- Paso 3: Recrear vw_eventos_completos CON FILTROS

CREATE VIEW vw_eventos_completos AS
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
    
    -- ✅ SOLO INGRESOS COBRADOS
    COALESCE(ing.total_ingresos, 0) as total,
    COALESCE(ing.cantidad_ingresos, 0) as cantidad_ingresos,
    
    -- ✅ SOLO GASTOS PAGADOS
    COALESCE(gst.total_gastos, 0) as total_gastos,
    COALESCE(gst.cantidad_gastos, 0) as cantidad_gastos,
    
    -- UTILIDAD (solo de transacciones reales)
    COALESCE(ing.total_ingresos, 0) - COALESCE(gst.total_gastos, 0) as utilidad,
    
    -- MARGEN DE UTILIDAD
    CASE 
        WHEN COALESCE(ing.total_ingresos, 0) > 0 THEN
            ROUND(
                (((COALESCE(ing.total_ingresos, 0) - COALESCE(gst.total_gastos, 0)) 
                  / COALESCE(ing.total_ingresos, 0)) * 100)::numeric, 
                2
            )
        ELSE 0 
    END as margen_utilidad,
    
    -- PENDIENTES (para seguimiento)
    COALESCE(ing_pend.total_pendiente, 0) as ingresos_pendientes,
    COALESCE(gst_pend.total_pendiente, 0) as gastos_pendientes
    
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados es ON e.estado_id = es.id

-- Ingresos COBRADOS (FILTRO CRÍTICO) ✅
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as cantidad_ingresos,
        SUM(i.total) as total_ingresos
    FROM evt_ingresos i
    WHERE i.evento_id = e.id
      AND i.cobrado = true  -- ✅✅✅ SOLO COBRADOS
) ing ON true

-- Gastos PAGADOS (FILTRO CRÍTICO) ✅
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as cantidad_gastos,
        SUM(g.total) as total_gastos
    FROM evt_gastos g
    WHERE g.evento_id = e.id
      AND g.pagado = true  -- ✅✅✅ SOLO PAGADOS
) gst ON true

-- Ingresos PENDIENTES (para referencia)
LEFT JOIN LATERAL (
    SELECT SUM(i.total) as total_pendiente
    FROM evt_ingresos i
    WHERE i.evento_id = e.id
      AND i.cobrado = false
) ing_pend ON true

-- Gastos PENDIENTES (para referencia)
LEFT JOIN LATERAL (
    SELECT SUM(g.total) as total_pendiente
    FROM evt_gastos g
    WHERE g.evento_id = e.id
      AND g.pagado = false
) gst_pend ON true;

COMMENT ON VIEW vw_eventos_completos IS 
'Vista de eventos con totales financieros. IMPORTANTE: Solo incluye ingresos COBRADOS y gastos PAGADOS. Los pendientes están en columnas separadas.';

-- Paso 4: Recrear vw_master_facturacion CON FILTROS

CREATE VIEW vw_master_facturacion AS
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
       AND i.cobrado = true) as total,  -- ✅✅✅ SOLO COBRADOS
       
    (SELECT COALESCE(SUM(g.total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id 
       AND g.pagado = true) as total_gastos,  -- ✅✅✅ SOLO PAGADOS
    
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

-- Paso 5: Crear vista adicional para PENDIENTES

CREATE VIEW vw_eventos_pendientes AS
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

-- Paso 6: Otorgar permisos

GRANT SELECT ON vw_eventos_completos TO authenticated;
GRANT SELECT ON vw_master_facturacion TO authenticated;
GRANT SELECT ON vw_eventos_pendientes TO authenticated;

GRANT SELECT ON vw_eventos_completos TO anon;
GRANT SELECT ON vw_master_facturacion TO anon;
GRANT SELECT ON vw_eventos_pendientes TO anon;

-- Paso 7: Verificar corrección
-- DO $$
-- DECLARE
--     v_total_ingresos_vista NUMERIC;
--     v_total_gastos_vista NUMERIC;
--     v_total_ingresos_real NUMERIC;
--     v_total_gastos_real NUMERIC;
--     v_diferencia_ingresos NUMERIC;
--     v_diferencia_gastos NUMERIC;
-- BEGIN
--     -- Totales en vista corregida
--     SELECT 
--         COALESCE(SUM(total), 0),
--         COALESCE(SUM(total_gastos), 0)
--     INTO v_total_ingresos_vista, v_total_gastos_vista
--     FROM vw_eventos_completos;
--     
--     -- Totales reales
--     SELECT COALESCE(SUM(total), 0)
--     INTO v_total_ingresos_real
--     FROM evt_ingresos
--     WHERE cobrado = true;
--     
--     SELECT COALESCE(SUM(total), 0)
--     INTO v_total_gastos_real
--     FROM evt_gastos
--     WHERE pagado = true;
--     
--     v_diferencia_ingresos := ABS(v_total_ingresos_vista - v_total_ingresos_real);
--     v_diferencia_gastos := ABS(v_total_gastos_vista - v_total_gastos_real);
--     
--     -- RAISE NOTICE '';
--     -- RAISE NOTICE '========================================';
--     -- RAISE NOTICE 'VERIFICACIÓN DESPUÉS DE CORRECCIÓN';
--     -- RAISE NOTICE '========================================';
--     -- RAISE NOTICE 'Vista vw_eventos_completos:';
--     -- RAISE NOTICE '  Ingresos: $ %', v_total_ingresos_vista;
--     -- RAISE NOTICE '  Gastos:   $ %', v_total_gastos_vista;
--     -- RAISE NOTICE '';
--     -- RAISE NOTICE 'Totales REALES:';
--     -- RAISE NOTICE '  Ingresos: $ %', v_total_ingresos_real;
--     -- RAISE NOTICE '  Gastos:   $ %', v_total_gastos_real;
--     -- RAISE NOTICE '';
--     -- RAISE NOTICE 'Diferencias:';
--     -- RAISE NOTICE '  Ingresos: $ % (debe ser < 0.01)', v_diferencia_ingresos;
--     -- RAISE NOTICE '  Gastos:   $ % (debe ser < 0.01)', v_diferencia_gastos;
--     -- RAISE NOTICE '';
--     
--     -- IF v_diferencia_ingresos < 0.01 AND v_diferencia_gastos < 0.01 THEN
--     --     RAISE NOTICE '✓ CORRECCIÓN EXITOSA - Vistas funcionan correctamente';
--     -- ELSE
--     --     RAISE WARNING '✗ ADVERTENCIA - Diferencias mayores a 0.01 detectadas';
--     --     RAISE WARNING '  Verificar manualmente la estructura de datos';
--     -- END IF;
--     
--     -- RAISE NOTICE '========================================';
-- END $$;

-- Paso 8: Mostrar resumen de vistas
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
-- FIN DE LA CORRECCIÓN
-- =====================================================
-- SIGUIENTE PASO: Ejecutar node pruebas-integrales.mjs
--                 para validar que todas las pruebas pasen
-- =====================================================
