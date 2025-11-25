-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT DE RESET Y CARGA DE DATOS DE PRUEBA
-- ═══════════════════════════════════════════════════════════════════════════
-- Este script:
-- 1. LIMPIA todos los gastos, ingresos y eventos
-- 2. INSERTA datos de prueba completos para verificar cálculos
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- PASO 1: LIMPIEZA COMPLETA DE DATOS
-- ============================================================================

-- Eliminar TODOS los gastos
DELETE FROM evt_gastos;
ALTER SEQUENCE evt_gastos_id_seq RESTART WITH 1;

-- Eliminar TODOS los ingresos
DELETE FROM evt_ingresos;
ALTER SEQUENCE evt_ingresos_id_seq RESTART WITH 1;

-- Eliminar TODOS los eventos
DELETE FROM evt_eventos;
ALTER SEQUENCE evt_eventos_id_seq RESTART WITH 1;

-- ============================================================================
-- PASO 2: INSERTAR DATOS DE PRUEBA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EVENTO 1: "Conferencia Tech Summit 2025" - EVENTO COMPLETO CON TODOS LOS DATOS
-- ----------------------------------------------------------------------------
-- Este evento tiene provisiones, ingresos y gastos en todas las categorías

INSERT INTO evt_eventos (
  company_id,
  clave_evento,
  nombre_proyecto,
  descripcion,
  cliente_id,
  tipo_evento_id,
  estado_id,
  fecha_evento,
  fecha_fin,
  lugar,
  numero_invitados,
  prioridad,
  fase_proyecto,
  responsable_id,
  solicitante_id,
  -- Provisiones por categoría
  provision_combustible_peaje,
  provision_materiales,
  provision_recursos_humanos,
  provision_solicitudes_pago,
  -- Ingreso estimado
  ingreso_estimado,
  activo
) VALUES (
  1, -- company_id (ajusta según tu BD)
  'EVT-2025-001',
  'Conferencia Tech Summit 2025',
  'Evento corporativo de tecnología con 500 asistentes',
  1, -- cliente_id (ajusta según tu BD)
  1, -- tipo_evento_id (ajusta según tu BD)
  2, -- estado_id (ajusta según tu BD - ej: "En Progreso")
  '2025-03-15',
  '2025-03-17',
  'Centro de Convenciones Ciudad de México',
  500,
  'alta',
  'ejecucion',
  (SELECT id FROM users LIMIT 1), -- responsable_id
  (SELECT id FROM users LIMIT 1), -- solicitante_id
  -- Provisiones
  50000.00,  -- provision_combustible_peaje
  120000.00, -- provision_materiales
  200000.00, -- provision_recursos_humanos
  80000.00,  -- provision_solicitudes_pago
  -- Total provisiones: $450,000
  -- Ingreso estimado
  650000.00, -- ingreso_estimado (utilidad estimada: 200,000)
  true
) RETURNING id;

-- Guardamos el ID del evento (usa el ID que te devuelva la consulta anterior)
-- Para este ejemplo, asumiremos que el ID es 1

-- INGRESOS para Evento 1
INSERT INTO evt_ingresos (evento_id, concepto, total, cobrado, fecha_emision, fecha_vencimiento, categoria_id, notas)
VALUES
  -- Ingreso 1: Anticipo 50% - COBRADO
  (1, 'Anticipo 50% - Tech Summit', 325000.00, true, '2025-01-15', '2025-01-30', 1, 'Primer pago cobrado'),

  -- Ingreso 2: Pago final 30% - COBRADO
  (1, 'Segundo pago 30% - Tech Summit', 195000.00, true, '2025-02-15', '2025-02-28', 1, 'Segundo pago cobrado'),

  -- Ingreso 3: Pago final 20% - PENDIENTE
  (1, 'Pago final 20% - Tech Summit', 130000.00, false, '2025-03-01', '2025-03-20', 1, 'Pago final pendiente de cobro');

-- Total ingresos: $650,000 (Cobrados: $520,000 | Pendientes: $130,000)

