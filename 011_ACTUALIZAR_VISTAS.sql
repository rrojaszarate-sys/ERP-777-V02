-- ============================================================================
-- EJECUTAR ESTE SQL EN EL DASHBOARD DE SUPABASE
-- ============================================================================
-- Ir a: https://supabase.com/dashboard/project/gomnouwackzvthpwyric/editor
-- Abrir SQL Editor y pegar este código completo
-- ============================================================================
-- ACTUALIZACIÓN DE VISTAS: División de Provisiones en 4 Categorías
-- ============================================================================
-- BASADO EN: migrations/009_enhance_financial_view_with_income_analysis.sql
-- MODIFICADO PARA: Agregar provisiones desglosadas por categoría
-- ============================================================================

BEGIN;

-- ============================================================================
-- VISTA: vw_eventos_analisis_financiero
-- ============================================================================
-- Recrea la vista con las nuevas columnas de provisiones desglosadas

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
  -- PROVISIONES DESGLOSADAS (NUEVO)
  -- ========================================
  COALESCE(e.provision_combustible_peaje, 0) AS provision_combustible_peaje,
  COALESCE(e.provision_materiales, 0) AS provision_materiales,
  COALESCE(e.provision_recursos_humanos, 0) AS provision_recursos_humanos,
  COALESCE(e.provision_solicitudes_pago, 0) AS provision_solicitudes_pago,

  -- Total de provisiones (calculado dinámicamente)
  (COALESCE(e.provision_combustible_peaje, 0) +
   COALESCE(e.provision_materiales, 0) +
   COALESCE(e.provision_recursos_humanos, 0) +
   COALESCE(e.provision_solicitudes_pago, 0)) AS provisiones,

  -- ========================================
  -- PROYECCIÓN FINANCIERA (Estimado)
  -- ========================================
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,

  -- Utilidad estimada (calculada dinámicamente)
  (COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) -
   (COALESCE(e.provision_combustible_peaje, 0) +
    COALESCE(e.provision_materiales, 0) +
    COALESCE(e.provision_recursos_humanos, 0) +
    COALESCE(e.provision_solicitudes_pago, 0))) AS utilidad_estimada,

  -- Porcentaje de utilidad estimada (calculado dinámicamente)
  CASE
    WHEN COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) > 0
    THEN ((COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) -
           (COALESCE(e.provision_combustible_peaje, 0) +
            COALESCE(e.provision_materiales, 0) +
            COALESCE(e.provision_recursos_humanos, 0) +
            COALESCE(e.provision_solicitudes_pago, 0))) /
          COALESCE(e.ingreso_estimado, e.ganancia_estimada, 1)) * 100
    ELSE 0
  END AS porcentaje_utilidad_estimada,

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
  (COALESCE(e.provision_combustible_peaje, 0) +
   COALESCE(e.provision_materiales, 0) +
   COALESCE(e.provision_recursos_humanos, 0) +
   COALESCE(e.provision_solicitudes_pago, 0)) AS diferencia_gastos_absoluta,

  -- Variación de gastos en porcentaje
  CASE
    WHEN (COALESCE(e.provision_combustible_peaje, 0) +
          COALESCE(e.provision_materiales, 0) +
          COALESCE(e.provision_recursos_humanos, 0) +
          COALESCE(e.provision_solicitudes_pago, 0)) > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            WHERE g.evento_id = e.id
              AND g.pagado = true
              AND g.deleted_at IS NULL) /
          (COALESCE(e.provision_combustible_peaje, 0) +
           COALESCE(e.provision_materiales, 0) +
           COALESCE(e.provision_recursos_humanos, 0) +
           COALESCE(e.provision_solicitudes_pago, 0))) - 1) * 100
    ELSE 0
  END AS variacion_gastos_porcentaje,

  -- Status de ejecución presupuestal
  CASE
    WHEN (COALESCE(e.provision_combustible_peaje, 0) +
          COALESCE(e.provision_materiales, 0) +
          COALESCE(e.provision_recursos_humanos, 0) +
          COALESCE(e.provision_solicitudes_pago, 0)) = 0 THEN 'sin_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          WHERE g.evento_id = e.id
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= (COALESCE(e.provision_combustible_peaje, 0) +
                                          COALESCE(e.provision_materiales, 0) +
                                          COALESCE(e.provision_recursos_humanos, 0) +
                                          COALESCE(e.provision_solicitudes_pago, 0)) THEN 'dentro_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          WHERE g.evento_id = e.id
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= ((COALESCE(e.provision_combustible_peaje, 0) +
                                           COALESCE(e.provision_materiales, 0) +
                                           COALESCE(e.provision_recursos_humanos, 0) +
                                           COALESCE(e.provision_solicitudes_pago, 0)) * 1.05) THEN 'advertencia'
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
  (COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) -
   (COALESCE(e.provision_combustible_peaje, 0) +
    COALESCE(e.provision_materiales, 0) +
    COALESCE(e.provision_recursos_humanos, 0) +
    COALESCE(e.provision_solicitudes_pago, 0))) AS diferencia_utilidad_absoluta,

  -- ========================================
  -- STATUS FINANCIERO INTEGRAL
  -- ========================================

  CASE
    -- Evento saludable: dentro de presupuesto Y buen cobro
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          WHERE g.evento_id = e.id
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= (COALESCE(e.provision_combustible_peaje, 0) +
                                          COALESCE(e.provision_materiales, 0) +
                                          COALESCE(e.provision_recursos_humanos, 0) +
                                          COALESCE(e.provision_solicitudes_pago, 0))
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
            AND g.deleted_at IS NULL) > ((COALESCE(e.provision_combustible_peaje, 0) +
                                          COALESCE(e.provision_materiales, 0) +
                                          COALESCE(e.provision_recursos_humanos, 0) +
                                          COALESCE(e.provision_solicitudes_pago, 0)) * 1.05)
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
    THEN (CURRENT_DATE - e.fecha_evento)
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
'Vista completa de análisis financiero de eventos con:
- Provisiones desglosadas en 4 categorías (combustible/peaje, materiales, RH, solicitudes de pago)
- Ingresos: cobrados, pendientes, variación vs estimado, status de cobro
- Gastos: pagados, pendientes, variación vs provisiones, status presupuestal
- Utilidad: real, proyectada, márgenes (calculados dinámicamente)
- Status financiero integral del evento
Los campos obsoletos (provisiones, utilidad_estimada, etc) se calculan dinámicamente.';

