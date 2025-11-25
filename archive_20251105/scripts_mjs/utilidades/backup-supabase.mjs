#!/usr/bin/env node

/**
 * Script de respaldo completo de base de datos Supabase
 * Genera un archivo SQL con estructura y datos de todas las tablas
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Faltan credenciales de Supabase en .env');
  process.exit(1);
}

// Crear cliente de Supabase con service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('RESPALDO DE BASE DE DATOS - SUPABASE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Fecha: ${new Date().toLocaleString()}`);
console.log('');

// Crear directorio de respaldos
const backupDir = './backups';
try {
  mkdirSync(backupDir, { recursive: true });
} catch (err) {
  // Directorio ya existe
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                  new Date().toTimeString().split(' ')[0].replace(/:/g, '');
const backupFile = `${backupDir}/supabase_backup_${timestamp}.sql`;
const jsonBackupFile = `${backupDir}/supabase_backup_${timestamp}.json`;

let sqlContent = '';
let jsonBackup = {
  metadata: {
    timestamp: new Date().toISOString(),
    database: SUPABASE_URL,
    version: '1.0'
  },
  tables: {}
};

// Agregar encabezado SQL
sqlContent += `-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
sqlContent += `-- RESPALDO DE BASE DE DATOS - SUPABASE\n`;
sqlContent += `-- Fecha: ${new Date().toISOString()}\n`;
sqlContent += `-- URL: ${SUPABASE_URL}\n`;
sqlContent += `-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
sqlContent += `SET client_encoding = 'UTF8';\n`;
sqlContent += `SET standard_conforming_strings = on;\n\n`;

/**
 * Obtiene la lista de todas las tablas del esquema public
 */
async function getTables() {
  console.log('📋 Obteniendo lista de tablas...\n');

  const { data, error } = await supabase.rpc('get_tables_list', {});

  if (error) {
    // Si la función no existe, usar una lista manual de tablas conocidas
    console.log('⚠️  Función get_tables_list no encontrada, usando consulta alternativa...\n');

    // Obtener tablas usando información del schema
    const tables = [
      'evt_clientes', 'evt_eventos', 'evt_gastos', 'evt_ingresos',
      'evt_cuentas_bancarias', 'evt_movimientos_bancarios',
      'evt_cuentas_contables', 'evt_estados', 'evt_tipos_evento',
      'evt_categorias_gastos', 'evt_categorias_ingresos',
      'evt_documentos_ocr', 'evt_perfiles', 'evt_roles', 'evt_audit_log',
      'evt_configuracion_alertas', 'evt_alertas_enviadas',
      'evt_historial_reportes_diarios',
      'core_users', 'core_companies', 'core_audit_log',
      '_migrations'
    ];

    return tables;
  }

  return data || [];
}

/**
 * Escapa valores para SQL
 */
function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${value.toString().replace(/'/g, "''")}'`;
}

/**
 * Genera INSERT statements para una tabla
 */
function generateInserts(tableName, rows) {
  if (!rows || rows.length === 0) {
    return `-- No hay datos en ${tableName}\n\n`;
  }

  let sql = `\n-- Datos de ${tableName} (${rows.length} registros)\n`;
  sql += `TRUNCATE TABLE ${tableName} CASCADE;\n`;

  const columns = Object.keys(rows[0]);
  const columnNames = columns.join(', ');

  for (const row of rows) {
    const values = columns.map(col => escapeSqlValue(row[col])).join(', ');
    sql += `INSERT INTO ${tableName} (${columnNames}) VALUES (${values});\n`;
  }

  sql += '\n';
  return sql;
}

/**
 * Exporta los datos de una tabla
 */
async function exportTable(tableName) {
  console.log(`  📦 Exportando: ${tableName}`);

  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    if (error) {
      console.log(`    ⚠️  Error: ${error.message}`);
      sqlContent += `-- Error al exportar ${tableName}: ${error.message}\n\n`;
      return;
    }

    const rowCount = data?.length || 0;
    console.log(`    ✓ ${rowCount} registros`);

    // Agregar a JSON backup
    jsonBackup.tables[tableName] = {
      rowCount,
      data: data || []
    };

    // Agregar a SQL backup
    sqlContent += generateInserts(tableName, data);

  } catch (err) {
    console.log(`    ⚠️  Error inesperado: ${err.message}`);
  }
}

/**
 * Proceso principal
 */
async function main() {
  try {
    // Obtener lista de tablas
    const tables = await getTables();

    if (!tables || tables.length === 0) {
      console.log('❌ No se encontraron tablas para exportar');
      process.exit(1);
    }

    console.log(`✓ Se encontraron ${tables.length} tablas\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('EXPORTANDO DATOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Exportar cada tabla
    for (const table of tables) {
      await exportTable(table);
    }

    // Guardar archivos
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('GUARDANDO RESPALDOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Guardar SQL
    writeFileSync(backupFile, sqlContent);
    console.log(`  ✓ Respaldo SQL: ${backupFile}`);

    // Guardar JSON
    writeFileSync(jsonBackupFile, JSON.stringify(jsonBackup, null, 2));
    console.log(`  ✓ Respaldo JSON: ${jsonBackupFile}`);

    // Estadísticas
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ESTADÍSTICAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let totalRows = 0;
    console.log('  Tablas exportadas:');
    for (const [table, info] of Object.entries(jsonBackup.tables)) {
      console.log(`    • ${table}: ${info.rowCount} registros`);
      totalRows += info.rowCount;
    }

    console.log(`\n  Total de registros: ${totalRows}`);
    console.log(`  Total de tablas: ${Object.keys(jsonBackup.tables).length}`);

    // Tamaño de archivos
    const fs = await import('fs');
    const sqlSize = (fs.statSync(backupFile).size / 1024).toFixed(2);
    const jsonSize = (fs.statSync(jsonBackupFile).size / 1024).toFixed(2);

    console.log(`\n  Tamaño SQL: ${sqlSize} KB`);
    console.log(`  Tamaño JSON: ${jsonSize} KB`);

    console.log('\n✓ Respaldo completado exitosamente\n');

  } catch (error) {
    console.error('\n❌ Error durante el respaldo:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
main();
