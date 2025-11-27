-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 016: OPTIMIZAR ÍNDICES PARA GNI
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-11-27
-- Propósito: Agregar índices compuestos para mejorar rendimiento de consultas
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- ÍNDICES COMPUESTOS PARA cont_gastos_externos
-- Optimizan la consulta principal de la vista v_gastos_no_impactados
-- ─────────────────────────────────────────────────────────────────────────

-- Índice compuesto para filtro por company_id y ordenamiento por fecha
-- Este es el índice más importante para la consulta principal
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cont_gastos_ext_company_fecha
ON cont_gastos_externos(company_id, fecha_gasto DESC);

-- Índice para filtro de activos (la vista siempre filtra por activo = true)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cont_gastos_ext_activo
ON cont_gastos_externos(activo) WHERE activo = true;

-- Índice compuesto para la combinación más frecuente: company + activo + fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cont_gastos_ext_company_activo_fecha
ON cont_gastos_externos(company_id, activo, fecha_gasto DESC)
WHERE activo = true;

-- Índice compuesto para filtro por período (muy común en GNI)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cont_gastos_ext_company_periodo
ON cont_gastos_externos(company_id, periodo);

-- ─────────────────────────────────────────────────────────────────────────
-- ANALIZAR TABLAS para actualizar estadísticas
-- ─────────────────────────────────────────────────────────────────────────

ANALYZE cont_gastos_externos;
ANALYZE cat_claves_gasto;
ANALYZE cat_proveedores;
ANALYZE cat_formas_pago;
ANALYZE cat_ejecutivos;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTA: CREATE INDEX CONCURRENTLY no puede ejecutarse dentro de una transacción
-- Si hay error, ejecutar los CREATE INDEX por separado sin BEGIN/COMMIT
-- ═══════════════════════════════════════════════════════════════════════════
