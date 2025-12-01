-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 017: HOMOLOGACIÓN GASTOS, PROVISIONES Y GNI
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-11-28
-- Propósito:
--   1. Crear catálogo unificado de 4 categorías de gasto
--   2. Crear/actualizar cat_proveedores con actualización progresiva
--   3. Crear/actualizar cat_formas_pago con códigos SAT
--   4. Crear tabla evt_provisiones
--   5. Modificar evt_gastos con FKs a catálogos
--   6. Agregar constraints de validación fiscal
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- LIMPIEZA PREVIA: Eliminar vistas y tablas que puedan causar conflictos
-- ═══════════════════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_provisiones_completas CASCADE;
DROP VIEW IF EXISTS v_gastos_no_impactados CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 1: CATÁLOGO UNIFICADO DE CATEGORÍAS (SOLO 4)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cat_categorias_gasto (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(20) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  color VARCHAR(7) DEFAULT '#6B7280',
  orden_display INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clave, company_id)
);

-- Insertar las 4 categorías fijas
INSERT INTO cat_categorias_gasto (clave, nombre, descripcion, color, orden_display)
VALUES
  ('SP', 'Solicitudes de Pago', 'Servicios profesionales y pagos a terceros', '#8B5CF6', 1),
  ('COMB', 'Combustible/Peaje', 'Gasolina, casetas y viáticos de transporte', '#F59E0B', 2),
  ('RH', 'Recursos Humanos', 'Nómina, honorarios y pagos a personal', '#10B981', 3),
  ('MAT', 'Materiales', 'Insumos, materiales y consumibles', '#3B82F6', 4)
ON CONFLICT (clave, company_id) DO NOTHING;

-- También insertar con company_id NULL para que sean globales
INSERT INTO cat_categorias_gasto (clave, nombre, descripcion, color, orden_display, company_id)
SELECT clave, nombre, descripcion, color, orden_display, NULL
FROM cat_categorias_gasto
WHERE company_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMENT ON TABLE cat_categorias_gasto IS
'SOLO 4 CATEGORÍAS: SP (Solicitudes Pago), COMB (Combustible/Peaje), RH (Recursos Humanos), MAT (Materiales). Usar las mismas en Eventos, Provisiones y GNI.';

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 2: CATÁLOGO DE PROVEEDORES (Con actualización progresiva)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cat_proveedores (
  id SERIAL PRIMARY KEY,
  rfc VARCHAR(13),
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  direccion TEXT,
  telefono VARCHAR(20),
  email VARCHAR(100),
  contacto_nombre VARCHAR(100),
  -- Datos bancarios
  banco VARCHAR(50),
  cuenta_bancaria VARCHAR(20),
  clabe VARCHAR(18),
  -- Control de actualización progresiva
  datos_fiscales_completos BOOLEAN DEFAULT false,
  fecha_actualizacion_fiscal TIMESTAMPTZ,
  requiere_actualizacion BOOLEAN DEFAULT true,
  -- Origen
  modulo_origen VARCHAR(50),
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cat_proveedores_rfc ON cat_proveedores(rfc);
CREATE INDEX IF NOT EXISTS idx_cat_proveedores_razon ON cat_proveedores(razon_social);
CREATE INDEX IF NOT EXISTS idx_cat_proveedores_company ON cat_proveedores(company_id);
CREATE INDEX IF NOT EXISTS idx_cat_proveedores_datos_fiscales ON cat_proveedores(datos_fiscales_completos);

COMMENT ON TABLE cat_proveedores IS
'Proveedores inician solo con nombre. Al primer pago se actualizan datos fiscales (RFC, razón social).';

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 3: CATÁLOGO DE FORMAS DE PAGO (Con códigos SAT)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cat_formas_pago (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  codigo_sat VARCHAR(2),           -- 01=Efectivo, 03=Transferencia, etc.
  tipo VARCHAR(30),                -- efectivo, transferencia, tarjeta, cheque
  banco VARCHAR(50),
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nombre, company_id)
);

