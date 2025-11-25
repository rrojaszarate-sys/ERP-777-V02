import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gomnouwackzvthpwyric.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY5NTk0MzcsImV4cCI6MjA0MjUzNTQzN30.qkonstruRtZxH8D2OBbT3uUpUWpKT8JgS8HQWSXR6M0M'
);

console.log('🔍 DIAGNÓSTICO DE GASTOS EN VISTAS\n');

// 1. Contar gastos pagados
const { data: gastosPagados, error: e1 } = await supabase
  .from('evt_gastos')
  .select('id, total, pagado, evento_id')
  .eq('pagado', true);

console.log('📊 GASTOS PAGADOS EN TABLA:');
console.log(`  Total registros: ${gastosPagados?.length || 0}`);
console.log(`  Total monto: $${gastosPagados?.reduce((sum, g) => sum + (g.total || 0), 0).toFixed(2)}`);

// 2. Ver vista vw_eventos_completos
const { data: vistaCompletos, error: e2 } = await supabase
  .from('vw_eventos_completos')
  .select('id, clave_evento, total_gastos, cantidad_gastos');

console.log('\n📊 VISTA VW_EVENTOS_COMPLETOS:');
const totalGastosVista = vistaCompletos?.reduce((sum, e) => sum + (parseFloat(e.total_gastos) || 0), 0);
const totalCantidadGastos = vistaCompletos?.reduce((sum, e) => sum + (e.cantidad_gastos || 0), 0);
console.log(`  Total gastos sumados: $${totalGastosVista?.toFixed(2)}`);
console.log(`  Cantidad total gastos: ${totalCantidadGastos}`);

// 3. Mostrar primeros 5 eventos
console.log('\n📋 PRIMEROS 5 EVENTOS:');
vistaCompletos?.slice(0, 5).forEach(e => {
  console.log(`  ${e.clave_evento}: Gastos=$${e.total_gastos || 0} (${e.cantidad_gastos || 0} items)`);
});

// 4. Buscar eventos con gastos pagados pero total_gastos = 0
const eventosConGastosPagados = gastosPagados?.map(g => g.evento_id);
const eventosUnicos = [...new Set(eventosConGastosPagados)];

console.log(`\n🔍 EVENTOS CON GASTOS PAGADOS: ${eventosUnicos.length}`);

const vistaConGastosCero = vistaCompletos?.filter(e => 
  eventosUnicos.includes(e.id) && (parseFloat(e.total_gastos) || 0) === 0
);

console.log(`⚠️  Eventos con gastos pagados pero total_gastos=0: ${vistaConGastosCero?.length || 0}`);

if (vistaConGastosCero?.length > 0) {
  console.log('\n❌ PROBLEMA DETECTADO:');
  console.log('   La vista NO está calculando los gastos correctamente');
  console.log('   El LEFT JOIN LATERAL posiblemente tiene un error');
}

process.exit(0);
