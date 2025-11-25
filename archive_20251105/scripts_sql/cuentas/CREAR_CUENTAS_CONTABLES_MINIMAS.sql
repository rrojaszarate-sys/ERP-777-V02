-- ═══════════════════════════════════════════════════════════════════════════
-- CREAR CUENTAS CONTABLES MÍNIMAS PARA POOL DE PRUEBAS
-- ═══════════════════════════════════════════════════════════════════════════
-- Ejecutar ANTES de populate-test-pool-3-years.mjs
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Limpiar cuentas existentes (opcional)
-- DELETE FROM evt_cuentas WHERE id <= 50;

-- ═══════════════════════════════════════════════════════════════════════════
-- CUENTAS PARA GASTOS (id ≤ 23)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO evt_cuentas (id, codigo, nombre, tipo, subtipo, naturaleza, nivel, acepta_movimientos) VALUES
(1, '1010-001', 'Caja General', 'activo', 'efectivo', 'deudora', 3, true),
(2, '1020-001', 'Banco BBVA Cuenta Principal', 'activo', 'bancos', 'deudora', 3, true),
(3, '1020-002', 'Banco Santander', 'activo', 'bancos', 'deudora', 3, true),
(4, '1020-003', 'Banco Banorte', 'activo', 'bancos', 'deudora', 3, true),
(5, '1020-004', 'Banco HSBC', 'activo', 'bancos', 'deudora', 3, true),
(6, '2010-001', 'Proveedores Generales', 'pasivo', 'cuentas_por_pagar', 'acreedora', 3, true),
(7, '2010-002', 'Proveedores Materiales', 'pasivo', 'cuentas_por_pagar', 'acreedora', 3, true),
(8, '2010-003', 'Proveedores RH', 'pasivo', 'cuentas_por_pagar', 'acreedora', 3, true),
(9, '2010-004', 'Proveedores Servicios', 'pasivo', 'cuentas_por_pagar', 'acreedora', 3, true),
(10, '5010-001', 'Combustible y Peajes', 'gasto', 'operativo', 'deudora', 3, true),
(11, '5010-002', 'Materiales y Suministros', 'gasto', 'operativo', 'deudora', 3, true),
(12, '5010-003', 'Recursos Humanos Eventual', 'gasto', 'operativo', 'deudora', 3, true),
(13, '5010-004', 'Solicitudes de Pago', 'gasto', 'operativo', 'deudora', 3, true),
(14, '5020-001', 'Gastos Administrativos', 'gasto', 'administrativo', 'deudora', 3, true),
(15, '5020-002', 'Gastos Financieros', 'gasto', 'financiero', 'deudora', 3, true),
(16, '5030-001', 'Gastos No Deducibles', 'gasto', 'no_deducible', 'deudora', 3, true),
(17, '5040-001', 'Depreciación', 'gasto', 'depreciacion', 'deudora', 3, true),
(18, '5050-001', 'Amortización', 'gasto', 'amortizacion', 'deudora', 3, true),
(19, '5060-001', 'Otros Gastos', 'gasto', 'otros', 'deudora', 3, true),
(20, '1030-001', 'Caja Chica', 'activo', 'efectivo', 'deudora', 3, true),
(21, '1040-001', 'Banco Scotiabank', 'activo', 'bancos', 'deudora', 3, true),
(22, '1040-002', 'Banco Inbursa', 'activo', 'bancos', 'deudora', 3, true),
(23, '2020-001', 'Acreedores Diversos', 'pasivo', 'cuentas_por_pagar', 'acreedora', 3, true)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  tipo = EXCLUDED.tipo,
  subtipo = EXCLUDED.subtipo;

-- ═══════════════════════════════════════════════════════════════════════════
-- CUENTAS PARA INGRESOS (id ≥ 24)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO evt_cuentas (id, codigo, nombre, tipo, subtipo, naturaleza, nivel, acepta_movimientos) VALUES
(24, '4010-001', 'Ingresos por Eventos', 'ingreso', 'servicios', 'acreedora', 3, true),
(25, '4010-002', 'Ingresos por Banquetes', 'ingreso', 'servicios', 'acreedora', 3, true),
(26, '4010-003', 'Ingresos por Convenciones', 'ingreso', 'servicios', 'acreedora', 3, true),
(27, '4010-004', 'Ingresos por Bodas', 'ingreso', 'servicios', 'acreedora', 3, true),
(28, '4010-005', 'Ingresos por XV Años', 'ingreso', 'servicios', 'acreedora', 3, true),
(29, '4010-006', 'Ingresos por Graduaciones', 'ingreso', 'servicios', 'acreedora', 3, true),
(30, '4020-001', 'Anticipos de Clientes', 'pasivo', 'anticipos', 'acreedora', 3, true),
(31, '1130-001', 'Clientes', 'activo', 'cuentas_por_cobrar', 'deudora', 3, true),
(32, '1130-002', 'Documentos por Cobrar', 'activo', 'cuentas_por_cobrar', 'deudora', 3, true),
(33, '4030-001', 'Otros Ingresos', 'ingreso', 'otros', 'acreedora', 3, true),
(34, '4040-001', 'Productos Financieros', 'ingreso', 'financieros', 'acreedora', 3, true),
(35, '4050-001', 'Utilidad en Venta de Activos', 'ingreso', 'extraordinarios', 'acreedora', 3, true),
(36, '1140-001', 'Deudores Diversos', 'activo', 'cuentas_por_cobrar', 'deudora', 3, true),
(37, '4010-007', 'Ingresos por Conferencias', 'ingreso', 'servicios', 'acreedora', 3, true),
(38, '4010-008', 'Ingresos por Exposiciones', 'ingreso', 'servicios', 'acreedora', 3, true),
(39, '4010-009', 'Ingresos por Lanzamientos', 'ingreso', 'servicios', 'acreedora', 3, true),
(40, '4010-010', 'Ingresos por Festivales', 'ingreso', 'servicios', 'acreedora', 3, true),
(41, '1150-001', 'IVA Acreditable', 'activo', 'impuestos', 'deudora', 3, true),
(42, '2110-001', 'IVA por Pagar', 'pasivo', 'impuestos', 'acreedora', 3, true),
(43, '1160-001', 'Anticipos a Proveedores', 'activo', 'anticipos', 'deudora', 3, true),
(44, '4060-001', 'Descuentos Obtenidos', 'ingreso', 'descuentos', 'acreedora', 3, true),
(45, '5070-001', 'Descuentos Otorgados', 'gasto', 'descuentos', 'deudora', 3, true),
(46, '4010-011', 'Ingresos por Congresos', 'ingreso', 'servicios', 'acreedora', 3, true),
(47, '4010-012', 'Ingresos por Capacitaciones', 'ingreso', 'servicios', 'acreedora', 3, true),
(48, '4010-013', 'Ingresos por Asesorías', 'ingreso', 'servicios', 'acreedora', 3, true),
(49, '4010-014', 'Ingresos por Coordinación', 'ingreso', 'servicios', 'acreedora', 3, true),
(50, '4010-015', 'Ingresos por Logística', 'ingreso', 'servicios', 'acreedora', 3, true)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  tipo = EXCLUDED.tipo,
  subtipo = EXCLUDED.subtipo;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  'CUENTAS PARA GASTOS (id ≤ 23)' as tipo,
  COUNT(*) as total
FROM evt_cuentas
WHERE id <= 23

UNION ALL

SELECT 
  'CUENTAS PARA INGRESOS (id ≥ 24)' as tipo,
  COUNT(*) as total
FROM evt_cuentas
WHERE id >= 24;
