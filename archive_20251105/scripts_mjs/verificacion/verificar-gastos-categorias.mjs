import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function verificarGastos() {
  console.log('\n🔍 VERIFICANDO GASTOS POR CATEGORÍA\n');
  
  // Obtener categorías
  const { data: categorias } = await supabase
    .from('evt_categorias_gastos')
    .select('id, nombre')
    .order('id');
  
  console.log('📋 Categorías disponibles:');
  categorias?.forEach(cat => console.log(`   ${cat.id}: ${cat.nombre}`));
  
  // Contar gastos por categoría
  console.log('\n💸 Gastos por categoría:\n');
  
  for (const cat of categorias || []) {
    const { count, error } = await supabase
      .from('evt_gastos')
      .select('*', { count: 'exact', head: true })
      .eq('categoria_id', cat.id);
    
    const { data: sample } = await supabase
      .from('evt_gastos')
      .select('concepto, total, pagado')
      .eq('categoria_id', cat.id)
      .limit(3);
    
    console.log(`   ${cat.nombre} (ID: ${cat.id}): ${count || 0} gastos`);
    if (sample && sample.length > 0) {
      sample.forEach(g => console.log(`      - ${g.concepto}: $${g.total.toFixed(2)} (${g.pagado ? 'Pagado' : 'Pendiente'})`));
    }
    console.log('');
  }
  
  // Verificar totales
  const { data: totales } = await supabase
    .from('evt_gastos')
    .select('categoria_id, total.sum(), pagado');
  
  console.log('📊 Resumen de totales por categoría:\n');
  
  for (const cat of categorias || []) {
    const { data: pagados } = await supabase
      .from('evt_gastos')
      .select('total')
      .eq('categoria_id', cat.id)
      .eq('pagado', true);
    
    const { data: pendientes } = await supabase
      .from('evt_gastos')
      .select('total')
      .eq('categoria_id', cat.id)
      .eq('pagado', false);
    
    const sumaPagados = pagados?.reduce((sum, g) => sum + parseFloat(g.total), 0) || 0;
    const sumaPendientes = pendientes?.reduce((sum, g) => sum + parseFloat(g.total), 0) || 0;
    
    console.log(`   ${cat.nombre}:`);
    console.log(`      Pagados:    $${sumaPagados.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`      Pendientes: $${sumaPendientes.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`      Total:      $${(sumaPagados + sumaPendientes).toLocaleString('es-MX', {minimumFractionDigits: 2})}\n`);
  }
}

verificarGastos().catch(console.error);
