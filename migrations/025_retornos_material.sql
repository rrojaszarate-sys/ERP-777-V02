-- ============================================================================
-- MIGRACIÓN 025: RETORNOS DE MATERIAL
-- ============================================================================
-- Permite registrar devoluciones de material no utilizado
-- Los retornos se restan del total de gastos de materiales
-- ============================================================================

-- 1. Agregar campo tipo_movimiento a evt_gastos_erp
ALTER TABLE evt_gastos_erp
ADD COLUMN IF NOT EXISTS tipo_movimiento VARCHAR(20) DEFAULT 'gasto'
CHECK (tipo_movimiento IN ('gasto', 'retorno'));

-- 2. Agregar índice para consultas filtradas por tipo
CREATE INDEX IF NOT EXISTS idx_gastos_tipo_movimiento
ON evt_gastos_erp(tipo_movimiento);

-- 3. Comentario descriptivo
COMMENT ON COLUMN evt_gastos_erp.tipo_movimiento IS
'Tipo de movimiento: gasto (normal) o retorno (devolución de material no utilizado)';

-- 4. Actualizar registros existentes (todos son gastos normales)
UPDATE evt_gastos_erp
SET tipo_movimiento = 'gasto'
WHERE tipo_movimiento IS NULL;

-- ============================================================================
-- VISTA: vw_gastos_netos_evento
-- Calcula gastos netos = gastos - retornos por evento y categoría
-- ============================================================================
CREATE OR REPLACE VIEW vw_gastos_netos_evento AS
SELECT
  evento_id,
  categoria_id,
  -- Gastos normales
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' THEN subtotal ELSE 0 END), 0) as gastos_subtotal,
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' THEN iva ELSE 0 END), 0) as gastos_iva,
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' THEN total ELSE 0 END), 0) as gastos_total,
  -- Retornos
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN subtotal ELSE 0 END), 0) as retornos_subtotal,
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN iva ELSE 0 END), 0) as retornos_iva,
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN total ELSE 0 END), 0) as retornos_total,
  -- Netos (gastos - retornos)
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' THEN subtotal ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN subtotal ELSE 0 END), 0) as neto_subtotal,
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' THEN iva ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN iva ELSE 0 END), 0) as neto_iva,
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' THEN total ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN total ELSE 0 END), 0) as neto_total,
  -- Contadores
  COUNT(*) FILTER (WHERE tipo_movimiento = 'gasto') as num_gastos,
  COUNT(*) FILTER (WHERE tipo_movimiento = 'retorno') as num_retornos
FROM evt_gastos_erp
WHERE deleted_at IS NULL
GROUP BY evento_id, categoria_id;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
