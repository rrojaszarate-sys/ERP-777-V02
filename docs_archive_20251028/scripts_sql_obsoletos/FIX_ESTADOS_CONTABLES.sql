-- ═══════════════════════════════════════════════════════════════════════════
-- CORRECCIÓN: Estados Contables para Módulo de Finanzas
-- ═══════════════════════════════════════════════════════════════════════════
-- Propósito: Agregar estados contables necesarios para submódulos de finanzas
-- ═══════════════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Agregar estados contables si no existen
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
    -- Cerrado (evento finalizado, listo para facturación)
    IF NOT EXISTS (SELECT 1 FROM evt_estados WHERE nombre = 'Cerrado') THEN
        INSERT INTO evt_estados (nombre, descripcion, color, orden, workflow_step)
        VALUES ('Cerrado', 'Evento finalizado, listo para facturación', '#6B7280', 90, 9);
        RAISE NOTICE '✅ Estado "Cerrado" creado';
    ELSE
        RAISE NOTICE '⚠️  Estado "Cerrado" ya existe';
    END IF;
    
    -- Pagos Pendiente (facturado pero no cobrado)
    IF NOT EXISTS (SELECT 1 FROM evt_estados WHERE nombre = 'Pagos Pendiente') THEN
        INSERT INTO evt_estados (nombre, descripcion, color, orden, workflow_step)
        VALUES ('Pagos Pendiente', 'Facturado, pendiente de cobro', '#F59E0B', 100, 10);
        RAISE NOTICE '✅ Estado "Pagos Pendiente" creado';
    ELSE
        RAISE NOTICE '⚠️  Estado "Pagos Pendiente" ya existe';
    END IF;
    
    -- Pagados (totalmente cobrado)
    IF NOT EXISTS (SELECT 1 FROM evt_estados WHERE nombre = 'Pagados') THEN
        INSERT INTO evt_estados (nombre, descripcion, color, orden, workflow_step)
        VALUES ('Pagados', 'Todos los pagos cobrados', '#10B981', 110, 11);
        RAISE NOTICE '✅ Estado "Pagados" creado';
    ELSE
        RAISE NOTICE '⚠️  Estado "Pagados" ya existe';
    END IF;
    
    -- Pagos Vencidos (con pagos vencidos)
    IF NOT EXISTS (SELECT 1 FROM evt_estados WHERE nombre = 'Pagos Vencidos') THEN
        INSERT INTO evt_estados (nombre, descripcion, color, orden, workflow_step)
        VALUES ('Pagos Vencidos', 'Con pagos vencidos sin cobrar', '#EF4444', 105, 10);
        RAISE NOTICE '✅ Estado "Pagos Vencidos" creado';
    ELSE
        RAISE NOTICE '⚠️  Estado "Pagos Vencidos" ya existe';
    END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Verificar estados creados
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
    '📊 Estados disponibles:' as info,
    COUNT(*) as total_estados
FROM evt_estados;

SELECT 
    id,
    nombre,
    descripcion,
    color
FROM evt_estados
WHERE nombre IN ('Cerrado', 'Pagos Pendiente', 'Pagados', 'Pagos Vencidos')
ORDER BY 
    CASE nombre
        WHEN 'Cerrado' THEN 1
        WHEN 'Pagos Pendiente' THEN 2
        WHEN 'Pagos Vencidos' THEN 3
        WHEN 'Pagados' THEN 4
    END;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Mensaje final
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ ESTADOS CONTABLES CONFIGURADOS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Los siguientes estados están disponibles para contabilidad:';
    RAISE NOTICE '  • Cerrado - Evento finalizado';
    RAISE NOTICE '  • Pagos Pendiente - Facturado, pendiente cobro';
    RAISE NOTICE '  • Pagos Vencidos - Con pagos vencidos';
    RAISE NOTICE '  • Pagados - Totalmente cobrado';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 NOTA IMPORTANTE:';
    RAISE NOTICE '   La columna correcta en evt_ingresos es "cobrado", NO "pagado"';
    RAISE NOTICE '   Actualizar servicios TypeScript para usar "cobrado"';
    RAISE NOTICE '';
END $$;
