-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 012: GASTOS NO IMPACTADOS (GNI)
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-11-25
-- Propósito: Extender cont_gastos_externos para gestión completa de gastos
--            operativos con catálogos de claves, proveedores y formas de pago
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cat_claves_gasto
-- Catálogo de claves de gasto (MDE2025-001, MDE2025-002A, etc.)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cat_claves_gasto (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(20) NOT NULL,              -- MDE2025-002A
  cuenta VARCHAR(50) NOT NULL,             -- GASTOS FIJOS, MATERIALES, etc.
  subcuenta VARCHAR(100) NOT NULL,         -- Agua embotellada, Rentas, etc.
  presupuesto_anual NUMERIC DEFAULT 0,
  descripcion TEXT,
  orden_display INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clave, company_id)
);

CREATE INDEX idx_cat_claves_gasto_clave ON cat_claves_gasto(clave);
CREATE INDEX idx_cat_claves_gasto_cuenta ON cat_claves_gasto(cuenta);
CREATE INDEX idx_cat_claves_gasto_company ON cat_claves_gasto(company_id);

COMMENT ON TABLE cat_claves_gasto IS 'Catálogo de claves de gasto operativo (formato MDE2025-XXX)';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cat_formas_pago
-- Catálogo de formas de pago
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cat_formas_pago (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,             -- KUSPIT SP´S, AMEX, etc.
  tipo VARCHAR(30),                        -- transferencia, tarjeta, efectivo
  banco VARCHAR(50),                       -- SANTANDER, BBVA, etc.
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nombre, company_id)
);

CREATE INDEX idx_cat_formas_pago_nombre ON cat_formas_pago(nombre);
CREATE INDEX idx_cat_formas_pago_company ON cat_formas_pago(company_id);

COMMENT ON TABLE cat_formas_pago IS 'Catálogo de formas de pago para gastos';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cat_proveedores
-- Catálogo maestro de proveedores (híbrido: global o por módulo)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cat_proveedores (
  id SERIAL PRIMARY KEY,
  rfc VARCHAR(13),
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  direccion TEXT,
  telefono VARCHAR(20),
  email VARCHAR(100),
  contacto_nombre VARCHAR(100),
  modulo_origen VARCHAR(50),               -- NULL = global, 'contabilidad', 'eventos'
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cat_proveedores_rfc ON cat_proveedores(rfc);
CREATE INDEX idx_cat_proveedores_razon ON cat_proveedores(razon_social);
CREATE INDEX idx_cat_proveedores_company ON cat_proveedores(company_id);
CREATE INDEX idx_cat_proveedores_modulo ON cat_proveedores(modulo_origen);

COMMENT ON TABLE cat_proveedores IS 'Catálogo maestro de proveedores (SSOT)';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cat_ejecutivos
-- Catálogo de ejecutivos/responsables
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cat_ejecutivos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES core_users(id),  -- Opcional: vincular a usuario
  departamento VARCHAR(50),
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nombre, company_id)
);

CREATE INDEX idx_cat_ejecutivos_nombre ON cat_ejecutivos(nombre);
CREATE INDEX idx_cat_ejecutivos_company ON cat_ejecutivos(company_id);

COMMENT ON TABLE cat_ejecutivos IS 'Catálogo de ejecutivos responsables de gastos';

-- ─────────────────────────────────────────────────────────────────────────
-- MODIFICAR: cont_gastos_externos
-- Añadir campos para funcionalidad GNI completa
-- ─────────────────────────────────────────────────────────────────────────

-- Añadir nuevas columnas
ALTER TABLE cont_gastos_externos
  ADD COLUMN IF NOT EXISTS clave_gasto_id INTEGER REFERENCES cat_claves_gasto(id),
  ADD COLUMN IF NOT EXISTS proveedor_id INTEGER REFERENCES cat_proveedores(id),
  ADD COLUMN IF NOT EXISTS forma_pago_id INTEGER REFERENCES cat_formas_pago(id),
  ADD COLUMN IF NOT EXISTS ejecutivo_id INTEGER REFERENCES cat_ejecutivos(id),
  ADD COLUMN IF NOT EXISTS periodo VARCHAR(7),           -- '2025-01'
  ADD COLUMN IF NOT EXISTS validacion VARCHAR(20) DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS status_pago VARCHAR(20) DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS folio_factura VARCHAR(50),
  ADD COLUMN IF NOT EXISTS documento_url TEXT,           -- URL del PDF comprobante
  ADD COLUMN IF NOT EXISTS importado_de VARCHAR(50);     -- 'excel', 'manual'

