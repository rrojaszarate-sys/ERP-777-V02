import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 DESCUBRIENDO ESTRUCTURA REAL DE evt_clientes');

async function descubrirEstructura() {
  try {
    // Obtener un registro para ver los campos reales
    const { data: clientes, error } = await supabase
      .from('evt_clientes')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (clientes && clientes.length > 0) {
      console.log(`✅ Encontrados ${clientes.length} clientes`);
      console.log('\n📋 ESTRUCTURA REAL DE evt_clientes:');
      
      const primeraFilaClaves = Object.keys(clientes[0]);
      console.log('   Columnas encontradas:', primeraFilaClaves.join(', '));

      console.log('\n📊 DATOS DE MUESTRA:');
      clientes.forEach((cliente, index) => {
        console.log(`\n   Cliente ${index + 1}:`);
        Object.entries(cliente).forEach(([clave, valor]) => {
          console.log(`      ${clave}: ${valor}`);
        });
      });

      // Contar total de clientes
      const { count } = await supabase
        .from('evt_clientes')
        .select('*', { count: 'exact', head: true });
      
      console.log(`\n📈 TOTAL DE CLIENTES: ${count}`);

    } else {
      console.log('⚠️  No se encontraron clientes en la base de datos');
    }

  } catch (error) {
    console.error('❌ Error crítico:', error);
  }
}

descubrirEstructura();