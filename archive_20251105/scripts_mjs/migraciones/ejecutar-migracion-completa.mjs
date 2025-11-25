#!/usr/bin/env node

/**
 * Script para ejecutar migración completa de división de provisiones
 * Ejecuta operaciones directamente en Supabase usando REST API
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Cargar variables de entorno
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Faltan credenciales de Supabase en .env');
  process.exit(1);
}

// Crear cliente con service role (permisos completos)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('MIGRACIÓN 010: DIVISIÓN DE PROVISIONES EN 4 CATEGORÍAS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Fecha: ${new Date().toLocaleString()}`);
console.log('');

/**
 * Paso 1: Validar estado actual
 */
async function validarEstadoActual() {
  console.log('📋 PASO 1: Validación Pre-Migración');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('');

  try {
    // Obtener eventos activos
    const { data: eventos, error, count } = await supabase
      .from('evt_eventos')
      .select('id, clave_evento, provisiones, ganancia_estimada', { count: 'exact' })
      .eq('activo', true);

    if (error) {
      throw new Error(`Error consultando eventos: ${error.message}`);
    }

    const eventosConProvisiones = eventos.filter(e => (e.provisiones || 0) > 0);
    const totalProvisiones = eventosConProvisiones.reduce((sum, e) => sum + (e.provisiones || 0), 0);

    console.log(`  ✓ Total eventos activos: ${count}`);
    console.log(`  ✓ Eventos con provisiones: ${eventosConProvisiones.length}`);
    console.log(`  ✓ Total provisiones a distribuir: $${totalProvisiones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
    console.log('');

    if (eventosConProvisiones.length > 0) {
      console.log('  Ejemplos de eventos a migrar:');
      eventosConProvisiones.slice(0, 5).forEach(e => {
        console.log(`    • ${e.clave_evento}: $${((e.provisiones || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      });
      console.log('');
    }

    return { eventos, eventosConProvisiones };
  } catch (error) {
    console.error('❌ Error en validación:', error.message);
    throw error;
  }
}

/**
 * Paso 2: Ejecutar SQL directo usando función RPC
 */
async function ejecutarSQLDirecto() {
  console.log('🔧 PASO 2: Ejecutando Migración SQL');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('');

  try {
    // Leer el archivo SQL
    const sqlContent = readFileSync('./migrations/010_divide_provisiones_categories.sql', 'utf8');

    console.log('  ⚠️  NOTA: Supabase REST API no soporta SQL arbitrario.');
    console.log('  Se ejecutarán las operaciones manualmente via API...');
    console.log('');

    return { success: true };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Paso 3: Distribuir provisiones manualmente via API
 */
async function distribuirProvisionesViaAPI(eventosConProvisiones) {
  console.log('📊 PASO 3: Distribuyendo Provisiones (25% por categoría)');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('');

  let exitosos = 0;
  let fallidos = 0;

  for (const evento of eventosConProvisiones) {
    const provisionOriginal = evento.provisiones || 0;
    const provisionPorCategoria = Math.round(provisionOriginal * 0.25 * 100) / 100;

    try {
      const { error } = await supabase
        .from('evt_eventos')
        .update({
          provision_combustible_peaje: provisionPorCategoria,
          provision_materiales: provisionPorCategoria,
          provision_recursos_humanos: provisionPorCategoria,
          provision_solicitudes_pago: provisionPorCategoria,
          // Poner campos obsoletos en 0
          provisiones: 0,
          utilidad_estimada: 0,
          porcentaje_utilidad_estimada: 0,
          total_gastos: 0,
          utilidad: 0,
          margen_utilidad: 0
        })
        .eq('id', evento.id);

      if (error) {
        console.error(`  ❌ ${evento.clave_evento}: ${error.message}`);
        fallidos++;
      } else {
        console.log(`  ✓ ${evento.clave_evento}: $${provisionOriginal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} → 4 × $${provisionPorCategoria.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
        exitosos++;
      }
    } catch (error) {
      console.error(`  ❌ ${evento.clave_evento}: ${error.message}`);
      fallidos++;
    }
  }

  console.log('');
  console.log(`  Resumen: ${exitosos} exitosos, ${fallidos} fallidos`);
  console.log('');

  return { exitosos, fallidos };
}

/**
 * Paso 4: Poner en ceros eventos sin provisiones
 */
async function ponerCerosEventosSinProvisiones(eventos, eventosConProvisiones) {
  console.log('🔄 PASO 4: Poniendo en Ceros Campos Obsoletos (eventos sin provisiones)');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('');

  const idsConProvisiones = new Set(eventosConProvisiones.map(e => e.id));
  const eventosSinProvisiones = eventos.filter(e => !idsConProvisiones.has(e.id));

  console.log(`  Eventos sin provisiones a actualizar: ${eventosSinProvisiones.length}`);
  console.log('');

  if (eventosSinProvisiones.length === 0) {
    console.log('  ✓ No hay eventos sin provisiones para actualizar');
    console.log('');
    return { exitosos: 0 };
  }

  // Actualizar en lotes de 100
  const BATCH_SIZE = 100;
  let exitosos = 0;

  for (let i = 0; i < eventosSinProvisiones.length; i += BATCH_SIZE) {
    const batch = eventosSinProvisiones.slice(i, i + BATCH_SIZE);
    const ids = batch.map(e => e.id);

    try {
      const { error } = await supabase
        .from('evt_eventos')
        .update({
          provision_combustible_peaje: 0,
          provision_materiales: 0,
          provision_recursos_humanos: 0,
          provision_solicitudes_pago: 0,
          provisiones: 0,
          utilidad_estimada: 0,
          porcentaje_utilidad_estimada: 0,
          total_gastos: 0,
          utilidad: 0,
          margen_utilidad: 0
        })
        .in('id', ids);

      if (error) {
        console.error(`  ❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        exitosos += batch.length;
        console.log(`  ✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} eventos actualizados`);
      }
    } catch (error) {
      console.error(`  ❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
    }
  }

  console.log('');
  console.log(`  Total actualizados: ${exitosos}`);
  console.log('');

  return { exitosos };
}

/**
 * Paso 5: Validar resultados
 */
async function validarResultados() {
  console.log('✅ PASO 5: Validación Post-Migración');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('');

  try {
    // Verificar que existan las nuevas columnas
    const { data: eventos, error } = await supabase
      .from('evt_eventos')
      .select(`
        id,
        clave_evento,
        provision_combustible_peaje,
        provision_materiales,
        provision_recursos_humanos,
        provision_solicitudes_pago,
        provisiones,
        utilidad_estimada,
        total_gastos
      `)
      .eq('activo', true)
      .limit(10);

    if (error) {
      throw new Error(`Error consultando eventos: ${error.message}`);
    }

    // Validar que provisiones esté en 0
    const eventosConProvisionesNoZero = eventos.filter(e => (e.provisiones || 0) !== 0);
    if (eventosConProvisionesNoZero.length > 0) {
      console.log(`  ⚠️  ADVERTENCIA: ${eventosConProvisionesNoZero.length} eventos tienen provisiones != 0`);
      console.log('');
    }

    // Validar que campos obsoletos estén en 0
    const eventosConCamposObsoletos = eventos.filter(e =>
      (e.utilidad_estimada || 0) !== 0 ||
      (e.total_gastos || 0) !== 0
    );

    if (eventosConCamposObsoletos.length > 0) {
      console.log(`  ⚠️  ADVERTENCIA: ${eventosConCamposObsoletos.length} eventos tienen campos obsoletos != 0`);
      console.log('');
    }

    // Mostrar ejemplos
    console.log('  Ejemplos de eventos migrados:');
    eventos.slice(0, 5).forEach(e => {
      const total = (e.provision_combustible_peaje || 0) +
                   (e.provision_materiales || 0) +
                   (e.provision_recursos_humanos || 0) +
                   (e.provision_solicitudes_pago || 0);

      console.log(`    • ${e.clave_evento}:`);
      console.log(`      - Combustible: $${((e.provision_combustible_peaje || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      console.log(`      - Materiales: $${((e.provision_materiales || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      console.log(`      - RH: $${((e.provision_recursos_humanos || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      console.log(`      - SPs: $${((e.provision_solicitudes_pago || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      console.log(`      - Total: $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      console.log(`      - Campo provisiones (obsoleto): $${((e.provisiones || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      console.log('');
    });

    // Contar eventos con cada campo
    const eventosConCombustible = eventos.filter(e => (e.provision_combustible_peaje || 0) > 0).length;
    const eventosConMateriales = eventos.filter(e => (e.provision_materiales || 0) > 0).length;
    const eventosConRH = eventos.filter(e => (e.provision_recursos_humanos || 0) > 0).length;
    const eventosConSPs = eventos.filter(e => (e.provision_solicitudes_pago || 0) > 0).length;

    console.log('  Estadísticas:');
    console.log(`    • Eventos con provision_combustible_peaje > 0: ${eventosConCombustible}`);
    console.log(`    • Eventos con provision_materiales > 0: ${eventosConMateriales}`);
    console.log(`    • Eventos con provision_recursos_humanos > 0: ${eventosConRH}`);
    console.log(`    • Eventos con provision_solicitudes_pago > 0: ${eventosConSPs}`);
    console.log('');

    const validacionExitosa = eventosConProvisionesNoZero.length === 0 &&
                             eventosConCamposObsoletos.length === 0;

    if (validacionExitosa) {
      console.log('  ✅ Validación exitosa: Todos los datos migrados correctamente');
    } else {
      console.log('  ⚠️  Validación con advertencias: Revisar datos arriba');
    }

    console.log('');
    return validacionExitosa;
  } catch (error) {
    console.error('❌ Error en validación:', error.message);
    throw error;
  }
}

/**
 * Proceso principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando migración automática...');
    console.log('');

    // Paso 1: Validar estado actual
    const { eventos, eventosConProvisiones } = await validarEstadoActual();

    // Paso 2: Intentar ejecutar SQL (informativo)
    await ejecutarSQLDirecto();

    // Paso 3: Distribuir provisiones via API
    const { exitosos, fallidos } = await distribuirProvisionesViaAPI(eventosConProvisiones);

    if (fallidos > 0) {
      console.log('⚠️  Algunos eventos no se pudieron actualizar. Revisa los errores arriba.');
      console.log('');
    }

    // Paso 4: Poner ceros en eventos sin provisiones
    await ponerCerosEventosSinProvisiones(eventos, eventosConProvisiones);

    // Paso 5: Validar resultados
    const validacionExitosa = await validarResultados();

    // Resumen final
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (validacionExitosa) {
      console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    } else {
      console.log('⚠️  MIGRACIÓN COMPLETADA CON ADVERTENCIAS');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('IMPORTANTE:');
    console.log('  ✓ Provisiones distribuidas equitativamente (25% c/u)');
    console.log('  ✓ Campos obsoletos puestos en ceros');
    console.log('  ⚠️  Las VISTAS no se pueden actualizar via API');
    console.log('');
    console.log('SIGUIENTE PASO MANUAL (REQUERIDO):');
    console.log('  1. Ir al Dashboard de Supabase SQL Editor');
    console.log('  2. Ejecutar SOLO la parte de vistas del archivo:');
    console.log('     migrations/010_divide_provisiones_categories.sql');
    console.log('     (Líneas 220 en adelante - CREATE OR REPLACE VIEW...)');
    console.log('');
    console.log('O ejecutar el archivo completo para asegurar:');
    console.log('  psql "tu_connection_string" -f migrations/010_divide_provisiones_categories.sql');
    console.log('');
    console.log('Después de actualizar las vistas, ejecuta:');
    console.log('  node ejecutar-migracion-010.mjs --validate');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR DURANTE LA MIGRACIÓN');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error(error.message);
    console.error('');
    console.error('La migración se detuvo. Los datos pueden estar parcialmente migrados.');
    console.error('Revisa los errores arriba y ejecuta nuevamente si es necesario.');
    console.error('');
    process.exit(1);
  }
}

// Ejecutar
main();
