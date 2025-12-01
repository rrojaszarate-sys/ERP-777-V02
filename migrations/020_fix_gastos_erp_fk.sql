-- Migración 020: Corregir FK de gastos_erp para referenciar evt_eventos
-- El constraint actual referencia una tabla 'eventos' que no existe
-- Debe referenciar 'evt_eventos' con id INTEGER

-- Paso 1: Eliminar el constraint existente (si existe)
ALTER TABLE gastos_erp
DROP CONSTRAINT IF EXISTS gastos_erp_evento_id_fkey;

-- Paso 2: Verificar que el tipo de columna sea compatible
-- evt_eventos.id es SERIAL (integer), gastos_erp.evento_id podría ser UUID o TEXT
-- Si es necesario, cambiar el tipo de columna

-- Verificar tipo actual y cambiar si es necesario
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'gastos_erp' AND column_name = 'evento_id';

    IF col_type = 'uuid' OR col_type = 'text' THEN
        -- Necesitamos cambiar a integer
        -- Primero vaciar la columna (los datos actuales no son válidos de todos modos)
        EXECUTE 'ALTER TABLE gastos_erp DROP COLUMN IF EXISTS evento_id';
        EXECUTE 'ALTER TABLE gastos_erp ADD COLUMN evento_id INTEGER';
        RAISE NOTICE 'Columna evento_id recreada como INTEGER';
    ELSIF col_type = 'integer' OR col_type = 'bigint' THEN
        RAISE NOTICE 'Columna evento_id ya es de tipo numérico: %', col_type;
    ELSE
        RAISE NOTICE 'Tipo de columna actual: %', col_type;
    END IF;
END $$;

-- Paso 3: Crear el nuevo constraint apuntando a evt_eventos
ALTER TABLE gastos_erp
ADD CONSTRAINT gastos_erp_evento_id_fkey
FOREIGN KEY (evento_id)
REFERENCES evt_eventos(id)
ON DELETE CASCADE;

-- Paso 4: Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_gastos_erp_evento_id ON gastos_erp(evento_id);

-- Comentario de la migración
COMMENT ON CONSTRAINT gastos_erp_evento_id_fkey ON gastos_erp IS
'FK corregido en migración 020: gastos_erp.evento_id -> evt_eventos.id';
