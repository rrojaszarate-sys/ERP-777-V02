-- Migration: Add Financial Analysis Fields to Events
-- Description: Adds fields for comprehensive financial analysis (estimates vs actuals)
-- Date: 2025-10-23

-- Add new financial estimate columns to evt_eventos table
ALTER TABLE evt_eventos
ADD COLUMN IF NOT EXISTS ganancia_estimada DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ingreso_estimado DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gastos_estimados DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS utilidad_estimada DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS porcentaje_utilidad_estimada DECIMAL(5,2) DEFAULT 0;

-- Add alias for real data (for clarity in queries)
ALTER TABLE evt_eventos
ADD COLUMN IF NOT EXISTS ingreso_real DECIMAL(15,2) GENERATED ALWAYS AS (total) STORED;

-- Add comments to document the new fields

-- Estimates (Proyección)
COMMENT ON COLUMN evt_eventos.ganancia_estimada IS 'Estimated revenue/profit for the event (alias: ingreso_estimado)';
COMMENT ON COLUMN evt_eventos.ingreso_estimado IS 'Estimated income for the event (same as ganancia_estimada)';
COMMENT ON COLUMN evt_eventos.gastos_estimados IS 'Estimated expenses/provisions for the event';
COMMENT ON COLUMN evt_eventos.utilidad_estimada IS 'Calculated estimated utility: ingreso_estimado - gastos_estimados';
COMMENT ON COLUMN evt_eventos.porcentaje_utilidad_estimada IS 'Calculated estimated utility percentage: (utilidad_estimada / ingreso_estimado) * 100';

-- Actuals (Resultado Real)
COMMENT ON COLUMN evt_eventos.total IS 'Total real income/revenue for the event';
COMMENT ON COLUMN evt_eventos.total_gastos IS 'Total real expenses for the event';
COMMENT ON COLUMN evt_eventos.utilidad IS 'Real profit: total - total_gastos';
COMMENT ON COLUMN evt_eventos.margen_utilidad IS 'Real profit margin %: (utilidad / total) * 100';
COMMENT ON COLUMN evt_eventos.ingreso_real IS 'Alias for total (real income) - computed column';

-- Note: presupuesto_estimado field is kept for backward compatibility
COMMENT ON COLUMN evt_eventos.presupuesto_estimado IS 'DEPRECATED: Use ganancia_estimada/ingreso_estimado instead. Kept for backward compatibility.';

-- Create or replace view for financial analysis
CREATE OR REPLACE VIEW vw_eventos_analisis_financiero AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.cliente_id,
  e.tipo_evento_id,
  e.estado_id,
  e.responsable_id,
  e.fecha_evento,
  e.fecha_fin,

  -- Client info
  c.nombre_comercial AS cliente_nombre,
  c.razon_social AS cliente_razon_social,

  -- Event type
  te.nombre AS tipo_evento,

  -- Responsible
  u.nombre AS responsable_nombre,

  -- Financial Estimates (Proyección)
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,
  COALESCE(e.gastos_estimados, 0) AS gastos_estimados,
  COALESCE(e.utilidad_estimada, 0) AS utilidad_estimada,
  COALESCE(e.porcentaje_utilidad_estimada, 0) AS margen_estimado,

  -- Financial Actuals (Resultado Real)
  COALESCE(e.total, 0) AS ingreso_real,
  COALESCE(e.total_gastos, 0) AS gastos_reales,
  COALESCE(e.utilidad, 0) AS utilidad_real,
  COALESCE(e.margen_utilidad, 0) AS margen_real,

  -- Comparisons
  COALESCE(e.utilidad, 0) - COALESCE(e.utilidad_estimada, 0) AS diferencia_absoluta,
  CASE
    WHEN COALESCE(e.utilidad_estimada, 0) > 0
    THEN ((COALESCE(e.utilidad, 0) / COALESCE(e.utilidad_estimada, 1)) - 1) * 100
    ELSE 0
  END AS diferencia_porcentaje,

  CASE
    WHEN COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) > 0
    THEN ((COALESCE(e.total, 0) / COALESCE(e.ingreso_estimado, e.ganancia_estimada, 1)) - 1) * 100
    ELSE 0
  END AS variacion_ingresos,

  CASE
    WHEN COALESCE(e.gastos_estimados, 0) > 0
    THEN ((COALESCE(e.total_gastos, 0) / COALESCE(e.gastos_estimados, 1)) - 1) * 100
    ELSE 0
  END AS variacion_gastos,

  COALESCE(e.margen_utilidad, 0) - COALESCE(e.porcentaje_utilidad_estimada, 0) AS variacion_margen,

  -- Status classification
  CASE
    WHEN COALESCE(e.margen_utilidad, 0) >= 50 THEN 'excelente'
    WHEN COALESCE(e.margen_utilidad, 0) >= 35 THEN 'bueno'
    WHEN COALESCE(e.margen_utilidad, 0) >= 20 THEN 'alerta'
    ELSE 'critico'
  END AS status_financiero,

  -- Alert level
  CASE
    WHEN ABS(((COALESCE(e.utilidad, 0) / NULLIF(COALESCE(e.utilidad_estimada, 1), 0)) - 1) * 100) > 20 THEN 'danger'
    WHEN ABS(((COALESCE(e.utilidad, 0) / NULLIF(COALESCE(e.utilidad_estimada, 1), 0)) - 1) * 100) > 10 THEN 'warning'
    ELSE 'none'
  END AS nivel_alerta,

  e.activo,
  e.created_at,
  e.updated_at

FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN core_users u ON e.responsable_id = u.id
WHERE e.activo = true;

COMMENT ON VIEW vw_eventos_analisis_financiero IS 'Vista consolidada para análisis financiero de eventos con comparación de estimados vs reales';
