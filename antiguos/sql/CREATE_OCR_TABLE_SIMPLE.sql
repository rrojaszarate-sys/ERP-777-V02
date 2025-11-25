-- EJECUTAR EN SUPABASE DASHBOARD - SQL EDITOR
-- Crear tabla evt_documentos_ocr

DROP TABLE IF EXISTS evt_documentos_ocr CASCADE;

CREATE TABLE evt_documentos_ocr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL,
  nombre_archivo TEXT NOT NULL,
  archivo_path TEXT NOT NULL,
  archivo_url TEXT,
  version INTEGER DEFAULT 1,
  estado_procesamiento TEXT NOT NULL DEFAULT 'pending'
    CHECK (estado_procesamiento IN ('pending', 'processing', 'completed', 'failed')),
  procesador TEXT NOT NULL DEFAULT 'google_vision'
    CHECK (procesador IN ('google_vision', 'tesseract', 'manual')),
  texto_completo TEXT,
  confianza_general INTEGER CHECK (confianza_general >= 0 AND confianza_general <= 100),
  datos_extraidos JSONB,
  establecimiento TEXT,
  rfc TEXT,
  total DECIMAL(10,2),
  fecha_documento DATE,
  gasto_id UUID,
  error_mensaje TEXT,
  tiempo_procesamiento_ms INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Crear índices
CREATE INDEX idx_evt_documentos_ocr_evento_id ON evt_documentos_ocr(evento_id);
CREATE INDEX idx_evt_documentos_ocr_estado ON evt_documentos_ocr(estado_procesamiento) WHERE deleted_at IS NULL;
CREATE INDEX idx_evt_documentos_ocr_datos_extraidos ON evt_documentos_ocr USING gin(datos_extraidos);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_evt_documentos_ocr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_evt_documentos_ocr_updated_at
  BEFORE UPDATE ON evt_documentos_ocr
  FOR EACH ROW
  EXECUTE FUNCTION update_evt_documentos_ocr_updated_at();

-- RLS
ALTER TABLE evt_documentos_ocr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view OCR documents" ON evt_documentos_ocr
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert OCR documents" ON evt_documentos_ocr
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update OCR documents" ON evt_documentos_ocr
  FOR UPDATE TO authenticated USING (true);

-- Verificar que se creó
SELECT 'Tabla evt_documentos_ocr creada exitosamente' as status;