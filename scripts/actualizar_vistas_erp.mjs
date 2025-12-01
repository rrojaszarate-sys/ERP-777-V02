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

    // 1. Verificar las vistas actuales
    console.log('\n📋 Verificando vistas ERP actuales...');
    const viewsResult = await client.query(`
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      AND (table_name LIKE '%erp%' OR table_name LIKE 'vw_%')
      ORDER BY table_name;
    `);

    console.log(`Vistas encontradas: ${viewsResult.rows.length}`);
    for (const row of viewsResult.rows) {
      console.log(`\n📄 ${row.table_name}:`);
      // Mostrar solo las primeras 500 caracteres de la definición
      console.log(row.view_definition?.substring(0, 500) + '...');
    }

    // 2. Verificar tablas evt_*_erp actuales
    console.log('\n\n📋 Verificando tablas evt_*_erp...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'evt_%_erp'
      ORDER BY table_name;
    `);

    console.log('Tablas evt_*_erp:');
    for (const row of tablesResult.rows) {
      console.log(`  - ${row.table_name}`);
    }

    // 3. Recrear vista vw_eventos_completos_erp
    console.log('\n\n🔧 Recreando vista vw_eventos_completos_erp...');
    await client.query(`
      DROP VIEW IF EXISTS vw_eventos_completos_erp CASCADE;
    `);

    await client.query(`
      CREATE VIEW vw_eventos_completos_erp AS
      SELECT
        e.id,
        e.clave,
        e.nombre,
        e.descripcion,
        e.fecha_evento,
        e.fecha_fin,
        e.hora_inicio,
        e.hora_fin,
        e.lugar,
        e.direccion,
        e.ciudad,
        e.estado AS estado_ubicacion,
        e.pais,
        e.codigo_postal,
        e.tipo_evento,
        e.estado,
        e.prioridad,
        e.cliente_id,
        c.nombre AS cliente_nombre,
        c.rfc AS cliente_rfc,
        c.email AS cliente_email,
        e.contacto_nombre,
        e.contacto_email,
        e.contacto_telefono,
        e.presupuesto_estimado,
        e.presupuesto_aprobado,
        e.notas,
        e.activo,
        e.company_id,
        e.created_at,
        e.updated_at,
        e.created_by,
        COALESCE(g.total_gastos, 0) AS total_gastos,
        COALESCE(i.total_ingresos, 0) AS total_ingresos,
        COALESCE(i.total_ingresos, 0) - COALESCE(g.total_gastos, 0) AS utilidad,
        COALESCE(g.num_gastos, 0) AS num_gastos,
        COALESCE(i.num_ingresos, 0) AS num_ingresos
      FROM evt_eventos_erp e
      LEFT JOIN evt_clientes_erp c ON e.cliente_id = c.id
      LEFT JOIN (
        SELECT evento_id, SUM(total) AS total_gastos, COUNT(*) AS num_gastos
        FROM evt_gastos_erp
        WHERE activo = true AND deleted_at IS NULL
        GROUP BY evento_id
      ) g ON e.id = g.evento_id
      LEFT JOIN (
        SELECT evento_id, SUM(total) AS total_ingresos, COUNT(*) AS num_ingresos
        FROM evt_ingresos_erp
        WHERE activo = true AND deleted_at IS NULL
        GROUP BY evento_id
      ) i ON e.id = i.evento_id
      WHERE e.activo = true;
    `);
    console.log('✅ Vista vw_eventos_completos_erp creada');

    // 4. Recrear vista vw_eventos_analisis_financiero_erp
    console.log('\n🔧 Recreando vista vw_eventos_analisis_financiero_erp...');
    await client.query(`
      DROP VIEW IF EXISTS vw_eventos_analisis_financiero_erp CASCADE;
    `);

    await client.query(`
      CREATE VIEW vw_eventos_analisis_financiero_erp AS
      SELECT
        e.id,
        e.clave,
        e.nombre,
        e.descripcion,
        e.fecha_evento,
        e.fecha_fin,
        e.lugar,
        e.ciudad,
        e.estado AS estado_ubicacion,
        e.tipo_evento,
        e.estado,
        e.prioridad,
        e.cliente_id,
        c.nombre AS cliente_nombre,
        c.rfc AS cliente_rfc,
        e.presupuesto_estimado,
        e.presupuesto_aprobado,
        e.activo,
        e.company_id,
        e.created_at,
        e.updated_at,

        -- Métricas de gastos
        COALESCE(g.total_gastos, 0) AS total_gastos,
        COALESCE(g.num_gastos, 0) AS num_gastos,
        COALESCE(g.gastos_pendientes, 0) AS gastos_pendientes,
        COALESCE(g.gastos_aprobados, 0) AS gastos_aprobados,

        -- Métricas de ingresos
        COALESCE(i.total_ingresos, 0) AS total_ingresos,
        COALESCE(i.num_ingresos, 0) AS num_ingresos,
        COALESCE(i.ingresos_cobrados, 0) AS ingresos_cobrados,
        COALESCE(i.ingresos_pendientes, 0) AS ingresos_pendientes,

        -- Métricas de provisiones
        COALESCE(p.total_provisiones, 0) AS total_provisiones,
        COALESCE(p.num_provisiones, 0) AS num_provisiones,

        -- Cálculos financieros
        COALESCE(i.total_ingresos, 0) - COALESCE(g.total_gastos, 0) AS utilidad,
        CASE
          WHEN COALESCE(i.total_ingresos, 0) > 0
          THEN ROUND(((COALESCE(i.total_ingresos, 0) - COALESCE(g.total_gastos, 0)) / COALESCE(i.total_ingresos, 0) * 100)::numeric, 2)
          ELSE 0
        END AS margen_porcentaje,
        CASE
          WHEN COALESCE(e.presupuesto_aprobado, e.presupuesto_estimado, 0) > 0
          THEN ROUND((COALESCE(g.total_gastos, 0) / COALESCE(e.presupuesto_aprobado, e.presupuesto_estimado, 1) * 100)::numeric, 2)
          ELSE 0
        END AS porcentaje_presupuesto_usado

      FROM evt_eventos_erp e
      LEFT JOIN evt_clientes_erp c ON e.cliente_id = c.id
      LEFT JOIN (
        SELECT
          evento_id,
          SUM(total) AS total_gastos,
          COUNT(*) AS num_gastos,
          SUM(CASE WHEN status_aprobacion = 'pendiente' THEN total ELSE 0 END) AS gastos_pendientes,
          SUM(CASE WHEN status_aprobacion = 'aprobado' THEN total ELSE 0 END) AS gastos_aprobados
        FROM evt_gastos_erp
        WHERE activo = true AND deleted_at IS NULL
        GROUP BY evento_id
      ) g ON e.id = g.evento_id
      LEFT JOIN (
        SELECT
          evento_id,
          SUM(total) AS total_ingresos,
          COUNT(*) AS num_ingresos,
          SUM(CASE WHEN cobrado = true THEN total ELSE 0 END) AS ingresos_cobrados,
          SUM(CASE WHEN cobrado = false OR cobrado IS NULL THEN total ELSE 0 END) AS ingresos_pendientes
        FROM evt_ingresos_erp
        WHERE activo = true AND deleted_at IS NULL
        GROUP BY evento_id
      ) i ON e.id = i.evento_id
      LEFT JOIN (
        SELECT
          evento_id,
          SUM(monto) AS total_provisiones,
          COUNT(*) AS num_provisiones
        FROM evt_provisiones_erp
        WHERE activo = true
        GROUP BY evento_id
      ) p ON e.id = p.evento_id
      WHERE e.activo = true;
    `);
    console.log('✅ Vista vw_eventos_analisis_financiero_erp creada');

    // 5. Verificar las vistas recreadas
    console.log('\n\n📋 Verificando datos en las vistas...');

    const vistaCompletos = await client.query(`SELECT COUNT(*) as count FROM vw_eventos_completos_erp`);
    console.log(`vw_eventos_completos_erp: ${vistaCompletos.rows[0].count} registros`);

    const vistaAnalisis = await client.query(`SELECT COUNT(*) as count FROM vw_eventos_analisis_financiero_erp`);
    console.log(`vw_eventos_analisis_financiero_erp: ${vistaAnalisis.rows[0].count} registros`);

    // 6. Mostrar un registro de ejemplo
    console.log('\n📊 Ejemplo de datos en vw_eventos_analisis_financiero_erp:');
    const ejemplo = await client.query(`SELECT * FROM vw_eventos_analisis_financiero_erp LIMIT 1`);
    if (ejemplo.rows.length > 0) {
      console.log(JSON.stringify(ejemplo.rows[0], null, 2));
    } else {
      console.log('No hay eventos');
    }

    console.log('\n✅ Vistas actualizadas correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

main();
