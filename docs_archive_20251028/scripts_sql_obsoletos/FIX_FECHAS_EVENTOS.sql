-- ═══════════════════════════════════════════════════════════════════════════
-- CORRECCIÓN RÁPIDA: Fechas de eventos + Función Dashboard
-- ═══════════════════════════════════════════════════════════════════════════
-- Propósito: Corregir eventos con fecha_fin < fecha_evento
--            Recrear función get_dashboard_summary si es necesario
-- ═══════════════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Corregir fechas de eventos inválidas
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Ver cuántos eventos tienen el problema
DO $$
DECLARE
    eventos_invalidos INTEGER;
BEGIN
    SELECT COUNT(*) INTO eventos_invalidos
    FROM evt_eventos 
    WHERE fecha_fin < fecha_evento OR fecha_fin IS NULL;
    
    RAISE NOTICE '📊 Eventos con fechas inválidas: %', eventos_invalidos;
END $$;

-- Corregir: Si fecha_fin es menor que fecha_evento o NULL, 
-- establecer fecha_fin = fecha_evento + 1 día
UPDATE evt_eventos
SET fecha_fin = fecha_evento + INTERVAL '1 day',
    updated_at = CURRENT_TIMESTAMP
WHERE fecha_fin < fecha_evento OR fecha_fin IS NULL;

-- Confirmar corrección
DO $$
DECLARE
    eventos_corregidos INTEGER;
BEGIN
    SELECT COUNT(*) INTO eventos_corregidos
    FROM evt_eventos 
    WHERE fecha_fin >= fecha_evento;
    
    RAISE NOTICE '✅ Eventos con fechas válidas ahora: %', eventos_corregidos;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Recrear función get_dashboard_summary (si hay conflicto)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Eliminar función existente primero
DROP FUNCTION IF EXISTS get_dashboard_summary() CASCADE;

-- Recrear función con definición correcta
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS TABLE (
    total_eventos INTEGER,
    eventos_activos INTEGER,
    total_ingresos NUMERIC,
    total_gastos NUMERIC,
    utilidad_total NUMERIC,
    margen_promedio NUMERIC,
    eventos_pendientes_pago INTEGER,
    monto_pendiente_cobro NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_eventos,
        COUNT(*) FILTER (WHERE e.activo = true)::INTEGER as eventos_activos,
        COALESCE(SUM(e.total), 0) as total_ingresos,
        COALESCE(SUM(e.total_gastos), 0) as total_gastos,
        COALESCE(SUM(e.utilidad), 0) as utilidad_total,
        CASE 
            WHEN COUNT(*) > 0 THEN AVG(e.margen_utilidad)
            ELSE 0 
        END as margen_promedio,
        COUNT(*) FILTER (WHERE e.status_pago != 'pagado')::INTEGER as eventos_pendientes_pago,
        COALESCE(SUM(e.total) FILTER (WHERE e.status_pago != 'pagado'), 0) as monto_pendiente_cobro
    FROM evt_eventos e
    WHERE e.activo = true;
END;
$$ LANGUAGE plpgsql STABLE;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Verificación final
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Verificar fechas
SELECT 
    '✅ Verificación de fechas' as paso,
    COUNT(*) as total_eventos,
    COUNT(*) FILTER (WHERE fecha_fin >= fecha_evento) as fechas_validas,
    COUNT(*) FILTER (WHERE fecha_fin < fecha_evento) as fechas_invalidas
FROM evt_eventos;

-- Verificar función
SELECT 
    '✅ Verificación de función' as paso,
    'get_dashboard_summary' as funcion,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_dashboard_summary'
    ) THEN 'Existe' ELSE 'No existe' END as estado;

-- Probar función
SELECT '✅ Test de función get_dashboard_summary()' as paso;
SELECT * FROM get_dashboard_summary();

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ CORRECCIÓN COMPLETADA';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✓ Fechas de eventos corregidas';
    RAISE NOTICE '✓ Función get_dashboard_summary() recreada';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Ejecuta ahora: node pruebas-modulos-completo.mjs';
    RAISE NOTICE '';
END $$;
