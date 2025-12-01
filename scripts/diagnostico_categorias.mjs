import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnostico() {
  console.log('=== DIAGNÓSTICO DE CATEGORÍAS Y GASTOS ===\n');

  // 1. Ver si existe la tabla de categorías
  const { data: cats, error: catError } = await supabase
    .from('evt_categorias_gastos_erp')
    .select('*')
    .limit(10);
  console.log('1. CATEGORÍAS en evt_categorias_gastos_erp:');
  if (catError) {
    console.log('   ERROR:', catError.message);
  } else {
    console.log('   Encontradas:', cats?.length || 0);
    cats?.forEach(c => console.log('   -', c.id, ':', c.nombre));
  }

  // 2. Probar query exacta del frontend
  console.log('\n2. QUERY DEL FRONTEND (gastos con categoría):');
  const { data: gastosConCat, error: gastosError } = await supabase
    .from('evt_gastos_erp')
    .select(`
      *,
      categoria:evt_categorias_gastos_erp(nombre, color)
    `)
    .eq('evento_id', 1)
    .is('deleted_at', null)
    .limit(5);

  if (gastosError) {
    console.log('   ERROR:', gastosError.message);
  } else {
    console.log('   Encontrados:', gastosConCat?.length || 0);
    if (gastosConCat && gastosConCat.length > 0) {
      gastosConCat.forEach(g => console.log('   -', g.concepto, ':', g.total, '| Cat:', g.categoria?.nombre || 'SIN'));
    }
  }

  // 3. Probar query SIN join de categoría
  console.log('\n3. QUERY SIN JOIN (solo gastos):');
  const { data: gastosSinJoin, error: errorSinJoin } = await supabase
    .from('evt_gastos_erp')
    .select('id, concepto, total, deleted_at, categoria_id')
    .eq('evento_id', 1)
    .is('deleted_at', null)
    .limit(5);

  if (errorSinJoin) {
    console.log('   ERROR:', errorSinJoin.message);
  } else {
    console.log('   Encontrados:', gastosSinJoin?.length || 0);
    if (gastosSinJoin && gastosSinJoin.length > 0) {
      gastosSinJoin.forEach(g => console.log('   -', g.concepto?.substring(0,30), ':', g.total, '| CatID:', g.categoria_id));
    }
  }

  // 4. Ver estructura de provisiones
  console.log('\n4. ESTRUCTURA de evt_provisiones_erp:');
  const { data: provSample } = await supabase
    .from('evt_provisiones_erp')
    .select('*')
    .limit(1);
  if (provSample && provSample[0]) {
    Object.keys(provSample[0]).forEach(k => console.log('   -', k));
  }

  // 5. Ver si hay FK issue
  console.log('\n5. VERIFICAR categoria_id en gastos vs categorías:');
  const { data: catIds } = await supabase
    .from('evt_gastos_erp')
    .select('categoria_id')
    .eq('evento_id', 1);
  const uniqueCatIds = [...new Set(catIds?.map(g => g.categoria_id).filter(Boolean))];
  console.log('   categoria_ids usados en gastos:', uniqueCatIds);

  // 6. Verificar si esos IDs existen en la tabla de categorías
  if (uniqueCatIds.length > 0) {
    for (const catId of uniqueCatIds.slice(0, 5)) {
      const { data: cat } = await supabase
        .from('evt_categorias_gastos_erp')
        .select('id, nombre')
        .eq('id', catId)
        .single();
      console.log(`   Cat ${catId}:`, cat ? cat.nombre : 'NO EXISTE');
    }
  }

  // 7. Probar con otra tabla de categorías
  console.log('\n6. BUSCAR en cat_categorias_gasto:');
  const { data: catAlt, error: catAltError } = await supabase
    .from('cat_categorias_gasto')
    .select('*')
    .limit(10);
  if (catAltError) {
    console.log('   ERROR:', catAltError.message);
  } else {
    console.log('   Encontradas:', catAlt?.length || 0);
    catAlt?.forEach(c => console.log('   -', c.id, ':', c.nombre || c.clave));
  }
}

diagnostico();
