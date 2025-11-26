-- ============================================================================
-- MIGRACIÓN 014: Campos Bancarios para Proveedores
-- Fecha: 2025-11-26
-- Descripción: Agrega campos de información bancaria a la tabla proveedores_erp
-- ============================================================================

-- Verificar si la tabla existe antes de modificarla
DO $$
BEGIN
    -- Agregar campo banco si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'proveedores_erp' AND column_name = 'banco'
    ) THEN
        ALTER TABLE proveedores_erp ADD COLUMN banco VARCHAR(100);
        COMMENT ON COLUMN proveedores_erp.banco IS 'Nombre del banco del proveedor';
    END IF;

    -- Agregar campo cuenta_bancaria si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'proveedores_erp' AND column_name = 'cuenta_bancaria'
    ) THEN
        ALTER TABLE proveedores_erp ADD COLUMN cuenta_bancaria VARCHAR(50);
        COMMENT ON COLUMN proveedores_erp.cuenta_bancaria IS 'Número de cuenta bancaria';
    END IF;

    -- Agregar campo clabe_interbancaria si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'proveedores_erp' AND column_name = 'clabe_interbancaria'
    ) THEN
        ALTER TABLE proveedores_erp ADD COLUMN clabe_interbancaria VARCHAR(30);
        COMMENT ON COLUMN proveedores_erp.clabe_interbancaria IS 'CLABE interbancaria de 18 dígitos';
    END IF;

    -- Agregar campo codigo_itiana si no existe (referencia al catálogo original)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'proveedores_erp' AND column_name = 'codigo_itiana'
    ) THEN
        ALTER TABLE proveedores_erp ADD COLUMN codigo_itiana VARCHAR(20);
        COMMENT ON COLUMN proveedores_erp.codigo_itiana IS 'Código de referencia del catálogo ITIANA';
    END IF;
END $$;

-- Índice para búsqueda por CLABE (útil para conciliaciones)
CREATE INDEX IF NOT EXISTS idx_proveedores_erp_clabe
ON proveedores_erp(clabe_interbancaria)
WHERE clabe_interbancaria IS NOT NULL;

-- Índice para búsqueda por código ITIANA
CREATE INDEX IF NOT EXISTS idx_proveedores_erp_codigo_itiana
ON proveedores_erp(codigo_itiana)
WHERE codigo_itiana IS NOT NULL;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
