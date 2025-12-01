import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  console.log('=== TEST QUERY CON COLUMNAS CORRECTAS ===\n');

  // 1. Query exacta del frontend para GASTOS
  console.log('1. GASTOS (fecha_creacion):');
  const { data: gastos, error: e1 } = await supabase
    .from('evt_gastos_erp')
    .select(`
      *,
      categoria:evt_categorias_gastos_erp(nombre, color)
    `)
    .eq('evento_id', 1)
    .is('deleted_at', null)
    .order('fecha_creacion', { ascending: false })
    .limit(5);

  if (e1) {
    console.log('   ERROR:', e1.message);
  } else {
    console.log('   ✅ Encontrados:', gastos?.length || 0);
    gastos?.slice(0, 3).forEach(g => console.log('   -', g.concepto?.substring(0, 35), '| $' + (g.total || 0).toLocaleString()));
  }

  // 2. Query exacta del frontend para INGRESOS
  console.log('\n2. INGRESOS (fecha_creacion):');
  const { data: ingresos, error: e2 } = await supabase
    .from('evt_ingresos_erp')
    .select('*')
    .eq('evento_id', 1)
    .order('fecha_creacion', { ascending: false });

  if (e2) {
    console.log('   ERROR:', e2.message);
  } else {
    console.log('   ✅ Encontrados:', ingresos?.length || 0);
    ingresos?.forEach(i => console.log('   -', i.concepto?.substring(0, 35), '| $' + (i.total || 0).toLocaleString()));
  }

  // 3. Query exacta del frontend para PROVISIONES
  console.log('\n3. PROVISIONES (created_at):');
  const { data: provisiones, error: e3 } = await supabase
    .from('evt_provisiones_erp')
    .select(`
      *,
      categoria:cat_categorias_gasto(id, nombre, clave, color)
    `)
    .eq('evento_id', 1)
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (e3) {
    console.log('   ERROR:', e3.message);
  } else {
    console.log('   ✅ Encontradas:', provisiones?.length || 0);
    provisiones?.slice(0, 3).forEach(p => console.log('   -', p.concepto?.substring(0, 35), '| $' + (p.total || 0).toLocaleString()));
  }

  console.log('\n=== RESUMEN ===');
  console.log('Gastos:', gastos?.length || 0, '| Ingresos:', ingresos?.length || 0, '| Provisiones:', provisiones?.length || 0);
}

test();
