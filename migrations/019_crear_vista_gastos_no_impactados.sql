-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 019: CREAR VISTA v_gastos_no_impactados
-- ═══════════════════════════════════════════════════════════════════════════════
-- Esta vista es requerida por el módulo GNI del frontend
-- Combina gastos externos con sus catálogos relacionados
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. CREAR VISTA DE GASTOS NO IMPACTADOS
-- ═══════════════════════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_gastos_no_impactados CASCADE;

CREATE VIEW v_gastos_no_impactados AS
SELECT
  g.id,
  g.company_id,
  g.concepto,
  g.subtotal,
  g.iva,
  g.iva_porcentaje,
  g.total,
  g.periodo,
  g.fecha_gasto,
  g.validacion,
  g.status_pago,
  g.pagado,
  g.folio_factura,
  g.documento_url,
  g.notas,
  g.activo,
  g.created_at,
  g.updated_at,

  -- Relación con cuentas contables (antes claves de gasto)
  g.cuenta_contable_id,
  cc.clave AS clave_gasto,
  cc.cuenta,
  cc.subcuenta,

  -- Relación con proveedores centralizados
  g.proveedor_id,
  p.nombre AS proveedor_nombre,
  p.rfc AS proveedor_rfc,
  p.razon_social AS proveedor_razon_social,

  -- Relación con formas de pago
  g.forma_pago_id,
  fp.nombre AS forma_pago_nombre,
  fp.tipo AS forma_pago_tipo,

  -- Relación con ejecutivos
  g.ejecutivo_id,
  e.nombre AS ejecutivo_nombre

FROM cont_gastos_externos g
LEFT JOIN cont_cuentas_contables cc ON g.cuenta_contable_id = cc.id
LEFT JOIN cont_proveedores p ON g.proveedor_id = p.id
LEFT JOIN cont_formas_pago fp ON g.forma_pago_id = fp.id
LEFT JOIN cont_ejecutivos e ON g.ejecutivo_id = e.id
WHERE g.activo = true;

-- 2. CREAR VISTA LEGACY PARA COMPATIBILIDAD (usando clave_gasto_id)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Algunos queries aún usan clave_gasto_id, esta vista mapea a cuenta_contable_id
DROP VIEW IF EXISTS v_gni_legacy CASCADE;

CREATE VIEW v_gni_legacy AS
SELECT
  g.*,
  g.cuenta_contable_id AS clave_gasto_id
FROM v_gastos_no_impactados g;

-- 3. ÍNDICES PARA MEJORAR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_cont_gastos_externos_periodo ON cont_gastos_externos(periodo);
CREATE INDEX IF NOT EXISTS idx_cont_gastos_externos_fecha ON cont_gastos_externos(fecha_gasto);
CREATE INDEX IF NOT EXISTS idx_cont_gastos_externos_proveedor ON cont_gastos_externos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_cont_gastos_externos_cuenta ON cont_gastos_externos(cuenta_contable_id);
CREATE INDEX IF NOT EXISTS idx_cont_gastos_externos_company_activo ON cont_gastos_externos(company_id, activo);

-- 4. COMENTARIOS
-- ═══════════════════════════════════════════════════════════════════════════════
COMMENT ON VIEW v_gastos_no_impactados IS 'Vista principal de Gastos No Impactados con todos los catálogos relacionados';
COMMENT ON VIEW v_gni_legacy IS 'Vista de compatibilidad para código que usa clave_gasto_id en lugar de cuenta_contable_id';
