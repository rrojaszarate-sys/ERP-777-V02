-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 007: VISTAS CONSOLIDADAS Y REPORTES
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-10-27
-- Propósito: Vistas para reportes consolidados y análisis contable
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- VISTA 1: Ingresos consolidados (eventos + externos)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_ingresos_consolidados AS
SELECT
  'evt_ingresos' AS origen,
  i.id,
  i.evento_id,
  e.nombre_proyecto AS evento_nombre,
  i.concepto,
  i.descripcion,
  i.total,
  i.fecha_ingreso AS fecha,
  i.cobrado,
  i.fecha_cobro,
  i.facturado,
  i.cuenta_id,
  c.nombre AS cuenta_nombre,
  i.cuenta_contable_ingreso_id,
  ci.nombre AS cuenta_contable_nombre,
  i.tipo_comprobante,
  i.metodo_cobro,
  i.referencia,
  i.created_at,
  i.created_by,
  -- Documentos asociados
  (SELECT COUNT(*) FROM cont_documentos d 
   WHERE d.referencia_tabla = 'evt_ingresos' AND d.referencia_id = i.id) AS num_documentos
FROM evt_ingresos i
LEFT JOIN evt_eventos e ON i.evento_id = e.id
LEFT JOIN evt_cuentas c ON i.cuenta_id = c.id
LEFT JOIN evt_cuentas ci ON i.cuenta_contable_ingreso_id = ci.id
WHERE i.activo IS NULL OR i.activo = true

UNION ALL

SELECT
  'cont_ingresos_externos' AS origen,
  ie.id,
  NULL AS evento_id,
  NULL AS evento_nombre,
  ie.concepto,
  ie.descripcion,
  ie.total,
  ie.fecha_ingreso AS fecha,
  ie.cobrado,
  ie.fecha_cobro,
  ie.facturado,
  ie.cuenta_id,
  c.nombre AS cuenta_nombre,
  ie.cuenta_contable_ingreso_id,
  ci.nombre AS cuenta_contable_nombre,
  ie.tipo_comprobante,
  ie.metodo_cobro,
  ie.referencia,
  ie.created_at,
  ie.created_by,
  (SELECT COUNT(*) FROM cont_documentos d 
   WHERE d.referencia_tabla = 'cont_ingresos_externos' AND d.referencia_id = ie.id) AS num_documentos
FROM cont_ingresos_externos ie
LEFT JOIN evt_cuentas c ON ie.cuenta_id = c.id
LEFT JOIN evt_cuentas ci ON ie.cuenta_contable_ingreso_id = ci.id
WHERE ie.activo = true;

COMMENT ON VIEW vw_ingresos_consolidados IS 
  'Vista consolidada de todos los ingresos (eventos + externos) con documentos';

-- ═══════════════════════════════════════════════════════════════════════════
-- VISTA 2: Gastos consolidados (eventos + externos)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_gastos_consolidados AS
SELECT
  'evt_gastos' AS origen,
  g.id,
  g.evento_id,
  e.nombre_proyecto AS evento_nombre,
  g.concepto,
  g.descripcion,
  g.total,
  g.fecha_gasto AS fecha,
  g.pagado,
  g.fecha_pago,
  g.proveedor,
  g.rfc_proveedor,
  g.cuenta_id,
  c.nombre AS cuenta_nombre,
  g.cuenta_contable_gasto_id,
  cg.nombre AS cuenta_contable_nombre,
  g.tipo_comprobante,
  g.forma_pago,
  g.referencia,
  g.created_at,
  g.created_by,
  (SELECT COUNT(*) FROM cont_documentos d 
   WHERE d.referencia_tabla = 'evt_gastos' AND d.referencia_id = g.id) AS num_documentos
FROM evt_gastos g
LEFT JOIN evt_eventos e ON g.evento_id = e.id
LEFT JOIN evt_cuentas c ON g.cuenta_id = c.id
LEFT JOIN evt_cuentas cg ON g.cuenta_contable_gasto_id = cg.id
WHERE g.activo = true

UNION ALL

