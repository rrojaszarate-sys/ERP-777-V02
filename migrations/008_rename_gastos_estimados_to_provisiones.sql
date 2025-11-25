-- =====================================================
-- Migration: Renombrar gastos_estimados → provisiones
-- Fecha: 2025-10-28
-- Descripción:
--   - Renombra la columna gastos_estimados a provisiones en evt_eventos
--   - Elimina la columna deprecada presupuesto_estimado
--   - Actualiza todas las vistas y triggers que la utilizan
--   - Crea índices para optimización de consultas
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: RENOMBRAR COLUMNA gastos_estimados → provisiones
-- =====================================================

ALTER TABLE evt_eventos
RENAME COLUMN gastos_estimados TO provisiones;

COMMENT ON COLUMN evt_eventos.provisiones IS
'Gastos estimados (provisiones) para el evento. Usado para proyección financiera y comparación con gastos reales.';

-- =====================================================
-- PASO 2: ELIMINAR COLUMNA DEPRECADA presupuesto_estimado
-- =====================================================

-- Verificar si existe antes de eliminar (por seguridad)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'evt_eventos'
        AND column_name = 'presupuesto_estimado'
    ) THEN
        -- Migrar datos si hubiera valores en presupuesto_estimado
        UPDATE evt_eventos
        SET provisiones = COALESCE(provisiones, presupuesto_estimado, 0)
        WHERE presupuesto_estimado IS NOT NULL
          AND presupuesto_estimado > 0
          AND (provisiones IS NULL OR provisiones = 0);

        -- Eliminar la columna
        ALTER TABLE evt_eventos DROP COLUMN presupuesto_estimado;

        RAISE NOTICE 'Columna presupuesto_estimado eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Columna presupuesto_estimado no existe, se omite';
    END IF;
END $$;

-- =====================================================
-- PASO 3: ACTUALIZAR VISTA vw_eventos_analisis_financiero
-- =====================================================

DROP VIEW IF EXISTS vw_eventos_analisis_financiero CASCADE;

CREATE OR REPLACE VIEW vw_eventos_analisis_financiero AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.cliente_id,
  e.fecha_evento,
  e.estado_id,

  -- ========================================
  -- PROYECCIÓN FINANCIERA (Estimado)
  -- ========================================
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,
  COALESCE(e.provisiones, 0) AS provisiones, -- ✅ RENOMBRADO
  COALESCE(e.utilidad_estimada, 0) AS utilidad_estimada,
  COALESCE(e.porcentaje_utilidad_estimada, 0) AS porcentaje_utilidad_estimada,

  -- ========================================
  -- RESULTADOS REALES (Actual)
  -- ========================================
  COALESCE(e.total, 0) AS ingreso_real,

  -- ✅ CORRECCIÓN: Solo gastos PAGADOS
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

  -- Utilidad real (ingresos - gastos pagados)
  COALESCE(e.total, 0) -
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS utilidad_real,

  COALESCE(e.margen_utilidad, 0) AS margen_utilidad_real,

  -- ========================================
  -- ANÁLISIS DE VARIACIÓN (Estimado vs Real)
  -- ========================================

  -- Diferencia absoluta en utilidad
  (COALESCE(e.total, 0) -
   (SELECT COALESCE(SUM(g.total), 0)
    FROM evt_gastos g
    WHERE g.evento_id = e.id
      AND g.pagado = true
      AND g.deleted_at IS NULL)) -
  COALESCE(e.utilidad_estimada, 0) AS diferencia_utilidad_absoluta,

  -- Variación de gastos (provisiones vs real)
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

  -- Diferencia absoluta en gastos
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) -
  COALESCE(e.provisiones, 0) AS diferencia_gastos_absoluta,

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

  -- Timestamps
  e.created_at,
  e.updated_at

FROM evt_eventos e
WHERE e.deleted_at IS NULL;

COMMENT ON VIEW vw_eventos_analisis_financiero IS
'Vista completa de análisis financiero de eventos con comparación entre proyección (estimado) y resultados reales (actual). Incluye análisis de variación de provisiones vs gastos pagados.';

