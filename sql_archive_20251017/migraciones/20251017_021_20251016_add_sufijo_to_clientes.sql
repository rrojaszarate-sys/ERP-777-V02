/*
  # Agregar campo sufijo a evt_clientes

  1. Cambios
    - Agregar columna `sufijo` (varchar(3), nullable) a la tabla `evt_clientes`
    - El sufijo será un campo opcional de máximo 3 caracteres

  2. Seguridad
    - La tabla ya tiene RLS habilitado, no se requieren cambios adicionales
*/

-- Agregar columna sufijo a la tabla evt_clientes
ALTER TABLE evt_clientes
ADD COLUMN IF NOT EXISTS sufijo varchar(3);

-- Agregar comentario a la columna para documentación
COMMENT ON COLUMN evt_clientes.sufijo IS 'Sufijo opcional de 3 caracteres para el cliente';

-- Crear índice para búsquedas por sufijo (opcional, solo si se usa frecuentemente en búsquedas)
-- CREATE INDEX IF NOT EXISTS idx_evt_clientes_sufijo ON evt_clientes(sufijo);
