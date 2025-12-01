import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  console.log('=== TEST JOIN CATEGORÍAS ===\n');

  // 1. Provisiones con join
  console.log('1. evt_provisiones_erp con JOIN a cat_categorias_gasto:');
  const { data: prov1, error: e1 } = await supabase
    .from('evt_provisiones_erp')
    .select('id, total, categoria_id, categoria:cat_categorias_gasto(clave)')
    .eq('evento_id', 1)
    .eq('activo', true)
    .limit(5);

  if (e1) {
    console.log('   ERROR:', e1.message);
  } else {
    console.log('   Encontrados:', prov1?.length);
    prov1?.forEach(p => console.log('   -', p.id, '| $' + p.total, '| cat_id:', p.categoria_id, '| clave:', p.categoria?.clave));
  }

  // 2. Provisiones sin join
  console.log('\n2. evt_provisiones_erp SIN join:');
  const { data: prov2, error: e2 } = await supabase
    .from('evt_provisiones_erp')
    .select('id, total, categoria_id')
    .eq('evento_id', 1)
    .eq('activo', true)
    .limit(5);

  if (e2) {
    console.log('   ERROR:', e2.message);
  } else {
    console.log('   Encontrados:', prov2?.length);
    let totalSum = 0;
    prov2?.forEach(p => {
      totalSum += p.total || 0;
      console.log('   -', p.id, '| $' + p.total, '| cat_id:', p.categoria_id);
    });
    console.log('   Total parcial:', totalSum);
  }

  // 3. Gastos con join
  console.log('\n3. evt_gastos_erp con JOIN:');
  const { data: gast1, error: e3 } = await supabase
    .from('evt_gastos_erp')
    .select('id, total, pagado, categoria_id, categoria:cat_categorias_gasto(clave)')
    .eq('evento_id', 1)
    .is('deleted_at', null)
    .limit(5);

  if (e3) {
    console.log('   ERROR:', e3.message);
  } else {
    console.log('   Encontrados:', gast1?.length);
    gast1?.forEach(g => console.log('   -', g.id, '| $' + g.total, '| pagado:', g.pagado, '| cat_id:', g.categoria_id));
  }
}

test();