-- ============================================================================
-- VISTA 2: vw_eventos_completos
-- ============================================================================
-- Vista simplificada con totales calculados

DROP VIEW IF EXISTS vw_eventos_completos CASCADE;

CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT
  -- Todos los campos de evt_eventos
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.cliente_id,
  e.company_id,
  e.tipo_evento_id,
  e.estado_id,
  e.responsable_id,
  e.solicitante_id,
  e.fecha_evento,
  e.hora_inicio,
  e.hora_fin,
  e.fecha_fin,
  e.lugar,
  e.descripcion,
  e.numero_invitados,
  e.prioridad,
  e.fase_proyecto,
  e.notas,
  e.ingreso_estimado,
  e.ganancia_estimada,
  e.provision_combustible_peaje,
  e.provision_materiales,
  e.provision_recursos_humanos,
  e.provision_solicitudes_pago,
  e.provisiones, -- Campo obsoleto (en cero)
  e.utilidad_estimada, -- Campo obsoleto (en cero)
  e.porcentaje_utilidad_estimada, -- Campo obsoleto (en cero)
  e.total_gastos, -- Campo obsoleto (en cero)
  e.utilidad, -- Campo obsoleto (en cero)
  e.margen_utilidad, -- Campo obsoleto (en cero)
  e.subtotal,
  e.iva_porcentaje,
  e.iva,
  e.total,
  e.ingreso_real,
  e.fecha_facturacion,
  e.status_facturacion,
  e.fecha_pago,
  e.fecha_vencimiento,
  e.status_pago,
  e.documento_factura_url,
  e.documento_pago_url,
  e.activo,
  e.created_at,
  e.updated_at,
  e.created_by,
  e.updated_by,

  -- Campos calculados
  es.nombre AS estado_nombre,

  -- Provisiones total (calculado dinámicamente)
  (COALESCE(e.provision_combustible_peaje, 0) +
   COALESCE(e.provision_materiales, 0) +
   COALESCE(e.provision_recursos_humanos, 0) +
   COALESCE(e.provision_solicitudes_pago, 0)) AS provisiones_calculado,

  -- Gastos totales (calculado dinámicamente)
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.deleted_at IS NULL) AS total_gastos_calculado,

  -- Gastos pendientes
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_pendientes_calculado,

  -- Utilidad real (calculado)
  (COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) -
   (SELECT COALESCE(SUM(g.total), 0)
    FROM evt_gastos g
    WHERE g.evento_id = e.id
      AND g.deleted_at IS NULL)) AS utilidad_calculada,

  -- Margen real % (calculado)
  CASE
    WHEN COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) > 0
    THEN (((COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) -
            (SELECT COALESCE(SUM(g.total), 0)
             FROM evt_gastos g
             WHERE g.evento_id = e.id
               AND g.deleted_at IS NULL)) /
           COALESCE(e.ingreso_estimado, e.ganancia_estimada, 1)) * 100)
    ELSE 0
  END AS margen_calculado_pct

FROM evt_eventos e
LEFT JOIN evt_estados es ON e.estado_id = es.id
WHERE e.activo = true;

COMMENT ON VIEW vw_eventos_completos IS
'Vista simplificada de eventos con totales calculados dinámicamente.
Campos calculados tienen sufijo _calculado para distinguirlos de los obsoletos:
- provisiones_calculado: suma de las 4 categorías
- total_gastos_calculado: suma real de gastos
- utilidad_calculada: utilidad real calculada
Los campos obsoletos (provisiones, total_gastos, utilidad, etc.) deben estar en cero.';

COMMIT;

-- ============================================================================
-- CONFIRMACIÓN
-- ============================================================================
SELECT 'Vistas actualizadas exitosamente con provisiones desglosadas' AS mensaje;
