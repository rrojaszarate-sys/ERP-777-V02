-- =====================================================
-- Migration: Mejorar vw_eventos_analisis_financiero con Análisis de Ingresos Sin Cobrar
-- Fecha: 2025-10-28
-- Descripción:
--   - Agregar análisis completo de ingresos cobrados vs pendientes
--   - Incluir status de cobro similar al status presupuestal
--   - Agregar variación de ingresos (estimado vs real)
--   - Crear status financiero integral (gastos + ingresos)
--   - Incluir identificación de eventos con problemas de cobro
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: RECREAR VISTA vw_eventos_analisis_financiero CON ANÁLISIS DE INGRESOS
-- =====================================================

DROP VIEW IF EXISTS vw_eventos_analisis_financiero CASCADE;

CREATE OR REPLACE VIEW vw_eventos_analisis_financiero AS
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
  -- PROYECCIÓN FINANCIERA (Estimado)
  -- ========================================
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,
  COALESCE(e.provisiones, 0) AS provisiones,
  COALESCE(e.utilidad_estimada, 0) AS utilidad_estimada,
  COALESCE(e.porcentaje_utilidad_estimada, 0) AS porcentaje_utilidad_estimada,

  -- ========================================
  -- INGRESOS REALES (Análisis Detallado)
  -- ========================================

  -- Ingresos cobrados (ya en caja/banco)
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = true
     AND i.deleted_at IS NULL) AS ingresos_cobrados,

  -- Ingresos pendientes de cobro (por cobrar)
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = false
     AND i.deleted_at IS NULL) AS ingresos_pendientes,

  -- Total ingresos registrados (cobrados + pendientes)
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.deleted_at IS NULL) AS ingresos_totales,

  -- Diferencia absoluta en ingresos (cobrados vs estimado)
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = true
     AND i.deleted_at IS NULL) -
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS diferencia_ingresos_absoluta,

  -- Variación de ingresos en porcentaje
  CASE
    WHEN COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) > 0
    THEN (((SELECT COALESCE(SUM(i.total), 0)
            FROM evt_ingresos i
            WHERE i.evento_id = e.id
              AND i.cobrado = true
              AND i.deleted_at IS NULL) /
          COALESCE(e.ingreso_estimado, e.ganancia_estimada, 1)) - 1) * 100
    ELSE 0
  END AS variacion_ingresos_porcentaje,

  -- Porcentaje de cobro (cobrados / totales registrados)
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0)
          FROM evt_ingresos i
          WHERE i.evento_id = e.id
            AND i.deleted_at IS NULL) > 0
    THEN ((SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.cobrado = true
             AND i.deleted_at IS NULL) /
          (SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.deleted_at IS NULL)) * 100
    ELSE 0
  END AS porcentaje_cobro,

  -- Status de cobro
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0)
          FROM evt_ingresos i
          WHERE i.evento_id = e.id
            AND i.deleted_at IS NULL) = 0
    THEN 'sin_ingresos'

    WHEN (SELECT COALESCE(SUM(i.total), 0)
          FROM evt_ingresos i
          WHERE i.evento_id = e.id
            AND i.cobrado = false
            AND i.deleted_at IS NULL) = 0
    THEN 'cobrado_completo'

    WHEN ((SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.cobrado = true
             AND i.deleted_at IS NULL) /
          NULLIF((SELECT COALESCE(SUM(i.total), 0)
                  FROM evt_ingresos i
                  WHERE i.evento_id = e.id
                    AND i.deleted_at IS NULL), 0)) >= 0.80
    THEN 'cobro_bueno'

    WHEN ((SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.cobrado = true
             AND i.deleted_at IS NULL) /
          NULLIF((SELECT COALESCE(SUM(i.total), 0)
                  FROM evt_ingresos i
                  WHERE i.evento_id = e.id
                    AND i.deleted_at IS NULL), 0)) >= 0.50
    THEN 'cobro_parcial'

    ELSE 'cobro_critico'
  END AS status_cobro,

  -- ========================================
  -- GASTOS REALES (Análisis Detallado)
  -- ========================================

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

  -- Total gastos (pagados + pendientes)
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.deleted_at IS NULL) AS gastos_totales,

  -- Diferencia absoluta en gastos (pagados vs provisiones)
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) -
  COALESCE(e.provisiones, 0) AS diferencia_gastos_absoluta,

  -- Variación de gastos en porcentaje
  CASE
    WHEN COALESCE(e.provisiones, 0) > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            WHERE g.evento_id = e.id
              AND g.pagado = true
              AND g.deleted_at IS NULL) /
          COALESCE(e.provisiones, 1)) - 1) * 100
    ELSE 0
  END AS variacion_gastos_porcentaje,

  -- Status de ejecución presupuestal
  CASE
    WHEN COALESCE(e.provisiones, 0) = 0 THEN 'sin_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          WHERE g.evento_id = e.id
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= COALESCE(e.provisiones, 0) THEN 'dentro_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          WHERE g.evento_id = e.id
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= (COALESCE(e.provisiones, 0) * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal,

  -- ========================================
  -- UTILIDAD Y RENTABILIDAD
  -- ========================================

  -- Utilidad real (ingresos cobrados - gastos pagados)
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = true
     AND i.deleted_at IS NULL) -
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS utilidad_real,

  -- Utilidad proyectada (ingresos totales - gastos totales)
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.deleted_at IS NULL) -
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.deleted_at IS NULL) AS utilidad_proyectada,

  -- Margen de utilidad real
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0)
          FROM evt_ingresos i
          WHERE i.evento_id = e.id
            AND i.cobrado = true
            AND i.deleted_at IS NULL) > 0
    THEN (((SELECT COALESCE(SUM(i.total), 0)
            FROM evt_ingresos i
            WHERE i.evento_id = e.id
              AND i.cobrado = true
              AND i.deleted_at IS NULL) -
           (SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            WHERE g.evento_id = e.id
              AND g.pagado = true
              AND g.deleted_at IS NULL)) /
          (SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.cobrado = true
             AND i.deleted_at IS NULL)) * 100
    ELSE 0
  END AS margen_utilidad_real,

  -- Diferencia utilidad (real vs estimada)
  ((SELECT COALESCE(SUM(i.total), 0)
    FROM evt_ingresos i
    WHERE i.evento_id = e.id
      AND i.cobrado = true
      AND i.deleted_at IS NULL) -
   (SELECT COALESCE(SUM(g.total), 0)
    FROM evt_gastos g
    WHERE g.evento_id = e.id
      AND g.pagado = true
      AND g.deleted_at IS NULL)) -
  COALESCE(e.utilidad_estimada, 0) AS diferencia_utilidad_absoluta,

  -- ========================================
  -- STATUS FINANCIERO INTEGRAL
  -- ========================================

  CASE
    -- Evento saludable: dentro de presupuesto Y buen cobro
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          WHERE g.evento_id = e.id
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= COALESCE(e.provisiones, 0)
     AND ((SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.cobrado = true
             AND i.deleted_at IS NULL) /
          NULLIF((SELECT COALESCE(SUM(i.total), 0)
                  FROM evt_ingresos i
                  WHERE i.evento_id = e.id
                    AND i.deleted_at IS NULL), 0)) >= 0.80
    THEN 'saludable'

    -- Requiere atención: problemas en cobro o presupuesto
    WHEN ((SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.cobrado = true
             AND i.deleted_at IS NULL) /
          NULLIF((SELECT COALESCE(SUM(i.total), 0)
                  FROM evt_ingresos i
                  WHERE i.evento_id = e.id
                    AND i.deleted_at IS NULL), 0)) < 0.50
      OR (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          WHERE g.evento_id = e.id
            AND g.pagado = true
            AND g.deleted_at IS NULL) > (COALESCE(e.provisiones, 0) * 1.05)
    THEN 'critico'

    ELSE 'atencion'
  END AS status_financiero_integral,

  -- Indicador de riesgo de cobro (días desde evento si hay pendientes)
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0)
          FROM evt_ingresos i
          WHERE i.evento_id = e.id
            AND i.cobrado = false
            AND i.deleted_at IS NULL) > 0
     AND e.fecha_evento IS NOT NULL
     AND e.fecha_evento < CURRENT_DATE
    THEN EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento))::INTEGER
    ELSE 0
  END AS dias_desde_evento,

  -- ========================================
  -- TIMESTAMPS
  -- ========================================
  e.created_at,
  e.updated_at

FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
WHERE e.activo = true;

COMMENT ON VIEW vw_eventos_analisis_financiero IS
'Vista completa de análisis financiero de eventos con análisis integral de:
- Ingresos: cobrados, pendientes, variación vs estimado, status de cobro
- Gastos: pagados, pendientes, variación vs provisiones, status presupuestal
- Utilidad: real, proyectada, márgenes
- Status financiero integral del evento
Optimizada para dashboards y reportes gerenciales.';

-- =====================================================
-- PASO 2: CREAR VISTA ESPECÍFICA PARA EVENTOS CON PROBLEMAS DE COBRO
-- =====================================================

DROP VIEW IF EXISTS vw_eventos_problemas_cobro CASCADE;

CREATE OR REPLACE VIEW vw_eventos_problemas_cobro AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  c.razon_social AS cliente_nombre,
  e.fecha_evento,
  es.nombre AS estado_nombre,

  -- Montos
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = true
     AND i.deleted_at IS NULL) AS ingresos_cobrados,

  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = false
     AND i.deleted_at IS NULL) AS ingresos_pendientes,

  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.deleted_at IS NULL) AS ingresos_totales,

  -- Porcentaje de cobro
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0)
          FROM evt_ingresos i
          WHERE i.evento_id = e.id
            AND i.deleted_at IS NULL) > 0
    THEN ((SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.cobrado = true
             AND i.deleted_at IS NULL) /
          (SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.deleted_at IS NULL)) * 100
    ELSE 0
  END AS porcentaje_cobrado,

  -- Días desde el evento
  CASE
    WHEN e.fecha_evento IS NOT NULL AND e.fecha_evento < CURRENT_DATE
    THEN EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento))::INTEGER
    ELSE 0
  END AS dias_desde_evento,

  -- Categoría de urgencia
  CASE
    WHEN e.fecha_evento IS NULL THEN 'sin_fecha'
    WHEN e.fecha_evento > CURRENT_DATE THEN 'evento_futuro'
    WHEN EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento)) <= 30 THEN 'reciente'
    WHEN EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento)) <= 60 THEN 'urgente'
    WHEN EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento)) <= 90 THEN 'muy_urgente'
    ELSE 'critico'
  END AS categoria_urgencia,

  -- Conteo de facturas pendientes
  (SELECT COUNT(*)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = false
     AND i.deleted_at IS NULL) AS facturas_pendientes

FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
WHERE e.activo = true
  -- Solo eventos con ingresos pendientes
  AND (SELECT COALESCE(SUM(i.total), 0)
       FROM evt_ingresos i
       WHERE i.evento_id = e.id
         AND i.cobrado = false
         AND i.deleted_at IS NULL) > 0
ORDER BY
  CASE
    WHEN e.fecha_evento IS NULL THEN 999999
    ELSE EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento))::INTEGER
  END DESC;

COMMENT ON VIEW vw_eventos_problemas_cobro IS
'Vista especializada para identificar eventos con ingresos pendientes de cobro.
Incluye categorización por urgencia basada en días transcurridos desde el evento.
Útil para seguimiento de cuentas por cobrar.';

-- =====================================================
-- PASO 3: CREAR ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- =====================================================

-- Índice para análisis por cliente (usado en reportes de cobro)
CREATE INDEX IF NOT EXISTS idx_evt_eventos_cliente_fecha
ON evt_eventos(cliente_id, fecha_evento)
WHERE activo = true;

-- Índice para análisis temporal de cobros
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cobrado_fecha
ON evt_ingresos(cobrado, created_at)
WHERE deleted_at IS NULL;

-- =====================================================
-- PASO 4: CREAR FUNCIÓN HELPER PARA ANÁLISIS RÁPIDO
-- =====================================================

