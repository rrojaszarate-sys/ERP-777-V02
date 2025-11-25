#!/usr/bin/env node

/**
 * Script para verificar completamente el contenido de la base de datos
 * usando las variables de entorno del .env
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║  🔍 VERIFICACIÓN COMPLETA DE BASE DE DATOS         ║');
console.log('╚════════════════════════════════════════════════════╝\n');

// Configuración desde .env
const config = {
  host: process.env.DB_POOLER_TX_HOST,
  port: parseInt(process.env.DB_POOLER_TX_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_POOLER_TX_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
};

console.log('📋 Configuración desde .env:');
console.log(`   SUPABASE_URL: ${process.env.VITE_SUPABASE_URL}`);
console.log(`   SUPABASE_PROJECT_ID: ${process.env.SUPABASE_PROJECT_ID}`);
console.log(`   DB_HOST: ${config.host}`);
console.log(`   DB_PORT: ${config.port}`);
console.log(`   DB_USER: ${config.user}`);
console.log(`   DB_NAME: ${config.database}\n`);

const pool = new Pool(config);

async function verificarBaseDatos() {
  const client = await pool.connect();

  try {
    console.log('🔌 Conectando a la base de datos...\n');

    // 1. Info básica
    console.log('═══════════════════════════════════════════════════');
    console.log('1️⃣  INFORMACIÓN BÁSICA DEL SERVIDOR');
    console.log('═══════════════════════════════════════════════════\n');

    const info = await client.query(`
      SELECT
        version() as version,
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        pg_postmaster_start_time() as uptime
    `);

    console.log(`   PostgreSQL: ${info.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    console.log(`   Base de datos: ${info.rows[0].database}`);
    console.log(`   Usuario: ${info.rows[0].user}`);
    console.log(`   Iniciado: ${info.rows[0].uptime}\n`);

    // 2. Schemas
    console.log('═══════════════════════════════════════════════════');
    console.log('2️⃣  SCHEMAS DISPONIBLES');
    console.log('═══════════════════════════════════════════════════\n');

    const schemas = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);

    console.log(`   Total: ${schemas.rows.length} schemas\n`);
    schemas.rows.forEach(row => console.log(`   📁 ${row.schema_name}`));

    // 3. Tablas por schema
    console.log('\n═══════════════════════════════════════════════════');
    console.log('3️⃣  TABLAS POR SCHEMA');
    console.log('═══════════════════════════════════════════════════\n');

    const tablasPorSchema = await client.query(`
      SELECT
        table_schema,
        COUNT(*) as num_tablas,
        string_agg(table_name, ', ' ORDER BY table_name) as tablas
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND table_type = 'BASE TABLE'
      GROUP BY table_schema
      ORDER BY table_schema
    `);

    if (tablasPorSchema.rows.length === 0) {
      console.log('   ⚠️  No hay tablas en ningún schema\n');
    } else {
      tablasPorSchema.rows.forEach(row => {
        console.log(`\n   📁 Schema: ${row.table_schema}`);
        console.log(`   📊 Tablas: ${row.num_tablas}`);
        const tablas = row.tablas.split(', ');
        tablas.forEach(tabla => console.log(`      - ${tabla}`));
      });
    }

    // 4. Buscar tablas del ERP específicamente
    console.log('\n═══════════════════════════════════════════════════');
    console.log('4️⃣  TABLAS DEL ERP (evt_*)');
    console.log('═══════════════════════════════════════════════════\n');

    const tablasERP = await client.query(`
      SELECT
        table_schema,
        table_name,
        (SELECT COUNT(*)
         FROM information_schema.columns
         WHERE columns.table_schema = tables.table_schema
           AND columns.table_name = tables.table_name) as num_columnas
      FROM information_schema.tables
      WHERE table_name LIKE 'evt_%'
      ORDER BY table_name
    `);

    if (tablasERP.rows.length === 0) {
      console.log('   ❌ No se encontraron tablas del ERP (evt_*)\n');
    } else {
      console.log(`   ✅ Encontradas ${tablasERP.rows.length} tablas del ERP:\n`);
      tablasERP.rows.forEach(row => {
        console.log(`   📋 ${row.table_schema}.${row.table_name} (${row.num_columnas} columnas)`);
      });
    }

    // 5. Extensiones
    console.log('\n═══════════════════════════════════════════════════');
    console.log('5️⃣  EXTENSIONES INSTALADAS');
    console.log('═══════════════════════════════════════════════════\n');

    const extensiones = await client.query(`
      SELECT extname, extversion
      FROM pg_extension
      ORDER BY extname
    `);

    extensiones.rows.forEach(row => {
      console.log(`   🔌 ${row.extname} (v${row.extversion})`);
    });

    // 6. Verificar si hay datos en tablas específicas
    console.log('\n═══════════════════════════════════════════════════');
    console.log('6️⃣  CONTEO DE REGISTROS (si hay tablas)');
    console.log('═══════════════════════════════════════════════════\n');

    const todasLasTablas = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (todasLasTablas.rows.length > 0) {
      for (const tabla of todasLasTablas.rows) {
        try {
          const count = await client.query(
            `SELECT COUNT(*) as total FROM ${tabla.table_schema}.${tabla.table_name}`
          );
          console.log(`   📊 ${tabla.table_name}: ${count.rows[0].total} registros`);
        } catch (err) {
          console.log(`   ⚠️  ${tabla.table_name}: Error al contar (${err.message})`);
        }
      }
    } else {
      console.log('   ⚠️  No hay tablas en el schema public para contar\n');
    }

    // 7. Usuarios y roles
    console.log('\n═══════════════════════════════════════════════════');
    console.log('7️⃣  ROLES Y PERMISOS');
    console.log('═══════════════════════════════════════════════════\n');

    const roles = await client.query(`
      SELECT
        rolname,
        rolsuper,
        rolcreatedb,
        rolcreaterole
      FROM pg_roles
      WHERE rolname NOT LIKE 'pg_%'
      ORDER BY rolname
      LIMIT 10
    `);

    roles.rows.forEach(row => {
      const permisos = [];
      if (row.rolsuper) permisos.push('superuser');
      if (row.rolcreatedb) permisos.push('create db');
      if (row.rolcreaterole) permisos.push('create role');
      console.log(`   👤 ${row.rolname}${permisos.length > 0 ? ` (${permisos.join(', ')})` : ''}`);
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ VERIFICACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════\n');

    // Resumen final
    const totalTablas = await client.query(`
      SELECT COUNT(*) as total
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    console.log('📝 RESUMEN:');
    console.log(`   - Conexión: ✅ Exitosa`);
    console.log(`   - Schemas: ${schemas.rows.length}`);
    console.log(`   - Tablas en public: ${totalTablas.rows[0].total}`);
    console.log(`   - Tablas ERP (evt_*): ${tablasERP.rows.length}`);
    console.log(`   - Extensiones: ${extensiones.rows.length}\n`);

    if (parseInt(totalTablas.rows[0].total) === 0) {
      console.log('⚠️  ACCIÓN REQUERIDA:');
      console.log('   La base de datos está vacía. Necesitas:');
      console.log('   1. Ejecutar scripts de migración/creación de tablas');
      console.log('   2. O importar un backup existente\n');
    }

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
verificarBaseDatos().catch(console.error);
