import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧹 SCRIPT DE LIMPIEZA DE BASE DE DATOS ERP-777');
console.log('📅 Fecha:', new Date().toLocaleDateString());
console.log('⚠️  ADVERTENCIA: Este script eliminará TODOS los gastos, ingresos y eventos\n');

async function limpiarBaseDatos() {
  try {
    console.log('🔍 PASO 1: Verificando conexión a Supabase...');
    
    // Probar conexión
    const { data: conexion, error: errorConexion } = await supabase
      .from('evt_estados')
      .select('count')
      .limit(1);
    
    if (errorConexion) {
      console.error('❌ Error de conexión a Supabase:', errorConexion.message);
      return;
    }
    
    console.log('✅ Conexión a Supabase exitosa\n');

    console.log('📊 PASO 2: Consultando estado actual de la base de datos...');
    
    // Contar registros existentes
    const { count: totalGastos } = await supabase
      .from('evt_gastos')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalIngresos } = await supabase
      .from('evt_ingresos')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalEventos } = await supabase
      .from('evt_eventos')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalClientes } = await supabase
      .from('evt_clientes')
      .select('*', { count: 'exact', head: true });

    console.log('📈 Estado actual:');
    console.log(`   • Gastos: ${totalGastos || 0}`);
    console.log(`   • Ingresos: ${totalIngresos || 0}`);
    console.log(`   • Eventos: ${totalEventos || 0}`);
    console.log(`   • Clientes: ${totalClientes || 0}\n`);

    if (totalGastos === 0 && totalIngresos === 0 && totalEventos === 0) {
      console.log('✅ La base de datos ya está limpia. No hay nada que eliminar.');
      return;
    }

    console.log('🧹 PASO 3: Iniciando limpieza en orden correcto...');

    // 3.1 Eliminar GASTOS primero (tienen FK a eventos)
    console.log('   🗑️  Eliminando GASTOS...');
    const { error: errorGastos } = await supabase
      .from('evt_gastos')
      .delete()
      .neq('id', 0); // Eliminar todos (neq 0 es un truco para "eliminar todo")
    
    if (errorGastos) {
      console.error('❌ Error al eliminar gastos:', errorGastos.message);
      return;
    }
    console.log('   ✅ Gastos eliminados');

    // 3.2 Eliminar INGRESOS (tienen FK a eventos)
    console.log('   🗑️  Eliminando INGRESOS...');
    const { error: errorIngresos } = await supabase
      .from('evt_ingresos')
      .delete()
      .neq('id', 0);
    
    if (errorIngresos) {
      console.error('❌ Error al eliminar ingresos:', errorIngresos.message);
      return;
    }
    console.log('   ✅ Ingresos eliminados');

    // 3.3 Eliminar EVENTOS (pueden tener FK a clientes)
    console.log('   🗑️  Eliminando EVENTOS...');
    const { error: errorEventos } = await supabase
      .from('evt_eventos')
      .delete()
      .neq('id', 0);
    
    if (errorEventos) {
      console.error('❌ Error al eliminar eventos:', errorEventos.message);
      return;
    }
    console.log('   ✅ Eventos eliminados');

    // NOTA: NO eliminamos clientes para preservar datos históricos
    console.log('   ℹ️  Clientes preservados para referencia histórica\n');

    console.log('🔍 PASO 4: Verificando limpieza...');
    
    // Verificar que se eliminaron
    const { count: gastosRestantes } = await supabase
      .from('evt_gastos')
      .select('*', { count: 'exact', head: true });
    
    const { count: ingresosRestantes } = await supabase
      .from('evt_ingresos')
      .select('*', { count: 'exact', head: true });
    
    const { count: eventosRestantes } = await supabase
      .from('evt_eventos')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Estado después de limpieza:');
    console.log(`   • Gastos restantes: ${gastosRestantes || 0}`);
    console.log(`   • Ingresos restantes: ${ingresosRestantes || 0}`);
    console.log(`   • Eventos restantes: ${eventosRestantes || 0}`);
    console.log(`   • Clientes preservados: ${totalClientes || 0}\n`);

    if ((gastosRestantes || 0) === 0 && (ingresosRestantes || 0) === 0 && (eventosRestantes || 0) === 0) {
      console.log('🎉 LIMPIEZA COMPLETADA EXITOSAMENTE!');
      console.log('✅ Base de datos lista para nuevos datos');
    } else {
      console.log('⚠️  ADVERTENCIA: Algunos registros no se eliminaron completamente');
    }

    console.log('\n🔍 PASO 5: Verificando estructura de tablas...');
    
    // Verificar que las tablas existen y tienen la estructura esperada
    const tablasAVerificar = [
      'evt_clientes',
      'evt_eventos', 
      'evt_ingresos',
      'evt_gastos',
      'evt_estados',
      'evt_tipos_evento',
      'evt_categorias_gastos'
    ];

    for (const tabla of tablasAVerificar) {
      try {
        const { data, error } = await supabase
          .from(tabla)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ Tabla ${tabla}: ${error.message}`);
        } else {
          console.log(`   ✅ Tabla ${tabla}: OK`);
        }
      } catch (e) {
        console.log(`   ❌ Tabla ${tabla}: Error de acceso`);
      }
    }

    console.log('\n🏁 Proceso de limpieza completado');
    console.log('💡 Ahora puedes ejecutar el script de población de datos');

  } catch (error) {
    console.error('❌ Error crítico durante la limpieza:', error.message);
  }
}

// Ejecutar limpieza
limpiarBaseDatos();