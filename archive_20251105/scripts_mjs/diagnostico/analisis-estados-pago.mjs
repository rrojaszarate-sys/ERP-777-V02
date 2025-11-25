import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Analiza y reporta estados de ingresos
 */
async function analizarIngresos() {
  console.log('\n💰 ANÁLISIS DE INGRESOS');
  console.log('═══════════════════════════════════════════════════════\n');

  // Total de ingresos
  const { count: totalIngresos } = await supabase
    .from('evt_ingresos')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true);

  console.log(`📊 Total de ingresos activos: ${totalIngresos}`);

  // Ingresos pendientes (no cobrados, no facturados)
  const { data: pendientes, count: countPendientes } = await supabase
    .from('evt_ingresos')
    .select('id, concepto, total, facturado, cobrado', { count: 'exact' })
    .eq('activo', true)
    .eq('cobrado', false)
    .eq('facturado', false)
    .limit(10);

  const { data: sumPendientes } = await supabase
    .from('evt_ingresos')
    .select('total')
    .eq('activo', true)
    .eq('cobrado', false)
    .eq('facturado', false);

  const totalPendientes = sumPendientes?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  console.log(`\n🔴 PENDIENTES (sin cobrar, sin facturar):`);
  console.log(`   Cantidad: ${countPendientes}`);
  console.log(`   Monto Total: $${totalPendientes.toFixed(2)}`);
  console.log(`   Porcentaje: ${((countPendientes / totalIngresos) * 100).toFixed(2)}%`);
  console.log(`   Ejemplos:`);
  pendientes?.slice(0, 5).forEach(ing => {
    console.log(`     - ID ${ing.id}: ${ing.concepto} - $${ing.total}`);
  });

  // Ingresos facturados pero no cobrados
  const { data: facturados, count: countFacturados } = await supabase
    .from('evt_ingresos')
    .select('id, concepto, total, facturado, cobrado', { count: 'exact' })
    .eq('activo', true)
    .eq('facturado', true)
    .eq('cobrado', false)
    .limit(10);

  const { data: sumFacturados } = await supabase
    .from('evt_ingresos')
    .select('total')
    .eq('activo', true)
    .eq('facturado', true)
    .eq('cobrado', false);

  const totalFacturados = sumFacturados?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  console.log(`\n🟡 FACTURADOS (sin cobrar):`);
  console.log(`   Cantidad: ${countFacturados}`);
  console.log(`   Monto Total: $${totalFacturados.toFixed(2)}`);
  console.log(`   Porcentaje: ${((countFacturados / totalIngresos) * 100).toFixed(2)}%`);
  console.log(`   Ejemplos:`);
  facturados?.slice(0, 5).forEach(ing => {
    console.log(`     - ID ${ing.id}: ${ing.concepto} - $${ing.total}`);
  });

  // Ingresos cobrados
  const { data: cobrados, count: countCobrados } = await supabase
    .from('evt_ingresos')
    .select('id, concepto, total, facturado, cobrado', { count: 'exact' })
    .eq('activo', true)
    .eq('cobrado', true)
    .limit(10);

  const { data: sumCobrados } = await supabase
    .from('evt_ingresos')
    .select('total')
    .eq('activo', true)
    .eq('cobrado', true);

  const totalCobrados = sumCobrados?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  console.log(`\n🟢 COBRADOS:`);
  console.log(`   Cantidad: ${countCobrados}`);
  console.log(`   Monto Total: $${totalCobrados.toFixed(2)}`);
  console.log(`   Porcentaje: ${((countCobrados / totalIngresos) * 100).toFixed(2)}%`);
  console.log(`   Ejemplos:`);
  cobrados?.slice(0, 5).forEach(ing => {
    console.log(`     - ID ${ing.id}: ${ing.concepto} - $${ing.total}`);
  });

  // Resumen financiero
  console.log(`\n💵 RESUMEN FINANCIERO DE INGRESOS:`);
  console.log(`   Total por Cobrar (Pendientes): $${totalPendientes.toFixed(2)}`);
  console.log(`   Total por Cobrar (Facturados): $${totalFacturados.toFixed(2)}`);
  console.log(`   Total Cobrado: $${totalCobrados.toFixed(2)}`);
  console.log(`   ───────────────────────────────────────────`);
  console.log(`   TOTAL GENERAL: $${(totalPendientes + totalFacturados + totalCobrados).toFixed(2)}`);
}

/**
 * Analiza y reporta estados de gastos
 */
