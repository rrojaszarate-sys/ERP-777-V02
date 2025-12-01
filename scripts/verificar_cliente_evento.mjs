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

    // Verificar evento
    console.log('\n📋 Evento actual:');
    const evento = await client.query(`
      SELECT id, clave_evento, nombre_proyecto, cliente_id, estado_id
      FROM evt_eventos_erp
      LIMIT 1
    `);
    console.log(evento.rows[0]);

    // Verificar clientes disponibles
    console.log('\n📋 Clientes en evt_clientes_erp:');
    const clientes = await client.query(`
      SELECT id, razon_social, nombre_comercial, rfc
      FROM evt_clientes_erp
      ORDER BY id
    `);
    for (const c of clientes.rows) {
      console.log(`  ${c.id}: ${c.razon_social} (${c.rfc})`);
    }

    // Si el evento tiene cliente_id null o incorrecto, actualizar
    const eventoRow = evento.rows[0];
    if (!eventoRow.cliente_id || eventoRow.cliente_id === 0) {
      console.log('\n⚠️ El evento no tiene cliente asignado. Buscando DOTERRA...');

      const doterra = await client.query(`
        SELECT id FROM evt_clientes_erp
        WHERE UPPER(razon_social) LIKE '%DOTERRA%' OR UPPER(nombre_comercial) LIKE '%DOTERRA%'
        LIMIT 1
      `);

      if (doterra.rows.length > 0) {
        console.log(`Encontrado cliente DOTERRA con id: ${doterra.rows[0].id}`);

        await client.query(`
          UPDATE evt_eventos_erp SET cliente_id = $1 WHERE id = $2
        `, [doterra.rows[0].id, eventoRow.id]);

        console.log('✅ Cliente asignado al evento');
      } else {
        console.log('❌ No se encontró cliente DOTERRA');
      }
    }

    // Verificar la vista nuevamente
    console.log('\n📊 Vista actualizada:');
    const vista = await client.query(`
      SELECT id, clave_evento, nombre_proyecto, cliente_nombre, estado_nombre, gastos_totales_calc
      FROM vw_eventos_completos_erp
      LIMIT 1
    `);
    console.log(vista.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

main();
