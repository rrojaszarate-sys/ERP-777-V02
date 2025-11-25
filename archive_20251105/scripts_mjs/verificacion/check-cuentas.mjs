import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkCuentas() {
  console.log('\n🔍 Verificando tabla evt_cuentas_contables...\n');
  
  const { data: cuentas, error } = await supabase
    .from('evt_cuentas_contables')
    .select('id, codigo, nombre, tipo')
    .order('id');
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`✅ Total de cuentas encontradas: ${cuentas.length}\n`);
  
  console.log('IDs disponibles:');
  console.log('─'.repeat(80));
  cuentas.forEach(c => {
    console.log(`ID: ${c.id.toString().padEnd(3)} | Código: ${(c.codigo || 'N/A').padEnd(12)} | Tipo: ${(c.tipo || 'N/A').padEnd(10)} | Nombre: ${c.nombre}`);
  });
  console.log('─'.repeat(80));
  
  const ids = cuentas.map(c => c.id);
  console.log(`\nIDs para usar en script: [${ids.join(', ')}]`);
  console.log(`Rango: ${Math.min(...ids)} - ${Math.max(...ids)}\n`);
}

checkCuentas().catch(console.error);
