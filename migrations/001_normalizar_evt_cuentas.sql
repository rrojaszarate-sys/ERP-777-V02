-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 001: NORMALIZAR TABLA evt_cuentas
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-10-27
-- Propósito: Agregar campos necesarios para un catálogo de cuentas robusto
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Agregar columnas para normalizar el catálogo de cuentas
ALTER TABLE evt_cuentas
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(30), -- 'activo','pasivo','capital','ingreso','gasto'
  ADD COLUMN IF NOT EXISTS subtipo VARCHAR(50), -- 'banco','caja','cliente','proveedor', etc
  ADD COLUMN IF NOT EXISTS naturaleza VARCHAR(10), -- 'deudora' | 'acreedora'
  ADD COLUMN IF NOT EXISTS nivel INTEGER DEFAULT 1, -- 1=Mayor, 2=Submáyor, 3=Detalle
  ADD COLUMN IF NOT EXISTS cuenta_padre_id INTEGER REFERENCES evt_cuentas(id),
  ADD COLUMN IF NOT EXISTS acepta_movimientos BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS moneda CHAR(3) DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS requiere_comprobante BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS saldo_inicial NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Comentarios para documentar
COMMENT ON COLUMN evt_cuentas.codigo IS 'Código único de la cuenta (ej: 1010, 4010-001)';
COMMENT ON COLUMN evt_cuentas.tipo IS 'Tipo de cuenta según su clasificación contable';
COMMENT ON COLUMN evt_cuentas.subtipo IS 'Subtipo o categoría específica de la cuenta';
COMMENT ON COLUMN evt_cuentas.naturaleza IS 'Naturaleza de la cuenta: deudora (debe) o acreedora (haber)';
COMMENT ON COLUMN evt_cuentas.nivel IS 'Nivel jerárquico: 1=Mayor, 2=Submáyor, 3=Detalle';
COMMENT ON COLUMN evt_cuentas.cuenta_padre_id IS 'Referencia a la cuenta padre en la jerarquía';
COMMENT ON COLUMN evt_cuentas.acepta_movimientos IS 'Si false, es cuenta de agrupación (no acepta partidas)';
COMMENT ON COLUMN evt_cuentas.requiere_comprobante IS 'Si true, todo movimiento debe tener documento adjunto';

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_evt_cuentas_codigo ON evt_cuentas(codigo);
CREATE INDEX IF NOT EXISTS idx_evt_cuentas_tipo ON evt_cuentas(tipo);
CREATE INDEX IF NOT EXISTS idx_evt_cuentas_subtipo ON evt_cuentas(subtipo);
CREATE INDEX IF NOT EXISTS idx_evt_cuentas_nivel ON evt_cuentas(nivel);
CREATE INDEX IF NOT EXISTS idx_evt_cuentas_padre ON evt_cuentas(cuenta_padre_id);
CREATE INDEX IF NOT EXISTS idx_evt_cuentas_activo ON evt_cuentas(activo);

-- Actualizar cuentas existentes con valores por defecto si son NULL
UPDATE evt_cuentas 
SET 
  tipo = CASE 
    WHEN nombre ILIKE '%banco%' OR nombre ILIKE '%caja%' THEN 'activo'
    WHEN nombre ILIKE '%ingreso%' OR nombre ILIKE '%venta%' THEN 'ingreso'
    WHEN nombre ILIKE '%gasto%' OR nombre ILIKE '%compra%' THEN 'gasto'
    ELSE 'activo'
  END,
  subtipo = CASE
    WHEN nombre ILIKE '%banco%' THEN 'banco'
    WHEN nombre ILIKE '%caja%' THEN 'caja'
    ELSE 'otros'
  END,
  naturaleza = CASE
    WHEN tipo IN ('activo', 'gasto') THEN 'deudora'
    ELSE 'acreedora'
  END,
  activo = true
WHERE tipo IS NULL;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (en caso de necesitar revertir)
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
-- ALTER TABLE evt_cuentas
--   DROP COLUMN IF EXISTS codigo,
--   DROP COLUMN IF EXISTS tipo,
--   DROP COLUMN IF EXISTS subtipo,
--   DROP COLUMN IF EXISTS naturaleza,
--   DROP COLUMN IF EXISTS nivel,
--   DROP COLUMN IF EXISTS cuenta_padre_id,
--   DROP COLUMN IF EXISTS acepta_movimientos,
--   DROP COLUMN IF EXISTS moneda,
--   DROP COLUMN IF EXISTS requiere_comprobante,
--   DROP COLUMN IF EXISTS saldo_inicial,
--   DROP COLUMN IF EXISTS activo;
-- COMMIT;
