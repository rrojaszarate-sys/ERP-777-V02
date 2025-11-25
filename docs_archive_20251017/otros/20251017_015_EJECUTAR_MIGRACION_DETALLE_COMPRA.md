# 🚀 Ejecutar Migración - Campo detalle_compra

## Opción 1: Supabase Dashboard (Recomendado)

1. Abre: https://app.supabase.com/project/gomnouwackzvthpwyric/sql/new
2. Copia y pega este SQL:

```sql
-- Agregar campo detalle_compra a expenses
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS detalle_compra TEXT;

COMMENT ON COLUMN expenses.detalle_compra IS 
'Detalle de productos del ticket extraídos via OCR. Formato: "cantidad x producto - $precio = $subtotal"';

-- Verificar que se agregó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses'
AND column_name = 'detalle_compra';
```

3. Click en **Run** o presiona `Ctrl + Enter`

## Opción 2: psql (Si tienes acceso directo)

```bash
psql "postgresql://postgres:[PASSWORD]@db.gomnouwackzvthpwyric.supabase.co:5432/postgres" -f supabase/migrations/20251011000001_add_detalle_compra_to_expenses.sql
```

## Verificación

Después de ejecutar, verifica en Supabase Dashboard:
1. Ve a **Table Editor** → **expenses**
2. Busca la columna `detalle_compra`
3. Debería aparecer como **Text** (nullable)

## ✅ Resultado Esperado

```
ALTER TABLE
COMMENT

 column_name    | data_type | is_nullable
----------------+-----------+-------------
 detalle_compra | text      | YES
```
