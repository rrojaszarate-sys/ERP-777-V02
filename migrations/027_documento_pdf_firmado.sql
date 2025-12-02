-- ============================================================================
-- MIGRACIÓN 027: Campo para PDF Firmado en Documentos de Inventario
-- ============================================================================
-- Agrega campo para almacenar la URL del documento PDF firmado como evidencia
-- ============================================================================

-- 1. AGREGAR CAMPO PARA URL DEL PDF FIRMADO
ALTER TABLE documentos_inventario_erp 
ADD COLUMN IF NOT EXISTS archivo_pdf_firmado TEXT;

-- 2. AGREGAR CAMPO PARA NOMBRE ORIGINAL DEL ARCHIVO
ALTER TABLE documentos_inventario_erp 
ADD COLUMN IF NOT EXISTS archivo_pdf_nombre VARCHAR(255);

-- 3. AGREGAR CAMPO PARA FECHA DE SUBIDA
ALTER TABLE documentos_inventario_erp 
ADD COLUMN IF NOT EXISTS archivo_pdf_fecha TIMESTAMPTZ;

-- 4. AGREGAR COMENTARIOS
COMMENT ON COLUMN documentos_inventario_erp.archivo_pdf_firmado IS 'URL del archivo PDF firmado subido como evidencia';
COMMENT ON COLUMN documentos_inventario_erp.archivo_pdf_nombre IS 'Nombre original del archivo PDF subido';
COMMENT ON COLUMN documentos_inventario_erp.archivo_pdf_fecha IS 'Fecha y hora de subida del PDF';

-- 5. CREAR BUCKET DE STORAGE PARA DOCUMENTOS (si no existe)
-- Nota: Esto se debe ejecutar desde el dashboard de Supabase o vía API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('documentos-inventario', 'documentos-inventario', false)
-- ON CONFLICT (id) DO NOTHING;

-- 6. ÍNDICE PARA BUSCAR DOCUMENTOS CON PDF
CREATE INDEX IF NOT EXISTS idx_documentos_inventario_pdf 
ON documentos_inventario_erp(archivo_pdf_firmado) 
WHERE archivo_pdf_firmado IS NOT NULL;

-- ============================================================================
-- FIN DE MIGRACIÓN 027
-- ============================================================================