CREATE OR REPLACE FUNCTION get_evento_financial_summary(p_evento_id INTEGER)
RETURNS TABLE(
  concepto TEXT,
  estimado NUMERIC,
  monto_real NUMERIC,
  pendiente NUMERIC,
  diferencia NUMERIC,
  porcentaje_cumplimiento NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Ingresos'::TEXT AS concepto,
    COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS estimado,
    (SELECT COALESCE(SUM(i.total), 0)
     FROM evt_ingresos i
     WHERE i.evento_id = p_evento_id
       AND i.cobrado = true
       AND i.deleted_at IS NULL) AS monto_real,
    (SELECT COALESCE(SUM(i.total), 0)
     FROM evt_ingresos i
     WHERE i.evento_id = p_evento_id
       AND i.cobrado = false
       AND i.deleted_at IS NULL) AS pendiente,
    (SELECT COALESCE(SUM(i.total), 0)
     FROM evt_ingresos i
     WHERE i.evento_id = p_evento_id
       AND i.cobrado = true
       AND i.deleted_at IS NULL) -
    COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS diferencia,
    CASE
      WHEN COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) > 0
      THEN ((SELECT COALESCE(SUM(i.total), 0)
             FROM evt_ingresos i
             WHERE i.evento_id = p_evento_id
               AND i.cobrado = true
               AND i.deleted_at IS NULL) /
            COALESCE(e.ingreso_estimado, e.ganancia_estimada, 1)) * 100
      ELSE 0
    END AS porcentaje_cumplimiento
  FROM evt_eventos e
  WHERE e.id = p_evento_id

  UNION ALL

  SELECT
    'Gastos'::TEXT AS concepto,
    COALESCE(e.provisiones, 0) AS estimado,
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = p_evento_id
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS monto_real,
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = p_evento_id
       AND g.pagado = false
       AND g.deleted_at IS NULL) AS pendiente,
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = p_evento_id
       AND g.pagado = true
       AND g.deleted_at IS NULL) -
    COALESCE(e.provisiones, 0) AS diferencia,
    CASE
      WHEN COALESCE(e.provisiones, 0) > 0
      THEN ((SELECT COALESCE(SUM(g.total), 0)
             FROM evt_gastos g
             WHERE g.evento_id = p_evento_id
               AND g.pagado = true
               AND g.deleted_at IS NULL) /
            COALESCE(e.provisiones, 1)) * 100
      ELSE 0
    END AS porcentaje_cumplimiento
  FROM evt_eventos e
  WHERE e.id = p_evento_id

  UNION ALL

  SELECT
    'Utilidad'::TEXT AS concepto,
    COALESCE(e.utilidad_estimada, 0) AS estimado,
    (SELECT COALESCE(SUM(i.total), 0)
     FROM evt_ingresos i
     WHERE i.evento_id = p_evento_id
       AND i.cobrado = true
       AND i.deleted_at IS NULL) -
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = p_evento_id
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS monto_real,
    0 AS pendiente, -- La utilidad pendiente se calcula de otra forma
    ((SELECT COALESCE(SUM(i.total), 0)
      FROM evt_ingresos i
      WHERE i.evento_id = p_evento_id
        AND i.cobrado = true
        AND i.deleted_at IS NULL) -
     (SELECT COALESCE(SUM(g.total), 0)
      FROM evt_gastos g
      WHERE g.evento_id = p_evento_id
        AND g.pagado = true
        AND g.deleted_at IS NULL)) -
    COALESCE(e.utilidad_estimada, 0) AS diferencia,
    CASE
      WHEN COALESCE(e.utilidad_estimada, 0) > 0
      THEN (((SELECT COALESCE(SUM(i.total), 0)
              FROM evt_ingresos i
              WHERE i.evento_id = p_evento_id
                AND i.cobrado = true
                AND i.deleted_at IS NULL) -
             (SELECT COALESCE(SUM(g.total), 0)
              FROM evt_gastos g
              WHERE g.evento_id = p_evento_id
                AND g.pagado = true
                AND g.deleted_at IS NULL)) /
            COALESCE(e.utilidad_estimada, 1)) * 100
      ELSE 0
    END AS porcentaje_cumplimiento
  FROM evt_eventos e
  WHERE e.id = p_evento_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_evento_financial_summary(INTEGER) IS
'Función helper para obtener resumen financiero rápido de un evento.
Retorna tabla comparativa de Ingresos, Gastos y Utilidad (estimado vs monto_real vs pendiente).';

-- =====================================================
-- PASO 5: VERIFICACIÓN Y VALIDACIÓN
-- =====================================================

DO $$
DECLARE
  v_total_eventos INTEGER;
  v_eventos_con_ingresos_pendientes INTEGER;
  v_monto_total_pendiente NUMERIC;
