-- =====================================================
-- FIX FINAL: Verificar y Corregir Tabla evt_ingresos
-- =====================================================

-- 1. Ver estructura actual de evt_ingresos
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
ORDER BY ordinal_position;

-- 2. Verificar campos problemáticos
SELECT 
  column_name
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
  AND column_name IN (
    'cliente',
    'rfc_cliente', 
    'proveedor',
    'rfc_proveedor',
    'documento_pago_url',
    'documento_pago_nombre',
    'detalle_compra',
    'establecimiento_info',
    'regimen_fiscal_emisor'
  );

-- 3. Agregar campos faltantes de CFDI si no existen
DO $$
BEGIN
  -- Campos SAT/CFDI básicos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'uuid_cfdi') THEN
    ALTER TABLE evt_ingresos ADD COLUMN uuid_cfdi VARCHAR(36);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'folio_fiscal') THEN
    ALTER TABLE evt_ingresos ADD COLUMN folio_fiscal VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'serie') THEN
    ALTER TABLE evt_ingresos ADD COLUMN serie VARCHAR(25);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'folio') THEN
    ALTER TABLE evt_ingresos ADD COLUMN folio VARCHAR(40);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'tipo_comprobante') THEN
    ALTER TABLE evt_ingresos ADD COLUMN tipo_comprobante VARCHAR(1);
  END IF;

  -- Formas y métodos de pago SAT
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'forma_pago_sat') THEN
    ALTER TABLE evt_ingresos ADD COLUMN forma_pago_sat VARCHAR(2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'metodo_pago_sat') THEN
    ALTER TABLE evt_ingresos ADD COLUMN metodo_pago_sat VARCHAR(3);
  END IF;

  -- Moneda y tipo de cambio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'moneda') THEN
    ALTER TABLE evt_ingresos ADD COLUMN moneda VARCHAR(3) DEFAULT 'MXN';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'tipo_cambio') THEN
    ALTER TABLE evt_ingresos ADD COLUMN tipo_cambio NUMERIC(10,6);
  END IF;

  -- Lugar de expedición
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'lugar_expedicion') THEN
    ALTER TABLE evt_ingresos ADD COLUMN lugar_expedicion VARCHAR(5);
  END IF;

  -- Uso CFDI
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'uso_cfdi') THEN
    ALTER TABLE evt_ingresos ADD COLUMN uso_cfdi VARCHAR(3);
  END IF;

  -- Regímenes fiscales
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'regimen_fiscal_receptor') THEN
    ALTER TABLE evt_ingresos ADD COLUMN regimen_fiscal_receptor VARCHAR(3);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'regimen_fiscal_emisor') THEN
    ALTER TABLE evt_ingresos ADD COLUMN regimen_fiscal_emisor VARCHAR(3);
  END IF;

  -- Detalle de compra (JSON)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'detalle_compra') THEN
    ALTER TABLE evt_ingresos ADD COLUMN detalle_compra JSONB;
  END IF;

  -- Proveedor/Emisor (para facturas de ingreso)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'proveedor') THEN
    ALTER TABLE evt_ingresos ADD COLUMN proveedor VARCHAR(300);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'rfc_proveedor') THEN
    ALTER TABLE evt_ingresos ADD COLUMN rfc_proveedor VARCHAR(13);
  END IF;

  -- Cliente/Receptor
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'cliente') THEN
    ALTER TABLE evt_ingresos ADD COLUMN cliente VARCHAR(300);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'rfc_cliente') THEN
    ALTER TABLE evt_ingresos ADD COLUMN rfc_cliente VARCHAR(13);
  END IF;

  -- Documento de pago
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'documento_pago_url') THEN
    ALTER TABLE evt_ingresos ADD COLUMN documento_pago_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'evt_ingresos' AND column_name = 'documento_pago_nombre') THEN
    ALTER TABLE evt_ingresos ADD COLUMN documento_pago_nombre VARCHAR(255);
  END IF;

END $$;

-- 4. Verificar que se agregaron correctamente
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
  AND column_name IN (
    'uuid_cfdi', 'folio_fiscal', 'serie', 'folio',
    'tipo_comprobante', 'forma_pago_sat', 'metodo_pago_sat',
    'moneda', 'tipo_cambio', 'lugar_expedicion', 'uso_cfdi',
    'regimen_fiscal_receptor', 'regimen_fiscal_emisor',
    'detalle_compra', 'proveedor', 'rfc_proveedor',
    'cliente', 'rfc_cliente', 'documento_pago_url', 'documento_pago_nombre'
  )
ORDER BY column_name;

-- 5. Comentarios en columnas
COMMENT ON COLUMN evt_ingresos.uuid_cfdi IS 'UUID del comprobante fiscal CFDI';
COMMENT ON COLUMN evt_ingresos.folio_fiscal IS 'Folio fiscal del CFDI';
COMMENT ON COLUMN evt_ingresos.serie IS 'Serie del comprobante';
COMMENT ON COLUMN evt_ingresos.folio IS 'Folio del comprobante';
COMMENT ON COLUMN evt_ingresos.tipo_comprobante IS 'Tipo de comprobante SAT (I=Ingreso, E=Egreso, etc)';
COMMENT ON COLUMN evt_ingresos.forma_pago_sat IS 'Forma de pago SAT (01, 02, 03, etc)';
COMMENT ON COLUMN evt_ingresos.metodo_pago_sat IS 'Método de pago SAT (PUE, PPD)';
COMMENT ON COLUMN evt_ingresos.detalle_compra IS 'Conceptos/productos del CFDI en formato JSON';
COMMENT ON COLUMN evt_ingresos.proveedor IS 'Nombre del emisor (proveedor)';
COMMENT ON COLUMN evt_ingresos.rfc_proveedor IS 'RFC del emisor';
COMMENT ON COLUMN evt_ingresos.cliente IS 'Nombre del receptor (cliente)';
COMMENT ON COLUMN evt_ingresos.rfc_cliente IS 'RFC del receptor';

SELECT '✅ MIGRACIÓN COMPLETADA - evt_ingresos actualizado' AS resultado;
