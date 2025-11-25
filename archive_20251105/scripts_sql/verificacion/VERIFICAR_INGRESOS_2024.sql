-- ====================================================================
-- VERIFICAR INGRESOS DEL AÑO 2024
-- ====================================================================
-- Ejecutar en Supabase SQL Editor
-- ====================================================================

-- 1. Verificar eventos del 2024
SELECT 
  COUNT(*) as total_eventos_2024,
  COUNT(DISTINCT cliente_id) as clientes_distintos
FROM evt_eventos
WHERE EXTRACT(YEAR FROM fecha_evento) = 2024
  AND activo = true;

-- 2. Verificar ingresos del 2024
SELECT 
  e.clave_evento,
  e.nombre_proyecto,
  e.fecha_evento,
  COUNT(i.id) as cantidad_ingresos,
  SUM(CASE WHEN i.cobrado = true THEN i.total ELSE 0 END) as total_cobrado,
  SUM(CASE WHEN i.cobrado = false THEN i.total ELSE 0 END) as total_pendiente,
  SUM(i.total) as total_ingresos
FROM evt_eventos e
LEFT JOIN evt_ingresos i ON i.evento_id = e.id AND i.deleted_at IS NULL
WHERE EXTRACT(YEAR FROM e.fecha_evento) = 2024
  AND e.activo = true
GROUP BY e.id, e.clave_evento, e.nombre_proyecto, e.fecha_evento
ORDER BY e.fecha_evento DESC
LIMIT 10;

-- 3. Verificar si la vista está retornando datos correctos
SELECT 
  clave_evento,
  nombre_proyecto,
  fecha_evento,
  ingreso_estimado,
  ingresos_cobrados,
  ingresos_pendientes,
  ingresos_totales,
  gastos_pagados_total,
  gastos_pendientes_total
FROM vw_eventos_analisis_financiero
WHERE EXTRACT(YEAR FROM fecha_evento) = 2024
LIMIT 10;

-- 4. Verificar categorías de gastos
SELECT 
  cat.nombre as categoria,
  COUNT(*) as cantidad_gastos,
  SUM(CASE WHEN g.pagado = true THEN g.total ELSE 0 END) as total_pagado,
  SUM(CASE WHEN g.pagado = false THEN g.total ELSE 0 END) as total_pendiente
FROM evt_gastos g
INNER JOIN evt_eventos e ON g.evento_id = e.id
LEFT JOIN evt_categorias_gastos cat ON g.categoria_id = cat.id
WHERE EXTRACT(YEAR FROM e.fecha_evento) = 2024
  AND g.deleted_at IS NULL
  AND e.activo = true
GROUP BY cat.nombre;

-- 5. Verificar que existen las categorías necesarias
SELECT * FROM evt_categorias_gastos ORDER BY nombre;
