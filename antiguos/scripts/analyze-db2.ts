import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabase() {
  console.log('\n=== BUSCANDO TABLAS DE EVENTOS ===\n');

  const tablesToCheck = [
    'eventos',
    'evt_eventos', 
    'event',
    'vw_eventos_completos'
  ];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error && data) {
      console.log(`\n✅ Tabla encontrada: ${table}`);
      console.log('Campos:', Object.keys(data[0] || {}).join(', '));
      if (data[0]) {
        console.log('\nEjemplo:', JSON.stringify(data[0], null, 2));
      }
    } else if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }

  console.log('\n\n=== BUSCANDO TABLAS DE INGRESOS ===\n');
  
  const ingresosTablas = ['ingresos', 'evt_ingresos', 'cfdi_ingresos'];
  
  for (const table of ingresosTablas) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error && data) {
      console.log(`\n✅ Tabla encontrada: ${table}`);
      console.log('Campos:', Object.keys(data[0] || {}).join(', '));
    } else if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }

  console.log('\n\n=== BUSCANDO TABLAS DE GASTOS ===\n');
  
  const gastosTablas = ['gastos', 'evt_gastos', 'expenses'];
  
  for (const table of gastosTablas) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error && data) {
      console.log(`\n✅ Tabla encontrada: ${table}`);
      console.log('Campos:', Object.keys(data[0] || {}).join(', '));
    } else if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
}

analyzeDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
