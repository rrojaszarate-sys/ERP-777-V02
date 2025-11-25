#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('📊 VERIFICACIÓN DE ÍNDICE DE COBRO\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Obtener datos para año 2025 (como muestra el dashboard)
const { data: eventos2025, error } = await supabase
  .from('vw_eventos_analisis_financiero')
  .select('*')
  .gte('fecha_evento', '2025-01-01')
  .lte('fecha_evento', '2025-12-31');

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

const dashboard = {
  total_ingresos_reales: eventos2025.reduce((s, e) => s + (e.ingresos_totales || 0), 0),
  total_ingresos_cobrados: eventos2025.reduce((s, e) => s + (e.ingresos_cobrados || 0), 0),
  total_ingresos_pendientes: eventos2025.reduce((s, e) => s + (e.ingresos_pendientes || 0), 0),
};

const pctCobrado = dashboard.total_ingresos_reales > 0 
  ? (dashboard.total_ingresos_cobrados / dashboard.total_ingresos_reales * 100)
  : 0;

const pctPendiente = dashboard.total_ingresos_reales > 0 
  ? (dashboard.total_ingresos_pendientes / dashboard.total_ingresos_reales * 100)
  : 0;

console.log('📈 DATOS PARA GRÁFICA DE ÍNDICE DE COBRO (AÑO 2025):\n');
console.log('Total Ingresos:    ', dashboard.total_ingresos_reales.toLocaleString('es-MX', {style:'currency', currency:'MXN'}));
console.log('');
console.log('✅ Cobrado:        ', dashboard.total_ingresos_cobrados.toLocaleString('es-MX', {style:'currency', currency:'MXN'}));
console.log('   Porcentaje:      ', pctCobrado.toFixed(1) + '%');
console.log('');
console.log('⏳ Pendiente:      ', dashboard.total_ingresos_pendientes.toLocaleString('es-MX', {style:'currency', currency:'MXN'}));
console.log('   Porcentaje:      ', pctPendiente.toFixed(1) + '%');
console.log('');
console.log('═══════════════════════════════════════════════════════════\n');

// Indicador de salud
let salud = '';
let emoji = '';
if (pctCobrado >= 60) {
  salud = 'Excelente Índice de Cobro';
  emoji = '🎯';
} else if (pctCobrado >= 40) {
  salud = 'Índice de Cobro Moderado';
  emoji = '⚠️';
} else {
  salud = 'Índice de Cobro Bajo';
  emoji = '❌';
}

console.log('💡 INDICADOR DE SALUD FINANCIERA:\n');
console.log(`${emoji} ${salud}`);
console.log(`   Recomendado: ≥60% cobrado`);
console.log(`   Actual: ${pctCobrado.toFixed(1)}%`);
console.log('');

// Datos para todos los años
console.log('═══════════════════════════════════════════════════════════\n');
console.log('📊 ÍNDICE DE COBRO POR AÑO:\n');

for (const año of [2022, 2023, 2024, 2025]) {
  const { data: eventosAño } = await supabase
    .from('vw_eventos_analisis_financiero')
    .select('*')
    .gte('fecha_evento', `${año}-01-01`)
    .lte('fecha_evento', `${año}-12-31`);
  
  const totalReales = eventosAño.reduce((s, e) => s + (e.ingresos_totales || 0), 0);
  const totalCobrados = eventosAño.reduce((s, e) => s + (e.ingresos_cobrados || 0), 0);
  const pct = totalReales > 0 ? (totalCobrados / totalReales * 100) : 0;
  
  const estadoEmoji = pct >= 60 ? '🟢' : pct >= 40 ? '🟡' : '🔴';
  
  console.log(`${año}: ${estadoEmoji} ${pct.toFixed(1)}% cobrado (${totalCobrados.toLocaleString('es-MX', {style:'currency', currency:'MXN', maximumFractionDigits: 0})} de ${totalReales.toLocaleString('es-MX', {style:'currency', currency:'MXN', maximumFractionDigits: 0})})`);
}

console.log('\n═══════════════════════════════════════════════════════════\n');
console.log('✅ Gráfica lista para mostrarse en el dashboard\n');

process.exit(0);
