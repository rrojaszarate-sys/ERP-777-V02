-- =====================================================================
-- MIGRACIÓN 009: Análisis Financiero con Seguimiento de Cobros
-- =====================================================================
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard: https://supabase.com/dashboard/project/gomnouwackzvthpwyric/sql
-- 2. Copia TODO el contenido de este archivo
-- 3. Pégalo en el editor SQL
-- 4. Ejecuta con RUN
-- =====================================================================

-- Vista principal: Análisis financiero completo de eventos
DROP VIEW IF EXISTS vw_eventos_analisis_financiero CASCADE;
CREATE VIEW vw_eventos_analisis_financiero AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.cliente_id,
  c.razon_social AS cliente_nombre,
  e.fecha_evento,
  e.estado_id,
  es.nombre AS estado_nombre,

  -- Estimados
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,
  COALESCE(e.provisiones, 0) AS provisiones,
  COALESCE(e.utilidad_estimada, 0) AS utilidad_estimada,
  COALESCE(e.porcentaje_utilidad_estimada, 0) AS porcentaje_utilidad_estimada,

  -- Ingresos
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) AS ingresos_cobrados,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) AS ingresos_pendientes,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) AS ingresos_totales,

  -- Análisis de variación de ingresos
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS diferencia_ingresos_absoluta,
  CASE
    WHEN COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) > 0
    THEN (((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / COALESCE(e.ingreso_estimado, e.ganancia_estimada, 1)) - 1) * 100
    ELSE 0
  END AS variacion_ingresos_porcentaje,

  -- Porcentaje de cobro
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) > 0
    THEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL)) * 100
    ELSE 0
  END AS porcentaje_cobro,

  -- Status de cobro
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) = 0 THEN 'sin_ingresos'
    WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) = 0 THEN 'cobrado_completo'
    WHEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / NULLIF((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL), 0)) >= 0.80 THEN 'cobro_bueno'
    WHEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / NULLIF((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL), 0)) >= 0.50 THEN 'cobro_parcial'
    ELSE 'cobro_critico'
  END AS status_cobro,

  -- Gastos
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS gastos_pagados,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = false AND g.deleted_at IS NULL) AS gastos_pendientes,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.deleted_at IS NULL) AS gastos_totales,

  -- Análisis de variación de gastos
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) - COALESCE(e.provisiones, 0) AS diferencia_gastos_absoluta,
  CASE
    WHEN COALESCE(e.provisiones, 0) > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) / COALESCE(e.provisiones, 1)) - 1) * 100
    ELSE 0
  END AS variacion_gastos_porcentaje,

  -- Status presupuestal
  CASE
    WHEN COALESCE(e.provisiones, 0) = 0 THEN 'sin_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) <= COALESCE(e.provisiones, 0) THEN 'dentro_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) <= (COALESCE(e.provisiones, 0) * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal,

  -- Utilidad
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS utilidad_real,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.deleted_at IS NULL) AS utilidad_proyectada,

  -- Margen de utilidad
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) > 0
    THEN (((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL)) / (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL)) * 100
    ELSE 0
  END AS margen_utilidad_real,

  -- Diferencia de utilidad
  ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL)) - COALESCE(e.utilidad_estimada, 0) AS diferencia_utilidad_absoluta,

  -- Status financiero integral
  CASE
    WHEN (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) <= COALESCE(e.provisiones, 0)
      AND ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / NULLIF((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL), 0)) >= 0.80
      THEN 'saludable'
    WHEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / NULLIF((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL), 0)) < 0.50
      OR (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) > (COALESCE(e.provisiones, 0) * 1.05)
      THEN 'critico'
    ELSE 'atencion'
  END AS status_financiero_integral,

  -- Días desde el evento (para análisis de morosidad)
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) > 0
      AND e.fecha_evento IS NOT NULL
      AND CAST(e.fecha_evento AS DATE) < CURRENT_DATE
    THEN (CURRENT_DATE - CAST(e.fecha_evento AS DATE))
    ELSE 0
  END AS dias_desde_evento,

  -- Timestamps
  e.created_at,
  e.updated_at
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
WHERE e.activo = true;

