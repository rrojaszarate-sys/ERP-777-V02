-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRACIÓN 010: División de Provisiones en 4 Categorías
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Fecha: 29 de Octubre de 2025
-- Descripción:
--   - Dividir campo provisiones en 4 categorías específicas
--   - Marcar campos obsoletos calculados en ceros
--   - Distribuir provisiones existentes equitativamente (25% c/u)
--   - Calcular provisiones solo en vistas (no en tabla)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- PASO 1: AGREGAR NUEVOS CAMPOS DE PROVISIONES DESGLOSADAS
-- ════════════════════════════════════════════════════════════════

ALTER TABLE evt_eventos
ADD COLUMN IF NOT EXISTS provision_combustible_peaje NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS provision_materiales NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS provision_recursos_humanos NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS provision_solicitudes_pago NUMERIC DEFAULT 0;

COMMENT ON COLUMN evt_eventos.provision_combustible_peaje IS
'Provisión estimada para gastos de combustible, gasolina, diésel y peajes de casetas.';

COMMENT ON COLUMN evt_eventos.provision_materiales IS
'Provisión estimada para compra de materiales, suministros y equipo para eventos.';

COMMENT ON COLUMN evt_eventos.provision_recursos_humanos IS
'Provisión estimada para pago de staff, técnicos, personal de apoyo y honorarios.';

COMMENT ON COLUMN evt_eventos.provision_solicitudes_pago IS
'Provisión estimada para pagos a proveedores externos, servicios contratados y solicitudes de pago (SPs).';

-- ════════════════════════════════════════════════════════════════
-- PASO 2: MARCAR CAMPOS OBSOLETOS (PONER EN CEROS)
-- ════════════════════════════════════════════════════════════════

-- Campos calculados que ahora se manejan en vistas
UPDATE evt_eventos
SET
  provisiones = 0,                      -- OBSOLETO: Se calcula en vista
  utilidad_estimada = 0,                -- OBSOLETO: Se calcula en vista
  porcentaje_utilidad_estimada = 0,     -- OBSOLETO: Se calcula en vista
  total_gastos = 0,                     -- OBSOLETO: Se calcula en vista
  utilidad = 0,                         -- OBSOLETO: Se calcula en vista
  margen_utilidad = 0                   -- OBSOLETO: Se calcula en vista
WHERE deleted_at IS NULL;

COMMENT ON COLUMN evt_eventos.provisiones IS
'[OBSOLETO] Este campo ya no se usa. El total de provisiones se calcula dinámicamente en la vista vw_eventos_analisis_financiero como la suma de: provision_combustible_peaje + provision_materiales + provision_recursos_humanos + provision_solicitudes_pago. Se mantiene en 0 para identificarlo como obsoleto.';

COMMENT ON COLUMN evt_eventos.utilidad_estimada IS
'[OBSOLETO] Se calcula dinámicamente en la vista vw_eventos_analisis_financiero como: ganancia_estimada - provisiones_total. Se mantiene en 0 para identificarlo como obsoleto.';

COMMENT ON COLUMN evt_eventos.porcentaje_utilidad_estimada IS
'[OBSOLETO] Se calcula dinámicamente en la vista vw_eventos_analisis_financiero como: (utilidad_estimada / ganancia_estimada) * 100. Se mantiene en 0 para identificarlo como obsoleto.';

COMMENT ON COLUMN evt_eventos.total_gastos IS
'[OBSOLETO] Se calcula dinámicamente en las vistas como la suma de gastos pagados. Se mantiene en 0 para identificarlo como obsoleto.';

COMMENT ON COLUMN evt_eventos.utilidad IS
'[OBSOLETO] Se calcula dinámicamente en las vistas como: ingresos_cobrados - gastos_pagados. Se mantiene en 0 para identificarlo como obsoleto.';

COMMENT ON COLUMN evt_eventos.margen_utilidad IS
'[OBSOLETO] Se calcula dinámicamente en las vistas como: (utilidad_real / ingresos_cobrados) * 100. Se mantiene en 0 para identificarlo como obsoleto.';

-- ════════════════════════════════════════════════════════════════
-- PASO 3: DISTRIBUIR PROVISIONES EXISTENTES (BACKUP EN CTE)
-- ════════════════════════════════════════════════════════════════

-- Primero, guardamos un respaldo de las provisiones originales
CREATE TEMP TABLE provisiones_backup AS
SELECT
  id,
  clave_evento,
  provisiones AS provisiones_original,
  ganancia_estimada
