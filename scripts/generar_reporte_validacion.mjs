#!/usr/bin/env node

/**
 * =========================================================================
 * SCRIPT: Generar Reporte de Validación - Datos Poblados
 * =========================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('\n=========================================');
console.log('📊 REPORTE DE VALIDACIÓN - DATOS POBLADOS');
console.log('=========================================\n');

async function ejecutarQuery(nombre, query) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query_text: query });

    if (error) {
      // Intentar ejecutar directamente si RPC falla
      const { data: directData, error: directError } = await supabase
        .from('vw_eventos_analisis_financiero')
        .select('*')
        .limit(1);

      if (directError) {
        console.log(`  ⚠️  ${nombre}: No se pudo ejecutar\n`);
        return null;
      }
    }

    return data;
  } catch (err) {
    console.log(`  ⚠️  ${nombre}: ${err.message}\n`);
    return null;
  }
}

async function validarEstadisticasGenerales() {
  console.log('📈 1. ESTADÍSTICAS GENERALES\n');

  // Total de eventos
  const { data: eventos, error: errorEventos } = await supabase
    .from('evt_eventos')
    .select('id, fecha_evento', { count: 'exact' })
    .is('deleted_at', null);

  if (!errorEventos) {
    console.log(`  ✓ Total eventos: ${eventos.length}`);

    // Agrupar por año
    const por2024 = eventos.filter(e => e.fecha_evento.startsWith('2024')).length;
    const por2025 = eventos.filter(e => e.fecha_evento.startsWith('2025')).length;
    console.log(`    - Año 2024: ${por2024} eventos`);
    console.log(`    - Año 2025: ${por2025} eventos`);
  }

  // Total de ingresos
  const { count: countIngresos } = await supabase
    .from('evt_ingresos')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  console.log(`  ✓ Total ingresos: ${countIngresos}`);

  // Total de gastos
  const { count: countGastos } = await supabase
    .from('evt_gastos')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  console.log(`  ✓ Total gastos: ${countGastos}\n`);
}

async function validarCantidadesPorEvento() {
  console.log('📊 2. VALIDACIÓN DE CANTIDADES POR EVENTO\n');

  const { data: eventos } = await supabase
    .from('evt_eventos')
    .select('id')
    .is('deleted_at', null);

  if (!eventos || eventos.length === 0) {
    console.log('  ⚠️  No hay eventos para validar\n');
    return;
  }

  let eventosConOrganizacion8Ingresos = 0;
  let eventosConCorrectos8Gastos = 0;

  for (const evento of eventos) {
    // Contar ingresos
    const { count: countIngresos } = await supabase
      .from('evt_ingresos')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', evento.id)
      .is('deleted_at', null);

    if (countIngresos === 8) eventosConOrganizacion8Ingresos++;

    // Contar gastos
    const { count: countGastos } = await supabase
      .from('evt_gastos')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', evento.id)
      .is('deleted_at', null);

    if (countGastos === 8) eventosConCorrectos8Gastos++;
  }

  console.log(`  ✓ Eventos con 8 ingresos: ${eventosConOrganizacion8Ingresos}/${eventos.length}`);
  console.log(`  ✓ Eventos con 8 gastos: ${eventosConCorrectos8Gastos}/${eventos.length}\n`);
}

async function validarUtilidades() {
  console.log('💰 3. VALIDACIÓN DE UTILIDADES (Meta: 30-40%)\n');

  const { data: financiero } = await supabase
    .from('vw_eventos_analisis_financiero')
    .select('margen_real_pct, utilidad_real, ingresos_cobrados')
    .gt('ingresos_cobrados', 0);

  if (financiero && financiero.length > 0) {
    const dentroRango = financiero.filter(f => f.margen_real_pct >= 28 && f.margen_real_pct <= 42).length;
    const debajo = financiero.filter(f => f.margen_real_pct < 28).length;
    const arriba = financiero.filter(f => f.margen_real_pct > 42).length;

    const margenes = financiero.map(f => f.margen_real_pct);
    const promedio = margenes.reduce((a, b) => a + b, 0) / margenes.length;
    const min = Math.min(...margenes);
    const max = Math.max(...margenes);

    console.log(`  ✓ Eventos dentro del rango (28-42%): ${dentroRango}/${financiero.length}`);
    console.log(`  ℹ️  Eventos debajo del 28%: ${debajo}`);
    console.log(`  ℹ️  Eventos arriba del 42%: ${arriba}`);
    console.log(`  📊 Margen promedio: ${promedio.toFixed(2)}%`);
    console.log(`  📊 Margen mínimo: ${min.toFixed(2)}%`);
    console.log(`  📊 Margen máximo: ${max.toFixed(2)}%\n`);
  }
}

async function validarDistribucionGastos() {
  console.log('💸 4. DISTRIBUCIÓN DE GASTOS POR CATEGORÍA\n');

  const { data: gastos } = await supabase
    .from('evt_gastos')
    .select('categoria_id, total, pagado')
    .is('deleted_at', null);

  const { data: categorias } = await supabase
    .from('evt_categorias_gastos')
    .select('id, nombre')
    .in('id', [6, 7, 8, 9]);

  for (const cat of categorias) {
    const gastosCategoria = gastos.filter(g => g.categoria_id === cat.id);
    const totalGastos = gastosCategoria.length;
    const montoTotal = gastosCategoria.reduce((sum, g) => sum + parseFloat(g.total), 0);
    const pagados = gastosCategoria.filter(g => g.pagado).length;
    const pctPagado = (pagados / totalGastos * 100).toFixed(1);

    console.log(`  ${cat.nombre}:`);
    console.log(`    - Total gastos: ${totalGastos}`);
    console.log(`    - Monto total: $${montoTotal.toFixed(2)}`);
    console.log(`    - Pagados: ${pagados} (${pctPagado}%)`);
  }
  console.log('');
}

async function validarIngresos() {
  console.log('💵 5. DISTRIBUCIÓN DE INGRESOS\n');

  const { data: ingresos } = await supabase
    .from('evt_ingresos')
    .select('total, cobrado')
    .is('deleted_at', null);

  const totalIngresos = ingresos.length;
  const cobrados = ingresos.filter(i => i.cobrado).length;
  const pctCobrado = (cobrados / totalIngresos * 100).toFixed(1);
  const montoTotal = ingresos.reduce((sum, i) => sum + parseFloat(i.total), 0);
  const montoCobrado = ingresos.filter(i => i.cobrado).reduce((sum, i) => sum + parseFloat(i.total), 0);

  console.log(`  ✓ Total ingresos: ${totalIngresos}`);
  console.log(`  ✓ Ingresos cobrados: ${cobrados} (${pctCobrado}%)`);
  console.log(`  💰 Monto total: $${montoTotal.toFixed(2)}`);
  console.log(`  💰 Monto cobrado: $${montoCobrado.toFixed(2)}\n`);
}

async function validarClientes() {
  console.log('👥 6. ANÁLISIS POR CLIENTE\n');

  const { data: clientes } = await supabase
    .from('evt_clientes')
    .select('id, razon_social')
    .eq('activo', true);

  for (const cliente of clientes) {
    const { count } = await supabase
      .from('evt_eventos')
      .select('*', { count: 'exact', head: true })
      .eq('cliente_id', cliente.id)
      .is('deleted_at', null);

    console.log(`  ${cliente.razon_social}:`);
    console.log(`    - Eventos: ${count}`);
  }
  console.log('');
}

async function mostrarMuestra() {
  console.log('🔍 7. MUESTRA DE EVENTOS (Primeros 3)\n');

  const { data: eventos } = await supabase
    .from('vw_eventos_analisis_financiero')
    .select('clave_evento, cliente_nombre, fecha_evento, provisiones_total, ingreso_estimado, ingresos_cobrados, gastos_pagados_total, utilidad_real, margen_real_pct')
    .order('fecha_evento')
    .limit(3);

  if (eventos) {
    eventos.forEach((e, i) => {
      console.log(`  Evento ${i + 1}: ${e.clave_evento}`);
      console.log(`    - Cliente: ${e.cliente_nombre}`);
      console.log(`    - Fecha: ${e.fecha_evento}`);
      console.log(`    - Provisiones: $${parseFloat(e.provisiones_total).toFixed(2)}`);
      console.log(`    - Ingreso estimado: $${parseFloat(e.ingreso_estimado).toFixed(2)}`);
      console.log(`    - Ingresos cobrados: $${parseFloat(e.ingresos_cobrados).toFixed(2)}`);
      console.log(`    - Gastos pagados: $${parseFloat(e.gastos_pagados_total).toFixed(2)}`);
      console.log(`    - Utilidad real: $${parseFloat(e.utilidad_real).toFixed(2)}`);
      console.log(`    - Margen: ${parseFloat(e.margen_real_pct).toFixed(2)}%\n`);
    });
  }
}

async function resumenFinal() {
  console.log('📋 8. RESUMEN EJECUTIVO\n');

  const { data: financiero } = await supabase
    .from('vw_eventos_analisis_financiero')
    .select('ingresos_cobrados, gastos_pagados_total, utilidad_real, margen_real_pct')
    .gt('ingresos_cobrados', 0);

  if (financiero && financiero.length > 0) {
    const promedioIngresos = financiero.reduce((sum, f) => sum + parseFloat(f.ingresos_cobrados), 0) / financiero.length;
    const promedioGastos = financiero.reduce((sum, f) => sum + parseFloat(f.gastos_pagados_total), 0) / financiero.length;
    const promedioUtilidad = financiero.reduce((sum, f) => sum + parseFloat(f.utilidad_real), 0) / financiero.length;
    const promedioMargen = financiero.reduce((sum, f) => sum + parseFloat(f.margen_real_pct), 0) / financiero.length;

    const margenes = financiero.map(f => parseFloat(f.margen_real_pct));
    const minMargen = Math.min(...margenes);
    const maxMargen = Math.max(...margenes);

    console.log(`  📊 Total eventos analizados: ${financiero.length}`);
    console.log(`  💰 Promedio ingresos cobrados: $${promedioIngresos.toFixed(2)}`);
    console.log(`  💸 Promedio gastos pagados: $${promedioGastos.toFixed(2)}`);
    console.log(`  📈 Promedio utilidad real: $${promedioUtilidad.toFixed(2)}`);
    console.log(`  📊 Promedio margen: ${promedioMargen.toFixed(2)}%`);
    console.log(`  📊 Rango margen: ${minMargen.toFixed(2)}% - ${maxMargen.toFixed(2)}%\n`);
  }
}

async function main() {
  try {
    await validarEstadisticasGenerales();
    await validarCantidadesPorEvento();
    await validarUtilidades();
    await validarDistribucionGastos();
    await validarIngresos();
    await validarClientes();
    await mostrarMuestra();
    await resumenFinal();

    console.log('=========================================');
    console.log('✅ VALIDACIÓN COMPLETADA');
    console.log('=========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();
