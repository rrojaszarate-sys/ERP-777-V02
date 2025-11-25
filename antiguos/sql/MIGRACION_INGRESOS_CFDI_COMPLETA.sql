-- ============================================
-- Migración: Actualizar evt_ingresos con campos CFDI
-- Fecha: 2025-10-14
-- Descripción: Agregar todos los campos CFDI a evt_ingresos
--              para que sea compatible con evt_gastos
-- ============================================

-- ==========================================
-- PARTE 1: CAMPOS OBLIGATORIOS CFDI 4.0
-- ==========================================

ALTER TABLE evt_ingresos
  -- UUID y folios
  ADD COLUMN IF NOT EXISTS uuid_cfdi VARCHAR(36),
  ADD COLUMN IF NOT EXISTS folio_fiscal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS serie VARCHAR(25),
  ADD COLUMN IF NOT EXISTS folio VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(1) DEFAULT 'I',
  
  -- Formas y métodos de pago SAT
  ADD COLUMN IF NOT EXISTS forma_pago_sat VARCHAR(2),
  ADD COLUMN IF NOT EXISTS metodo_pago_sat VARCHAR(3) DEFAULT 'PUE',
  
  -- Moneda y tipo de cambio
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS lugar_expedicion VARCHAR(5),
  
  -- Uso CFDI y regímenes fiscales
  ADD COLUMN IF NOT EXISTS uso_cfdi VARCHAR(3),
  ADD COLUMN IF NOT EXISTS regimen_fiscal_receptor VARCHAR(3),
  ADD COLUMN IF NOT EXISTS regimen_fiscal_emisor VARCHAR(3);

-- ==========================================
-- PARTE 2: CLIENTE (RECEPTOR CFDI)
-- ==========================================

-- El cliente es OBLIGATORIO en ingresos (quien paga)
ALTER TABLE evt_ingresos
  ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES evt_clientes(id),
  ADD COLUMN IF NOT EXISTS cliente VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rfc_cliente VARCHAR(13);

-- Hacer cliente obligatorio (después de migrar datos existentes)
-- ALTER TABLE evt_ingresos ALTER COLUMN cliente SET NOT NULL;

-- ==========================================
-- PARTE 3: DETALLE DE COMPRA (JSONB)
-- ==========================================

-- Campo JSON para almacenar productos/conceptos del CFDI
ALTER TABLE evt_ingresos
  ADD COLUMN IF NOT EXISTS detalle_compra JSONB;

COMMENT ON COLUMN evt_ingresos.detalle_compra IS
  'Detalle de productos/servicios del CFDI en formato JSON: {productos: [{clave, cantidad, unidad, descripcion, precio, subtotal, iva}]}';

-- ==========================================
-- PARTE 4: DOCUMENTOS DE PAGO
-- ==========================================

-- URLs de documentos de pago/cobro
ALTER TABLE evt_ingresos
  ADD COLUMN IF NOT EXISTS documento_pago_url TEXT,
  ADD COLUMN IF NOT EXISTS documento_pago_nombre TEXT;

-- ==========================================
-- PARTE 4B: SOFT DELETE Y ACTIVO
-- ==========================================

-- Campos para soft delete (igual que gastos)
ALTER TABLE evt_ingresos
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES core_users(id),
  ADD COLUMN IF NOT EXISTS delete_reason TEXT;

COMMENT ON COLUMN evt_ingresos.activo IS
  'Indica si el registro está activo (no eliminado lógicamente)';

COMMENT ON COLUMN evt_ingresos.deleted_at IS
  'Fecha y hora en que se eliminó el registro (soft delete)';

COMMENT ON COLUMN evt_ingresos.deleted_by IS
  'Usuario que eliminó el registro';

COMMENT ON COLUMN evt_ingresos.delete_reason IS
  'Razón por la cual se eliminó el registro';

-- ==========================================
-- PARTE 5: CONSTRAINTS Y VALIDACIONES
-- ==========================================

