import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function ejecutar() {
  console.log('=== ACTUALIZANDO VISTA vw_eventos_analisis_financiero_erp ===\n');

  // Leer el SQL
  const sql = fs.readFileSync('./scripts/actualizar_vista_eventos.sql', 'utf8');

  console.log('Ejecutando SQL...\n');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.log('ERROR ejecutando SQL:', error.message);
    console.log('\n⚠️  Si el error es "function exec_sql does not exist",');
    console.log('   ejecuta el SQL manualmente en Supabase Dashboard > SQL Editor');
    console.log('   El archivo está en: scripts/actualizar_vista_eventos.sql');
    return;
  }

  console.log('✅ Vista actualizada correctamente');

  // Verificar
  console.log('\n=== VERIFICANDO VISTA ===\n');

  const { data: vista, error: e2 } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('id, clave_evento, ingresos_totales, gastos_totales, provisiones_total, provision_sps, utilidad_real')
    .limit(5);

  if (e2) {
    console.log('Error verificando:', e2.message);
  } else {
    vista?.forEach(v => {
      console.log('-', v.clave_evento);
      console.log('  Ingresos:', v.ingresos_totales?.toLocaleString());
      console.log('  Gastos:', v.gastos_totales?.toLocaleString());
      console.log('  Provisiones:', v.provisiones_total?.toLocaleString());
      console.log('  Prov SPs:', v.provision_sps?.toLocaleString());
      console.log('  Utilidad:', v.utilidad_real?.toLocaleString());
    });
  }
}

ejecutar();
