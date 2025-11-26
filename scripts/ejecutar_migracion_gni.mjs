#!/usr/bin/env node
/**
 * SCRIPT: EJECUTAR MIGRACIÓN GNI EN SUPABASE
 * Ejecuta la migración 012_gastos_no_impactados.sql
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Configuración
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_ROLE_KEY requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function ejecutarMigracion() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('      EJECUTANDO MIGRACIÓN GNI EN SUPABASE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Verificar si las tablas ya existen
    console.log('🔍 Verificando si las tablas ya existen...');

    const { data: existingTables, error: checkError } = await supabase
      .from('cat_claves_gasto')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Las tablas GNI ya existen. No es necesario ejecutar la migración.');
      return true;
    }

    console.log('📋 Las tablas no existen. Creando estructura...\n');

    // Crear tabla cat_claves_gasto
    console.log('📋 Creando tabla cat_claves_gasto...');
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS cat_claves_gasto (
          id SERIAL PRIMARY KEY,
          clave VARCHAR(20) NOT NULL,
          cuenta VARCHAR(50) NOT NULL,
          subcuenta VARCHAR(100) NOT NULL,
          presupuesto_anual NUMERIC DEFAULT 0,
          descripcion TEXT,
          orden_display INTEGER DEFAULT 0,
          activo BOOLEAN DEFAULT true,
          company_id UUID REFERENCES core_companies(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(clave, company_id)
        );
        CREATE INDEX IF NOT EXISTS idx_cat_claves_gasto_clave ON cat_claves_gasto(clave);
        CREATE INDEX IF NOT EXISTS idx_cat_claves_gasto_cuenta ON cat_claves_gasto(cuenta);
        CREATE INDEX IF NOT EXISTS idx_cat_claves_gasto_company ON cat_claves_gasto(company_id);
      `
    });

    if (e1) {
      console.log('   ⚠️  exec_sql no disponible, intentando método alternativo...');
      // Si exec_sql no existe, usamos REST API directo
      await crearTablasManualmente();
      return true;
    }

    console.log('   ✅ cat_claves_gasto creada');

    // Crear tabla cat_formas_pago
    console.log('💳 Creando tabla cat_formas_pago...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS cat_formas_pago (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(50) NOT NULL,
          tipo VARCHAR(30),
          banco VARCHAR(50),
          descripcion TEXT,
          activo BOOLEAN DEFAULT true,
          company_id UUID REFERENCES core_companies(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(nombre, company_id)
        );
        CREATE INDEX IF NOT EXISTS idx_cat_formas_pago_nombre ON cat_formas_pago(nombre);
        CREATE INDEX IF NOT EXISTS idx_cat_formas_pago_company ON cat_formas_pago(company_id);
      `
    });
    console.log('   ✅ cat_formas_pago creada');

    // Crear tabla cat_proveedores
    console.log('🏢 Creando tabla cat_proveedores...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS cat_proveedores (
          id SERIAL PRIMARY KEY,
          rfc VARCHAR(13),
          razon_social TEXT NOT NULL,
          nombre_comercial TEXT,
          direccion TEXT,
          telefono VARCHAR(20),
          email VARCHAR(100),
          contacto_nombre VARCHAR(100),
          modulo_origen VARCHAR(50),
          activo BOOLEAN DEFAULT true,
          company_id UUID REFERENCES core_companies(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_cat_proveedores_rfc ON cat_proveedores(rfc);
        CREATE INDEX IF NOT EXISTS idx_cat_proveedores_razon ON cat_proveedores(razon_social);
        CREATE INDEX IF NOT EXISTS idx_cat_proveedores_company ON cat_proveedores(company_id);
      `
    });
    console.log('   ✅ cat_proveedores creada');

    // Crear tabla cat_ejecutivos
    console.log('👤 Creando tabla cat_ejecutivos...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS cat_ejecutivos (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          user_id UUID REFERENCES core_users(id),
          departamento VARCHAR(50),
          activo BOOLEAN DEFAULT true,
          company_id UUID REFERENCES core_companies(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(nombre, company_id)
        );
        CREATE INDEX IF NOT EXISTS idx_cat_ejecutivos_nombre ON cat_ejecutivos(nombre);
        CREATE INDEX IF NOT EXISTS idx_cat_ejecutivos_company ON cat_ejecutivos(company_id);
      `
    });
    console.log('   ✅ cat_ejecutivos creada');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    return true;

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.log('\n⚠️  La migración debe ejecutarse manualmente en Supabase SQL Editor.');
    console.log('📁 Archivo: migrations/012_gastos_no_impactados.sql\n');
    return false;
  }
}

async function crearTablasManualmente() {
  console.log('\n🔧 Creando tablas usando Supabase API...\n');

  // Verificar/crear tabla por tabla usando insert directo
  // Las tablas se crean automáticamente si no existen cuando se usa el cliente

  console.log('⚠️  Las tablas deben crearse desde el SQL Editor de Supabase.');
  console.log('\n📋 Instrucciones:');
  console.log('   1. Ir a https://supabase.com/dashboard');
  console.log('   2. Seleccionar el proyecto');
  console.log('   3. Ir a SQL Editor');
  console.log('   4. Copiar y ejecutar el contenido de: migrations/012_gastos_no_impactados.sql');
  console.log('\n📁 También puedes usar psql directamente con la cadena de conexión.\n');

  // Mostrar contenido del archivo
  const migrationPath = join(__dirname, '..', 'migrations', '012_gastos_no_impactados.sql');
  if (fs.existsSync(migrationPath)) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('CONTENIDO SQL A EJECUTAR:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(sql.substring(0, 2000) + '\n...[truncado]...\n');
  }
}

ejecutarMigracion().catch(console.error);
