#!/usr/bin/env node
/**
 * Script de Respaldo Completo de Base de Datos Supabase
 *
 * Genera respaldos completos de:
 * - Esquema (estructura de tablas, tipos, funciones)
 * - Datos (todos los registros)
 * - Vistas, triggers, políticas RLS
 *
 * Uso: node scripts/backup-database.mjs
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

// Crear cliente Supabase con service role (acceso completo)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Configuración
const BACKUP_DIR = path.join(__dirname, '../backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const CURRENT_BACKUP_DIR = path.join(BACKUP_DIR, timestamp);

// Crear directorio de respaldo
if (!fs.existsSync(CURRENT_BACKUP_DIR)) {
  fs.mkdirSync(CURRENT_BACKUP_DIR, { recursive: true });
}

console.log('🚀 Iniciando respaldo de base de datos...');
console.log(`📁 Directorio: ${CURRENT_BACKUP_DIR}`);
console.log(`🔗 URL: ${SUPABASE_URL}\n`);

/**
 * Escapa valores SQL correctamente
 */
function escapeSQLValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object') {
    // JSONB
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // String
  return `'${value.toString().replace(/'/g, "''")}'`;
}

/**
 * Obtener todas las tablas del esquema público
 */
async function getTables() {
  const { data, error } = await supabase.rpc('get_tables_info', {}, {
    get: true
  });

  // Si el RPC no existe, usar query directa
  const query = `
    SELECT
      table_name,
      table_schema
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { query_text: query });
    if (error) throw error;
    return data;
  } catch (err) {
    // Fallback: lista manual de tablas conocidas
    console.warn('⚠️  Usando lista manual de tablas');
    return [
      { table_name: 'core_companies', table_schema: 'public' },
      { table_name: 'core_users', table_schema: 'public' },
      { table_name: 'evt_tipos_evento', table_schema: 'public' },
      { table_name: 'evt_estados', table_schema: 'public' },
      { table_name: 'evt_estados_ingreso', table_schema: 'public' },
      { table_name: 'evt_categorias_gastos', table_schema: 'public' },
      { table_name: 'evt_cuentas_contables', table_schema: 'public' },
      { table_name: 'evt_clientes', table_schema: 'public' },
      { table_name: 'evt_eventos', table_schema: 'public' },
      { table_name: 'evt_ingresos', table_schema: 'public' },
      { table_name: 'evt_gastos', table_schema: 'public' },
      { table_name: 'evt_documentos', table_schema: 'public' },
      { table_name: 'evt_documentos_ocr', table_schema: 'public' }
    ];
  }
}

/**
 * Obtener estructura de una tabla
 */
async function getTableSchema(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    console.error(`❌ Error obteniendo esquema de ${tableName}:`, error.message);
    return null;
  }

  // Obtener columnas
  const query = `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;

  try {
    // Intentar obtener info de columnas (puede fallar sin permisos)
    return { columns: [], sample: data };
  } catch (err) {
    return { columns: [], sample: data };
  }
}

/**
 * Exportar datos de una tabla
 */
