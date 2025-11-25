-- =====================================================
-- SCRIPT DE PRUEBAS: Módulo de Ingresos
-- =====================================================
-- Ejecuta este script DESPUÉS de la migración para probar

-- 1. PRUEBA: Insertar ingreso básico
DO $$
DECLARE
  test_evento_id INTEGER;
  test_ingreso_id INTEGER;
BEGIN
  -- Buscar un evento existente
  SELECT id INTO test_evento_id FROM evt_eventos LIMIT 1;
  
  IF test_evento_id IS NULL THEN
    RAISE EXCEPTION 'No hay eventos en la base de datos para probar';
  END IF;

  -- Insertar ingreso de prueba
  INSERT INTO evt_ingresos (
    evento_id,
    concepto,
    descripcion,
    total,
    subtotal,
    iva,
    iva_porcentaje,
    fecha_ingreso,
    referencia,
    facturado,
    cobrado,
    metodo_cobro,
    created_at,
    updated_at
  ) VALUES (
    test_evento_id,
    'PRUEBA AUTOMÁTICA - Ingreso Básico',
    'Ingreso de prueba para validar funcionamiento',
    1160.00,
    1000.00,
    160.00,
    16,
    CURRENT_DATE,
    'TEST-001',
    false,
    false,
    'transferencia',
    NOW(),
    NOW()
  ) RETURNING id INTO test_ingreso_id;

  RAISE NOTICE '✅ PRUEBA 1: Ingreso básico creado con ID: %', test_ingreso_id;
END $$;

-- 2. PRUEBA: Insertar ingreso con datos CFDI completos
DO $$
DECLARE
  test_evento_id INTEGER;
  test_ingreso_id INTEGER;
  test_detalle JSONB;
BEGIN
  -- Buscar un evento existente
  SELECT id INTO test_evento_id FROM evt_eventos LIMIT 1;
  
  -- Crear detalle de compra en JSON
  test_detalle := '[
    {
      "cantidad": 1,
      "unidad": "PZ",
      "clave_prod_serv": "84111506",
      "descripcion": "Servicio de consultoría",
      "valor_unitario": 1000.00,
      "importe": 1000.00
    }
  ]'::jsonb;

  -- Insertar ingreso con datos CFDI
  INSERT INTO evt_ingresos (
    evento_id,
    concepto,
    descripcion,
    total,
    subtotal,
    iva,
    iva_porcentaje,
    fecha_ingreso,
    referencia,
    facturado,
    cobrado,
    metodo_cobro,
    -- Campos CFDI
    uuid_cfdi,
    folio_fiscal,
    serie,
    folio,
    tipo_comprobante,
    forma_pago_sat,
    metodo_pago_sat,
    moneda,
    lugar_expedicion,
    uso_cfdi,
    regimen_fiscal_receptor,
    regimen_fiscal_emisor,
    -- Datos de relación
    proveedor,
    rfc_proveedor,
    cliente,
    rfc_cliente,
    -- Detalle
    detalle_compra,
    created_at,
    updated_at
  ) VALUES (
    test_evento_id,
    'PRUEBA AUTOMÁTICA - Factura CFDI',
    'Factura de prueba con todos los campos CFDI',
    1160.00,
    1000.00,
    160.00,
    16,
    CURRENT_DATE,
    'A-123',
    true,
    false,
    'transferencia',
    -- Campos CFDI
    '12345678-1234-1234-1234-123456789012',
    '12345678-1234-1234-1234-123456789012',
    'A',
    '123',
    'I',
    '01',
    'PUE',
    'MXN',
    '64000',
    'G03',
    '601',
    '612',
    -- Datos de relación
    'EMPRESA EMISORA SA DE CV',
    'EEM123456789',
    'EMPRESA RECEPTORA SA DE CV',
    'EER987654321',
    -- Detalle
    test_detalle,
    NOW(),
    NOW()
  ) RETURNING id INTO test_ingreso_id;

  RAISE NOTICE '✅ PRUEBA 2: Ingreso con CFDI creado con ID: %', test_ingreso_id;
END $$;

-- 3. PRUEBA: Actualizar ingreso
DO $$
DECLARE
  test_ingreso_id INTEGER;
BEGIN
  -- Buscar el último ingreso de prueba
  SELECT id INTO test_ingreso_id 
  FROM evt_ingresos 
  WHERE concepto LIKE 'PRUEBA AUTOMÁTICA%' 
  ORDER BY created_at DESC 
  LIMIT 1;

  IF test_ingreso_id IS NOT NULL THEN
    UPDATE evt_ingresos
    SET 
      descripcion = 'ACTUALIZADO: ' || descripcion,
      updated_at = NOW()
    WHERE id = test_ingreso_id;

    RAISE NOTICE '✅ PRUEBA 3: Ingreso actualizado con ID: %', test_ingreso_id;
  ELSE
    RAISE NOTICE '⚠️  PRUEBA 3: No se encontraron ingresos de prueba para actualizar';
  END IF;
END $$;

-- 4. VERIFICACIÓN: Listar ingresos de prueba
SELECT 
  id,
  evento_id,
  concepto,
  descripcion,
  total,
  subtotal,
  iva,
  uuid_cfdi,
  serie,
  folio,
  proveedor,
  rfc_proveedor,
  cliente,
  rfc_cliente,
  facturado,
  cobrado,
  created_at
FROM evt_ingresos
WHERE concepto LIKE 'PRUEBA AUTOMÁTICA%'
ORDER BY created_at DESC;

-- 5. VERIFICACIÓN: Contar campos de la tabla
SELECT 
  COUNT(*) as total_columnas,
  COUNT(CASE WHEN column_name LIKE '%cfdi%' THEN 1 END) as campos_cfdi,
  COUNT(CASE WHEN column_name IN ('proveedor', 'rfc_proveedor', 'cliente', 'rfc_cliente') THEN 1 END) as campos_relacion
FROM information_schema.columns
WHERE table_name = 'evt_ingresos';

-- 6. LIMPIEZA: Eliminar ingresos de prueba (OPCIONAL)
-- Descomenta estas líneas si quieres limpiar las pruebas
/*
DELETE FROM evt_ingresos
WHERE concepto LIKE 'PRUEBA AUTOMÁTICA%';

SELECT '🗑️  Ingresos de prueba eliminados' AS resultado;
*/

-- RESULTADO FINAL
SELECT '✅ TODAS LAS PRUEBAS COMPLETADAS' AS resultado;
SELECT 'Revisa los mensajes NOTICE arriba para ver los resultados' AS instruccion;
