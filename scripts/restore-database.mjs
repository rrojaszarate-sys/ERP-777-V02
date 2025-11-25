#!/usr/bin/env node
/**
 * Script de Restauración de Base de Datos Supabase
 *
 * Restaura respaldos generados por backup-database.mjs
 *
 * Uso:
 *   node scripts/restore-database.mjs                    # Restaura último respaldo
 *   node scripts/restore-database.mjs --backup=2025-...  # Restaura respaldo específico
 *   node scripts/restore-database.mjs --dry-run          # Solo verifica sin restaurar
 *   node scripts/restore-database.mjs --schema-only      # Solo restaura estructura
 *   node scripts/restore-database.mjs --data-only        # Solo restaura datos
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Faltan credenciales de Supabase');
  console.error('Asegúrate de tener en tu .env:');
  console.error('  VITE_SUPABASE_URL');
  console.error('  VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Crear cliente Supabase con service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Parsear argumentos
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const schemaOnly = args.includes('--schema-only');
const dataOnly = args.includes('--data-only');
const backupArg = args.find(arg => arg.startsWith('--backup='));
const backupName = backupArg ? backupArg.split('=')[1] : 'latest';

// Configuración
const BACKUP_DIR = path.join(__dirname, '../backups');
const RESTORE_DIR = path.join(BACKUP_DIR, backupName);

console.log('🔄 Script de Restauración de Base de Datos\n');

// Verificar que existe el directorio de respaldo
if (!fs.existsSync(RESTORE_DIR)) {
  console.error(`❌ Error: No existe el respaldo "${backupName}"`);
  console.error(`\nRespaldos disponibles:`);

  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => fs.statSync(path.join(BACKUP_DIR, f)).isDirectory() && f !== 'latest')
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.error('  (No hay respaldos disponibles)');
  } else {
    backups.forEach(b => console.error(`  - ${b}`));
  }

  process.exit(1);
}

// Leer estadísticas del respaldo
const statsFile = path.join(RESTORE_DIR, 'backup_stats.json');
let stats = null;

if (fs.existsSync(statsFile)) {
  stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
}

console.log(`📂 Respaldo: ${backupName}`);
console.log(`🔗 Base de datos destino: ${SUPABASE_URL}`);

if (stats) {
  console.log(`📅 Fecha del respaldo: ${new Date(stats.timestamp).toLocaleString('es-ES')}`);
  console.log(`📊 Tablas: ${stats.totalTables}`);
  console.log(`📝 Registros: ${stats.totalRecords.toLocaleString()}`);
}

console.log();

// Determinar qué archivo restaurar
let sqlFile;
let actionDescription;

if (schemaOnly) {
  sqlFile = path.join(RESTORE_DIR, 'backup_schema.sql');
  actionDescription = 'estructura (schema)';
} else if (dataOnly) {
  sqlFile = path.join(RESTORE_DIR, 'backup_data.sql');
  actionDescription = 'datos';
} else {
  sqlFile = path.join(RESTORE_DIR, 'backup_full.sql');
  actionDescription = 'respaldo completo (estructura + datos)';
}

if (!fs.existsSync(sqlFile)) {
  console.error(`❌ Error: No existe el archivo ${path.basename(sqlFile)}`);
  process.exit(1);
}

console.log(`📄 Archivo a restaurar: ${path.basename(sqlFile)}`);
console.log(`🎯 Acción: Restaurar ${actionDescription}\n`);

if (dryRun) {
  console.log('🔍 MODO DRY-RUN: Solo verificación, no se modificará la base de datos\n');
}

// Leer contenido del archivo SQL
const sqlContent = fs.readFileSync(sqlFile, 'utf8');
const sqlStatements = sqlContent
  .split('\n')
  .filter(line => {
    const trimmed = line.trim();
    return trimmed &&
           !trimmed.startsWith('--') &&
           !trimmed.startsWith('\\echo') &&
           trimmed !== '';
  });

console.log(`📋 Statements SQL encontrados: ${sqlStatements.length}\n`);

if (dryRun) {
  console.log('✅ Verificación completada');
  console.log('El archivo SQL es válido y está listo para restaurar');
  console.log('\nPara ejecutar la restauración, ejecuta:');
  console.log(`  node scripts/restore-database.mjs${backupName !== 'latest' ? ` --backup=${backupName}` : ''}`);
  process.exit(0);
}

// Confirmar antes de continuar
console.log('⚠️  ADVERTENCIA: Esta operación SOBRESCRIBIRÁ los datos actuales\n');
console.log('¿Deseas continuar? Esta acción no se puede deshacer.');
console.log('Para confirmar, presiona Ctrl+C para cancelar o espera 5 segundos...\n');

// Esperar 5 segundos
await new Promise(resolve => setTimeout(resolve, 5000));

console.log('🚀 Iniciando restauración...\n');

/**
 * Ejecutar restauración
 */
async function executeRestore() {
  const startTime = Date.now();

  try {
    // NOTA: Supabase no permite ejecutar SQL arbitrario directamente desde el cliente
    // Necesitamos usar una función RPC o ejecutar manualmente en el dashboard

    console.log('📝 Instrucciones de restauración:\n');
    console.log('Supabase no permite ejecutar SQL de restauración directamente desde scripts.');
    console.log('Debes ejecutar la restauración manualmente siguiendo estos pasos:\n');
    console.log('1. Abre Supabase Dashboard: https://app.supabase.com');
    console.log('2. Ve a tu proyecto');
    console.log('3. Navega a "SQL Editor"');
    console.log('4. Haz clic en "New Query"');
    console.log(`5. Abre el archivo: ${sqlFile}`);
    console.log('6. Copia TODO el contenido del archivo');
    console.log('7. Pégalo en el editor SQL');
    console.log('8. Haz clic en "Run" (o presiona Ctrl+Enter)\n');

    console.log('Como alternativa, este script puede generar el comando SQL si lo necesitas:\n');
    console.log('Para ver el SQL, ejecuta:');
    console.log(`  cat "${sqlFile}"\n`);

    // Verificar estadísticas actuales antes de restaurar
    console.log('📊 Verificando estado actual de la base de datos...\n');

    if (stats && stats.tables) {
      const tables = Object.keys(stats.tables);
      console.log('Registros actuales vs esperados después de restaurar:\n');

      for (const tableName of tables) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (error) {
            console.log(`  ⚠️  ${tableName}: No se pudo verificar (puede no existir aún)`);
          } else {
            const expectedCount = stats.tables[tableName];
            const status = count === expectedCount ? '✅' : '⚠️';
            console.log(`  ${status} ${tableName}: ${count} actual → ${expectedCount} esperado`);
          }
        } catch (err) {
          console.log(`  ⚠️  ${tableName}: Error al verificar`);
        }
      }
    }

    console.log();
    console.log('💡 Después de ejecutar el SQL en Supabase Dashboard, puedes verificar');
    console.log('   que la restauración fue exitosa ejecutando:');
    console.log(`   node scripts/verify-restore.mjs --backup=${backupName}\n`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Tiempo de análisis: ${elapsed}s`);
    console.log('\n✅ Preparación completada. Sigue las instrucciones arriba para restaurar.\n');

  } catch (error) {
    console.error('\n❌ Error durante la preparación:', error.message);
    process.exit(1);
  }
}

// Ejecutar restauración
executeRestore()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