-- GASTOS para Evento 1
-- Categoría 6: Solicitudes de Pago
INSERT INTO evt_gastos (evento_id, concepto, total, categoria_id, pagado, fecha_gasto, fecha_vencimiento, notas)
VALUES
  (1, 'Pago a proveedor audiovisual', 35000.00, 6, true, '2025-02-01', '2025-02-15', 'Equipo AV pagado'),
  (1, 'Pago a proveedor de mobiliario', 28000.00, 6, true, '2025-02-10', '2025-02-25', 'Sillas y mesas pagadas'),
  (1, 'Anticipo catering', 15000.00, 6, false, '2025-02-20', '2025-03-10', 'Pendiente de pago');
-- Subtotal SPS: Provisionado: $80,000 | Gastado total: $78,000 (Pagado: $63,000 | Pendiente: $15,000)

-- Categoría 7: Recursos Humanos
INSERT INTO evt_gastos (evento_id, concepto, total, categoria_id, pagado, fecha_gasto, fecha_vencimiento, notas)
VALUES
  (1, 'Personal de logística (10 personas x 3 días)', 90000.00, 7, true, '2025-02-15', '2025-03-01', 'Equipo logística pagado'),
  (1, 'Staff de registro y atención', 45000.00, 7, true, '2025-02-20', '2025-03-05', 'Personal de registro pagado'),
  (1, 'Coordinadores del evento', 55000.00, 7, false, '2025-03-01', '2025-03-18', 'Pago programado post-evento');
-- Subtotal RH: Provisionado: $200,000 | Gastado total: $190,000 (Pagado: $135,000 | Pendiente: $55,000)

-- Categoría 8: Materiales
INSERT INTO evt_gastos (evento_id, concepto, total, categoria_id, pagado, fecha_gasto, fecha_vencimiento, notas)
VALUES
  (1, 'Material impreso (gafetes, señalética)', 25000.00, 8, true, '2025-02-05', '2025-02-20', 'Impresiones pagadas'),
  (1, 'Material promocional y merchandising', 42000.00, 8, true, '2025-02-12', '2025-02-28', 'Merchandising pagado'),
  (1, 'Decoración y montaje', 38000.00, 8, false, '2025-02-25', '2025-03-12', 'Pendiente decoración');
-- Subtotal Materiales: Provisionado: $120,000 | Gastado total: $105,000 (Pagado: $67,000 | Pendiente: $38,000)

-- Categoría 9: Combustible y Peaje
INSERT INTO evt_gastos (evento_id, concepto, total, categoria_id, pagado, fecha_gasto, fecha_vencimiento, notas)
VALUES
  (1, 'Transporte de equipos (camiones)', 18000.00, 9, true, '2025-02-08', '2025-02-22', 'Transporte pagado'),
  (1, 'Gasolina vehículos staff', 12000.00, 9, true, '2025-02-15', '2025-03-01', 'Combustible pagado'),
  (1, 'Peajes y estacionamientos', 8000.00, 9, false, '2025-03-01', '2025-03-15', 'Por liquidar');
-- Subtotal Combustible: Provisionado: $50,000 | Gastado total: $38,000 (Pagado: $30,000 | Pendiente: $8,000)

-- RESUMEN EVENTO 1 "Tech Summit":
-- Provisiones totales: $450,000
-- Ingresos totales: $650,000 (Cobrados: $520,000 | Pendientes: $130,000)
-- Gastos totales: $411,000 (Pagados: $295,000 | Pendientes: $116,000)
-- Disponible total: $450,000 - $411,000 = $39,000
-- Utilidad real (cobrada): $520,000 - $295,000 = $225,000

-- ----------------------------------------------------------------------------
-- EVENTO 2: "Boda Jardín Primavera" - EVENTO SIMPLE CON DATOS BÁSICOS
-- ----------------------------------------------------------------------------

