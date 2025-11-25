#!/usr/bin/env node

/**
 * Script simplificado para obtener la estructura de las tablas principales del ERP
 * Genera un archivo con las definiciones DDL de las tablas evt_*
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;

const config = {
  host: process.env.DB_POOLER_TX_HOST,
  port: parseInt(process.env.DB_POOLER_TX_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_POOLER_TX_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  query_timeout: 30000,
};

const pool = new Pool(config);

async function backupEstructuraSimple() {
  let client;

  try {
    client = await pool.connect();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📦 RESPALDO DE ESTRUCTURA (TABLAS ERP)                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = resolve(__dirname, '../backups');

    // Crear directorio de backups si no existe
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('✅ Directorio de respaldos creado: backups/\n');
    }

    const filename = `estructura_erp_${timestamp}.sql`;
    const filepath = resolve(backupDir, filename);

    let sqlContent = '';

    // Header del archivo
    sqlContent += `-- ============================================================\n`;
    sqlContent += `-- RESPALDO DE ESTRUCTURA - TABLAS ERP\n`;
    sqlContent += `-- Fecha: ${new Date().toLocaleString('es-MX')}\n`;
    sqlContent += `-- Base de datos: ${process.env.DB_NAME}\n`;
    sqlContent += `-- ============================================================\n\n`;

    console.log('📋 Obteniendo tablas del ERP (evt_*, core_*, prj_*, nom_*)...\n');

    // Obtener tablas principales del schema public
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND (table_name LIKE 'evt_%'
          OR table_name LIKE 'core_%'
          OR table_name LIKE 'prj_%'
          OR table_name LIKE 'nom_%'
          OR table_name LIKE 'con_%')
      ORDER BY table_name
    `);

    console.log(`   Encontradas ${tables.rows.length} tablas\n`);

    let tablasExportadas = 0;

    for (const tableRow of tables.rows) {
      const tableName = tableRow.table_name;

      console.log(`   - Procesando: ${tableName}`);

      sqlContent += `\n-- ============================================================\n`;
      sqlContent += `-- Tabla: ${tableName}\n`;
      sqlContent += `-- ============================================================\n\n`;

      // Obtener columnas de la tabla
      const columns = await client.query(`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          column_default,
          is_nullable,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      // Generar CREATE TABLE
      sqlContent += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;

      const columnDefs = [];
      for (const col of columns.rows) {
        let colDef = `  ${col.column_name} `;

        // Tipo de dato
        if (col.character_maximum_length) {
          colDef += `${col.data_type}(${col.character_maximum_length})`;
        } else if (col.udt_name === 'uuid') {
          colDef += 'uuid';
        } else if (col.udt_name === 'timestamptz') {
          colDef += 'timestamp with time zone';
        } else if (col.udt_name === 'timestamp') {
          colDef += 'timestamp';
        } else if (col.udt_name === 'numeric') {
          colDef += 'numeric';
        } else if (col.udt_name === 'int4') {
          colDef += 'integer';
        } else if (col.udt_name === 'int8') {
          colDef += 'bigint';
        } else if (col.udt_name === 'bool') {
          colDef += 'boolean';
        } else if (col.udt_name === 'text') {
          colDef += 'text';
        } else if (col.udt_name === 'jsonb') {
          colDef += 'jsonb';
        } else if (col.udt_name === 'date') {
          colDef += 'date';
        } else {
          colDef += col.data_type;
        }

        // NOT NULL
        if (col.is_nullable === 'NO') {
          colDef += ' NOT NULL';
        }

        // DEFAULT
        if (col.column_default) {
          colDef += ` DEFAULT ${col.column_default}`;
        }

        columnDefs.push(colDef);
      }

      sqlContent += columnDefs.join(',\n');
      sqlContent += '\n);\n\n';

      tablasExportadas++;
    }

    // Escribir archivo
    fs.writeFileSync(filepath, sqlContent, 'utf8');

    const fileSize = (fs.statSync(filepath).size / 1024).toFixed(2);

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ RESPALDO DE ESTRUCTURA COMPLETADO                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`📄 Archivo generado: ${filename}`);
    console.log(`📁 Ubicación: ${filepath}`);
    console.log(`💾 Tamaño: ${fileSize} KB`);
    console.log(`📋 Tablas exportadas: ${tablasExportadas}\n`);

  } catch (error) {
    console.error('\n❌ Error durante el respaldo:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

backupEstructuraSimple().catch(console.error);
