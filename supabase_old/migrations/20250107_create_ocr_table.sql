-- Create OCR documents table
-- This table stores processed OCR documents with extracted data

CREATE TABLE IF NOT EXISTS evt_documentos_ocr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  ruta_storage TEXT NOT NULL,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('ticket', 'factura', 'auto')),
  estado_procesamiento TEXT NOT NULL DEFAULT 'pending' CHECK (estado_procesamiento IN ('pending', 'processing', 'completed', 'error')),
  confianza_general INTEGER,
  tiempo_procesamiento_ms INTEGER,
  error_mensaje TEXT,
  
  -- Datos extraídos
  texto_completo TEXT,
  datos_ticket JSONB,
  datos_factura JSONB,
  
  -- Validación
  validado BOOLEAN DEFAULT FALSE,
  validado_por TEXT,
  validado_fecha TIMESTAMPTZ,
  notas_validacion TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_evt_documentos_ocr_evento_id ON evt_documentos_ocr(evento_id);
CREATE INDEX IF NOT EXISTS idx_evt_documentos_ocr_tipo_documento ON evt_documentos_ocr(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_evt_documentos_ocr_estado ON evt_documentos_ocr(estado_procesamiento);
CREATE INDEX IF NOT EXISTS idx_evt_documentos_ocr_validado ON evt_documentos_ocr(validado);
CREATE INDEX IF NOT EXISTS idx_evt_documentos_ocr_created_at ON evt_documentos_ocr(created_at DESC);

-- Enable RLS
ALTER TABLE evt_documentos_ocr ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all documents
CREATE POLICY "Authenticated users can view OCR documents"
  ON evt_documentos_ocr
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to insert documents
CREATE POLICY "Authenticated users can insert OCR documents"
  ON evt_documentos_ocr
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update documents
CREATE POLICY "Authenticated users can update OCR documents"
  ON evt_documentos_ocr
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to delete documents
CREATE POLICY "Authenticated users can delete OCR documents"
  ON evt_documentos_ocr
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_evt_documentos_ocr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_evt_documentos_ocr_updated_at
  BEFORE UPDATE ON evt_documentos_ocr
  FOR EACH ROW
  EXECUTE FUNCTION update_evt_documentos_ocr_updated_at();

-- Add comments for documentation
COMMENT ON TABLE evt_documentos_ocr IS 'Stores OCR processed documents (tickets and invoices) with extracted data';
COMMENT ON COLUMN evt_documentos_ocr.datos_ticket IS 'JSON structure with ticket data (establecimiento, total, productos, etc.)';
COMMENT ON COLUMN evt_documentos_ocr.datos_factura IS 'JSON structure with invoice data (UUID, RFC, totales, etc.)';
COMMENT ON COLUMN evt_documentos_ocr.confianza_general IS 'Overall confidence score 0-100';
