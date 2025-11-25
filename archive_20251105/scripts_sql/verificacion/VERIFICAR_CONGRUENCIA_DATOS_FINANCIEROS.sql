-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN DE CONGRUENCIA: VISTA vs DATOS REALES
-- ═══════════════════════════════════════════════════════════════════════════
-- Verifica que los datos en vw_eventos_analisis_financiero sean congruentes
-- con los datos reales guardados en evt_eventos, evt_gastos, evt_ingresos
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR TOTALES GENERALES
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  '═══════════════════════════════════════════' AS separador,
  '1. TOTALES GENERALES - COMPARACIÓN' AS seccion;

WITH totales_reales AS (
  SELECT
    'INGRESOS COBRADOS' AS concepto,
    COALESCE(SUM(total), 0) AS total_real
  FROM evt_ingresos
  WHERE cobrado = true
    AND deleted_at IS NULL
  
  UNION ALL
  
  SELECT
    'INGRESOS PENDIENTES' AS concepto,
    COALESCE(SUM(total), 0) AS total_real
  FROM evt_ingresos
  WHERE cobrado = false
    AND deleted_at IS NULL
  
  UNION ALL
  
  SELECT
    'GASTOS PAGADOS' AS concepto,
    COALESCE(SUM(total), 0) AS total_real
  FROM evt_gastos
  WHERE pagado = true
    AND deleted_at IS NULL
  
  UNION ALL
  
  SELECT
    'GASTOS PENDIENTES' AS concepto,
    COALESCE(SUM(total), 0) AS total_real
  FROM evt_gastos
  WHERE pagado = false
    AND deleted_at IS NULL
),
totales_vista AS (
  SELECT
    'INGRESOS COBRADOS' AS concepto,
    COALESCE(SUM(ingresos_cobrados), 0) AS total_vista
  FROM vw_eventos_analisis_financiero
  
  UNION ALL
  
  SELECT
    'INGRESOS PENDIENTES' AS concepto,
    COALESCE(SUM(ingresos_pendientes), 0) AS total_vista
  FROM vw_eventos_analisis_financiero
  
  UNION ALL
  
  SELECT
    'GASTOS PAGADOS' AS concepto,
    COALESCE(SUM(gastos_pagados_total), 0) AS total_vista
  FROM vw_eventos_analisis_financiero
  
  UNION ALL
  
  SELECT
    'GASTOS PENDIENTES' AS concepto,
    COALESCE(SUM(gastos_pendientes_total), 0) AS total_vista
  FROM vw_eventos_analisis_financiero
)
SELECT
  r.concepto,
  TO_CHAR(r.total_real, 'FM$999,999,999.00') AS total_real,
  TO_CHAR(v.total_vista, 'FM$999,999,999.00') AS total_vista,
  TO_CHAR(r.total_real - v.total_vista, 'FM$999,999,999.00') AS diferencia,
  CASE
    WHEN r.total_real = v.total_vista THEN '✅ CORRECTO'
    ELSE '❌ DISCREPANCIA'
  END AS status
FROM totales_reales r
JOIN totales_vista v ON r.concepto = v.concepto
ORDER BY r.concepto;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. VERIFICAR GASTOS POR CATEGORÍA
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  '═══════════════════════════════════════════' AS separador,
  '2. GASTOS POR CATEGORÍA - COMPARACIÓN' AS seccion;

