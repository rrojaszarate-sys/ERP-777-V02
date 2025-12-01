import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnostico() {
  console.log('=== DIAGNÓSTICO COMPLETO ===\n');

  // 1. Verificar gastos reales
  const { data: gastos, error: e1 } = await supabase
    .from('evt_gastos_erp')
    .select('id, concepto, total, evento_id, activo, deleted_at')
    .eq('evento_id', 1);
  console.log('1. GASTOS EN evt_gastos_erp (evento 1):');
  console.log('   Total encontrados:', gastos?.length || 0);
  if (e1) console.log('   ERROR:', e1.message);
  if (gastos?.length > 0) {
    gastos.slice(0, 5).forEach(g => console.log('   -', g.concepto, ':', g.total, '| activo:', g.activo));
  }

  // 2. Verificar ingresos
  const { data: ingresos, error: e2 } = await supabase
    .from('evt_ingresos_erp')
    .select('id, concepto, total, evento_id')
    .eq('evento_id', 1);
  console.log('\n2. INGRESOS EN evt_ingresos_erp (evento 1):');
  console.log('   Total encontrados:', ingresos?.length || 0);
  if (e2) console.log('   ERROR:', e2.message);
  if (ingresos?.length > 0) {
    ingresos.forEach(i => console.log('   -', (i.concepto || '').substring(0,40), ':', i.total));
  }

  // 3. Verificar la vista de análisis financiero
  const { data: vista, error: e3 } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('*')
    .eq('id', 1)
    .single();
  console.log('\n3. VISTA vw_eventos_analisis_financiero_erp (evento 1):');
  if (vista) {
    console.log('   Proyecto:', vista.nombre_proyecto);
    console.log('   Ingresos totales:', vista.ingresos_totales);
    console.log('   Ingresos cobrados:', vista.ingresos_cobrados);
    console.log('   Gastos totales:', vista.gastos_totales);
    console.log('   Gastos pagados:', vista.gastos_pagados_total);
    console.log('   Utilidad real:', vista.utilidad_real);
  } else {
    console.log('   ERROR:', e3?.message);
  }

  // 4. Verificar TODOS los eventos
  const { data: todosEventos, error: e4 } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('id, nombre_proyecto, ingresos_totales, gastos_totales, utilidad_real');
  console.log('\n4. TODOS LOS EVENTOS EN LA VISTA:');
  if (e4) console.log('   ERROR:', e4.message);
  if (todosEventos) {
    todosEventos.forEach(e => {
      console.log(`   ID ${e.id}: ${(e.nombre_proyecto || '').substring(0,30)} | Ing: ${e.ingresos_totales} | Gas: ${e.gastos_totales} | Util: ${e.utilidad_real}`);
    });
  }

  // 5. Verificar si la tabla evt_gastos_erp tiene datos
  const { count: totalGastos } = await supabase
    .from('evt_gastos_erp')
    .select('*', { count: 'exact', head: true });
  console.log('\n5. TOTAL GASTOS EN TODA LA TABLA:', totalGastos);

  // 6. Verificar provisiones
  const { data: provisiones } = await supabase
    .from('evt_provisiones_erp')
    .select('id, concepto, total, evento_id')
    .eq('evento_id', 1);
  console.log('\n6. PROVISIONES (evento 1):', provisiones?.length || 0);

  // 7. Ver estructura de columnas de la vista
  const { data: allColumns } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('*')
    .limit(1);
  if (allColumns && allColumns[0]) {
    console.log('\n7. COLUMNAS DE LA VISTA:');
    Object.keys(allColumns[0]).forEach(k => console.log('   -', k));
  }
}

diagnostico();
