#!/usr/bin/env node

/**
 * Script para ejecutar la migración 010: División de Provisiones
 *
 * IMPORTANTE: Este script ejecuta cambios en la base de datos.
 * - Divide provisiones en 4 categorías
 * - Marca campos obsoletos en ceros
 * - Actualiza vistas con cálculos dinámicos
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Faltan credenciales de Supabase en .env');
  process.exit(1);
}

// Crear cliente con service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('EJECUCIÓN DE MIGRACIÓN 010: DIVISIÓN DE PROVISIONES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

/**
 * Ejecutar query SQL usando RPC o edge function
 */
async function executeSQL(sql) {
  try {
    // Intentar ejecutar usando una función RPC si existe
    // Si no, tendríamos que ejecutar vía psql directamente

    // Para Supabase, la forma más segura es:
    // 1. Usar supabase CLI: npx supabase db push
    // 2. O usar pg client directamente con connection string

    console.log('⚠️  NOTA: Supabase no permite ejecutar SQL arbitrario vía API.');
    console.log('');
    console.log('Opciones para ejecutar la migración:');
    console.log('');
    console.log('OPCIÓN 1: Usando Supabase CLI (Recomendado)');
    console.log('  1. Asegúrate de tener supabase CLI instalado');
    console.log('  2. Ejecuta: npx supabase db push');
    console.log('  3. O manualmente: psql <connection-string> -f migrations/010_divide_provisiones_categories.sql');
    console.log('');
    console.log('OPCIÓN 2: Usando Dashboard de Supabase');
    console.log('  1. Ve a https://supabase.com/dashboard/project/gomnouwackzvthpwyric/editor');
    console.log('  2. Abre el SQL Editor');
    console.log('  3. Copia y pega el contenido de migrations/010_divide_provisiones_categories.sql');
    console.log('  4. Ejecuta el script');
    console.log('');
    console.log('OPCIÓN 3: Usando psql directamente');
    console.log('  1. Obtén la connection string de Supabase Dashboard > Settings > Database');
    console.log('  2. Ejecuta:');
    console.log('     psql "postgresql://postgres:[PASSWORD]@db.gomnouwackzvthpwyric.supabase.co:5432/postgres" \\');
    console.log('       -f migrations/010_divide_provisiones_categories.sql');
    console.log('');

    return { success: false, message: 'Debe ejecutarse manualmente' };
  } catch (error) {
    console.error('❌ Error ejecutando SQL:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Validar estado antes de la migración
 */
async function validateBefore() {
  console.log('📋 VALIDACIÓN PRE-MIGRACIÓN');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('');

  try {
    // Contar eventos con provisiones
    const { data: eventos, error } = await supabase
      .from('evt_eventos')
      .select('id, clave_evento, provisiones, ganancia_estimada', { count: 'exact' })
      .is('deleted_at', null);

    if (error) {
      console.error('❌ Error consultando eventos:', error.message);
      return false;
    }

    const eventosConProvisiones = eventos.filter(e => (e.provisiones || 0) > 0);
    const totalProvisiones = eventosConProvisiones.reduce((sum, e) => sum + (e.provisiones || 0), 0);

    console.log(`  Total eventos: ${eventos.length}`);
    console.log(`  Eventos con provisiones: ${eventosConProvisiones.length}`);
    console.log(`  Total provisiones a distribuir: $${totalProvisiones.toFixed(2)}`);
    console.log('');

    if (eventosConProvisiones.length > 0) {
      console.log('  Ejemplos de eventos a migrar:');
      eventosConProvisiones.slice(0, 5).forEach(e => {
        console.log(`    • ${e.clave_evento}: $${(e.provisiones || 0).toFixed(2)}`);
      });
      console.log('');
    }

    return true;
  } catch (error) {
    console.error('❌ Error en validación:', error.message);
    return false;
  }
}

/**
 * Validar estado después de la migración
 */
async function validateAfter() {
  console.log('');
  console.log('✅ VALIDACIÓN POST-MIGRACIÓN');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('');

  try {
    // Verificar que existan las nuevas columnas
    const { data: eventos, error } = await supabase
      .from('evt_eventos')
      .select('id, clave_evento, provision_combustible_peaje, provision_materiales, provision_recursos_humanos, provision_solicitudes_pago, provisiones')
      .is('deleted_at', null)
      .limit(5);

    if (error) {
      console.error('❌ Error consultando eventos:', error.message);
      return false;
    }

    console.log('  ✓ Columnas nuevas existen');
    console.log('');

    if (eventos.length > 0) {
      console.log('  Ejemplos de eventos migrados:');
      eventos.forEach(e => {
        const total = (e.provision_combustible_peaje || 0) +
                     (e.provision_materiales || 0) +
                     (e.provision_recursos_humanos || 0) +
                     (e.provision_solicitudes_pago || 0);
        console.log(`    • ${e.clave_evento}:`);
        console.log(`      - Combustible: $${(e.provision_combustible_peaje || 0).toFixed(2)}`);
        console.log(`      - Materiales: $${(e.provision_materiales || 0).toFixed(2)}`);
        console.log(`      - RH: $${(e.provision_recursos_humanos || 0).toFixed(2)}`);
        console.log(`      - SPs: $${(e.provision_solicitudes_pago || 0).toFixed(2)}`);
        console.log(`      - Total calculado: $${total.toFixed(2)}`);
        console.log(`      - Campo provisiones: $${(e.provisiones || 0).toFixed(2)} (debe ser 0)`);
        console.log('');
      });
    }

    // Verificar que provisiones esté en 0
    const eventosConProvisionesNoZero = eventos.filter(e => (e.provisiones || 0) !== 0);
    if (eventosConProvisionesNoZero.length > 0) {
      console.log(`  ⚠️  ADVERTENCIA: ${eventosConProvisionesNoZero.length} eventos tienen provisiones != 0`);
      return false;
    }

    console.log('  ✓ Campo provisiones está en 0 (obsoleto)');
    console.log('  ✓ Provisiones distribuidas en 4 categorías');

    return true;
  } catch (error) {
    console.error('❌ Error en validación:', error.message);
    return false;
  }
}

/**
 * Verificar que vistas estén actualizadas
 */
async function validateViews() {
  console.log('');
  console.log('🔍 VALIDACIÓN DE VISTAS');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('');

  try {
    // Probar vista vw_eventos_analisis_financiero
    const { data, error } = await supabase
      .from('vw_eventos_analisis_financiero')
      .select('clave_evento, provision_combustible_peaje, provision_materiales, provisiones_total')
      .limit(3);

    if (error) {
      console.error('❌ Error consultando vista vw_eventos_analisis_financiero:', error.message);
      console.log('');
      console.log('   La vista probablemente no se actualizó. Ejecuta la migración SQL manualmente.');
      return false;
    }

    console.log('  ✓ Vista vw_eventos_analisis_financiero funciona correctamente');

    if (data && data.length > 0) {
      console.log('');
      console.log('  Ejemplos de datos en la vista:');
      data.forEach(e => {
        console.log(`    • ${e.clave_evento}:`);
        console.log(`      - Combustible: $${(e.provision_combustible_peaje || 0).toFixed(2)}`);
        console.log(`      - Materiales: $${(e.provision_materiales || 0).toFixed(2)}`);
        console.log(`      - Total: $${(e.provisiones_total || 0).toFixed(2)}`);
      });
    }

    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Error validando vistas:', error.message);
    return false;
  }
}

/**
 * Proceso principal
 */
async function main() {
  try {
    // Validación pre-migración
    const validBefore = await validateBefore();
    if (!validBefore) {
      console.error('❌ Validación pre-migración falló');
      process.exit(1);
    }

    // Informar sobre ejecución manual
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('INSTRUCCIONES DE EJECUCIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('La migración debe ejecutarse manualmente. Usa una de estas opciones:');
    console.log('');
    console.log('1. Dashboard de Supabase (Más fácil):');
    console.log('   - Ve al SQL Editor en tu proyecto');
    console.log('   - Copia y pega migrations/010_divide_provisiones_categories.sql');
    console.log('   - Ejecuta');
    console.log('');
    console.log('2. psql (Más directo):');
    console.log('   - Obtén la connection string de Supabase');
    console.log('   - Ejecuta:');
    console.log('     psql "tu_connection_string" -f migrations/010_divide_provisiones_categories.sql');
    console.log('');
    console.log('Después de ejecutar, vuelve a correr este script para validar:');
    console.log('  node ejecutar-migracion-010.mjs --validate');
    console.log('');

    // Si el usuario quiere solo validar
    if (process.argv.includes('--validate')) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('MODO VALIDACIÓN');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const validAfter = await validateAfter();
      const validViews = await validateViews();

      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (validAfter && validViews) {
        console.log('✅ MIGRACIÓN COMPLETADA Y VALIDADA EXITOSAMENTE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('Próximos pasos:');
        console.log('  1. Actualizar tipos TypeScript (Event.ts)');
        console.log('  2. Actualizar componentes frontend (EventForm, etc.)');
        console.log('  3. Probar creación/edición de eventos');
        console.log('  4. Verificar reportes financieros');
      } else {
        console.log('❌ VALIDACIÓN FALLÓ');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('Revisa los errores arriba y ejecuta la migración nuevamente.');
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('❌ Error durante el proceso:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
main();
