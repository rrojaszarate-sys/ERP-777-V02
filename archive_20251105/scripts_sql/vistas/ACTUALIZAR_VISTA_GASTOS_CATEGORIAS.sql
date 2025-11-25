-- ====================================================================
-- SCRIPT PARA ACTUALIZAR LA VISTA vw_eventos_analisis_financiero
-- CON GASTOS POR CATEGORÍA
-- ====================================================================
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- ====================================================================

DROP VIEW IF EXISTS vw_eventos_analisis_financiero CASCADE;

CREATE OR REPLACE VIEW vw_eventos_analisis_financiero AS
SELECT
  e.id,
  e.company_id,
  e.clave_evento,
  e.nombre_proyecto,
  e.descripcion,
  e.cliente_id,
  e.tipo_evento_id,
  e.estado_id,
  e.fecha_evento,
  e.fecha_fin,
  e.lugar,
  e.numero_invitados,
  e.prioridad,
  e.fase_proyecto,

  -- ====================================================================
  -- CLIENTE
  -- ====================================================================
  c.razon_social AS cliente_nombre,
  c.nombre_comercial AS cliente_comercial,
  c.rfc AS cliente_rfc,

  -- ====================================================================
  -- ESTADO
  -- ====================================================================
  est.nombre AS estado_nombre,
  est.color AS estado_color,

  -- ====================================================================
  -- TIPO EVENTO
  -- ====================================================================
  te.nombre AS tipo_evento_nombre,
  te.color AS tipo_evento_color,

  -- ====================================================================
  -- PROVISIONES DESGLOSADAS
  -- ====================================================================
  COALESCE(e.provision_combustible_peaje, 0) AS provision_combustible_peaje,
  COALESCE(e.provision_materiales, 0) AS provision_materiales,
  COALESCE(e.provision_recursos_humanos, 0) AS provision_recursos_humanos,
  COALESCE(e.provision_solicitudes_pago, 0) AS provision_solicitudes_pago,

  -- TOTAL PROVISIONES
  (COALESCE(e.provision_combustible_peaje, 0) +
   COALESCE(e.provision_materiales, 0) +
   COALESCE(e.provision_recursos_humanos, 0) +
   COALESCE(e.provision_solicitudes_pago, 0)) AS provisiones_total,

  -- ====================================================================
  -- INGRESOS
  -- ====================================================================
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,

  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = true
     AND i.deleted_at IS NULL) AS ingresos_cobrados,

  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = false
     AND i.deleted_at IS NULL) AS ingresos_pendientes,

  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.deleted_at IS NULL) AS ingresos_totales,

  -- ====================================================================
  -- GASTOS POR CATEGORÍA - PAGADOS
  -- ====================================================================
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Combustible/Peaje'
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_combustible_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Materiales'
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_materiales_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Recursos Humanos'
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_rh_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Solicitudes de Pago'
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_sps_pagados,

  -- ====================================================================
  -- GASTOS POR CATEGORÍA - PENDIENTES
  -- ====================================================================
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Combustible/Peaje'
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_combustible_pendientes,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Materiales'
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_materiales_pendientes,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Recursos Humanos'
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_rh_pendientes,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Solicitudes de Pago'
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_sps_pendientes,

  -- ====================================================================
  -- GASTOS TOTALES
  -- ====================================================================
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_pagados_total,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_pendientes_total,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.deleted_at IS NULL) AS gastos_totales,

  -- ====================================================================
  -- DISPONIBLES POR CATEGORÍA
  -- ====================================================================
  COALESCE(e.provision_combustible_peaje, 0) - 
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
     WHERE g.evento_id = e.id
       AND cat.nombre = 'Combustible/Peaje'
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS disponible_combustible,

  COALESCE(e.provision_materiales, 0) - 
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
     WHERE g.evento_id = e.id
       AND cat.nombre = 'Materiales'
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS disponible_materiales,

  COALESCE(e.provision_recursos_humanos, 0) - 
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
     WHERE g.evento_id = e.id
       AND cat.nombre = 'Recursos Humanos'
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS disponible_rh,

  COALESCE(e.provision_solicitudes_pago, 0) - 
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
     WHERE g.evento_id = e.id
       AND cat.nombre = 'Solicitudes de Pago'
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS disponible_sps,

  -- DISPONIBLE TOTAL
  (COALESCE(e.provision_combustible_peaje, 0) +
   COALESCE(e.provision_materiales, 0) +
   COALESCE(e.provision_recursos_humanos, 0) +
   COALESCE(e.provision_solicitudes_pago, 0)) -
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS disponible_total,

  -- ====================================================================
  -- UTILIDADES
  -- ====================================================================
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) -
  (COALESCE(e.provision_combustible_peaje, 0) +
   COALESCE(e.provision_materiales, 0) +
   COALESCE(e.provision_recursos_humanos, 0) +
   COALESCE(e.provision_solicitudes_pago, 0)) AS utilidad_estimada,

  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = true
     AND i.deleted_at IS NULL) -
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS utilidad_real,

  -- ====================================================================
  -- METADATA
  -- ====================================================================
  e.created_at,
  e.updated_at

FROM
  evt_eventos e
  LEFT JOIN evt_clientes c ON e.cliente_id = c.id
  LEFT JOIN evt_estados est ON e.estado_id = est.id
  LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
WHERE
  e.activo = true;

-- ====================================================================
-- NOTA: Después de ejecutar, verificar con:
-- SELECT * FROM vw_eventos_analisis_financiero LIMIT 5;
-- ====================================================================
