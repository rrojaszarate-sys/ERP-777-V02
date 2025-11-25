-- PRUEBA RÁPIDA: Verificar que el campo ganancia_estimada existe y se puede insertar/actualizar

-- 1. Ver la estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'evt_eventos' 
  AND column_name IN ('ganancia_estimada', 'provision_combustible_peaje', 'provision_materiales', 'provision_recursos_humanos', 'provision_solicitudes_pago')
ORDER BY column_name;

-- 2. Insertar un evento de prueba
INSERT INTO evt_eventos (
    clave_evento,
    nombre_proyecto,
    descripcion,
    fecha_evento,
    cliente_id,
    tipo_evento_id,
    responsable_id,
    lugar,
    ganancia_estimada,
    provision_combustible_peaje,
    provision_materiales,
    provision_recursos_humanos,
    provision_solicitudes_pago,
    created_at,
    updated_at
) VALUES (
    'EVT-2025-999',
    'PRUEBA INGRESO ESTIMADO',
    'Evento de prueba para verificar el guardado de ingreso estimado',
    '2025-01-15',
    (SELECT id FROM clientes LIMIT 1),
    (SELECT id FROM tipo_evento LIMIT 1),
    (SELECT id FROM usuarios LIMIT 1),
    'Sede de Prueba',
    50000.00,  -- Ingreso Estimado (ganancia_estimada)
    5000.00,   -- Combustible
    10000.00,  -- Materiales
    15000.00,  -- RRHH
    8000.00,   -- SPs
    NOW(),
    NOW()
)
RETURNING id, clave_evento, ganancia_estimada, provision_combustible_peaje, provision_materiales, provision_recursos_humanos, provision_solicitudes_pago;

-- 3. Actualizar el evento de prueba
UPDATE evt_eventos
SET 
    ganancia_estimada = 60000.00,
    provision_materiales = 12000.00,
    updated_at = NOW()
WHERE clave_evento = 'EVT-2025-999'
RETURNING id, clave_evento, ganancia_estimada, provision_materiales;

-- 4. Verificar desde la vista
SELECT 
    id,
    clave_evento,
    nombre_proyecto,
    ingreso_estimado,  -- Alias de ganancia_estimada
    provisiones_total,  -- Suma calculada
    utilidad_estimada,  -- Calculada: ingreso - provisiones
    margen_estimado_pct
FROM vw_eventos_analisis_financiero
WHERE clave_evento = 'EVT-2025-999';

-- 5. Eliminar el evento de prueba
DELETE FROM evt_eventos WHERE clave_evento = 'EVT-2025-999';
