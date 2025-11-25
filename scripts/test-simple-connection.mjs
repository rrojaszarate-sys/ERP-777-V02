#!/usr/bin/env node

/**
 * Script simple de prueba de conexión a Supabase
 */

import pg from 'pg';
const { Client } = pg;

const DB_PASSWORD = 'See6EtZTSed2Ae4F';

console.log('\n╔═══════════════════════════════════════════════╗');
console.log('║  🔍 DIAGNÓSTICO SIMPLE DE CONEXIÓN            ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Probar con el pooler en modo transacción (el más recomendado)
const config = {
  host: 'aws-1-ca-central-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.vhltbvkymrdgtimkuytn',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
};

console.log('📋 Configuración de conexión:');
console.log(`   Host: ${config.host}`);
console.log(`   Puerto: ${config.port}`);
console.log(`   Usuario: ${config.user}`);
console.log(`   Base de datos: ${config.database}`);
console.log(`   SSL: Habilitado\n`);

const client = new Client(config);

async function test() {
  try {
    console.log('🔌 Conectando...');
    await client.connect();
    console.log('✅ Conexión establecida\n');

    // Test 1: Consulta básica
    console.log('📊 Test 1: Información del servidor');
    const result1 = await client.query('SELECT version(), current_user, current_database()');
    console.log(`   Usuario: ${result1.rows[0].current_user}`);
    console.log(`   Base de datos: ${result1.rows[0].current_database}`);
    console.log(`   Versión: ${result1.rows[0].version.split(' ').slice(0, 2).join(' ')}\n`);

    // Test 2: Listar schemas
    console.log('📂 Test 2: Schemas disponibles');
    const result2 = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);
    console.log(`   Schemas encontrados: ${result2.rows.length}`);
    result2.rows.forEach(row => console.log(`   - ${row.schema_name}`));
    console.log('');

    // Test 3: Listar todas las tablas
    console.log('📋 Test 3: Tablas en schema public');
    const result3 = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log(`   Tablas encontradas: ${result3.rows.length}`);
    if (result3.rows.length === 0) {
      console.log('   ⚠️  No hay tablas en el schema public');
      console.log('   💡 Esto puede significar que:');
      console.log('      - La base de datos es nueva y no tiene tablas creadas');
      console.log('      - Las tablas están en otro schema');
      console.log('      - Necesitas ejecutar migraciones/scripts de creación\n');
    } else {
      result3.rows.slice(0, 20).forEach(row => {
        console.log(`   - ${row.table_name} (${row.table_type})`);
      });
      if (result3.rows.length > 20) {
        console.log(`   ... y ${result3.rows.length - 20} más\n`);
      }
    }

    // Test 4: Verificar extensiones
    console.log('🔌 Test 4: Extensiones instaladas');
    const result4 = await client.query(`
      SELECT extname, extversion
      FROM pg_extension
      ORDER BY extname
    `);
    console.log(`   Extensiones: ${result4.rows.length}`);
    result4.rows.forEach(row => console.log(`   - ${row.extname} (v${row.extversion})`));
    console.log('');

    // Test 5: Permisos del usuario
    console.log('🔐 Test 5: Permisos del usuario');
    const result5 = await client.query(`
      SELECT
        has_database_privilege(current_user, current_database(), 'CREATE') as can_create,
        has_database_privilege(current_user, current_database(), 'CONNECT') as can_connect,
        has_schema_privilege(current_user, 'public', 'CREATE') as can_create_in_public,
        has_schema_privilege(current_user, 'public', 'USAGE') as can_use_public
    `);
    const perms = result5.rows[0];
    console.log(`   Conectar a DB: ${perms.can_connect ? '✅' : '❌'}`);
    console.log(`   Crear en DB: ${perms.can_create ? '✅' : '❌'}`);
    console.log(`   Usar schema public: ${perms.can_use_public ? '✅' : '❌'}`);
    console.log(`   Crear en schema public: ${perms.can_create_in_public ? '✅' : '❌'}`);
    console.log('');

    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  ✅ TODAS LAS PRUEBAS COMPLETADAS             ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('📝 Resumen:');
    console.log(`   La conexión a la base de datos funciona correctamente`);
    if (result3.rows.length === 0) {
      console.log(`   ⚠️  La base de datos está vacía (sin tablas)`);
      console.log(`   💡 Necesitas crear las tablas del ERP usando scripts de migración\n`);
    } else {
      console.log(`   ✅ La base de datos tiene ${result3.rows.length} tablas\n`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) console.error(`   Código: ${error.code}`);
    if (error.severity) console.error(`   Severidad: ${error.severity}`);

    console.log('\n💡 Posibles soluciones:');
    console.log('   1. Verifica que la contraseña sea correcta');
    console.log('   2. Verifica que el proyecto Supabase esté activo (no pausado)');
    console.log('   3. Ve a https://supabase.com/dashboard/project/vhltbvkymrdgtimkuytn');
    console.log('   4. Verifica el estado del proyecto en el dashboard');
    console.log('   5. Si el proyecto está pausado, reactívalo\n');
  } finally {
    await client.end();
  }
}

test().catch(console.error);
