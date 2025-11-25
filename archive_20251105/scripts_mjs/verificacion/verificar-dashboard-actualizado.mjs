#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verificando Dashboard Actualizado\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Simular lo que hace el hook
const { data: eventos, error } = await supabase
  .from('vw_eventos_analisis_financiero')
  .select('*');

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

const total = eventos.length;

// Calcular dashboard como lo hace el hook
const dashboard = {
  total_eventos: total,
  
  total_ingresos_estimados: eventos.reduce((sum, e) => sum + (e.ingreso_estimado || 0), 0),
  total_ingresos_cobrados: eventos.reduce((sum, e) => sum + (e.ingresos_cobrados || 0), 0),
  total_provisiones: eventos.reduce((sum, e) => sum + (e.provisiones_total || 0), 0),
  
  total_gastos_pagados: eventos.reduce((sum, e) => sum + (e.gastos_pagados_total || 0), 0),
  total_gastos_rh_pagados: eventos.reduce((sum, e) => sum + (e.gastos_rh_pagados || 0), 0),
  total_gastos_sps_pagados: eventos.reduce((sum, e) => sum + (e.gastos_sps_pagados || 0), 0),
  total_gastos_materiales_pagados: eventos.reduce((sum, e) => sum + (e.gastos_materiales_pagados || 0), 0),
  total_gastos_combustible_pagados: eventos.reduce((sum, e) => sum + (e.gastos_combustible_pagados || 0), 0),
  
  total_utilidad_estimada: eventos.reduce((sum, e) => sum + (e.utilidad_estimada || 0), 0),
  total_utilidad_real: eventos.reduce((sum, e) => sum + (e.utilidad_real || 0), 0),
  
  margen_estimado_promedio: total > 0
    ? eventos.reduce((sum, e) => sum + (e.margen_estimado_pct || 0), 0) / total
    : 0,
  margen_promedio: total > 0
    ? eventos.reduce((sum, e) => sum + (e.margen_real_pct || 0), 0) / total
    : 0,
};

console.log('📊 RESUMEN DASHBOARD:\n');
console.log(`Total Eventos: ${dashboard.total_eventos}`);
console.log('');

console.log('💰 INGRESOS:');
console.log(`  Estimados:  ${dashboard.total_ingresos_estimados.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}`);
console.log(`  Cobrados:   ${dashboard.total_ingresos_cobrados.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}`);
console.log('');

console.log('📦 PROVISIONES:');
console.log(`  Total:      ${dashboard.total_provisiones.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}`);
console.log('');

console.log('💸 GASTOS PAGADOS:');
console.log(`  Total:          ${dashboard.total_gastos_pagados.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}`);
console.log(`  RH:             ${dashboard.total_gastos_rh_pagados.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}`);
console.log(`  SPs:            ${dashboard.total_gastos_sps_pagados.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}`);
console.log(`  Materiales:     ${dashboard.total_gastos_materiales_pagados.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}`);
console.log(`  Combustible:    ${dashboard.total_gastos_combustible_pagados.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}`);
console.log('');

console.log('📈 UTILIDAD Y MÁRGENES:');
console.log(`  Utilidad Estimada:      ${dashboard.total_utilidad_estimada.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}`);
console.log(`  Margen Estimado Prom:   ${dashboard.margen_estimado_promedio.toFixed(2)}% ${dashboard.margen_estimado_promedio >= 33 && dashboard.margen_estimado_promedio <= 45 ? '✅' : '❌'}`);
console.log('');
console.log(`  Utilidad Real:          ${dashboard.total_utilidad_real.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}`);
console.log(`  Margen Real Prom:       ${dashboard.margen_promedio.toFixed(2)}%`);
console.log('');

console.log('═══════════════════════════════════════════════════════════\n');

// Verificar muestra de eventos
console.log('📋 MUESTRA DE 5 EVENTOS:\n');
const muestra = eventos.slice(0, 5).map(e => ({
  clave: e.clave_evento,
  ingreso: e.ingreso_estimado,
  provisiones: e.provisiones_total,
  margen_est: `${e.margen_estimado_pct}%`,
  gastos_rh: e.gastos_rh_pagados,
  gastos_sps: e.gastos_sps_pagados,
}));
console.table(muestra);

console.log('\n✅ VERIFICACIÓN COMPLETADA\n');

if (dashboard.margen_estimado_promedio >= 33 && dashboard.margen_estimado_promedio <= 45) {
  console.log('🎯 Margen estimado promedio dentro del objetivo (33-45%)');
} else {
  console.log('⚠️  Margen estimado promedio FUERA del objetivo');
}

if (dashboard.total_gastos_rh_pagados > 0 && dashboard.total_gastos_sps_pagados > 0) {
  console.log('✅ Gastos por categoría (RH y SPs) tienen valores correctos');
} else {
  console.log('❌ Gastos por categoría muestran $0.00');
}

process.exit(0);
