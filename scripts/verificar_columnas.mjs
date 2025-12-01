import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verificar() {
  console.log('=== COLUMNAS DE FECHA EN TABLAS ===\n');

  // Ingresos
  const { data: ing } = await supabase.from('evt_ingresos_erp').select('*').limit(1);
  if (ing && ing[0]) {
    console.log('1. evt_ingresos_erp:');
    Object.keys(ing[0]).filter(k => k.includes('fecha') || k.includes('created') || k.includes('updated')).forEach(k => console.log('   -', k));
  }

  // Gastos
  const { data: gas } = await supabase.from('evt_gastos_erp').select('*').limit(1);
  if (gas && gas[0]) {
    console.log('\n2. evt_gastos_erp:');
    Object.keys(gas[0]).filter(k => k.includes('fecha') || k.includes('created') || k.includes('updated')).forEach(k => console.log('   -', k));
  }

  // Provisiones
  const { data: prov } = await supabase.from('evt_provisiones_erp').select('*').limit(1);
  if (prov && prov[0]) {
    console.log('\n3. evt_provisiones_erp:');
    Object.keys(prov[0]).filter(k => k.includes('fecha') || k.includes('created') || k.includes('updated')).forEach(k => console.log('   -', k));
  }
}

verificar();
