#!/usr/bin/env node

/**
 * Script para respaldar TODOS LOS DATOS de la base de datos
 * Genera un archivo SQL con todos los INSERT statements
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

function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  // String: escapar comillas simples
  return `'${value.toString().replace(/'/g, "''")}'`;
}

async function backupDatos() {
  const client = await pool.connect();

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  💾 RESPALDO DE DATOS DE BASE DE DATOS                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = resolve(__dirname, '../backups');

    // Crear directorio de backups si no existe
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('✅ Directorio de respaldos creado: backups/\n');
    }

    const filename = `datos_completos_${timestamp}.sql`;
    const filepath = resolve(backupDir, filename);

    let sqlContent = '';

    // Header del archivo
    sqlContent += `-- ============================================================\n`;
    sqlContent += `-- RESPALDO DE DATOS COMPLETO - ERP 777\n`;
    sqlContent += `-- Fecha: ${new Date().toLocaleString('es-MX')}\n`;
    sqlContent += `-- Base de datos: ${process.env.DB_NAME}\n`;
    sqlContent += `-- Host: ${config.host}\n`;
    sqlContent += `-- ============================================================\n\n`;
    sqlContent += `-- Este archivo contiene SOLO los datos (INSERT statements)\n`;
    sqlContent += `-- NO incluye la estructura, solo los datos actuales\n\n`;
    sqlContent += `-- IMPORTANTE: Para restaurar, primero debe existir la estructura\n`;
    sqlContent += `-- de las tablas. Use el archivo de estructura primero.\n\n`;

    console.log('📋 Obteniendo lista de schemas...');

    // Obtener schemas (excepto los del sistema)
    const schemas = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);

    console.log(`   Encontrados ${schemas.rows.length} schemas\n`);

    let totalRegistros = 0;
    const estadisticas = [];

    for (const schemaRow of schemas.rows) {
      const schemaName = schemaRow.schema_name;

      console.log(`📁 Procesando schema: ${schemaName}`);

      sqlContent += `\n-- ============================================================\n`;
      sqlContent += `-- SCHEMA: ${schemaName}\n`;
      sqlContent += `-- ============================================================\n\n`;

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

        // Contar registros
        const countResult = await client.query(`SELECT COUNT(*) as total FROM ${fullTableName}`);
        const rowCount = parseInt(countResult.rows[0].total);

        console.log(`   - ${tableName}: ${rowCount} registros`);

        if (rowCount === 0) {
          sqlContent += `-- Tabla ${fullTableName}: vacía (0 registros)\n\n`;
          estadisticas.push({ schema: schemaName, tabla: tableName, registros: 0 });
          continue;
        }

        sqlContent += `-- ------------------------------------------------------------\n`;
        sqlContent += `-- Tabla: ${fullTableName} (${rowCount} registros)\n`;
        sqlContent += `-- ------------------------------------------------------------\n\n`;

        // Obtener nombres de columnas
        const columnsResult = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `, [schemaName, tableName]);

        const columnNames = columnsResult.rows.map(row => row.column_name);

        // Obtener todos los datos
        const dataResult = await client.query(`SELECT * FROM ${fullTableName}`);

        // Desactivar triggers temporalmente (para facilitar la restauración)
        sqlContent += `-- Desactivar triggers temporalmente\n`;
        sqlContent += `ALTER TABLE ${fullTableName} DISABLE TRIGGER ALL;\n\n`;

        // Generar INSERT statements en lotes de 100 registros
        const batchSize = 100;
        for (let i = 0; i < dataResult.rows.length; i += batchSize) {
          const batch = dataResult.rows.slice(i, i + batchSize);

          sqlContent += `INSERT INTO ${fullTableName} (${columnNames.join(', ')}) VALUES\n`;

          const values = batch.map(row => {
            const rowValues = columnNames.map(col => escapeSqlValue(row[col]));
            return `  (${rowValues.join(', ')})`;
          });

          sqlContent += values.join(',\n');
          sqlContent += ';\n\n';
        }

        // Reactivar triggers
        sqlContent += `-- Reactivar triggers\n`;
        sqlContent += `ALTER TABLE ${fullTableName} ENABLE TRIGGER ALL;\n\n`;

        // Actualizar secuencias si existen
        const sequences = await client.query(`
          SELECT column_name, column_default
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
            AND column_default LIKE 'nextval%'
        `, [schemaName, tableName]);

        if (sequences.rows.length > 0) {
          for (const seq of sequences.rows) {
            const seqName = seq.column_default.match(/'([^']+)'/)?.[1];
            if (seqName) {
              sqlContent += `-- Actualizar secuencia para ${seq.column_name}\n`;
              sqlContent += `SELECT setval('${seqName}', (SELECT MAX(${seq.column_name}) FROM ${fullTableName}), true);\n`;
            }
          }
          sqlContent += '\n';
        }

        totalRegistros += rowCount;
        estadisticas.push({ schema: schemaName, tabla: tableName, registros: rowCount });
      }
    }

    // Escribir archivo
    fs.writeFileSync(filepath, sqlContent, 'utf8');

    const fileSizeMB = (fs.statSync(filepath).size / (1024 * 1024)).toFixed(2);

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ RESPALDO DE DATOS COMPLETADO                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`📄 Archivo generado: ${filename}`);
    console.log(`📁 Ubicación: ${filepath}`);
    console.log(`💾 Tamaño: ${fileSizeMB} MB`);
    console.log(`📊 Total de registros: ${totalRegistros.toLocaleString('es-MX')}`);
    console.log(`📋 Tablas exportadas: ${estadisticas.length}\n`);

    // Mostrar estadísticas por schema
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 ESTADÍSTICAS POR SCHEMA');
    console.log('═══════════════════════════════════════════════════════════\n');

    const schemaStats = {};
    for (const stat of estadisticas) {
      if (!schemaStats[stat.schema]) {
        schemaStats[stat.schema] = { tablas: 0, registros: 0 };
      }
      schemaStats[stat.schema].tablas++;
      schemaStats[stat.schema].registros += stat.registros;
    }

    for (const [schema, stats] of Object.entries(schemaStats)) {
      console.log(`📁 ${schema}:`);
      console.log(`   Tablas: ${stats.tablas}`);
      console.log(`   Registros: ${stats.registros.toLocaleString('es-MX')}\n`);
    }

    // Mostrar top 10 tablas con más registros
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 TOP 10 TABLAS CON MÁS REGISTROS');
    console.log('═══════════════════════════════════════════════════════════\n');

    estadisticas
      .sort((a, b) => b.registros - a.registros)
      .slice(0, 10)
      .forEach((stat, idx) => {
        console.log(`${idx + 1}. ${stat.schema}.${stat.tabla}: ${stat.registros.toLocaleString('es-MX')} registros`);
      });

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error durante el respaldo:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

backupDatos().catch(console.error);