SELECT
  'cont_gastos_externos' AS origen,
  ge.id,
  NULL AS evento_id,
  NULL AS evento_nombre,
  ge.concepto,
  ge.descripcion,
  ge.total,
  ge.fecha_gasto AS fecha,
  ge.pagado,
  ge.fecha_pago,
  ge.proveedor,
  ge.rfc_proveedor,
  ge.cuenta_id,
  c.nombre AS cuenta_nombre,
  ge.cuenta_contable_gasto_id,
  cg.nombre AS cuenta_contable_nombre,
  ge.tipo_comprobante,
  ge.forma_pago,
  ge.referencia,
  ge.created_at,
  ge.created_by,
  (SELECT COUNT(*) FROM cont_documentos d 
   WHERE d.referencia_tabla = 'cont_gastos_externos' AND d.referencia_id = ge.id) AS num_documentos
FROM cont_gastos_externos ge
LEFT JOIN evt_cuentas c ON ge.cuenta_id = c.id
LEFT JOIN evt_cuentas cg ON ge.cuenta_contable_gasto_id = cg.id
WHERE ge.activo = true;

COMMENT ON VIEW vw_gastos_consolidados IS 
  'Vista consolidada de todos los gastos (eventos + externos) con documentos';

-- ═══════════════════════════════════════════════════════════════════════════
-- VISTA 3: Movimientos por cuenta
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_movimientos_cuenta AS
SELECT
  c.id AS cuenta_id,
  c.codigo AS cuenta_codigo,
  c.nombre AS cuenta_nombre,
  c.tipo AS cuenta_tipo,
  
  m.id AS movimiento_id,
  m.tipo AS movimiento_tipo,
  m.fecha_movimiento,
  m.concepto,
  m.referencia_bancaria,
  
  -- Monto según tipo de movimiento
  CASE 
    WHEN m.cuenta_destino_id = c.id THEN m.monto
    ELSE 0
  END AS debe,
  
  CASE 
    WHEN m.cuenta_origen_id = c.id THEN m.monto
    ELSE 0
  END AS haber,
  
  m.estado,
  m.conciliado,
  m.referencia_tabla,
  m.referencia_id,
  
  -- Documentos asociados a la referencia
  (SELECT COUNT(*) FROM cont_documentos d 
   WHERE d.referencia_tabla = m.referencia_tabla 
   AND d.referencia_id = m.referencia_id) AS num_documentos,
  
  m.created_at,
  m.created_by
FROM evt_cuentas c
INNER JOIN cont_movimientos_bancarios m ON (
  m.cuenta_origen_id = c.id OR m.cuenta_destino_id = c.id
)
WHERE c.activo = true
ORDER BY c.id, m.fecha_movimiento DESC;

COMMENT ON VIEW vw_movimientos_cuenta IS 
  'Movimientos bancarios por cuenta con debe/haber y documentos';

-- ═══════════════════════════════════════════════════════════════════════════
-- VISTA 4: Balance de comprobación
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_balance_comprobacion AS
SELECT
  c.id AS cuenta_id,
  c.codigo AS cuenta_codigo,
  c.nombre AS cuenta_nombre,
  c.tipo AS cuenta_tipo,
  c.naturaleza,
  
  -- Saldo inicial
  COALESCE(c.saldo_inicial, 0) AS saldo_inicial,
  
  -- Movimientos del periodo
  COALESCE(SUM(p.debe), 0) AS total_debe,
  COALESCE(SUM(p.haber), 0) AS total_haber,
  
  -- Saldo final
  COALESCE(c.saldo_inicial, 0) + 
  COALESCE(SUM(p.debe), 0) - 
  COALESCE(SUM(p.haber), 0) AS saldo_final,
  
  -- Número de movimientos
  COUNT(p.id) AS num_movimientos,
  
  -- Última actualización
  MAX(p.created_at) AS ultima_actualizacion
  
FROM evt_cuentas c
LEFT JOIN cont_partidas p ON p.cuenta_id = c.id
LEFT JOIN cont_asientos_contables a ON p.asiento_id = a.id
WHERE c.activo = true 
  AND c.acepta_movimientos = true
  AND (a.estado = 'confirmado' OR a.estado IS NULL)
GROUP BY c.id, c.codigo, c.nombre, c.tipo, c.naturaleza, c.saldo_inicial
ORDER BY c.codigo;

