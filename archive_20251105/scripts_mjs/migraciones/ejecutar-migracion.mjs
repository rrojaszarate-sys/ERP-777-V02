import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Iniciando migración: Renombrar gastos_estimados → provisiones\n');

const sql = readFileSync('./ejecutar-migracion-simple.sql', 'utf8');

// Dividir el SQL en bloques individuales para ejecutar
const statements = [
  // PASO 1: Dropear vistas
  `DROP VIEW IF EXISTS vw_eventos_completos CASCADE;
   DROP VIEW IF EXISTS vw_eventos_analisis_financiero CASCADE;`,

  // PASO 2: Renombrar columna
  `DO $$
   BEGIN
       IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evt_eventos' AND column_name = 'gastos_estimados') THEN
           ALTER TABLE evt_eventos RENAME COLUMN gastos_estimados TO provisiones;
           RAISE NOTICE 'Columna renombrada: gastos_estimados → provisiones';
       END IF;
   END $$;`,

  // PASO 3: Eliminar presupuesto_estimado
  `DO $$
   BEGIN
       IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evt_eventos' AND column_name = 'presupuesto_estimado') THEN
           UPDATE evt_eventos SET provisiones = COALESCE(provisiones, presupuesto_estimado, 0)
           WHERE presupuesto_estimado IS NOT NULL AND presupuesto_estimado > 0 AND (provisiones IS NULL OR provisiones = 0);
           ALTER TABLE evt_eventos DROP COLUMN presupuesto_estimado CASCADE;
           RAISE NOTICE 'Columna eliminada: presupuesto_estimado';
       END IF;
   END $$;`,

  // PASO 4: Recrear vista vw_eventos_analisis_financiero
  `CREATE OR REPLACE VIEW vw_eventos_analisis_financiero AS
   SELECT
     e.id, e.clave_evento, e.nombre_proyecto, e.cliente_id, e.fecha_evento, e.estado,
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
     e.created_at, e.updated_at
   FROM evt_eventos e
   WHERE e.deleted_at IS NULL;`,

  // PASO 5: Recrear vista vw_eventos_completos
  `CREATE OR REPLACE VIEW vw_eventos_completos AS
   SELECT
     e.id, e.clave_evento, e.nombre_proyecto, e.cliente_id, e.fecha_evento, e.estado, e.tipo_evento_id, e.fecha_creacion, e.lugar, e.descripcion, e.notas, e.activo,
     e.ingreso_estimado, e.ganancia_estimada, e.provisiones, e.utilidad_estimada, e.porcentaje_utilidad_estimada,
     (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) AS total,
     (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS total_gastos,
     (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = false AND g.deleted_at IS NULL) AS gastos_pendientes,
     (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) AS ingresos_pendientes,
     (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS utilidad,
     CASE WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) > 0 THEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL)) / (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) * 100 ELSE 0 END AS margen_utilidad,
     e.created_at, e.updated_at, e.deleted_at
   FROM evt_eventos e;`,

  // PASO 6: Crear índices
  `CREATE INDEX IF NOT EXISTS idx_evt_eventos_provisiones ON evt_eventos(provisiones) WHERE deleted_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_evt_gastos_pagado ON evt_gastos(pagado, evento_id) WHERE deleted_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cobrado ON evt_ingresos(cobrado, evento_id) WHERE deleted_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_evt_eventos_analisis_financiero ON evt_eventos(estado, fecha_evento, provisiones) WHERE deleted_at IS NULL;`,

  // PASO 7: Triggers
  `DROP TRIGGER IF EXISTS update_event_financials_on_expense ON evt_gastos;`,
  `CREATE OR REPLACE FUNCTION update_event_total_gastos() RETURNS TRIGGER AS $$
   BEGIN
       UPDATE evt_eventos SET total_gastos = (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = COALESCE(NEW.evento_id, OLD.evento_id) AND g.pagado = true AND g.deleted_at IS NULL), updated_at = NOW() WHERE id = COALESCE(NEW.evento_id, OLD.evento_id);
       RETURN COALESCE(NEW, OLD);
   END;
   $$ LANGUAGE plpgsql;`,
  `CREATE TRIGGER update_event_financials_on_expense AFTER INSERT OR UPDATE OR DELETE ON evt_gastos FOR EACH ROW EXECUTE FUNCTION update_event_total_gastos();`,

  `DROP TRIGGER IF EXISTS update_event_financials_on_income ON evt_ingresos;`,
  `CREATE OR REPLACE FUNCTION update_event_total_ingresos() RETURNS TRIGGER AS $$
   BEGIN
       UPDATE evt_eventos SET total = (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = COALESCE(NEW.evento_id, OLD.evento_id) AND i.cobrado = true AND i.deleted_at IS NULL), updated_at = NOW() WHERE id = COALESCE(NEW.evento_id, OLD.evento_id);
       RETURN COALESCE(NEW, OLD);
   END;
   $$ LANGUAGE plpgsql;`,
  `CREATE TRIGGER update_event_financials_on_income AFTER INSERT OR UPDATE OR DELETE ON evt_ingresos FOR EACH ROW EXECUTE FUNCTION update_event_total_ingresos();`
];

