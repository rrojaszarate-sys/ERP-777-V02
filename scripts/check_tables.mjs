import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  // Ver categorias disponibles en diferentes tablas
  const tables = ['categorias_gastos_erp', 'cat_categorias_gasto', 'evt_categorias_gastos'];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(3);
    if (error) {
      console.log(t + ': ERROR -', error.message);
    } else if (data) {
      console.log(t + ':', data.length, 'registros');
      if (data.length > 0) console.log('  Columnas:', Object.keys(data[0]));
    }
  }

  // Ver estructura de gastos_erp
  const { data: gastosData, error: gastosErr } = await supabase.from('gastos_erp').select('*').limit(1);
  if (gastosErr) {
    console.log('gastos_erp: ERROR -', gastosErr.message);
  } else {
    console.log('gastos_erp columnas:', gastosData?.length > 0 ? Object.keys(gastosData[0]) : 'vacío');
  }

  // Ver la migración de evt_provisiones
  const { data: provData, error: provErr } = await supabase.from('evt_provisiones').select('*').limit(1);
  if (provErr) {
    console.log('evt_provisiones: ERROR -', provErr.message);
  } else {
    console.log('evt_provisiones columnas:', provData?.length > 0 ? Object.keys(provData[0]) : 'vacío');
  }
}
check();
