-- =====================================================
-- Migration: Vista vw_eventos_erp_analisis con Fórmula de Utilidad del Cliente
-- Fecha: 2025-11-26
-- Descripción:
--   - Crear vista independiente para Eventos-ERP
--   - Fórmula de utilidad alineada al Excel del cliente:
--     UTILIDAD = INGRESOS - GASTOS - PROVISIONES_DISPONIBLES
--     PROVISIONES_DISPONIBLES = MAX(0, PROVISIONES - GASTOS)
--   - Provisiones nunca negativas
--   - Semáforo de utilidad: Verde ≥35%, Amarillo 25-34%, Rojo 1-24%, Gris ≤0%
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: CREAR VISTA vw_eventos_erp_analisis
-- =====================================================

DROP VIEW IF EXISTS vw_eventos_erp_analisis CASCADE;

CREATE OR REPLACE VIEW vw_eventos_erp_analisis AS
SELECT
  -- ========================================
  -- IDENTIFICACIÓN DEL EVENTO
  -- ========================================
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.cliente_id,
  c.razon_social AS cliente_nombre,
  e.fecha_evento,
  e.estado_id,
  es.nombre AS estado_nombre,

  -- ========================================
  -- INGRESOS (Totales: cobrados + pendientes)
  -- ========================================

  -- Total de ingresos (cobrados + pendientes)
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.deleted_at IS NULL) AS ingresos_totales,

  -- Ingresos cobrados
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = true
     AND i.deleted_at IS NULL) AS ingresos_cobrados,

  -- Ingresos pendientes de cobro
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = false
     AND i.deleted_at IS NULL) AS ingresos_pendientes,

  -- Ingreso estimado (del campo del evento)
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,

  -- ========================================
  -- GASTOS (Totales: pagados + pendientes)
  -- ========================================

  -- Total gastos (pagados + pendientes)
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.deleted_at IS NULL) AS gastos_totales,

  -- Gastos pagados
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_pagados,

  -- Gastos pendientes de pago
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_pendientes,

  -- ========================================
  -- PROVISIONES (Según Excel del cliente)
  -- ========================================

  -- Provisiones totales (presupuesto reservado)
  COALESCE(e.provisiones, 0) AS provisiones_totales,

  -- Provisiones disponibles = MAX(0, PROVISIONES - GASTOS)
  -- NUNCA NEGATIVAS según requerimiento del cliente
  GREATEST(0, COALESCE(e.provisiones, 0) -
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id
       AND g.deleted_at IS NULL)) AS provisiones_disponibles,

  -- ========================================
  -- UTILIDAD (Fórmula del Cliente)
  -- UTILIDAD = INGRESOS - GASTOS - PROVISIONES_DISPONIBLES
  -- ========================================

  -- Cálculo de utilidad según fórmula del cliente
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.deleted_at IS NULL) -
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.deleted_at IS NULL) -
  GREATEST(0, COALESCE(e.provisiones, 0) -
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id
       AND g.deleted_at IS NULL)) AS utilidad,

  -- Margen de utilidad porcentaje
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0)
          FROM evt_ingresos i
          WHERE i.evento_id = e.id
            AND i.deleted_at IS NULL) > 0
    THEN (
      (
        -- UTILIDAD
        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos i
         WHERE i.evento_id = e.id
           AND i.deleted_at IS NULL) -
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos g
         WHERE g.evento_id = e.id
           AND g.deleted_at IS NULL) -
        GREATEST(0, COALESCE(e.provisiones, 0) -
          (SELECT COALESCE(SUM(g.total), 0)
           FROM evt_gastos g
           WHERE g.evento_id = e.id
             AND g.deleted_at IS NULL))
      ) /
      -- INGRESOS
      (SELECT COALESCE(SUM(i.total), 0)
       FROM evt_ingresos i
       WHERE i.evento_id = e.id
         AND i.deleted_at IS NULL)
    ) * 100
    ELSE 0
  END AS margen_utilidad,

  -- ========================================
  -- SEMÁFORO DE UTILIDAD (Colores del cliente)
  -- Verde ≥35%, Amarillo 25-34%, Rojo 1-24%, Gris ≤0%
  -- ========================================
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0)
          FROM evt_ingresos i
          WHERE i.evento_id = e.id
            AND i.deleted_at IS NULL) = 0 THEN 'gris'
    WHEN (
      (
        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos i
         WHERE i.evento_id = e.id
           AND i.deleted_at IS NULL) -
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos g
         WHERE g.evento_id = e.id
           AND g.deleted_at IS NULL) -
        GREATEST(0, COALESCE(e.provisiones, 0) -
          (SELECT COALESCE(SUM(g.total), 0)
           FROM evt_gastos g
           WHERE g.evento_id = e.id
             AND g.deleted_at IS NULL))
      ) /
      NULLIF((SELECT COALESCE(SUM(i.total), 0)
              FROM evt_ingresos i
              WHERE i.evento_id = e.id
                AND i.deleted_at IS NULL), 0)
    ) * 100 >= 35 THEN 'verde'
    WHEN (
      (
        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos i
         WHERE i.evento_id = e.id
           AND i.deleted_at IS NULL) -
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos g
         WHERE g.evento_id = e.id
           AND g.deleted_at IS NULL) -
        GREATEST(0, COALESCE(e.provisiones, 0) -
          (SELECT COALESCE(SUM(g.total), 0)
           FROM evt_gastos g
           WHERE g.evento_id = e.id
             AND g.deleted_at IS NULL))
      ) /
      NULLIF((SELECT COALESCE(SUM(i.total), 0)
              FROM evt_ingresos i
              WHERE i.evento_id = e.id
                AND i.deleted_at IS NULL), 0)
    ) * 100 >= 25 THEN 'amarillo'
    WHEN (
      (
        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos i
         WHERE i.evento_id = e.id
           AND i.deleted_at IS NULL) -
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos g
         WHERE g.evento_id = e.id
           AND g.deleted_at IS NULL) -
        GREATEST(0, COALESCE(e.provisiones, 0) -
          (SELECT COALESCE(SUM(g.total), 0)
           FROM evt_gastos g
           WHERE g.evento_id = e.id
             AND g.deleted_at IS NULL))
      ) /
      NULLIF((SELECT COALESCE(SUM(i.total), 0)
              FROM evt_ingresos i
              WHERE i.evento_id = e.id
                AND i.deleted_at IS NULL), 0)
    ) * 100 >= 1 THEN 'rojo'
    ELSE 'gris'
  END AS semaforo_utilidad,

  -- Etiqueta del semáforo
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0)
          FROM evt_ingresos i
          WHERE i.evento_id = e.id
            AND i.deleted_at IS NULL) = 0 THEN 'Ninguno'
    WHEN (
      (
        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos i
         WHERE i.evento_id = e.id
           AND i.deleted_at IS NULL) -
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos g
         WHERE g.evento_id = e.id
           AND g.deleted_at IS NULL) -
        GREATEST(0, COALESCE(e.provisiones, 0) -
          (SELECT COALESCE(SUM(g.total), 0)
           FROM evt_gastos g
           WHERE g.evento_id = e.id
             AND g.deleted_at IS NULL))
      ) /
      NULLIF((SELECT COALESCE(SUM(i.total), 0)
              FROM evt_ingresos i
              WHERE i.evento_id = e.id
                AND i.deleted_at IS NULL), 0)
    ) * 100 >= 35 THEN 'Excelente'
    WHEN (
      (
        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos i
         WHERE i.evento_id = e.id
           AND i.deleted_at IS NULL) -
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos g
         WHERE g.evento_id = e.id
           AND g.deleted_at IS NULL) -
        GREATEST(0, COALESCE(e.provisiones, 0) -
          (SELECT COALESCE(SUM(g.total), 0)
           FROM evt_gastos g
           WHERE g.evento_id = e.id
             AND g.deleted_at IS NULL))
      ) /
      NULLIF((SELECT COALESCE(SUM(i.total), 0)
              FROM evt_ingresos i
              WHERE i.evento_id = e.id
                AND i.deleted_at IS NULL), 0)
    ) * 100 >= 25 THEN 'Regular'
    WHEN (
      (
        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos i
         WHERE i.evento_id = e.id
           AND i.deleted_at IS NULL) -
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos g
         WHERE g.evento_id = e.id
           AND g.deleted_at IS NULL) -
        GREATEST(0, COALESCE(e.provisiones, 0) -
          (SELECT COALESCE(SUM(g.total), 0)
           FROM evt_gastos g
           WHERE g.evento_id = e.id
             AND g.deleted_at IS NULL))
      ) /
      NULLIF((SELECT COALESCE(SUM(i.total), 0)
              FROM evt_ingresos i
              WHERE i.evento_id = e.id
                AND i.deleted_at IS NULL), 0)
    ) * 100 >= 1 THEN 'Bajo'
    ELSE 'Ninguno'
  END AS etiqueta_semaforo,

  -- ========================================
  -- GASTOS POR CATEGORÍA (Para desglose)
  -- ========================================

  -- SP's (Solicitudes de Pago) - categoria_id = 6
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 6
     AND g.deleted_at IS NULL) AS gastos_sps,

  -- RH (Recursos Humanos) - categoria_id = 7
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 7
     AND g.deleted_at IS NULL) AS gastos_rh,

  -- Materiales - categoria_id = 8
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 8
     AND g.deleted_at IS NULL) AS gastos_materiales,

  -- Combustible/Peaje - categoria_id = 9
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = 9
     AND g.deleted_at IS NULL) AS gastos_combustible,

  -- ========================================
  -- TIMESTAMPS
  -- ========================================
  e.created_at,
  e.updated_at

FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
WHERE e.activo = true;

COMMENT ON VIEW vw_eventos_erp_analisis IS
'Vista de análisis financiero para Eventos-ERP con fórmula del cliente:
- UTILIDAD = INGRESOS - GASTOS - PROVISIONES_DISPONIBLES
- PROVISIONES_DISPONIBLES = MAX(0, PROVISIONES - GASTOS)
- Provisiones nunca negativas
- Semáforo: Verde ≥35%, Amarillo 25-34%, Rojo 1-24%, Gris ≤0%
- Desglose de gastos por categoría (SP''s, RH, Materiales, Combustible)';

-- =====================================================
-- PASO 2: CREAR FUNCIÓN HELPER calcular_utilidad_evento
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_utilidad_evento(p_evento_id INTEGER)
RETURNS TABLE(
  ingresos_totales NUMERIC,
  gastos_totales NUMERIC,
  provisiones_totales NUMERIC,
  provisiones_disponibles NUMERIC,
  utilidad NUMERIC,
  margen_utilidad NUMERIC,
  semaforo TEXT,
  etiqueta TEXT
) AS $$
DECLARE
  v_ingresos NUMERIC;
  v_gastos NUMERIC;
  v_provisiones NUMERIC;
  v_prov_disponibles NUMERIC;
  v_utilidad NUMERIC;
  v_margen NUMERIC;