async function ejecutarMigracion() {
  let paso = 0;

  try {
    console.log('📡 Conectando a Supabase...\n');

    for (const statement of statements) {
      paso++;
      const descripcion =
        paso === 1 ? 'Dropeando vistas...' :
        paso === 2 ? 'Renombrando columna...' :
        paso === 3 ? 'Eliminando presupuesto_estimado...' :
        paso === 4 ? 'Recreando vw_eventos_analisis_financiero...' :
        paso === 5 ? 'Recreando vw_eventos_completos...' :
        paso <= 9 ? 'Creando índices...' :
        'Actualizando triggers...';

      process.stdout.write(`⏳ Paso ${paso}: ${descripcion}`);

      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        console.log(` ❌\n`);
        throw error;
      }

      console.log(` ✅`);
    }

    console.log('\n🔍 Verificando resultado...\n');

    const { data: eventos, error: errorEventos } = await supabase
      .from('evt_eventos')
      .select('id, provisiones')
      .not('deleted_at', 'is', null)
      .limit(5);

    if (errorEventos) {
      console.log('⚠️  No se pudo verificar eventos:', errorEventos.message);
    } else {
      console.log(`✅ Eventos activos encontrados: ${eventos?.length || 0}`);
      if (eventos && eventos.length > 0) {
        console.log(`✅ Campo "provisiones" accesible`);
      }
    }

    const { data: vista, error: errorVista } = await supabase
      .from('vw_eventos_analisis_financiero')
      .select('id, provisiones, gastos_pagados, gastos_pendientes')
      .limit(1);

    if (errorVista) {
      console.log('⚠️  Vista vw_eventos_analisis_financiero:', errorVista.message);
    } else {
      console.log('✅ Vista vw_eventos_analisis_financiero: OK');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n📋 Cambios aplicados:');
    console.log('   ✅ Columna gastos_estimados → provisiones');
    console.log('   ✅ Columna presupuesto_estimado eliminada');
    console.log('   ✅ Vistas actualizadas con filtros corregidos');
    console.log('   ✅ 4 índices creados');
    console.log('   ✅ Triggers actualizados\n');

  } catch (error) {
    console.error('\n\n❌ ERROR EN PASO', paso + ':\n');
    console.error(error);
    console.log('\n💡 El error puede deberse a que Supabase no permite ejecutar SQL arbitrario desde el cliente.');
    console.log('   Por favor, copia el contenido de ejecutar-migracion-simple.sql');
    console.log('   y ejecútalo manualmente en Supabase Dashboard > SQL Editor\n');
    process.exit(1);
  }
}

ejecutarMigracion();