-- Índices para nuevos campos
CREATE INDEX IF NOT EXISTS idx_cont_gastos_ext_clave ON cont_gastos_externos(clave_gasto_id);
CREATE INDEX IF NOT EXISTS idx_cont_gastos_ext_proveedor ON cont_gastos_externos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_cont_gastos_ext_forma_pago ON cont_gastos_externos(forma_pago_id);
CREATE INDEX IF NOT EXISTS idx_cont_gastos_ext_ejecutivo ON cont_gastos_externos(ejecutivo_id);
CREATE INDEX IF NOT EXISTS idx_cont_gastos_ext_periodo ON cont_gastos_externos(periodo);
CREATE INDEX IF NOT EXISTS idx_cont_gastos_ext_validacion ON cont_gastos_externos(validacion);
CREATE INDEX IF NOT EXISTS idx_cont_gastos_ext_status ON cont_gastos_externos(status_pago);

-- ─────────────────────────────────────────────────────────────────────────
-- MODIFICAR: core_companies
-- Añadir campos para membrete en reportes PDF
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE core_companies
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS membrete_slogan TEXT,
  ADD COLUMN IF NOT EXISTS membrete_direccion TEXT,
  ADD COLUMN IF NOT EXISTS membrete_telefono VARCHAR(50),
  ADD COLUMN IF NOT EXISTS membrete_email VARCHAR(100),
  ADD COLUMN IF NOT EXISTS membrete_website VARCHAR(100),
  ADD COLUMN IF NOT EXISTS membrete_footer TEXT;

-- ─────────────────────────────────────────────────────────────────────────
-- VISTA: v_gastos_no_impactados
-- Vista consolidada para consultas
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_gastos_no_impactados AS
SELECT
  g.id,
  g.company_id,
  g.periodo,
  g.fecha_gasto,
  -- Proveedor
  p.id AS proveedor_id,
  p.razon_social AS proveedor,
  p.rfc AS rfc_proveedor,
  -- Concepto y clave
  g.concepto,
  c.subcuenta,
  c.cuenta,
  c.clave,
  -- Montos
  g.subtotal,
  g.iva,
  g.total,
  -- Estado
  g.validacion,
  g.status_pago,
  -- Forma de pago
  f.nombre AS forma_pago,
  -- Ejecutivo
  e.nombre AS ejecutivo,
  -- Factura y documento
  g.folio_factura,
  g.documento_url,
  -- Auditoría
  g.created_at,
  g.updated_at
FROM cont_gastos_externos g
LEFT JOIN cat_proveedores p ON g.proveedor_id = p.id
LEFT JOIN cat_claves_gasto c ON g.clave_gasto_id = c.id
LEFT JOIN cat_formas_pago f ON g.forma_pago_id = f.id
LEFT JOIN cat_ejecutivos e ON g.ejecutivo_id = e.id
WHERE g.activo = true;

COMMENT ON VIEW v_gastos_no_impactados IS 'Vista consolidada de gastos no impactados con datos relacionados';

