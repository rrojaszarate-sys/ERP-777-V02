import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Verificar columnas de cuentas bancarias
const { data: cuenta } = await supabase
  .from('evt_cuentas_bancarias')
  .select('*')
  .limit(1);

if (cuenta && cuenta.length > 0) {
  console.log('\n📋 Columnas de evt_cuentas_bancarias:');
  console.log(Object.keys(cuenta[0]).sort().join(', '));
  console.log('\n Ejemplo:');
  console.log(JSON.stringify(cuenta[0], null, 2));
}

// Verificar columnas de eventos
const { data: evento } = await supabase
  .from('evt_eventos')
  .select('*')
  .limit(1);

if (evento && evento.length > 0) {
  console.log('\n\n📋 Columnas de evt_eventos:');
  console.log(Object.keys(evento[0]).sort().join(', '));
}
