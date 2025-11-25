import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verificando estructura de evt_eventos...\n');

async function verificarEstructura() {
  try {
    // Obtener un evento de ejemplo para ver su estructura
    const { data: eventos, error } = await supabase
      .from('evt_eventos')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (eventos && eventos.length > 0) {
      console.log('✅ Columnas en evt_eventos:\n');
      const columnas = Object.keys(eventos[0]).sort();
      columnas.forEach((col, i) => {
        console.log(`${(i + 1).toString().padStart(3)}. ${col}`);
      });

      console.log('\n📊 Verificando columnas clave:');
      console.log(`   estado: ${columnas.includes('estado') ? '✅ SI' : '❌ NO'}`);
      console.log(`   estado_id: ${columnas.includes('estado_id') ? '✅ SI' : '❌ NO'}`);
      console.log(`   deleted_at: ${columnas.includes('deleted_at') ? '✅ SI' : '❌ NO'}`);
      console.log(`   activo: ${columnas.includes('activo') ? '✅ SI' : '❌ NO'}`);
      console.log(`   gastos_estimados: ${columnas.includes('gastos_estimados') ? '✅ SI' : '❌ NO'}`);
      console.log(`   provisiones: ${columnas.includes('provisiones') ? '✅ SI' : '❌ NO'}`);
      console.log(`   presupuesto_estimado: ${columnas.includes('presupuesto_estimado') ? '✅ SI' : '❌ NO'}`);
    } else {
      console.log('⚠️  No hay eventos en la tabla');
    }

    // Verificar estructura de evt_gastos
    const { data: gastos } = await supabase
      .from('evt_gastos')
      .select('*')
      .limit(1);

    if (gastos && gastos.length > 0) {
      console.log('\n✅ Columnas en evt_gastos:');
      const colsGastos = Object.keys(gastos[0]).sort();
      console.log(`   deleted_at: ${colsGastos.includes('deleted_at') ? '✅ SI' : '❌ NO'}`);
      console.log(`   activo: ${colsGastos.includes('activo') ? '✅ SI' : '❌ NO'}`);
      console.log(`   pagado: ${colsGastos.includes('pagado') ? '✅ SI' : '❌ NO'}`);
    }

    // Verificar estructura de evt_ingresos
    const { data: ingresos } = await supabase
      .from('evt_ingresos')
      .select('*')
      .limit(1);

    if (ingresos && ingresos.length > 0) {
      console.log('\n✅ Columnas en evt_ingresos:');
      const colsIngresos = Object.keys(ingresos[0]).sort();
      console.log(`   deleted_at: ${colsIngresos.includes('deleted_at') ? '✅ SI' : '❌ NO'}`);
      console.log(`   activo: ${colsIngresos.includes('activo') ? '✅ SI' : '❌ NO'}`);
      console.log(`   cobrado: ${colsIngresos.includes('cobrado') ? '✅ SI' : '❌ NO'}`);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarEstructura();
