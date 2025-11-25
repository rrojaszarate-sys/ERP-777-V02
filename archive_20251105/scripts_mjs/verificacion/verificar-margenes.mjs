import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function verificarMargenes() {
  console.log('\n📊 VERIFICACIÓN DE MÁRGENES Y CONGRUENCIA\n');
  
  // 1. Obtener datos de la vista
  const { data: eventos } = await supabase
    .from('vw_eventos_analisis_financiero')
    .select('*')
    .limit(10);
  
  if (!eventos || eventos.length === 0) {
    console.error('❌ No hay eventos en la vista');
    return;
  }
  
  console.log('📋 Primeros 10 eventos - Verificación de cálculos:\n');
  
  for (const ev of eventos) {
    const ingresoEstimado = parseFloat(ev.ingreso_estimado) || 0;
    const provisionesTotal = parseFloat(ev.provisiones_total) || 0;
    const utilidadEstimada = parseFloat(ev.utilidad_estimada) || 0;
    const margenEstimado = parseFloat(ev.margen_estimado_pct) || 0;
    
    const ingresosCobrados = parseFloat(ev.ingresos_cobrados) || 0;
    const gastosPagados = parseFloat(ev.gastos_pagados_total) || 0;
    const utilidadReal = parseFloat(ev.utilidad_real) || 0;
    const margenReal = parseFloat(ev.margen_real_pct) || 0;
    
    // Calcular manualmente
    const utilidadEstManual = ingresoEstimado - provisionesTotal;
    const margenEstManual = ingresoEstimado > 0 ? (utilidadEstManual / ingresoEstimado) * 100 : 0;
    const utilidadRealManual = ingresosCobrados - gastosPagados;
    const margenRealManual = ingresosCobrados > 0 ? (utilidadRealManual / ingresosCobrados) * 100 : 0;
    
    console.log(`\n🎯 ${ev.clave_evento} - ${ev.nombre_proyecto}`);
    console.log(`   ESTIMADO:`);
    console.log(`      Ingreso:     $${ingresoEstimado.toFixed(2)}`);
    console.log(`      Provisiones: $${provisionesTotal.toFixed(2)}`);
    console.log(`      Utilidad:    $${utilidadEstimada.toFixed(2)} (Manual: $${utilidadEstManual.toFixed(2)}) ${Math.abs(utilidadEstimada - utilidadEstManual) < 0.01 ? '✅' : '❌'}`);
    console.log(`      Margen:      ${margenEstimado.toFixed(2)}% (Manual: ${margenEstManual.toFixed(2)}%) ${Math.abs(margenEstimado - margenEstManual) < 0.1 ? '✅' : '❌'}`);
    console.log(`   REAL:`);
    console.log(`      Cobrado:     $${ingresosCobrados.toFixed(2)}`);
    console.log(`      Pagado:      $${gastosPagados.toFixed(2)}`);
    console.log(`      Utilidad:    $${utilidadReal.toFixed(2)} (Manual: $${utilidadRealManual.toFixed(2)}) ${Math.abs(utilidadReal - utilidadRealManual) < 0.01 ? '✅' : '❌'}`);
    console.log(`      Margen:      ${margenReal.toFixed(2)}% (Manual: ${margenRealManual.toFixed(2)}%) ${Math.abs(margenReal - margenRealManual) < 0.1 ? '✅' : '❌'}`);
  }
  
  // 2. Totales globales
  console.log('\n\n📊 TOTALES GLOBALES:\n');
  
  const { data: totales } = await supabase
    .from('vw_eventos_analisis_financiero')
    .select('ingreso_estimado, provisiones_total, ingresos_cobrados, gastos_pagados_total');
  
  const sumIngresoEst = totales.reduce((s, e) => s + parseFloat(e.ingreso_estimado || 0), 0);
  const sumProvisiones = totales.reduce((s, e) => s + parseFloat(e.provisiones_total || 0), 0);
  const sumIngresosCob = totales.reduce((s, e) => s + parseFloat(e.ingresos_cobrados || 0), 0);
  const sumGastosPag = totales.reduce((s, e) => s + parseFloat(e.gastos_pagados_total || 0), 0);
  
  const margenEstGlobal = (sumIngresoEst - sumProvisiones) / sumIngresoEst * 100;
  const margenRealGlobal = (sumIngresosCob - sumGastosPag) / sumIngresosCob * 100;
  
  console.log(`Ingreso Estimado Total:  $${sumIngresoEst.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  console.log(`Provisiones Total:       $${sumProvisiones.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  console.log(`Margen Estimado Global:  ${margenEstGlobal.toFixed(2)}% ${margenEstGlobal >= 33 && margenEstGlobal <= 45 ? '✅' : '⚠️'}`);
  console.log(``);
  console.log(`Ingresos Cobrados Total: $${sumIngresosCob.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  console.log(`Gastos Pagados Total:    $${sumGastosPag.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  console.log(`Margen Real Global:      ${margenRealGlobal.toFixed(2)}%`);
  
  const variacionIngreso = ((sumIngresosCob - sumIngresoEst) / sumIngresoEst * 100);
  const variacionGasto = ((sumGastosPag - sumProvisiones) / sumProvisiones * 100);
  
  console.log(``);
  console.log(`Variación Ingreso Real:  ${variacionIngreso >= 0 ? '+' : ''}${variacionIngreso.toFixed(2)}% ${Math.abs(variacionIngreso) <= 10 ? '✅' : '⚠️'}`);
  console.log(`Variación Gasto Real:    ${variacionGasto >= 0 ? '+' : ''}${variacionGasto.toFixed(2)}% ${Math.abs(variacionGasto) <= 10 ? '✅' : '⚠️'}`);
}

verificarMargenes().catch(console.error);
