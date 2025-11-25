-- Migración: 20251024_ingresos_gastos_improvements.sql
-- Descripción: Mejoras a módulos de Ingresos y Gastos
-- - Estados de ingresos con flujo de trabajo
-- - Cuentas contables para gastos
-- - Campos adicionales para control de pagos y facturación
-- - Vistas para pendientes de facturar, pagar y comprobar

-- =====================================================
-- ESTADOS DE INGRESOS
-- =====================================================
CREATE TABLE IF NOT EXISTS evt_estados_ingreso (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  orden INT NOT NULL,
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO evt_estados_ingreso (nombre, descripcion, orden, color) VALUES
('PLANEADO', 'Ingreso planeado/proyectado', 1, 'blue'),
('ORDEN_COMPRA', 'Orden de compra recibida', 2, 'indigo'),
('FACTURADO', 'Factura emitida al cliente', 3, 'yellow'),
('PAGADO', 'Pago recibido y comprobado', 4, 'green')
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- CAMPOS ADICIONALES EN INGRESOS
-- =====================================================
ALTER TABLE evt_ingresos
ADD COLUMN IF NOT EXISTS cliente_id INT REFERENCES evt_clientes(id),
ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES core_users(id),
ADD COLUMN IF NOT EXISTS estado_id INT REFERENCES evt_estados_ingreso(id) DEFAULT 1,
ADD COLUMN IF NOT EXISTS dias_facturacion INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS fecha_limite_facturacion DATE,
ADD COLUMN IF NOT EXISTS fecha_compromiso_pago DATE,
ADD COLUMN IF NOT EXISTS orden_compra_url TEXT,
ADD COLUMN IF NOT EXISTS orden_compra_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS alertas_enviadas JSONB DEFAULT '[]'::jsonb;

-- Actualizar ingresos existentes
UPDATE evt_ingresos
SET estado_id = CASE
  WHEN cobrado = true THEN 4 -- PAGADO
  WHEN facturado = true THEN 3 -- FACTURADO
  ELSE 1 -- PLANEADO
END
WHERE estado_id IS NULL;

-- Calcular fecha_limite_facturacion para ingresos existentes sin la fecha
UPDATE evt_ingresos
SET fecha_limite_facturacion = fecha_cobro::date + (dias_facturacion || ' days')::interval
WHERE fecha_limite_facturacion IS NULL
  AND fecha_cobro IS NOT NULL
  AND dias_facturacion IS NOT NULL;

-- =====================================================
-- TABLA DE CUENTAS CONTABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS evt_cuentas_contables (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'activo', 'pasivo', 'capital', 'ingreso', 'gasto'
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar cuentas básicas
INSERT INTO evt_cuentas_contables (codigo, nombre, tipo, descripcion) VALUES
('1001', 'Caja', 'activo', 'Efectivo en caja'),
('1002', 'Bancos', 'activo', 'Cuentas bancarias'),
('2001', 'Proveedores', 'pasivo', 'Cuentas por pagar a proveedores'),
('4001', 'Ventas', 'ingreso', 'Ingresos por ventas'),
('5001', 'Compras', 'gasto', 'Compras de mercancía'),
('5002', 'Gastos de Operación', 'gasto', 'Gastos operativos generales'),
('5003', 'Gastos de Administración', 'gasto', 'Gastos administrativos'),
('5004', 'Gastos de Venta', 'gasto', 'Gastos relacionados con ventas')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- CAMPOS ADICIONALES EN GASTOS
-- =====================================================
ALTER TABLE evt_gastos
ADD COLUMN IF NOT EXISTS cuenta_id INT REFERENCES evt_cuentas_contables(id),
ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT,
ADD COLUMN IF NOT EXISTS comprobante_pago_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS fecha_pago DATE,
ADD COLUMN IF NOT EXISTS responsable_pago_id UUID REFERENCES core_users(id),
ADD COLUMN IF NOT EXISTS pagado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS comprobado BOOLEAN DEFAULT false;

-- Marcar gastos con archivo como comprobados
UPDATE evt_gastos
SET comprobado = true
WHERE (archivo_adjunto IS NOT NULL AND archivo_adjunto != '')
  AND comprobado = false;

-- =====================================================
-- VISTAS
-- =====================================================

-- Vista de ingresos pendientes de facturar
CREATE OR REPLACE VIEW vw_ingresos_pendientes_facturar AS
SELECT
  i.*,
  e.nombre_proyecto as evento_nombre,
  e.clave_evento,
  c.nombre_comercial as cliente_nombre,
  u.nombre as responsable_nombre,
  ei.nombre as estado_nombre,
  ei.color as estado_color,
  CASE
    WHEN i.fecha_limite_facturacion < CURRENT_DATE THEN 'vencido'
    WHEN i.fecha_limite_facturacion <= CURRENT_DATE + INTERVAL '2 days' THEN 'proximo'
    ELSE 'normal'
  END as estado_vencimiento
FROM evt_ingresos i
LEFT JOIN evt_eventos e ON i.evento_id = e.id
LEFT JOIN evt_clientes c ON i.cliente_id = c.id
LEFT JOIN core_users u ON i.responsable_id = u.id
LEFT JOIN evt_estados_ingreso ei ON i.estado_id = ei.id
WHERE i.estado_id IN (1, 2) -- PLANEADO u ORDEN_COMPRA
  AND i.activo = true
ORDER BY i.fecha_limite_facturacion ASC NULLS LAST;

-- Vista de gastos pendientes de pago
CREATE OR REPLACE VIEW vw_gastos_pendientes_pago AS
SELECT
  g.*,
  e.nombre_proyecto as evento_nombre,
  e.clave_evento,
  g.proveedor as proveedor_nombre,
  u.nombre as responsable_pago_nombre,
  cc.nombre as cuenta_nombre,
  cc.codigo as cuenta_codigo,
  (CURRENT_DATE - g.created_at::date) as dias_pendiente
FROM evt_gastos g
LEFT JOIN evt_eventos e ON g.evento_id = e.id
LEFT JOIN core_users u ON g.responsable_pago_id = u.id
LEFT JOIN evt_cuentas_contables cc ON g.cuenta_id = cc.id
WHERE g.pagado = false
  AND g.activo = true
ORDER BY g.created_at ASC;

-- Vista de gastos pendientes de comprobar
CREATE OR REPLACE VIEW vw_gastos_pendientes_comprobar AS
SELECT
  g.*,
  e.nombre_proyecto as evento_nombre,
  e.clave_evento,
  g.proveedor as proveedor_nombre,
  cc.nombre as cuenta_nombre,
  cc.codigo as cuenta_codigo,
  (CURRENT_DATE - g.created_at::date) as dias_sin_comprobar
FROM evt_gastos g
LEFT JOIN evt_eventos e ON g.evento_id = e.id
LEFT JOIN evt_cuentas_contables cc ON g.cuenta_id = cc.id
WHERE g.comprobado = false
  AND g.activo = true
ORDER BY g.created_at DESC;

-- =====================================================
-- COMENTARIOS EN TABLAS Y COLUMNAS
-- =====================================================
COMMENT ON TABLE evt_estados_ingreso IS 'Catálogo de estados para el flujo de trabajo de ingresos';
COMMENT ON TABLE evt_cuentas_contables IS 'Catálogo de cuentas contables para clasificación de gastos';

COMMENT ON COLUMN evt_ingresos.estado_id IS 'Estado actual del ingreso en el flujo de trabajo';
COMMENT ON COLUMN evt_ingresos.dias_facturacion IS 'Días permitidos para emitir factura después del evento';
COMMENT ON COLUMN evt_ingresos.fecha_limite_facturacion IS 'Fecha límite para emitir la factura';
COMMENT ON COLUMN evt_ingresos.orden_compra_url IS 'URL del archivo de orden de compra en Supabase Storage';
COMMENT ON COLUMN evt_ingresos.orden_compra_nombre IS 'Nombre original del archivo de orden de compra';
COMMENT ON COLUMN evt_ingresos.alertas_enviadas IS 'Registro de alertas enviadas al responsable';

COMMENT ON COLUMN evt_gastos.cuenta_id IS 'Cuenta contable asociada al gasto';
COMMENT ON COLUMN evt_gastos.comprobante_pago_url IS 'URL del comprobante de pago en Supabase Storage';
COMMENT ON COLUMN evt_gastos.comprobante_pago_nombre IS 'Nombre original del archivo de comprobante de pago';
COMMENT ON COLUMN evt_gastos.fecha_pago IS 'Fecha en que se realizó el pago';
COMMENT ON COLUMN evt_gastos.responsable_pago_id IS 'Usuario responsable de realizar el pago';
COMMENT ON COLUMN evt_gastos.pagado IS 'Indica si el gasto ha sido pagado';
COMMENT ON COLUMN evt_gastos.comprobado IS 'Indica si el gasto tiene archivo adjunto de comprobación';

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_estado_id ON evt_ingresos(estado_id);
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_fecha_limite ON evt_ingresos(fecha_limite_facturacion);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_cuenta_id ON evt_gastos(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_pagado ON evt_gastos(pagado);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_comprobado ON evt_gastos(comprobado);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_responsable_pago ON evt_gastos(responsable_pago_id);

-- =====================================================
-- TRIGGER PARA ACTUALIZAR updated_at EN CUENTAS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_evt_cuentas_contables_updated_at
BEFORE UPDATE ON evt_cuentas_contables
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
