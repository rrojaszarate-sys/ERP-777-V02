-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 005: CONTABILIDAD - ASIENTOS Y MOVIMIENTOS BANCARIOS
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-10-27
-- Propósito: Sistema de partida doble y control de movimientos bancarios
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- SECUENCIA: Números de asiento
-- ─────────────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS seq_numero_asiento START 1;

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cont_movimientos_bancarios
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cont_movimientos_bancarios (
  id SERIAL PRIMARY KEY,
  
  -- Tipo de movimiento
  tipo VARCHAR(30) NOT NULL CHECK (
    tipo IN ('deposito', 'retiro', 'transferencia', 'ajuste', 'fee', 'interes')
  ),
  
  -- Cuentas (ambas deben ser de tipo banco/caja)
  cuenta_origen_id INTEGER REFERENCES evt_cuentas(id),
  cuenta_destino_id INTEGER REFERENCES evt_cuentas(id),
  
  -- Montos
  monto NUMERIC NOT NULL CHECK (monto > 0),
  moneda CHAR(3) DEFAULT 'MXN',
  tipo_cambio NUMERIC DEFAULT 1 CHECK (tipo_cambio > 0),
  
  -- Referencia a transacción origen
  referencia_tabla VARCHAR(50),
  referencia_id INTEGER,
  
  -- Información adicional
  concepto TEXT NOT NULL,
  referencia_bancaria TEXT,
  fecha_movimiento DATE NOT NULL,
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'confirmado' CHECK (
    estado IN ('pendiente', 'confirmado', 'rechazado', 'cancelado')
  ),
  conciliado BOOLEAN DEFAULT false,
  fecha_conciliacion DATE,
  conciliado_por UUID REFERENCES core_users(id),
  
  -- Auditoría
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id),
  
  -- Constraint: debe tener al menos una cuenta
  CHECK (cuenta_origen_id IS NOT NULL OR cuenta_destino_id IS NOT NULL)
);

-- Índices
CREATE INDEX idx_movimientos_cuenta_origen ON cont_movimientos_bancarios(cuenta_origen_id);
CREATE INDEX idx_movimientos_cuenta_destino ON cont_movimientos_bancarios(cuenta_destino_id);
CREATE INDEX idx_movimientos_fecha ON cont_movimientos_bancarios(fecha_movimiento);
CREATE INDEX idx_movimientos_referencia ON cont_movimientos_bancarios(referencia_tabla, referencia_id);
CREATE INDEX idx_movimientos_tipo ON cont_movimientos_bancarios(tipo);
CREATE INDEX idx_movimientos_estado ON cont_movimientos_bancarios(estado);
CREATE INDEX idx_movimientos_conciliado ON cont_movimientos_bancarios(conciliado);

COMMENT ON TABLE cont_movimientos_bancarios IS 
  'Registro de movimientos bancarios (depósitos, retiros, transferencias)';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cont_asientos_contables
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cont_asientos_contables (
  id SERIAL PRIMARY KEY,
  
  -- Información del asiento
  numero_asiento VARCHAR(20) UNIQUE NOT NULL,
  fecha_asiento DATE NOT NULL,
  periodo VARCHAR(7) NOT NULL, -- YYYY-MM
  descripcion TEXT NOT NULL,
  
  -- Referencia origen
  referencia_tabla VARCHAR(50),
  referencia_id INTEGER,
  
  -- Tipo
  tipo_asiento VARCHAR(30) CHECK (
    tipo_asiento IN ('ingreso', 'egreso', 'traspaso', 'ajuste', 'cierre', 'apertura')
  ),
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (
    estado IN ('borrador', 'confirmado', 'cerrado', 'cancelado')
  ),
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id),
  confirmado_at TIMESTAMPTZ,
  confirmado_por UUID REFERENCES core_users(id),
  cancelado_at TIMESTAMPTZ,
  cancelado_por UUID REFERENCES core_users(id),
  razon_cancelacion TEXT
);

-- Índices
CREATE INDEX idx_asientos_fecha ON cont_asientos_contables(fecha_asiento);
CREATE INDEX idx_asientos_periodo ON cont_asientos_contables(periodo);
CREATE INDEX idx_asientos_referencia ON cont_asientos_contables(referencia_tabla, referencia_id);
CREATE INDEX idx_asientos_tipo ON cont_asientos_contables(tipo_asiento);
CREATE INDEX idx_asientos_estado ON cont_asientos_contables(estado);
CREATE INDEX idx_asientos_numero ON cont_asientos_contables(numero_asiento);

