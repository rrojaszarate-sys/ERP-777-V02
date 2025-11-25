-- =====================================================
-- CORRECCIÓN EXHAUSTIVA DE GASTOS E INGRESOS
-- Fecha: 2025-10-27
-- Objetivo: Usar SOLO evt_gastos y evt_ingresos para cálculos
-- =====================================================

\echo '========================================='
\echo 'INICIANDO CORRECCIÓN DE GASTOS E INGRESOS'
\echo '========================================='

-- =====================================================
-- PASO 1: BACKUP DE DATOS ACTUALES
-- =====================================================
\echo '\nPASO 1: Creando tablas de backup...'

-- Backup evt_gastos
CREATE TABLE IF NOT EXISTS evt_gastos_backup_20251027 AS 
SELECT * FROM evt_gastos;

\echo 'Backup evt_gastos creado: ' || (SELECT COUNT(*) FROM evt_gastos_backup_20251027) || ' registros';

-- Backup evt_ingresos
CREATE TABLE IF NOT EXISTS evt_ingresos_backup_20251027 AS 
SELECT * FROM evt_ingresos;

\echo 'Backup evt_ingresos creado: ' || (SELECT COUNT(*) FROM evt_ingresos_backup_20251027) || ' registros';

-- Backup evt_eventos (solo campos calculados)
CREATE TABLE IF NOT EXISTS evt_eventos_backup_20251027 AS 
SELECT id, total, utilidad, total_gastos, margen_utilidad 
FROM evt_eventos;

\echo 'Backup evt_eventos creado: ' || (SELECT COUNT(*) FROM evt_eventos_backup_20251027) || ' registros';

-- =====================================================
-- PASO 2: ANÁLISIS DE INCONSISTENCIAS
-- =====================================================
\echo '\nPASO 2: Analizando inconsistencias...'

-- Comparar totales de evt_eventos vs suma de evt_ingresos
\echo '\nComparación INGRESOS (evt_eventos.total vs SUM(evt_ingresos)):';
SELECT 
    e.id,
    e.nombre_proyecto,
    e.total as total_en_eventos,
    COALESCE(SUM(i.total), 0) as total_real_ingresos,
    e.total - COALESCE(SUM(i.total), 0) as diferencia
FROM evt_eventos e
LEFT JOIN evt_ingresos i ON e.id = i.evento_id AND i.activo = true
WHERE e.activo = true
GROUP BY e.id, e.nombre_proyecto, e.total
HAVING ABS(e.total - COALESCE(SUM(i.total), 0)) > 0.01
ORDER BY ABS(e.total - COALESCE(SUM(i.total), 0)) DESC
LIMIT 10;

-- Comparar gastos
\echo '\nComparación GASTOS (evt_eventos.total_gastos vs SUM(evt_gastos)):';
SELECT 
    e.id,
    e.nombre_proyecto,
    e.total_gastos as gastos_en_eventos,
    COALESCE(SUM(g.total), 0) as total_real_gastos,
    e.total_gastos - COALESCE(SUM(g.total), 0) as diferencia
FROM evt_eventos e
LEFT JOIN evt_gastos g ON e.id = g.evento_id AND g.activo = true
WHERE e.activo = true
GROUP BY e.id, e.nombre_proyecto, e.total_gastos
HAVING ABS(e.total_gastos - COALESCE(SUM(g.total), 0)) > 0.01
ORDER BY ABS(e.total_gastos - COALESCE(SUM(g.total), 0)) DESC
LIMIT 10;

-- =====================================================
-- PASO 3: RECREAR VISTA vw_eventos_completos
-- =====================================================
\echo '\nPASO 3: Recreando vw_eventos_completos...'

DROP VIEW IF EXISTS vw_eventos_completos CASCADE;

CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,
  e.descripcion,
  e.fecha_evento,
  e.fecha_fin,
  e.hora_inicio,
  e.hora_fin,
  e.lugar,
  e.numero_invitados,
  e.cliente_id,
  e.tipo_evento_id,
  e.estado_id,
  e.responsable_id,
  e.prioridad,
  e.fase_proyecto,
  e.notas,
  e.status_facturacion,
  e.status_pago,
  e.fecha_facturacion,
  e.fecha_vencimiento,
  e.fecha_pago,
  e.documento_factura_url,
  e.documento_pago_url,
  e.presupuesto_estimado,
  e.iva_porcentaje,
  e.activo,
  e.created_at,
  e.updated_at,
  e.created_by,
  e.updated_by,
  
  -- CÁLCULOS REALES desde evt_ingresos
  COALESCE(ingresos_data.subtotal_ingresos, 0) as subtotal,
  COALESCE(ingresos_data.iva_ingresos, 0) as iva,
  COALESCE(ingresos_data.total_ingresos, 0) as total,
  COALESCE(ingresos_data.total_ingresos, 0) as ingreso_real,
  
  -- CÁLCULOS REALES desde evt_gastos
  COALESCE(gastos_data.total_gastos, 0) as total_gastos,
  COALESCE(gastos_data.total_gastos, 0) as gastos_reales,
  
  -- UTILIDAD CALCULADA (ingresos - gastos)
  COALESCE(ingresos_data.total_ingresos, 0) - COALESCE(gastos_data.total_gastos, 0) as utilidad,
  
  -- MARGEN CALCULADO
  CASE 
    WHEN COALESCE(ingresos_data.total_ingresos, 0) > 0 
    THEN ((COALESCE(ingresos_data.total_ingresos, 0) - COALESCE(gastos_data.total_gastos, 0)) / ingresos_data.total_ingresos) * 100
    ELSE 0
  END as margen_utilidad,
  
  -- Joins con otras tablas
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
  
  -- Cálculo de días vencidos
  CASE 
    WHEN e.fecha_vencimiento IS NOT NULL 
      AND e.fecha_vencimiento < CURRENT_DATE 
      AND e.status_pago != 'pagado'
    THEN CURRENT_DATE - e.fecha_vencimiento
    ELSE 0
  END as dias_vencido,
  
  -- Status de vencimiento
  CASE 
    WHEN e.fecha_vencimiento IS NOT NULL 
      AND e.fecha_vencimiento < CURRENT_DATE 
      AND e.status_pago != 'pagado'
    THEN 'vencido'
    ELSE e.status_pago
  END as status_vencimiento,
  
  uc.nombre as creado_por,
  uu.nombre as actualizado_por
  
FROM evt_eventos e

-- Subconsulta para calcular INGRESOS
LEFT JOIN LATERAL (
  SELECT 
    evento_id,
    SUM(subtotal) as subtotal_ingresos,
    SUM(iva) as iva_ingresos,
    SUM(total) as total_ingresos
  FROM evt_ingresos
  WHERE evento_id = e.id AND activo = true
  GROUP BY evento_id
) ingresos_data ON true

-- Subconsulta para calcular GASTOS
LEFT JOIN LATERAL (
  SELECT 
    evento_id,
    SUM(total) as total_gastos
  FROM evt_gastos
  WHERE evento_id = e.id AND activo = true
  GROUP BY evento_id
) gastos_data ON true

-- Joins normales
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
LEFT JOIN core_users u ON e.responsable_id = u.id
LEFT JOIN core_users uc ON e.created_by = uc.id
LEFT JOIN core_users uu ON e.updated_by = uu.id

WHERE e.activo = true;

\echo 'Vista vw_eventos_completos recreada exitosamente';

-- =====================================================
-- PASO 4: RECREAR VISTA vw_master_facturacion
-- =====================================================
\echo '\nPASO 4: Recreando vw_master_facturacion...'

DROP VIEW IF EXISTS vw_master_facturacion CASCADE;

CREATE OR REPLACE VIEW vw_master_facturacion AS
SELECT
  e.id as evento_id,
  e.clave_evento,
  e.nombre_proyecto as evento_nombre,
  e.fecha_evento,
  
  -- TOTALES CALCULADOS desde evt_ingresos
  COALESCE(ingresos_data.total_ingresos, 0) as total,
  
  -- GASTOS CALCULADOS desde evt_gastos
  COALESCE(gastos_data.total_gastos, 0) as total_gastos,
  
  -- UTILIDAD CALCULADA
  COALESCE(ingresos_data.total_ingresos, 0) - COALESCE(gastos_data.total_gastos, 0) as utilidad,
  
  -- MARGEN CALCULADO
  CASE 
    WHEN COALESCE(ingresos_data.total_ingresos, 0) > 0 
    THEN ((COALESCE(ingresos_data.total_ingresos, 0) - COALESCE(gastos_data.total_gastos, 0)) / ingresos_data.total_ingresos) * 100
    ELSE 0
  END as margen_utilidad,
  
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
  
  -- Días vencido
  CASE 
    WHEN e.fecha_vencimiento IS NOT NULL 
      AND e.fecha_vencimiento < CURRENT_DATE 
      AND e.status_pago != 'pagado'
    THEN CURRENT_DATE - e.fecha_vencimiento
    ELSE 0
  END as dias_vencido
  
FROM evt_eventos e

