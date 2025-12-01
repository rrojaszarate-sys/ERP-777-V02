import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log('=== ESTRUCTURA DE users_erp ===\n');

  const { data, error } = await supabase
    .from('users_erp')
    .select('*')
    .limit(1);

  if (error) {
    console.log('ERROR:', error.message);
    return;
  }

  if (data && data[0]) {
    console.log('Columnas disponibles:');
    Object.keys(data[0]).forEach(k => {
      console.log('  -', k + ':', data[0][k]);
    });
  }
}

check();
