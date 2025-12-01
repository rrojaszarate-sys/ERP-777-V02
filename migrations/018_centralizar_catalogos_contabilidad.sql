-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 018: CENTRALIZAR CATÁLOGOS EN MÓDULO CONTABILIDAD
-- ═══════════════════════════════════════════════════════════════════════════════
-- Todos los catálogos se centralizan en cont_* como fuente única:
--   - cont_cuentas_contables (claves/cuentas)
--   - cont_proveedores (proveedores unificados)
--   - cont_formas_pago (formas de pago)
--   - cont_ejecutivos (responsables)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 1. CUENTAS CONTABLES CENTRALIZADAS                                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP TABLE IF EXISTS cont_cuentas_contables CASCADE;
CREATE TABLE cont_cuentas_contables (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL,

  -- Identificación
  clave VARCHAR(50) NOT NULL,           -- MDE2025-001, ING-001, etc.
  cuenta VARCHAR(100) NOT NULL,         -- GASTOS FIJOS, INGRESOS, etc.
  subcuenta VARCHAR(200),               -- Agua, Luz, Servicios profesionales

  -- Clasificación
  tipo VARCHAR(20) DEFAULT 'gasto' CHECK (tipo IN ('activo', 'pasivo', 'capital', 'ingreso', 'gasto')),

  -- Presupuesto
  presupuesto_anual NUMERIC(15,2) DEFAULT 0,

  -- Control
  orden_display INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT true,
  descripcion TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, clave)
);

CREATE INDEX idx_cont_cuentas_company ON cont_cuentas_contables(company_id);
CREATE INDEX idx_cont_cuentas_tipo ON cont_cuentas_contables(tipo);
CREATE INDEX idx_cont_cuentas_cuenta ON cont_cuentas_contables(cuenta);

-- Migrar datos de cont_claves_gasto
INSERT INTO cont_cuentas_contables (company_id, clave, cuenta, subcuenta, tipo, presupuesto_anual, orden_display, activa, descripcion, created_at, updated_at)
SELECT company_id, clave, cuenta, subcuenta, 'gasto', COALESCE(presupuesto_anual, 0), COALESCE(orden_display, 0), COALESCE(activo, true), descripcion, created_at, updated_at
FROM cont_claves_gasto
ON CONFLICT (company_id, clave) DO NOTHING;

-- Agregar cuenta de INGRESOS
INSERT INTO cont_cuentas_contables (company_id, clave, cuenta, subcuenta, tipo, activa)
SELECT id, 'ING-001', 'INGRESOS', 'Ingresos por servicios', 'ingreso', true
FROM core_companies
ON CONFLICT (company_id, clave) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 2. PROVEEDORES CENTRALIZADOS                                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Crear nueva tabla unificada
DROP TABLE IF EXISTS cont_proveedores_new CASCADE;
CREATE TABLE cont_proveedores_new (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL,

  -- Datos básicos (mínimo requerido)
  nombre VARCHAR(200) NOT NULL,         -- Nombre comercial o como lo conocemos

  -- Datos fiscales (se completan al primer pago)
  rfc VARCHAR(13),
  razon_social VARCHAR(300),
  regimen_fiscal VARCHAR(10),

  -- Contacto
  direccion TEXT,
  telefono VARCHAR(20),
  email VARCHAR(100),
  contacto_nombre VARCHAR(100),

  -- Control de datos fiscales
  datos_fiscales_completos BOOLEAN DEFAULT false,
  fecha_actualizacion_fiscal TIMESTAMPTZ,
  requiere_actualizacion BOOLEAN DEFAULT true,

  -- Clasificación
  tipo VARCHAR(50),                     -- proveedor, acreedor, prestador
  categoria VARCHAR(100),               -- SP, materiales, servicios, etc.

  -- Control
  activo BOOLEAN DEFAULT true,
  notas TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,

  -- Evitar duplicados por RFC
  UNIQUE(company_id, rfc)
);

CREATE INDEX idx_cont_proveedores_company ON cont_proveedores_new(company_id);
CREATE INDEX idx_cont_proveedores_nombre ON cont_proveedores_new(nombre);
CREATE INDEX idx_cont_proveedores_rfc ON cont_proveedores_new(rfc);
CREATE INDEX idx_cont_proveedores_activo ON cont_proveedores_new(activo);

