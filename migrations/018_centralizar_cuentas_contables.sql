-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 018: CENTRALIZAR CUENTAS CONTABLES EN MÓDULO CONTABILIDAD
-- ═══════════════════════════════════════════════════════════════════════════════
-- Las cuentas contables de GNI (cont_claves_gasto) pasan a ser las principales
-- Se eliminan las de eventos (evt_cuentas_contables)
-- La tabla cont_cuentas_contables será la fuente única para todo el sistema
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. CREAR TABLA CENTRALIZADA DE CUENTAS CONTABLES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cont_cuentas_contables (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL,

  -- Identificación (heredado de cont_claves_gasto)
  clave VARCHAR(50) NOT NULL,           -- MDE2025-001, MDE2025-002A, etc.
  cuenta VARCHAR(100) NOT NULL,         -- GASTOS FIJOS, DISEÑOS, etc.
  subcuenta VARCHAR(200),               -- Agua embotellada, Luz, etc.

  -- Clasificación contable
  tipo VARCHAR(20) DEFAULT 'gasto',     -- activo, pasivo, capital, ingreso, gasto

  -- Presupuesto
  presupuesto_anual NUMERIC(15,2) DEFAULT 0,
  presupuesto_mensual NUMERIC(15,2) GENERATED ALWAYS AS (presupuesto_anual / 12) STORED,

  -- Descripción y notas
  descripcion TEXT,

  -- Control
  orden_display INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT true,

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,

  -- Constraints
  UNIQUE(company_id, clave)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cont_cuentas_contables_company ON cont_cuentas_contables(company_id);
CREATE INDEX IF NOT EXISTS idx_cont_cuentas_contables_cuenta ON cont_cuentas_contables(cuenta);
CREATE INDEX IF NOT EXISTS idx_cont_cuentas_contables_tipo ON cont_cuentas_contables(tipo);

-- 2. MIGRAR DATOS DE cont_claves_gasto A cont_cuentas_contables
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO cont_cuentas_contables (
  company_id, clave, cuenta, subcuenta, tipo, presupuesto_anual,
  descripcion, orden_display, activa, created_at, updated_at
)
SELECT
  company_id,
  clave,
  cuenta,
  subcuenta,
  'gasto',  -- Todas las claves de GNI son gastos
  COALESCE(presupuesto_anual, 0),
  descripcion,
  COALESCE(orden_display, 0),
  COALESCE(activo, true),
  created_at,
  updated_at
FROM cont_claves_gasto
WHERE NOT EXISTS (
  SELECT 1 FROM cont_cuentas_contables
  WHERE cont_cuentas_contables.clave = cont_claves_gasto.clave
  AND cont_cuentas_contables.company_id = cont_claves_gasto.company_id
);

-- 3. AGREGAR CUENTAS DE INGRESO PARA EVENTOS
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO cont_cuentas_contables (company_id, clave, cuenta, subcuenta, tipo, activa)
SELECT DISTINCT
  company_id,
  'ING-001',
  'INGRESOS',
  'Ingresos por servicios de eventos',
  'ingreso',
  true
FROM core_companies
WHERE NOT EXISTS (
  SELECT 1 FROM cont_cuentas_contables WHERE clave = 'ING-001'
);

-- 4. MODIFICAR evt_ingresos PARA USAR cont_cuentas_contables
-- ═══════════════════════════════════════════════════════════════════════════════

-- 4.1 Eliminar FK existente si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'evt_ingresos_cuenta_contable_id_fkey'
  ) THEN
    ALTER TABLE evt_ingresos DROP CONSTRAINT evt_ingresos_cuenta_contable_id_fkey;
  END IF;
END $$;

-- 4.2 Hacer nullable temporalmente mientras migramos
ALTER TABLE evt_ingresos ALTER COLUMN cuenta_contable_id DROP NOT NULL;

-- 4.3 Actualizar referencias a la nueva tabla
UPDATE evt_ingresos i
SET cuenta_contable_id = (
  SELECT cc.id FROM cont_cuentas_contables cc
  WHERE cc.clave = 'ING-001' AND cc.company_id = (
    SELECT company_id FROM evt_eventos e WHERE e.id = i.evento_id LIMIT 1
  )
  LIMIT 1
)
WHERE cuenta_contable_id IS NOT NULL OR cuenta_contable_id IS NULL;

