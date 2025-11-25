import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gomnouwackzvthpwyric.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY5NTk0MzcsImV4cCI6MjA0MjUzNTQzN30.qkonstruRtZxH8D2OBbT3uUpUWpKT8JgS8HQWSXR6M0M'
);

console.log('\n🔍 VALIDACIÓN RÁPIDA DE VISTAS FINANCIERAS\n');

// 1. Totales reales de la base de datos
const { data: ingresosCobrados } = await supabase
  .from('evt_ingresos')
  .select('total')
  .eq('cobrado', true);

const { data: gastosPagados } = await supabase
  .from('evt_gastos')
  .select('total')
  .eq('pagado', true);

const totalIngresosReal = ingresosCobrados?.reduce((sum, i) => sum + (i.total || 0), 0) || 0;
const totalGastosReal = gastosPagados?.reduce((sum, g) => sum + (g.total || 0), 0) || 0;

console.log('📊 TOTALES REALES (tabla base):');
console.log(`   Ingresos cobrados: $${totalIngresosReal.toFixed(2)}`);
console.log(`   Gastos pagados:    $${totalGastosReal.toFixed(2)}`);

// 2. Totales en vw_eventos_completos
const { data: vistaCompletos } = await supabase
  .from('vw_eventos_completos')
  .select('total, total_gastos');

const totalIngresosVista = vistaCompletos?.reduce((sum, e) => sum + (parseFloat(e.total) || 0), 0) || 0;
const totalGastosVista = vistaCompletos?.reduce((sum, e) => sum + (parseFloat(e.total_gastos) || 0), 0) || 0;

console.log('\n📊 TOTALES EN vw_eventos_completos:');
console.log(`   Ingresos: $${totalIngresosVista.toFixed(2)}`);
console.log(`   Gastos:   $${totalGastosVista.toFixed(2)}`);

// 3. Comparación
const difIngresos = Math.abs(totalIngresosReal - totalIngresosVista);
const difGastos = Math.abs(totalGastosReal - totalGastosVista);

console.log('\n🔍 DIFERENCIAS:');
console.log(`   Ingresos: $${difIngresos.toFixed(2)} ${difIngresos < 0.01 ? '✅' : '❌'}`);
console.log(`   Gastos:   $${difGastos.toFixed(2)} ${difGastos < 0.01 ? '✅' : '❌'}`);

// 4. Resultado final
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (difIngresos < 0.01 && difGastos < 0.01) {
  console.log('✅ ¡CORRECCIÓN EXITOSA!');
  console.log('   Las vistas ahora muestran los totales correctos.');
  console.log('   Solo incluyen transacciones cobradas/pagadas.');
} else {
  console.log('❌ PROBLEMA PERSISTE');
  console.log('   Las vistas aún tienen discrepancias.');
  if (difGastos >= 0.01) {
    console.log(`   → Gastos: Diferencia de $${difGastos.toFixed(2)}`);
  }
  if (difIngresos >= 0.01) {
    console.log(`   → Ingresos: Diferencia de $${difIngresos.toFixed(2)}`);
  }
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

process.exit(difIngresos < 0.01 && difGastos < 0.01 ? 0 : 1);
