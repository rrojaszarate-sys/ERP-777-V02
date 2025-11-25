import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verificarColumnas() {
  console.log('🔍 Verificando estructura de tablas...\n');

  try {
    // Verificar evt_ingresos
    console.log('📊 Estructura de evt_ingresos:');
    const { data: ingresos, error: errorIngresos } = await supabase
      .from('evt_ingresos')
      .select('*')
      .limit(1);
    
    if (errorIngresos) {
      console.error('❌ Error:', errorIngresos.message);
    } else if (ingresos && ingresos[0]) {
      console.log('Columnas:', Object.keys(ingresos[0]).join(', '));
      console.log('Ejemplo:', JSON.stringify(ingresos[0], null, 2));
    }

    console.log('\n---\n');

    // Verificar evt_gastos
    console.log('📊 Estructura de evt_gastos:');
    const { data: gastos, error: errorGastos } = await supabase
      .from('evt_gastos')
      .select('*')
      .limit(1);
    
    if (errorGastos) {
      console.error('❌ Error:', errorGastos.message);
    } else if (gastos && gastos[0]) {
      console.log('Columnas:', Object.keys(gastos[0]).join(', '));
      console.log('Ejemplo:', JSON.stringify(gastos[0], null, 2));
    }

    console.log('\n---\n');

    // Verificar evt_eventos
    console.log('📊 Estructura de evt_eventos:');
    const { data: eventos, error: errorEventos } = await supabase
      .from('evt_eventos')
      .select('*')
      .limit(1);
    
    if (errorEventos) {
      console.error('❌ Error:', errorEventos.message);
    } else if (eventos && eventos[0]) {
      console.log('Columnas:', Object.keys(eventos[0]).join(', '));
      console.log('Ejemplo:', JSON.stringify(eventos[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarColumnas();
