#!/usr/bin/env node
/**
 * Ejecutar migración 021: Mover tablas viejas a esquema deprecated
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

// Obtener DATABASE_URL de las variables de entorno
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida en .env');
  process.exit(1);
}

// Añadir SSL requerido para Supabase
const connectionConfig = {
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

async function ejecutarMigracion() {
  console.log('🔄 Ejecutando migración 021: Mover tablas viejas a esquema deprecated...\n');

  const client = new Client(connectionConfig);

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', '021_move_old_tables_to_deprecated.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Ejecutando migración...');
    console.log('─'.repeat(60));

    // Ejecutar cada statement por separado
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt || stmt.startsWith('--')) continue;

      const shortStmt = stmt.substring(0, 60).replace(/\n/g, ' ');
      console.log(`\n⏳ [${i + 1}/${statements.length}] ${shortStmt}...`);

      try {
        await client.query(stmt + ';');
        console.log('   ✅ OK');
        successCount++;
      } catch (error) {
        // Ignorar errores de "tabla no existe" ya que algunas pueden no existir
        if (error.message.includes('does not exist') || error.message.includes('no existe')) {
          console.log(`   ⚠️  Ignorado: ${error.message.substring(0, 50)}`);
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`\n✅ Migración completada:`);
    console.log(`   - Statements exitosos: ${successCount}`);
    console.log(`   - Errores: ${errorCount}`);

    // Verificar que el esquema deprecated existe
    const { rows } = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = 'deprecated'
    `);

    if (rows.length > 0) {
      console.log('\n📁 Esquema "deprecated" creado correctamente');

      // Listar tablas en el esquema deprecated
      const { rows: tables } = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'deprecated'
        ORDER BY table_name
      `);

      if (tables.length > 0) {
        console.log('\n📋 Tablas en esquema deprecated:');
        tables.forEach(t => console.log(`   - ${t.table_name}`));
      } else {
        console.log('\n⚠️  No hay tablas en el esquema deprecated (puede que las tablas no existieran)');
      }
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
  } finally {
    await client.end();
  }
}

ejecutarMigracion();