-- Subconsulta para INGRESOS
LEFT JOIN LATERAL (
  SELECT 
    evento_id,
    SUM(subtotal) as subtotal_ingresos,
    SUM(iva) as iva_ingresos,
    SUM(total) as total_ingresos
  FROM evt_ingresos
  WHERE evento_id = e.id AND activo = true
  GROUP BY evento_id
) ingresos_data ON true

-- Subconsulta para GASTOS
LEFT JOIN LATERAL (
  SELECT 
    evento_id,
    SUM(total) as total_gastos
  FROM evt_gastos
  WHERE evento_id = e.id AND activo = true
  GROUP BY evento_id
) gastos_data ON true

LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN core_users u ON e.responsable_id = u.id

WHERE e.activo = true
ORDER BY e.fecha_evento DESC;

\echo 'Vista vw_master_facturacion recreada exitosamente';

-- =====================================================
-- PASO 5: ELIMINAR TRIGGERS ANTIGUOS
-- =====================================================
\echo '\nPASO 5: Eliminando triggers antiguos...'

-- Eliminar triggers de evt_gastos
DROP TRIGGER IF EXISTS calculate_expense_totals_trigger ON evt_gastos;
DROP TRIGGER IF EXISTS trg_calculate_expense_totals ON evt_gastos;
DROP TRIGGER IF EXISTS update_event_totals_on_expense_change ON evt_gastos;

-- Eliminar triggers de evt_ingresos
DROP TRIGGER IF EXISTS calculate_income_totals_trigger ON evt_ingresos;
DROP TRIGGER IF EXISTS trg_calculate_income_totals ON evt_ingresos;
DROP TRIGGER IF EXISTS update_event_totals_on_income_change ON evt_ingresos;

-- Eliminar funciones asociadas
DROP FUNCTION IF EXISTS calculate_expense_totals() CASCADE;
DROP FUNCTION IF EXISTS calculate_income_totals() CASCADE;
DROP FUNCTION IF EXISTS update_event_totals_from_expenses() CASCADE;
DROP FUNCTION IF EXISTS update_event_totals_from_incomes() CASCADE;

\echo 'Triggers y funciones eliminados';

-- =====================================================
-- PASO 6: VALIDACIÓN DE DATOS
-- =====================================================
\echo '\nPASO 6: Validando datos...'

-- Contar eventos
\echo '\nTotal de eventos activos:';
SELECT COUNT(*) FROM evt_eventos WHERE activo = true;

-- Contar gastos
\echo '\nTotal de gastos activos:';
SELECT COUNT(*) FROM evt_gastos WHERE activo = true;

-- Contar ingresos
\echo '\nTotal de ingresos activos:';
SELECT COUNT(*) FROM evt_ingresos WHERE activo = true;

-- Verificar vistas
\echo '\nVerificando vw_eventos_completos (primeros 5 registros):';
SELECT 
    id,
    nombre_proyecto,
    total as ingresos,
    total_gastos as gastos,
    utilidad,
    margen_utilidad
FROM vw_eventos_completos
ORDER BY fecha_evento DESC
LIMIT 5;

\echo '\nVerificando vw_master_facturacion (primeros 5 registros):';
SELECT 
    evento_id,
    evento_nombre,
    total as ingresos,
    total_gastos as gastos,
    utilidad,
    margen_utilidad,
    status_pago
FROM vw_master_facturacion
LIMIT 5;

-- =====================================================
-- PASO 7: RESUMEN FINAL
-- =====================================================
\echo '\n========================================='
\echo 'RESUMEN DE CORRECCIÓN'
\echo '========================================='

\echo '\nTablas de backup creadas:';
\echo '- evt_gastos_backup_20251027';
\echo '- evt_ingresos_backup_20251027';
\echo '- evt_eventos_backup_20251027';

\echo '\nVistas recreadas:';
\echo '- vw_eventos_completos (usa evt_gastos + evt_ingresos)';
\echo '- vw_master_facturacion (usa evt_gastos + evt_ingresos)';

\echo '\nTriggers eliminados:';
\echo '- Todos los triggers de cálculo automático';
\echo '- Los cálculos ahora se hacen en las vistas';

\echo '\n========================================='
\echo 'CORRECCIÓN COMPLETADA EXITOSAMENTE'
\echo '========================================='
\echo '\nIMPORTANTE: Los campos total, total_gastos, utilidad y margen_utilidad';
\echo 'en evt_eventos YA NO SE USAN. Los cálculos se hacen en las vistas.';
\echo '\nSi desea eliminar estos campos de evt_eventos, ejecute:';
\echo 'ALTER TABLE evt_eventos DROP COLUMN total, DROP COLUMN total_gastos, DROP COLUMN utilidad, DROP COLUMN margen_utilidad;';