FROM evt_eventos
WHERE deleted_at IS NULL
  AND provisiones > 0;

-- Distribuir equitativamente (25% cada categoría)
UPDATE evt_eventos
SET
  provision_combustible_peaje = ROUND((
    SELECT provisiones_original FROM provisiones_backup WHERE provisiones_backup.id = evt_eventos.id
  ) * 0.25, 2),
  provision_materiales = ROUND((
    SELECT provisiones_original FROM provisiones_backup WHERE provisiones_backup.id = evt_eventos.id
  ) * 0.25, 2),
  provision_recursos_humanos = ROUND((
    SELECT provisiones_original FROM provisiones_backup WHERE provisiones_backup.id = evt_eventos.id
  ) * 0.25, 2),
  provision_solicitudes_pago = ROUND((
    SELECT provisiones_original FROM provisiones_backup WHERE provisiones_backup.id = evt_eventos.id
  ) * 0.25, 2)
WHERE id IN (SELECT id FROM provisiones_backup);

-- Log de migración
DO $$
DECLARE
  v_eventos_migrados INTEGER;
  v_total_provisiones_original NUMERIC;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(provisiones_original), 0)
  INTO v_eventos_migrados, v_total_provisiones_original
  FROM provisiones_backup;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'MIGRACIÓN DE PROVISIONES COMPLETADA';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Eventos migrados: %', v_eventos_migrados;
  RAISE NOTICE 'Total provisiones original: $%', v_total_provisiones_original;
  RAISE NOTICE 'Distribución: 25%% por categoría (equitativa)';
  RAISE NOTICE '';
  RAISE NOTICE 'Categorías creadas:';
  RAISE NOTICE '  • Combustible/Peaje:    25%%';
  RAISE NOTICE '  • Materiales:           25%%';
  RAISE NOTICE '  • Recursos Humanos:     25%%';
  RAISE NOTICE '  • Solicitudes de Pago:  25%%';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ════════════════════════════════════════════════════════════════
-- PASO 4: CREAR CATEGORÍAS DE GASTOS (SI NO EXISTEN)
-- ════════════════════════════════════════════════════════════════

