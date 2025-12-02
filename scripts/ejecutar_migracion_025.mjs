/**
 * Script para ejecutar migración 025: Retornos de Material
 * Agrega campo tipo_movimiento a evt_gastos_erp
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function main() {
  console.log('🚀 Ejecutando migración 025: Retornos de Material\n');

  // Usar la URL de pooler en modo transacción
  const connectionString = process.env.DATABASE_POOLER_TX_URL || process.env.DATABASE_URL;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // 1. Verificar si la columna ya existe
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'evt_gastos_erp'
      AND column_name = 'tipo_movimiento'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('ℹ️  La columna tipo_movimiento ya existe');
    } else {
      // 2. Agregar columna tipo_movimiento
      console.log('📝 Agregando columna tipo_movimiento...');
      await client.query(`
        ALTER TABLE evt_gastos_erp
        ADD COLUMN tipo_movimiento VARCHAR(20) DEFAULT 'gasto'
      `);
      console.log('✅ Columna tipo_movimiento agregada');
    }

    // 3. Agregar constraint CHECK si no existe
    console.log('📝 Agregando constraint CHECK...');
    try {
      await client.query(`
        ALTER TABLE evt_gastos_erp
        DROP CONSTRAINT IF EXISTS chk_tipo_movimiento;

        ALTER TABLE evt_gastos_erp
        ADD CONSTRAINT chk_tipo_movimiento
        CHECK (tipo_movimiento IN ('gasto', 'retorno'))
      `);
      console.log('✅ Constraint CHECK agregado');
    } catch (e) {
      console.log('ℹ️  Constraint ya existe o no se pudo agregar:', e.message);
    }

    // 4. Actualizar registros existentes
    console.log('📝 Actualizando registros existentes...');
    const updateResult = await client.query(`
      UPDATE evt_gastos_erp
      SET tipo_movimiento = 'gasto'
      WHERE tipo_movimiento IS NULL
    `);
    console.log(`✅ ${updateResult.rowCount} registros actualizados`);

    // 5. Crear índice
    console.log('📝 Creando índice...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gastos_tipo_movimiento
      ON evt_gastos_erp(tipo_movimiento)
    `);
    console.log('✅ Índice creado');

    // 6. Crear vista de gastos netos
    console.log('📝 Creando vista vw_gastos_netos_evento...');
    await client.query(`
      CREATE OR REPLACE VIEW vw_gastos_netos_evento AS
      SELECT
        evento_id,
        categoria_id,
        -- Gastos normales
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' OR tipo_movimiento IS NULL THEN subtotal ELSE 0 END), 0) as gastos_subtotal,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' OR tipo_movimiento IS NULL THEN iva ELSE 0 END), 0) as gastos_iva,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' OR tipo_movimiento IS NULL THEN total ELSE 0 END), 0) as gastos_total,
        -- Retornos
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN subtotal ELSE 0 END), 0) as retornos_subtotal,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN iva ELSE 0 END), 0) as retornos_iva,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN total ELSE 0 END), 0) as retornos_total,
        -- Netos (gastos - retornos)
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' OR tipo_movimiento IS NULL THEN subtotal ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN subtotal ELSE 0 END), 0) as neto_subtotal,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' OR tipo_movimiento IS NULL THEN iva ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN iva ELSE 0 END), 0) as neto_iva,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'gasto' OR tipo_movimiento IS NULL THEN total ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'retorno' THEN total ELSE 0 END), 0) as neto_total,
        -- Contadores
        COUNT(*) FILTER (WHERE tipo_movimiento = 'gasto' OR tipo_movimiento IS NULL) as num_gastos,
        COUNT(*) FILTER (WHERE tipo_movimiento = 'retorno') as num_retornos
      FROM evt_gastos_erp
      WHERE deleted_at IS NULL
      GROUP BY evento_id, categoria_id
    `);
    console.log('✅ Vista vw_gastos_netos_evento creada');

    // 7. Verificar resultado
    const verify = await client.query(`
      SELECT
        tipo_movimiento,
        COUNT(*) as cantidad,
        SUM(total) as total
      FROM evt_gastos_erp
      WHERE deleted_at IS NULL
      GROUP BY tipo_movimiento
    `);
    console.log('\n📊 Resumen de gastos por tipo:');
    console.table(verify.rows);

    console.log('\n✅ Migración 025 completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
