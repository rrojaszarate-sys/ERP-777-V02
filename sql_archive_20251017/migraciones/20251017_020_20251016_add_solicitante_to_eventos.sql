-- Agregar campo solicitante_id a la tabla evt_eventos
-- Fecha: 2025-10-16
-- Descripción: Agrega el campo solicitante_id para identificar al usuario que solicita el evento

-- Agregar columna solicitante_id si no existe
ALTER TABLE evt_eventos
ADD COLUMN IF NOT EXISTS solicitante_id uuid REFERENCES core_users(id);

-- Agregar comentario a la columna
COMMENT ON COLUMN evt_eventos.solicitante_id IS 'Usuario que solicita el evento';

-- Crear índice para mejorar consultas por solicitante
CREATE INDEX IF NOT EXISTS idx_evt_eventos_solicitante_id
ON evt_eventos(solicitante_id)
WHERE solicitante_id IS NOT NULL;

-- Actualizar la vista vw_eventos_completos si existe
-- Nota: Deberás actualizar manualmente la vista si es necesario agregar el nombre del solicitante
