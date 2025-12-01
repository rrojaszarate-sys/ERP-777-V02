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

    // Crear vista vw_eventos_completos_erp
    console.log('\n🔧 Creando vista vw_eventos_completos_erp...');

    await client.query(`
      DROP VIEW IF EXISTS vw_eventos_completos_erp CASCADE;
    `);

    await client.query(`
      CREATE VIEW vw_eventos_completos_erp AS
      SELECT
        e.id,
        e.company_id,
        e.clave_evento,
        e.nombre_proyecto,
        e.descripcion,
        e.tipo_evento_id,
        e.estado_id,
        e.cliente_id,
        e.fecha_evento,
        e.fecha_fin,
        e.hora_inicio,
        e.hora_fin,
        e.lugar_evento,
        e.direccion_evento,
        e.lugar,
        e.numero_invitados,
        e.prioridad,
        e.fase_proyecto,
        e.presupuesto_estimado,
        e.presupuesto_aprobado,
        e.presupuesto_final,
        e.contacto_nombre,
        e.contacto_telefono,
        e.contacto_email,
        e.notas_internas,
        e.notas_cliente,
        e.subtotal,
        e.iva,
        e.total,
        e.total_ingresos,
        e.total_gastos,
        e.utilidad,
        e.margen_utilidad,
        e.status_facturacion,
        e.facturado,
        e.cobrado,
        e.activo,
        e.created_at,
        e.updated_at,

        -- Provisiones
        COALESCE(e.provision_combustible_peaje, 0) AS provision_combustible_peaje,
        COALESCE(e.provision_materiales, 0) AS provision_materiales,
        COALESCE(e.provision_recursos_humanos, 0) AS provision_recursos_humanos,
        COALESCE(e.provision_solicitudes_pago, 0) AS provision_solicitudes_pago,
        COALESCE(e.ingreso_estimado, 0) AS ingreso_estimado,
        COALESCE(e.ganancia_estimada, 0) AS ganancia_estimada,

        -- Cliente
        c.razon_social AS cliente_nombre,
        c.nombre_comercial AS cliente_nombre_comercial,
        c.rfc AS cliente_rfc,
        c.email AS cliente_email,
        c.telefono AS cliente_telefono,

        -- Estado
        est.nombre AS estado_nombre,
        est.color AS estado_color,
        est.es_estado_final,

        -- Tipo de evento
        te.nombre AS tipo_evento_nombre,
        te.color AS tipo_evento_color,

        -- Métricas calculadas
        (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos_erp g WHERE g.evento_id = e.id AND g.deleted_at IS NULL) AS gastos_totales_calc,
        (SELECT COALESCE(COUNT(*), 0) FROM evt_gastos_erp g WHERE g.evento_id = e.id AND g.deleted_at IS NULL) AS num_gastos,
        (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos_erp i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) AS ingresos_totales_calc,
        (SELECT COALESCE(COUNT(*), 0) FROM evt_ingresos_erp i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) AS num_ingresos,
        (SELECT COALESCE(SUM(p.total), 0) FROM evt_provisiones_erp p WHERE p.evento_id = e.id AND p.activo = true) AS provisiones_totales_calc,
        (SELECT COALESCE(COUNT(*), 0) FROM evt_provisiones_erp p WHERE p.evento_id = e.id AND p.activo = true) AS num_provisiones

      FROM evt_eventos_erp e
      LEFT JOIN evt_clientes_erp c ON e.cliente_id = c.id
      LEFT JOIN evt_estados_erp est ON e.estado_id = est.id
      LEFT JOIN tipos_eventos_erp te ON e.tipo_evento_id = te.id
      WHERE e.activo = true;
    `);

    console.log('✅ Vista vw_eventos_completos_erp creada');

    // Verificar la vista
    console.log('\n📊 Verificando vista...');
    const result = await client.query(`SELECT COUNT(*) as count FROM vw_eventos_completos_erp`);
    console.log(`Total de eventos: ${result.rows[0].count}`);

    const sample = await client.query(`
      SELECT id, clave_evento, nombre_proyecto, cliente_nombre, estado_nombre, gastos_totales_calc, num_gastos
      FROM vw_eventos_completos_erp
      LIMIT 5
    `);

    console.log('\nMuestra de datos:');
    for (const row of sample.rows) {
      console.log(`  - ${row.clave_evento}: ${row.nombre_proyecto}`);
      console.log(`    Cliente: ${row.cliente_nombre} | Estado: ${row.estado_nombre}`);
      console.log(`    Gastos: $${Number(row.gastos_totales_calc).toLocaleString()} (${row.num_gastos} items)`);
    }

    console.log('\n✅ Operación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

main();