-- Migrar de cont_proveedores existente
INSERT INTO cont_proveedores_new (company_id, nombre, rfc, razon_social, direccion, telefono, email, contacto_nombre, activo, created_at, updated_at)
SELECT company_id, COALESCE(nombre_comercial, razon_social), rfc, razon_social, direccion, telefono, email, contacto_nombre, COALESCE(activo, true), created_at, updated_at
FROM cont_proveedores
ON CONFLICT (company_id, rfc) DO NOTHING;

-- Migrar de cat_proveedores (si tiene datos diferentes)
INSERT INTO cont_proveedores_new (company_id, nombre, rfc, razon_social, datos_fiscales_completos, requiere_actualizacion, activo, created_at, updated_at)
SELECT company_id, COALESCE(nombre_comercial, razon_social), rfc, razon_social,
       COALESCE(datos_fiscales_completos, false),
       COALESCE(requiere_actualizacion, true),
       COALESCE(activo, true), created_at, updated_at
FROM cat_proveedores
WHERE rfc IS NOT NULL
ON CONFLICT (company_id, rfc) DO NOTHING;

-- Migrar proveedores sin RFC (por nombre)
INSERT INTO cont_proveedores_new (company_id, nombre, razon_social, datos_fiscales_completos, requiere_actualizacion, activo, created_at, updated_at)
SELECT company_id, COALESCE(nombre_comercial, razon_social), razon_social, false, true, COALESCE(activo, true), created_at, updated_at
FROM cat_proveedores
WHERE rfc IS NULL AND (nombre_comercial IS NOT NULL OR razon_social IS NOT NULL);

