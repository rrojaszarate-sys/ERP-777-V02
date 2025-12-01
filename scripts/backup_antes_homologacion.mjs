#!/usr/bin/env node
/**
 * BACKUP ANTES DE HOMOLOGACIÓN
 * Respalda todas las tablas de eventos, gastos, ingresos y GNI
 * Fecha: 2025-11-28
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// Tablas a respaldar
const TABLAS_BACKUP = [
  // Eventos
  'evt_eventos',
  'evt_gastos',
  'evt_ingresos',
  'evt_clientes',
  'evt_tipos_evento',
  'evt_estados',
  'evt_categorias_gasto',
  'evt_cuentas_ingreso',
  'evt_cuentas_gasto',
  'evt_documentos',

  // GNI
  'cont_gastos_externos',
  'cat_claves_gasto',
  'cat_formas_pago',
  'cat_proveedores',
  'cat_ejecutivos',

  // Core
  'core_companies',
  'core_users'
];

async function backupTabla(client, tabla) {
  try {
    // Verificar si la tabla existe
    const existsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )
    `, [tabla]);

    if (!existsResult.rows[0].exists) {
      console.log(`  ⚠️  Tabla ${tabla} no existe, omitiendo...`);
      return { tabla, count: 0, data: [] };
    }

    const result = await client.query(`SELECT * FROM ${tabla}`);
    console.log(`  ✅ ${tabla}: ${result.rows.length} registros`);
    return {
      tabla,
      count: result.rows.length,
      data: result.rows
    };
  } catch (error) {
    console.log(`  ❌ Error en ${tabla}: ${error.message}`);
    return { tabla, count: 0, data: [], error: error.message };
  }
}

async function main() {
  const client = await pool.connect();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   BACKUP ANTES DE HOMOLOGACIÓN - ERP 777');
  console.log('   Fecha:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    const backup = {
      fecha: new Date().toISOString(),
      version: 'pre-homologacion-v017',
      tablas: {}
    };

    console.log('📦 Respaldando tablas...\n');

    for (const tabla of TABLAS_BACKUP) {
      const resultado = await backupTabla(client, tabla);
      backup.tablas[tabla] = resultado;
    }

    // Guardar backup
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_homologacion_${timestamp}.json`);

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ BACKUP COMPLETADO');
    console.log(`📁 Archivo: ${backupFile}`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Resumen
    console.log('\n📊 RESUMEN:');
    let totalRegistros = 0;
    for (const [tabla, data] of Object.entries(backup.tablas)) {
      if (data.count > 0) {
        console.log(`   ${tabla}: ${data.count} registros`);
        totalRegistros += data.count;
      }
    }
    console.log(`\n   TOTAL: ${totalRegistros} registros respaldados`);

  } catch (error) {
    console.error('❌ Error durante el backup:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
