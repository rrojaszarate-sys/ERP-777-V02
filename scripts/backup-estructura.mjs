#!/usr/bin/env node

/**
 * Script para respaldar la ESTRUCTURA COMPLETA de la base de datos
 * Genera un archivo SQL con todas las definiciones DDL (CREATE TABLE, índices, constraints, etc.)
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
};

const pool = new Pool(config);

async function backupEstructura() {
  let client;

  try {
    client = await pool.connect();
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📦 RESPALDO DE ESTRUCTURA DE BASE DE DATOS               ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = resolve(__dirname, '../backups');

    // Crear directorio de backups si no existe
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('✅ Directorio de respaldos creado: backups/\n');
    }

    const filename = `estructura_completa_${timestamp}.sql`;
    const filepath = resolve(backupDir, filename);

    let sqlContent = '';

    // Header del archivo
    sqlContent += `-- ============================================================\n`;
    sqlContent += `-- RESPALDO DE ESTRUCTURA COMPLETA - ERP 777\n`;
    sqlContent += `-- Fecha: ${new Date().toLocaleString('es-MX')}\n`;
    sqlContent += `-- Base de datos: ${process.env.DB_NAME}\n`;
    sqlContent += `-- Host: ${config.host}\n`;
    sqlContent += `-- ============================================================\n\n`;
    sqlContent += `-- Este archivo contiene SOLO la estructura (DDL)\n`;
    sqlContent += `-- NO incluye datos, solo definiciones de tablas, índices, constraints, etc.\n\n`;

    console.log('📋 Obteniendo lista de schemas...');

    // Obtener schemas (excepto los del sistema)
    const schemas = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);

    console.log(`   Encontrados ${schemas.rows.length} schemas\n`);

    for (const schemaRow of schemas.rows) {
      const schemaName = schemaRow.schema_name;

      console.log(`📁 Procesando schema: ${schemaName}`);

      sqlContent += `\n-- ============================================================\n`;
      sqlContent += `-- SCHEMA: ${schemaName}\n`;
      sqlContent += `-- ============================================================\n\n`;

      // Crear schema (excepto public que ya existe)
      if (schemaName !== 'public') {
        sqlContent += `CREATE SCHEMA IF NOT EXISTS ${schemaName};\n\n`;
      }

      // Obtener todas las tablas del schema
      const tables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `, [schemaName]);

      console.log(`   Tablas encontradas: ${tables.rows.length}`);

      for (const tableRow of tables.rows) {
        const tableName = tableRow.table_name;
        const fullTableName = `${schemaName}.${tableName}`;

        console.log(`   - Exportando: ${tableName}`);

        sqlContent += `-- ------------------------------------------------------------\n`;
        sqlContent += `-- Tabla: ${fullTableName}\n`;
        sqlContent += `-- ------------------------------------------------------------\n\n`;

        // Obtener definición de la tabla
        const columns = await client.query(`
          SELECT
            column_name,
            data_type,
            character_maximum_length,
            column_default,
            is_nullable,
            udt_name
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `, [schemaName, tableName]);

        sqlContent += `CREATE TABLE IF NOT EXISTS ${fullTableName} (\n`;

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

        // Obtener constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK)
        const constraints = await client.query(`
          SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.update_rule,
            rc.delete_rule
          FROM information_schema.table_constraints AS tc
          LEFT JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          LEFT JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.table_schema = rc.constraint_schema
          WHERE tc.table_schema = $1 AND tc.table_name = $2
          ORDER BY tc.constraint_type, tc.constraint_name
        `, [schemaName, tableName]);

        // Agrupar constraints por nombre
        const constraintMap = {};
        for (const constraint of constraints.rows) {
          if (!constraintMap[constraint.constraint_name]) {
            constraintMap[constraint.constraint_name] = {
              type: constraint.constraint_type,
              columns: [],
              foreign_table_schema: constraint.foreign_table_schema,
              foreign_table_name: constraint.foreign_table_name,
              foreign_columns: [],
              update_rule: constraint.update_rule,
              delete_rule: constraint.delete_rule
            };
          }
          if (constraint.column_name) {
            constraintMap[constraint.constraint_name].columns.push(constraint.column_name);
          }
          if (constraint.foreign_column_name) {
            constraintMap[constraint.constraint_name].foreign_columns.push(constraint.foreign_column_name);
          }
        }

        // Generar SQL para constraints
        for (const [constraintName, constraint] of Object.entries(constraintMap)) {
          if (constraint.type === 'PRIMARY KEY') {
            sqlContent += `ALTER TABLE ${fullTableName} ADD CONSTRAINT ${constraintName} `;
            sqlContent += `PRIMARY KEY (${constraint.columns.join(', ')});\n`;
          } else if (constraint.type === 'FOREIGN KEY') {
            sqlContent += `ALTER TABLE ${fullTableName} ADD CONSTRAINT ${constraintName} `;
            sqlContent += `FOREIGN KEY (${constraint.columns.join(', ')}) `;
            sqlContent += `REFERENCES ${constraint.foreign_table_schema}.${constraint.foreign_table_name} `;
            sqlContent += `(${constraint.foreign_columns.join(', ')})`;
            if (constraint.update_rule && constraint.update_rule !== 'NO ACTION') {
              sqlContent += ` ON UPDATE ${constraint.update_rule}`;
            }
            if (constraint.delete_rule && constraint.delete_rule !== 'NO ACTION') {
              sqlContent += ` ON DELETE ${constraint.delete_rule}`;
            }
            sqlContent += ';\n';
          } else if (constraint.type === 'UNIQUE') {
            sqlContent += `ALTER TABLE ${fullTableName} ADD CONSTRAINT ${constraintName} `;
            sqlContent += `UNIQUE (${constraint.columns.join(', ')});\n`;
          }
        }

        // Obtener índices (que no sean automáticos por constraints)
        const indexes = await client.query(`
          SELECT
            indexname,
            indexdef
          FROM pg_indexes
          WHERE schemaname = $1 AND tablename = $2
            AND indexname NOT IN (
              SELECT constraint_name
              FROM information_schema.table_constraints
              WHERE table_schema = $1 AND table_name = $2
            )
        `, [schemaName, tableName]);

        for (const index of indexes.rows) {
          sqlContent += `${index.indexdef};\n`;
        }

        sqlContent += '\n';
      }
    }

    // Obtener extensiones instaladas
    console.log('\n📦 Obteniendo extensiones instaladas...');
    const extensions = await client.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname NOT IN ('plpgsql')
      ORDER BY extname
    `);

    if (extensions.rows.length > 0) {
      sqlContent += `\n-- ============================================================\n`;
      sqlContent += `-- EXTENSIONES\n`;
      sqlContent += `-- ============================================================\n\n`;

      for (const ext of extensions.rows) {
        sqlContent += `-- CREATE EXTENSION IF NOT EXISTS ${ext.extname} WITH SCHEMA public;\n`;
        console.log(`   - ${ext.extname} v${ext.extversion}`);
      }
      sqlContent += '\n';
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
    console.log(`📊 Schemas exportados: ${schemas.rows.length}`);
    console.log(`📦 Extensiones: ${extensions.rows.length}\n`);

  } catch (error) {
    console.error('\n❌ Error durante el respaldo:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

backupEstructura().catch(console.error);
