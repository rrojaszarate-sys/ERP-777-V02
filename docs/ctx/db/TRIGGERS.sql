-- Database Triggers
-- Extracted from migration files

-- Trigger: calculate_expense_totals_trigger
CREATE TRIGGER calculate_expense_totals_trigger
  BEFORE INSERT OR UPDATE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION calculate_expense_totals();

-- Trigger: calculate_income_totals_trigger
CREATE TRIGGER calculate_income_totals_trigger
  BEFORE INSERT OR UPDATE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION calculate_income_totals();

-- Trigger: to
Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();

-- Trigger: update_core_companies_updated_at
CREATE TRIGGER update_core_companies_updated_at
  BEFORE UPDATE ON core_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_core_users_updated_at
CREATE TRIGGER update_core_users_updated_at
  BEFORE UPDATE ON core_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_event_financials_on_expense
CREATE TRIGGER update_event_financials_on_expense
  AFTER INSERT OR UPDATE OR DELETE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION update_event_financials();

-- Trigger: update_event_financials_on_income
CREATE TRIGGER update_event_financials_on_income
  AFTER INSERT OR UPDATE OR DELETE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION update_event_financials();

-- Trigger: update_evt_clientes_updated_at
CREATE TRIGGER update_evt_clientes_updated_at
  BEFORE UPDATE ON evt_clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_evt_eventos_updated_at
CREATE TRIGGER update_evt_eventos_updated_at
  BEFORE UPDATE ON evt_eventos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_evt_gastos_updated_at
CREATE TRIGGER update_evt_gastos_updated_at
  BEFORE UPDATE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_evt_ingresos_updated_at
CREATE TRIGGER update_evt_ingresos_updated_at
  BEFORE UPDATE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

