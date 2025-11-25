-- ============================================
-- SCRIPT PARA LIMPIAR TODOS LOS EVENTOS Y DOCUMENTOS
-- ============================================
-- ADVERTENCIA: Esta operación es IRREVERSIBLE
-- Ejecutar este script desde el SQL Editor de Supabase
-- ============================================

-- Paso 1: Eliminar todos los archivos del storage
-- IMPORTANTE: Ejecutar esto primero en el SQL Editor de Supabase
DELETE FROM storage.objects
WHERE bucket_id = 'event-documents';

-- Paso 2: Deshabilitar temporalmente los triggers
SET session_replication_role = replica;

-- Paso 3: Eliminar documentos de eventos
DELETE FROM evt_documentos WHERE evento_id IN (SELECT id FROM evt_eventos);

-- Paso 4: Eliminar gastos de eventos
DELETE FROM evt_gastos WHERE evento_id IN (SELECT id FROM evt_eventos);

-- Paso 5: Eliminar ingresos de eventos
DELETE FROM evt_ingresos WHERE evento_id IN (SELECT id FROM evt_eventos);

-- Paso 6: Eliminar todos los eventos
DELETE FROM evt_eventos;

-- Paso 7: Reactivar triggers
SET session_replication_role = DEFAULT;

-- Paso 8: Reiniciar secuencias
ALTER SEQUENCE evt_eventos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_documentos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_gastos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_ingresos_id_seq RESTART WITH 1;

-- Paso 9: Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✓ Todos los archivos del storage han sido eliminados';
    RAISE NOTICE '✓ Todos los eventos y datos relacionados han sido eliminados';
    RAISE NOTICE '✓ Secuencias reiniciadas desde 1';
    RAISE NOTICE '';
    RAISE NOTICE 'Base de datos limpia y lista para usar';
END $$;
