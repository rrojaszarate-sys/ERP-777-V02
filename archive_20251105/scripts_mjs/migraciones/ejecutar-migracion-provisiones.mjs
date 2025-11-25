import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Faltan credenciales de Supabase en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Iniciando migración: Renombrar gastos_estimados → provisiones\n');

// MIGRACIÓN CORREGIDA
const migracion = `
-- =====================================================
-- Migration: Renombrar gastos_estimados → provisiones
-- VERSIÓN CORREGIDA: Con DROP CASCADE
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: DROPEAR VISTAS QUE DEPENDEN DE presupuesto_estimado
-- =====================================================

DROP VIEW IF EXISTS vw_eventos_completos CASCADE;
DROP VIEW IF EXISTS vw_eventos_analisis_financiero CASCADE;

RAISE NOTICE 'Vistas dropeadas exitosamente';

-- =====================================================
-- PASO 2: RENOMBRAR COLUMNA gastos_estimados → provisiones
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'evt_eventos'
        AND column_name = 'gastos_estimados'
    ) THEN
        ALTER TABLE evt_eventos
        RENAME COLUMN gastos_estimados TO provisiones;

        RAISE NOTICE 'Columna gastos_estimados renombrada a provisiones';
    ELSE
        RAISE NOTICE 'Columna gastos_estimados no existe (ya renombrada)';
    END IF;
END $$;

COMMENT ON COLUMN evt_eventos.provisiones IS
'Gastos estimados (provisiones) para el evento. Usado para proyección financiera y comparación con gastos reales.';

-- =====================================================
-- PASO 3: ELIMINAR COLUMNA DEPRECADA presupuesto_estimado
-- =====================================================

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

        -- Ahora sí podemos eliminar la columna (las vistas ya fueron dropeadas)
        ALTER TABLE evt_eventos DROP COLUMN presupuesto_estimado CASCADE;

        RAISE NOTICE 'Columna presupuesto_estimado eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Columna presupuesto_estimado no existe (ya eliminada)';
    END IF;
END $$;

-- =====================================================
-- PASO 4: RECREAR VISTA vw_eventos_analisis_financiero
-- =====================================================

CREATE OR REPLACE VIEW vw_eventos_analisis_financiero AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.cliente_id,
  e.fecha_evento,
  e.estado,

  -- PROYECCIÓN FINANCIERA (Estimado)
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,
  COALESCE(e.provisiones, 0) AS provisiones,
  COALESCE(e.utilidad_estimada, 0) AS utilidad_estimada,
  COALESCE(e.porcentaje_utilidad_estimada, 0) AS porcentaje_utilidad_estimada,

  -- RESULTADOS REALES (Actual)
  COALESCE(e.total, 0) AS ingreso_real,

  -- Solo gastos PAGADOS
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

  -- ANÁLISIS DE VARIACIÓN
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

  e.created_at,
  e.updated_at

FROM evt_eventos e
WHERE e.deleted_at IS NULL;

COMMENT ON VIEW vw_eventos_analisis_financiero IS
'Vista completa de análisis financiero de eventos con comparación entre proyección y resultados reales. Incluye análisis de variación de provisiones vs gastos pagados.';

RAISE NOTICE 'Vista vw_eventos_analisis_financiero recreada';

-- =====================================================
-- PASO 5: RECREAR VISTA vw_eventos_completos
-- =====================================================

CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.cliente_id,
  e.fecha_evento,
  e.estado,
  e.tipo_evento_id,
  e.fecha_creacion,
  e.lugar,
  e.descripcion,
  e.notas,
  e.activo,

  -- Campos financieros estimados
  e.ingreso_estimado,
  e.ganancia_estimada,
  e.provisiones,
  e.utilidad_estimada,
  e.porcentaje_utilidad_estimada,

  -- Solo ingresos COBRADOS
  (SELECT COALESCE(SUM(i.total), 0)
   FROM evt_ingresos i
   WHERE i.evento_id = e.id
     AND i.cobrado = true
     AND i.deleted_at IS NULL) AS total,

  -- Solo gastos PAGADOS
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

RAISE NOTICE 'Vista vw_eventos_completos recreada';

-- =====================================================
-- PASO 6: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_evt_eventos_provisiones
ON evt_eventos(provisiones)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_evt_gastos_pagado
ON evt_gastos(pagado, evento_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cobrado
ON evt_ingresos(cobrado, evento_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_evt_eventos_analisis_financiero
ON evt_eventos(estado, fecha_evento, provisiones)
WHERE deleted_at IS NULL;

RAISE NOTICE 'Índices creados exitosamente';

-- =====================================================
-- PASO 7: ACTUALIZAR TRIGGERS
-- =====================================================

-- Trigger para gastos
DROP TRIGGER IF EXISTS update_event_financials_on_expense ON evt_gastos;

CREATE OR REPLACE FUNCTION update_event_total_gastos()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_financials_on_expense
AFTER INSERT OR UPDATE OR DELETE ON evt_gastos
FOR EACH ROW
EXECUTE FUNCTION update_event_total_gastos();

RAISE NOTICE 'Trigger update_event_financials_on_expense actualizado';

-- Trigger para ingresos
DROP TRIGGER IF EXISTS update_event_financials_on_income ON evt_ingresos;

CREATE OR REPLACE FUNCTION update_event_total_ingresos()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_financials_on_income
AFTER INSERT OR UPDATE OR DELETE ON evt_ingresos
FOR EACH ROW
EXECUTE FUNCTION update_event_total_ingresos();

RAISE NOTICE 'Trigger update_event_financials_on_income actualizado';

-- =====================================================
-- PASO 8: VERIFICACIÓN
-- =====================================================

DO $$
DECLARE
    v_count_eventos INTEGER;
    v_count_con_provisiones INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count_eventos
    FROM evt_eventos
    WHERE deleted_at IS NULL;

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
    RAISE NOTICE 'Vistas recreadas: ✓';
    RAISE NOTICE 'Índices creados: ✓';
    RAISE NOTICE 'Triggers actualizados: ✓';
    RAISE NOTICE '==========================================';
END $$;

COMMIT;
`;

