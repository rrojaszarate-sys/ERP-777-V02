/**
 * Migración 026: Agregar columna detalle_retorno
 * Para almacenar el detalle de materiales en retornos
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function main() {
  console.log('🚀 Ejecutando migración 026: Detalle de retornos\n');

  const client = new Client({
    connectionString: process.env.DATABASE_POOLER_TX_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // 1. Agregar columna detalle_retorno
    console.log('📝 Agregando columna detalle_retorno...');
    await client.query(`
      ALTER TABLE evt_gastos_erp
      ADD COLUMN IF NOT EXISTS detalle_retorno JSONB
    `);
    console.log('✅ Columna detalle_retorno agregada');

    // 2. Agregar comentario
    await client.query(`
      COMMENT ON COLUMN evt_gastos_erp.detalle_retorno IS
      'Detalle de materiales en retornos: [{producto_id, producto_nombre, cantidad, costo_unitario, subtotal}]'
    `);
    console.log('✅ Comentario agregado');

    // 3. Verificar
    const { rows } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'evt_gastos_erp'
      AND column_name IN ('tipo_movimiento', 'detalle_retorno')
      ORDER BY column_name
    `);
    console.log('\n📊 Columnas de retornos:');
    console.table(rows);

    console.log('\n✅ Migración 026 completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