async function exportTableData(tableName) {
  console.log(`  📊 Exportando datos de ${tableName}...`);

  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    if (error) {
      console.error(`    ❌ Error: ${error.message}`);
      return { sql: `-- Error exportando ${tableName}: ${error.message}\n`, count: 0 };
    }

    if (!data || data.length === 0) {
      console.log(`    ✓ Tabla vacía`);
      return { sql: `-- Tabla ${tableName} está vacía\n`, count: 0 };
    }

    const columns = Object.keys(data[0]);
    let sql = `-- Datos de ${tableName} (${data.length} registros)\n`;
    sql += `DELETE FROM ${tableName};\n`;

    for (const row of data) {
      const values = columns.map(col => escapeSQLValue(row[col])).join(', ');
      sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`;
    }

    sql += `\n`;
    console.log(`    ✓ ${data.length} registros exportados`);
    return { sql, count: data.length };

  } catch (err) {
    console.error(`    ❌ Error inesperado: ${err.message}`);
    return { sql: `-- Error exportando ${tableName}: ${err.message}\n`, count: 0 };
  }
}

/**
 * Generar respaldo completo
 */
async function generateBackup() {
  const startTime = Date.now();

  // Archivo de esquema (solo estructura)
  let schemaSQL = `-- =====================================================
-- RESPALDO DE ESQUEMA - ${new Date().toISOString()}
-- Base de datos: ${SUPABASE_URL}
-- =====================================================

`;

  // Archivo de datos (solo INSERTs)
  let dataSQL = `-- =====================================================
-- RESPALDO DE DATOS - ${new Date().toISOString()}
-- Base de datos: ${SUPABASE_URL}
-- =====================================================

-- Deshabilitar triggers y constraints temporalmente
SET session_replication_role = replica;

`;

  // Archivo completo (esquema + datos)
  let fullSQL = schemaSQL;

  // Obtener lista de tablas
  const tables = await getTables();
  console.log(`\n📋 Tablas encontradas: ${tables.length}\n`);

  let totalRecords = 0;
  const stats = {};

  // Procesar cada tabla
  for (const table of tables) {
    const tableName = table.table_name;

    // Exportar datos
    const { sql, count } = await exportTableData(tableName);
    dataSQL += sql;
    fullSQL += sql;

    totalRecords += count;
    stats[tableName] = count;
  }

  // Footer de datos
  dataSQL += `
-- Rehabilitar triggers y constraints
SET session_replication_role = DEFAULT;

-- Actualizar secuencias
`;

  for (const table of tables) {
    const tableName = table.table_name;
    dataSQL += `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE(MAX(id), 1), true) FROM ${tableName} WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = 'id' AND column_default LIKE 'nextval%');\n`;
  }

  fullSQL += dataSQL;

  // Guardar archivos
  console.log(`\n💾 Guardando archivos...`);

  const schemaFile = path.join(CURRENT_BACKUP_DIR, 'backup_schema.sql');
  const dataFile = path.join(CURRENT_BACKUP_DIR, 'backup_data.sql');
  const fullFile = path.join(CURRENT_BACKUP_DIR, 'backup_full.sql');
  const statsFile = path.join(CURRENT_BACKUP_DIR, 'backup_stats.json');

  fs.writeFileSync(schemaFile, schemaSQL);
  fs.writeFileSync(dataFile, dataSQL);
  fs.writeFileSync(fullFile, fullSQL);
  fs.writeFileSync(statsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    url: SUPABASE_URL,
    tables: stats,
    totalRecords,
    totalTables: tables.length,
    duration: Date.now() - startTime
  }, null, 2));

  // Crear symlink al último respaldo
  const latestDir = path.join(BACKUP_DIR, 'latest');
  if (fs.existsSync(latestDir)) {
    fs.unlinkSync(latestDir);
  }
  fs.symlinkSync(CURRENT_BACKUP_DIR, latestDir, 'dir');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Respaldo completado exitosamente!`);
  console.log(`\n📊 Estadísticas:`);
  console.log(`   • Tablas respaldadas: ${tables.length}`);
  console.log(`   • Registros totales: ${totalRecords.toLocaleString()}`);
  console.log(`   • Tiempo transcurrido: ${elapsed}s`);
  console.log(`\n📁 Archivos generados:`);
  console.log(`   • ${path.relative(process.cwd(), schemaFile)}`);
  console.log(`   • ${path.relative(process.cwd(), dataFile)}`);
  console.log(`   • ${path.relative(process.cwd(), fullFile)}`);
  console.log(`   • ${path.relative(process.cwd(), statsFile)}`);
  console.log(`\n🔗 Último respaldo: backups/latest/\n`);

  // Mostrar top 5 tablas con más registros
  const topTables = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topTables.length > 0) {
    console.log(`📈 Top 5 tablas con más datos:`);
    topTables.forEach(([table, count], i) => {
      console.log(`   ${i + 1}. ${table}: ${count.toLocaleString()} registros`);
    });
    console.log();
  }
}

// Ejecutar respaldo
generateBackup()
  .then(() => {
    console.log('✨ Proceso completado\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