BEGIN
  -- Obtener ingresos totales
  SELECT COALESCE(SUM(i.total), 0) INTO v_ingresos
  FROM evt_ingresos i
  WHERE i.evento_id = p_evento_id AND i.deleted_at IS NULL;

  -- Obtener gastos totales
  SELECT COALESCE(SUM(g.total), 0) INTO v_gastos
  FROM evt_gastos g
  WHERE g.evento_id = p_evento_id AND g.deleted_at IS NULL;

  -- Obtener provisiones del evento
  SELECT COALESCE(e.provisiones, 0) INTO v_provisiones
  FROM evt_eventos e
  WHERE e.id = p_evento_id;

  -- Calcular provisiones disponibles (nunca negativas)
  v_prov_disponibles := GREATEST(0, v_provisiones - v_gastos);

  -- Calcular utilidad según fórmula del cliente
  v_utilidad := v_ingresos - v_gastos - v_prov_disponibles;

  -- Calcular margen de utilidad
  IF v_ingresos > 0 THEN
    v_margen := (v_utilidad / v_ingresos) * 100;
  ELSE
    v_margen := 0;
  END IF;

  RETURN QUERY SELECT
    v_ingresos,
    v_gastos,
    v_provisiones,
    v_prov_disponibles,
    v_utilidad,
    v_margen,
    CASE
      WHEN v_margen >= 35 THEN 'verde'
      WHEN v_margen >= 25 THEN 'amarillo'
      WHEN v_margen >= 1 THEN 'rojo'
      ELSE 'gris'
    END,
    CASE
      WHEN v_margen >= 35 THEN 'Excelente'
      WHEN v_margen >= 25 THEN 'Regular'
      WHEN v_margen >= 1 THEN 'Bajo'
      ELSE 'Ninguno'
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_utilidad_evento(INTEGER) IS
'Función helper para calcular utilidad de un evento según fórmula del cliente:
UTILIDAD = INGRESOS - GASTOS - MAX(0, PROVISIONES - GASTOS)';

