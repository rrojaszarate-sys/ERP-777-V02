-- ============================================================================
-- MIGRACIÓN: Agregar columnas para unificar formularios de gastos
-- Fecha: 2025-12-05
-- ============================================================================

-- 1. AGREGAR CAMPOS DE DOCUMENTOS A evt_gastos_erp
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS factura_pdf_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS factura_xml_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS ticket_url TEXT;

-- 2. AGREGAR CAMPO RESPONSABLE
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES users(id);

-- 3. AGREGAR CAMPO ESTADO (para flujo provisión → gasto)
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente';

-- Comentarios para cada campo
COMMENT ON COLUMN evt_gastos_erp.comprobante_pago_url IS 'URL del comprobante de pago (PDF/imagen)';
COMMENT ON COLUMN evt_gastos_erp.factura_pdf_url IS 'URL del PDF de la factura';
COMMENT ON COLUMN evt_gastos_erp.factura_xml_url IS 'URL del XML CFDI';
COMMENT ON COLUMN evt_gastos_erp.ticket_url IS 'URL de imagen de ticket';
COMMENT ON COLUMN evt_gastos_erp.responsable_id IS 'Usuario responsable del gasto';
COMMENT ON COLUMN evt_gastos_erp.estado IS 'Estado: provision, pendiente, pagado';

-- 4. AGREGAR LOS MISMOS CAMPOS A cont_gastos_externos (Gastos No Impactados)
ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT;
ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS factura_pdf_url TEXT;
ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS factura_xml_url TEXT;
ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS ticket_url TEXT;
ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES users(id);
ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente';

-- Verificar que las columnas se agregaron
SELECT 
  'evt_gastos_erp' as tabla,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'evt_gastos_erp' 
  AND column_name IN ('comprobante_pago_url', 'factura_pdf_url', 'factura_xml_url', 'ticket_url', 'responsable_id', 'estado')
UNION ALL
SELECT 
  'cont_gastos_externos' as tabla,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'cont_gastos_externos' 
  AND column_name IN ('comprobante_pago_url', 'factura_pdf_url', 'factura_xml_url', 'ticket_url', 'responsable_id', 'estado')
ORDER BY tabla, column_name;
