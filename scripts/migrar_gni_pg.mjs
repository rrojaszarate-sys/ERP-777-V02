#!/usr/bin/env node
/**
 * SCRIPT: EJECUTAR MIGRACIÓN GNI CON PG
 * Ejecuta la migración usando la librería pg directamente
 */

import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const { Client } = pg;

// Configuración
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: Variable DATABASE_URL no encontrada en .env');
  process.exit(1);
}

async function ejecutarMigracion() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('      EJECUTANDO MIGRACIÓN GNI CON PG CLIENT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('   ✅ Conectado\n');

    // Verificar si las tablas ya existen
    console.log('🔍 Verificando si las tablas GNI ya existen...');
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'cat_claves_gasto'
      );
    `);

    if (checkResult.rows[0].exists) {
      console.log('   ✅ Las tablas GNI ya existen.\n');

      // Verificar conteo
      const countClaves = await client.query('SELECT COUNT(*) FROM cat_claves_gasto');
      const countFormas = await client.query('SELECT COUNT(*) FROM cat_formas_pago');
      const countProveedores = await client.query('SELECT COUNT(*) FROM cat_proveedores');
      const countEjecutivos = await client.query('SELECT COUNT(*) FROM cat_ejecutivos');

      console.log('📊 Estado actual de las tablas:');
      console.log(`   - cat_claves_gasto: ${countClaves.rows[0].count} registros`);
      console.log(`   - cat_formas_pago: ${countFormas.rows[0].count} registros`);
      console.log(`   - cat_proveedores: ${countProveedores.rows[0].count} registros`);
      console.log(`   - cat_ejecutivos: ${countEjecutivos.rows[0].count} registros`);
      console.log('');

      return true;
    }

    console.log('   ❌ Las tablas no existen. Ejecutando migración...\n');

    // Leer archivo de migración
    const migrationPath = join(__dirname, '..', 'migrations', '012_gastos_no_impactados.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar migración
    console.log('🔧 Ejecutando SQL de migración...');
    await client.query(sql);
    console.log('   ✅ Migración ejecutada correctamente\n');

    // Verificar creación
    console.log('🔍 Verificando tablas creadas...');

    const tables = ['cat_claves_gasto', 'cat_formas_pago', 'cat_proveedores', 'cat_ejecutivos'];
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [table]);

      if (result.rows[0].exists) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - NO CREADA`);
      }
    }

    // Verificar vista
    const viewResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'v_gastos_no_impactados'
      );
    `);

    if (viewResult.rows[0].exists) {
      console.log(`   ✅ v_gastos_no_impactados (vista)`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ MIGRACIÓN GNI COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    return true;

  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Algunas estructuras ya existían. Esto es normal si es una re-ejecución.');
    }

    return false;
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada\n');
  }
}

ejecutarMigracion().catch(console.error);
