import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log('=== ESTRUCTURA DE evt_provisiones_erp ===\n');

  // Ver estructura
  const { data, error } = await supabase
    .from('evt_provisiones_erp')
    .select('*, categoria:cat_categorias_gasto(id, nombre, clave)')
    .eq('evento_id', 1)
    .eq('activo', true)
    .limit(5);

  if (error) {
    console.log('ERROR:', error.message);
    return;
  }

  if (data && data[0]) {
    console.log('Columnas disponibles:');
    Object.keys(data[0]).forEach(k => console.log('  -', k));
  }

  console.log('\n=== PROVISIONES POR CATEGORÍA (evento 1) ===\n');

  // Agrupar por categoría
  const { data: todas } = await supabase
    .from('evt_provisiones_erp')
    .select('total, categoria:cat_categorias_gasto(id, nombre, clave)')
    .eq('evento_id', 1)
    .eq('activo', true);

  if (todas) {
    const porCategoria = {};
    let total = 0;

    todas.forEach(p => {
      const cat = p.categoria?.clave || p.categoria?.nombre || 'SIN_CATEGORIA';
      if (!porCategoria[cat]) porCategoria[cat] = 0;
      porCategoria[cat] += p.total || 0;
      total += p.total || 0;
    });

    console.log('Total provisiones:', total.toLocaleString());
    console.log('\nPor categoría:');
    Object.entries(porCategoria).forEach(([cat, monto]) => {
      console.log('  -', cat + ':', monto.toLocaleString());
    });
  }

  // Ver categorías disponibles
  console.log('\n=== CATEGORÍAS DE GASTO DISPONIBLES ===\n');
  const { data: cats } = await supabase
    .from('cat_categorias_gasto')
    .select('id, nombre, clave')
    .limit(20);

  if (cats) {
    cats.forEach(c => console.log('  -', c.clave || c.id, ':', c.nombre));
  }
}

check();
