import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('\n🔍 Verificando estructura de evt_gastos...\n');

// Obtener un gasto de ejemplo
const { data: gastos, error } = await supabase
  .from('evt_gastos')
  .select('*')
  .limit(1);

if (error) {
  console.error('❌ Error:', error);
} else if (gastos && gastos.length > 0) {
  console.log('�� Columnas en evt_gastos:');
  console.log(Object.keys(gastos[0]).join(', '));
  console.log('\n📊 Ejemplo de registro:');
  console.log(JSON.stringify(gastos[0], null, 2));
}

// Verificar cuentas bancarias
const { data: cuentas, error: err2 } = await supabase
  .from('evt_cuentas_bancarias')
  .select('*')
  .limit(3);

if (!err2 && cuentas) {
  console.log('\n🏦 Cuentas Bancarias disponibles:');
  cuentas.forEach(c => console.log(`  ${c.id} - ${c.nombre || c.banco}`));
}
