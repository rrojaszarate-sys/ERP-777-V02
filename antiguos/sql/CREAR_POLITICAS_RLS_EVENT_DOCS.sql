-- =========================================
-- Políticas RLS para bucket event_docs
-- =========================================
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- URL: https://app.supabase.com/project/gomnouwackzvthpwyric/sql/new

-- =========================================
-- 1. Verificar bucket existe
-- =========================================
SELECT * FROM storage.buckets WHERE name = 'event_docs';

-- Si no existe, crearlo:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('event_docs', 'event_docs', false);

-- =========================================
-- 2. POLÍTICA INSERT - Subir archivos
-- =========================================
CREATE POLICY IF NOT EXISTS "Permitir subir archivos de gastos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event_docs' 
  AND (storage.foldername(name))[2] = 'gastos'
);

-- =========================================
-- 3. POLÍTICA SELECT - Leer archivos
-- =========================================
CREATE POLICY IF NOT EXISTS "Permitir leer archivos de gastos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'event_docs' 
  AND (storage.foldername(name))[2] = 'gastos'
);

-- =========================================
-- 4. POLÍTICA UPDATE - Actualizar (versiones)
-- =========================================
CREATE POLICY IF NOT EXISTS "Permitir actualizar archivos de gastos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event_docs' 
  AND (storage.foldername(name))[2] = 'gastos'
);

-- =========================================
-- 5. POLÍTICA DELETE - Eliminar archivos
-- =========================================
CREATE POLICY IF NOT EXISTS "Permitir eliminar archivos de gastos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event_docs' 
  AND (storage.foldername(name))[2] = 'gastos'
);

-- =========================================
-- 6. VERIFICAR políticas creadas
-- =========================================
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%gastos%';

-- =========================================
-- 7. FUNCIÓN de limpieza de archivos temp
-- =========================================
CREATE OR REPLACE FUNCTION cleanup_temp_expense_files()
RETURNS void AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'event_docs'
  AND (storage.foldername(name))[2] = 'gastos'
  AND name LIKE '%_temp_%'
  AND created_at < NOW() - INTERVAL '24 hours';
  
  RAISE NOTICE 'Archivos temporales eliminados';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 8. Probar función de limpieza
-- =========================================
SELECT cleanup_temp_expense_files();

-- =========================================
-- 9. OPCIONAL: Programar limpieza diaria
-- =========================================
-- Requiere extensión pg_cron
-- SELECT cron.schedule(
--   'cleanup-temp-expense-files',
--   '0 2 * * *',  -- Cada día a las 2 AM
--   'SELECT cleanup_temp_expense_files()'
-- );

-- =========================================
-- RESULTADO ESPERADO
-- =========================================
-- Deberías ver 4 políticas creadas:
-- 1. Permitir subir archivos de gastos (INSERT)
-- 2. Permitir leer archivos de gastos (SELECT)
-- 3. Permitir actualizar archivos de gastos (UPDATE)
-- 4. Permitir eliminar archivos de gastos (DELETE)

-- =========================================
-- ESTRUCTURA DE CARPETAS
-- =========================================
-- event_docs/
-- └── {eventId}/
--     └── gastos/
--         ├── {eventId}_temp_{timestamp}_v1_ticket.jpg  (temporal)
--         └── {eventId}_{gastoId}_v1_ticket.jpg         (final)
