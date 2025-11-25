import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabase() {
  console.log('\n=== ANÁLISIS DE BASE DE DATOS ===\n');

  // 1. Analizar tabla eventos
  console.log('📊 Analizando estructura de tabla EVENTOS...\n');
  const { data: eventos, error: eventosError } = await supabase
    .from('eventos')
    .select('*')
    .limit(1);

  if (eventosError) {
    console.log('❌ Error en tabla eventos:', eventosError.message);
  } else if (eventos && eventos.length > 0) {
    console.log('✅ Campos disponibles en tabla EVENTOS:');
    console.log(Object.keys(eventos[0]).join(', '));
    console.log('\n📝 Ejemplo de registro:');
    console.log(JSON.stringify(eventos[0], null, 2));
  }

  // 2. Analizar tabla evt_clientes
  console.log('\n\n📊 Analizando estructura de tabla EVT_CLIENTES...\n');
  const { data: clientes, error: clientesError } = await supabase
    .from('evt_clientes')
    .select('*')
    .limit(1);

  if (clientesError) {
    console.log('❌ Error en tabla evt_clientes:', clientesError.message);
  } else if (clientes && clientes.length > 0) {
    console.log('✅ Campos disponibles en tabla EVT_CLIENTES:');
    console.log(Object.keys(clientes[0]).join(', '));
    console.log('\n📝 Ejemplo de registro:');
    console.log(JSON.stringify(clientes[0], null, 2));
  }

  // 3. Contar clientes activos
  const { count: clientesCount } = await supabase
    .from('evt_clientes')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true);

  console.log(`\n\n📈 Total de clientes activos: ${clientesCount}`);

  // 4. Analizar tabla ingresos
  console.log('\n\n📊 Analizando estructura de tabla INGRESOS...\n');
  const { data: ingresos, error: ingresosError } = await supabase
    .from('ingresos')
    .select('*')
    .limit(1);

  if (ingresosError) {
    console.log('❌ Error en tabla ingresos:', ingresosError.message);
  } else if (ingresos && ingresos.length > 0) {
    console.log('✅ Campos disponibles en tabla INGRESOS:');
    console.log(Object.keys(ingresos[0]).join(', '));
  }

  // 5. Analizar tabla gastos
  console.log('\n\n📊 Analizando estructura de tabla GASTOS...\n');
  const { data: gastos, error: gastosError } = await supabase
    .from('gastos')
    .select('*')
    .limit(1);

  if (gastosError) {
    console.log('❌ Error en tabla gastos:', gastosError.message);
  } else if (gastos && gastos.length > 0) {
    console.log('✅ Campos disponibles en tabla GASTOS:');
    console.log(Object.keys(gastos[0]).join(', '));
  }

  // 6. Analizar servicios existentes
  console.log('\n\n📦 Verificando módulos de servicios...\n');
  console.log('Rutas de servicios a verificar:');
  console.log('- src/modules/eventos/services/eventsService.ts');
  console.log('- src/modules/eventos/services/clientsService.ts');
  console.log('- src/services/ingresosService.ts (si existe)');
  console.log('- src/services/gastosService.ts (si existe)');

  console.log('\n\n=== FIN DEL ANÁLISIS ===\n');
}

analyzeDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