INSERT INTO evt_eventos (
  company_id,
  clave_evento,
  nombre_proyecto,
  descripcion,
  cliente_id,
  tipo_evento_id,
  estado_id,
  fecha_evento,
  fecha_fin,
  lugar,
  numero_invitados,
  prioridad,
  fase_proyecto,
  responsable_id,
  solicitante_id,
  provision_combustible_peaje,
  provision_materiales,
  provision_recursos_humanos,
  provision_solicitudes_pago,
  ingreso_estimado,
  activo
) VALUES (
  1,
  'EVT-2025-002',
  'Boda Jardín Primavera',
  'Boda al aire libre con 200 invitados',
  2, -- cliente_id diferente
  2, -- tipo_evento_id diferente
  3, -- estado_id (ej: "Confirmado")
  '2025-04-20',
  '2025-04-20',
  'Hacienda Los Robles',
  200,
  'media',
  'planeacion',
  (SELECT id FROM users LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  15000.00,  -- provision_combustible_peaje
  80000.00,  -- provision_materiales
  60000.00,  -- provision_recursos_humanos
  45000.00,  -- provision_solicitudes_pago
  -- Total provisiones: $200,000
  300000.00, -- ingreso_estimado
  true
);

-- INGRESOS para Evento 2
INSERT INTO evt_ingresos (evento_id, concepto, total, cobrado, fecha_emision, fecha_vencimiento, categoria_id, notas)
VALUES
  (2, 'Anticipo 40%', 120000.00, true, '2025-01-10', '2025-01-25', 1, 'Anticipo cobrado'),
  (2, 'Segundo pago 40%', 120000.00, false, '2025-03-01', '2025-03-15', 1, 'Pendiente de cobro'),
  (2, 'Pago final 20%', 60000.00, false, '2025-04-10', '2025-04-25', 1, 'Liquidación pendiente');

-- Total ingresos: $300,000 (Cobrados: $120,000 | Pendientes: $180,000)

-- GASTOS para Evento 2
INSERT INTO evt_gastos (evento_id, concepto, total, categoria_id, pagado, fecha_gasto, fecha_vencimiento, notas)
VALUES
  -- SPS
  (2, 'Anticipo floristería', 22000.00, 6, true, '2025-01-20', '2025-02-05', 'Flores anticipadas'),
  (2, 'Pago banquete', 18000.00, 6, false, '2025-03-15', '2025-04-01', 'Pendiente catering'),
  -- RH
  (2, 'Meseros y bartenders', 28000.00, 7, true, '2025-02-01', '2025-02-20', 'Personal pagado'),
  (2, 'Coordinador de evento', 25000.00, 7, false, '2025-03-20', '2025-04-10', 'Pago programado'),
  -- Materiales
  (2, 'Decoración floral', 35000.00, 8, true, '2025-02-10', '2025-02-28', 'Decoración pagada'),
  (2, 'Mobiliario (sillas, mesas)', 32000.00, 8, false, '2025-03-10', '2025-04-05', 'Por pagar'),
  -- Combustible
  (2, 'Transporte de materiales', 8000.00, 9, true, '2025-02-05', '2025-02-20', 'Transporte pagado'),
  (2, 'Logística día del evento', 5000.00, 9, false, '2025-04-15', '2025-04-22', 'Pendiente');

-- RESUMEN EVENTO 2 "Boda Jardín":
-- Provisiones totales: $200,000
-- Ingresos totales: $300,000 (Cobrados: $120,000 | Pendientes: $180,000)
-- Gastos totales: $173,000 (Pagados: $93,000 | Pendientes: $80,000)
-- Disponible: $200,000 - $173,000 = $27,000
-- Utilidad real: $120,000 - $93,000 = $27,000

-- ----------------------------------------------------------------------------
-- EVENTO 3: "Lanzamiento Producto XYZ" - EVENTO CON SOBREGASTO
-- ----------------------------------------------------------------------------

INSERT INTO evt_eventos (
  company_id,
  clave_evento,
  nombre_proyecto,
  descripcion,
  cliente_id,
  tipo_evento_id,
  estado_id,
  fecha_evento,
  fecha_fin,
  lugar,
  numero_invitados,
  prioridad,
  fase_proyecto,
  responsable_id,
  solicitante_id,
  provision_combustible_peaje,
  provision_materiales,
  provision_recursos_humanos,
  provision_solicitudes_pago,
  ingreso_estimado,
  activo
) VALUES (
  1,
  'EVT-2025-003',
  'Lanzamiento Producto XYZ',
  'Evento de lanzamiento con presentación en vivo',
  3,
  3,
  2, -- en progreso
  '2025-02-28',
  '2025-02-28',
  'Auditorio Nacional',
  300,
  'alta',
  'ejecucion',
  (SELECT id FROM users LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  20000.00,
  100000.00,
  150000.00,
  80000.00,
  -- Total provisiones: $350,000
  500000.00,
  true
);

-- INGRESOS para Evento 3
INSERT INTO evt_ingresos (evento_id, concepto, total, cobrado, fecha_emision, fecha_vencimiento, categoria_id, notas)
VALUES
  (3, 'Anticipo 50%', 250000.00, true, '2024-12-15', '2025-01-05', 1, 'Anticipo cobrado'),
  (3, 'Pago final 50%', 250000.00, true, '2025-02-01', '2025-02-20', 1, 'Pago final cobrado');

-- Total ingresos: $500,000 (TODO COBRADO)

-- GASTOS para Evento 3 (CON SOBREGASTO)
INSERT INTO evt_gastos (evento_id, concepto, total, categoria_id, pagado, fecha_gasto, fecha_vencimiento, notas)
VALUES
  -- SPS - SOBREGASTO
  (3, 'Producción audiovisual premium', 65000.00, 6, true, '2025-01-15', '2025-02-01', 'Producción pagada'),
  (3, 'Renta de escenario especial', 48000.00, 6, true, '2025-01-20', '2025-02-10', 'Escenario pagado'),
  -- RH - SOBREGASTO
  (3, 'Equipo técnico especializado', 95000.00, 7, true, '2025-01-25', '2025-02-15', 'Técnicos pagados'),
  (3, 'Staff de producción', 72000.00, 7, true, '2025-02-01', '2025-02-20', 'Staff pagado'),
  -- Materiales - SOBREGASTO
  (3, 'Escenografía y decoración especial', 68000.00, 8, true, '2025-01-18', '2025-02-05', 'Decoración pagada'),
  (3, 'Material promocional premium', 55000.00, 8, true, '2025-01-22', '2025-02-10', 'Material pagado'),
  -- Combustible
  (3, 'Logística y transporte', 22000.00, 9, true, '2025-02-01', '2025-02-20', 'Logística pagada'),
  (3, 'Gasolina y peajes', 8000.00, 9, true, '2025-02-15', '2025-02-25', 'Combustible pagado');

-- RESUMEN EVENTO 3 "Lanzamiento XYZ":
-- Provisiones totales: $350,000
-- Ingresos totales: $500,000 (TODO COBRADO)
-- Gastos totales: $433,000 (TODO PAGADO) - ¡SOBREGASTO de $83,000!
-- Disponible: $350,000 - $433,000 = -$83,000 (NEGATIVO)
-- Utilidad real: $500,000 - $433,000 = $67,000

-- ═══════════════════════════════════════════════════════════════════════════
-- RESUMEN GENERAL DE LOS 3 EVENTOS
-- ═══════════════════════════════════════════════════════════════════════════

-- EVENTO 1 - Tech Summit:
--   ✓ Provisiones: $450,000
--   ✓ Ingresos: $650,000 (80% cobrado)
--   ✓ Gastos: $411,000 (72% pagado)
--   ✓ Disponible: $39,000
--   ✓ Utilidad: $225,000

-- EVENTO 2 - Boda Jardín:
--   ✓ Provisiones: $200,000
--   ✓ Ingresos: $300,000 (40% cobrado)
--   ✓ Gastos: $173,000 (54% pagado)
--   ✓ Disponible: $27,000
--   ✓ Utilidad: $27,000

-- EVENTO 3 - Lanzamiento XYZ:
--   ✓ Provisiones: $350,000
--   ✓ Ingresos: $500,000 (100% cobrado)
--   ✓ Gastos: $433,000 (100% pagado) - SOBREGASTO
--   ✓ Disponible: -$83,000 (NEGATIVO - ALERTA)
--   ✓ Utilidad: $67,000

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUCCIONES DE USO
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Abre Supabase SQL Editor
-- 2. Copia y pega TODO este script
-- 3. VERIFICA los IDs de:
--    - company_id
--    - cliente_id
--    - tipo_evento_id
--    - estado_id
--    - categoria_id (6=SPS, 7=RH, 8=Materiales, 9=Combustible)
-- 4. Ejecuta el script completo
-- 5. Verifica en la app que aparezcan los 3 eventos con sus datos
-- ═══════════════════════════════════════════════════════════════════════════
