import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log('=== VERIFICANDO GASTOS ===\n');

  // 1. Campos de gastos en la vista
  console.log('1. VISTA vw_eventos_analisis_financiero_erp:');
  const { data: vista } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('*')
    .eq('id', 1)
    .single();

  if (vista) {
    const camposGastos = Object.entries(vista).filter(([k]) => k.includes('gasto'));
    console.log('   Campos de gastos:');
    camposGastos.forEach(([k, v]) => console.log('     -', k + ':', v));
  }

  // 2. Gastos directos de la tabla
  console.log('\n2. TABLA evt_gastos_erp (evento 1):');
  const { data: gastos } = await supabase
    .from('evt_gastos_erp')
    .select('total, pagado, categoria:evt_categorias_gastos_erp(nombre, clave)')
    .eq('evento_id', 1)
    .is('deleted_at', null);

  if (gastos) {
    let totalGastos = 0;
    let totalPagados = 0;
    let totalPendientes = 0;
    const porCategoria = {};

    gastos.forEach(g => {
      const monto = g.total || 0;
      totalGastos += monto;
      if (g.pagado) {
        totalPagados += monto;
      } else {
        totalPendientes += monto;
      }

      const cat = g.categoria?.clave || g.categoria?.nombre || 'SIN_CAT';
      if (!porCategoria[cat]) porCategoria[cat] = { pagado: 0, pendiente: 0 };
      if (g.pagado) {
        porCategoria[cat].pagado += monto;
      } else {
        porCategoria[cat].pendiente += monto;
      }
    });

    console.log('   Total gastos:', gastos.length);
    console.log('   Monto total:', totalGastos.toLocaleString());
    console.log('   Pagados:', totalPagados.toLocaleString());
    console.log('   Pendientes:', totalPendientes.toLocaleString());
    console.log('\n   Por categoría:');
    Object.entries(porCategoria).forEach(([cat, vals]) => {
      console.log('     -', cat + ': Pagado=' + vals.pagado.toLocaleString() + ' | Pendiente=' + vals.pendiente.toLocaleString());
    });
  }

  // 3. Categorías de gastos disponibles
  console.log('\n3. CATEGORÍAS DE GASTOS (evt_categorias_gastos_erp):');
  const { data: cats } = await supabase
    .from('evt_categorias_gastos_erp')
    .select('id, nombre, clave')
    .limit(10);

  if (cats) {
    cats.forEach(c => console.log('   -', c.clave || c.id, ':', c.nombre));
  }
}

check();
