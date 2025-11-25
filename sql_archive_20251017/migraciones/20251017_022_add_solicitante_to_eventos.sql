-- Agregar campo solicitante_id a la tabla evt_eventos
-- Ejecutar en el SQL Editor de Supabase Dashboard

-- Agregar columna solicitante_id si no existe
ALTER TABLE evt_eventos
ADD COLUMN IF NOT EXISTS solicitante_id uuid REFERENCES core_users(id);

-- Agregar comentario a la columna
COMMENT ON COLUMN evt_eventos.solicitante_id IS 'Usuario que solicita el evento';

-- Crear índice para mejorar consultas por solicitante
CREATE INDEX IF NOT EXISTS idx_evt_eventos_solicitante_id
ON evt_eventos(solicitante_id)
WHERE solicitante_id IS NOT NULL;

-- Verificar que la columna fue agregada correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'evt_eventos' AND column_name = 'solicitante_id';
