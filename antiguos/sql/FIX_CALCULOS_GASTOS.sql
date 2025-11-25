-- =============================================================================
-- FIX: Corrección de cálculos de subtotal e IVA en gastos
-- =============================================================================
-- Fecha: 2025-01-XX
-- Problema: El trigger calculate_expense_totals() estaba calculando mal
--           Asumía: subtotal → IVA → total (suma)
--           Realidad: total → subtotal → IVA (resta/división)
-- Solución: Reemplazar función del trigger para calcular desde el total
-- =============================================================================

-- 🔧 PASO 1: Eliminar trigger existente
DROP TRIGGER IF EXISTS calculate_expense_totals_trigger ON evt_gastos;
DROP TRIGGER IF EXISTS trg_calculate_expense_totals ON evt_gastos;

-- 🔧 PASO 2: Reemplazar la función con cálculo correcto
CREATE OR REPLACE FUNCTION calculate_expense_totals()
RETURNS TRIGGER AS $$
DECLARE
    iva_factor NUMERIC;
BEGIN
    -- ✅ LÓGICA CORRECTA: El usuario ingresa TOTAL, calculamos subtotal e IVA
    -- Prioridad: Si hay total definido, calcular desde ahí (caso más común)
    IF NEW.total IS NOT NULL AND NEW.total > 0 THEN
        -- Calcular el factor IVA (ej: 1.16 para 16%)
        iva_factor := 1 + (COALESCE(NEW.iva_porcentaje, 16) / 100.0);
        
        -- Calcular subtotal dividiendo el total por el factor
        -- Ejemplo: $1,160 / 1.16 = $1,000
        NEW.subtotal := NEW.total / iva_factor;
        
        -- Calcular IVA como la diferencia
        -- Ejemplo: $1,160 - $1,000 = $160
        NEW.iva := NEW.total - NEW.subtotal;
        
    -- Si no hay total pero hay subtotal (caso excepcional), calcular hacia adelante
    ELSIF NEW.subtotal IS NOT NULL AND NEW.subtotal > 0 THEN
        -- Calcular IVA del subtotal
        NEW.iva := NEW.subtotal * (COALESCE(NEW.iva_porcentaje, 16) / 100.0);
        
        -- Calcular total sumando
        NEW.total := NEW.subtotal + NEW.iva;
        
    -- Si no hay ni total ni subtotal, inicializar en 0
    ELSE
        NEW.subtotal := 0;
        NEW.iva := 0;
        NEW.total := 0;
    END IF;
    
    -- Redondear a 2 decimales para evitar errores de precisión
    NEW.subtotal := ROUND(NEW.subtotal::numeric, 2);
    NEW.iva := ROUND(NEW.iva::numeric, 2);
    NEW.total := ROUND(NEW.total::numeric, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔧 PASO 3: Recrear el trigger con la función corregida
CREATE TRIGGER calculate_expense_totals_trigger
    BEFORE INSERT OR UPDATE ON evt_gastos
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expense_totals();

-- ✅ PASO 4: Recalcular todos los gastos existentes para corregir datos históricos
-- ADVERTENCIA: Esto actualizará TODOS los registros de gastos
-- Solo ejecutar si se necesita corregir datos antiguos
-- Comentar esta sección si no se desea recalcular datos históricos

/*
UPDATE evt_gastos
SET 
    subtotal = total / (1 + (iva_porcentaje / 100)),
    iva = total - (total / (1 + (iva_porcentaje / 100)))
WHERE total > 0;
*/

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Ejecutar después de aplicar el fix para verificar:

-- 1. Verificar que el trigger existe
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'evt_gastos'
AND trigger_name LIKE '%expense%';

-- 2. Probar con un INSERT de prueba (ajustar evento_id según tu base de datos)
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
    1, -- Cambiar por un evento_id válido
    'PRUEBA - Cálculo automático',
    1160.00,
    16,
    'Proveedor Test',
    CURRENT_DATE,
    'efectivo'
)
RETURNING id, concepto, total, subtotal, iva, iva_porcentaje;
*/

-- Resultado esperado:
-- total: 1160.00
-- subtotal: 1000.00
-- iva: 160.00
-- iva_porcentaje: 16

-- 3. Verificar un gasto existente después del fix
/*
SELECT 
    id,
    concepto,
    total,
    subtotal,
    iva,
    iva_porcentaje,
    ROUND(total / (1 + (iva_porcentaje / 100)), 2) as subtotal_esperado,
    ROUND(total - (total / (1 + (iva_porcentaje / 100))), 2) as iva_esperado
FROM evt_gastos
WHERE total > 0
ORDER BY id DESC
LIMIT 5;
*/

-- =============================================================================
-- DOCUMENTACIÓN
-- =============================================================================
/*
ANTES del fix:
--------------
Trigger calculaba: subtotal → IVA → total (suma)
Problema: Usuario ingresa total, pero trigger ignoraba ese valor

DESPUÉS del fix:
----------------
Trigger calcula: total → subtotal → IVA (división/resta)
✅ Usuario ingresa: $1,160 total
✅ Sistema calcula: $1,000 subtotal + $160 IVA

Fórmulas aplicadas:
- subtotal = total / (1 + iva_porcentaje/100)
- iva = total - subtotal

Ejemplo con IVA 16%:
- Total: $1,160
- Factor: 1.16
- Subtotal: $1,160 / 1.16 = $1,000
- IVA: $1,160 - $1,000 = $160
*/