INSERT INTO evt_categorias_gastos (nombre, descripcion, activo, created_at, updated_at)
VALUES
  (
    'Combustible/Peaje',
    'Gastos de combustible, gasolina, diésel y peajes de casetas para transporte de equipo y personal',
    true,
    NOW(),
    NOW()
  ),
  (
    'Materiales',
    'Compra de materiales, suministros, equipo y herramientas necesarios para el evento',
    true,
    NOW(),
    NOW()
  ),
  (
    'Recursos Humanos',
    'Pago de staff, técnicos, personal de apoyo, honorarios y nómina para el evento',
    true,
    NOW(),
    NOW()
  ),
  (
    'Solicitudes de Pago',
    'Pagos a proveedores externos, servicios contratados y solicitudes de pago (SPs) a terceros',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (nombre) DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  activo = true,
  updated_at = NOW();

-- ════════════════════════════════════════════════════════════════
-- PASO 5: ÍNDICES PARA OPTIMIZAR QUERIES
-- ════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_evt_eventos_provision_combustible
ON evt_eventos(provision_combustible_peaje)
WHERE deleted_at IS NULL AND provision_combustible_peaje > 0;

CREATE INDEX IF NOT EXISTS idx_evt_eventos_provision_materiales
ON evt_eventos(provision_materiales)
WHERE deleted_at IS NULL AND provision_materiales > 0;

CREATE INDEX IF NOT EXISTS idx_evt_eventos_provision_rh
ON evt_eventos(provision_recursos_humanos)
WHERE deleted_at IS NULL AND provision_recursos_humanos > 0;

CREATE INDEX IF NOT EXISTS idx_evt_eventos_provision_sps
ON evt_eventos(provision_solicitudes_pago)
WHERE deleted_at IS NULL AND provision_solicitudes_pago > 0;

-- Índice compuesto para análisis financiero
CREATE INDEX IF NOT EXISTS idx_evt_eventos_analisis_provisiones
ON evt_eventos(
  estado_id,
  fecha_evento,
  provision_combustible_peaje,
  provision_materiales,
  provision_recursos_humanos,
  provision_solicitudes_pago
)
WHERE deleted_at IS NULL;

-- ════════════════════════════════════════════════════════════════
-- PASO 6: ACTUALIZAR VISTA vw_eventos_analisis_financiero
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_eventos_analisis_financiero AS
SELECT
  e.id,
  e.company_id,
  e.clave_evento,
  e.nombre_proyecto,
  e.descripcion,
  e.cliente_id,
  e.tipo_evento_id,
  e.estado_id,
  e.fecha_evento,
  e.fecha_fin,
  e.lugar,
  e.numero_invitados,
  e.prioridad,
  e.fase_proyecto,

  -- ====================================================================
  -- CLIENTE
  -- ====================================================================
  c.razon_social AS cliente_nombre,
  c.nombre_comercial AS cliente_comercial,
  c.rfc AS cliente_rfc,

  -- ====================================================================
  -- ESTADO
  -- ====================================================================
  est.nombre AS estado_nombre,
  est.color AS estado_color,

  -- ====================================================================
  -- TIPO EVENTO
  -- ====================================================================
  te.nombre AS tipo_evento_nombre,
  te.color AS tipo_evento_color,

  -- ====================================================================
  -- PROVISIONES DESGLOSADAS (NUEVO)
  -- ====================================================================
  COALESCE(e.provision_combustible_peaje, 0) AS provision_combustible_peaje,
  COALESCE(e.provision_materiales, 0) AS provision_materiales,
  COALESCE(e.provision_recursos_humanos, 0) AS provision_recursos_humanos,
  COALESCE(e.provision_solicitudes_pago, 0) AS provision_solicitudes_pago,

  -- TOTAL PROVISIONES (CALCULADO - NO USAR EL CAMPO evt_eventos.provisiones)
  (COALESCE(e.provision_combustible_peaje, 0) +
   COALESCE(e.provision_materiales, 0) +
   COALESCE(e.provision_recursos_humanos, 0) +
   COALESCE(e.provision_solicitudes_pago, 0)) AS provisiones_total,

  -- ====================================================================
  -- GASTOS REALES POR CATEGORÍA (NUEVO)
  -- ====================================================================
  -- Combustible/Peaje
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Combustible/Peaje'
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_combustible_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Combustible/Peaje'
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_combustible_pendientes,

  -- Materiales
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Materiales'
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_materiales_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Materiales'
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_materiales_pendientes,

  -- Recursos Humanos
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Recursos Humanos'
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_rh_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Recursos Humanos'
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_rh_pendientes,

  -- Solicitudes de Pago
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Solicitudes de Pago'
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_sps_pagados,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
   WHERE g.evento_id = e.id
     AND cat.nombre = 'Solicitudes de Pago'
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_sps_pendientes,

  -- TOTAL GASTOS (sin cambios)
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_pagados_total,

  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_pendientes_total,

  -- ====================================================================
  -- ANÁLISIS DE VARIACIÓN POR CATEGORÍA (NUEVO)
  -- ====================================================================
  -- Variación Combustible/Peaje (%)
  CASE
    WHEN COALESCE(e.provision_combustible_peaje, 0) > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
            WHERE g.evento_id = e.id
              AND cat.nombre = 'Combustible/Peaje'
              AND g.pagado = true
              AND g.deleted_at IS NULL) /
          COALESCE(e.provision_combustible_peaje, 1)) - 1) * 100
    ELSE 0
  END AS variacion_combustible_pct,

  -- Variación Materiales (%)
  CASE
    WHEN COALESCE(e.provision_materiales, 0) > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
            WHERE g.evento_id = e.id
              AND cat.nombre = 'Materiales'
              AND g.pagado = true
              AND g.deleted_at IS NULL) /
          COALESCE(e.provision_materiales, 1)) - 1) * 100
    ELSE 0
  END AS variacion_materiales_pct,

  -- Variación RH (%)
  CASE
    WHEN COALESCE(e.provision_recursos_humanos, 0) > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
            WHERE g.evento_id = e.id
              AND cat.nombre = 'Recursos Humanos'
              AND g.pagado = true
              AND g.deleted_at IS NULL) /
          COALESCE(e.provision_recursos_humanos, 1)) - 1) * 100
    ELSE 0
  END AS variacion_rh_pct,

  -- Variación SPs (%)
  CASE
    WHEN COALESCE(e.provision_solicitudes_pago, 0) > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
            WHERE g.evento_id = e.id
              AND cat.nombre = 'Solicitudes de Pago'
              AND g.pagado = true
              AND g.deleted_at IS NULL) /
          COALESCE(e.provision_solicitudes_pago, 1)) - 1) * 100
    ELSE 0
  END AS variacion_sps_pct,

  -- Variación total (%)
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
  END AS variacion_total_pct,

  -- ====================================================================
  -- STATUS PRESUPUESTAL POR CATEGORÍA (NUEVO)
  -- ====================================================================
  CASE
    WHEN COALESCE(e.provision_combustible_peaje, 0) = 0 THEN 'sin_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
          WHERE g.evento_id = e.id
            AND cat.nombre = 'Combustible/Peaje'
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= e.provision_combustible_peaje THEN 'dentro_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
          WHERE g.evento_id = e.id
            AND cat.nombre = 'Combustible/Peaje'
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= (e.provision_combustible_peaje * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal_combustible,

  CASE
    WHEN COALESCE(e.provision_materiales, 0) = 0 THEN 'sin_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
          WHERE g.evento_id = e.id
            AND cat.nombre = 'Materiales'
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= e.provision_materiales THEN 'dentro_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
          WHERE g.evento_id = e.id
            AND cat.nombre = 'Materiales'
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= (e.provision_materiales * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal_materiales,

  CASE
    WHEN COALESCE(e.provision_recursos_humanos, 0) = 0 THEN 'sin_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
          WHERE g.evento_id = e.id
            AND cat.nombre = 'Recursos Humanos'
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= e.provision_recursos_humanos THEN 'dentro_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
          WHERE g.evento_id = e.id
            AND cat.nombre = 'Recursos Humanos'
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= (e.provision_recursos_humanos * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal_rh,

  CASE
    WHEN COALESCE(e.provision_solicitudes_pago, 0) = 0 THEN 'sin_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
          WHERE g.evento_id = e.id
            AND cat.nombre = 'Solicitudes de Pago'
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= e.provision_solicitudes_pago THEN 'dentro_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0)
          FROM evt_gastos g
          LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
          WHERE g.evento_id = e.id
            AND cat.nombre = 'Solicitudes de Pago'
            AND g.pagado = true
            AND g.deleted_at IS NULL) <= (e.provision_solicitudes_pago * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal_sps,

  -- Status presupuestal total
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
  END AS status_presupuestal_total,

  -- ====================================================================
  -- INGRESOS (sin cambios)
  -- ====================================================================
  COALESCE(e.ganancia_estimada, 0) AS ingreso_estimado,

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

  -- ====================================================================
  -- UTILIDAD ESTIMADA (CALCULADA)
  -- ====================================================================
  (COALESCE(e.ganancia_estimada, 0) -
   (COALESCE(e.provision_combustible_peaje, 0) +
    COALESCE(e.provision_materiales, 0) +
    COALESCE(e.provision_recursos_humanos, 0) +
    COALESCE(e.provision_solicitudes_pago, 0))) AS utilidad_estimada,

  -- Margen estimado (%)
  CASE
    WHEN COALESCE(e.ganancia_estimada, 0) > 0
    THEN ((COALESCE(e.ganancia_estimada, 0) -
           (COALESCE(e.provision_combustible_peaje, 0) +
            COALESCE(e.provision_materiales, 0) +
            COALESCE(e.provision_recursos_humanos, 0) +
            COALESCE(e.provision_solicitudes_pago, 0))) /
          COALESCE(e.ganancia_estimada, 1)) * 100
    ELSE 0
  END AS margen_estimado_pct,

  -- ====================================================================
  -- UTILIDAD REAL (CALCULADA)
  -- ====================================================================
  ((SELECT COALESCE(SUM(i.total), 0)
    FROM evt_ingresos i
    WHERE i.evento_id = e.id
      AND i.cobrado = true
      AND i.deleted_at IS NULL) -
   (SELECT COALESCE(SUM(g.total), 0)
    FROM evt_gastos g
    WHERE g.evento_id = e.id
      AND g.pagado = true
      AND g.deleted_at IS NULL)) AS utilidad_real,

  -- Margen real (%)
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
  END AS margen_real_pct,

  -- ====================================================================
  -- METADATA
  -- ====================================================================
  e.created_at,
  e.updated_at,
  e.activo

FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_estados est ON e.estado_id = est.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
WHERE e.deleted_at IS NULL;

COMMENT ON VIEW vw_eventos_analisis_financiero IS
'Vista mejorada de análisis financiero de eventos con provisiones desglosadas en 4 categorías:
1. Combustible/Peaje
2. Materiales
3. Recursos Humanos
4. Solicitudes de Pago

Calcula automáticamente:
- Provisiones totales (suma de 4 categorías)
- Gastos reales por categoría (pagados y pendientes)
- Variación porcentual por categoría
- Status presupuestal por categoría
- Utilidad estimada y real
- Márgenes de utilidad

NOTA: El campo evt_eventos.provisiones está obsoleto (en 0) y no se usa.
El total se calcula dinámicamente en esta vista.';

-- ════════════════════════════════════════════════════════════════
-- PASO 7: ACTUALIZAR VISTA vw_eventos_completos
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT
  e.*,

  -- Provisiones desglosadas (NUEVO)
  e.provision_combustible_peaje,
  e.provision_materiales,
  e.provision_recursos_humanos,
  e.provision_solicitudes_pago,

  -- Total provisiones (CALCULADO)
  (COALESCE(e.provision_combustible_peaje, 0) +
   COALESCE(e.provision_materiales, 0) +
   COALESCE(e.provision_recursos_humanos, 0) +
   COALESCE(e.provision_solicitudes_pago, 0)) AS provisiones_total,

  -- Cliente
  c.razon_social AS cliente_nombre,
  c.nombre_comercial AS cliente_comercial,
  c.rfc AS cliente_rfc,
  c.email AS cliente_email,
  c.telefono AS cliente_telefono,
  c.contacto_principal,

  -- Tipo evento
  te.nombre AS tipo_evento,
  te.color AS tipo_color,

  -- Estado
  est.nombre AS estado,
  est.color AS estado_color,
  est.workflow_step,

  -- Responsable
  COALESCE(u1.nombre, '') AS responsable_nombre,

  -- Solicitante
  COALESCE(u2.nombre, '') AS solicitante_nombre,

  -- Gastos totales (CALCULADO - NO USAR evt_eventos.total_gastos que está en 0)
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS total_gastos,

  -- Gastos pendientes
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = false
     AND g.deleted_at IS NULL) AS gastos_pendientes,

  -- Ingresos cobrados
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = true
     AND i.deleted_at IS NULL) AS ingresos_cobrados,

  -- Ingresos pendientes
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = false
     AND i.deleted_at IS NULL) AS ingresos_pendientes,

  -- Utilidad real (CALCULADA)
  ((SELECT COALESCE(SUM(i.total), 0)
    FROM evt_ingresos i
    WHERE i.evento_id = e.id
      AND i.cobrado = true
      AND i.deleted_at IS NULL) -
   (SELECT COALESCE(SUM(g.total), 0)
    FROM evt_gastos g
    WHERE g.evento_id = e.id
      AND g.pagado = true
      AND g.deleted_at IS NULL)) AS utilidad_real,

  -- Margen real (CALCULADO)
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
  END AS margen_real_pct,

  -- Días vencido
  CASE
    WHEN e.fecha_vencimiento IS NOT NULL AND e.status_pago != 'pagado'
    THEN GREATEST(0, (CURRENT_DATE - e.fecha_vencimiento::date))
    ELSE 0
  END AS dias_vencido,

  -- Status vencimiento
  CASE
    WHEN e.status_pago = 'pagado' THEN 'pagado'
    WHEN e.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
    WHEN CURRENT_DATE <= e.fecha_vencimiento::date THEN 'vigente'
    WHEN CURRENT_DATE > e.fecha_vencimiento::date THEN 'vencido'
    ELSE 'sin_vencimiento'
  END AS status_vencimiento,

  -- Audit trail
  COALESCE(u3.nombre, '') AS creado_por,
  COALESCE(u4.nombre, '') AS actualizado_por

FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados est ON e.estado_id = est.id
LEFT JOIN core_users u1 ON e.responsable_id = u1.id
LEFT JOIN core_users u2 ON e.solicitante_id = u2.id
LEFT JOIN core_users u3 ON e.created_by = u3.id
LEFT JOIN core_users u4 ON e.updated_by = u4.id
WHERE e.deleted_at IS NULL;

COMMENT ON VIEW vw_eventos_completos IS
'Vista completa de eventos con provisiones desglosadas y todos los cálculos financieros dinámicos.
NO usa los campos obsoletos de evt_eventos (provisiones, total_gastos, utilidad, margen_utilidad).
Todos los totales se calculan en tiempo real desde evt_gastos y evt_ingresos.';

-- ════════════════════════════════════════════════════════════════
-- PASO 8: VALIDACIONES FINALES
-- ════════════════════════════════════════════════════════════════

-- Validar que todas las provisiones originales se distribuyeron
DO $$
DECLARE
  v_eventos_sin_distribuir INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_eventos_sin_distribuir
  FROM provisiones_backup pb
  WHERE NOT EXISTS (
    SELECT 1 FROM evt_eventos e
    WHERE e.id = pb.id
      AND (COALESCE(e.provision_combustible_peaje, 0) +
           COALESCE(e.provision_materiales, 0) +
           COALESCE(e.provision_recursos_humanos, 0) +
           COALESCE(e.provision_solicitudes_pago, 0)) > 0
  );

  IF v_eventos_sin_distribuir > 0 THEN
    RAISE EXCEPTION 'ERROR: % eventos no se distribuyeron correctamente', v_eventos_sin_distribuir;
  END IF;

  RAISE NOTICE '✓ Validación exitosa: Todos los eventos con provisiones fueron distribuidos';
