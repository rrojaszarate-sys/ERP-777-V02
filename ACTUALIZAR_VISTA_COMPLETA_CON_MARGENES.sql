-- ═══════════════════════════════════════════════════════════════════════════
-- ACTUALIZACIÓN COMPLETA DE VISTA: vw_eventos_analisis_financiero
-- Incluye TODOS los campos necesarios + Márgenes + Gastos por categoría
-- ═══════════════════════════════════════════════════════════════════════════

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
  -- GASTOS POR CATEGORÍA - COMBUSTIBLE (ID 9)
  -- ====================================================================
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 9
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_combustible_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 9
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_combustible_pendientes,

  -- ====================================================================
  -- GASTOS POR CATEGORÍA - MATERIALES (ID 8)
  -- ====================================================================
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 8
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_materiales_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 8
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_materiales_pendientes,

  -- ====================================================================
  -- GASTOS POR CATEGORÍA - RECURSOS HUMANOS (ID 7)
  -- ====================================================================
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 7
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_rh_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 7
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_rh_pendientes,

  -- ====================================================================
  -- GASTOS POR CATEGORÍA - SOLICITUDES DE PAGO (ID 6)
  -- ====================================================================
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 6
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_sps_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 6
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
     WHERE g.evento_id = e.id
       AND g.categoria_id = 9
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS disponible_combustible,

  COALESCE(e.provision_materiales, 0) - 
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id
       AND g.categoria_id = 8
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS disponible_materiales,

  COALESCE(e.provision_recursos_humanos, 0) - 
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id
       AND g.categoria_id = 7
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS disponible_rh,

  COALESCE(e.provision_solicitudes_pago, 0) - 
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id
       AND g.categoria_id = 6
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS disponible_sps,

  -- ====================================================================
  -- DISPONIBLE TOTAL
  -- ====================================================================
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
  -- PROVISIONES COMPROMETIDAS Y DISPONIBLES
  -- ====================================================================
  -- Provisiones comprometidas = Gastos pendientes de pago (ya ejercidos pero no pagados)
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS provisiones_comprometidas,

  -- Provisiones disponibles = Provisiones totales - Gastos totales (pagados + pendientes)
  (COALESCE(e.provision_combustible_peaje, 0) +
   COALESCE(e.provision_materiales, 0) +
   COALESCE(e.provision_recursos_humanos, 0) +
   COALESCE(e.provision_solicitudes_pago, 0)) -
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.deleted_at IS NULL) AS provisiones_disponibles,

  -- ====================================================================
  -- UTILIDAD ESTIMADA (anteriormente "Utilidad Planeada")
  -- ====================================================================
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) -
  (COALESCE(e.provision_combustible_peaje, 0) +
   COALESCE(e.provision_materiales, 0) +
   COALESCE(e.provision_recursos_humanos, 0) +
   COALESCE(e.provision_solicitudes_pago, 0)) AS utilidad_estimada,

  -- ====================================================================
  -- MARGEN ESTIMADO (%)
  -- ====================================================================
  CASE 
    WHEN COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) > 0
    THEN ROUND(
      ((COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) -
        (COALESCE(e.provision_combustible_peaje, 0) +
         COALESCE(e.provision_materiales, 0) +
         COALESCE(e.provision_recursos_humanos, 0) +
         COALESCE(e.provision_solicitudes_pago, 0))) /
       COALESCE(e.ingreso_estimado, e.ganancia_estimada, 1))::NUMERIC * 100, 2)
    ELSE 0
  END AS margen_estimado_pct,

  -- ====================================================================
  -- UTILIDAD REAL
  -- ====================================================================
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
  -- UTILIDAD COBRADA (Nuevo campo solicitado)
  -- ====================================================================
  -- Utilidad cobrada = Ingresos cobrados - Gastos pagados
  -- Es el mismo cálculo que utilidad_real, pero con nombre más claro
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = true
     AND i.deleted_at IS NULL) -
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS utilidad_cobrada,

  -- ====================================================================
  -- MARGEN ESTIMADO (%)
  -- ====================================================================
  CASE 
    WHEN (SELECT COALESCE(SUM(i.total), 0)
          FROM evt_ingresos i
          WHERE i.evento_id = e.id
            AND i.cobrado = true
            AND i.deleted_at IS NULL) > 0
    THEN ROUND(
      (((SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos i
         WHERE i.evento_id = e.id
           AND i.cobrado = true
           AND i.deleted_at IS NULL) -
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos g
         WHERE g.evento_id = e.id
           AND g.pagado = true
           AND g.deleted_at IS NULL)) /
       (SELECT COALESCE(SUM(i.total), 1)
        FROM evt_ingresos i
        WHERE i.evento_id = e.id
          AND i.cobrado = true
          AND i.deleted_at IS NULL))::NUMERIC * 100, 2)
    ELSE 0
  END AS margen_real_pct,

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
-- COMENTARIO DE LA VISTA
-- ====================================================================
COMMENT ON VIEW vw_eventos_analisis_financiero IS
'Vista completa de análisis financiero de eventos con:
- Provisiones desglosadas en 4 categorías (Combustible/Peaje, Materiales, RH, SPs)
- Gastos pagados y pendientes por cada categoría
- Ingresos cobrados y pendientes
- Disponible por categoría
- Utilidad estimada y real
- MÁRGENES: margen_estimado_pct y margen_real_pct
- Cálculos automáticos y congruentes con datos reales';

-- ====================================================================
-- VERIFICACIÓN
-- ====================================================================
SELECT 'Vista actualizada correctamente' AS status;
SELECT COUNT(*) AS total_eventos FROM vw_eventos_analisis_financiero;
SELECT 
  clave_evento,
  ingreso_estimado,
  provisiones_total,
  utilidad_estimada,
  margen_estimado_pct,
  ingresos_cobrados,
  gastos_pagados_total,
  utilidad_real,
  margen_real_pct
FROM vw_eventos_analisis_financiero
LIMIT 5;