-- Validar tipo de comprobante SAT
ALTER TABLE evt_ingresos
  DROP CONSTRAINT IF EXISTS check_tipo_comprobante_ingresos;

ALTER TABLE evt_ingresos
  ADD CONSTRAINT check_tipo_comprobante_ingresos
  CHECK (tipo_comprobante IN ('I', 'E', 'T', 'N', 'P'));

-- Validar forma de pago SAT
ALTER TABLE evt_ingresos
  DROP CONSTRAINT IF EXISTS check_forma_pago_sat_ingresos;

ALTER TABLE evt_ingresos
  ADD CONSTRAINT check_forma_pago_sat_ingresos
  CHECK (
    forma_pago_sat IS NULL OR
    forma_pago_sat IN ('01', '02', '03', '04', '05', '28', '99')
  );

-- Validar método de pago SAT
ALTER TABLE evt_ingresos
  DROP CONSTRAINT IF EXISTS check_metodo_pago_sat_ingresos;

ALTER TABLE evt_ingresos
  ADD CONSTRAINT check_metodo_pago_sat_ingresos
  CHECK (metodo_pago_sat IN ('PUE', 'PPD'));

-- Validar moneda
ALTER TABLE evt_ingresos
  DROP CONSTRAINT IF EXISTS check_moneda_ingresos;

ALTER TABLE evt_ingresos
  ADD CONSTRAINT check_moneda_ingresos
  CHECK (moneda IS NULL OR moneda IN ('MXN', 'USD', 'EUR', 'CAD', 'GBP'));

-- ==========================================
-- PARTE 6: ÍNDICES PARA BÚSQUEDAS
-- ==========================================

-- Índices en campos CFDI
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_uuid_cfdi
  ON evt_ingresos(uuid_cfdi)
  WHERE uuid_cfdi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evt_ingresos_folio_fiscal
  ON evt_ingresos(folio_fiscal)
  WHERE folio_fiscal IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evt_ingresos_serie_folio
  ON evt_ingresos(serie, folio)
  WHERE serie IS NOT NULL AND folio IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cliente_id
  ON evt_ingresos(cliente_id)
  WHERE cliente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evt_ingresos_rfc_cliente
  ON evt_ingresos(rfc_cliente)
  WHERE rfc_cliente IS NOT NULL;

-- Índice GIN para búsquedas en JSON
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_detalle_compra
  ON evt_ingresos USING gin(detalle_compra)
  WHERE detalle_compra IS NOT NULL;

-- ==========================================
-- PARTE 7: COMENTARIOS DESCRIPTIVOS
-- ==========================================

-- Campos CFDI
COMMENT ON COLUMN evt_ingresos.uuid_cfdi IS
  'UUID del comprobante fiscal digital (CFDI 4.0)';

COMMENT ON COLUMN evt_ingresos.folio_fiscal IS
  'Folio fiscal asignado por el SAT al CFDI';

COMMENT ON COLUMN evt_ingresos.serie IS
  'Serie del comprobante';

COMMENT ON COLUMN evt_ingresos.folio IS
  'Folio del comprobante';

COMMENT ON COLUMN evt_ingresos.tipo_comprobante IS
  'Tipo de comprobante SAT: I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago';

COMMENT ON COLUMN evt_ingresos.forma_pago_sat IS
  'Código SAT c_FormaPago: 01=Efectivo, 02=Cheque, 03=Transferencia, 04=Tarjeta crédito, 05=Monedero, 28=Tarjeta débito, 99=Por definir';

COMMENT ON COLUMN evt_ingresos.metodo_pago_sat IS
  'Método de pago SAT: PUE=Pago en una sola exhibición, PPD=Pago en parcialidades o diferido';

COMMENT ON COLUMN evt_ingresos.moneda IS
  'Código de moneda según catálogo c_Moneda del SAT';

COMMENT ON COLUMN evt_ingresos.tipo_cambio IS
  'Tipo de cambio aplicado (solo si moneda != MXN)';

COMMENT ON COLUMN evt_ingresos.lugar_expedicion IS
  'Código postal del lugar de expedición del CFDI';

