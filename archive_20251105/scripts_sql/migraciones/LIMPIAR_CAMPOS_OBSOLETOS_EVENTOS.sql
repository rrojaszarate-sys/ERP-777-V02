-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SCRIPT: Limpiar campos obsoletos en evt_eventos
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Fecha: 30 de Octubre de 2025
-- Descripción:
--   Poner en CERO todos los campos obsoletos que ahora se calculan
--   dinámicamente en la vista vw_eventos_analisis_financiero
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- PASO 1: ACTUALIZAR TODOS LOS REGISTROS
-- ════════════════════════════════════════════════════════════════════

UPDATE evt_eventos
SET
  -- ❌ CAMPO OBSOLETO: provisiones (se calcula como suma de 4 provisiones)
  provisiones = 0,
  
  -- ❌ CAMPO OBSOLETO: utilidad_estimada (se calcula en vista)
  utilidad_estimada = 0,
  
  -- ❌ CAMPO OBSOLETO: porcentaje_utilidad_estimada (se calcula en vista)
  porcentaje_utilidad_estimada = 0,
  
  -- ❌ CAMPO OBSOLETO: total_gastos (se calcula desde evt_gastos)
  total_gastos = 0,
  
  -- ❌ CAMPO OBSOLETO: utilidad (se calcula en vista)
  utilidad = 0,
  
  -- ❌ CAMPO OBSOLETO: margen_utilidad (se calcula en vista)
  margen_utilidad = 0,
  
  updated_at = NOW()
WHERE deleted_at IS NULL;

-- ════════════════════════════════════════════════════════════════════
-- PASO 2: VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_total_eventos INTEGER;
  v_eventos_con_valores INTEGER;
BEGIN
  -- Contar eventos activos
  SELECT COUNT(*) INTO v_total_eventos
  FROM evt_eventos
  WHERE deleted_at IS NULL;
  
  -- Verificar si hay eventos con campos obsoletos != 0
  SELECT COUNT(*) INTO v_eventos_con_valores
  FROM evt_eventos
  WHERE deleted_at IS NULL
    AND (provisiones != 0
         OR utilidad_estimada != 0
         OR porcentaje_utilidad_estimada != 0
         OR total_gastos != 0
         OR utilidad != 0
         OR margen_utilidad != 0);
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'LIMPIEZA DE CAMPOS OBSOLETOS COMPLETADA';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Total de eventos activos: %', v_total_eventos;
  RAISE NOTICE 'Eventos con campos obsoletos != 0: %', v_eventos_con_valores;
  
  IF v_eventos_con_valores > 0 THEN
    RAISE WARNING '⚠️  ADVERTENCIA: % eventos aún tienen valores en campos obsoletos', v_eventos_con_valores;
  ELSE
    RAISE NOTICE '✅ Todos los campos obsoletos están en cero';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'CAMPOS LIMPIADOS (ahora calculados en vista):';
  RAISE NOTICE '  • provisiones → provisiones_total (suma de 4 categorías)';
  RAISE NOTICE '  • utilidad_estimada → ingreso_estimado - provisiones_total';
  RAISE NOTICE '  • porcentaje_utilidad_estimada → (utilidad_estimada / ingreso_estimado) * 100';
  RAISE NOTICE '  • total_gastos → suma de evt_gastos pagados';
  RAISE NOTICE '  • utilidad → ingresos_cobrados - gastos_pagados';
  RAISE NOTICE '  • margen_utilidad → (utilidad / ingresos_cobrados) * 100';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- PASO 3: QUERY DE VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════

-- Mostrar primeros 5 eventos con sus valores calculados vs tabla
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  
  -- Tabla (deben ser 0)
  e.provisiones AS tabla_provisiones_obsoleto,
  e.utilidad_estimada AS tabla_utilidad_estimada_obsoleto,
  e.total_gastos AS tabla_total_gastos_obsoleto,
  
  -- Vista (valores reales)
  v.provisiones_total AS vista_provisiones_calculado,
  v.utilidad_estimada AS vista_utilidad_estimada_calculado,
  (v.gastos_combustible_pagados + v.gastos_materiales_pagados + 
   v.gastos_rh_pagados + v.gastos_sps_pagados) AS vista_gastos_totales_calculado
FROM evt_eventos e
LEFT JOIN vw_eventos_analisis_financiero v ON e.id = v.id
WHERE e.deleted_at IS NULL
ORDER BY e.id DESC
LIMIT 5;
