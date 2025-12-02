-- ============================================
-- ADD: Utilidad Bruta (basada en subtotales sin IVA)
-- ============================================
--
-- CONCEPTO:
-- - Utilidad Bruta = Ingresos Subtotal - Gastos Subtotal - Provisiones Subtotal
-- - NO incluye IVA ni retenciones
-- - Es el cálculo correcto para análisis financiero
--
-- CAMPOS NUEVOS:
-- - ingresos_subtotal: Suma de subtotales de ingresos (sin IVA)
-- - gastos_subtotal: Suma de subtotales de gastos (sin IVA)
-- - provisiones_subtotal: Suma de subtotales de provisiones (sin IVA)
-- - utilidad_bruta: Ingresos Subtotal - Gastos Subtotal - Provisiones Subtotal
-- - margen_bruto_pct: (Utilidad Bruta / Ingresos Subtotal) × 100
-- ============================================

DROP VIEW IF EXISTS vw_eventos_analisis_financiero_erp;

CREATE OR REPLACE VIEW vw_eventos_analisis_financiero_erp AS
SELECT
  -- IDENTIFICACIÓN
  e.id,
  e.company_id,
  e.clave_evento,
  e.nombre_proyecto,
  e.descripcion,
  e.fecha_evento,
  e.fecha_fin,
  e.lugar,
  e.numero_invitados,
  e.prioridad,
  e.fase_proyecto,
  e.created_at,
  e.updated_at,

  -- CLIENTE
  e.cliente_id,
  c.razon_social AS cliente_nombre,
  c.nombre_comercial AS cliente_comercial,
  c.rfc AS cliente_rfc,

  -- ESTADO
  e.estado_id,
  est.nombre AS estado_nombre,
  est.color AS estado_color,

  -- TIPO EVENTO
  e.tipo_evento_id,
  te.nombre AS tipo_evento_nombre,
  te.color AS tipo_evento_color,

  -- INGRESO ESTIMADO (campo del evento)
  COALESCE(e.ingreso_estimado, 0) AS ingreso_estimado,

  -- ============================================
  -- INGRESOS (con totales Y subtotales)
  -- ============================================
  COALESCE(ing.ingresos_totales, 0) AS ingresos_totales,
  COALESCE(ing.ingresos_subtotal, 0) AS ingresos_subtotal,
  COALESCE(ing.ingresos_iva, 0) AS ingresos_iva,
  COALESCE(ing.ingresos_cobrados, 0) AS ingresos_cobrados,
  COALESCE(ing.ingresos_pendientes, 0) AS ingresos_pendientes,

  -- ============================================
  -- GASTOS (con totales Y subtotales)
  -- ============================================
  COALESCE(gas.gastos_totales, 0) AS gastos_totales,
  COALESCE(gas.gastos_subtotal, 0) AS gastos_subtotal,
  COALESCE(gas.gastos_iva, 0) AS gastos_iva,
  COALESCE(gas.gastos_pagados_total, 0) AS gastos_pagados_total,
  COALESCE(gas.gastos_pendientes_total, 0) AS gastos_pendientes_total,

  -- GASTOS POR CATEGORÍA - Combustible
  COALESCE(gas.gastos_combustible_pagados, 0) AS gastos_combustible_pagados,
  COALESCE(gas.gastos_combustible_pendientes, 0) AS gastos_combustible_pendientes,

  -- GASTOS POR CATEGORÍA - Materiales
  COALESCE(gas.gastos_materiales_pagados, 0) AS gastos_materiales_pagados,
  COALESCE(gas.gastos_materiales_pendientes, 0) AS gastos_materiales_pendientes,

  -- GASTOS POR CATEGORÍA - RH
  COALESCE(gas.gastos_rh_pagados, 0) AS gastos_rh_pagados,
  COALESCE(gas.gastos_rh_pendientes, 0) AS gastos_rh_pendientes,

  -- GASTOS POR CATEGORÍA - SPs
  COALESCE(gas.gastos_sps_pagados, 0) AS gastos_sps_pagados,
  COALESCE(gas.gastos_sps_pendientes, 0) AS gastos_sps_pendientes,

  -- ============================================
  -- PROVISIONES (con totales Y subtotales)
  -- ============================================
  COALESCE(prov.provisiones_total, 0) AS provisiones_total,
  COALESCE(prov.provisiones_subtotal, 0) AS provisiones_subtotal,
  COALESCE(prov.provisiones_iva, 0) AS provisiones_iva,
  COALESCE(prov.provisiones_count, 0) AS provisiones_count,

  -- PROVISIONES POR CATEGORÍA
  COALESCE(prov.provision_combustible, 0) AS provision_combustible,
  COALESCE(prov.provision_materiales, 0) AS provision_materiales,
  COALESCE(prov.provision_rh, 0) AS provision_rh,
  COALESCE(prov.provision_sps, 0) AS provision_sps,

  -- ============================================
  -- TOTAL EGRESOS = GASTOS + PROVISIONES (con totales)
  -- ============================================
  (
    COALESCE(gas.gastos_totales, 0) + COALESCE(prov.provisiones_total, 0)
  ) AS total_egresos,

  -- ============================================
  -- TOTAL EGRESOS SUBTOTAL (sin IVA)
  -- ============================================
  (
    COALESCE(gas.gastos_subtotal, 0) + COALESCE(prov.provisiones_subtotal, 0)
  ) AS total_egresos_subtotal,

  -- ============================================
  -- UTILIDAD REAL (con IVA - mantener compatibilidad)
  -- ============================================
  (
    COALESCE(ing.ingresos_totales, 0)
    - COALESCE(gas.gastos_totales, 0)
    - COALESCE(prov.provisiones_total, 0)
  ) AS utilidad_real,

  -- ============================================
  -- UTILIDAD BRUTA = SUBTOTALES (SIN IVA)
  -- Esta es la utilidad correcta para análisis financiero
  -- ============================================
  (
    COALESCE(ing.ingresos_subtotal, 0)
    - COALESCE(gas.gastos_subtotal, 0)
    - COALESCE(prov.provisiones_subtotal, 0)
  ) AS utilidad_bruta,

  -- ============================================
  -- MARGEN REAL (basado en totales con IVA)
  -- ============================================
  CASE
    WHEN COALESCE(ing.ingresos_totales, 0) > 0
    THEN (
      (
        COALESCE(ing.ingresos_totales, 0)
        - COALESCE(gas.gastos_totales, 0)
        - COALESCE(prov.provisiones_total, 0)
      ) / COALESCE(ing.ingresos_totales, 0)
    ) * 100
    ELSE 0
  END AS margen_real_pct,

  -- ============================================
  -- MARGEN BRUTO (basado en subtotales SIN IVA)
  -- Esta es el margen correcto para análisis financiero
  -- ============================================
  CASE
    WHEN COALESCE(ing.ingresos_subtotal, 0) > 0
    THEN (
      (
        COALESCE(ing.ingresos_subtotal, 0)
        - COALESCE(gas.gastos_subtotal, 0)
        - COALESCE(prov.provisiones_subtotal, 0)
      ) / COALESCE(ing.ingresos_subtotal, 0)
    ) * 100
    ELSE 0
  END AS margen_bruto_pct

