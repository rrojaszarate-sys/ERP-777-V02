import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log('=== GASTOS DETALLADOS ===\n');

  // 1. Gastos sin JOIN
  console.log('1. evt_gastos_erp (sin join):');
  const { data: gastos, error: e1 } = await supabase
    .from('evt_gastos_erp')
    .select('id, concepto, total, pagado, categoria_id')
    .eq('evento_id', 1)
    .is('deleted_at', null)
    .limit(10);

  if (e1) {
    console.log('   ERROR:', e1.message);
  } else {
    console.log('   Total encontrados:', gastos?.length || 0);
    if (gastos && gastos.length > 0) {
      console.log('   Primeros 5:');
      gastos.slice(0, 5).forEach(g => {
        console.log('     -', g.concepto?.substring(0, 40), '| $' + (g.total || 0).toLocaleString(), '| pagado:', g.pagado, '| cat_id:', g.categoria_id);
      });

      // Contar por estado de pago
      const pagados = gastos.filter(g => g.pagado);
      const pendientes = gastos.filter(g => !g.pagado);
      console.log('\n   Pagados:', pagados.length);
      console.log('   Pendientes:', pendientes.length);
    }
  }

  // 2. Ver categorías
  console.log('\n2. CATEGORÍAS (cat_categorias_gasto - sin _erp):');
  const { data: cats1 } = await supabase
    .from('cat_categorias_gasto')
    .select('id, nombre, clave')
    .limit(10);

  if (cats1 && cats1.length > 0) {
    cats1.forEach(c => console.log('   -', c.id, '|', c.clave, ':', c.nombre));
  } else {
    console.log('   (vacía o no existe)');
  }

  console.log('\n3. CATEGORÍAS (evt_categorias_gastos_erp):');
  const { data: cats2, error: e2 } = await supabase
    .from('evt_categorias_gastos_erp')
    .select('id, nombre, clave')
    .limit(10);

  if (e2) {
    console.log('   ERROR:', e2.message);
  } else if (cats2 && cats2.length > 0) {
    cats2.forEach(c => console.log('   -', c.id, '|', c.clave, ':', c.nombre));
  } else {
    console.log('   (vacía)');
  }

  // 3. Estructura de gastos
  console.log('\n4. Columnas de evt_gastos_erp:');
  const { data: sample } = await supabase
    .from('evt_gastos_erp')
    .select('*')
    .limit(1);

  if (sample && sample[0]) {
    Object.keys(sample[0]).forEach(k => console.log('   -', k));
  }
}

check();
