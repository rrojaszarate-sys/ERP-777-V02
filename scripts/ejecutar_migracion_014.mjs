#!/usr/bin/env node
/**
 * SCRIPT: EJECUTAR MIGRACIÓN 014
 * Agrega campos bancarios a proveedores_erp
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;

// Configuración
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no configurada');
  process.exit(1);
}

async function ejecutarMigracion() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   EJECUTAR MIGRACIÓN 014 - CAMPOS BANCARIOS PROVEEDORES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Leer el archivo SQL
    const sqlPath = join(__dirname, '..', 'migrations', '014_campos_bancarios_proveedores.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📄 Ejecutando migración...\n');
    await client.query(sql);

    console.log('✅ Migración ejecutada exitosamente\n');

    // Verificar campos creados
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'proveedores_erp'
      AND column_name IN ('banco', 'cuenta_bancaria', 'clabe_interbancaria', 'codigo_itiana')
    `);

    console.log('📋 Campos verificados:');
    for (const row of result.rows) {
      console.log(`   ✓ ${row.column_name} (${row.data_type})`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   ✅ MIGRACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

ejecutarMigracion();