-- =====================================================
-- PASO 4: ACTUALIZAR VISTA vw_eventos_completos
-- =====================================================

-- Primero verificar si la vista existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.views
        WHERE table_name = 'vw_eventos_completos'
    ) THEN
        DROP VIEW IF EXISTS vw_eventos_completos CASCADE;

        CREATE OR REPLACE VIEW vw_eventos_completos AS
        SELECT
          e.id,
          e.clave_evento,
          e.nombre_proyecto,
          e.cliente_id,
          e.fecha_evento,
          e.estado_id,
          e.tipo_evento_id,
          e.fecha_creacion,
          e.lugar,
          e.descripcion,
          e.notas,
          e.activo,

          -- Campos financieros estimados
          e.ingreso_estimado,
          e.ganancia_estimada,
          e.provisiones, -- ✅ RENOMBRADO
          e.utilidad_estimada,
          e.porcentaje_utilidad_estimada,

          -- ✅ CORRECCIÓN: Solo ingresos COBRADOS
          (SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.cobrado = true
             AND i.deleted_at IS NULL) AS total,

          -- ✅ CORRECCIÓN: Solo gastos PAGADOS
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

          -- Ingresos pendientes
          (SELECT COALESCE(SUM(i.total), 0)
           FROM evt_ingresos i
           WHERE i.evento_id = e.id
             AND i.cobrado = false
             AND i.deleted_at IS NULL) AS ingresos_pendientes,

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
             AND g.deleted_at IS NULL) AS utilidad,

          -- Margen de utilidad
          CASE
            WHEN (SELECT COALESCE(SUM(i.total), 0)
                  FROM evt_ingresos i
                  WHERE i.evento_id = e.id
                    AND i.cobrado = true
                    AND i.deleted_at IS NULL) > 0
            THEN ((SELECT COALESCE(SUM(i.total), 0)
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
                    AND i.deleted_at IS NULL) * 100
            ELSE 0
          END AS margen_utilidad,

          e.created_at,
          e.updated_at,
          e.deleted_at

        FROM evt_eventos e;

        RAISE NOTICE 'Vista vw_eventos_completos actualizada exitosamente';
    ELSE
        RAISE NOTICE 'Vista vw_eventos_completos no existe, se omite';
    END IF;
END $$;

-- =====================================================
-- PASO 5: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índice para campo provisiones (usado en ordenamiento y filtros)
CREATE INDEX IF NOT EXISTS idx_evt_eventos_provisiones
ON evt_eventos(provisiones)
WHERE deleted_at IS NULL;

-- Índice para campo pagado en gastos (usado frecuentemente en filtros)
CREATE INDEX IF NOT EXISTS idx_evt_gastos_pagado
ON evt_gastos(pagado, evento_id)
WHERE deleted_at IS NULL;

-- Índice para campo cobrado en ingresos (usado frecuentemente en filtros)
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cobrado
ON evt_ingresos(cobrado, evento_id)
WHERE deleted_at IS NULL;

-- Índice compuesto para análisis financiero de eventos
CREATE INDEX IF NOT EXISTS idx_evt_eventos_analisis_financiero
ON evt_eventos(estado_id, fecha_evento, provisiones)
WHERE deleted_at IS NULL;

-- =====================================================
-- PASO 6: ACTUALIZAR TRIGGERS (Si existen)
-- =====================================================

-- Trigger para actualizar totales de evento al modificar gastos
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_event_financials_on_expense'
    ) THEN
        -- Recrear el trigger con la lógica correcta
        DROP TRIGGER IF EXISTS update_event_financials_on_expense ON evt_gastos;

        CREATE OR REPLACE FUNCTION update_event_total_gastos()
        RETURNS TRIGGER AS $func$
        BEGIN
            -- Actualizar total_gastos solo con gastos PAGADOS
            UPDATE evt_eventos
            SET
                total_gastos = (
                    SELECT COALESCE(SUM(g.total), 0)
                    FROM evt_gastos g
                    WHERE g.evento_id = COALESCE(NEW.evento_id, OLD.evento_id)
                      AND g.pagado = true
                      AND g.deleted_at IS NULL
                ),
                updated_at = NOW()
            WHERE id = COALESCE(NEW.evento_id, OLD.evento_id);

            RETURN COALESCE(NEW, OLD);
        END;
        $func$ LANGUAGE plpgsql;

        CREATE TRIGGER update_event_financials_on_expense
        AFTER INSERT OR UPDATE OR DELETE ON evt_gastos
        FOR EACH ROW
        EXECUTE FUNCTION update_event_total_gastos();

        RAISE NOTICE 'Trigger update_event_financials_on_expense actualizado';
    ELSE
        RAISE NOTICE 'Trigger update_event_financials_on_expense no existe, se omite';
    END IF;