COMMENT ON VIEW vw_balance_comprobacion IS 
  'Balance de comprobación con saldos por cuenta';

-- ═══════════════════════════════════════════════════════════════════════════
-- VISTA 5: Auditoría completa de modificaciones
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_auditoria_modificaciones AS
SELECT
  a.id,
  a.tabla,
  a.registro_id,
  a.campo_modificado,
  a.valor_anterior,
  a.valor_nuevo,
  a.operacion,
  a.razon,
  a.categoria_cambio,
  a.usuario_id,
  a.usuario_nombre,
  a.usuario_rol,
  a.fecha_modificacion,
  a.ip_address,
  
  -- Obtener concepto del registro modificado
  CASE a.tabla
    WHEN 'evt_ingresos' THEN 
      (SELECT concepto FROM evt_ingresos WHERE id = a.registro_id)
    WHEN 'evt_gastos' THEN 
      (SELECT concepto FROM evt_gastos WHERE id = a.registro_id)
    WHEN 'cont_ingresos_externos' THEN 
      (SELECT concepto FROM cont_ingresos_externos WHERE id = a.registro_id)
    WHEN 'cont_gastos_externos' THEN 
      (SELECT concepto FROM cont_gastos_externos WHERE id = a.registro_id)
  END AS concepto_registro,
  
  a.created_at
FROM cont_auditoria_modificaciones a
ORDER BY a.fecha_modificacion DESC;

COMMENT ON VIEW vw_auditoria_modificaciones IS 
  'Historial completo de modificaciones con contexto del registro';

-- ═══════════════════════════════════════════════════════════════════════════
-- VISTA 6: Resumen financiero por periodo
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_resumen_financiero_periodo AS
SELECT
  TO_CHAR(fecha, 'YYYY-MM') AS periodo,
  EXTRACT(YEAR FROM fecha) AS año,
  EXTRACT(MONTH FROM fecha) AS mes,
  
  -- Ingresos
  SUM(CASE WHEN cobrado THEN total ELSE 0 END) AS ingresos_cobrados,
  SUM(CASE WHEN NOT cobrado THEN total ELSE 0 END) AS ingresos_pendientes,
  SUM(total) AS ingresos_totales,
  
  COUNT(*) AS num_ingresos
  
FROM vw_ingresos_consolidados

UNION ALL

SELECT
  TO_CHAR(fecha, 'YYYY-MM') AS periodo,
  EXTRACT(YEAR FROM fecha) AS año,
  EXTRACT(MONTH FROM fecha) AS mes,
  
  -- Gastos (negativos)
  SUM(CASE WHEN pagado THEN -total ELSE 0 END) AS gastos_pagados,
  SUM(CASE WHEN NOT pagado THEN -total ELSE 0 END) AS gastos_pendientes,
  SUM(-total) AS gastos_totales,
  
  COUNT(*) AS num_gastos
  
FROM vw_gastos_consolidados;

COMMENT ON VIEW vw_resumen_financiero_periodo IS 
  'Resumen de ingresos y gastos por periodo mensual';

-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISOS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT SELECT ON vw_ingresos_consolidados TO authenticated, anon;
GRANT SELECT ON vw_gastos_consolidados TO authenticated, anon;
GRANT SELECT ON vw_movimientos_cuenta TO authenticated, anon;
GRANT SELECT ON vw_balance_comprobacion TO authenticated, anon;
GRANT SELECT ON vw_auditoria_modificaciones TO authenticated, anon;
GRANT SELECT ON vw_resumen_financiero_periodo TO authenticated, anon;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (en caso de necesitar revertir)
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP VIEW IF EXISTS vw_resumen_financiero_periodo CASCADE;
-- DROP VIEW IF EXISTS vw_auditoria_modificaciones CASCADE;
-- DROP VIEW IF EXISTS vw_balance_comprobacion CASCADE;
-- DROP VIEW IF EXISTS vw_movimientos_cuenta CASCADE;
-- DROP VIEW IF EXISTS vw_gastos_consolidados CASCADE;
-- DROP VIEW IF EXISTS vw_ingresos_consolidados CASCADE;
-- COMMIT;
