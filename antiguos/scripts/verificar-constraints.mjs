import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verificando constraints de evt_gastos');

async function verificarConstraints() {
  try {
    // Consultar constraints usando SQL directo
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          constraint_name, 
          constraint_type,
          check_clause
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.check_constraints cc 
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'evt_gastos' 
          AND tc.constraint_type = 'CHECK';
      `
    });

    if (error) {
      console.log('Error consultando constraints:', error.message);
      
      // Intentar método alternativo - insertar un registro de prueba
      console.log('\n🧪 Probando inserción básica...');
      
      const { error: testError } = await supabase
        .from('evt_gastos')
        .insert({
          evento_id: 1, // Asumimos que existe
          concepto: 'TEST',
          cantidad: 1,
          precio_unitario: 1000,
          subtotal: 1000,
          total: 1160
        });
        
      if (testError) {
        console.log('Error en prueba básica:', testError.message);
      } else {
        console.log('✅ Inserción básica exitosa');
        
        // Eliminar registro de prueba
        await supabase.from('evt_gastos').delete().eq('concepto', 'TEST');
      }
      
    } else {
      console.log('✅ Constraints encontrados:', data);
    }

  } catch (error) {
    console.error('Error general:', error);
  }
}

verificarConstraints();