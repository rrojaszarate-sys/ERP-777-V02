import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 VERIFICACIÓN DE ESTRUCTURA DE BASE DE DATOS ERP-777');
console.log('📅 Fecha:', new Date().toLocaleDateString());

async function verificarEstructura() {
  try {
    console.log('\n📊 VERIFICANDO TABLAS Y DATOS...\n');

    // 1. Verificar clientes
    console.log('1️⃣ TABLA: evt_clientes');
    const { data: clientes, error: errorClientes } = await supabase
      .from('evt_clientes')
      .select('id, nombre, email, telefono, created_at')
      .limit(5);
    
    if (errorClientes) {
      console.log('   ❌ Error:', errorClientes.message);
    } else {
      console.log(`   ✅ Total registros: ${clientes?.length || 0}`);
      if (clientes && clientes.length > 0) {
        console.log('   📋 Muestra de datos:');
        clientes.forEach(c => {
          console.log(`      • ${c.id}: ${c.nombre} (${c.email})`);
        });
      }
    }

    // 2. Verificar estados de eventos
    console.log('\n2️⃣ TABLA: evt_estados');
    const { data: estados, error: errorEstados } = await supabase
      .from('evt_estados')
      .select('*');
    
    if (errorEstados) {
      console.log('   ❌ Error:', errorEstados.message);
    } else {
      console.log(`   ✅ Total registros: ${estados?.length || 0}`);
      if (estados && estados.length > 0) {
        console.log('   📋 Estados disponibles:');
        estados.forEach(e => {
          console.log(`      • ${e.id}: ${e.nombre}`);
        });
      }
    }

    // 3. Verificar tipos de evento
    console.log('\n3️⃣ TABLA: evt_tipos_evento');
    const { data: tipos, error: errorTipos } = await supabase
      .from('evt_tipos_evento')
      .select('*');
    
    if (errorTipos) {
      console.log('   ❌ Error:', errorTipos.message);
    } else {
      console.log(`   ✅ Total registros: ${tipos?.length || 0}`);
      if (tipos && tipos.length > 0) {
        console.log('   📋 Tipos disponibles:');
        tipos.forEach(t => {
          console.log(`      • ${t.id}: ${t.nombre}`);
        });
      }
    }

    // 4. Verificar categorías de gastos
    console.log('\n4️⃣ TABLA: evt_categorias_gastos');
    const { data: categorias, error: errorCategorias } = await supabase
      .from('evt_categorias_gastos')
      .select('*');
    
    if (errorCategorias) {
      console.log('   ❌ Error:', errorCategorias.message);
    } else {
      console.log(`   ✅ Total registros: ${categorias?.length || 0}`);
      if (categorias && categorias.length > 0) {
        console.log('   📋 Categorías disponibles:');
        categorias.forEach(cat => {
          console.log(`      • ${cat.id}: ${cat.nombre}`);
        });
      }
    }

    // 5. Verificar estructura de eventos
    console.log('\n5️⃣ TABLA: evt_eventos (estructura)');
    const { data: eventosEstructura, error: errorEventosEstructura } = await supabase
      .from('evt_eventos')
      .select('*')
      .limit(1);
    
    if (errorEventosEstructura) {
      console.log('   ❌ Error:', errorEventosEstructura.message);
    } else {
      console.log('   ✅ Tabla evt_eventos accesible');
      if (eventosEstructura && eventosEstructura.length > 0) {
        console.log('   📋 Campos detectados:', Object.keys(eventosEstructura[0]).join(', '));
      }
    }

    // 6. Obtener algunos clientes para el script de población
    console.log('\n6️⃣ OBTENER CLIENTES PARA POBLACIÓN');
    const { data: clientesCompletos, error: errorClientesCompletos } = await supabase
      .from('evt_clientes')
      .select('id, nombre, email, telefono')
      .limit(10);
    
    if (errorClientesCompletos) {
      console.log('   ❌ Error:', errorClientesCompletos.message);
    } else {
      console.log(`   ✅ Clientes obtenidos: ${clientesCompletos?.length || 0}`);
      if (clientesCompletos && clientesCompletos.length > 0) {
        console.log('   📋 Lista de clientes:');
        clientesCompletos.forEach(c => {
          console.log(`      • ID: ${c.id} - ${c.nombre}`);
        });
      }
    }

    console.log('\n🏁 VERIFICACIÓN COMPLETADA');
    console.log('💡 Ahora puedes crear el script de población con los datos verificados');

  } catch (error) {
    console.error('❌ Error crítico durante la verificación:', error);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar verificación
verificarEstructura();