-- =====================================================
-- EJECUTAR EN SUPABASE DASHBOARD - SQL EDITOR
-- =====================================================
-- URL: https://gomnouwackzvthpwyric.supabase.co/project/default/sql
--
-- INSTRUCCIONES:
-- 1. Ve al Dashboard de Supabase
-- 2. Entra en "SQL Editor" 
-- 3. Copia y pega este código completo
-- 4. Haz click en "Run" para ejecutar
-- =====================================================

-- Eliminar tabla si existe (con CASCADE para manejar dependencias)
DROP TABLE IF EXISTS evt_documentos_ocr CASCADE;

-- Tabla principal de documentos OCR
CREATE TABLE evt_documentos_ocr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencia al evento (sin foreign key por ahora)
  evento_id UUID NOT NULL,

  -- Información del archivo
  nombre_archivo TEXT NOT NULL,
  archivo_path TEXT NOT NULL, -- Path en bucket: {eventoId}/gastos/{timestamp}-v{version}-{filename}
  archivo_url TEXT, -- URL pública del archivo
  version INTEGER DEFAULT 1, -- Número de versión

  -- Estado del procesamiento
  estado_procesamiento TEXT NOT NULL DEFAULT 'pending'
    CHECK (estado_procesamiento IN ('pending', 'processing', 'completed', 'failed')),

  -- Procesador usado
  procesador TEXT NOT NULL DEFAULT 'google_vision'
    CHECK (procesador IN ('google_vision', 'tesseract', 'manual')),

  -- Resultados del OCR
  texto_completo TEXT,
  confianza_general INTEGER CHECK (confianza_general >= 0 AND confianza_general <= 100),

  -- Datos extraídos (JSON)
  datos_extraidos JSONB,

  -- Datos estructurados específicos (para búsquedas rápidas)
  establecimiento TEXT,
  rfc TEXT,
  total DECIMAL(10,2),
  fecha_documento DATE,

  -- Relación con gasto (sin foreign key por ahora)
  gasto_id UUID,

  -- Metadata
  error_mensaje TEXT, -- Si falló, descripción del error
  tiempo_procesamiento_ms INTEGER, -- Tiempo que tardó el OCR

  -- Auditoría (sin foreign keys por ahora)
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_evt_documentos_ocr_evento_id
  ON evt_documentos_ocr(evento_id);

CREATE INDEX idx_evt_documentos_ocr_estado
  ON evt_documentos_ocr(estado_procesamiento)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_evt_documentos_ocr_fecha_documento
  ON evt_documentos_ocr(fecha_documento)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_evt_documentos_ocr_establecimiento
  ON evt_documentos_ocr(establecimiento)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_evt_documentos_ocr_version
  ON evt_documentos_ocr(evento_id, nombre_archivo, version);

-- Índice para búsqueda en JSON
CREATE INDEX idx_evt_documentos_ocr_datos_extraidos
  ON evt_documentos_ocr USING gin(datos_extraidos);

-- Trigger para actualizar updated_at
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

-- Función para obtener próxima versión
CREATE OR REPLACE FUNCTION get_next_ocr_document_version(
  p_evento_id UUID,
  p_nombre_archivo TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_max_version
  FROM evt_documentos_ocr
  WHERE evento_id = p_evento_id
    AND nombre_archivo = p_nombre_archivo
    AND deleted_at IS NULL;

  RETURN v_max_version;
END;
$$ LANGUAGE plpgsql;

-- Vista para documentos OCR activos (sin JOINs por ahora)
CREATE OR REPLACE VIEW evt_documentos_ocr_activos AS
SELECT
  d.*
FROM evt_documentos_ocr d
WHERE d.deleted_at IS NULL;

-- RLS (Row Level Security)
ALTER TABLE evt_documentos_ocr ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios autenticados pueden ver documentos de sus eventos
CREATE POLICY "Users can view OCR documents of their events" ON evt_documentos_ocr
  FOR SELECT
  TO authenticated
  USING (
    -- Por ahora permitir todo mientras no existe la tabla eventos
    true
  );

-- Política: Los usuarios autenticados pueden insertar documentos
CREATE POLICY "Users can insert OCR documents" ON evt_documentos_ocr
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Los usuarios pueden actualizar sus propios documentos
CREATE POLICY "Users can update their OCR documents" ON evt_documentos_ocr
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Política: Los usuarios pueden soft-delete sus documentos
CREATE POLICY "Users can soft-delete their OCR documents" ON evt_documentos_ocr
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (deleted_at IS NOT NULL);

-- Comentarios para documentación
COMMENT ON TABLE evt_documentos_ocr IS
  'Almacena documentos procesados con OCR con sistema de versionado automático';

COMMENT ON COLUMN evt_documentos_ocr.archivo_path IS
  'Path en bucket con formato: {eventoId}/gastos/{timestamp}-v{version}-{filename}';

COMMENT ON COLUMN evt_documentos_ocr.version IS
  'Número de versión del documento (incremental por nombre de archivo)';

COMMENT ON COLUMN evt_documentos_ocr.datos_extraidos IS
  'JSON con todos los datos extraídos: establecimiento, productos, totales, etc.';

-- =====================================================
-- VERIFICACIÓN - Ejecutar después del CREATE
-- =====================================================

-- Verificar que la tabla se creó correctamente
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'evt_documentos_ocr' 
ORDER BY ordinal_position;

-- Verificar índices
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'evt_documentos_ocr';

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'evt_documentos_ocr';

-- Mensaje de éxito
SELECT 'MIGRACIÓN COMPLETADA EXITOSAMENTE ✅' as status,
       'Tabla evt_documentos_ocr creada con todos sus índices, triggers y políticas RLS' as mensaje;