BEGIN
  -- Contar eventos totales
  SELECT COUNT(*) INTO v_total_eventos
  FROM evt_eventos
  WHERE activo = true;

  -- Contar eventos con ingresos pendientes
  SELECT COUNT(DISTINCT e.id) INTO v_eventos_con_ingresos_pendientes
  FROM evt_eventos e
  WHERE e.activo = true
    AND EXISTS (
      SELECT 1 FROM evt_ingresos i
      WHERE i.evento_id = e.id
        AND i.cobrado = false
        AND i.deleted_at IS NULL
    );

  -- Calcular monto total pendiente de cobro
  SELECT COALESCE(SUM(i.total), 0) INTO v_monto_total_pendiente
  FROM evt_ingresos i
  WHERE i.cobrado = false
    AND i.deleted_at IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'MIGRACIÓN 009 COMPLETADA: Análisis de Ingresos Pendientes';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ESTADÍSTICAS:';
  RAISE NOTICE '   Total de eventos activos: %', v_total_eventos;
  RAISE NOTICE '   Eventos con ingresos pendientes: % (%.1f%%)',
    v_eventos_con_ingresos_pendientes,
    CASE WHEN v_total_eventos > 0
         THEN (v_eventos_con_ingresos_pendientes::NUMERIC / v_total_eventos * 100)
         ELSE 0
    END;
  RAISE NOTICE '   Monto total pendiente de cobro: $%',
    TO_CHAR(v_monto_total_pendiente, 'FM999,999,999.00');
  RAISE NOTICE '';
  RAISE NOTICE '✅ OBJETOS CREADOS:';
  RAISE NOTICE '   ✓ Vista vw_eventos_analisis_financiero (mejorada)';
  RAISE NOTICE '   ✓ Vista vw_eventos_problemas_cobro (nueva)';
  RAISE NOTICE '   ✓ Función get_evento_financial_summary (nueva)';
  RAISE NOTICE '   ✓ 2 índices adicionales';
  RAISE NOTICE '';
  RAISE NOTICE '📈 NUEVOS CAMPOS EN vw_eventos_analisis_financiero:';
  RAISE NOTICE '   • ingresos_cobrados, ingresos_pendientes, ingresos_totales';
  RAISE NOTICE '   • diferencia_ingresos_absoluta, variacion_ingresos_porcentaje';
  RAISE NOTICE '   • porcentaje_cobro, status_cobro';
  RAISE NOTICE '   • status_financiero_integral, dias_desde_evento';
  RAISE NOTICE '   • utilidad_proyectada, margen_utilidad_real';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- 1. Ver análisis completo de todos los eventos
SELECT * FROM vw_eventos_analisis_financiero
ORDER BY dias_desde_evento DESC;

-- 2. Ver solo eventos con problemas de cobro
SELECT * FROM vw_eventos_problemas_cobro;

-- 3. Eventos críticos (cobro < 50% y pasó más de 60 días)
SELECT
  clave_evento,
  nombre_proyecto,
  cliente_nombre,
  status_cobro,
  porcentaje_cobro,
  ingresos_pendientes,
  dias_desde_evento,
  status_financiero_integral
FROM vw_eventos_analisis_financiero
WHERE status_cobro IN ('cobro_parcial', 'cobro_critico')
  AND dias_desde_evento > 60
ORDER BY ingresos_pendientes DESC;

-- 4. Top 10 eventos con mayor monto pendiente de cobro
SELECT
  clave_evento,
  nombre_proyecto,
  cliente_nombre,
  ingresos_pendientes,
  porcentaje_cobrado,
  dias_desde_evento,
  categoria_urgencia
FROM vw_eventos_problemas_cobro
ORDER BY ingresos_pendientes DESC
LIMIT 10;

-- 5. Resumen financiero de un evento específico
SELECT * FROM get_evento_financial_summary(123);

-- 6. Eventos saludables vs críticos (resumen)
SELECT
  status_financiero_integral,
  COUNT(*) AS cantidad_eventos,
  SUM(ingresos_pendientes) AS total_pendiente_cobro,
  AVG(porcentaje_cobro) AS promedio_cobro
FROM vw_eventos_analisis_financiero
GROUP BY status_financiero_integral
ORDER BY
  CASE status_financiero_integral
    WHEN 'critico' THEN 1
    WHEN 'atencion' THEN 2
    WHEN 'saludable' THEN 3
  END;

-- 7. Análisis de cobro por cliente
SELECT
  c.razon_social AS cliente,
  COUNT(e.id) AS eventos_totales,
  COUNT(CASE WHEN e.status_cobro = 'cobrado_completo' THEN 1 END) AS eventos_cobrados,
  SUM(e.ingresos_pendientes) AS total_pendiente,
  AVG(e.porcentaje_cobro) AS promedio_cobro
FROM vw_eventos_analisis_financiero e
JOIN evt_clientes c ON e.cliente_id = c.id
GROUP BY c.id, c.razon_social
HAVING SUM(e.ingresos_pendientes) > 0
ORDER BY total_pendiente DESC;
*/
