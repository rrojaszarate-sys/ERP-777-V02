-- ============================================================================
-- CREAR TABLA evt_documentos_ocr PARA SERVICIO OCR
-- Fecha: 2025-12-03
-- ============================================================================

-- Tabla principal para documentos OCR
CREATE TABLE IF NOT EXISTS evt_documentos_ocr (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    evento_id integer REFERENCES evt_eventos_erp(id) ON DELETE CASCADE,
    nombre_archivo varchar(255) NOT NULL,
    ruta_storage varchar(500),
    tipo_documento varchar(50) DEFAULT 'ticket' CHECK (tipo_documento IN ('ticket', 'factura', 'auto')),
    estado_procesamiento varchar(50) DEFAULT 'pending' CHECK (estado_procesamiento IN ('pending', 'processing', 'completed', 'error')),
    confianza_general numeric(5,2),
    tiempo_procesamiento_ms integer,
    error_mensaje text,
    texto_completo text,
    datos_ticket jsonb,
    datos_factura jsonb,
    validado boolean DEFAULT false,
    validado_por uuid,
    validado_fecha timestamptz,
    notas_validacion text,
    company_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_ocr_evento ON evt_documentos_ocr(evento_id);
CREATE INDEX IF NOT EXISTS idx_documentos_ocr_estado ON evt_documentos_ocr(estado_procesamiento);
CREATE INDEX IF NOT EXISTS idx_documentos_ocr_company ON evt_documentos_ocr(company_id);

-- Habilitar RLS
ALTER TABLE evt_documentos_ocr ENABLE ROW LEVEL SECURITY;

-- Política de acceso
DROP POLICY IF EXISTS "Acceso documentos OCR por company" ON evt_documentos_ocr;
CREATE POLICY "Acceso documentos OCR por company" ON evt_documentos_ocr
    FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_documentos_ocr_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documentos_ocr_updated ON evt_documentos_ocr;
CREATE TRIGGER trigger_documentos_ocr_updated
    BEFORE UPDATE ON evt_documentos_ocr
    FOR EACH ROW EXECUTE FUNCTION update_documentos_ocr_timestamp();

-- Verificar
SELECT 'evt_documentos_ocr creada correctamente' as resultado;
