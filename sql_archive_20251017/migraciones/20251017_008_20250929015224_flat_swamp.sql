/*
  # Create Calculation Triggers

  1. Functions
    - `calculate_income_totals()` - Calculates subtotal, IVA, and total for income
    - `calculate_expense_totals()` - Calculates subtotal, IVA, and total for expenses
    - `update_event_financials()` - Updates event financial summary

  2. Triggers
    - Income calculation trigger
    - Expense calculation trigger
    - Event financial update triggers
*/

-- Function to calculate income totals
CREATE OR REPLACE FUNCTION calculate_income_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate subtotal
  NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
  
  -- Calculate IVA
  NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100);
  
  -- Calculate total
  NEW.total = NEW.subtotal + NEW.iva;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate expense totals
CREATE OR REPLACE FUNCTION calculate_expense_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate subtotal
  NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
  
  -- Calculate IVA
  NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100);
  
  -- Calculate total
  NEW.total = NEW.subtotal + NEW.iva;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update event financial summary
CREATE OR REPLACE FUNCTION update_event_financials()
RETURNS TRIGGER AS $$
DECLARE
  evento_id_to_update integer;
  total_ingresos numeric;
  total_gastos_calc numeric;
  utilidad_calc numeric;
  margen_calc numeric;
BEGIN
  -- Determine which event to update
  IF TG_TABLE_NAME = 'evt_ingresos' THEN
    IF TG_OP = 'DELETE' THEN
      evento_id_to_update = OLD.evento_id;
    ELSE
      evento_id_to_update = NEW.evento_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'evt_gastos' THEN
    IF TG_OP = 'DELETE' THEN
      evento_id_to_update = OLD.evento_id;
    ELSE
      evento_id_to_update = NEW.evento_id;
    END IF;
  END IF;
  
  -- Calculate totals for the event
  SELECT COALESCE(SUM(total), 0) INTO total_ingresos
  FROM evt_ingresos
  WHERE evento_id = evento_id_to_update;
  
  SELECT COALESCE(SUM(total), 0) INTO total_gastos_calc
  FROM evt_gastos
  WHERE evento_id = evento_id_to_update 
    AND activo = true 
    AND deleted_at IS NULL;
  
  -- Calculate utilidad and margin
  utilidad_calc = total_ingresos - total_gastos_calc;
  margen_calc = CASE 
    WHEN total_ingresos > 0 THEN (utilidad_calc / total_ingresos) * 100
    ELSE 0
  END;
  
  -- Update event totals
  UPDATE evt_eventos SET
    total = total_ingresos,
    total_gastos = total_gastos_calc,
    utilidad = utilidad_calc,
    margen_utilidad = margen_calc,
    updated_at = now()
  WHERE id = evento_id_to_update;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic calculations
CREATE TRIGGER calculate_income_totals_trigger
  BEFORE INSERT OR UPDATE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION calculate_income_totals();

CREATE TRIGGER calculate_expense_totals_trigger
  BEFORE INSERT OR UPDATE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION calculate_expense_totals();

-- Create triggers for event financial updates
CREATE TRIGGER update_event_financials_on_income
  AFTER INSERT OR UPDATE OR DELETE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION update_event_financials();

CREATE TRIGGER update_event_financials_on_expense
  AFTER INSERT OR UPDATE OR DELETE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION update_event_financials();