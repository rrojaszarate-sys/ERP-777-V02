-- =====================================================
-- CORRECCIÓN URGENTE: FILTRAR REGISTROS NO PAGADOS/COBRADOS
-- Fecha: 2025-10-27
-- Problema: Vistas incluyen registros pendientes en cálculos
-- =====================================================

\echo '🔧 CORRIGIENDO VISTAS PARA EXCLUIR PENDIENTES...'

-- =====================================================
-- 1. RECREAR vw_eventos_completos
-- =====================================================
\echo '\n📊 Recreando vw_eventos_completos...'

DROP VIEW IF EXISTS vw_eventos_completos CASCADE;

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
    e.hora_inicio,
    e.hora_fin,
    e.lugar,
    e.numero_invitados,
    e.presupuesto_estimado,
    e.status_facturacion,
    e.created_at,
    e.updated_at,
    -- SOLO INGRESOS COBRADOS
    COALESCE(ing.total_ingresos, 0) as total,
    -- SOLO GASTOS PAGADOS
    COALESCE(gst.total_gastos, 0) as total_gastos,
    -- UTILIDAD calculada con solo pagados/cobrados
    COALESCE(ing.total_ingresos, 0) - COALESCE(gst.total_gastos, 0) as utilidad,
    -- MARGEN DE UTILIDAD
    CASE 
        WHEN COALESCE(ing.total_ingresos, 0) > 0 
        THEN ((COALESCE(ing.total_ingresos, 0) - COALESCE(gst.total_gastos, 0)) / COALESCE(ing.total_ingresos, 0)) * 100
        ELSE 0 
    END as margen_utilidad
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
-- LATERAL JOIN para ingresos SOLO COBRADOS
LEFT JOIN LATERAL (
    SELECT SUM(i.total) as total_ingresos
    FROM evt_ingresos i
    WHERE i.evento_id = e.id
      AND i.cobrado = true  -- ✅ SOLO COBRADOS
) ing ON true
-- LATERAL JOIN para gastos SOLO PAGADOS
LEFT JOIN LATERAL (
    SELECT SUM(g.total) as total_gastos
    FROM evt_gastos g
    WHERE g.evento_id = e.id
      AND g.pagado = true  -- ✅ SOLO PAGADOS
) gst ON true;

\echo '✅ vw_eventos_completos recreada (SOLO pagados/cobrados)'

-- =====================================================
-- 2. RECREAR vw_master_facturacion
-- =====================================================
\echo '\n📊 Recreando vw_master_facturacion...'

DROP VIEW IF EXISTS vw_master_facturacion CASCADE;

CREATE VIEW vw_master_facturacion AS
SELECT 
    e.id as evento_id,
    e.clave_evento,
    e.nombre_proyecto as evento_nombre,
    c.id as cliente_id,
    c.nombre_comercial as cliente_nombre,
    c.rfc as cliente_rfc,
    te.nombre as tipo_evento,
    es.nombre as estado,
    e.fecha_evento,
    e.fecha_fin,
    e.numero_invitados,
    -- SOLO INGRESOS COBRADOS
    (SELECT COALESCE(SUM(i.total), 0) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id 
       AND i.cobrado = true) as total,  -- ✅ SOLO COBRADOS
    -- SOLO GASTOS PAGADOS
    (SELECT COALESCE(SUM(g.total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id 
       AND g.pagado = true) as total_gastos,  -- ✅ SOLO PAGADOS
    -- UTILIDAD
    (SELECT COALESCE(SUM(i.total), 0) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id 
       AND i.cobrado = true) -
    (SELECT COALESCE(SUM(g.total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id 
       AND g.pagado = true) as utilidad,
    -- MARGEN
    CASE 
        WHEN (SELECT COALESCE(SUM(i.total), 0) 
              FROM evt_ingresos i 
              WHERE i.evento_id = e.id 
                AND i.cobrado = true) > 0
        THEN (((SELECT COALESCE(SUM(i.total), 0) 
                FROM evt_ingresos i 
                WHERE i.evento_id = e.id 
                  AND i.cobrado = true) -
               (SELECT COALESCE(SUM(g.total), 0) 
                FROM evt_gastos g 
                WHERE g.evento_id = e.id 
                  AND g.pagado = true)) / 
              (SELECT COALESCE(SUM(i.total), 0) 
               FROM evt_ingresos i 
               WHERE i.evento_id = e.id 
                 AND i.cobrado = true)) * 100
        ELSE 0 
    END as margen_utilidad,
    e.status_facturacion,
    e.presupuesto_estimado,
    e.created_at,
    e.updated_at
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados es ON e.estado_id = es.id;

\echo '✅ vw_master_facturacion recreada (SOLO pagados/cobrados)'

-- =====================================================
-- 3. VERIFICACIÓN
-- =====================================================
\echo '\n✅ VERIFICANDO CORRECCIÓN...'

\echo '\nTotales en evt_ingresos:'
SELECT 
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE cobrado = true) as cobrados,
    COUNT(*) FILTER (WHERE cobrado != true OR cobrado IS NULL) as pendientes,
    SUM(total) as total_general,
    SUM(total) FILTER (WHERE cobrado = true) as total_cobrado
FROM evt_ingresos;

\echo '\nTotales en evt_gastos:'
SELECT 
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE pagado = true) as pagados,
    COUNT(*) FILTER (WHERE pagado != true OR pagado IS NULL) as pendientes,
    SUM(total) as total_general,
    SUM(total) FILTER (WHERE pagado = true) as total_pagado
FROM evt_gastos;

\echo '\nTotales en vw_eventos_completos (debe coincidir con pagados/cobrados):'
SELECT 
    COUNT(*) as total_eventos,
    SUM(total) as suma_ingresos_vista,
    SUM(total_gastos) as suma_gastos_vista,
    SUM(utilidad) as utilidad_total
FROM vw_eventos_completos;

\echo '\n✅ CORRECCIÓN COMPLETADA'
\echo 'Las vistas ahora SOLO cuentan registros PAGADOS y COBRADOS'