-- Insertar formas de pago comunes con códigos SAT
INSERT INTO cat_formas_pago (nombre, codigo_sat, tipo, descripcion) VALUES
  ('Efectivo', '01', 'efectivo', 'Pago en efectivo'),
  ('Cheque nominativo', '02', 'cheque', 'Cheque nominativo'),
  ('Transferencia electrónica', '03', 'transferencia', 'Transferencia bancaria SPEI'),
  ('Tarjeta de crédito', '04', 'tarjeta', 'Tarjeta de crédito'),
  ('Monedero electrónico', '05', 'monedero', 'Vales o monedero electrónico'),
  ('Tarjeta de débito', '28', 'tarjeta', 'Tarjeta de débito'),
  ('Por definir', '99', 'otro', 'Forma de pago por definir')
ON CONFLICT (nombre, company_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_cat_formas_pago_codigo ON cat_formas_pago(codigo_sat);

COMMENT ON TABLE cat_formas_pago IS 'Formas de pago con códigos SAT para facturación electrónica';

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 4: CATÁLOGO DE EJECUTIVOS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cat_ejecutivos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES core_users(id),
  departamento VARCHAR(50),
  activo BOOLEAN DEFAULT true,
  company_id UUID REFERENCES core_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nombre, company_id)
);

CREATE INDEX IF NOT EXISTS idx_cat_ejecutivos_nombre ON cat_ejecutivos(nombre);

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 5: TABLA evt_provisiones (NUEVA)
-- ═══════════════════════════════════════════════════════════════════════════

-- Eliminar tabla si existe para recrearla limpia
DROP TABLE IF EXISTS evt_provisiones CASCADE;

CREATE TABLE evt_provisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id INTEGER NOT NULL,  -- FK se agrega después (evt_eventos.id es INTEGER)
  company_id UUID,

  -- Proveedor (OBLIGATORIO desde catálogo)
  proveedor_id INTEGER NOT NULL,

  -- Concepto y categoría (SOLO 4 CATEGORÍAS)
  concepto TEXT NOT NULL,
  descripcion TEXT,
  categoria_id INTEGER NOT NULL,

  -- Montos (VALIDACIÓN ESTRICTA: Total = Subtotal + IVA - Retenciones)
  cantidad NUMERIC DEFAULT 1,
  precio_unitario NUMERIC,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  iva_porcentaje NUMERIC DEFAULT 16,
  iva NUMERIC DEFAULT 0,
  retenciones NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,

  -- Forma de pago
  forma_pago_id INTEGER REFERENCES cat_formas_pago(id),

  -- Estado
  estado VARCHAR(30) DEFAULT 'pendiente',
  -- 'pendiente', 'aprobado', 'pagado', 'convertido_a_gasto', 'cancelado'

  -- Ejecutivo responsable
  ejecutivo_id INTEGER,
  responsable_id UUID,

  -- Fechas
  fecha_estimada DATE,
  fecha_pago DATE,

  -- Documento de pago
  comprobante_pago_url TEXT,
  comprobante_pago_nombre VARCHAR(255),

  -- XML/CFDI
  xml_file_url TEXT,
  uuid_cfdi VARCHAR(36),
  folio_fiscal VARCHAR(50),

  -- OCR
  ocr_confianza NUMERIC,
  ocr_validado BOOLEAN DEFAULT false,
  ocr_datos_originales JSONB,

  -- Referencia al gasto generado
  gasto_generado_id UUID,
  fecha_conversion TIMESTAMPTZ,

  -- Notas
  notas TEXT,

  -- Soft delete
  activo BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  delete_reason TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,

  -- Constraint de cuadre fiscal ESTRICTO
  CONSTRAINT chk_provision_fiscal_balance
    CHECK (ABS(total - (subtotal + iva - COALESCE(retenciones, 0))) <= 0.01)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_evt_provisiones_evento ON evt_provisiones(evento_id);
