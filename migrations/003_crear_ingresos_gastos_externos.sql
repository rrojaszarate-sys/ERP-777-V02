-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 003: CREAR TABLAS PARA INGRESOS Y GASTOS EXTERNOS
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-10-27
-- Propósito: Nuevas tablas para gestionar ingresos/gastos fuera del módulo de eventos
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cont_ingresos_externos
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cont_ingresos_externos (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id),
  
  -- Clasificación
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('factura','transferencia','nota_credito','deposito','otro')),
  concepto TEXT NOT NULL,
  descripcion TEXT,
  
  -- Montos
  cantidad NUMERIC DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario NUMERIC DEFAULT 0 CHECK (precio_unitario >= 0),
  subtotal NUMERIC DEFAULT 0 CHECK (subtotal >= 0),
  iva_porcentaje NUMERIC DEFAULT 16 CHECK (iva_porcentaje >= 0 AND iva_porcentaje <= 100),
  iva NUMERIC DEFAULT 0 CHECK (iva >= 0),
  total NUMERIC NOT NULL CHECK (total > 0),
  
  -- Cuentas contables
  cuenta_id INTEGER REFERENCES evt_cuentas(id) NOT NULL,
  cuenta_contable_ingreso_id INTEGER REFERENCES evt_cuentas(id),
  
  -- Información fiscal
  rfc_emisor VARCHAR(13),
  folio_fiscal UUID,
  serie VARCHAR(10),
  folio VARCHAR(10),
  tipo_comprobante VARCHAR(10) DEFAULT 'I' CHECK (tipo_comprobante IN ('I', 'P')),
  
  -- Fechas
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_facturacion DATE,
  fecha_cobro DATE,
  
  -- Estado
  cobrado BOOLEAN DEFAULT true,
  facturado BOOLEAN DEFAULT false,
  
  -- Método
  metodo_cobro VARCHAR(30) CHECK (metodo_cobro IN ('transferencia','efectivo','cheque','tarjeta','deposito','otro')),
  referencia TEXT,
  
  -- Auditoría
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id),
  updated_by UUID REFERENCES core_users(id)
);

-- Índices para cont_ingresos_externos
CREATE INDEX idx_cont_ingresos_externos_cuenta_id ON cont_ingresos_externos(cuenta_id);
CREATE INDEX idx_cont_ingresos_externos_cuenta_contable ON cont_ingresos_externos(cuenta_contable_ingreso_id);
CREATE INDEX idx_cont_ingresos_externos_fecha ON cont_ingresos_externos(fecha_ingreso);
CREATE INDEX idx_cont_ingresos_externos_tipo ON cont_ingresos_externos(tipo);
CREATE INDEX idx_cont_ingresos_externos_cobrado ON cont_ingresos_externos(cobrado);
CREATE INDEX idx_cont_ingresos_externos_company ON cont_ingresos_externos(company_id);
CREATE INDEX idx_cont_ingresos_externos_folio_fiscal ON cont_ingresos_externos(folio_fiscal);

-- Trigger para updated_at
CREATE TRIGGER trg_cont_ingresos_externos_updated_at
  BEFORE UPDATE ON cont_ingresos_externos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cont_gastos_externos
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cont_gastos_externos (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id),
  
  -- Clasificación
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('factura','transferencia','nomina','impuesto','servicio','suministro','renta','otro')),
  categoria VARCHAR(50),
  concepto TEXT NOT NULL,
  descripcion TEXT,
  
  -- Montos
  cantidad NUMERIC DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario NUMERIC DEFAULT 0 CHECK (precio_unitario >= 0),
  subtotal NUMERIC DEFAULT 0 CHECK (subtotal >= 0),
  iva_porcentaje NUMERIC DEFAULT 16 CHECK (iva_porcentaje >= 0 AND iva_porcentaje <= 100),
  iva NUMERIC DEFAULT 0 CHECK (iva >= 0),
  total NUMERIC NOT NULL CHECK (total > 0),
  
  -- Cuentas contables
  cuenta_id INTEGER REFERENCES evt_cuentas(id) NOT NULL,
  cuenta_contable_gasto_id INTEGER REFERENCES evt_cuentas(id),
  
  -- Proveedor
  proveedor TEXT,
  rfc_proveedor VARCHAR(13),
  
  -- Información fiscal
  folio_fiscal UUID,
  serie VARCHAR(10),
  folio VARCHAR(10),
  tipo_comprobante VARCHAR(10) DEFAULT 'E' CHECK (tipo_comprobante IN ('E', 'T', 'N', 'P')),
  
  -- Fechas
  fecha_gasto DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_facturacion DATE,
  fecha_pago DATE,
  
  -- Estado
  pagado BOOLEAN DEFAULT true,
  comprobado BOOLEAN DEFAULT false,
  
  -- Método
  forma_pago VARCHAR(30) CHECK (forma_pago IN ('transferencia','efectivo','cheque','tarjeta','deposito','otro')),
  referencia TEXT,
  
  -- Auditoría
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id),
  updated_by UUID REFERENCES core_users(id)
);

-- Índices para cont_gastos_externos
CREATE INDEX idx_cont_gastos_externos_cuenta_id ON cont_gastos_externos(cuenta_id);
CREATE INDEX idx_cont_gastos_externos_cuenta_contable ON cont_gastos_externos(cuenta_contable_gasto_id);
CREATE INDEX idx_cont_gastos_externos_fecha ON cont_gastos_externos(fecha_gasto);
CREATE INDEX idx_cont_gastos_externos_tipo ON cont_gastos_externos(tipo);
CREATE INDEX idx_cont_gastos_externos_categoria ON cont_gastos_externos(categoria);
CREATE INDEX idx_cont_gastos_externos_pagado ON cont_gastos_externos(pagado);
CREATE INDEX idx_cont_gastos_externos_company ON cont_gastos_externos(company_id);
CREATE INDEX idx_cont_gastos_externos_proveedor ON cont_gastos_externos(rfc_proveedor);
CREATE INDEX idx_cont_gastos_externos_folio_fiscal ON cont_gastos_externos(folio_fiscal);

-- Trigger para updated_at
CREATE TRIGGER trg_cont_gastos_externos_updated_at
  BEFORE UPDATE ON cont_gastos_externos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────
-- COMENTARIOS
-- ─────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE cont_ingresos_externos IS 
  'Ingresos que NO están relacionados con eventos (facturas externas, transferencias, etc)';

COMMENT ON TABLE cont_gastos_externos IS 
  'Gastos que NO están relacionados con eventos (nómina, servicios, impuestos, etc)';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (en caso de necesitar revertir)
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP TABLE IF EXISTS cont_gastos_externos CASCADE;
-- DROP TABLE IF EXISTS cont_ingresos_externos CASCADE;
-- COMMIT;
