const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: 'aws-1-ca-central-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.gomnouwackzvthpwyric',
    password: 'Chopito2008!!',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando a la base de datos...');
    await client.connect();
    console.log('Conexión exitosa!');

    const migrationPath = path.join(__dirname, '../migrations/031_eventos_usar_ejecutivos.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Ejecutando migración 031_eventos_usar_ejecutivos.sql...');
    await client.query(sql);
    console.log('✅ Migración ejecutada exitosamente!');

    // Verificar que las columnas se crearon
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'evt_eventos_erp'
        AND column_name IN ('ejecutivo_responsable_id', 'ejecutivo_solicitante_id')
    `);

    console.log('\nColumnas creadas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (err) {
    console.error('Error ejecutando migración:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nConexión cerrada.');
  }
}

runMigration();
