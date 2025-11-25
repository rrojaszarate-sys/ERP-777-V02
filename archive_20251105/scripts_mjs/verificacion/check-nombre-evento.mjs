import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { data } = await supabase
  .from('evt_eventos')
  .select('id, nombre_evento, nombre_proyecto')
  .eq('activo', true)
  .limit(3);

console.log('\n📊 Ejemplos de eventos:');
data?.forEach(e => console.log(e));