-- ─────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: calcular_totales_periodo
-- Calcula totales por período y cuenta
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calcular_totales_gni_periodo(
  p_company_id UUID,
  p_periodo VARCHAR(7)
)
RETURNS TABLE (
  cuenta VARCHAR(50),
  subcuenta VARCHAR(100),
  clave VARCHAR(20),
  total_subtotal NUMERIC,
  total_iva NUMERIC,
  total NUMERIC,
  cantidad_registros BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.cuenta,
    c.subcuenta,
    c.clave,
    COALESCE(SUM(g.subtotal), 0) AS total_subtotal,
    COALESCE(SUM(g.iva), 0) AS total_iva,
    COALESCE(SUM(g.total), 0) AS total,
    COUNT(g.id) AS cantidad_registros
  FROM cat_claves_gasto c
  LEFT JOIN cont_gastos_externos g ON g.clave_gasto_id = c.id
    AND g.periodo = p_periodo
    AND g.activo = true
  WHERE c.company_id = p_company_id
    AND c.activo = true
  GROUP BY c.cuenta, c.subcuenta, c.clave
  ORDER BY c.cuenta, c.clave;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────
-- TRIGGER: actualizar updated_at en catálogos
-- ─────────────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_cat_claves_gasto_updated
  BEFORE UPDATE ON cat_claves_gasto
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cat_proveedores_updated
  BEFORE UPDATE ON cat_proveedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE cat_claves_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_formas_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_ejecutivos ENABLE ROW LEVEL SECURITY;

-- Políticas para cat_claves_gasto
CREATE POLICY "cat_claves_gasto_select" ON cat_claves_gasto
  FOR SELECT USING (true);
CREATE POLICY "cat_claves_gasto_insert" ON cat_claves_gasto
  FOR INSERT WITH CHECK (true);
CREATE POLICY "cat_claves_gasto_update" ON cat_claves_gasto
  FOR UPDATE USING (true);

-- Políticas para cat_formas_pago
CREATE POLICY "cat_formas_pago_select" ON cat_formas_pago
  FOR SELECT USING (true);
CREATE POLICY "cat_formas_pago_insert" ON cat_formas_pago
  FOR INSERT WITH CHECK (true);
CREATE POLICY "cat_formas_pago_update" ON cat_formas_pago
  FOR UPDATE USING (true);

-- Políticas para cat_proveedores
CREATE POLICY "cat_proveedores_select" ON cat_proveedores
  FOR SELECT USING (true);
CREATE POLICY "cat_proveedores_insert" ON cat_proveedores
  FOR INSERT WITH CHECK (true);
CREATE POLICY "cat_proveedores_update" ON cat_proveedores
  FOR UPDATE USING (true);

-- Políticas para cat_ejecutivos
CREATE POLICY "cat_ejecutivos_select" ON cat_ejecutivos
  FOR SELECT USING (true);
CREATE POLICY "cat_ejecutivos_insert" ON cat_ejecutivos
  FOR INSERT WITH CHECK (true);
CREATE POLICY "cat_ejecutivos_update" ON cat_ejecutivos
  FOR UPDATE USING (true);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (en caso de necesitar revertir)
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP VIEW IF EXISTS v_gastos_no_impactados;
-- DROP FUNCTION IF EXISTS calcular_totales_gni_periodo;
-- DROP TABLE IF EXISTS cat_ejecutivos CASCADE;
-- DROP TABLE IF EXISTS cat_proveedores CASCADE;
-- DROP TABLE IF EXISTS cat_formas_pago CASCADE;
-- DROP TABLE IF EXISTS cat_claves_gasto CASCADE;
-- ALTER TABLE cont_gastos_externos DROP COLUMN IF EXISTS clave_gasto_id;
-- ALTER TABLE cont_gastos_externos DROP COLUMN IF EXISTS proveedor_id;
-- ALTER TABLE cont_gastos_externos DROP COLUMN IF EXISTS forma_pago_id;
-- ALTER TABLE cont_gastos_externos DROP COLUMN IF EXISTS ejecutivo_id;
-- ALTER TABLE cont_gastos_externos DROP COLUMN IF EXISTS periodo;
-- ALTER TABLE cont_gastos_externos DROP COLUMN IF EXISTS validacion;
-- ALTER TABLE cont_gastos_externos DROP COLUMN IF EXISTS status_pago;
-- ALTER TABLE cont_gastos_externos DROP COLUMN IF EXISTS folio_factura;
-- ALTER TABLE cont_gastos_externos DROP COLUMN IF EXISTS documento_url;
-- ALTER TABLE cont_gastos_externos DROP COLUMN IF EXISTS importado_de;
-- COMMIT;
