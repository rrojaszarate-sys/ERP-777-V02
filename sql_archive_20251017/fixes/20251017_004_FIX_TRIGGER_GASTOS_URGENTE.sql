-- =====================================================================
-- 🚨 FIX URGENTE: Trigger que sobrescribe los cálculos de gastos
-- =====================================================================
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- =====================================================================

-- PASO 1: Ver el trigger actual (INCORRECTO)
SELECT 
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'calculate_expense_totals';

-- Verás algo como:
-- NEW.subtotal = NEW.cantidad * NEW.precio_unitario;  ❌ INCORRECTO
-- NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100); ❌ INCORRECTO
-- NEW.total = NEW.subtotal + NEW.iva;                  ❌ INCORRECTO

-- =====================================================================
-- PASO 2: ELIMINAR el trigger y función actuales
-- =====================================================================

DROP TRIGGER IF EXISTS calculate_expense_totals_trigger ON evt_gastos;
DROP TRIGGER IF EXISTS trg_calculate_expense_totals ON evt_gastos;
DROP FUNCTION IF EXISTS calculate_expense_totals();

-- =====================================================================
-- PASO 3: CREAR NUEVA FUNCIÓN CORRECTA
-- =====================================================================
-- Esta función respeta el TOTAL que viene del frontend/XML
-- y calcula subtotal e IVA desde ahí

CREATE OR REPLACE FUNCTION calculate_expense_totals()
RETURNS TRIGGER AS $$
DECLARE
    iva_factor NUMERIC;
BEGIN
    -- 💰 SI HAY TOTAL: Calcular subtotal e IVA desde el total (CORRECTO)
    -- Este es el caso cuando suben XML CFDI o ingresan el total manualmente
    IF NEW.total IS NOT NULL AND NEW.total > 0 THEN
        iva_factor := 1.0 + (COALESCE(NEW.iva_porcentaje, 16) / 100.0);
        NEW.subtotal := ROUND((NEW.total / iva_factor)::numeric, 2);
        NEW.iva := ROUND((NEW.total - NEW.subtotal)::numeric, 2);
        
    -- 📦 SI HAY SUBTOTAL: Calcular IVA y total desde subtotal (caso legacy)
    ELSIF NEW.subtotal IS NOT NULL AND NEW.subtotal > 0 THEN
        NEW.iva := ROUND((NEW.subtotal * COALESCE(NEW.iva_porcentaje, 16) / 100.0)::numeric, 2);
        NEW.total := ROUND((NEW.subtotal + NEW.iva)::numeric, 2);
        
    -- 🚫 SI NO HAY NADA: Inicializar en 0
    ELSE
        NEW.subtotal := 0;
        NEW.iva := 0;
        NEW.total := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- PASO 4: RECREAR EL TRIGGER
-- =====================================================================

CREATE TRIGGER calculate_expense_totals_trigger
    BEFORE INSERT OR UPDATE ON evt_gastos
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expense_totals();

-- =====================================================================
-- PASO 5: VERIFICAR QUE SE APLICÓ CORRECTAMENTE
-- =====================================================================

-- Ver la nueva función
SELECT 
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'calculate_expense_totals';

-- Deberías ver:
-- NEW.subtotal := ROUND((NEW.total / iva_factor)::numeric, 2);  ✅ CORRECTO

-- Ver que el trigger existe
SELECT 
    trigger_name, 
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'evt_gastos'
AND trigger_name LIKE '%expense%';

-- =====================================================================
-- PASO 6: PROBAR CON UN INSERT DE PRUEBA
-- =====================================================================

-- Cambiar evento_id por uno válido de tu base de datos
/*
INSERT INTO evt_gastos (
    evento_id,
    concepto,
    total,
    iva_porcentaje,
    proveedor,
    fecha_gasto,
    forma_pago
) VALUES (
    1, -- ⚠️ CAMBIAR POR UN evento_id VÁLIDO
    '🧪 PRUEBA - Delete después',
    1160.00,
    16,
    'Proveedor Test',
    CURRENT_DATE,
    'efectivo'
)
RETURNING 
    id, 
    concepto, 
    total, 
    subtotal, 
    iva,
    '✅ Debe mostrar: total=1160, subtotal=1000, iva=160' as esperado;
*/

-- =====================================================================
-- RESULTADO ESPERADO DE LA PRUEBA:
-- =====================================================================
-- total:    1160.00 ✅
-- subtotal: 1000.00 ✅
-- iva:       160.00 ✅

-- =====================================================================
-- AHORA PRUEBA EN LA APLICACIÓN:
-- =====================================================================
-- 1. Subir un XML con descuento
-- 2. Verificar que el total sea correcto
-- 3. Verificar que subtotal = total / 1.16
-- 4. Verificar que iva = total - subtotal
-- =====================================================================

-- ✅ FIN DEL SCRIPT