-- Renombrar tablas
ALTER TABLE IF EXISTS cont_proveedores RENAME TO cont_proveedores_old;
ALTER TABLE cont_proveedores_new RENAME TO cont_proveedores;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 3. FORMAS DE PAGO CENTRALIZADAS                                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP TABLE IF EXISTS cont_formas_pago_new CASCADE;
CREATE TABLE cont_formas_pago_new (
  id SERIAL PRIMARY KEY,
  company_id UUID,

  -- Identificación
  nombre VARCHAR(100) NOT NULL,         -- TRANSFERENCIA, EFECTIVO, etc.
  codigo_sat VARCHAR(10),               -- 01, 02, 03, etc.

  -- Clasificación
  tipo VARCHAR(50),                     -- transferencia, efectivo, tarjeta, cheque

  -- Datos bancarios (si aplica)
  banco VARCHAR(100),
  cuenta_bancaria VARCHAR(50),

  -- Control
  activa BOOLEAN DEFAULT true,
  descripcion TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cont_formas_pago_company ON cont_formas_pago_new(company_id);

-- Migrar formas de pago existentes
INSERT INTO cont_formas_pago_new (company_id, nombre, tipo, banco, activa, created_at)
SELECT company_id, nombre, tipo, banco, COALESCE(activo, true), created_at
FROM cont_formas_pago
ON CONFLICT DO NOTHING;

-- Agregar formas de pago SAT estándar si no existen
INSERT INTO cont_formas_pago_new (nombre, codigo_sat, tipo, activa) VALUES
  ('Efectivo', '01', 'efectivo', true),
  ('Cheque nominativo', '02', 'cheque', true),
  ('Transferencia electrónica', '03', 'transferencia', true),
  ('Tarjeta de crédito', '04', 'tarjeta', true),
  ('Monedero electrónico', '05', 'electronico', true),
  ('Tarjeta de débito', '28', 'tarjeta', true),
  ('Por definir', '99', 'otro', true)
ON CONFLICT DO NOTHING;

ALTER TABLE IF EXISTS cont_formas_pago RENAME TO cont_formas_pago_old;
ALTER TABLE cont_formas_pago_new RENAME TO cont_formas_pago;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 4. EJECUTIVOS/RESPONSABLES CENTRALIZADOS                                      ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP TABLE IF EXISTS cont_ejecutivos_new CASCADE;
CREATE TABLE cont_ejecutivos_new (
  id SERIAL PRIMARY KEY,
  company_id UUID,

  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(100),
  telefono VARCHAR(20),

  -- Vinculación a usuario del sistema
  user_id UUID REFERENCES core_users(id),

  -- Clasificación
  departamento VARCHAR(100),
  cargo VARCHAR(100),

  -- Permisos
  puede_aprobar_gastos BOOLEAN DEFAULT false,
  limite_aprobacion NUMERIC(15,2),

  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cont_ejecutivos_company ON cont_ejecutivos_new(company_id);
CREATE INDEX idx_cont_ejecutivos_user ON cont_ejecutivos_new(user_id);

-- Migrar ejecutivos existentes
INSERT INTO cont_ejecutivos_new (company_id, nombre, user_id, departamento, activo, created_at)
SELECT company_id, nombre, user_id, departamento, COALESCE(activo, true), created_at
FROM cont_ejecutivos
ON CONFLICT DO NOTHING;

ALTER TABLE IF EXISTS cont_ejecutivos RENAME TO cont_ejecutivos_old;
ALTER TABLE cont_ejecutivos_new RENAME TO cont_ejecutivos;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 5. CLIENTES CENTRALIZADOS                                                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP TABLE IF EXISTS cont_clientes CASCADE;
CREATE TABLE cont_clientes (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL,

  -- Datos básicos
  nombre VARCHAR(200) NOT NULL,         -- Nombre comercial
  sufijo VARCHAR(10),                   -- DOT, SAM, etc. para generar claves

  -- Datos fiscales
  rfc VARCHAR(13),
  razon_social VARCHAR(300),
  regimen_fiscal VARCHAR(10),
  uso_cfdi VARCHAR(10) DEFAULT 'G03',   -- Gastos en general

  -- Dirección fiscal
  direccion TEXT,
  codigo_postal VARCHAR(10),
  ciudad VARCHAR(100),
  estado VARCHAR(100),

  -- Contacto
  telefono VARCHAR(20),
  email VARCHAR(100),
  contacto_nombre VARCHAR(100),
  contacto_puesto VARCHAR(100),

  -- Comercial
  dias_credito INTEGER DEFAULT 30,
  limite_credito NUMERIC(15,2),
  descuento_default NUMERIC(5,2) DEFAULT 0,

  -- Control
  activo BOOLEAN DEFAULT true,
  notas TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,

  UNIQUE(company_id, rfc)
);

CREATE INDEX idx_cont_clientes_company ON cont_clientes(company_id);
CREATE INDEX idx_cont_clientes_nombre ON cont_clientes(nombre);
CREATE INDEX idx_cont_clientes_rfc ON cont_clientes(rfc);
CREATE INDEX idx_cont_clientes_sufijo ON cont_clientes(sufijo);

-- Migrar clientes de evt_clientes (con RFC y company_id válido)
INSERT INTO cont_clientes (company_id, nombre, sufijo, rfc, razon_social, direccion, telefono, email, contacto_nombre, dias_credito, activo, created_at, updated_at)
SELECT company_id, COALESCE(nombre_comercial, razon_social), sufijo, rfc, razon_social, direccion_fiscal, telefono, email, contacto_principal, COALESCE(dias_credito, 30), COALESCE(activo, true), created_at, updated_at
FROM evt_clientes
WHERE rfc IS NOT NULL AND company_id IS NOT NULL
ON CONFLICT (company_id, rfc) DO NOTHING;

-- Migrar clientes sin RFC pero con company_id
INSERT INTO cont_clientes (company_id, nombre, sufijo, razon_social, direccion, telefono, email, activo, created_at, updated_at)
SELECT company_id, COALESCE(nombre_comercial, razon_social, 'CLIENTE ' || id), sufijo, razon_social, direccion_fiscal, telefono, email, COALESCE(activo, true), created_at, updated_at
FROM evt_clientes
WHERE rfc IS NULL AND company_id IS NOT NULL AND (nombre_comercial IS NOT NULL OR razon_social IS NOT NULL);


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 6. ACTUALIZAR REFERENCIAS EN TABLAS OPERATIVAS                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 5.1 cont_gastos_externos (GNI) - Agregar cuenta_contable_id
ALTER TABLE cont_gastos_externos
  ADD COLUMN IF NOT EXISTS cuenta_contable_id INTEGER REFERENCES cont_cuentas_contables(id);

-- Migrar referencias de clave_gasto_id a cuenta_contable_id
UPDATE cont_gastos_externos g
SET cuenta_contable_id = cc.id
FROM cont_claves_gasto cg
JOIN cont_cuentas_contables cc ON cc.clave = cg.clave AND cc.company_id = cg.company_id
WHERE g.clave_gasto_id = cg.id AND g.cuenta_contable_id IS NULL;

-- 5.2 evt_provisiones - Agregar cuenta_contable_id
ALTER TABLE evt_provisiones
  ADD COLUMN IF NOT EXISTS cuenta_contable_id INTEGER REFERENCES cont_cuentas_contables(id);

-- 5.3 evt_gastos - Agregar cuenta_contable_id
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS cuenta_contable_id INTEGER REFERENCES cont_cuentas_contables(id);

-- 6.4 Agregar cliente_contable_id en evt_eventos para usar cont_clientes
ALTER TABLE evt_eventos
  ADD COLUMN IF NOT EXISTS cliente_contable_id INTEGER REFERENCES cont_clientes(id);

-- Mapear clientes existentes
UPDATE evt_eventos e
SET cliente_contable_id = cc.id
FROM evt_clientes ec
JOIN cont_clientes cc ON cc.rfc = ec.rfc AND cc.company_id = ec.company_id
WHERE e.cliente_id = ec.id AND e.cliente_contable_id IS NULL;

-- 6.5 Agregar cliente_contable_id en evt_ingresos
ALTER TABLE evt_ingresos
  ADD COLUMN IF NOT EXISTS cliente_contable_id INTEGER REFERENCES cont_clientes(id);


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 7. VISTAS ÚTILES                                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Vista de proveedores activos
DROP VIEW IF EXISTS v_proveedores_activos;
CREATE VIEW v_proveedores_activos AS
SELECT id, company_id, nombre, rfc, razon_social, datos_fiscales_completos, requiere_actualizacion
FROM cont_proveedores
WHERE activo = true;

-- Vista de clientes activos
DROP VIEW IF EXISTS v_clientes_activos;
CREATE VIEW v_clientes_activos AS
SELECT id, company_id, nombre, sufijo, rfc, razon_social, dias_credito, limite_credito
FROM cont_clientes
WHERE activo = true;

-- Vista de cuentas por tipo
DROP VIEW IF EXISTS v_cuentas_por_tipo;
CREATE VIEW v_cuentas_por_tipo AS
SELECT tipo, cuenta, COUNT(*) as cantidad, SUM(presupuesto_anual) as presupuesto_total
FROM cont_cuentas_contables
WHERE activa = true
GROUP BY tipo, cuenta
ORDER BY tipo, cuenta;

-- Vista consolidada de gastos (GNI + Eventos)
DROP VIEW IF EXISTS v_gastos_consolidados;
CREATE VIEW v_gastos_consolidados AS
SELECT
  'GNI' as origen,
  g.id,
  g.company_id,
  g.fecha_gasto,
  g.concepto,
  p.nombre as proveedor,
  p.rfc as rfc_proveedor,
  cc.clave as cuenta_clave,
  cc.cuenta,
  cc.subcuenta,
  g.subtotal,
  g.iva,
  g.total,
  g.status_pago,
  g.pagado,
  NULL::integer as evento_id,
  NULL::varchar as evento_clave
FROM cont_gastos_externos g
LEFT JOIN cont_proveedores p ON p.id = g.proveedor_id
LEFT JOIN cont_cuentas_contables cc ON cc.id = g.cuenta_contable_id
WHERE g.activo = true

UNION ALL

SELECT
  'EVENTO' as origen,
  eg.id,
  e.company_id,
  eg.fecha_gasto,
  eg.concepto,
  eg.proveedor,
  eg.rfc_proveedor,
  cc.clave as cuenta_clave,
  cc.cuenta,
  cc.subcuenta,
  eg.subtotal,
  eg.iva,
  eg.total,
  eg.status_aprobacion as status_pago,
  false as pagado,
  e.id as evento_id,
  e.clave_evento as evento_clave
FROM evt_gastos eg
JOIN evt_eventos e ON e.id = eg.evento_id
LEFT JOIN cont_cuentas_contables cc ON cc.id = eg.cuenta_contable_id
WHERE eg.activo = true;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 7. DOCUMENTACIÓN                                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

COMMENT ON TABLE cont_cuentas_contables IS 'Catálogo centralizado de cuentas contables - fuente única para todo el ERP';
COMMENT ON TABLE cont_proveedores IS 'Catálogo centralizado de proveedores - fuente única para eventos y GNI';
COMMENT ON TABLE cont_clientes IS 'Catálogo centralizado de clientes - fuente única para facturación';
COMMENT ON TABLE cont_formas_pago IS 'Catálogo de formas de pago con códigos SAT';
COMMENT ON TABLE cont_ejecutivos IS 'Catálogo de ejecutivos/responsables autorizados';
COMMENT ON VIEW v_gastos_consolidados IS 'Vista unificada de gastos de GNI y Eventos';
COMMENT ON VIEW v_clientes_activos IS 'Vista de clientes activos para selección';
COMMENT ON VIEW v_proveedores_activos IS 'Vista de proveedores activos para selección';
