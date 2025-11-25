import pg from 'pg';

const { Client } = pg;

const SQL = `
BEGIN;

DROP VIEW IF EXISTS vw_eventos_analisis_financiero CASCADE;

CREATE OR REPLACE VIEW vw_eventos_analisis_financiero AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.cliente_id,
  c.razon_social AS cliente_nombre,
  e.fecha_evento,
  e.estado_id,
  es.nombre AS estado_nombre,
  COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS ingreso_estimado,
  COALESCE(e.provisiones, 0) AS provisiones,
  COALESCE(e.utilidad_estimada, 0) AS utilidad_estimada,
  COALESCE(e.porcentaje_utilidad_estimada, 0) AS porcentaje_utilidad_estimada,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) AS ingresos_cobrados,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) AS ingresos_pendientes,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) AS ingresos_totales,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) AS diferencia_ingresos_absoluta,
  CASE WHEN COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) > 0 THEN (((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / COALESCE(e.ingreso_estimado, e.ganancia_estimada, 1)) - 1) * 100 ELSE 0 END AS variacion_ingresos_porcentaje,
  CASE WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) > 0 THEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL)) * 100 ELSE 0 END AS porcentaje_cobro,
  CASE
    WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) = 0 THEN 'sin_ingresos'
    WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) = 0 THEN 'cobrado_completo'
    WHEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / NULLIF((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL), 0)) >= 0.80 THEN 'cobro_bueno'
    WHEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / NULLIF((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL), 0)) >= 0.50 THEN 'cobro_parcial'
    ELSE 'cobro_critico'
  END AS status_cobro,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS gastos_pagados,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = false AND g.deleted_at IS NULL) AS gastos_pendientes,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.deleted_at IS NULL) AS gastos_totales,
  (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) - COALESCE(e.provisiones, 0) AS diferencia_gastos_absoluta,
  CASE WHEN COALESCE(e.provisiones, 0) > 0 THEN (((SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) / COALESCE(e.provisiones, 1)) - 1) * 100 ELSE 0 END AS variacion_gastos_porcentaje,
  CASE
    WHEN COALESCE(e.provisiones, 0) = 0 THEN 'sin_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) <= COALESCE(e.provisiones, 0) THEN 'dentro_presupuesto'
    WHEN (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) <= (COALESCE(e.provisiones, 0) * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) AS utilidad_real,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.deleted_at IS NULL) AS utilidad_proyectada,
  CASE WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) > 0 THEN (((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL)) / (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL)) * 100 ELSE 0 END AS margen_utilidad_real,
  ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL)) - COALESCE(e.utilidad_estimada, 0) AS diferencia_utilidad_absoluta,
  CASE
    WHEN (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) <= COALESCE(e.provisiones, 0) AND ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / NULLIF((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL), 0)) >= 0.80 THEN 'saludable'
    WHEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / NULLIF((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL), 0)) < 0.50 OR (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true AND g.deleted_at IS NULL) > (COALESCE(e.provisiones, 0) * 1.05) THEN 'critico'
    ELSE 'atencion'
  END AS status_financiero_integral,
  CASE WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) > 0 AND e.fecha_evento IS NOT NULL AND e.fecha_evento::date < CURRENT_DATE THEN EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento::date))::INTEGER ELSE 0 END AS dias_desde_evento,
  e.created_at,
  e.updated_at
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
WHERE e.activo = true;

DROP VIEW IF EXISTS vw_eventos_problemas_cobro CASCADE;

CREATE OR REPLACE VIEW vw_eventos_problemas_cobro AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  c.razon_social AS cliente_nombre,
  e.fecha_evento,
  es.nombre AS estado_nombre,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) AS ingresos_cobrados,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) AS ingresos_pendientes,
  (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) AS ingresos_totales,
  CASE WHEN (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL) > 0 THEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true AND i.deleted_at IS NULL) / (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.deleted_at IS NULL)) * 100 ELSE 0 END AS porcentaje_cobrado,
  CASE WHEN e.fecha_evento IS NOT NULL AND e.fecha_evento::date < CURRENT_DATE THEN EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento::date))::INTEGER ELSE 0 END AS dias_desde_evento,
  CASE
    WHEN e.fecha_evento IS NULL THEN 'sin_fecha'
    WHEN e.fecha_evento::date > CURRENT_DATE THEN 'evento_futuro'
    WHEN EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento::date)) <= 30 THEN 'reciente'
    WHEN EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento::date)) <= 60 THEN 'urgente'
    WHEN EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento::date)) <= 90 THEN 'muy_urgente'
    ELSE 'critico'
  END AS categoria_urgencia,
  (SELECT COUNT(*) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) AS facturas_pendientes
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
WHERE e.activo = true AND (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = false AND i.deleted_at IS NULL) > 0
ORDER BY CASE WHEN e.fecha_evento IS NULL THEN 999999 ELSE EXTRACT(DAY FROM (CURRENT_DATE - e.fecha_evento::date))::INTEGER END DESC;

CREATE INDEX IF NOT EXISTS idx_evt_eventos_cliente_fecha ON evt_eventos(cliente_id, fecha_evento) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cobrado_fecha ON evt_ingresos(cobrado, created_at) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION get_evento_financial_summary(p_evento_id INTEGER)
RETURNS TABLE(concepto TEXT, estimado NUMERIC, monto_real NUMERIC, pendiente NUMERIC, diferencia NUMERIC, porcentaje_cumplimiento NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Ingresos'::TEXT, COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0), (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL), (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = false AND i.deleted_at IS NULL), (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL) - COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0), CASE WHEN COALESCE(e.ingreso_estimado, e.ganancia_estimada, 0) > 0 THEN ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL) / COALESCE(e.ingreso_estimado, e.ganancia_estimada, 1)) * 100 ELSE 0 END FROM evt_eventos e WHERE e.id = p_evento_id
  UNION ALL
  SELECT 'Gastos'::TEXT, COALESCE(e.provisiones, 0), (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL), (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = false AND g.deleted_at IS NULL), (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL) - COALESCE(e.provisiones, 0), CASE WHEN COALESCE(e.provisiones, 0) > 0 THEN ((SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL) / COALESCE(e.provisiones, 1)) * 100 ELSE 0 END FROM evt_eventos e WHERE e.id = p_evento_id
  UNION ALL
  SELECT 'Utilidad'::TEXT, COALESCE(e.utilidad_estimada, 0), (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL), 0, ((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL)) - COALESCE(e.utilidad_estimada, 0), CASE WHEN COALESCE(e.utilidad_estimada, 0) > 0 THEN (((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = p_evento_id AND i.cobrado = true AND i.deleted_at IS NULL) - (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = p_evento_id AND g.pagado = true AND g.deleted_at IS NULL)) / COALESCE(e.utilidad_estimada, 1)) * 100 ELSE 0 END FROM evt_eventos e WHERE e.id = p_evento_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
`;

