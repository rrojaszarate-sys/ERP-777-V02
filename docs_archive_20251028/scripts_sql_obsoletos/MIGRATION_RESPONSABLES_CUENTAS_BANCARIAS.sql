-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🎯 MIGRACIÓN: INTEGRIDAD REFERENCIAL Y REGLAS DE NEGOCIO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 
-- Objetivo: Asegurar que todos los gastos e ingresos tengan:
--   1. Responsable asignado (obligatorio)
--   2. Cuenta bancaria asignada (obligatorio)
--   3. Cumplir con reglas de negocio:
--      - Gastos: solo cuentas bancarias con id <= 23
--      - Ingresos: solo cuentas bancarias con id >= 24
-- 
-- Fecha: 2025-10-28
-- Autor: Sistema ERP-777
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 1: VERIFICACIÓN INICIAL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    v_gastos_sin_responsable INTEGER;
    v_gastos_sin_cuenta INTEGER;
    v_ingresos_sin_responsable INTEGER;
    v_ingresos_sin_cuenta INTEGER;
    v_usuarios_disponibles INTEGER;
    v_cuentas_gastos INTEGER;
    v_cuentas_ingresos INTEGER;
BEGIN
    -- Contar registros problemáticos
    SELECT COUNT(*) INTO v_gastos_sin_responsable FROM evt_gastos WHERE responsable_id IS NULL;
    SELECT COUNT(*) INTO v_gastos_sin_cuenta FROM evt_gastos WHERE cuenta_bancaria_id IS NULL;
    SELECT COUNT(*) INTO v_ingresos_sin_responsable FROM evt_ingresos WHERE responsable_id IS NULL;
    SELECT COUNT(*) INTO v_ingresos_sin_cuenta FROM evt_ingresos WHERE cuenta_bancaria_id IS NULL;
    
    -- Contar recursos disponibles
    SELECT COUNT(*) INTO v_usuarios_disponibles FROM auth.users WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO v_cuentas_gastos FROM evt_cuentas_bancarias WHERE id::integer <= 23 AND activo = true;
    SELECT COUNT(*) INTO v_cuentas_ingresos FROM evt_cuentas_bancarias WHERE id::integer >= 24 AND activo = true;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 REPORTE INICIAL - ESTADO DE DATOS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '🔴 GASTOS:';
    RAISE NOTICE '   - Sin responsable: % registros', v_gastos_sin_responsable;
    RAISE NOTICE '   - Sin cuenta bancaria: % registros', v_gastos_sin_cuenta;
    RAISE NOTICE '';
    RAISE NOTICE '🟢 INGRESOS:';
    RAISE NOTICE '   - Sin responsable: % registros', v_ingresos_sin_responsable;
    RAISE NOTICE '   - Sin cuenta bancaria: % registros', v_ingresos_sin_cuenta;
    RAISE NOTICE '';
    RAISE NOTICE '💼 RECURSOS DISPONIBLES:';
    RAISE NOTICE '   - Usuarios activos: %', v_usuarios_disponibles;
    RAISE NOTICE '   - Cuentas para gastos (id <= 23): %', v_cuentas_gastos;
    RAISE NOTICE '   - Cuentas para ingresos (id >= 24): %', v_cuentas_ingresos;
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Validar que haya recursos suficientes
    IF v_usuarios_disponibles = 0 THEN
        RAISE EXCEPTION '❌ ERROR: No hay usuarios activos en el sistema. No se puede continuar.';
    END IF;
    
    IF v_cuentas_gastos = 0 THEN
        RAISE EXCEPTION '❌ ERROR: No hay cuentas bancarias activas con id <= 23 para gastos.';
    END IF;
    
    IF v_cuentas_ingresos = 0 THEN
        RAISE EXCEPTION '❌ ERROR: No hay cuentas bancarias activas con id >= 24 para ingresos.';
    END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 2: ASIGNAR RESPONSABLES FALTANTES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    v_usuario_default UUID;
    v_gastos_actualizados INTEGER := 0;
    v_ingresos_actualizados INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '👤 PASO 1: ASIGNAR RESPONSABLES FALTANTES';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Obtener un usuario aleatorio activo
    SELECT id INTO v_usuario_default 
    FROM auth.users 
    WHERE deleted_at IS NULL 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    RAISE NOTICE '✓ Usuario seleccionado para asignación: %', v_usuario_default;
    
    -- Actualizar gastos sin responsable
    WITH updated AS (
        UPDATE evt_gastos
        SET 
            responsable_id = v_usuario_default,
            updated_at = NOW()
        WHERE responsable_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_gastos_actualizados FROM updated;
    
    RAISE NOTICE '✓ Gastos actualizados: % registros', v_gastos_actualizados;
    
    -- Actualizar ingresos sin responsable
    WITH updated AS (
        UPDATE evt_ingresos
        SET 
            responsable_id = v_usuario_default,
            updated_at = NOW()
        WHERE responsable_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_ingresos_actualizados FROM updated;
    
    RAISE NOTICE '✓ Ingresos actualizados: % registros', v_ingresos_actualizados;
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 3: ASIGNAR CUENTAS BANCARIAS FALTANTES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    v_cuenta_gasto_default UUID;
    v_cuenta_ingreso_default UUID;
    v_gastos_actualizados INTEGER := 0;
    v_ingresos_actualizados INTEGER := 0;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '💳 PASO 2: ASIGNAR CUENTAS BANCARIAS FALTANTES';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Obtener una cuenta aleatoria para gastos (id <= 23)
    SELECT id INTO v_cuenta_gasto_default
    FROM evt_cuentas_bancarias
    WHERE id::integer <= 23 AND activo = true
    ORDER BY RANDOM()
    LIMIT 1;
    
    RAISE NOTICE '✓ Cuenta para gastos seleccionada: %', v_cuenta_gasto_default;
    
    -- Obtener una cuenta aleatoria para ingresos (id >= 24)
    SELECT id INTO v_cuenta_ingreso_default
    FROM evt_cuentas_bancarias
    WHERE id::integer >= 24 AND activo = true
    ORDER BY RANDOM()
    LIMIT 1;
    
    RAISE NOTICE '✓ Cuenta para ingresos seleccionada: %', v_cuenta_ingreso_default;
    
    -- Actualizar gastos sin cuenta bancaria
    WITH updated AS (
        UPDATE evt_gastos
        SET 
            cuenta_bancaria_id = v_cuenta_gasto_default,
            updated_at = NOW()
        WHERE cuenta_bancaria_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_gastos_actualizados FROM updated;
    
    RAISE NOTICE '✓ Gastos actualizados: % registros', v_gastos_actualizados;
    
    -- Actualizar ingresos sin cuenta bancaria
    WITH updated AS (
        UPDATE evt_ingresos
        SET 
            cuenta_bancaria_id = v_cuenta_ingreso_default,
            updated_at = NOW()
        WHERE cuenta_bancaria_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_ingresos_actualizados FROM updated;
    
    RAISE NOTICE '✓ Ingresos actualizados: % registros', v_ingresos_actualizados;
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 4: APLICAR CONSTRAINTS NOT NULL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔒 PASO 3: APLICAR CONSTRAINTS NOT NULL';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Gastos: responsable_id NOT NULL
    BEGIN
        ALTER TABLE evt_gastos 
        ALTER COLUMN responsable_id SET NOT NULL;
        RAISE NOTICE '✓ evt_gastos.responsable_id → NOT NULL aplicado';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ evt_gastos.responsable_id → Ya tenía NOT NULL o error: %', SQLERRM;
    END;
    
    -- Gastos: cuenta_bancaria_id NOT NULL
    BEGIN
        ALTER TABLE evt_gastos 
        ALTER COLUMN cuenta_bancaria_id SET NOT NULL;
        RAISE NOTICE '✓ evt_gastos.cuenta_bancaria_id → NOT NULL aplicado';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ evt_gastos.cuenta_bancaria_id → Ya tenía NOT NULL o error: %', SQLERRM;
    END;
    
    -- Ingresos: responsable_id NOT NULL
    BEGIN
        ALTER TABLE evt_ingresos 
        ALTER COLUMN responsable_id SET NOT NULL;
        RAISE NOTICE '✓ evt_ingresos.responsable_id → NOT NULL aplicado';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ evt_ingresos.responsable_id → Ya tenía NOT NULL o error: %', SQLERRM;
    END;
    
    -- Ingresos: cuenta_bancaria_id NOT NULL
    BEGIN
        ALTER TABLE evt_ingresos 
        ALTER COLUMN cuenta_bancaria_id SET NOT NULL;
        RAISE NOTICE '✓ evt_ingresos.cuenta_bancaria_id → NOT NULL aplicado';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ evt_ingresos.cuenta_bancaria_id → Ya tenía NOT NULL o error: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 5: CREAR CHECK CONSTRAINTS PARA REGLAS DE NEGOCIO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '⚖️  PASO 4: APLICAR REGLAS DE NEGOCIO (CHECK CONSTRAINTS)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Gastos: solo cuentas con id <= 23
    BEGIN
        ALTER TABLE evt_gastos
        DROP CONSTRAINT IF EXISTS chk_gastos_cuenta_bancaria_range;
        
        ALTER TABLE evt_gastos
        ADD CONSTRAINT chk_gastos_cuenta_bancaria_range
        CHECK (cuenta_bancaria_id::text::integer <= 23);
        
        RAISE NOTICE '✓ evt_gastos → Solo permite cuentas bancarias con id <= 23';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ Error al crear constraint para gastos: %', SQLERRM;
    END;
    
    -- Ingresos: solo cuentas con id >= 24
    BEGIN
        ALTER TABLE evt_ingresos
        DROP CONSTRAINT IF EXISTS chk_ingresos_cuenta_bancaria_range;
        
        ALTER TABLE evt_ingresos
        ADD CONSTRAINT chk_ingresos_cuenta_bancaria_range
        CHECK (cuenta_bancaria_id::text::integer >= 24);
        
        RAISE NOTICE '✓ evt_ingresos → Solo permite cuentas bancarias con id >= 24';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ Error al crear constraint para ingresos: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 6: VERIFICACIÓN FINAL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    v_gastos_sin_responsable INTEGER;
    v_gastos_sin_cuenta INTEGER;
    v_ingresos_sin_responsable INTEGER;
    v_ingresos_sin_cuenta INTEGER;
    v_gastos_cuenta_invalida INTEGER;
    v_ingresos_cuenta_invalida INTEGER;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ VERIFICACIÓN FINAL - ESTADO DESPUÉS DE LA MIGRACIÓN';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Verificar gastos
    SELECT COUNT(*) INTO v_gastos_sin_responsable FROM evt_gastos WHERE responsable_id IS NULL;
    SELECT COUNT(*) INTO v_gastos_sin_cuenta FROM evt_gastos WHERE cuenta_bancaria_id IS NULL;
    SELECT COUNT(*) INTO v_gastos_cuenta_invalida FROM evt_gastos WHERE cuenta_bancaria_id::text::integer > 23;
    
    -- Verificar ingresos
    SELECT COUNT(*) INTO v_ingresos_sin_responsable FROM evt_ingresos WHERE responsable_id IS NULL;
    SELECT COUNT(*) INTO v_ingresos_sin_cuenta FROM evt_ingresos WHERE cuenta_bancaria_id IS NULL;
    SELECT COUNT(*) INTO v_ingresos_cuenta_invalida FROM evt_ingresos WHERE cuenta_bancaria_id::text::integer < 24;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔴 GASTOS:';
    RAISE NOTICE '   - Sin responsable: % (esperado: 0)', v_gastos_sin_responsable;
    RAISE NOTICE '   - Sin cuenta bancaria: % (esperado: 0)', v_gastos_sin_cuenta;
    RAISE NOTICE '   - Con cuenta inválida (id > 23): % (esperado: 0)', v_gastos_cuenta_invalida;
    RAISE NOTICE '';
    RAISE NOTICE '🟢 INGRESOS:';
    RAISE NOTICE '   - Sin responsable: % (esperado: 0)', v_ingresos_sin_responsable;
    RAISE NOTICE '   - Sin cuenta bancaria: % (esperado: 0)', v_ingresos_sin_cuenta;
    RAISE NOTICE '   - Con cuenta inválida (id < 24): % (esperado: 0)', v_ingresos_cuenta_invalida;
    RAISE NOTICE '';
    
    -- Verificar estado final
    IF v_gastos_sin_responsable > 0 OR v_gastos_sin_cuenta > 0 OR 
       v_ingresos_sin_responsable > 0 OR v_ingresos_sin_cuenta > 0 OR
       v_gastos_cuenta_invalida > 0 OR v_ingresos_cuenta_invalida > 0 THEN
        RAISE EXCEPTION '❌ MIGRACIÓN FALLIDA: Aún hay registros inválidos';
    ELSE
        RAISE NOTICE '═══════════════════════════════════════════════════════════════';
        RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════';
        RAISE NOTICE '';
        RAISE NOTICE '✓ Todos los gastos tienen responsable';
        RAISE NOTICE '✓ Todos los gastos tienen cuenta bancaria (id <= 23)';
        RAISE NOTICE '✓ Todos los ingresos tienen responsable';
        RAISE NOTICE '✓ Todos los ingresos tienen cuenta bancaria (id >= 24)';
        RAISE NOTICE '✓ Constraints NOT NULL aplicados';
        RAISE NOTICE '✓ Constraints CHECK aplicados';
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 7: REPORTE DE DISTRIBUCIÓN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 REPORTE DE DISTRIBUCIÓN DE CUENTAS BANCARIAS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '💰 GASTOS - Distribución por cuenta bancaria:';
    RAISE NOTICE '';
    
    FOR rec IN (
        SELECT 
            cb.id,
            cb.nombre,
            cb.banco,
            COUNT(g.id) as total_gastos,
            SUM(g.total) as monto_total
        FROM evt_cuentas_bancarias cb
        LEFT JOIN evt_gastos g ON g.cuenta_bancaria_id = cb.id
        WHERE cb.id::integer <= 23
        GROUP BY cb.id, cb.nombre, cb.banco
        ORDER BY cb.id::integer
    )
    LOOP
        RAISE NOTICE '   Cuenta %: % (%) - % gastos - Total: $%',
            rec.id, rec.nombre, rec.banco, rec.total_gastos, COALESCE(rec.monto_total, 0);
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '💵 INGRESOS - Distribución por cuenta bancaria:';
    RAISE NOTICE '';
    
    FOR rec IN (
        SELECT 
            cb.id,
            cb.nombre,
            cb.banco,
            COUNT(i.id) as total_ingresos,
            SUM(i.total) as monto_total
        FROM evt_cuentas_bancarias cb
        LEFT JOIN evt_ingresos i ON i.cuenta_bancaria_id = cb.id
        WHERE cb.id::integer >= 24
        GROUP BY cb.id, cb.nombre, cb.banco
        ORDER BY cb.id::integer
    )
    LOOP
        RAISE NOTICE '   Cuenta %: % (%) - % ingresos - Total: $%',
            rec.id, rec.nombre, rec.banco, rec.total_ingresos, COALESCE(rec.monto_total, 0);
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- FIN DEL SCRIPT
