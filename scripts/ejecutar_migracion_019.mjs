#!/usr/bin/env node
/**
 * SCRIPT: Ejecutar migración 019 - Vista v_gastos_no_impactados
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function ejecutarMigracion() {
  const client = await pool.connect();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   EJECUTANDO MIGRACIÓN 019');
  console.log('   Vista v_gastos_no_impactados');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Leer archivo de migración
    const sqlPath = path.join(__dirname, '..', 'migrations', '019_crear_vista_gastos_no_impactados.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Ejecutando migración desde:', sqlPath);
    console.log('');

    await client.query(sql);

    console.log('✅ Migración 019 ejecutada correctamente\n');

    // Verificar que la vista existe
    const vistaCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = 'v_gastos_no_impactados'
      )
    `);

    if (vistaCheck.rows[0].exists) {
      console.log('✅ Vista v_gastos_no_impactados creada correctamente');

      // Contar registros
      const countResult = await client.query('SELECT COUNT(*) as count FROM v_gastos_no_impactados');
      console.log(`   📊 Registros en vista: ${countResult.rows[0].count}`);
    } else {
      console.log('❌ Vista v_gastos_no_impactados NO se creó');
    }

    // Verificar vista legacy
    const legacyCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = 'v_gni_legacy'
      )
    `);

    if (legacyCheck.rows[0].exists) {
      console.log('✅ Vista v_gni_legacy creada correctamente');
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   MIGRACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ ERROR EN MIGRACIÓN:', error.message);
    if (error.detail) console.error('   Detalle:', error.detail);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

ejecutarMigracion();