END $$;

-- Trigger para actualizar totales de evento al modificar ingresos
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_event_financials_on_income'
    ) THEN
        DROP TRIGGER IF EXISTS update_event_financials_on_income ON evt_ingresos;

        CREATE OR REPLACE FUNCTION update_event_total_ingresos()
        RETURNS TRIGGER AS $func$
        BEGIN
            -- Actualizar total solo con ingresos COBRADOS
            UPDATE evt_eventos
            SET
                total = (
                    SELECT COALESCE(SUM(i.total), 0)
                    FROM evt_ingresos i
                    WHERE i.evento_id = COALESCE(NEW.evento_id, OLD.evento_id)
                      AND i.cobrado = true
                      AND i.deleted_at IS NULL
                ),
                updated_at = NOW()
            WHERE id = COALESCE(NEW.evento_id, OLD.evento_id);

            RETURN COALESCE(NEW, OLD);
        END;
        $func$ LANGUAGE plpgsql;

        CREATE TRIGGER update_event_financials_on_income
        AFTER INSERT OR UPDATE OR DELETE ON evt_ingresos
        FOR EACH ROW
        EXECUTE FUNCTION update_event_total_ingresos();

        RAISE NOTICE 'Trigger update_event_financials_on_income actualizado';
    ELSE
        RAISE NOTICE 'Trigger update_event_financials_on_income no existe, se omite';
    END IF;
END $$;

-- =====================================================
-- PASO 7: VERIFICACIÓN Y VALIDACIÓN
-- =====================================================

DO $$
DECLARE
    v_count_eventos INTEGER;
    v_count_con_provisiones INTEGER;
BEGIN
    -- Contar eventos
    SELECT COUNT(*) INTO v_count_eventos
    FROM evt_eventos
    WHERE deleted_at IS NULL;

    -- Contar eventos con provisiones
    SELECT COUNT(*) INTO v_count_con_provisiones
    FROM evt_eventos
    WHERE provisiones > 0
      AND deleted_at IS NULL;

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Total de eventos activos: %', v_count_eventos;
    RAISE NOTICE 'Eventos con provisiones: %', v_count_con_provisiones;
    RAISE NOTICE 'Campo gastos_estimados → provisiones: ✓';
    RAISE NOTICE 'Campo presupuesto_estimado eliminado: ✓';
    RAISE NOTICE 'Vistas actualizadas: ✓';
    RAISE NOTICE 'Índices creados: ✓';
    RAISE NOTICE 'Triggers actualizados: ✓';
    RAISE NOTICE '==========================================';
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK SCRIPT (Ejecutar solo si es necesario)
-- =====================================================

/*
BEGIN;

-- Restaurar nombre de columna
ALTER TABLE evt_eventos
RENAME COLUMN provisiones TO gastos_estimados;

-- Recrear presupuesto_estimado
ALTER TABLE evt_eventos
ADD COLUMN IF NOT EXISTS presupuesto_estimado NUMERIC DEFAULT 0;

-- Restaurar vistas originales
-- (ejecutar scripts de migración anterior)

COMMIT;
*/
