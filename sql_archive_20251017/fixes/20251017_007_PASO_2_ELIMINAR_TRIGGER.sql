-- =====================================================================
-- PASO 2: ELIMINAR triggers y función actual
-- =====================================================================
-- Ejecuta este bloque completo

DROP TRIGGER IF EXISTS calculate_expense_totals_trigger ON evt_gastos;
DROP TRIGGER IF EXISTS trg_calculate_expense_totals ON evt_gastos;
DROP FUNCTION IF EXISTS calculate_expense_totals();

-- =====================================================================
-- Deberías ver: 
-- NOTICE: trigger "calculate_expense_totals_trigger" does not exist
-- O bien: DROP TRIGGER (success)
-- =====================================================================
