#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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

async function listarTodasLasTablas() {
  const client = await pool.connect();

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📋 LISTADO COMPLETO DE TODAS LAS TABLAS                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Listar TODAS las tablas de TODOS los schemas
    const todasLasTablas = await client.query(`
      SELECT
        t.table_schema,
        t.table_name,
        t.table_type,
        pg_size_pretty(pg_total_relation_size('"' || t.table_schema || '"."' || t.table_name || '"')) as size,
        (SELECT COUNT(*)
         FROM information_schema.columns c
         WHERE c.table_schema = t.table_schema
           AND c.table_name = t.table_name) as num_columnas
      FROM information_schema.tables t
      WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_schema, t.table_name
    `);

    console.log(`Total de tablas encontradas: ${todasLasTablas.rows.length}\n`);

    let schemaActual = '';
    let tablasPublic = 0;
    let tablasAuth = 0;
    let tablasStorage = 0;
    let tablasRealtime = 0;
    let tablasOtros = 0;

    todasLasTablas.rows.forEach(row => {
      if (row.table_schema !== schemaActual) {
        schemaActual = row.table_schema;
        console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
        console.log(`║  📁 SCHEMA: ${row.table_schema.toUpperCase().padEnd(47)} ║`);
        console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
      }

      console.log(`   📋 ${row.table_name}`);
      console.log(`      Tipo: ${row.table_type} | Columnas: ${row.num_columnas} | Tamaño: ${row.size}`);

      // Contar por schema
      if (row.table_schema === 'public') tablasPublic++;
      else if (row.table_schema === 'auth') tablasAuth++;
      else if (row.table_schema === 'storage') tablasStorage++;
      else if (row.table_schema === 'realtime') tablasRealtime++;
      else tablasOtros++;
    });

    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📊 RESUMEN POR SCHEMA                                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`   📁 public:    ${tablasPublic} tablas ${tablasPublic === 0 ? '⚠️  VACÍO' : ''}`);
    console.log(`   🔐 auth:      ${tablasAuth} tablas`);
    console.log(`   💾 storage:   ${tablasStorage} tablas`);
    console.log(`   🔄 realtime:  ${tablasRealtime} tablas`);
    console.log(`   📦 otros:     ${tablasOtros} tablas`);
    console.log(`\n   TOTAL:       ${todasLasTablas.rows.length} tablas\n`);

    // Buscar específicamente tablas del ERP
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  🔍 BÚSQUEDA DE TABLAS DEL ERP                            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const tablasERP = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name LIKE 'evt_%'
         OR table_name LIKE '%evento%'
         OR table_name LIKE '%gasto%'
         OR table_name LIKE '%ingreso%'
         OR table_name LIKE '%cuenta%'
      ORDER BY table_name
    `);

    if (tablasERP.rows.length === 0) {
      console.log('   ❌ NO SE ENCONTRARON TABLAS DEL ERP\n');
      console.log('   Búsqueda realizada:');
      console.log('   - Tablas que empiezan con "evt_"');
      console.log('   - Tablas que contienen "evento"');
      console.log('   - Tablas que contienen "gasto"');
      console.log('   - Tablas que contienen "ingreso"');
      console.log('   - Tablas que contienen "cuenta"\n');
    } else {
      console.log(`   ✅ Encontradas ${tablasERP.rows.length} tablas relacionadas:\n`);
      tablasERP.rows.forEach(row => {
        console.log(`   📋 ${row.table_schema}.${row.table_name}`);
      });
    }

    // Ver si hay datos en las tablas de auth (usuarios)
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  👥 USUARIOS EN AUTH                                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    try {
      const usuarios = await client.query('SELECT COUNT(*) as total FROM auth.users');
      console.log(`   Total de usuarios registrados: ${usuarios.rows[0].total}\n`);
    } catch (err) {
      console.log(`   ⚠️  No se pudo consultar auth.users: ${err.message}\n`);
    }

    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

listarTodasLasTablas().catch(console.error);