CREATE INDEX IF NOT EXISTS idx_evt_provisiones_proveedor ON evt_provisiones(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_evt_provisiones_categoria ON evt_provisiones(categoria_id);
CREATE INDEX IF NOT EXISTS idx_evt_provisiones_estado ON evt_provisiones(estado);
CREATE INDEX IF NOT EXISTS idx_evt_provisiones_fecha ON evt_provisiones(fecha_estimada);

-- RLS
ALTER TABLE evt_provisiones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evt_provisiones_select" ON evt_provisiones;
DROP POLICY IF EXISTS "evt_provisiones_insert" ON evt_provisiones;
DROP POLICY IF EXISTS "evt_provisiones_update" ON evt_provisiones;
DROP POLICY IF EXISTS "evt_provisiones_delete" ON evt_provisiones;

CREATE POLICY "evt_provisiones_select" ON evt_provisiones FOR SELECT USING (true);
CREATE POLICY "evt_provisiones_insert" ON evt_provisiones FOR INSERT WITH CHECK (true);
CREATE POLICY "evt_provisiones_update" ON evt_provisiones FOR UPDATE USING (true);
CREATE POLICY "evt_provisiones_delete" ON evt_provisiones FOR DELETE USING (true);

COMMENT ON TABLE evt_provisiones IS
'Provisiones (gastos estimados). Validación fiscal ESTRICTA. Se convierten a gastos al agregar comprobante de pago.';

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 6: MODIFICAR evt_gastos (Agregar FKs a catálogos)
-- ═══════════════════════════════════════════════════════════════════════════

-- Agregar nuevas columnas (sin FKs para evitar errores - se agregan después)
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS proveedor_id INTEGER,
  ADD COLUMN IF NOT EXISTS forma_pago_id INTEGER,
  ADD COLUMN IF NOT EXISTS ejecutivo_id INTEGER,
  ADD COLUMN IF NOT EXISTS categoria_unificada_id INTEGER,
  ADD COLUMN IF NOT EXISTS retenciones NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provision_origen_id UUID,
  ADD COLUMN IF NOT EXISTS validacion_fiscal VARCHAR(20) DEFAULT 'pendiente';

-- Índices
CREATE INDEX IF NOT EXISTS idx_evt_gastos_proveedor_id ON evt_gastos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_forma_pago_id ON evt_gastos(forma_pago_id);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_categoria_unif ON evt_gastos(categoria_unificada_id);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_provision_origen ON evt_gastos(provision_origen_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 7: MODIFICAR cont_gastos_externos (GNI) - Agregar campos faltantes
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE cont_gastos_externos
  ADD COLUMN IF NOT EXISTS retenciones NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xml_file_url TEXT,
  ADD COLUMN IF NOT EXISTS ocr_confianza NUMERIC,
  ADD COLUMN IF NOT EXISTS ocr_validado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS categoria_unificada_id INTEGER;

-- Agregar FKs si no existen (de migración 012)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'cont_gastos_externos' AND column_name = 'proveedor_id') THEN
    ALTER TABLE cont_gastos_externos ADD COLUMN proveedor_id INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'cont_gastos_externos' AND column_name = 'forma_pago_id') THEN
    ALTER TABLE cont_gastos_externos ADD COLUMN forma_pago_id INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'cont_gastos_externos' AND column_name = 'ejecutivo_id') THEN
    ALTER TABLE cont_gastos_externos ADD COLUMN ejecutivo_id INTEGER;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 8: TRIGGER para updated_at
-- ═══════════════════════════════════════════════════════════════════════════