WITH gastos_reales AS (
  SELECT
    cat.nombre AS categoria,
    'PAGADOS' AS tipo,
    COALESCE(SUM(g.total), 0) AS total_real
  FROM evt_gastos g
  LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
  WHERE g.pagado = true
    AND g.deleted_at IS NULL
    AND cat.nombre IN ('Combustible/Peaje', 'Materiales', 'Recursos Humanos', 'Solicitudes de Pago')
  GROUP BY cat.nombre
  
  UNION ALL
  
  SELECT
    cat.nombre AS categoria,
    'PENDIENTES' AS tipo,
    COALESCE(SUM(g.total), 0) AS total_real
  FROM evt_gastos g
  LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
  WHERE g.pagado = false
    AND g.deleted_at IS NULL
    AND cat.nombre IN ('Combustible/Peaje', 'Materiales', 'Recursos Humanos', 'Solicitudes de Pago')
  GROUP BY cat.nombre
),
gastos_vista AS (
  SELECT 'Combustible/Peaje' AS categoria, 'PAGADOS' AS tipo, SUM(gastos_combustible_pagados) AS total_vista
  FROM vw_eventos_analisis_financiero
  UNION ALL
  SELECT 'Combustible/Peaje', 'PENDIENTES', SUM(gastos_combustible_pendientes)
  FROM vw_eventos_analisis_financiero
  UNION ALL
  SELECT 'Materiales', 'PAGADOS', SUM(gastos_materiales_pagados)
  FROM vw_eventos_analisis_financiero
  UNION ALL
  SELECT 'Materiales', 'PENDIENTES', SUM(gastos_materiales_pendientes)
  FROM vw_eventos_analisis_financiero
  UNION ALL
  SELECT 'Recursos Humanos', 'PAGADOS', SUM(gastos_rh_pagados)
  FROM vw_eventos_analisis_financiero
  UNION ALL
  SELECT 'Recursos Humanos', 'PENDIENTES', SUM(gastos_rh_pendientes)
  FROM vw_eventos_analisis_financiero
  UNION ALL
  SELECT 'Solicitudes de Pago', 'PAGADOS', SUM(gastos_sps_pagados)
  FROM vw_eventos_analisis_financiero
  UNION ALL
  SELECT 'Solicitudes de Pago', 'PENDIENTES', SUM(gastos_sps_pendientes)
  FROM vw_eventos_analisis_financiero
)
SELECT
  r.categoria,
  r.tipo,
  TO_CHAR(r.total_real, 'FM$999,999,999.00') AS total_real,
  TO_CHAR(v.total_vista, 'FM$999,999,999.00') AS total_vista,
  TO_CHAR(r.total_real - v.total_vista, 'FM$999,999,999.00') AS diferencia,
  CASE
    WHEN r.total_real = v.total_vista THEN '✅ CORRECTO'
    ELSE '❌ DISCREPANCIA'
  END AS status
FROM gastos_reales r
LEFT JOIN gastos_vista v ON r.categoria = v.categoria AND r.tipo = v.tipo
ORDER BY r.categoria, r.tipo;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. VERIFICAR PROVISIONES vs TOTALES
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  '═══════════════════════════════════════════' AS separador,
  '3. PROVISIONES - VERIFICACIÓN DE SUMA' AS seccion;

SELECT
  clave_evento,
  nombre_proyecto,
  TO_CHAR(provision_combustible_peaje, 'FM$999,999.00') AS prov_combustible,
  TO_CHAR(provision_materiales, 'FM$999,999.00') AS prov_materiales,
  TO_CHAR(provision_recursos_humanos, 'FM$999,999.00') AS prov_rh,
  TO_CHAR(provision_solicitudes_pago, 'FM$999,999.00') AS prov_sps,
  TO_CHAR(provisiones_total, 'FM$999,999.00') AS suma_vista,
  TO_CHAR(
    provision_combustible_peaje +
    provision_materiales +
    provision_recursos_humanos +
    provision_solicitudes_pago,
    'FM$999,999.00'
  ) AS suma_manual,
  CASE
    WHEN provisiones_total = (
      provision_combustible_peaje +
      provision_materiales +
      provision_recursos_humanos +
      provision_solicitudes_pago
    ) THEN '✅'
    ELSE '❌'
  END AS status
FROM vw_eventos_analisis_financiero
WHERE provisiones_total > 0
ORDER BY clave_evento
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VERIFICAR UTILIDAD ESTIMADA
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  '═══════════════════════════════════════════' AS separador,
  '4. UTILIDAD ESTIMADA - VERIFICACIÓN DE CÁLCULO' AS seccion;

SELECT
  clave_evento,
  nombre_proyecto,
  TO_CHAR(ingreso_estimado, 'FM$999,999.00') AS ingreso_est,
  TO_CHAR(provisiones_total, 'FM$999,999.00') AS provisiones,
  TO_CHAR(utilidad_estimada, 'FM$999,999.00') AS util_vista,
  TO_CHAR(ingreso_estimado - provisiones_total, 'FM$999,999.00') AS util_manual,
  CASE
    WHEN utilidad_estimada = (ingreso_estimado - provisiones_total) THEN '✅'
    ELSE '❌'
  END AS status
FROM vw_eventos_analisis_financiero
WHERE ingreso_estimado > 0
ORDER BY clave_evento
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. VERIFICAR UTILIDAD REAL
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  '═══════════════════════════════════════════' AS separador,
  '5. UTILIDAD REAL - VERIFICACIÓN DE CÁLCULO' AS seccion;

