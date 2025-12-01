import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    const tables = [
      'evt_eventos_erp',
      'evt_gastos_erp',
      'evt_ingresos_erp',
      'evt_clientes_erp',
      'evt_categorias_gastos_erp',
      'evt_provisiones_erp',
      'evt_estados_erp'
    ];

    for (const table of tables) {
      console.log(`\n\n📋 Columnas de ${table}:`);
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      for (const col of result.rows) {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      }
    }

    // Ver la definición actual de la vista
    console.log('\n\n📄 Definición actual de vw_eventos_analisis_financiero_erp:');
    const vistaResult = await client.query(`
      SELECT view_definition
      FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = 'vw_eventos_analisis_financiero_erp'
    `);
    if (vistaResult.rows.length > 0) {
      console.log(vistaResult.rows[0].view_definition);
    } else {
      console.log('Vista no existe');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

main();
