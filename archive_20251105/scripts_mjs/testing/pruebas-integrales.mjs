#!/usr/bin/env node
/**
 * PRUEBAS INTEGRALES - Validar que registros NO PAGADOS/COBRADOS no se cuenten
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env');
let SUPABASE_URL, SUPABASE_SERVICE_KEY;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim().replace(/["']/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) SUPABASE_SERVICE_KEY = line.split('=')[1].trim().replace(/["']/g, '');
  }
} catch (error) {
  console.error('❌ Error leyendo .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const fmt = (n) => `$${n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;

let totalTests = 0, passed = 0, failed = 0;
const failures = [];

function test(name, condition, details, severity = 'MEDIA') {
  totalTests++;
  if (condition) {
    passed++;
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
  } else {
    failed++;
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    failures.push({ name, details, severity });
  }
}

console.log('\n🔍 PRUEBAS INTEGRALES DEL SISTEMA\n');

async function main() {
  // Obtener datos
  const { data: gastos } = await supabase.from('evt_gastos').select('id, total, pagado, evento_id');
  const { data: ingresos } = await supabase.from('evt_ingresos').select('id, total, cobrado, evento_id');

  const gastosPagados = gastos.filter(g => g.pagado === true);
  const gastosPendientes = gastos.filter(g => g.pagado !== true);
  const ingresosCobrados = ingresos.filter(i => i.cobrado === true);
  const ingresosPendientes = ingresos.filter(i => i.cobrado !== true);

  console.log('📊 ESTADO ACTUAL:');
  console.log(`Gastos: ${gastos.length} (${gastosPagados.length} pagados, ${gastosPendientes.length} pendientes)`);
  console.log(`Ingresos: ${ingresos.length} (${ingresosCobrados.length} cobrados, ${ingresosPendientes.length} pendientes)\n`);

  const totalGastosPagados = gastosPagados.reduce((sum, g) => sum + (g.total || 0), 0);
  const totalIngresosCobrados = ingresosCobrados.reduce((sum, i) => sum + (i.total || 0), 0);

  // PRUEBA 1: Vista vw_eventos_completos
  console.log('\n=== PRUEBA 1: vw_eventos_completos ===');
  const { data: eventosVista } = await supabase.from('vw_eventos_completos').select('id, total, total_gastos');

  if (eventosVista && eventosVista.length > 0) {
    const totalIngresosVista = eventosVista.reduce((sum, e) => sum + (e.total || 0), 0);
    const totalGastosVista = eventosVista.reduce((sum, e) => sum + (e.total_gastos || 0), 0);

    test(
      'Vista NO incluye ingresos pendientes',
      Math.abs(totalIngresosVista - totalIngresosCobrados) < 0.01,
      `Vista: ${fmt(totalIngresosVista)} vs Real cobrado: ${fmt(totalIngresosCobrados)}`,
      'CRÍTICA'
    );

    test(
      'Vista NO incluye gastos pendientes',
      Math.abs(totalGastosVista - totalGastosPagados) < 0.01,
      `Vista: ${fmt(totalGastosVista)} vs Real pagado: ${fmt(totalGastosPagados)}`,
      'CRÍTICA'
    );
  } else {
    test('Vista devuelve datos', false, 'Sin eventos en vista', 'ALTA');
  }

  // PRUEBA 2: Vista vw_master_facturacion
  console.log('\n=== PRUEBA 2: vw_master_facturacion ===');
  const { data: masterFact } = await supabase.from('vw_master_facturacion').select('evento_id, total, total_gastos');

  if (masterFact && masterFact.length > 0) {
    const totalIngresosMaster = masterFact.reduce((sum, e) => sum + (e.total || 0), 0);
    const totalGastosMaster = masterFact.reduce((sum, e) => sum + (e.total_gastos || 0), 0);

    test(
      'Master NO incluye ingresos pendientes',
      Math.abs(totalIngresosMaster - totalIngresosCobrados) < 0.01,
      `Master: ${fmt(totalIngresosMaster)} vs Real cobrado: ${fmt(totalIngresosCobrados)}`,
      'CRÍTICA'
    );

    test(
      'Master NO incluye gastos pendientes',
      Math.abs(totalGastosMaster - totalGastosPagados) < 0.01,
      `Master: ${fmt(totalGastosMaster)} vs Real pagado: ${fmt(totalGastosPagados)}`,
      'CRÍTICA'
    );
  } else {
    test('Master devuelve datos', false, 'Sin eventos en master', 'ALTA');
  }

  // RESUMEN
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  console.log(`Total: ${totalTests}`);
  console.log(`✅ Exitosas: ${passed}`);
  console.log(`❌ Fallidas: ${failed}`);
  console.log(`Éxito: ${((passed / totalTests) * 100).toFixed(2)}%`);

  if (failures.length > 0) {
    console.log('\n🔥 FALLOS CRÍTICOS:');
    failures.filter(f => f.severity === 'CRÍTICA').forEach((f, i) => {
      console.log(`  ${i+1}. ${f.name}`);
      console.log(`     ${f.details}`);
    });

    writeFileSync(
      join(__dirname, 'REPORTE_FALLOS.json'),
      JSON.stringify({ fecha: new Date().toISOString(), totalTests, passed, failed, failures }, null, 2)
    );
    console.log('\n📄 Reporte guardado: REPORTE_FALLOS.json\n');
    process.exit(1);
  } else {
    console.log('\n✅ TODAS LAS PRUEBAS PASARON\n');
    process.exit(0);
  }
}

main().catch(console.error);