SELECT
  clave_evento,
  nombre_proyecto,
  TO_CHAR(ingresos_cobrados, 'FM$999,999.00') AS ingresos_cob,
  TO_CHAR(gastos_pagados_total, 'FM$999,999.00') AS gastos_pag,
  TO_CHAR(utilidad_real, 'FM$999,999.00') AS util_vista,
  TO_CHAR(ingresos_cobrados - gastos_pagados_total, 'FM$999,999.00') AS util_manual,
  CASE
    WHEN utilidad_real = (ingresos_cobrados - gastos_pagados_total) THEN '✅'
    ELSE '❌'
  END AS status
FROM vw_eventos_analisis_financiero
WHERE ingresos_cobrados > 0 OR gastos_pagados_total > 0
ORDER BY clave_evento
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. VERIFICAR DISPONIBLES POR CATEGORÍA
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  '═══════════════════════════════════════════' AS separador,
  '6. DISPONIBLES POR CATEGORÍA - VERIFICACIÓN' AS seccion;

SELECT
  clave_evento,
  nombre_proyecto,
  
  -- Combustible
  TO_CHAR(provision_combustible_peaje - gastos_combustible_pagados, 'FM$999,999.00') AS disp_comb_manual,
  TO_CHAR(disponible_combustible, 'FM$999,999.00') AS disp_comb_vista,
  CASE WHEN (provision_combustible_peaje - gastos_combustible_pagados) = disponible_combustible THEN '✅' ELSE '❌' END AS ok_comb,
  
  -- Materiales
  TO_CHAR(provision_materiales - gastos_materiales_pagados, 'FM$999,999.00') AS disp_mat_manual,
  TO_CHAR(disponible_materiales, 'FM$999,999.00') AS disp_mat_vista,
  CASE WHEN (provision_materiales - gastos_materiales_pagados) = disponible_materiales THEN '✅' ELSE '❌' END AS ok_mat,
  
  -- RH
  TO_CHAR(provision_recursos_humanos - gastos_rh_pagados, 'FM$999,999.00') AS disp_rh_manual,
  TO_CHAR(disponible_rh, 'FM$999,999.00') AS disp_rh_vista,
  CASE WHEN (provision_recursos_humanos - gastos_rh_pagados) = disponible_rh THEN '✅' ELSE '❌' END AS ok_rh,
  
  -- SPs
  TO_CHAR(provision_solicitudes_pago - gastos_sps_pagados, 'FM$999,999.00') AS disp_sps_manual,
  TO_CHAR(disponible_sps, 'FM$999,999.00') AS disp_sps_vista,
  CASE WHEN (provision_solicitudes_pago - gastos_sps_pagados) = disponible_sps THEN '✅' ELSE '❌' END AS ok_sps
  
FROM vw_eventos_analisis_financiero
WHERE provisiones_total > 0
ORDER BY clave_evento
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. VERIFICAR EVENTOS CON DISCREPANCIAS
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  '═══════════════════════════════════════════' AS separador,
  '7. EVENTOS CON POSIBLES DISCREPANCIAS' AS seccion;