-- 4.4 Agregar nueva FK
ALTER TABLE evt_ingresos
ADD CONSTRAINT fk_evt_ingresos_cuenta_contable
FOREIGN KEY (cuenta_contable_id) REFERENCES cont_cuentas_contables(id);

-- 5. MODIFICAR cont_gastos_externos (GNI) PARA USAR cont_cuentas_contables
-- ═══════════════════════════════════════════════════════════════════════════════

-- 5.1 Agregar columna cuenta_contable_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cont_gastos_externos' AND column_name = 'cuenta_contable_id'
  ) THEN
    ALTER TABLE cont_gastos_externos ADD COLUMN cuenta_contable_id INTEGER;
  END IF;
END $$;

-- 5.2 Migrar referencias de clave_gasto_id a cuenta_contable_id
UPDATE cont_gastos_externos g
SET cuenta_contable_id = (
  SELECT cc.id FROM cont_cuentas_contables cc
  INNER JOIN cont_claves_gasto cg ON cc.clave = cg.clave AND cc.company_id = cg.company_id
  WHERE cg.id = g.clave_gasto_id
  LIMIT 1
)
WHERE clave_gasto_id IS NOT NULL AND cuenta_contable_id IS NULL;

-- 5.3 Agregar FK
ALTER TABLE cont_gastos_externos
ADD CONSTRAINT fk_cont_gastos_externos_cuenta_contable
FOREIGN KEY (cuenta_contable_id) REFERENCES cont_cuentas_contables(id);

-- 6. MODIFICAR evt_provisiones PARA USAR cont_cuentas_contables
-- ═══════════════════════════════════════════════════════════════════════════════

-- 6.1 Agregar columna cuenta_contable_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evt_provisiones' AND column_name = 'cuenta_contable_id'
  ) THEN
    ALTER TABLE evt_provisiones ADD COLUMN cuenta_contable_id INTEGER;
  END IF;
END $$;

-- 6.2 Agregar FK
ALTER TABLE evt_provisiones
ADD CONSTRAINT fk_evt_provisiones_cuenta_contable
FOREIGN KEY (cuenta_contable_id) REFERENCES cont_cuentas_contables(id);

-- 7. MODIFICAR evt_gastos PARA USAR cont_cuentas_contables
-- ═══════════════════════════════════════════════════════════════════════════════

-- 7.1 Agregar columna cuenta_contable_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evt_gastos' AND column_name = 'cuenta_contable_id'
  ) THEN
    ALTER TABLE evt_gastos ADD COLUMN cuenta_contable_id INTEGER;
  END IF;
END $$;

-- 7.2 Agregar FK
ALTER TABLE evt_gastos
ADD CONSTRAINT fk_evt_gastos_cuenta_contable
FOREIGN KEY (cuenta_contable_id) REFERENCES cont_cuentas_contables(id);

-- 8. CREAR VISTA PARA COMPATIBILIDAD
-- ═══════════════════════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_cuentas_contables;
CREATE VIEW v_cuentas_contables AS
SELECT
  id,
  company_id,
  clave,
  cuenta,
  subcuenta,
  tipo,
  presupuesto_anual,
  presupuesto_mensual,
  descripcion,
  activa,
  created_at,
  updated_at
FROM cont_cuentas_contables
WHERE activa = true;

-- 9. COMENTARIOS
-- ═══════════════════════════════════════════════════════════════════════════════
COMMENT ON TABLE cont_cuentas_contables IS 'Catálogo centralizado de cuentas contables para todo el ERP';
COMMENT ON COLUMN cont_cuentas_contables.clave IS 'Código único de la cuenta (ej: MDE2025-001, ING-001)';
COMMENT ON COLUMN cont_cuentas_contables.cuenta IS 'Categoría principal (ej: GASTOS FIJOS, INGRESOS)';
COMMENT ON COLUMN cont_cuentas_contables.subcuenta IS 'Subcategoría específica (ej: Luz, Agua, etc.)';
COMMENT ON COLUMN cont_cuentas_contables.tipo IS 'Tipo contable: activo, pasivo, capital, ingreso, gasto';
