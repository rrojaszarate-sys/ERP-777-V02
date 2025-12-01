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

    // Verificar si vw_eventos_completos_erp existe
    console.log('\n📋 Verificando vw_eventos_completos_erp:');
    const vistaCompletos = await client.query(`
      SELECT view_definition
      FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = 'vw_eventos_completos_erp'
    `);
    if (vistaCompletos.rows.length > 0) {
      console.log(vistaCompletos.rows[0].view_definition);
    } else {
      console.log('❌ Vista vw_eventos_completos_erp NO EXISTE');
    }

    // Verificar si tipos_eventos_erp existe (referenciada en vw_eventos_analisis_financiero_erp)
    console.log('\n📋 Verificando tabla tipos_eventos_erp:');
    const tiposEventos = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'tipos_eventos_erp'
    `);
    if (tiposEventos.rows.length > 0) {
      console.log('✅ tipos_eventos_erp existe');
    } else {
      console.log('❌ tipos_eventos_erp NO EXISTE');

      // Buscar tablas similares
      const similares = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name LIKE '%tipo%evento%'
      `);
      console.log('Tablas similares:', similares.rows.map(r => r.table_name));
    }

    // Probar que la vista funcione
    console.log('\n📊 Probando vw_eventos_analisis_financiero_erp:');
    try {
      const testView = await client.query(`SELECT COUNT(*) as count FROM vw_eventos_analisis_financiero_erp`);
      console.log(`✅ Vista funciona: ${testView.rows[0].count} eventos`);

      const sample = await client.query(`SELECT id, clave_evento, nombre_proyecto, estado_nombre, gastos_totales, ingresos_totales FROM vw_eventos_analisis_financiero_erp LIMIT 3`);
      console.log('\nMuestra de datos:');
      for (const row of sample.rows) {
        console.log(`  - ${row.clave_evento}: ${row.nombre_proyecto} | Gastos: $${row.gastos_totales} | Ingresos: $${row.ingresos_totales}`);
      }
    } catch (err) {
      console.log('❌ Error en vista:', err.message);
    }

    // Verificar vistas que apuntan a tablas viejas
    console.log('\n\n📋 Buscando vistas que aún usan tablas deprecated...');
    const vistasViejas = await client.query(`
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      AND (
        view_definition LIKE '%evt_eventos %'
        OR view_definition LIKE '%evt_gastos %'
        OR view_definition LIKE '%evt_ingresos %'
        OR view_definition LIKE '%evt_clientes %'
        OR view_definition LIKE '%gastos_erp %'
        OR view_definition LIKE '%ingresos_erp %'
        OR view_definition LIKE '%eventos_erp %'
        OR view_definition LIKE '%deprecated.%'
      )
    `);

    if (vistasViejas.rows.length > 0) {
      console.log(`⚠️ Encontradas ${vistasViejas.rows.length} vistas con referencias potencialmente viejas:`);
      for (const row of vistasViejas.rows) {
        console.log(`\n  📄 ${row.table_name}`);
      }
    } else {
      console.log('✅ No se encontraron vistas con referencias a tablas deprecated');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

main();