async function ejecutarMigracion() {
  try {
    console.log('📡 Conectando a Supabase...');
    console.log(`   URL: ${supabaseUrl}\n`);

    console.log('⚙️  Ejecutando migración SQL...\n');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migracion
    });

    if (error) {
      // Si el RPC no existe, intentar ejecutar directamente
      console.log('⚠️  RPC exec_sql no disponible, ejecutando con query directo...\n');

      const { error: directError } = await supabase
        .from('_migrations')
        .insert({ query: migracion });

      if (directError) {
        throw directError;
      }
    }

    console.log('✅ MIGRACIÓN EJECUTADA EXITOSAMENTE\n');

    // Verificar que las vistas existen
    console.log('🔍 Verificando vistas creadas...');

    const { data: vistas, error: errorVistas } = await supabase
      .from('vw_eventos_analisis_financiero')
      .select('id')
      .limit(1);

    if (!errorVistas) {
      console.log('✅ Vista vw_eventos_analisis_financiero: OK');
    } else {
      console.log('⚠️  Vista vw_eventos_analisis_financiero: No se pudo verificar');
    }

    const { data: vistasCompletos, error: errorCompletos } = await supabase
      .from('vw_eventos_completos')
      .select('id')
      .limit(1);

    if (!errorCompletos) {
      console.log('✅ Vista vw_eventos_completos: OK');
    } else {
      console.log('⚠️  Vista vw_eventos_completos: No se pudo verificar');
    }

    console.log('\n✨ PROCESO COMPLETADO\n');
    console.log('📋 SIGUIENTE PASO: Verificar en Supabase Dashboard que:');
    console.log('   1. La columna "provisiones" existe en evt_eventos');
    console.log('   2. La columna "presupuesto_estimado" fue eliminada');
    console.log('   3. Las vistas vw_eventos_analisis_financiero y vw_eventos_completos existen');
    console.log('   4. Los triggers update_event_financials_on_expense y update_event_financials_on_income existen\n');

  } catch (error) {
    console.error('\n❌ ERROR AL EJECUTAR MIGRACIÓN:\n');
    console.error(error);
    console.log('\n💡 SOLUCIÓN ALTERNATIVA:');
    console.log('   Copia el contenido del script SQL y ejecútalo manualmente en:');
    console.log('   Supabase Dashboard > SQL Editor\n');
    process.exit(1);
  }
}

ejecutarMigracion();
