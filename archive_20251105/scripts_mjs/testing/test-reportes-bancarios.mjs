import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('\n🔍 Verificando datos para Reportes Bancarios...\n');

// 1. Verificar cuentas bancarias
console.log('📊 CUENTAS BANCARIAS:');
const { data: cuentas } = await supabase
  .from('evt_cuentas_bancarias')
  .select('*')
  .eq('activa', true);

if (cuentas && cuentas.length > 0) {
  console.log(`✅ ${cuentas.length} cuentas bancarias activas:`);
  cuentas.forEach(c => console.log(`   - ${c.nombre} (${c.banco})`));
} else {
  console.log('❌ No hay cuentas bancarias activas');
}

// 2. Verificar eventos
console.log('\n📊 EVENTOS:');
const { data: eventos } = await supabase
  .from('evt_eventos')
  .select('id, nombre_evento, fecha_evento')
  .eq('activo', true)
  .order('fecha_evento', { ascending: false })
  .limit(5);

if (eventos && eventos.length > 0) {
  console.log(`✅ ${eventos.length} eventos activos (primeros 5):`);
  eventos.forEach(e => console.log(`   - ${e.nombre_evento} (${e.fecha_evento})`));
} else {
  console.log('❌ No hay eventos activos');
}

// 3. Verificar gastos con cuenta bancaria
console.log('\n📊 GASTOS:');
const { data: gastos } = await supabase
  .from('evt_gastos')
  .select('id, concepto, total, fecha_gasto, cuenta_bancaria_id, evento_id')
  .eq('activo', true)
  .not('cuenta_bancaria_id', 'is', null)
  .limit(5);

if (gastos && gastos.length > 0) {
  console.log(`✅ ${gastos.length} gastos con cuenta bancaria (primeros 5):`);
  gastos.forEach(g => console.log(`   - ${g.concepto}: $${g.total} (${g.fecha_gasto})`));
} else {
  console.log('❌ No hay gastos con cuenta bancaria asignada');
}

// 4. Verificar total de gastos activos
const { count } = await supabase
  .from('evt_gastos')
  .select('*', { count: 'exact', head: true })
  .eq('activo', true);

console.log(`\n📈 Total de gastos activos: ${count || 0}`);

// 5. Verificar gastos del mes actual
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

const { data: gastosMes } = await supabase
  .from('evt_gastos')
  .select('total')
  .eq('activo', true)
  .gte('fecha_gasto', startOfMonth.toISOString().split('T')[0])
  .lte('fecha_gasto', endOfMonth.toISOString().split('T')[0]);

const totalMes = gastosMes?.reduce((sum, g) => sum + (g.total || 0), 0) || 0;
console.log(`💰 Total gastos mes actual: $${totalMes.toFixed(2)} (${gastosMes?.length || 0} registros)`);
