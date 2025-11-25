import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkVistaFields() {
  const { data, error } = await supabase
    .from('vw_eventos_analisis_financiero')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    const fields = Object.keys(data[0]);
    console.log('\n📋 Campos disponibles en vw_eventos_analisis_financiero:\n');
    fields.forEach((field, idx) => {
      const value = data[0][field];
      const type = typeof value;
      console.log(`${(idx + 1).toString().padStart(3)}. ${field.padEnd(35)} = ${value} (${type})`);
    });
  }
}

checkVistaFields().catch(console.error);
