import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('\n🔍 Verificando estructura de evt_gastos...\n');

const { data: gastos, error } = await supabase
  .from('evt_gastos')
  .select('*')
  .limit(1);

if (error) {
  console.error('❌ Error:', error);
} else if (gastos && gastos.length > 0) {
  console.log('📋 Columnas:');
  console.log(Object.keys(gastos[0]).sort().join(', '));
}

const { data: cuentas } = await supabase
  .from('evt_cuentas_bancarias')
  .select('*')
  .limit(3);

if (cuentas) {
  console.log('\n🏦 Cuentas Bancarias:');
  cuentas.forEach(c => console.log(`  ${c.nombre || c.banco} (${c.numero})`));
}
