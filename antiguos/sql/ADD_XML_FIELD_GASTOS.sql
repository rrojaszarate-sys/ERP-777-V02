-- =====================================================
-- MIGRACIÓN: AGREGAR CAMPO PARA XML EN GASTOS
-- =====================================================
-- Propósito: Almacenar la URL del archivo XML CFDI
--            separado del archivo adjunto (PDF/imagen)
-- Fecha: 2025-01-XX
-- =====================================================

-- 1. Agregar columna para URL del archivo XML
ALTER TABLE evt_gastos 
ADD COLUMN IF NOT EXISTS xml_file_url VARCHAR(500);

-- 2. Agregar índice para búsqueda rápida de gastos con XML
CREATE INDEX IF NOT EXISTS idx_evt_gastos_xml_file_url 
ON evt_gastos(xml_file_url) 
WHERE xml_file_url IS NOT NULL;

-- 3. Agregar comentario descriptivo
COMMENT ON COLUMN evt_gastos.xml_file_url IS 
'URL del archivo XML CFDI almacenado en Supabase Storage (event_docs/gastos). Separado de archivo_adjunto que contiene PDF/imagen visual.';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Verifica que la columna se haya creado correctamente
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'evt_gastos' 
  AND column_name = 'xml_file_url';

-- =====================================================
-- CONSULTA DE PRUEBA
-- =====================================================
-- Ver gastos con XML vs sin XML
SELECT 
  COUNT(*) FILTER (WHERE xml_file_url IS NOT NULL) as gastos_con_xml,
  COUNT(*) FILTER (WHERE xml_file_url IS NULL) as gastos_sin_xml,
  COUNT(*) FILTER (WHERE archivo_adjunto IS NOT NULL) as gastos_con_pdf,
  COUNT(*) FILTER (WHERE archivo_adjunto IS NOT NULL AND xml_file_url IS NOT NULL) as gastos_con_ambos
FROM evt_gastos
WHERE activo = true;