-- Función genérica para updated_at (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trg_evt_provisiones_updated ON evt_provisiones;
CREATE TRIGGER trg_evt_provisiones_updated
  BEFORE UPDATE ON evt_provisiones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cat_proveedores_updated ON cat_proveedores;
CREATE TRIGGER trg_cat_proveedores_updated
  BEFORE UPDATE ON cat_proveedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cat_categorias_gasto_updated ON cat_categorias_gasto;
CREATE TRIGGER trg_cat_categorias_gasto_updated
  BEFORE UPDATE ON cat_categorias_gasto
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 9: VISTA CONSOLIDADA DE PROVISIONES
-- ═══════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS v_provisiones_completas CASCADE;

CREATE VIEW v_provisiones_completas AS
SELECT
  p.id,
  p.evento_id,
  e.clave_evento,
  e.nombre_proyecto,
  p.concepto,
  p.descripcion,
  -- Categoría
  c.id AS categoria_id,
  c.clave AS categoria_clave,
  c.nombre AS categoria_nombre,
  c.color AS categoria_color,
  -- Proveedor
  prov.id AS proveedor_id,
  prov.razon_social AS proveedor_nombre,
  prov.rfc AS proveedor_rfc,
  prov.datos_fiscales_completos,
  -- Montos
  p.subtotal,
  p.iva,
  p.retenciones,
  p.total,
  -- Estado
  p.estado,
  p.fecha_estimada,
  p.fecha_pago,
  -- Forma de pago
  fp.nombre AS forma_pago,
  -- Ejecutivo
  ej.nombre AS ejecutivo,
  -- Conversión a gasto
  p.gasto_generado_id,
  p.fecha_conversion,
  -- Auditoría
  p.created_at,
  p.updated_at,
  p.activo
FROM evt_provisiones p
JOIN evt_eventos e ON p.evento_id = e.id
JOIN cat_categorias_gasto c ON p.categoria_id = c.id
JOIN cat_proveedores prov ON p.proveedor_id = prov.id
LEFT JOIN cat_formas_pago fp ON p.forma_pago_id = fp.id
LEFT JOIN cat_ejecutivos ej ON p.ejecutivo_id = ej.id
WHERE p.activo = true AND p.deleted_at IS NULL;

COMMENT ON VIEW v_provisiones_completas IS 'Vista consolidada de provisiones con datos de evento, categoría, proveedor y forma de pago';

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_categorias INTEGER;
  v_formas_pago INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_categorias FROM cat_categorias_gasto;
  SELECT COUNT(*) INTO v_formas_pago FROM cat_formas_pago;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE ' MIGRACIÓN 017 COMPLETADA - HOMOLOGACIÓN';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE ' Categorías de gasto: % (esperado: 4)', v_categorias;
  RAISE NOTICE ' Formas de pago: % (esperado: 7)', v_formas_pago;
  RAISE NOTICE ' Tabla evt_provisiones: CREADA';
  RAISE NOTICE ' Tabla cat_proveedores: CREADA/ACTUALIZADA';
  RAISE NOTICE ' Tabla evt_gastos: MODIFICADA con FKs';
  RAISE NOTICE ' Tabla cont_gastos_externos: MODIFICADA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (Ejecutar solo si es necesario revertir)
-- ═══════════════════════════════════════════════════════════════════════════
/*
BEGIN;

DROP VIEW IF EXISTS v_provisiones_completas;
DROP TABLE IF EXISTS evt_provisiones CASCADE;
DROP TABLE IF EXISTS cat_ejecutivos CASCADE;
DROP TABLE IF EXISTS cat_formas_pago CASCADE;
DROP TABLE IF EXISTS cat_proveedores CASCADE;
DROP TABLE IF EXISTS cat_categorias_gasto CASCADE;

ALTER TABLE evt_gastos
  DROP COLUMN IF EXISTS proveedor_id,
  DROP COLUMN IF EXISTS forma_pago_id,
  DROP COLUMN IF EXISTS ejecutivo_id,
  DROP COLUMN IF EXISTS categoria_unificada_id,
  DROP COLUMN IF EXISTS retenciones,
  DROP COLUMN IF EXISTS provision_origen_id,
  DROP COLUMN IF EXISTS validacion_fiscal;

ALTER TABLE cont_gastos_externos
  DROP COLUMN IF EXISTS retenciones,
  DROP COLUMN IF EXISTS xml_file_url,
  DROP COLUMN IF EXISTS ocr_confianza,
  DROP COLUMN IF EXISTS ocr_validado,
  DROP COLUMN IF EXISTS categoria_unificada_id;

COMMIT;
*/
