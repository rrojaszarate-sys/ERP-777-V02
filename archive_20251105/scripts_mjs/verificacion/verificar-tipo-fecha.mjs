import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU'
);

async function verificar() {
  const { data } = await supabase
    .from('evt_eventos')
    .select('id, fecha_evento, created_at')
    .limit(1)
    .single();

  console.log('Ejemplo de evento:');
  console.log(data);
  console.log('\nTipo de fecha_evento:', typeof data.fecha_evento);
  console.log('Valor:', data.fecha_evento);
}

verificar();
