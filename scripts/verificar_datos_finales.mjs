import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verificar() {
  console.log('=== VERIFICACIÓN FINAL DE DATOS ===\n');

  // 1. Verificar evento desde la vista
  console.log('1. VISTA vw_eventos_analisis_financiero_erp:');
  const { data: vista, error: e1 } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('*')
    .eq('id', 1)
    .single();

  if (e1) {
    console.log('   ERROR:', e1.message);
  } else {
    console.log('   ✅ Proyecto:', vista.nombre_proyecto);
    console.log('   ✅ Ingresos Totales:', '$' + (vista.ingresos_totales || 0).toLocaleString());
    console.log('   ✅ Gastos Totales:', '$' + (vista.gastos_totales || 0).toLocaleString());
    console.log('   ✅ Utilidad Real:', '$' + (vista.utilidad_real || 0).toLocaleString());
    console.log('   ✅ Margen:', (vista.margen_real_pct || 0).toFixed(1) + '%');
  }

  // 2. Verificar gastos directos
  console.log('\n2. GASTOS DIRECTOS (evt_gastos_erp):');
  const { data: gastos, error: e2 } = await supabase
    .from('evt_gastos_erp')
    .select('id, concepto, total')
    .eq('evento_id', 1)
    .is('deleted_at', null)
    .limit(5);

  if (e2) {
    console.log('   ERROR:', e2.message);
  } else {
    console.log('   Encontrados:', gastos?.length || 0);
    gastos?.forEach(g => console.log('   -', (g.concepto || '').substring(0, 40), ':', '$' + (g.total || 0).toLocaleString()));
  }

  // 3. Verificar ingresos directos
  console.log('\n3. INGRESOS DIRECTOS (evt_ingresos_erp):');
  const { data: ingresos, error: e3 } = await supabase
    .from('evt_ingresos_erp')
    .select('id, concepto, total')
    .eq('evento_id', 1)
    .limit(5);

  if (e3) {
    console.log('   ERROR:', e3.message);
  } else {
    console.log('   Encontrados:', ingresos?.length || 0);
    ingresos?.forEach(i => console.log('   -', (i.concepto || '').substring(0, 40), ':', '$' + (i.total || 0).toLocaleString()));
  }

  // 4. Verificar provisiones
  console.log('\n4. PROVISIONES (evt_provisiones_erp):');
  const { data: provisiones, error: e4 } = await supabase
    .from('evt_provisiones_erp')
    .select('id, concepto, total, activo')
    .eq('evento_id', 1)
    .eq('activo', true)
    .limit(5);

  if (e4) {
    console.log('   ERROR:', e4.message);
  } else {
    console.log('   Encontradas:', provisiones?.length || 0);
    provisiones?.forEach(p => console.log('   -', (p.concepto || '').substring(0, 40), ':', '$' + (p.total || 0).toLocaleString()));
  }

  // 5. Contar totales
  console.log('\n5. TOTALES EN TABLAS:');
  const { count: countGastos } = await supabase
    .from('evt_gastos_erp')
    .select('*', { count: 'exact', head: true })
    .eq('evento_id', 1)
    .is('deleted_at', null);

  const { count: countIngresos } = await supabase
    .from('evt_ingresos_erp')
    .select('*', { count: 'exact', head: true })
    .eq('evento_id', 1);

  const { count: countProvisiones } = await supabase
    .from('evt_provisiones_erp')
    .select('*', { count: 'exact', head: true })
    .eq('evento_id', 1)
    .eq('activo', true);

  console.log('   Gastos evento 1:', countGastos);
  console.log('   Ingresos evento 1:', countIngresos);
  console.log('   Provisiones evento 1:', countProvisiones);

  console.log('\n=== FIN VERIFICACIÓN ===');
}

verificar();
