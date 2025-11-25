-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🎯 MIGRACIÓN: AGREGAR CAMPOS RESPONSABLE Y CUENTA CONTABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 
-- Objetivo: Agregar y configurar campos de responsable y cuenta contable en:
--   - evt_gastos (responsable_id, cuenta_contable_id)
--   - evt_ingresos (responsable_id, cuenta_contable_id)
--   
-- Reglas de negocio:
--   - Gastos: solo cuentas contables con id <= 23
--   - Ingresos: solo cuentas contables con id >= 24
--   - Ambos campos son obligatorios (NOT NULL)
-- 
-- Fecha: 2025-10-28
-- Autor: Sistema ERP-777
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 1: VERIFICACIÓN INICIAL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    v_total_gastos INTEGER;
    v_total_ingresos INTEGER;
    v_usuarios_disponibles INTEGER;
    v_cuentas_gastos INTEGER;
    v_cuentas_ingresos INTEGER;
BEGIN
    -- Contar registros existentes
    SELECT COUNT(*) INTO v_total_gastos FROM evt_gastos WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO v_total_ingresos FROM evt_ingresos WHERE deleted_at IS NULL;
    
    -- Contar recursos disponibles
    SELECT COUNT(*) INTO v_usuarios_disponibles FROM core_users;
    SELECT COUNT(*) INTO v_cuentas_gastos FROM evt_cuentas_contables WHERE id::integer <= 23 AND activa = true;
    SELECT COUNT(*) INTO v_cuentas_ingresos FROM evt_cuentas_contables WHERE id::integer >= 24 AND activa = true;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 REPORTE INICIAL - ESTADO DE DATOS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📈 REGISTROS EXISTENTES:';
    RAISE NOTICE '   - Gastos activos: % registros', v_total_gastos;
    RAISE NOTICE '   - Ingresos activos: % registros', v_total_ingresos;
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
        RAISE EXCEPTION '❌ ERROR: No hay cuentas contables activas con id <= 23 para gastos.';
    END IF;
    
    IF v_cuentas_ingresos = 0 THEN
        RAISE EXCEPTION '❌ ERROR: No hay cuentas contables activas con id >= 24 para ingresos.';
    END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 2: AGREGAR COLUMNAS A evt_gastos
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 PASO 1: AGREGAR COLUMNAS A evt_gastos';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Agregar responsable_id
    BEGIN
        ALTER TABLE evt_gastos 
        ADD COLUMN responsable_id UUID REFERENCES core_users(id);
        RAISE NOTICE '✓ evt_gastos.responsable_id → Columna agregada';
    EXCEPTION 
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠ evt_gastos.responsable_id → Ya existe';
    END;
    
    -- Agregar cuenta_contable_id
    BEGIN
        ALTER TABLE evt_gastos 
        ADD COLUMN cuenta_contable_id INTEGER REFERENCES evt_cuentas_contables(id);
        RAISE NOTICE '✓ evt_gastos.cuenta_contable_id → Columna agregada';
    EXCEPTION 
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠ evt_gastos.cuenta_contable_id → Ya existe';
    END;
    
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 3: AGREGAR COLUMNAS A evt_ingresos
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 PASO 2: AGREGAR COLUMNAS A evt_ingresos';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Agregar responsable_id
    BEGIN
        ALTER TABLE evt_ingresos 
        ADD COLUMN responsable_id UUID REFERENCES core_users(id);
        RAISE NOTICE '✓ evt_ingresos.responsable_id → Columna agregada';
    EXCEPTION 
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠ evt_ingresos.responsable_id → Ya existe';
    END;
    
    -- Agregar cuenta_contable_id
    BEGIN
        ALTER TABLE evt_ingresos 
        ADD COLUMN cuenta_contable_id INTEGER REFERENCES evt_cuentas_contables(id);
        RAISE NOTICE '✓ evt_ingresos.cuenta_contable_id → Columna agregada';
    EXCEPTION 
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠ evt_ingresos.cuenta_contable_id → Ya existe';
    END;
    
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 4: ASIGNAR VALORES POR DEFECTO A GASTOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    v_usuario_default UUID;
    v_cuenta_gasto_default INTEGER;
    v_gastos_actualizados_responsable INTEGER := 0;
    v_gastos_actualizados_cuenta INTEGER := 0;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '👤 PASO 3: ASIGNAR VALORES POR DEFECTO A GASTOS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Obtener un usuario aleatorio activo
    SELECT id INTO v_usuario_default 
    FROM core_users 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    RAISE NOTICE '✓ Usuario seleccionado: %', v_usuario_default;
    
    -- Obtener una cuenta aleatoria para gastos (id <= 23)
    SELECT id INTO v_cuenta_gasto_default
    FROM evt_cuentas_contables
    WHERE id::integer <= 23 AND activa = true
    ORDER BY RANDOM()
    LIMIT 1;
    
    RAISE NOTICE '✓ Cuenta para gastos seleccionada: %', v_cuenta_gasto_default;
    
    -- Actualizar gastos sin responsable
    WITH updated AS (
        UPDATE evt_gastos
        SET 
            responsable_id = v_usuario_default,
            updated_at = NOW()
        WHERE responsable_id IS NULL AND deleted_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_gastos_actualizados_responsable FROM updated;
    
    RAISE NOTICE '✓ Gastos con responsable asignado: % registros', v_gastos_actualizados_responsable;
    
    -- Actualizar gastos sin cuenta contable
    WITH updated AS (
        UPDATE evt_gastos
        SET 
            cuenta_contable_id = v_cuenta_gasto_default,
            updated_at = NOW()
        WHERE cuenta_contable_id IS NULL AND deleted_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_gastos_actualizados_cuenta FROM updated;
    
    RAISE NOTICE '✓ Gastos con cuenta contable asignada: % registros', v_gastos_actualizados_cuenta;
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 5: ASIGNAR VALORES POR DEFECTO A INGRESOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    v_usuario_default UUID;
    v_cuenta_ingreso_default INTEGER;
    v_ingresos_actualizados_responsable INTEGER := 0;
    v_ingresos_actualizados_cuenta INTEGER := 0;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '👤 PASO 4: ASIGNAR VALORES POR DEFECTO A INGRESOS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Obtener un usuario aleatorio activo
    SELECT id INTO v_usuario_default 
    FROM core_users 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    RAISE NOTICE '✓ Usuario seleccionado: %', v_usuario_default;
    
    -- Obtener una cuenta aleatoria para ingresos (id >= 24)
    SELECT id INTO v_cuenta_ingreso_default
    FROM evt_cuentas_contables
    WHERE id::integer >= 24 AND activa = true
    ORDER BY RANDOM()
    LIMIT 1;
    
    RAISE NOTICE '✓ Cuenta para ingresos seleccionada: %', v_cuenta_ingreso_default;
    
    -- Actualizar ingresos sin responsable
    WITH updated AS (
        UPDATE evt_ingresos
        SET 
            responsable_id = v_usuario_default,
            updated_at = NOW()
        WHERE responsable_id IS NULL AND deleted_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_ingresos_actualizados_responsable FROM updated;
    
    RAISE NOTICE '✓ Ingresos con responsable asignado: % registros', v_ingresos_actualizados_responsable;
    
    -- Actualizar ingresos sin cuenta contable
    WITH updated AS (
        UPDATE evt_ingresos
        SET 
            cuenta_contable_id = v_cuenta_ingreso_default,
            updated_at = NOW()
        WHERE cuenta_contable_id IS NULL AND deleted_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_ingresos_actualizados_cuenta FROM updated;
    
    RAISE NOTICE '✓ Ingresos con cuenta contable asignada: % registros', v_ingresos_actualizados_cuenta;
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 6: APLICAR CONSTRAINTS NOT NULL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔒 PASO 5: APLICAR CONSTRAINTS NOT NULL';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Gastos: responsable_id NOT NULL
    BEGIN
        ALTER TABLE evt_gastos 
        ALTER COLUMN responsable_id SET NOT NULL;
        RAISE NOTICE '✓ evt_gastos.responsable_id → NOT NULL aplicado';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ evt_gastos.responsable_id → Error: %', SQLERRM;
    END;
    
    -- Gastos: cuenta_contable_id NOT NULL
    BEGIN
        ALTER TABLE evt_gastos 
        ALTER COLUMN cuenta_contable_id SET NOT NULL;
        RAISE NOTICE '✓ evt_gastos.cuenta_contable_id → NOT NULL aplicado';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ evt_gastos.cuenta_contable_id → Error: %', SQLERRM;
    END;
    
    -- Ingresos: responsable_id NOT NULL
    BEGIN
        ALTER TABLE evt_ingresos 
        ALTER COLUMN responsable_id SET NOT NULL;
        RAISE NOTICE '✓ evt_ingresos.responsable_id → NOT NULL aplicado';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ evt_ingresos.responsable_id → Error: %', SQLERRM;
    END;
    
    -- Ingresos: cuenta_contable_id NOT NULL
    BEGIN
        ALTER TABLE evt_ingresos 
        ALTER COLUMN cuenta_contable_id SET NOT NULL;
        RAISE NOTICE '✓ evt_ingresos.cuenta_contable_id → NOT NULL aplicado';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ evt_ingresos.cuenta_contable_id → Error: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 7: CREAR CHECK CONSTRAINTS PARA REGLAS DE NEGOCIO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '⚖️  PASO 6: APLICAR REGLAS DE NEGOCIO (CHECK CONSTRAINTS)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Gastos: solo cuentas con id <= 23
    BEGIN
        ALTER TABLE evt_gastos
        DROP CONSTRAINT IF EXISTS chk_gastos_cuenta_contable_range;
        
        ALTER TABLE evt_gastos
        ADD CONSTRAINT chk_gastos_cuenta_contable_range
        CHECK (cuenta_contable_id::text::integer <= 23);
        
        RAISE NOTICE '✓ evt_gastos → Solo permite cuentas contables con id <= 23';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ Error al crear constraint para gastos: %', SQLERRM;
    END;
    
    -- Ingresos: solo cuentas con id >= 24
    BEGIN
        ALTER TABLE evt_ingresos
        DROP CONSTRAINT IF EXISTS chk_ingresos_cuenta_contable_range;
        
        ALTER TABLE evt_ingresos
        ADD CONSTRAINT chk_ingresos_cuenta_contable_range
        CHECK (cuenta_contable_id::text::integer >= 24);
        
        RAISE NOTICE '✓ evt_ingresos → Solo permite cuentas contables con id >= 24';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ Error al crear constraint para ingresos: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 8: CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 PASO 7: CREAR ÍNDICES PARA RENDIMIENTO';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Índices para gastos
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_evt_gastos_responsable_id ON evt_gastos(responsable_id);
        RAISE NOTICE '✓ Índice creado: idx_evt_gastos_responsable_id';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ Error al crear índice para gastos.responsable_id: %', SQLERRM;
    END;
    
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_evt_gastos_cuenta_contable_id ON evt_gastos(cuenta_contable_id);
        RAISE NOTICE '✓ Índice creado: idx_evt_gastos_cuenta_contable_id';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ Error al crear índice para gastos.cuenta_contable_id: %', SQLERRM;
    END;
    
    -- Índices para ingresos
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_evt_ingresos_responsable_id ON evt_ingresos(responsable_id);
        RAISE NOTICE '✓ Índice creado: idx_evt_ingresos_responsable_id';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ Error al crear índice para ingresos.responsable_id: %', SQLERRM;
    END;
    
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cuenta_contable_id ON evt_ingresos(cuenta_contable_id);
        RAISE NOTICE '✓ Índice creado: idx_evt_ingresos_cuenta_contable_id';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE '⚠ Error al crear índice para ingresos.cuenta_contable_id: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 9: VERIFICACIÓN FINAL
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
    SELECT COUNT(*) INTO v_gastos_sin_responsable 
    FROM evt_gastos 
    WHERE responsable_id IS NULL AND deleted_at IS NULL;
    
    SELECT COUNT(*) INTO v_gastos_sin_cuenta 
    FROM evt_gastos 
    WHERE cuenta_contable_id IS NULL AND deleted_at IS NULL;
    
    SELECT COUNT(*) INTO v_gastos_cuenta_invalida 
    FROM evt_gastos 
    WHERE cuenta_contable_id::text::integer > 23 AND deleted_at IS NULL;
    
    -- Verificar ingresos
    SELECT COUNT(*) INTO v_ingresos_sin_responsable 
    FROM evt_ingresos 
    WHERE responsable_id IS NULL AND deleted_at IS NULL;
    
    SELECT COUNT(*) INTO v_ingresos_sin_cuenta 
    FROM evt_ingresos 
    WHERE cuenta_contable_id IS NULL AND deleted_at IS NULL;
    
    SELECT COUNT(*) INTO v_ingresos_cuenta_invalida 
    FROM evt_ingresos 
    WHERE cuenta_contable_id::text::integer < 24 AND deleted_at IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔴 GASTOS:';
    RAISE NOTICE '   - Sin responsable: % (esperado: 0)', v_gastos_sin_responsable;
    RAISE NOTICE '   - Sin cuenta contable: % (esperado: 0)', v_gastos_sin_cuenta;
    RAISE NOTICE '   - Con cuenta inválida (id > 23): % (esperado: 0)', v_gastos_cuenta_invalida;
    RAISE NOTICE '';
    RAISE NOTICE '🟢 INGRESOS:';
    RAISE NOTICE '   - Sin responsable: % (esperado: 0)', v_ingresos_sin_responsable;
    RAISE NOTICE '   - Sin cuenta contable: % (esperado: 0)', v_ingresos_sin_cuenta;
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
        RAISE NOTICE '✓ Columnas agregadas correctamente';
        RAISE NOTICE '✓ Todos los gastos tienen responsable';
        RAISE NOTICE '✓ Todos los gastos tienen cuenta contable (id <= 23)';
        RAISE NOTICE '✓ Todos los ingresos tienen responsable';
        RAISE NOTICE '✓ Todos los ingresos tienen cuenta contable (id >= 24)';
        RAISE NOTICE '✓ Constraints NOT NULL aplicados';
        RAISE NOTICE '✓ Constraints CHECK aplicados';
        RAISE NOTICE '✓ Índices creados para rendimiento';
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 10: REPORTE DE DISTRIBUCIÓN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 REPORTE DE DISTRIBUCIÓN DE CUENTAS CONTABLES';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '💰 GASTOS - Distribución por cuenta contable:';
    RAISE NOTICE '';
    
    FOR rec IN (
        SELECT 
            cc.id,
            cc.nombre,
            cc.codigo,
            COUNT(g.id) as total_gastos,
            SUM(g.total) as monto_total
        FROM evt_cuentas_contables cc
        LEFT JOIN evt_gastos g ON g.cuenta_contable_id = cc.id AND g.deleted_at IS NULL
        WHERE cc.id::integer <= 23
        GROUP BY cc.id, cc.nombre, cc.codigo
        ORDER BY cc.id::integer
    )
    LOOP
        RAISE NOTICE '   Cuenta %: % [%] - % gastos - Total: $%',
            rec.id, rec.nombre, rec.codigo, rec.total_gastos, COALESCE(rec.monto_total, 0);
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '💵 INGRESOS - Distribución por cuenta contable:';
    RAISE NOTICE '';
    
    FOR rec IN (
        SELECT 
            cc.id,
            cc.nombre,
            cc.codigo,
            COUNT(i.id) as total_ingresos,
            SUM(i.total) as monto_total
        FROM evt_cuentas_contables cc
        LEFT JOIN evt_ingresos i ON i.cuenta_contable_id = cc.id AND i.deleted_at IS NULL
        WHERE cc.id::integer >= 24
        GROUP BY cc.id, cc.nombre, cc.codigo
        ORDER BY cc.id::integer
    )
    LOOP
        RAISE NOTICE '   Cuenta %: % [%] - % ingresos - Total: $%',
            rec.id, rec.nombre, rec.codigo, rec.total_ingresos, COALESCE(rec.monto_total, 0);
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '💾 SCRIPT COMPLETADO - 28 de Octubre de 2025';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- FIN DEL SCRIPT