FROM evt_eventos_erp e

-- JOIN Cliente
LEFT JOIN evt_clientes_erp c ON e.cliente_id = c.id

-- JOIN Estado
LEFT JOIN evt_estados_erp est ON e.estado_id = est.id

-- JOIN Tipo Evento
LEFT JOIN evt_tipos_evento_erp te ON e.tipo_evento_id = te.id

-- SUBQUERY Ingresos (con subtotales)
LEFT JOIN LATERAL (
  SELECT
    SUM(total) AS ingresos_totales,
    SUM(COALESCE(subtotal, total / 1.16)) AS ingresos_subtotal,
    SUM(COALESCE(iva, total - (total / 1.16))) AS ingresos_iva,
    SUM(CASE WHEN cobrado = true THEN total ELSE 0 END) AS ingresos_cobrados,
    SUM(CASE WHEN cobrado = false OR cobrado IS NULL THEN total ELSE 0 END) AS ingresos_pendientes
  FROM evt_ingresos_erp
  WHERE evento_id = e.id AND deleted_at IS NULL
) ing ON true

-- SUBQUERY Gastos (con subtotales)
LEFT JOIN LATERAL (
  SELECT
    SUM(total) AS gastos_totales,
    SUM(COALESCE(subtotal, total / 1.16)) AS gastos_subtotal,
    SUM(COALESCE(iva, total - (total / 1.16))) AS gastos_iva,
    SUM(CASE WHEN pagado = true THEN total ELSE 0 END) AS gastos_pagados_total,
    SUM(CASE WHEN pagado = false OR pagado IS NULL THEN total ELSE 0 END) AS gastos_pendientes_total,
    -- Por categoría - Combustible (id: 9)
    SUM(CASE WHEN categoria_id = 9 AND pagado = true THEN total ELSE 0 END) AS gastos_combustible_pagados,
    SUM(CASE WHEN categoria_id = 9 AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_combustible_pendientes,
    -- Por categoría - Materiales (id: 8)
    SUM(CASE WHEN categoria_id = 8 AND pagado = true THEN total ELSE 0 END) AS gastos_materiales_pagados,
    SUM(CASE WHEN categoria_id = 8 AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_materiales_pendientes,
    -- Por categoría - RH (id: 7)
    SUM(CASE WHEN categoria_id = 7 AND pagado = true THEN total ELSE 0 END) AS gastos_rh_pagados,
    SUM(CASE WHEN categoria_id = 7 AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_rh_pendientes,
    -- Por categoría - SPs (id: 6 o NULL)
    SUM(CASE WHEN (categoria_id = 6 OR categoria_id IS NULL) AND pagado = true THEN total ELSE 0 END) AS gastos_sps_pagados,
    SUM(CASE WHEN (categoria_id = 6 OR categoria_id IS NULL) AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_sps_pendientes
  FROM evt_gastos_erp
  WHERE evento_id = e.id AND deleted_at IS NULL
) gas ON true

-- SUBQUERY Provisiones (con subtotales)
LEFT JOIN LATERAL (
  SELECT
    SUM(p.total) AS provisiones_total,
    SUM(COALESCE(p.subtotal, p.total / 1.16)) AS provisiones_subtotal,
    SUM(COALESCE(p.iva, p.total - (p.total / 1.16))) AS provisiones_iva,
    COUNT(*) AS provisiones_count,
    -- Por categoría usando cat_categorias_gasto.clave
    SUM(CASE WHEN cat.clave = 'COMB' THEN p.total ELSE 0 END) AS provision_combustible,
    SUM(CASE WHEN cat.clave = 'MAT' THEN p.total ELSE 0 END) AS provision_materiales,
    SUM(CASE WHEN cat.clave = 'RH' THEN p.total ELSE 0 END) AS provision_rh,
    SUM(CASE WHEN cat.clave = 'SP' OR cat.clave IS NULL THEN p.total ELSE 0 END) AS provision_sps
  FROM evt_provisiones_erp p
  LEFT JOIN cat_categorias_gasto cat ON p.categoria_id = cat.id
  WHERE p.evento_id = e.id AND p.activo = true
) prov ON true;

-- ============================================
-- Verificar la vista con nuevos campos
-- ============================================
SELECT
  id,
  clave_evento,
  nombre_proyecto,
  ingresos_totales,
  ingresos_subtotal,
  gastos_totales,
  gastos_subtotal,
  provisiones_total,
  provisiones_subtotal,
  utilidad_real,
  utilidad_bruta,
  margen_real_pct,
  margen_bruto_pct
FROM vw_eventos_analisis_financiero_erp
WHERE nombre_proyecto ILIKE '%DOTERRA%'
   OR clave_evento LIKE 'TEST%'
ORDER BY id
LIMIT 5;