console.log('🚀 Ejecutando migración en Supabase...\n');

async function ejecutar() {
  const configs = [
    { host: 'db.gomnouwackzvthpwyric.supabase.co', port: 5432, user: 'postgres', password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU' },
    { host: 'aws-0-us-west-1.pooler.supabase.com', port: 5432, user: 'postgres.gomnouwackzvthpwyric', password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU' }
  ];

  for (const config of configs) {
    try {
      console.log(`🔌 Conectando a ${config.host}...`);
      const client = new Client({ ...config, database: 'postgres', ssl: { rejectUnauthorized: false } });
      await client.connect();
      console.log('✅ Conectado!\n');

      console.log('⚡ Ejecutando SQL...\n');
      await client.query(SQL);

      console.log('✅ MIGRACIÓN EXITOSA!\n');
      console.log('='.repeat(70));
      console.log('✓ Vista vw_eventos_analisis_financiero');
      console.log('✓ Vista vw_eventos_problemas_cobro');
      console.log('✓ Función get_evento_financial_summary');
      console.log('✓ 2 índices');
      console.log('='.repeat(70));

      await client.end();
      return;
    } catch (error) {
      console.log(`❌ ${error.message}\n`);
    }
  }

  console.error('❌ No se pudo conectar con ningún método');
}

ejecutar();