COMMENT ON TABLE cont_asientos_contables IS 
  'Encabezados de asientos contables (partida doble)';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cont_partidas
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cont_partidas (
  id SERIAL PRIMARY KEY,
  
  -- Asiento al que pertenece
  asiento_id INTEGER REFERENCES cont_asientos_contables(id) ON DELETE CASCADE,
  
  -- Cuenta afectada
  cuenta_id INTEGER REFERENCES evt_cuentas(id) NOT NULL,
  
  -- Montos (una partida solo puede tener debe O haber, no ambos)
  debe NUMERIC DEFAULT 0 CHECK (debe >= 0),
  haber NUMERIC DEFAULT 0 CHECK (haber >= 0),
  
  -- Descripción
  concepto TEXT,
  
  -- Referencia a documento
  documento_id INTEGER REFERENCES cont_documentos(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: debe XOR haber (solo uno puede ser > 0)
  CHECK (
    (debe > 0 AND haber = 0) OR
    (haber > 0 AND debe = 0) OR
    (debe = 0 AND haber = 0)
  )
);

-- Índices
CREATE INDEX idx_partidas_asiento ON cont_partidas(asiento_id);
CREATE INDEX idx_partidas_cuenta ON cont_partidas(cuenta_id);
CREATE INDEX idx_partidas_documento ON cont_partidas(documento_id);

COMMENT ON TABLE cont_partidas IS 
  'Partidas individuales de asientos contables (debe y haber)';

-- ─────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: Validar balance de asiento
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_validar_balance_asiento()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debe NUMERIC;
  v_total_haber NUMERIC;
  v_diferencia NUMERIC;
BEGIN
  -- Calcular totales del asiento
  SELECT 
    COALESCE(SUM(debe), 0),
    COALESCE(SUM(haber), 0)
  INTO v_total_debe, v_total_haber
  FROM cont_partidas
  WHERE asiento_id = COALESCE(NEW.asiento_id, OLD.asiento_id);
  
  v_diferencia := v_total_debe - v_total_haber;
  
  -- Si el asiento está confirmado, debe estar balanceado
  IF EXISTS (
    SELECT 1 FROM cont_asientos_contables 
    WHERE id = COALESCE(NEW.asiento_id, OLD.asiento_id) 
    AND estado = 'confirmado'
  ) THEN
    IF ABS(v_diferencia) > 0.01 THEN
      RAISE EXCEPTION 'El asiento no está balanceado. Debe: %, Haber: %, Diferencia: %',
        v_total_debe, v_total_haber, v_diferencia;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar balance al insertar/actualizar/eliminar partidas
CREATE TRIGGER trg_validar_balance_partidas_insert
  AFTER INSERT ON cont_partidas
  FOR EACH ROW EXECUTE FUNCTION fn_validar_balance_asiento();

CREATE TRIGGER trg_validar_balance_partidas_update
  AFTER UPDATE ON cont_partidas
  FOR EACH ROW EXECUTE FUNCTION fn_validar_balance_asiento();

CREATE TRIGGER trg_validar_balance_partidas_delete
  AFTER DELETE ON cont_partidas
  FOR EACH ROW EXECUTE FUNCTION fn_validar_balance_asiento();

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (en caso de necesitar revertir)
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_validar_balance_partidas_delete ON cont_partidas;
-- DROP TRIGGER IF EXISTS trg_validar_balance_partidas_update ON cont_partidas;
-- DROP TRIGGER IF EXISTS trg_validar_balance_partidas_insert ON cont_partidas;
-- DROP FUNCTION IF EXISTS fn_validar_balance_asiento CASCADE;
-- DROP TABLE IF EXISTS cont_partidas CASCADE;
-- DROP TABLE IF EXISTS cont_asientos_contables CASCADE;
-- DROP TABLE IF EXISTS cont_movimientos_bancarios CASCADE;
-- DROP SEQUENCE IF EXISTS seq_numero_asiento CASCADE;
-- COMMIT;
