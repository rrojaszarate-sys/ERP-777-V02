-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 002: AGREGAR CUENTAS CONTABLES A evt_ingresos Y evt_gastos
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-10-27
-- Propósito: Permitir que ingresos y gastos de eventos afecten cuentas contables
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- MODIFICAR evt_ingresos
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE evt_ingresos
  ADD COLUMN IF NOT EXISTS cuenta_id INTEGER REFERENCES evt_cuentas(id),
  ADD COLUMN IF NOT EXISTS cuenta_contable_ingreso_id INTEGER REFERENCES evt_cuentas(id),
  ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(10) DEFAULT 'I';

COMMENT ON COLUMN evt_ingresos.cuenta_id IS 
  'Cuenta bancaria o de caja donde se depositó el ingreso';
COMMENT ON COLUMN evt_ingresos.cuenta_contable_ingreso_id IS 
  'Cuenta contable de ingreso que se afecta (ej: 4010 - Ingresos por eventos)';
COMMENT ON COLUMN evt_ingresos.tipo_comprobante IS 
  'Tipo de comprobante fiscal: I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago';

-- Índices
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cuenta_id ON evt_ingresos(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cuenta_contable ON evt_ingresos(cuenta_contable_ingreso_id);
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cobrado ON evt_ingresos(cobrado);

-- ─────────────────────────────────────────────────────────────────────────
-- MODIFICAR evt_gastos
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS cuenta_id INTEGER REFERENCES evt_cuentas(id),
  ADD COLUMN IF NOT EXISTS cuenta_contable_gasto_id INTEGER REFERENCES evt_cuentas(id),
  ADD COLUMN IF NOT EXISTS pagado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_pago DATE,
  ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(10) DEFAULT 'E';

COMMENT ON COLUMN evt_gastos.cuenta_id IS 
  'Cuenta bancaria o de caja desde donde se pagó el gasto';
COMMENT ON COLUMN evt_gastos.cuenta_contable_gasto_id IS 
  'Cuenta contable de gasto que se afecta (ej: 5010 - Gastos operativos)';
COMMENT ON COLUMN evt_gastos.pagado IS 
  'Indica si el gasto ya fue pagado';
COMMENT ON COLUMN evt_gastos.fecha_pago IS 
  'Fecha en que se realizó el pago';
COMMENT ON COLUMN evt_gastos.tipo_comprobante IS 
  'Tipo de comprobante fiscal: I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago';

-- Índices
CREATE INDEX IF NOT EXISTS idx_evt_gastos_cuenta_id ON evt_gastos(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_cuenta_contable ON evt_gastos(cuenta_contable_gasto_id);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_pagado ON evt_gastos(pagado);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_fecha_pago ON evt_gastos(fecha_pago);

-- ─────────────────────────────────────────────────────────────────────────
-- VALIDACIONES
-- ─────────────────────────────────────────────────────────────────────────

-- Constraint: tipo_comprobante solo puede tener valores válidos en evt_ingresos
ALTER TABLE evt_ingresos
  DROP CONSTRAINT IF EXISTS chk_evt_ingresos_tipo_comprobante;

ALTER TABLE evt_ingresos
  ADD CONSTRAINT chk_evt_ingresos_tipo_comprobante 
  CHECK (tipo_comprobante IN ('I', 'P'));

-- Constraint: tipo_comprobante solo puede tener valores válidos en evt_gastos
ALTER TABLE evt_gastos
  DROP CONSTRAINT IF EXISTS chk_evt_gastos_tipo_comprobante;

ALTER TABLE evt_gastos
  ADD CONSTRAINT chk_evt_gastos_tipo_comprobante 
  CHECK (tipo_comprobante IN ('E', 'T', 'N', 'P'));

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (en caso de necesitar revertir)
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
-- ALTER TABLE evt_ingresos
--   DROP CONSTRAINT IF EXISTS chk_evt_ingresos_tipo_comprobante,
--   DROP COLUMN IF EXISTS cuenta_id,
--   DROP COLUMN IF EXISTS cuenta_contable_ingreso_id,
--   DROP COLUMN IF EXISTS tipo_comprobante;
--
-- ALTER TABLE evt_gastos
--   DROP CONSTRAINT IF EXISTS chk_evt_gastos_tipo_comprobante,
--   DROP COLUMN IF EXISTS cuenta_id,
--   DROP COLUMN IF EXISTS cuenta_contable_gasto_id,
--   DROP COLUMN IF EXISTS pagado,
--   DROP COLUMN IF EXISTS fecha_pago,
--   DROP COLUMN IF EXISTS tipo_comprobante;
-- COMMIT;
