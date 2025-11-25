-- Eliminar todos los eventos existentes y datos relacionados en cascada
-- ADVERTENCIA: Esta operación es irreversible

-- Deshabilitar temporalmente los triggers para evitar conflictos
SET session_replication_role = replica;

-- Eliminar documentos de eventos
DELETE FROM evt_documentos WHERE evento_id IN (SELECT id FROM evt_eventos);

-- Eliminar gastos de eventos
DELETE FROM evt_gastos WHERE evento_id IN (SELECT id FROM evt_eventos);

-- Eliminar ingresos de eventos
DELETE FROM evt_ingresos WHERE evento_id IN (SELECT id FROM evt_eventos);

-- Eliminar todos los eventos
DELETE FROM evt_eventos;

-- Reactivar triggers
SET session_replication_role = DEFAULT;

-- Reiniciar secuencias si es necesario
ALTER SEQUENCE evt_eventos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_documentos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_gastos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_ingresos_id_seq RESTART WITH 1;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Todos los eventos y datos relacionados han sido eliminados';
    RAISE NOTICE 'Secuencias reiniciadas desde 1';
END $$;