COMMENT ON COLUMN evt_ingresos.uso_cfdi IS
  'Uso del CFDI según catálogo c_UsoCFDI del SAT';

COMMENT ON COLUMN evt_ingresos.regimen_fiscal_receptor IS
  'Régimen fiscal del receptor según catálogo c_RegimenFiscal';

COMMENT ON COLUMN evt_ingresos.regimen_fiscal_emisor IS
  'Régimen fiscal del emisor según catálogo c_RegimenFiscal';

-- Campos de cliente
COMMENT ON COLUMN evt_ingresos.cliente_id IS
  'Referencia al cliente que genera el ingreso (receptor del CFDI)';

COMMENT ON COLUMN evt_ingresos.cliente IS
  'Nombre o razón social del cliente (receptor)';

COMMENT ON COLUMN evt_ingresos.rfc_cliente IS
  'RFC del cliente (receptor del CFDI)';

-- Campos de documentos
COMMENT ON COLUMN evt_ingresos.documento_pago_url IS
  'URL del comprobante de pago/cobro';

COMMENT ON COLUMN evt_ingresos.documento_pago_nombre IS
  'Nombre del archivo del comprobante de pago';

-- ==========================================
-- PARTE 8: ACTUALIZAR TRIGGER DE CÁLCULOS
-- ==========================================

-- El trigger ya existe, solo verificar que funcione correctamente
-- Si necesita ajustes, se pueden agregar aquí

-- ==========================================
-- PARTE 9: CREAR VISTA UNIFICADA (OPCIONAL)
-- ==========================================

-- Vista que muestra ingresos y gastos en un solo query
CREATE OR REPLACE VIEW vw_movimientos_financieros AS
SELECT 
  'ingreso' AS tipo_movimiento,
  i.id,
  i.evento_id,
  i.concepto,
  i.descripcion,
  i.total,
  i.subtotal,
  i.iva,
  i.iva_porcentaje,
  i.fecha_ingreso AS fecha,
  i.cliente AS contraparte,
  i.rfc_cliente AS rfc_contraparte,
  NULL AS emisor,
  NULL AS rfc_emisor,
  i.uuid_cfdi,
  i.folio_fiscal,
  i.serie,
  i.folio,
  i.forma_pago_sat,
  i.metodo_pago_sat,
  i.moneda,
  i.facturado,
  i.cobrado AS pagado,
  i.created_at,
  i.updated_at
FROM evt_ingresos i
WHERE i.deleted_at IS NULL

UNION ALL

SELECT 
  'gasto' AS tipo_movimiento,
  g.id,
  g.evento_id,
  g.concepto,
  g.descripcion,
  g.total,
  g.subtotal,
  g.iva,
  g.iva_porcentaje,
  g.fecha_gasto AS fecha,
  g.proveedor AS contraparte,
  g.rfc_proveedor AS rfc_contraparte,
  NULL AS emisor,
  NULL AS rfc_emisor,
  g.uuid_cfdi,
  g.folio_fiscal,
  g.serie,
  g.folio_interno AS folio,
  g.forma_pago_sat,
  g.metodo_pago_sat,
  g.moneda,
  true AS facturado,
  true AS pagado,
  g.created_at,
  g.updated_at
FROM evt_gastos g
WHERE g.deleted_at IS NULL;

COMMENT ON VIEW vw_movimientos_financieros IS
  'Vista unificada de ingresos y gastos con campos CFDI compatibles';

-- ==========================================
-- FINALIZACIÓN
-- ==========================================

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '📊 evt_ingresos ahora tiene los mismos campos CFDI que evt_gastos';
  RAISE NOTICE '🔗 Se creó vista vw_movimientos_financieros para consultas unificadas';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '   1. El campo "cliente" es OBLIGATORIO para ingresos';
  RAISE NOTICE '   2. Actualizar código TypeScript para remover filtros innecesarios';
  RAISE NOTICE '   3. Probar formulario de ingresos con XML CFDI';
END $$;
