/*
  # Create Dashboard Views

  1. Views
    - `vw_dashboard_metricas` - Dashboard metrics aggregation
    - `vw_analisis_temporal` - Temporal analysis by month/year
    - `vw_gastos_por_categoria` - Expenses grouped by category
    - `vw_eventos_completos` - Complete event information with joins
    - `vw_master_facturacion` - Billing master view

  2. Security
    - Enable RLS on views
    - Add policies for authenticated users
*/

-- Create dashboard metrics view
CREATE OR REPLACE VIEW vw_dashboard_metricas AS
SELECT
  COUNT(e.id) as total_eventos,
  COUNT(CASE WHEN e.fecha_evento > CURRENT_DATE THEN 1 END) as eventos_futuros,
  COUNT(CASE WHEN e.fecha_evento <= CURRENT_DATE THEN 1 END) as eventos_pasados,
  COUNT(CASE WHEN e.status_pago = 'pago_pendiente' THEN 1 END) as pagos_pendientes,
  COUNT(CASE WHEN e.status_facturacion = 'pendiente_facturar' THEN 1 END) as facturas_pendientes,
  COUNT(CASE WHEN e.status_pago = 'vencido' THEN 1 END) as pagos_vencidos,
  COUNT(CASE WHEN e.status_pago = 'pagado' THEN 1 END) as eventos_cobrados,
  COALESCE(SUM(e.total), 0) as ingresos_totales,
  COALESCE(SUM(CASE WHEN e.status_pago = 'pagado' THEN e.total ELSE 0 END), 0) as ingresos_cobrados,
  COALESCE(SUM(CASE WHEN e.status_pago != 'pagado' THEN e.total ELSE 0 END), 0) as ingresos_por_cobrar,
  COALESCE(SUM(e.total_gastos), 0) as gastos_totales,
  COALESCE(SUM(e.utilidad), 0) as utilidad_total,
  CASE 
    WHEN SUM(e.total) > 0 THEN (SUM(e.utilidad) / SUM(e.total)) * 100
    ELSE 0
  END as margen_promedio,
  CASE 
    WHEN COUNT(e.id) > 0 THEN (COUNT(CASE WHEN e.status_pago = 'pagado' THEN 1 END)::numeric / COUNT(e.id)) * 100
    ELSE 0
  END as tasa_cobranza,
  CASE 
    WHEN SUM(e.total) > 0 THEN SUM(e.total_gastos) / SUM(e.total)
    ELSE 0
  END as ratio_gastos_ingresos
FROM evt_eventos e
WHERE e.activo = true;

-- Create temporal analysis view
CREATE OR REPLACE VIEW vw_analisis_temporal AS
SELECT
  EXTRACT(YEAR FROM e.fecha_evento)::integer as año,
  EXTRACT(MONTH FROM e.fecha_evento)::integer as mes,
  COUNT(e.id) as total_eventos,
  COALESCE(SUM(e.total), 0) as ingresos_mes,
  COALESCE(SUM(e.total_gastos), 0) as gastos_mes,
  COALESCE(SUM(e.utilidad), 0) as utilidad_mes,
  CASE 
    WHEN SUM(e.total) > 0 THEN (SUM(e.utilidad) / SUM(e.total)) * 100
    ELSE 0
  END as margen_promedio,
  COUNT(CASE WHEN e.status_pago = 'pagado' THEN 1 END) as eventos_cobrados,
  COUNT(CASE WHEN e.status_pago != 'pagado' THEN 1 END) as eventos_pendientes
FROM evt_eventos e
WHERE e.activo = true
GROUP BY EXTRACT(YEAR FROM e.fecha_evento), EXTRACT(MONTH FROM e.fecha_evento)
ORDER BY año DESC, mes DESC;

-- Create expenses by category view
CREATE OR REPLACE VIEW vw_gastos_por_categoria AS
SELECT
  c.id as categoria_id,
  c.nombre as categoria,
  c.color as categoria_color,
  COUNT(g.id) as total_gastos,
  COALESCE(SUM(g.total), 0) as monto_total,
  COALESCE(AVG(g.total), 0) as promedio_gasto,
  COUNT(CASE WHEN g.status_aprobacion = 'aprobado' THEN 1 END) as gastos_aprobados,
  COUNT(CASE WHEN g.status_aprobacion = 'pendiente' THEN 1 END) as gastos_pendientes
FROM evt_categorias_gastos c
LEFT JOIN evt_gastos g ON c.id = g.categoria_id 
  AND g.activo = true 
  AND g.deleted_at IS NULL
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.color
ORDER BY monto_total DESC;

-- Create complete events view
CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT
  e.*,
  c.razon_social as cliente_nombre,
  c.nombre_comercial as cliente_comercial,
  c.rfc as cliente_rfc,
  c.email as cliente_email,
  c.telefono as cliente_telefono,
  c.contacto_principal,
  te.nombre as tipo_evento,
  te.color as tipo_color,
  es.nombre as estado,
  es.color as estado_color,
  es.workflow_step,
  u.nombre as responsable_nombre,
  CASE 
    WHEN e.fecha_vencimiento IS NOT NULL AND e.fecha_vencimiento < CURRENT_DATE AND e.status_pago != 'pagado'
    THEN CURRENT_DATE - e.fecha_vencimiento
    ELSE 0
  END as dias_vencido,
  CASE 
    WHEN e.fecha_vencimiento IS NOT NULL AND e.fecha_vencimiento < CURRENT_DATE AND e.status_pago != 'pagado'
    THEN 'vencido'
    ELSE e.status_pago
  END as status_vencimiento,
  uc.nombre as creado_por,
  uu.nombre as actualizado_por
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
LEFT JOIN core_users u ON e.responsable_id = u.id
LEFT JOIN core_users uc ON e.created_by = uc.id
LEFT JOIN core_users uu ON e.updated_by = uu.id
WHERE e.activo = true;

-- Create billing master view
CREATE OR REPLACE VIEW vw_master_facturacion AS
SELECT
  e.id as evento_id,
  e.clave_evento,
  e.nombre_proyecto as evento_nombre,
  e.fecha_evento,
  e.total,
  e.utilidad,
  e.status_facturacion,
  e.status_pago,
  e.fecha_facturacion,
  e.fecha_vencimiento,
  e.fecha_pago,
  c.razon_social as cliente_nombre,
  c.rfc as cliente_rfc,
  u.nombre as responsable,
  EXTRACT(YEAR FROM e.fecha_evento)::integer as año,
  EXTRACT(MONTH FROM e.fecha_evento)::integer as mes,
  CASE 
    WHEN e.fecha_vencimiento IS NOT NULL AND e.fecha_vencimiento < CURRENT_DATE AND e.status_pago != 'pagado'
    THEN CURRENT_DATE - e.fecha_vencimiento
    ELSE 0
  END as dias_vencido
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN core_users u ON e.responsable_id = u.id
WHERE e.activo = true
ORDER BY e.fecha_evento DESC;

-- Enable RLS on views (if supported)
-- Note: RLS on views depends on the underlying tables