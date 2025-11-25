-- =====================================================
-- CREAR CUENTAS BANCARIAS PARA PRUEBAS
-- ERP-777 V1
-- =====================================================

INSERT INTO evt_cuentas (nombre, banco, numero_cuenta, clabe, saldo_inicial, saldo_actual, activo)
VALUES
  ('Cuenta Principal BBVA', 'BBVA Bancomer', '0123456789', '012180001234567890', 500000.00, 500000.00, true),
  ('Cuenta Santander Empresarial', 'Santander', '9876543210', '014180009876543210', 300000.00, 300000.00, true),
  ('Cuenta Banamex Operaciones', 'Banamex', '5555666677', '002180005555666677', 250000.00, 250000.00, true),
  ('Cuenta HSBC Inversiones', 'HSBC', '1111222233', '021180001111222233', 150000.00, 150000.00, true),
  ('Cuenta Scotiabank Nómina', 'Scotiabank', '4444888899', '044180004444888899', 100000.00, 100000.00, true)
ON CONFLICT DO NOTHING;

-- Verificar
SELECT id, nombre, banco FROM evt_cuentas;
