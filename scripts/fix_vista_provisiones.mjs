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

    // 1. Ver qué hay en evt_provisiones_erp
    console.log('\n📋 Verificando provisiones en evt_provisiones_erp...');
    const provisiones = await client.query(`
      SELECT evento_id, COUNT(*) as count, SUM(total) as total
      FROM evt_provisiones_erp
      WHERE activo = true
      GROUP BY evento_id
    `);
    console.log('Provisiones por evento:');
    for (const row of provisiones.rows) {
      console.log(`  Evento ${row.evento_id}: ${row.count} provisiones, Total: $${Number(row.total).toLocaleString()}`);
    }

    // 2. Recrear la vista con provisiones de evt_provisiones_erp
    console.log('\n🔧 Actualizando vista vw_eventos_analisis_financiero_erp...');

    await client.query(`DROP VIEW IF EXISTS vw_eventos_analisis_financiero_erp CASCADE`);

    await client.query(`
      CREATE VIEW vw_eventos_analisis_financiero_erp AS
      SELECT
        e.id,
        e.company_id,
        e.clave_evento,
        e.nombre_proyecto,
        e.descripcion,
        e.cliente_id,
        e.tipo_evento_id,
        e.estado_id,
        e.fecha_evento,
        e.fecha_fin,
        e.lugar,
        e.numero_invitados,
        e.prioridad,
        e.fase_proyecto,
        c.razon_social AS cliente_nombre,
        c.nombre_comercial AS cliente_comercial,
        c.rfc AS cliente_rfc,
        est.nombre AS estado_nombre,
        est.color AS estado_color,
        te.nombre AS tipo_evento_nombre,
        te.color AS tipo_evento_color,

        -- Ingreso estimado del evento
        COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,

        -- ====== INGRESOS (de evt_ingresos_erp) ======
        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos_erp i
         WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) AS ingresos_cobrados,

        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos_erp i
         WHERE i.evento_id = e.id AND (i.cobrado = false OR i.cobrado IS NULL) AND i.deleted_at IS NULL) AS ingresos_pendientes,

        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos_erp i
         WHERE i.evento_id = e.id AND i.deleted_at IS NULL) AS ingresos_totales,

        -- ====== GASTOS por categoría (de evt_gastos_erp) ======
        -- Combustible (categoria_id = 9)
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.categoria_id = 9 AND g.pagado = true AND g.deleted_at IS NULL) AS gastos_combustible_pagados,

        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.categoria_id = 9 AND (g.pagado = false OR g.pagado IS NULL) AND g.deleted_at IS NULL) AS gastos_combustible_pendientes,

        -- Materiales (categoria_id = 8)
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.categoria_id = 8 AND g.pagado = true AND g.deleted_at IS NULL) AS gastos_materiales_pagados,

        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.categoria_id = 8 AND (g.pagado = false OR g.pagado IS NULL) AND g.deleted_at IS NULL) AS gastos_materiales_pendientes,

        -- RH (categoria_id = 7)
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.categoria_id = 7 AND g.pagado = true AND g.deleted_at IS NULL) AS gastos_rh_pagados,

        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.categoria_id = 7 AND (g.pagado = false OR g.pagado IS NULL) AND g.deleted_at IS NULL) AS gastos_rh_pendientes,

        -- Solicitudes/SPS (categoria_id = 6)
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.categoria_id = 6 AND g.pagado = true AND g.deleted_at IS NULL) AS gastos_sps_pagados,

        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.categoria_id = 6 AND (g.pagado = false OR g.pagado IS NULL) AND g.deleted_at IS NULL) AS gastos_sps_pendientes,

        -- Totales de gastos
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS gastos_pagados_total,

        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND (g.pagado = false OR g.pagado IS NULL) AND g.deleted_at IS NULL) AS gastos_pendientes_total,

        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.deleted_at IS NULL) AS gastos_totales,

        -- ====== PROVISIONES (de evt_provisiones_erp) ======
        (SELECT COALESCE(SUM(p.total), 0)
         FROM evt_provisiones_erp p
         WHERE p.evento_id = e.id AND p.activo = true) AS provisiones_total,

        (SELECT COUNT(*)
         FROM evt_provisiones_erp p
         WHERE p.evento_id = e.id AND p.activo = true) AS provisiones_count,

        -- Provisiones por categoría
        (SELECT COALESCE(SUM(p.total), 0)
         FROM evt_provisiones_erp p
         WHERE p.evento_id = e.id AND p.categoria_id = 9 AND p.activo = true) AS provisiones_combustible,

        (SELECT COALESCE(SUM(p.total), 0)
         FROM evt_provisiones_erp p
         WHERE p.evento_id = e.id AND p.categoria_id = 8 AND p.activo = true) AS provisiones_materiales,

        (SELECT COALESCE(SUM(p.total), 0)
         FROM evt_provisiones_erp p
         WHERE p.evento_id = e.id AND p.categoria_id = 7 AND p.activo = true) AS provisiones_rh,

        (SELECT COALESCE(SUM(p.total), 0)
         FROM evt_provisiones_erp p
         WHERE p.evento_id = e.id AND p.categoria_id = 6 AND p.activo = true) AS provisiones_sps,

        -- ====== CÁLCULOS FINANCIEROS ======
        -- Utilidad = Ingresos cobrados - Gastos pagados
        (SELECT COALESCE(SUM(i.total), 0)
         FROM evt_ingresos_erp i
         WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL)
        -
        (SELECT COALESCE(SUM(g.total), 0)
         FROM evt_gastos_erp g
         WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS utilidad_real,

        -- Margen real %
        CASE
          WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos_erp i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) > 0
          THEN ROUND((
            ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos_erp i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL)
            -
            (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos_erp g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL))
            /
            (SELECT COALESCE(SUM(i.total), 1) FROM evt_ingresos_erp i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL)
          ) * 100, 2)
          ELSE 0
        END AS margen_real_pct,

        e.created_at,
        e.updated_at

      FROM evt_eventos_erp e
      LEFT JOIN evt_clientes_erp c ON e.cliente_id = c.id
      LEFT JOIN evt_estados_erp est ON e.estado_id = est.id
      LEFT JOIN tipos_eventos_erp te ON e.tipo_evento_id = te.id
      WHERE e.activo = true
    `);

    console.log('✅ Vista vw_eventos_analisis_financiero_erp actualizada');

    // 3. Verificar la nueva vista
    console.log('\n📊 Verificando datos en la nueva vista...');
    const test = await client.query(`
      SELECT
        id,
        clave_evento,
        nombre_proyecto,
        cliente_nombre,
        gastos_totales,
        provisiones_total,
        provisiones_count,
        provisiones_combustible,
        provisiones_materiales,
        provisiones_rh,
        provisiones_sps
      FROM vw_eventos_analisis_financiero_erp
    `);

    console.log('\nResultados:');
    for (const row of test.rows) {
      console.log(`\n📅 ${row.clave_evento}: ${row.nombre_proyecto}`);
      console.log(`   Cliente: ${row.cliente_nombre}`);
      console.log(`   Gastos totales: $${Number(row.gastos_totales).toLocaleString()}`);
      console.log(`   Provisiones total: $${Number(row.provisiones_total).toLocaleString()} (${row.provisiones_count} items)`);
      console.log(`   - Combustible: $${Number(row.provisiones_combustible).toLocaleString()}`);
      console.log(`   - Materiales: $${Number(row.provisiones_materiales).toLocaleString()}`);
      console.log(`   - RH: $${Number(row.provisiones_rh).toLocaleString()}`);
      console.log(`   - SPS: $${Number(row.provisiones_sps).toLocaleString()}`);
    }

    console.log('\n✅ Operación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

main();
