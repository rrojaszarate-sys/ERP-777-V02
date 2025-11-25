import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verificando TODAS las tablas necesarias...\n');

async function verificarTablas() {
  try {
    // 1. Verificar tabla de estados
    console.log('1️⃣ Buscando tabla de estados de evento:\n');

    const posiblesEstados = [
      'evt_estados_evento',
      'evt_estados',
      'estados_evento',
      'estados',
      'event_status',
      'evt_status'
    ];

    let tablaEstados = null;

    for (const nombre of posiblesEstados) {
      const { data, error } = await supabase
        .from(nombre)
        .select('*')
        .limit(1);

      if (!error) {
        console.log(`   ✅ ENCONTRADA: "${nombre}"`);
        if (data && data.length > 0) {
          console.log(`   Columnas: ${Object.keys(data[0]).join(', ')}\n`);
        }
        tablaEstados = nombre;
        break;
      }
    }

    if (!tablaEstados) {
      console.log('   ⚠️ No se encontró tabla de estados\n');
    }

    // 2. Verificar si evt_eventos tiene campo estado_id
    console.log('2️⃣ Verificando campo estado_id en evt_eventos:\n');

    const { data: evento } = await supabase
      .from('evt_eventos')
      .select('id, estado_id, clave_evento')
      .limit(1)
      .single();

    if (evento) {
      console.log('   ✅ evt_eventos tiene campo estado_id:', evento.estado_id);
      console.log('   Tipo:', typeof evento.estado_id, '\n');
    }

    // 3. Listar TODAS las tablas que empiezan con evt_
    console.log('3️⃣ Todas las tablas disponibles que empiezan con evt_:\n');

    const { data: allTables, error: errorTables } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name LIKE 'evt_%'
          ORDER BY table_name;
        `
      });

    if (errorTables) {
      // Intentar método alternativo
      const tablasPosibles = [
        'evt_eventos',
        'evt_clientes',
        'evt_ingresos',
        'evt_gastos',
        'evt_estados',
        'evt_estados_evento',
        'evt_tipos_evento',
        'evt_categorias'
      ];

      for (const tabla of tablasPosibles) {
        const { error } = await supabase
          .from(tabla)
          .select('id')
          .limit(1);

        if (!error) {
          console.log(`   ✅ ${tabla}`);
        }
      }
    } else {
      allTables.forEach(t => console.log(`   ✅ ${t.table_name}`));
    }

    // 4. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log('='.repeat(60));
    console.log(`Tabla de clientes: evt_clientes ✅`);
    console.log(`Tabla de estados: ${tablaEstados || '❌ NO ENCONTRADA'}`);
    console.log('\n💡 RECOMENDACIÓN:');
    if (!tablaEstados) {
      console.log('   La tabla de estados NO existe.');
      console.log('   Se debe ELIMINAR el JOIN con estados en la migración.');
    } else {
      console.log(`   Usar: LEFT JOIN ${tablaEstados} es ON e.estado_id = es.id`);
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verificarTablas();