-- =====================================================
-- PASO 3: VERIFICACIÓN
-- =====================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM vw_eventos_erp_analisis;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'MIGRACIÓN 013 COMPLETADA: Vista Eventos-ERP con Utilidad';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ OBJETOS CREADOS:';
  RAISE NOTICE '   ✓ Vista vw_eventos_erp_analisis';
  RAISE NOTICE '   ✓ Función calcular_utilidad_evento(INTEGER)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 FÓRMULAS IMPLEMENTADAS:';
  RAISE NOTICE '   UTILIDAD = INGRESOS - GASTOS - PROV_DISPONIBLES';
  RAISE NOTICE '   PROV_DISPONIBLES = MAX(0, PROVISIONES - GASTOS)';
  RAISE NOTICE '';
  RAISE NOTICE '🚦 SEMÁFORO DE UTILIDAD:';
  RAISE NOTICE '   Verde   ≥ 35%% - Excelente';
  RAISE NOTICE '   Amarillo 25-34%% - Regular';
  RAISE NOTICE '   Rojo    1-24%% - Bajo';
  RAISE NOTICE '   Gris    ≤ 0%% - Ninguno';
  RAISE NOTICE '';
  RAISE NOTICE '📈 Eventos en la vista: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
END $$;

COMMIT;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- 1. Ver análisis completo de eventos con utilidad del cliente
SELECT
  clave_evento,
  nombre_proyecto,
  cliente_nombre,
  ingresos_totales,
  gastos_totales,
  provisiones_disponibles,
  utilidad,
  margen_utilidad,
  semaforo_utilidad,
  etiqueta_semaforo
FROM vw_eventos_erp_analisis
ORDER BY utilidad DESC;

-- 2. Ver eventos por semáforo
SELECT
  semaforo_utilidad,
  COUNT(*) AS cantidad,
  SUM(utilidad) AS utilidad_total
FROM vw_eventos_erp_analisis
GROUP BY semaforo_utilidad
ORDER BY
  CASE semaforo_utilidad
    WHEN 'verde' THEN 1
    WHEN 'amarillo' THEN 2
    WHEN 'rojo' THEN 3
    ELSE 4
  END;

-- 3. Calcular utilidad de un evento específico
SELECT * FROM calcular_utilidad_evento(123);

-- 4. Desglose de gastos por categoría
SELECT
  clave_evento,
  nombre_proyecto,
  gastos_sps AS "💳 SP's",
  gastos_rh AS "👥 RH",
  gastos_materiales AS "🛠️ Materiales",
  gastos_combustible AS "🚗 Combustible",
  gastos_totales AS "Total Gastos"
FROM vw_eventos_erp_analisis
WHERE gastos_totales > 0
ORDER BY gastos_totales DESC;
*/
