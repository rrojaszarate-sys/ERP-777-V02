#!/usr/bin/env node
/**
 * SCRIPT: CREAR TABLAS GNI
 * Crea solo las tablas de catálogos necesarias para GNI
 */

import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: Variable DATABASE_URL no encontrada en .env');
  process.exit(1);
}

async function crearTablas() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('      CREANDO TABLAS GNI');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('   ✅ Conectado\n');

    // 1. Crear tabla cat_claves_gasto
    console.log('📋 Creando tabla cat_claves_gasto...');
    await client.query(`
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
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_cat_claves_gasto_clave ON cat_claves_gasto(clave);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cat_claves_gasto_cuenta ON cat_claves_gasto(cuenta);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cat_claves_gasto_company ON cat_claves_gasto(company_id);');
    console.log('   ✅ cat_claves_gasto creada\n');

    // 2. Crear tabla cat_formas_pago
    console.log('💳 Creando tabla cat_formas_pago...');
    await client.query(`
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
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_cat_formas_pago_nombre ON cat_formas_pago(nombre);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cat_formas_pago_company ON cat_formas_pago(company_id);');
    console.log('   ✅ cat_formas_pago creada\n');

    // 3. Crear tabla cat_proveedores
    console.log('🏢 Creando tabla cat_proveedores...');
    await client.query(`
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
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_cat_proveedores_rfc ON cat_proveedores(rfc);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cat_proveedores_razon ON cat_proveedores(razon_social);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cat_proveedores_company ON cat_proveedores(company_id);');
    console.log('   ✅ cat_proveedores creada\n');

    // 4. Crear tabla cat_ejecutivos
    console.log('👤 Creando tabla cat_ejecutivos...');
    await client.query(`
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
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_cat_ejecutivos_nombre ON cat_ejecutivos(nombre);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cat_ejecutivos_company ON cat_ejecutivos(company_id);');
    console.log('   ✅ cat_ejecutivos creada\n');

    // 5. Crear tabla gni_gastos (para gastos no impactados)
    console.log('💰 Creando tabla gni_gastos...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS gni_gastos (
        id SERIAL PRIMARY KEY,
        company_id UUID REFERENCES core_companies(id),
        periodo VARCHAR(7) NOT NULL,
        fecha_gasto DATE,
        proveedor_id INTEGER REFERENCES cat_proveedores(id),
        concepto TEXT NOT NULL,
        clave_gasto_id INTEGER REFERENCES cat_claves_gasto(id),
        subtotal NUMERIC(12,2) DEFAULT 0,
        iva NUMERIC(12,2) DEFAULT 0,
        total NUMERIC(12,2) DEFAULT 0,
        forma_pago_id INTEGER REFERENCES cat_formas_pago(id),
        ejecutivo_id INTEGER REFERENCES cat_ejecutivos(id),
        validacion VARCHAR(20) DEFAULT 'pendiente',
        status_pago VARCHAR(20) DEFAULT 'pendiente',
        folio_factura VARCHAR(50),
        documento_url TEXT,
        importado_de VARCHAR(50),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_gni_gastos_company ON gni_gastos(company_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_gni_gastos_periodo ON gni_gastos(periodo);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_gni_gastos_proveedor ON gni_gastos(proveedor_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_gni_gastos_clave ON gni_gastos(clave_gasto_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_gni_gastos_validacion ON gni_gastos(validacion);');
    console.log('   ✅ gni_gastos creada\n');

    // 6. Crear vista v_gastos_no_impactados
    console.log('👁️  Creando vista v_gastos_no_impactados...');
    await client.query(`
      CREATE OR REPLACE VIEW v_gastos_no_impactados AS
      SELECT
        g.id,
        g.company_id,
        g.periodo,
        g.fecha_gasto,
        p.id AS proveedor_id,
        p.razon_social AS proveedor,
        p.rfc AS rfc_proveedor,
        g.concepto,
        c.subcuenta,
        c.cuenta,
        c.clave,
        g.subtotal,
        g.iva,
        g.total,
        g.validacion,
        g.status_pago,
        f.nombre AS forma_pago,
        e.nombre AS ejecutivo,
        g.folio_factura,
        g.documento_url,
        g.created_at,
        g.updated_at
      FROM gni_gastos g
      LEFT JOIN cat_proveedores p ON g.proveedor_id = p.id
      LEFT JOIN cat_claves_gasto c ON g.clave_gasto_id = c.id
      LEFT JOIN cat_formas_pago f ON g.forma_pago_id = f.id
      LEFT JOIN cat_ejecutivos e ON g.ejecutivo_id = e.id
      WHERE g.activo = true;
    `);
    console.log('   ✅ v_gastos_no_impactados creada\n');

    // 7. Habilitar RLS
    console.log('🔒 Habilitando Row Level Security...');
    const tables = ['cat_claves_gasto', 'cat_formas_pago', 'cat_proveedores', 'cat_ejecutivos', 'gni_gastos'];

    for (const table of tables) {
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);

      // Políticas permisivas para desarrollo
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = '${table}_select') THEN
            CREATE POLICY "${table}_select" ON ${table} FOR SELECT USING (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = '${table}_insert') THEN
            CREATE POLICY "${table}_insert" ON ${table} FOR INSERT WITH CHECK (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = '${table}_update') THEN
            CREATE POLICY "${table}_update" ON ${table} FOR UPDATE USING (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = '${table}_delete') THEN
            CREATE POLICY "${table}_delete" ON ${table} FOR DELETE USING (true);
          END IF;
        END
        $$;
      `);
      console.log(`   ✅ ${table}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ TABLAS GNI CREADAS EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Verificar
    console.log('📊 Resumen de tablas creadas:');
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   - ${table}: ${result.rows[0].count} registros`);
    }
    console.log('');

    return true;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return false;
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada\n');
  }
}

crearTablas().catch(console.error);
