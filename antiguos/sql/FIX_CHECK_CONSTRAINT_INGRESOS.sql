-- =====================================================
-- FIX: Eliminar CHECK CONSTRAINT problemático
-- =====================================================

-- 1. Ver el constraint actual
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'evt_ingresos'::regclass
  AND contype = 'c'
  AND conname LIKE '%forma_pago%';

-- 2. Eliminar el constraint problemático
ALTER TABLE evt_ingresos 
DROP CONSTRAINT IF EXISTS check_forma_pago_sat_ingresos;

-- 3. Verificar que se eliminó
SELECT 
  conname AS constraint_name
FROM pg_constraint
WHERE conrelid = 'evt_ingresos'::regclass
  AND contype = 'c'
  AND conname LIKE '%forma_pago%';

-- 4. Verificar también otros constraints problemáticos
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'evt_ingresos'::regclass
  AND contype = 'c';

-- 5. Eliminar cualquier otro constraint que pueda causar problemas
ALTER TABLE evt_ingresos 
DROP CONSTRAINT IF EXISTS check_metodo_pago_sat_ingresos;

ALTER TABLE evt_ingresos 
DROP CONSTRAINT IF EXISTS check_tipo_comprobante_ingresos;

ALTER TABLE evt_ingresos 
DROP CONSTRAINT IF EXISTS check_uso_cfdi_ingresos;

-- 6. Confirmación
SELECT '✅ CHECK CONSTRAINTS eliminados correctamente' AS resultado;

-- 7. Verificar estructura final
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
  AND column_name IN ('forma_pago_sat', 'metodo_pago_sat', 'tipo_comprobante')
ORDER BY column_name;
