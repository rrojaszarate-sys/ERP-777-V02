-- ================================================
-- CREAR CUENTA CONTABLE "PENDIENTE"
-- Para casos donde aún no se ha asignado cuenta
-- ================================================

-- Verificar si ya existe
DO $$
BEGIN
  -- Crear cuenta "PENDIENTE" si no existe
  IF NOT EXISTS (
    SELECT 1 FROM evt_cuentas_contables 
    WHERE codigo = 'PEND-001' OR nombre ILIKE '%pendiente%'
  ) THEN
    INSERT INTO evt_cuentas_contables (
      codigo,
      nombre,
      tipo,
      descripcion,
      nivel,
      activa,
      created_at,
      updated_at
    ) VALUES (
      'PEND-001',
      'Cuenta Pendiente de Asignación',
      'ingresos',
      'Cuenta temporal para ingresos que aún no tienen cuenta contable asignada. Debe ser reemplazada al momento del pago.',
      1,
      true,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Cuenta contable PENDIENTE creada exitosamente';
  ELSE
    RAISE NOTICE 'ℹ️  La cuenta PENDIENTE ya existe';
  END IF;
END $$;

-- Verificar resultado
SELECT 
  id,
  codigo,
  nombre,
  tipo,
  descripcion,
  activa
FROM evt_cuentas_contables
WHERE codigo = 'PEND-001' OR nombre ILIKE '%pendiente%';