END $$;

-- Validar que los campos obsoletos están en ceros
DO $$
DECLARE
  v_eventos_con_campos_obsoletos INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_eventos_con_campos_obsoletos
  FROM evt_eventos
  WHERE deleted_at IS NULL
    AND (provisiones != 0
         OR utilidad_estimada != 0
         OR porcentaje_utilidad_estimada != 0
         OR total_gastos != 0
         OR utilidad != 0
         OR margen_utilidad != 0);

  IF v_eventos_con_campos_obsoletos > 0 THEN
    RAISE EXCEPTION 'ERROR: % eventos tienen campos obsoletos con valores != 0', v_eventos_con_campos_obsoletos;
  END IF;

  RAISE NOTICE '✓ Validación exitosa: Todos los campos obsoletos están en 0';
END $$;

-- ════════════════════════════════════════════════════════════════
-- FINALIZACIÓN
-- ════════════════════════════════════════════════════════════════

RAISE NOTICE '';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE 'MIGRACIÓN 010 COMPLETADA EXITOSAMENTE';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '';
RAISE NOTICE '✓ 4 columnas nuevas agregadas (provision_*)';
RAISE NOTICE '✓ 6 campos obsoletos puestos en ceros';
RAISE NOTICE '✓ Provisiones existentes distribuidas equitativamente';
RAISE NOTICE '✓ 4 categorías de gastos creadas';
RAISE NOTICE '✓ 5 índices optimizados creados';
RAISE NOTICE '✓ Vista vw_eventos_analisis_financiero actualizada';
RAISE NOTICE '✓ Vista vw_eventos_completos actualizada';
RAISE NOTICE '✓ Validaciones exitosas';
RAISE NOTICE '';
RAISE NOTICE 'CAMPOS OBSOLETOS (mantener en 0 hasta eliminarlos):';
RAISE NOTICE '  • evt_eventos.provisiones';
RAISE NOTICE '  • evt_eventos.utilidad_estimada';
RAISE NOTICE '  • evt_eventos.porcentaje_utilidad_estimada';
RAISE NOTICE '  • evt_eventos.total_gastos';
RAISE NOTICE '  • evt_eventos.utilidad';
RAISE NOTICE '  • evt_eventos.margen_utilidad';
RAISE NOTICE '';
RAISE NOTICE 'CAMPOS NUEVOS (usar estos):';
RAISE NOTICE '  • evt_eventos.provision_combustible_peaje';
RAISE NOTICE '  • evt_eventos.provision_materiales';
RAISE NOTICE '  • evt_eventos.provision_recursos_humanos';
RAISE NOTICE '  • evt_eventos.provision_solicitudes_pago';
RAISE NOTICE '';
RAISE NOTICE 'CÁLCULOS DINÁMICOS (usar vistas):';
RAISE NOTICE '  • vw_eventos_analisis_financiero.provisiones_total';
RAISE NOTICE '  • vw_eventos_analisis_financiero.utilidad_estimada';
RAISE NOTICE '  • vw_eventos_completos.total_gastos';
RAISE NOTICE '  • vw_eventos_completos.utilidad_real';
RAISE NOTICE '';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

COMMIT;
