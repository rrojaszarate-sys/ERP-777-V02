#!/usr/bin/env node

/**
 * Script de prueba de conexión a base de datos Supabase
 * Prueba diferentes métodos de conexión:
 * 1. Conexión directa
 * 2. Connection pooler (transaction mode)
 * 3. Connection pooler (session mode)
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Pool } = pg;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURACIÓN DE CONEXIÓN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DB_PASSWORD = 'See6EtZTSed2Ae4F';

const configs = {
  directa: {
    connectionString: `postgresql://postgres:${DB_PASSWORD}@db.vhltbvkymrdgtimkuytn.supabase.co:5432/postgres`,
    nombre: '🔗 Conexión Directa',
    ssl: { rejectUnauthorized: false }
  },
  poolerTransaction: {
    connectionString: `postgresql://postgres.vhltbvkymrdgtimkuytn:${DB_PASSWORD}@aws-1-ca-central-1.pooler.supabase.com:6543/postgres`,
    nombre: '⚡ Pooler (Transaction Mode)',
    ssl: { rejectUnauthorized: false }
  },
  poolerSession: {
    connectionString: `postgresql://postgres.vhltbvkymrdgtimkuytn:${DB_PASSWORD}@aws-1-ca-central-1.pooler.supabase.com:5432/postgres`,
    nombre: '🔄 Pooler (Session Mode)',
    ssl: { rejectUnauthorized: false }
  }
};

const SUPABASE_URL = 'https://vhltbvkymrdgtimkuytn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobHRidmt5bXJkZ3RpbWt1eXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5NjI5NjcsImV4cCI6MjA0NzUzODk2N30.KzQzRjZlY2E1YzZlNjk3OWVjMTY5NjY5Y2E5YzZlNjk3OWVjMTY5NjY5Y2E5YzZlNjk3OWVjMTY5NjY5Y2E5Yw';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FUNCIONES DE PRUEBA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Prueba de conexión usando pg (PostgreSQL nativo)
 */
async function testPostgresConnection(config) {
  console.log(`\n${config.nombre}`);
  console.log('━'.repeat(50));

  const pool = new Pool({
    connectionString: config.connectionString,
    max: 1,
    connectionTimeoutMillis: 10000,
    ssl: config.ssl
  });

  try {
    const start = Date.now();
    const client = await pool.connect();
    const time = Date.now() - start;

    console.log(`✅ Conexión exitosa (${time}ms)`);

    // Prueba de consulta simple
    const result = await client.query('SELECT version(), current_database(), current_user, now()');
    console.log('\n📊 Información de la base de datos:');
    console.log(`   Base de datos: ${result.rows[0].current_database}`);
    console.log(`   Usuario: ${result.rows[0].current_user}`);
    console.log(`   Hora del servidor: ${result.rows[0].now}`);

    // Prueba de listado de tablas
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 10
    `);

    console.log(`\n📋 Tablas encontradas (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    client.release();
    return true;
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}`);
    if (error.code) console.log(`   Código: ${error.code}`);
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Prueba de conexión usando Supabase Client
 */
async function testSupabaseClient() {
  console.log(`\n🚀 Cliente Supabase (API REST)`);
  console.log('━'.repeat(50));

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const start = Date.now();
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(10);

    const time = Date.now() - start;

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return false;
    }

    console.log(`✅ Conexión exitosa (${time}ms)`);
    console.log(`\n📋 Tablas encontradas (${data?.length || 0}):`);
    data?.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Prueba específica de tablas del ERP
 */
async function testERPTables(config) {
  console.log(`\n📦 Verificación de Tablas ERP`);
  console.log('━'.repeat(50));

  const pool = new Pool({
    connectionString: config.connectionString,
    max: 1,
    connectionTimeoutMillis: 10000,
    ssl: config.ssl
  });

  try {
    const client = await pool.connect();

    // Buscar tablas que empiecen con evt_
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'evt_%'
      ORDER BY table_name
    `);

    console.log(`✅ Tablas ERP encontradas: ${result.rows.length}`);
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Contar registros en evt_cuentas_contables si existe
    const cuentasResult = await client.query(`
      SELECT COUNT(*) as count
      FROM evt_cuentas_contables
    `).catch(() => null);

    if (cuentasResult) {
      console.log(`\n📊 Registros en evt_cuentas_contables: ${cuentasResult.rows[0].count}`);
    }

    client.release();
    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EJECUCIÓN PRINCIPAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  🧪 PRUEBA DE CONEXIÓN A BASE DE DATOS        ║');
  console.log('║  Proyecto: vhltbvkymrdgtimkuytn               ║');
  console.log('║  Región: aws-1-ca-central-1                   ║');
  console.log('╚════════════════════════════════════════════════╝');

  if (DB_PASSWORD === '[TU_NUEVA_CONTRASEÑA]') {
    console.log('\n⚠️  ATENCIÓN: Debes reemplazar [TU_NUEVA_CONTRASEÑA] con tu contraseña real');
    console.log('   Edita el archivo y cambia la línea 13:\n');
    console.log('   const DB_PASSWORD = \'tu_contraseña_aqui\';\n');
    process.exit(1);
  }

  const results = {
    directa: false,
    poolerTransaction: false,
    poolerSession: false,
    supabase: false,
    erpTables: false
  };

  // Probar conexión directa
  results.directa = await testPostgresConnection(configs.directa);

  // Probar pooler transaction
  results.poolerTransaction = await testPostgresConnection(configs.poolerTransaction);

  // Probar pooler session
  results.poolerSession = await testPostgresConnection(configs.poolerSession);

  // Probar cliente Supabase
  results.supabase = await testSupabaseClient();

  // Si alguna conexión funcionó, probar tablas ERP
  if (results.directa || results.poolerTransaction || results.poolerSession) {
    const workingConfig = results.directa ? configs.directa :
                          results.poolerTransaction ? configs.poolerTransaction :
                          configs.poolerSession;
    results.erpTables = await testERPTables(workingConfig);
  }

  // Resumen final
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  📊 RESUMEN DE PRUEBAS                         ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log(`Conexión directa:        ${results.directa ? '✅ OK' : '❌ FALLO'}`);
  console.log(`Pooler (Transaction):    ${results.poolerTransaction ? '✅ OK' : '❌ FALLO'}`);
  console.log(`Pooler (Session):        ${results.poolerSession ? '✅ OK' : '❌ FALLO'}`);
  console.log(`Cliente Supabase:        ${results.supabase ? '✅ OK' : '❌ FALLO'}`);
  console.log(`Tablas ERP:              ${results.erpTables ? '✅ OK' : '❌ FALLO'}`);

  const allPassed = Object.values(results).every(r => r);
  const anyPassed = Object.values(results).some(r => r);

  if (allPassed) {
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('\n💡 Recomendación: Usa el Pooler en Transaction Mode para mejor rendimiento');
  } else if (anyPassed) {
    console.log('\n⚠️  Algunas pruebas fallaron, pero tienes conexión funcional');
  } else {
    console.log('\n❌ Todas las pruebas fallaron. Verifica:');
    console.log('   1. La contraseña es correcta');
    console.log('   2. La base de datos permite conexiones externas');
    console.log('   3. No hay firewall bloqueando los puertos 5432 o 6543');
  }

  console.log('\n');
}

main().catch(console.error);
