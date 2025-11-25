import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

console.log('🚀 Ejecutando migración directamente en Supabase...\n');

async function ejecutarMigracion() {
  try {
    // Leer el archivo SQL
    const sql = readFileSync('./migrations/009_enhance_financial_view_with_income_analysis.sql', 'utf8');

    console.log('✅ Archivo leído exitosamente');
    console.log(`📊 Tamaño: ${(sql.length / 1024).toFixed(2)} KB\n`);

    // Extraer project ref de la URL
    const projectRef = process.env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

    console.log('⚠️  NOTA: La API REST de Supabase no permite ejecutar SQL arbitrario.');
    console.log('    Voy a intentar usando pg directamente...\n');

    // Intentar con pg
    const { default: pg } = await import('pg');
    const { Client } = pg;

    // Construir connection string desde las credenciales
    const connectionString = `postgresql://postgres.${projectRef}:${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

    console.log('🔌 Conectando a la base de datos...\n');

    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Conectado exitosamente\n');

    console.log('⚡ Ejecutando migración...\n');

    const result = await client.query(sql);

    console.log('✅ Migración ejecutada exitosamente!\n');
    console.log('='.repeat(70));

    await client.end();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    if (error.message.includes('no pg_hba.conf entry')) {
      console.log('\n⚠️  Error de autenticación. Probando método alternativo...\n');
      console.log('📋 Debes ejecutar manualmente en Supabase Dashboard:');
      console.log(`   https://supabase.com/dashboard/project/${process.env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1]}/sql\n`);
    }
  }
}

ejecutarMigracion();