async function analizarGastos() {
  console.log('\n\n💸 ANÁLISIS DE GASTOS');
  console.log('═══════════════════════════════════════════════════════\n');

  // Total de gastos
  const { count: totalGastos } = await supabase
    .from('evt_gastos')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true);

  console.log(`📊 Total de gastos activos: ${totalGastos}`);

  // Gastos pendientes (no pagados, no comprobados)
  const { data: pendientes, count: countPendientes } = await supabase
    .from('evt_gastos')
    .select('id, concepto, total, pagado, comprobado', { count: 'exact' })
    .eq('activo', true)
    .eq('pagado', false)
    .eq('comprobado', false)
    .limit(10);

  const { data: sumPendientes } = await supabase
    .from('evt_gastos')
    .select('total')
    .eq('activo', true)
    .eq('pagado', false)
    .eq('comprobado', false);

  const totalPendientes = sumPendientes?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  console.log(`\n🔴 PENDIENTES (sin pagar, sin comprobar):`);
  console.log(`   Cantidad: ${countPendientes}`);
  console.log(`   Monto Total: $${totalPendientes.toFixed(2)}`);
  console.log(`   Porcentaje: ${((countPendientes / totalGastos) * 100).toFixed(2)}%`);
  console.log(`   Ejemplos:`);
  pendientes?.slice(0, 5).forEach(gasto => {
    console.log(`     - ID ${gasto.id}: ${gasto.concepto} - $${gasto.total}`);
  });

  // Gastos comprobados pero no pagados
  const { data: comprobados, count: countComprobados } = await supabase
    .from('evt_gastos')
    .select('id, concepto, total, pagado, comprobado', { count: 'exact' })
    .eq('activo', true)
    .eq('comprobado', true)
    .eq('pagado', false)
    .limit(10);

  const { data: sumComprobados } = await supabase
    .from('evt_gastos')
    .select('total')
    .eq('activo', true)
    .eq('comprobado', true)
    .eq('pagado', false);

  const totalComprobados = sumComprobados?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  console.log(`\n🟡 COMPROBADOS (sin pagar):`);
  console.log(`   Cantidad: ${countComprobados}`);
  console.log(`   Monto Total: $${totalComprobados.toFixed(2)}`);
  console.log(`   Porcentaje: ${((countComprobados / totalGastos) * 100).toFixed(2)}%`);
  console.log(`   Ejemplos:`);
  comprobados?.slice(0, 5).forEach(gasto => {
    console.log(`     - ID ${gasto.id}: ${gasto.concepto} - $${gasto.total}`);
  });

  // Gastos pagados
  const { data: pagados, count: countPagados } = await supabase
    .from('evt_gastos')
    .select('id, concepto, total, pagado, comprobado', { count: 'exact' })
    .eq('activo', true)
    .eq('pagado', true)
    .limit(10);

  const { data: sumPagados } = await supabase
    .from('evt_gastos')
    .select('total')
    .eq('activo', true)
    .eq('pagado', true);

  const totalPagados = sumPagados?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  console.log(`\n🟢 PAGADOS:`);
  console.log(`   Cantidad: ${countPagados}`);
  console.log(`   Monto Total: $${totalPagados.toFixed(2)}`);
  console.log(`   Porcentaje: ${((countPagados / totalGastos) * 100).toFixed(2)}%`);
  console.log(`   Ejemplos:`);
  pagados?.slice(0, 5).forEach(gasto => {
    console.log(`     - ID ${gasto.id}: ${gasto.concepto} - $${gasto.total}`);
  });

  // Resumen financiero
  console.log(`\n💵 RESUMEN FINANCIERO DE GASTOS:`);
  console.log(`   Total por Pagar (Pendientes): $${totalPendientes.toFixed(2)}`);
  console.log(`   Total por Pagar (Comprobados): $${totalComprobados.toFixed(2)}`);
  console.log(`   Total Pagado: $${totalPagados.toFixed(2)}`);
  console.log(`   ───────────────────────────────────────────`);
  console.log(`   TOTAL GENERAL: $${(totalPendientes + totalComprobados + totalPagados).toFixed(2)}`);
}

/**
 * Análisis de flujo de caja
 */
