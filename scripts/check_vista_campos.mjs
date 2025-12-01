import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log('=== VERIFICANDO VISTA vw_eventos_analisis_financiero_erp ===\n');

  const { data, error } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.log('ERROR:', error.message);
    return;
  }

  console.log('TODOS LOS CAMPOS DE LA VISTA:');
  console.log('==============================');

  const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [campo, valor] of entries) {
    console.log('  ' + campo + ': ' + valor);
  }

  console.log('\n=== CAMPOS CLAVE PARA LISTADO ===');
  console.log('gastos_totales:', data.gastos_totales);
  console.log('provisiones_total:', data.provisiones_total);
  console.log('ingresos_totales:', data.ingresos_totales);
  console.log('utilidad_real:', data.utilidad_real);
  console.log('margen_real_pct:', data.margen_real_pct);
}

check();
