import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log('=== VERIFICANDO VISTAS FINANCIERAS ===\n');

  // 1. vw_eventos_analisis_financiero_erp (la actual)
  console.log('1. vw_eventos_analisis_financiero_erp:');
  const { data: v1, error: e1 } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('*')
    .limit(1);

  if (e1) {
    console.log('   ERROR:', e1.message);
  } else if (v1 && v1[0]) {
    const campos = Object.keys(v1[0]).filter(k => k.includes('provis'));
    console.log('   Campos de provisiones:', campos);
    campos.forEach(c => console.log('     -', c + ':', v1[0][c]));
  }

  // 2. vw_analisis_financiero_erp (la que menciona el usuario)
  console.log('\n2. vw_analisis_financiero_erp:');
  const { data: v2, error: e2 } = await supabase
    .from('vw_analisis_financiero_erp')
    .select('*')
    .limit(1);

  if (e2) {
    console.log('   ERROR:', e2.message);
  } else if (v2 && v2[0]) {
    const campos = Object.keys(v2[0]).filter(k => k.includes('provis'));
    console.log('   Campos de provisiones:', campos);
    campos.forEach(c => console.log('     -', c + ':', v2[0][c]));
    console.log('\n   TODOS LOS CAMPOS:');
    Object.keys(v2[0]).sort().forEach(k => console.log('     -', k + ':', v2[0][k]));
  }
}

check();
