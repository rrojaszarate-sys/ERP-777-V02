-- ============================================================================
-- AGREGAR CAMPO codigo_barras_fabrica A productos_erp
-- ============================================================================
-- Este campo almacena el código de barras que viene de fábrica (EAN-13, UPC, etc.)
-- Es opcional porque no todos los productos tienen código de fábrica
-- ============================================================================

-- 1. Agregar la columna
ALTER TABLE productos_erp 
ADD COLUMN IF NOT EXISTS codigo_barras_fabrica TEXT;

-- 2. Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_productos_erp_codigo_barras_fabrica 
ON productos_erp(codigo_barras_fabrica) 
WHERE codigo_barras_fabrica IS NOT NULL;

-- 3. Agregar comentario descriptivo
COMMENT ON COLUMN productos_erp.codigo_barras_fabrica IS 
'Código de barras original de fábrica (EAN-13, UPC-A, etc.). Opcional - solo para productos que ya traen código.';

-- 4. Agregar campo para indicar si requiere etiqueta interna
ALTER TABLE productos_erp 
ADD COLUMN IF NOT EXISTS requiere_etiqueta BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN productos_erp.requiere_etiqueta IS 
'Indica si el producto necesita etiqueta interna. FALSE si ya tiene código de barras de fábrica.';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'productos_erp' 
AND column_name IN ('codigo_barras_fabrica', 'requiere_etiqueta', 'codigo_qr', 'clave');
