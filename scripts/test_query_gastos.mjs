import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  console.log('=== TEST QUERY GASTOS ===\n');

  // Query exacta del frontend
  console.log('1. Query del frontend con JOIN:');
  const { data: gastosConJoin, error: e1 } = await supabase
    .from('evt_gastos_erp')
    .select(`
      *,
      categoria:evt_categorias_gastos_erp(nombre, color)
    `)
    .eq('evento_id', 1)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (e1) {
    console.log('   ERROR:', e1.message);
    console.log('   Código:', e1.code);
    console.log('   Hint:', e1.hint);
  } else {
    console.log('   Encontrados:', gastosConJoin?.length || 0);
    gastosConJoin?.slice(0, 3).forEach(g => console.log('   -', g.concepto?.substring(0, 30), '| Cat:', g.categoria?.nombre || 'NULL'));
  }

  // Query sin JOIN
  console.log('\n2. Query SIN JOIN:');
  const { data: gastosSinJoin, error: e2 } = await supabase
    .from('evt_gastos_erp')
    .select('id, concepto, total, categoria_id')
    .eq('evento_id', 1)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (e2) {
    console.log('   ERROR:', e2.message);
  } else {
    console.log('   Encontrados:', gastosSinJoin?.length || 0);
  }

  // Verificar fecha_creacion vs created_at
  console.log('\n3. Columnas de gastos (sample):');
  const { data: sample } = await supabase
    .from('evt_gastos_erp')
    .select('*')
    .eq('evento_id', 1)
    .limit(1);

  if (sample && sample[0]) {
    console.log('   Columnas disponibles:');
    Object.keys(sample[0]).forEach(k => {
      if (k.includes('created') || k.includes('fecha')) {
        console.log('   - ' + k + ':', sample[0][k]);
      }
    });
  }

  // Test query de ingresos
  console.log('\n4. Query de ingresos:');
  const { data: ingresos, error: e3 } = await supabase
    .from('evt_ingresos_erp')
    .select('*')
    .eq('evento_id', 1)
    .order('created_at', { ascending: false });

  if (e3) {
    console.log('   ERROR:', e3.message);
  } else {
    console.log('   Encontrados:', ingresos?.length || 0);
  }
}

test();
