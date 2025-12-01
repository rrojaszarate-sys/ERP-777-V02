import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnostico() {
  console.log('=== DIAGNÓSTICO DE GASTOS ===\n');

  // 1. Ver estructura de evt_gastos_erp
  const { data: sample } = await supabase
    .from('evt_gastos_erp')
    .select('*')
    .limit(1);
  if (sample && sample[0]) {
    console.log('1. COLUMNAS DE evt_gastos_erp:');
    Object.keys(sample[0]).forEach(k => console.log('   -', k, ':', typeof sample[0][k]));
  }

  // 2. Ver qué evento_ids tienen gastos
  const { data: gastosPorEvento } = await supabase
    .from('evt_gastos_erp')
    .select('evento_id');

  const eventosConGastos = [...new Set(gastosPorEvento?.map(g => g.evento_id))];
  console.log('\n2. EVENTOS CON GASTOS:', eventosConGastos);

  // 3. Ver gastos de cada evento
  for (const evId of eventosConGastos) {
    const { data: gastosEvento } = await supabase
      .from('evt_gastos_erp')
      .select('id, concepto, total')
      .eq('evento_id', evId);
    console.log(`   Evento ${evId}: ${gastosEvento?.length} gastos, Total: $${gastosEvento?.reduce((s,g) => s + (g.total || 0), 0).toLocaleString()}`);
  }

  // 4. Ver si hay gastos sin evento_id
  const { data: gastosSinEvento } = await supabase
    .from('evt_gastos_erp')
    .select('id, concepto, total, evento_id')
    .is('evento_id', null);
  console.log('\n3. GASTOS SIN EVENTO_ID:', gastosSinEvento?.length || 0);

  // 5. Ver definición de la vista - qué tabla usa para gastos
  const { data: vistaDef } = await supabase.rpc('pg_get_viewdef', { viewname: 'vw_eventos_analisis_financiero_erp' }).catch(() => ({ data: null }));

  // 6. Verificar si hay otra tabla de gastos
  const { data: otrosGastos } = await supabase
    .from('gni_gastos')
    .select('id, evento_id, total')
    .eq('evento_id', 1)
    .limit(5)
    .catch(() => ({ data: null }));
  console.log('\n4. GASTOS EN gni_gastos (evento 1):', otrosGastos?.length || 'tabla no existe');

  // 7. Ver los eventos que existen
  const { data: eventos } = await supabase
    .from('evt_eventos_erp')
    .select('id, clave_evento, nombre_proyecto');
  console.log('\n5. EVENTOS EXISTENTES:');
  eventos?.forEach(e => console.log(`   ID ${e.id}: ${e.clave_evento} - ${e.nombre_proyecto}`));

  // 8. Verificar cómo la vista calcula gastos
  console.log('\n6. VERIFICANDO FUENTE DE GASTOS EN LA VISTA...');

  // Buscar en provisiones
  const { data: provs } = await supabase
    .from('evt_provisiones_erp')
    .select('id, concepto, total, evento_id')
    .eq('evento_id', 1);
  console.log('   Provisiones evento 1:', provs?.length, '| Total: $' + provs?.reduce((s,p) => s + (p.total || 0), 0).toLocaleString());
}

diagnostico();