-- Vista especializada: Eventos con problemas de cobro
DROP VIEW IF EXISTS vw_eventos_problemas_cobro CASCADE;
CREATE VIEW vw_eventos_problemas_cobro AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  c.razon_social AS cliente_nombre,
  e.fecha_evento,
  es.nombre AS estado_nombre,

  -- Montos
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) AS ingresos_cobrados,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) AS ingresos_pendientes,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) AS ingresos_totales,

  -- Porcentaje cobrado
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) > 0
    THEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL)) * 100
    ELSE 0
  END AS porcentaje_cobrado,

  -- Días desde el evento
  CASE
    WHEN e.fecha_evento IS NOT NULL AND CAST(e.fecha_evento AS DATE) < CURRENT_DATE
    THEN (CURRENT_DATE - CAST(e.fecha_evento AS DATE))
    ELSE 0
  END AS dias_desde_evento,

  -- Categoría de urgencia
  CASE
    WHEN e.fecha_evento IS NULL THEN 'sin_fecha'
    WHEN CAST(e.fecha_evento AS DATE) > CURRENT_DATE THEN 'evento_futuro'
    WHEN (CURRENT_DATE - CAST(e.fecha_evento AS DATE)) <= 30 THEN 'reciente'
    WHEN (CURRENT_DATE - CAST(e.fecha_evento AS DATE)) <= 60 THEN 'urgente'
    WHEN (CURRENT_DATE - CAST(e.fecha_evento AS DATE)) <= 90 THEN 'muy_urgente'
    ELSE 'critico'
  END AS categoria_urgencia,

  -- Cantidad de facturas pendientes
  (SELECT COUNT(*) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) AS facturas_pendientes
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
WHERE e.activo = true
  AND (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) > 0
ORDER BY
  CASE
    WHEN e.fecha_evento IS NULL THEN 999999
    ELSE (CURRENT_DATE - CAST(e.fecha_evento AS DATE))
  END DESC;

-- Índices para optimizar el rendimiento
CREATE INDEX IF NOT EXISTS idx_evt_eventos_cliente_fecha ON evt_eventos(cliente_id, fecha_evento) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cobrado_fecha ON evt_ingresos(cobrado, created_at) WHERE deleted_at IS NULL;

-- Función auxiliar: Resumen financiero de un evento específico
CREATE OR REPLACE FUNCTION get_evento_financial_summary(p_evento_id INTEGER)
RETURNS TABLE(
  concepto TEXT,
  estimado NUMERIC,
  monto_real NUMERIC,
  pendiente NUMERIC,
  diferencia NUMERIC,
  porcentaje_cumplimiento NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  -- Ingresos
  SELECT
    'Ingresos'::TEXT,
    COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0),
    (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL),
    (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = false AND i.deleted_at IS NULL),
    (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL) - COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0),
    CASE
      WHEN COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) > 0
      THEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL) / COALESCE(e.ingreso_estimado, e.ganancia_estimada, 1)) * 100
      ELSE 0
    END
  FROM evt_eventos e
  WHERE e.id = p_evento_id

  UNION ALL

  -- Gastos
  SELECT
    'Gastos'::TEXT,
    COALESCE(e.provisiones, 0),
    (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL),
    (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = false AND g.deleted_at IS NULL),
    (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL) - COALESCE(e.provisiones, 0),
    CASE
      WHEN COALESCE(e.provisiones, 0) > 0
      THEN ((SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL) / COALESCE(e.provisiones, 1)) * 100
      ELSE 0
    END
  FROM evt_eventos e
  WHERE e.id = p_evento_id

  UNION ALL

  -- Utilidad
  SELECT
    'Utilidad'::TEXT,
    COALESCE(e.utilidad_estimada, 0),
    (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL),
    0,
    ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL)) - COALESCE(e.utilidad_estimada, 0),
    CASE
      WHEN COALESCE(e.utilidad_estimada, 0) > 0
      THEN (((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL)) / COALESCE(e.utilidad_estimada, 1)) * 100
      ELSE 0
    END
  FROM evt_eventos e
  WHERE e.id = p_evento_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================================
-- DESPUÉS DE EJECUTAR:
-- Verifica que se crearon correctamente ejecutando:
--   SELECT * FROM vw_eventos_analisis_financiero LIMIT 5;
--   SELECT * FROM vw_eventos_problemas_cobro LIMIT 5;
-- =====================================================================
