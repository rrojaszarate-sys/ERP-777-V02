-- =====================================================
-- Migration: Renombrar gastos_estimados → provisiones
-- VERSIÓN CORREGIDA FINAL - Basada en estructura real
-- Fecha: 2025-10-28
-- =====================================================

BEGIN;

-- PASO 1: Dropear vistas que dependen de presupuesto_estimado
DROP VIEW IF EXISTS vw_eventos_completos CASCADE;
DROP VIEW IF EXISTS vw_eventos_analisis_financiero CASCADE;

-- PASO 2: Renombrar columna gastos_estimados → provisiones
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'evt_eventos'
        AND column_name = 'gastos_estimados'
    ) THEN
        ALTER TABLE evt_eventos RENAME COLUMN gastos_estimados TO provisiones;
        RAISE NOTICE 'Columna renombrada: gastos_estimados → provisiones';
    ELSE
        RAISE NOTICE 'Columna gastos_estimados no existe (ya renombrada)';
    END IF;
END $$;

COMMENT ON COLUMN evt_eventos.provisiones IS
'Gastos estimados (provisiones) para el evento. Usado para proyección financiera y comparación con gastos reales.';

-- PASO 3: Migrar datos y eliminar presupuesto_estimado
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
        ALTER TABLE evt_eventos DROP COLUMN presupuesto_estimado CASCADE;
        RAISE NOTICE 'Columna eliminada: presupuesto_estimado';
    ELSE
        RAISE NOTICE 'Columna presupuesto_estimado no existe (ya eliminada)';
    END IF;
END $$;

-- PASO 4: Recrear vista vw_eventos_analisis_financiero
-- NOTA: evt_eventos usa 'activo' en lugar de 'deleted_at'
CREATE OR REPLACE VIEW vw_eventos_analisis_financiero AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.cliente_id,
  e.fecha_evento,
  e.estado_id,
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,
  COALESCE(e.provisiones, 0) AS provisiones,
  COALESCE(e.utilidad_estimada, 0) AS utilidad_estimada,
  COALESCE(e.porcentaje_utilidad_estimada, 0) AS porcentaje_utilidad_estimada,
  COALESCE(e.total, 0) AS ingreso_real,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS gastos_pagados,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = false AND g.deleted_at IS NULL) AS gastos_pendientes,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.deleted_at IS NULL) AS gastos_totales,
  COALESCE(e.total, 0) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS utilidad_real,
  COALESCE(e.margen_utilidad, 0) AS margen_utilidad_real,
  (COALESCE(e.total, 0) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL)) - COALESCE(e.utilidad_estimada, 0) AS diferencia_utilidad_absoluta,
  CASE WHEN COALESCE(e.provisiones, 0) > 0 THEN (((SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) / COALESCE(e.provisiones, 1)) - 1) * 100 ELSE 0 END AS variacion_gastos_porcentaje,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) - COALESCE(e.provisiones, 0) AS diferencia_gastos_absoluta,
  CASE
    WHEN COALESCE(e.provisiones, 0) = 0 THEN 'sin_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) <= COALESCE(e.provisiones, 0) THEN 'dentro_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) <= (COALESCE(e.provisiones, 0) * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal,
  e.created_at,
  e.updated_at
FROM evt_eventos e
WHERE e.activo = true;

COMMENT ON VIEW vw_eventos_analisis_financiero IS
'Vista completa de análisis financiero de eventos con comparación entre proyección y resultados reales. Incluye análisis de variación de provisiones vs gastos pagados.';

-- PASO 5: Recrear vista vw_eventos_completos
CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT
  e.id, e.clave_evento, e.nombre_proyecto, e.cliente_id, e.fecha_evento, e.estado_id, e.tipo_evento_id, e.lugar, e.descripcion, e.notas, e.activo,
  e.ingreso_estimado, e.ganancia_estimada, e.provisiones, e.utilidad_estimada, e.porcentaje_utilidad_estimada,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) AS total,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS total_gastos,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = false AND g.deleted_at IS NULL) AS gastos_pendientes,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) AS ingresos_pendientes,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS utilidad,
  CASE WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) > 0 THEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL)) / (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) * 100 ELSE 0 END AS margen_utilidad,
  e.created_at, e.updated_at
FROM evt_eventos e;

COMMENT ON VIEW vw_eventos_completos IS
'Vista completa de eventos con totales calculados solo de gastos/ingresos pagados/cobrados.';

-- PASO 6: Crear índices
CREATE INDEX IF NOT EXISTS idx_evt_eventos_provisiones ON evt_eventos(provisiones) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_evt_gastos_pagado ON evt_gastos(pagado, evento_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cobrado ON evt_ingresos(cobrado, evento_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evt_eventos_analisis_financiero ON evt_eventos(estado_id, fecha_evento, provisiones) WHERE activo = true;

-- PASO 7: Actualizar triggers
DROP TRIGGER IF EXISTS update_event_financials_on_expense ON evt_gastos;
CREATE OR REPLACE FUNCTION update_event_total_gastos() RETURNS TRIGGER AS $$
BEGIN
    UPDATE evt_eventos
    SET total_gastos = (
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_financials_on_expense
AFTER INSERT OR UPDATE OR DELETE ON evt_gastos
FOR EACH ROW
EXECUTE FUNCTION update_event_total_gastos();

DROP TRIGGER IF EXISTS update_event_financials_on_income ON evt_ingresos;
CREATE OR REPLACE FUNCTION update_event_total_ingresos() RETURNS TRIGGER AS $$
BEGIN
    UPDATE evt_eventos
    SET total = (
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_financials_on_income
AFTER INSERT OR UPDATE OR DELETE ON evt_ingresos
FOR EACH ROW
EXECUTE FUNCTION update_event_total_ingresos();

COMMIT;

-- Verificación
SELECT
    'Migración completada' as mensaje,
    COUNT(*) as total_eventos,
    COUNT(CASE WHEN provisiones > 0 THEN 1 END) as eventos_con_provisiones
FROM evt_eventos
WHERE activo = true;
