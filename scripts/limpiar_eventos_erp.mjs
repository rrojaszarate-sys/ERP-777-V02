#!/usr/bin/env node
/**
 * Script para limpiar todas las tablas del módulo eventos-erp
 * Uso: node scripts/limpiar_eventos_erp.mjs
 *      node scripts/limpiar_eventos_erp.mjs --force (sin confirmación)
 *
 * PRECAUCIÓN: Elimina TODOS los datos de eventos, ingresos, gastos,
 * proyectos y documentos del módulo ERP
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Variables de Supabase no configuradas');
  console.error('   Requeridas: VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_ROLE_KEY (o VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

// Orden importa: primero las que tienen FK hacia otras
const TABLAS_A_LIMPIAR = [
  'historial_estados_eventos',
  'event_docs',
  'event_invoices',
  'log_alertas_cobro',
  'documentos_proyectos_erp',
  'hitos_proyectos_erp',
  'equipo_proyectos_erp',
  'tareas_proyectos_erp',
  'proyectos_eventos_erp',
  'gastos_erp',
  'ingresos_erp',
  'eventos_erp',
  'clientes_erp'
];

// ============================================================================
// FUNCIONES
// ============================================================================

async function confirmarLimpieza() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  ADVERTENCIA: Este script eliminará TODOS los datos de:');
    console.log('   - Eventos ERP');
    console.log('   - Clientes ERP');
    console.log('   - Ingresos ERP');
    console.log('   - Gastos ERP');
    console.log('   - Proyectos y tareas');
    console.log('   - Documentos y facturas');
    console.log('   - Historial de estados\n');

    rl.question('¿Estás seguro? Escribe "LIMPIAR" para continuar: ', (answer) => {
      rl.close();
      resolve(answer === 'LIMPIAR');
    });
  });
}

async function contarRegistros(tabla) {
  try {
    const { count, error } = await supabase
      .from(tabla)
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') return { existe: false, count: 0 };
      return { existe: false, count: 0, error: error.message };
    }

    return { existe: true, count: count || 0 };
  } catch (error) {
    return { existe: false, count: 0, error: error.message };
  }
}

async function limpiarTabla(tabla) {
  try {
    // Verificar y contar
    const { existe, count: countAntes, error: countError } = await contarRegistros(tabla);

    if (countError) {
      console.log(`   ⏭️  ${tabla} - Error al verificar: ${countError}`);
      return { tabla, eliminados: 0, error: countError };
    }

    if (!existe) {
      console.log(`   ⏭️  ${tabla} - No existe, saltando...`);
      return { tabla, eliminados: 0, existe: false };
    }

    if (countAntes === 0) {
      console.log(`   ✅ ${tabla} - Ya está vacía`);
      return { tabla, eliminados: 0, existe: true };
    }

    // Eliminar todos los registros
    // Usamos neq con un valor imposible para UUID
    const { error } = await supabase
      .from(tabla)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      // Si falla, intentar con gte para IDs numéricos
      const { error: error2 } = await supabase
        .from(tabla)
        .delete()
        .gte('id', 0);

      if (error2) {
        console.error(`   ❌ ${tabla} - Error: ${error2.message}`);
        return { tabla, error: error2.message, existe: true };
      }
    }

    console.log(`   🗑️  ${tabla} - ${countAntes} registros eliminados`);
    return { tabla, eliminados: countAntes, existe: true };

  } catch (error) {
    console.error(`   ❌ ${tabla} - Error: ${error.message}`);
    return { tabla, error: error.message, existe: true };
  }
}

async function mostrarEstadisticas() {
  console.log('\n📊 Estado de las tablas:');
  console.log('─'.repeat(50));

  for (const tabla of TABLAS_A_LIMPIAR) {
    const { existe, count, error } = await contarRegistros(tabla);
    if (error) {
      console.log(`   ${tabla}: Error - ${error}`);
    } else if (!existe) {
      console.log(`   ${tabla}: (no existe)`);
    } else {
      console.log(`   ${tabla}: ${count} registros`);
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🧹 LIMPIEZA DE MÓDULO EVENTOS-ERP                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Verificar si es modo forzado (para pruebas automatizadas)
  const modoForzado = process.argv.includes('--force') || process.argv.includes('-f');

  if (!modoForzado) {
    const confirmado = await confirmarLimpieza();
    if (!confirmado) {
      console.log('\n❌ Operación cancelada.');
      process.exit(0);
    }
  } else {
    console.log('\n⚠️  Modo forzado activado (--force)');
  }

  console.log('\n✅ Conectado a Supabase');

  // Mostrar estado antes
  await mostrarEstadisticas();

  console.log('\n🗑️  Limpiando tablas...');
  console.log('─'.repeat(50));

  const resultados = [];
  for (const tabla of TABLAS_A_LIMPIAR) {
    const resultado = await limpiarTabla(tabla);
    resultados.push(resultado);
  }

  // Resumen
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    📋 RESUMEN                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const totalEliminados = resultados.reduce((acc, r) => acc + (r.eliminados || 0), 0);
  const tablasLimpiadas = resultados.filter(r => r.eliminados > 0).length;
  const errores = resultados.filter(r => r.error).length;

  console.log(`   ✅ Tablas procesadas: ${resultados.length}`);
  console.log(`   🗑️  Tablas limpiadas: ${tablasLimpiadas}`);
  console.log(`   📊 Total registros eliminados: ${totalEliminados}`);
  if (errores > 0) {
    console.log(`   ❌ Errores: ${errores}`);
  }

  // Mostrar estado después
  console.log('\n📊 Estado final:');
  await mostrarEstadisticas();

  console.log('\n✅ Limpieza completada. El módulo eventos-erp está listo para pruebas.');
}

main().catch(console.error);
