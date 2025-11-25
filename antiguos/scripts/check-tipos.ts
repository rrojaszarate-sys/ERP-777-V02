import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: tipos } = await supabase.from('evt_tipos_evento').select('*');
  console.log('\n📋 Tipos de eventos disponibles:');
  console.log(JSON.stringify(tipos, null, 2));
  
  const { data: estados } = await supabase.from('evt_estados').select('*');
  console.log('\n📊 Estados disponibles:');
  console.log(JSON.stringify(estados, null, 2));
  
  const { data: categorias } = await supabase.from('evt_categorias_gastos').select('*');
  console.log('\n💰 Categorías de gastos disponibles:');
  console.log(JSON.stringify(categorias, null, 2));
}

check().then(() => process.exit(0));