async function analizarFlujoCaja() {
  console.log('\n\n💰 ANÁLISIS DE FLUJO DE CAJA');
  console.log('═══════════════════════════════════════════════════════\n');

  // Ingresos por cobrar
  const { data: ingresosPorCobrar } = await supabase
    .from('evt_ingresos')
    .select('total')
    .eq('activo', true)
    .eq('cobrado', false);

  const totalPorCobrar = ingresosPorCobrar?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  // Gastos por pagar
  const { data: gastosPorPagar } = await supabase
    .from('evt_gastos')
    .select('total')
    .eq('activo', true)
    .eq('pagado', false);

  const totalPorPagar = gastosPorPagar?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  // Ingresos cobrados
  const { data: ingresosCobrados } = await supabase
    .from('evt_ingresos')
    .select('total')
    .eq('activo', true)
    .eq('cobrado', true);

  const totalCobrado = ingresosCobrados?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  // Gastos pagados
  const { data: gastosPagados } = await supabase
    .from('evt_gastos')
    .select('total')
    .eq('activo', true)
    .eq('pagado', true);

  const totalPagado = gastosPagados?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  console.log('📊 SITUACIÓN ACTUAL:');
  console.log(`   💵 Por Cobrar: $${totalPorCobrar.toFixed(2)}`);
  console.log(`   💸 Por Pagar: $${totalPorPagar.toFixed(2)}`);
  console.log(`   ─────────────────────────────────────────────`);
  console.log(`   📈 Balance Pendiente: $${(totalPorCobrar - totalPorPagar).toFixed(2)}`);

  console.log('\n💰 EFECTIVO:');
  console.log(`   ✅ Cobrado: $${totalCobrado.toFixed(2)}`);
  console.log(`   ❌ Pagado: $${totalPagado.toFixed(2)}`);
  console.log(`   ─────────────────────────────────────────────`);
  console.log(`   💎 Efectivo Neto: $${(totalCobrado - totalPagado).toFixed(2)}`);

  console.log('\n📊 PROYECCIÓN TOTAL:');
  const totalIngresos = totalPorCobrar + totalCobrado;
  const totalGastos = totalPorPagar + totalPagado;
  const utilidadProyectada = totalIngresos - totalGastos;
  const margenProyectado = totalIngresos > 0 ? (utilidadProyectada / totalIngresos) * 100 : 0;

  console.log(`   📥 Total Ingresos (cobrados + por cobrar): $${totalIngresos.toFixed(2)}`);
  console.log(`   📤 Total Gastos (pagados + por pagar): $${totalGastos.toFixed(2)}`);
  console.log(`   ─────────────────────────────────────────────`);
  console.log(`   💰 Utilidad Proyectada: $${utilidadProyectada.toFixed(2)}`);
  console.log(`   📊 Margen Proyectado: ${margenProyectado.toFixed(2)}%`);
}

/**
 * Verificar integridad de datos
 */
async function verificarIntegridad() {
  console.log('\n\n🔍 VERIFICACIÓN DE INTEGRIDAD DE DATOS');
  console.log('═══════════════════════════════════════════════════════\n');

  // Verificar ingresos sin monto
  const { count: ingresosSinMonto } = await supabase
    .from('evt_ingresos')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)
    .or('total.is.null,total.eq.0');

  console.log(`${ingresosSinMonto === 0 ? '✅' : '⚠️'} Ingresos sin monto: ${ingresosSinMonto}`);

  // Verificar gastos sin monto
  const { count: gastosSinMonto } = await supabase
    .from('evt_gastos')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)
    .or('total.is.null,total.eq.0');

  console.log(`${gastosSinMonto === 0 ? '✅' : '⚠️'} Gastos sin monto: ${gastosSinMonto}`);

  // Verificar ingresos cobrados sin fecha
  const { count: cobradosSinFecha } = await supabase
    .from('evt_ingresos')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)
    .eq('cobrado', true)
    .is('fecha_cobro', null);

  console.log(`${cobradosSinFecha === 0 ? '✅' : '⚠️'} Ingresos cobrados sin fecha de cobro: ${cobradosSinFecha}`);

  // Verificar gastos pagados sin fecha
  const { count: pagadosSinFecha } = await supabase
    .from('evt_gastos')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)
    .eq('pagado', true)
    .is('fecha_pago', null);

  console.log(`${pagadosSinFecha === 0 ? '✅' : '⚠️'} Gastos pagados sin fecha de pago: ${pagadosSinFecha}`);

  console.log('\n✅ Verificación completada');
}

/**
 * Ejecutar análisis completo
 */
async function ejecutarAnalisis() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     ANÁLISIS COMPLETO DE ESTADOS DE PAGO                  ║');
  console.log('║     Verificación de Reportes - Sistema de Pruebas         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  await analizarIngresos();
  await analizarGastos();
  await analizarFlujoCaja();
  await verificarIntegridad();

  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('✅ Análisis completado exitosamente');
  console.log('═══════════════════════════════════════════════════════\n');
}

ejecutarAnalisis().catch(console.error);
