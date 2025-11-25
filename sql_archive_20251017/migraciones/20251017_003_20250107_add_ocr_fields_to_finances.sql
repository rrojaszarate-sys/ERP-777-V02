-- Add OCR-related fields to evt_ingresos table
ALTER TABLE evt_ingresos ADD COLUMN IF NOT EXISTS documento_ocr_id UUID REFERENCES evt_documentos_ocr(id) ON DELETE SET NULL;
ALTER TABLE evt_ingresos ADD COLUMN IF NOT EXISTS ocr_confianza INTEGER;
ALTER TABLE evt_ingresos ADD COLUMN IF NOT EXISTS ocr_validado BOOLEAN DEFAULT FALSE;
ALTER TABLE evt_ingresos ADD COLUMN IF NOT EXISTS ocr_datos_originales JSONB;

-- Add OCR-related fields to evt_gastos table
ALTER TABLE evt_gastos ADD COLUMN IF NOT EXISTS documento_ocr_id UUID REFERENCES evt_documentos_ocr(id) ON DELETE SET NULL;
ALTER TABLE evt_gastos ADD COLUMN IF NOT EXISTS ocr_confianza INTEGER;
ALTER TABLE evt_gastos ADD COLUMN IF NOT EXISTS ocr_validado BOOLEAN DEFAULT FALSE;
ALTER TABLE evt_gastos ADD COLUMN IF NOT EXISTS ocr_datos_originales JSONB;

-- Create indexes for OCR fields
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_documento_ocr_id ON evt_ingresos(documento_ocr_id);
CREATE INDEX IF NOT EXISTS idx_evt_gastos_documento_ocr_id ON evt_gastos(documento_ocr_id);

-- Add comments
COMMENT ON COLUMN evt_ingresos.documento_ocr_id IS 'Reference to the OCR document that generated this income entry';
COMMENT ON COLUMN evt_ingresos.ocr_confianza IS 'OCR confidence score 0-100 when created from OCR';
COMMENT ON COLUMN evt_ingresos.ocr_validado IS 'Whether the OCR data has been manually validated';
COMMENT ON COLUMN evt_ingresos.ocr_datos_originales IS 'Original OCR extracted data for reference';

COMMENT ON COLUMN evt_gastos.documento_ocr_id IS 'Reference to the OCR document that generated this expense entry';
COMMENT ON COLUMN evt_gastos.ocr_confianza IS 'OCR confidence score 0-100 when created from OCR';
COMMENT ON COLUMN evt_gastos.ocr_validado IS 'Whether the OCR data has been manually validated';
COMMENT ON COLUMN evt_gastos.ocr_datos_originales IS 'Original OCR extracted data for reference';