WITH verificacion AS (
  SELECT
    e.id,
    e.clave_evento,
    e.nombre_proyecto,
    
    -- Verificar ingresos cobrados
    (SELECT COALESCE(SUM(total), 0)
     FROM evt_ingresos i
     WHERE i.evento_id = e.id
       AND i.cobrado = true
       AND i.deleted_at IS NULL) AS ingresos_cobrados_real,
    v.ingresos_cobrados AS ingresos_cobrados_vista,
    
    -- Verificar gastos pagados
    (SELECT COALESCE(SUM(total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id
       AND g.pagado = true
       AND g.deleted_at IS NULL) AS gastos_pagados_real,
    v.gastos_pagados_total AS gastos_pagados_vista,
    
    -- Verificar provisiones
    (COALESCE(e.provision_combustible_peaje, 0) +
     COALESCE(e.provision_materiales, 0) +
     COALESCE(e.provision_recursos_humanos, 0) +
     COALESCE(e.provision_solicitudes_pago, 0)) AS provisiones_real,
    v.provisiones_total AS provisiones_vista
    
  FROM evt_eventos e
  JOIN vw_eventos_analisis_financiero v ON e.id = v.id
  WHERE e.activo = true
)
SELECT
  clave_evento,
  nombre_proyecto,
  CASE
    WHEN ingresos_cobrados_real != ingresos_cobrados_vista THEN '❌ Ingresos'
    WHEN gastos_pagados_real != gastos_pagados_vista THEN '❌ Gastos'
    WHEN provisiones_real != provisiones_vista THEN '❌ Provisiones'
    ELSE '✅ Todo OK'
  END AS problema,
  TO_CHAR(ingresos_cobrados_real, 'FM$999,999.00') AS ing_real,
  TO_CHAR(ingresos_cobrados_vista, 'FM$999,999.00') AS ing_vista,
  TO_CHAR(gastos_pagados_real, 'FM$999,999.00') AS gasto_real,
  TO_CHAR(gastos_pagados_vista, 'FM$999,999.00') AS gasto_vista,
  TO_CHAR(provisiones_real, 'FM$999,999.00') AS prov_real,
  TO_CHAR(provisiones_vista, 'FM$999,999.00') AS prov_vista
FROM verificacion
WHERE 
  ingresos_cobrados_real != ingresos_cobrados_vista OR
  gastos_pagados_real != gastos_pagados_vista OR
  provisiones_real != provisiones_vista
ORDER BY clave_evento;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RESUMEN FINAL
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  '═══════════════════════════════════════════' AS separador,
  '8. RESUMEN FINAL DE VERIFICACIÓN' AS seccion;

WITH verificacion_completa AS (
  SELECT
    COUNT(*) AS total_eventos,
    
    -- Eventos con ingresos correctos
    SUM(CASE
      WHEN (SELECT COALESCE(SUM(total), 0)
            FROM evt_ingresos i
            WHERE i.evento_id = e.id
              AND i.cobrado = true
              AND i.deleted_at IS NULL) = v.ingresos_cobrados
      THEN 1 ELSE 0
    END) AS ingresos_correctos,
    
    -- Eventos con gastos correctos
    SUM(CASE
      WHEN (SELECT COALESCE(SUM(total), 0)
            FROM evt_gastos g
            WHERE g.evento_id = e.id
              AND g.pagado = true
              AND g.deleted_at IS NULL) = v.gastos_pagados_total
      THEN 1 ELSE 0
    END) AS gastos_correctos,
    
    -- Eventos con provisiones correctas
    SUM(CASE
      WHEN (COALESCE(e.provision_combustible_peaje, 0) +
            COALESCE(e.provision_materiales, 0) +
            COALESCE(e.provision_recursos_humanos, 0) +
            COALESCE(e.provision_solicitudes_pago, 0)) = v.provisiones_total
      THEN 1 ELSE 0
    END) AS provisiones_correctas,
    
    -- Eventos con utilidad estimada correcta
    SUM(CASE
      WHEN (v.ingreso_estimado - v.provisiones_total) = v.utilidad_estimada
      THEN 1 ELSE 0
    END) AS utilidad_estimada_correcta,
    
    -- Eventos con utilidad real correcta
    SUM(CASE
      WHEN (v.ingresos_cobrados - v.gastos_pagados_total) = v.utilidad_real
      THEN 1 ELSE 0
    END) AS utilidad_real_correcta
    
  FROM evt_eventos e
  JOIN vw_eventos_analisis_financiero v ON e.id = v.id
  WHERE e.activo = true
)
SELECT
  CONCAT('Total eventos analizados: ', total_eventos) AS resumen
FROM verificacion_completa
UNION ALL
SELECT CONCAT('✅ Ingresos cobrados correctos: ', ingresos_correctos, ' / ', total_eventos,
              ' (', ROUND(ingresos_correctos::NUMERIC / total_eventos * 100, 1), '%)')
FROM verificacion_completa
UNION ALL
SELECT CONCAT('✅ Gastos pagados correctos: ', gastos_correctos, ' / ', total_eventos,
              ' (', ROUND(gastos_correctos::NUMERIC / total_eventos * 100, 1), '%)')
FROM verificacion_completa
UNION ALL
SELECT CONCAT('✅ Provisiones correctas: ', provisiones_correctas, ' / ', total_eventos,
              ' (', ROUND(provisiones_correctas::NUMERIC / total_eventos * 100, 1), '%)')
FROM verificacion_completa
UNION ALL
SELECT CONCAT('✅ Utilidad estimada correcta: ', utilidad_estimada_correcta, ' / ', total_eventos,
              ' (', ROUND(utilidad_estimada_correcta::NUMERIC / total_eventos * 100, 1), '%)')
FROM verificacion_completa
UNION ALL
SELECT CONCAT('✅ Utilidad real correcta: ', utilidad_real_correcta, ' / ', total_eventos,
              ' (', ROUND(utilidad_real_correcta::NUMERIC / total_eventos * 100, 1), '%)')
FROM verificacion_completa;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DE VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════
