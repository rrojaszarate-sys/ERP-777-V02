import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Buscando tabla de clientes...\n');

async function verificarTablas() {
  try {
    // Buscar todas las tablas que contengan "client" o "clien"
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .like('table_name', '%client%')
      .eq('table_schema', 'public');

    if (error) {
      console.log('❌ Error con "client", probando con otras variantes...\n');
    } else if (data && data.length > 0) {
      console.log('✅ Tablas encontradas con "client":');
      data.forEach(t => console.log('   - ' + t.table_name));
      return;
    }

    // Intentar obtener estructura de evt_eventos para ver el nombre de la FK
    console.log('📊 Verificando estructura de evt_eventos:\n');

    const { data: eventos, error: errorEvento } = await supabase
      .from('evt_eventos')
      .select('id, cliente_id, clave_evento')
      .limit(1);

    if (errorEvento) {
      console.log('❌ Error:', errorEvento.message);
    } else {
      console.log('✅ Columnas en evt_eventos:');
      if (eventos && eventos.length > 0) {
        console.log('   Ejemplo de registro:', eventos[0]);
      }
    }

    // Intentar queries directas con diferentes nombres posibles
    const posiblesNombres = [
      'clientes',
      'cliente',
      'crm_cliente',
      'evt_clientes',
      'evt_cliente',
      'customers',
      'customer'
    ];

    console.log('\n🔎 Probando nombres posibles de tabla:\n');

    for (const nombre of posiblesNombres) {
      const { data: test, error: testError } = await supabase
        .from(nombre)
        .select('id')
        .limit(1);

      if (!testError) {
        console.log(`✅ ENCONTRADA: "${nombre}"`);

        // Obtener columnas de esta tabla
        const { data: cols } = await supabase
          .from(nombre)
          .select('*')
          .limit(1);

        if (cols && cols.length > 0) {
          console.log('   Columnas disponibles:', Object.keys(cols[0]).join(', '));
        }
      } else {
        console.log(`❌ No existe: "${nombre}"`);
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

verificarTablas();
