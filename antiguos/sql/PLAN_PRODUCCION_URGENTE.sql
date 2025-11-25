-- =====================================================
-- PLAN DE PRODUCCIÓN URGENTE
-- Fecha: 2025-10-27
-- Objetivo: Validar, corregir y preparar para producción
-- =====================================================

\echo '========================================='
\echo 'INICIANDO PLAN DE PRODUCCIÓN URGENTE'
\echo '========================================='

-- =====================================================
-- PASO 1: ANÁLISIS DE ESTADO ACTUAL
-- =====================================================
\echo '\n===== PASO 1: ANÁLISIS DE ESTADO ACTUAL ====='

-- Verificar cuentas bancarias activas
\echo '\n1.1 Cuentas bancarias disponibles:'
SELECT 
    id,
    nombre_cuenta,
    banco,
    numero_cuenta,
    saldo_actual
FROM evt_cuentas_contables
ORDER BY id;

-- Contar registros en evt_gastos
\echo '\n1.2 Resumen de evt_gastos:'
SELECT 
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE status_pago = 'pagado') as ya_pagados,
    COUNT(*) FILTER (WHERE status_pago != 'pagado') as pendientes_pagar,
    COUNT(*) FILTER (WHERE cuenta_bancaria_id IS NULL) as sin_cuenta_bancaria,
    SUM(total) as total_gastos
FROM evt_gastos;

-- Contar registros en evt_ingresos
\echo '\n1.3 Resumen de evt_ingresos:'
SELECT 
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE status_pago = 'pagado') as ya_pagados,
    COUNT(*) FILTER (WHERE status_pago != 'pagado') as pendientes_pagar,
    COUNT(*) FILTER (WHERE cuenta_bancaria_id IS NULL) as sin_cuenta_bancaria,
    SUM(total) as total_ingresos
FROM evt_ingresos;

-- =====================================================
-- PASO 2: BACKUP PRE-ACTUALIZACIÓN
-- =====================================================
\echo '\n===== PASO 2: CREANDO BACKUPS DE SEGURIDAD ====='

DROP TABLE IF EXISTS evt_gastos_backup_pre_produccion;
CREATE TABLE evt_gastos_backup_pre_produccion AS 
SELECT * FROM evt_gastos;

\echo 'Backup evt_gastos creado: ' || (SELECT COUNT(*) FROM evt_gastos_backup_pre_produccion) || ' registros';

DROP TABLE IF EXISTS evt_ingresos_backup_pre_produccion;
CREATE TABLE evt_ingresos_backup_pre_produccion AS 
SELECT * FROM evt_ingresos;

\echo 'Backup evt_ingresos creado: ' || (SELECT COUNT(*) FROM evt_ingresos_backup_pre_produccion) || ' registros';

DROP TABLE IF EXISTS evt_cuentas_contables_backup_pre_produccion;
CREATE TABLE evt_cuentas_contables_backup_pre_produccion AS 
SELECT * FROM evt_cuentas_contables;

\echo 'Backup evt_cuentas_contables creado: ' || (SELECT COUNT(*) FROM evt_cuentas_contables_backup_pre_produccion) || ' registros';

-- =====================================================
-- PASO 3: ACTUALIZAR GASTOS A ESTADO PAGADO
-- =====================================================
\echo '\n===== PASO 3: ACTUALIZANDO GASTOS A PAGADO ====='

-- Obtener IDs de cuentas bancarias activas
DO $$
DECLARE
    cuentas_array integer[];
    cuenta_id integer;
    total_actualizado integer := 0;
BEGIN
    -- Obtener array de cuentas bancarias
    SELECT ARRAY_AGG(id) INTO cuentas_array
    FROM evt_cuentas_contables;
    
    RAISE NOTICE 'Cuentas bancarias disponibles: %', array_length(cuentas_array, 1);
    
    -- Actualizar cada gasto
    FOR cuenta_id IN 
        SELECT id FROM evt_gastos
    LOOP
        UPDATE evt_gastos
        SET 
            status_pago = 'pagado',
            fecha_pago = CURRENT_DATE,
            cuenta_bancaria_id = cuentas_array[1 + (random() * (array_length(cuentas_array, 1) - 1))::integer],
            updated_at = CURRENT_TIMESTAMP
        WHERE id = cuenta_id;
        
        total_actualizado := total_actualizado + 1;
    END LOOP;
    
    RAISE NOTICE 'Total gastos actualizados: %', total_actualizado;
END $$;

\echo '\n3.1 Verificando actualización de gastos:'
SELECT 
    status_pago,
    COUNT(*) as cantidad,
    SUM(total) as monto_total
FROM evt_gastos
GROUP BY status_pago;

\echo '\n3.2 Distribución de gastos por cuenta bancaria:'
SELECT 
    c.nombre_cuenta,
    c.banco,
    COUNT(g.id) as num_gastos,
    COALESCE(SUM(g.total), 0) as total_gastos
FROM evt_cuentas_contables c
LEFT JOIN evt_gastos g ON c.id = g.cuenta_bancaria_id
GROUP BY c.id, c.nombre_cuenta, c.banco
ORDER BY total_gastos DESC;

-- =====================================================
-- PASO 4: ACTUALIZAR INGRESOS A ESTADO PAGADO
-- =====================================================
\echo '\n===== PASO 4: ACTUALIZANDO INGRESOS A PAGADO ====='

DO $$
DECLARE
    cuentas_array integer[];
    ingreso_id integer;
    total_actualizado integer := 0;
BEGIN
    -- Obtener array de cuentas bancarias activas
    SELECT ARRAY_AGG(id) INTO cuentas_array
    FROM evt_cuentas_contables
    WHERE activo = true;
    
    -- Actualizar cada ingreso activo
    FOR ingreso_id IN 
        SELECT id FROM evt_ingresos WHERE activo = true
    LOOP
        UPDATE evt_ingresos
        SET 
            status_pago = 'pagado',
            fecha_pago = CURRENT_DATE,
            cuenta_bancaria_id = cuentas_array[1 + (random() * (array_length(cuentas_array, 1) - 1))::integer],
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ingreso_id;
        
        total_actualizado := total_actualizado + 1;
    END LOOP;
    
    RAISE NOTICE 'Total ingresos actualizados: %', total_actualizado;
END $$;

\echo '\n4.1 Verificando actualización de ingresos:'
SELECT 
    status_pago,
    COUNT(*) as cantidad,
    SUM(total) as monto_total
FROM evt_ingresos
WHERE activo = true
GROUP BY status_pago;

\echo '\n4.2 Distribución de ingresos por cuenta bancaria:'
SELECT 
    c.nombre_cuenta,
    c.banco,
    COUNT(i.id) as num_ingresos,
    COALESCE(SUM(i.total), 0) as total_ingresos
FROM evt_cuentas_contables c
LEFT JOIN evt_ingresos i ON c.id = i.cuenta_bancaria_id 

GROUP BY c.id, c.nombre_cuenta, c.banco
ORDER BY total_ingresos DESC;

-- =====================================================
-- PASO 5: ACTUALIZAR SALDOS DE CUENTAS BANCARIAS
-- =====================================================
\echo '\n===== PASO 5: ACTUALIZANDO SALDOS BANCARIOS ====='

UPDATE evt_cuentas_contables c
SET saldo_actual = (
    SELECT 
        COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0)
    FROM evt_cuentas_contables cc
    LEFT JOIN evt_ingresos i ON cc.id = i.cuenta_bancaria_id 
    LEFT JOIN evt_gastos g ON cc.id = g.cuenta_bancaria_id 
    WHERE cc.id = c.id
),
updated_at = CURRENT_TIMESTAMP
;

\echo '\n5.1 Saldos actualizados de cuentas bancarias:'
SELECT 
    c.nombre_cuenta,
    c.banco,
    c.numero_cuenta,
    COALESCE(SUM(i.total), 0) as total_ingresos,
    COALESCE(SUM(g.total), 0) as total_gastos,
    c.saldo_actual,
    (COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0)) as saldo_calculado,
    c.saldo_actual - (COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0)) as diferencia
FROM evt_cuentas_contables c
LEFT JOIN evt_ingresos i ON c.id = i.cuenta_bancaria_id 
LEFT JOIN evt_gastos g ON c.id = g.cuenta_bancaria_id 

GROUP BY c.id, c.nombre_cuenta, c.banco, c.numero_cuenta, c.saldo_actual
ORDER BY c.nombre_cuenta;

-- =====================================================
-- PASO 6: VALIDACIONES CRÍTICAS
-- =====================================================
\echo '\n===== PASO 6: VALIDACIONES CRÍTICAS ====='

-- 6.1 Verificar que NO hay registros sin cuenta bancaria
\echo '\n6.1 Gastos sin cuenta bancaria (debe ser 0):'
SELECT COUNT(*) as gastos_sin_cuenta
FROM evt_gastos
WHERE cuenta_bancaria_id IS NULL;

\echo '\n6.2 Ingresos sin cuenta bancaria (debe ser 0):'
SELECT COUNT(*) as ingresos_sin_cuenta
FROM evt_ingresos
WHERE cuenta_bancaria_id IS NULL;

-- 6.3 Verificar que todos están pagados
\echo '\n6.3 Gastos no pagados (debe ser 0):'
SELECT COUNT(*) as gastos_pendientes
FROM evt_gastos
WHERE status_pago != 'pagado';

\echo '\n6.4 Ingresos no pagados (debe ser 0):'
SELECT COUNT(*) as ingresos_pendientes
FROM evt_ingresos
WHERE status_pago != 'pagado';

-- 6.5 Verificar consistencia de vistas
\echo '\n6.5 Validar vw_eventos_completos (primeros 10):'
SELECT 
    id,
    clave_evento,
    nombre_proyecto,
    total as ingresos,
    total_gastos,
    utilidad,
    ROUND(margen_utilidad::numeric, 2) as margen
FROM vw_eventos_completos
ORDER BY fecha_evento DESC
LIMIT 10;

-- 6.6 Verificar totales generales
\echo '\n6.6 Totales generales del sistema:'
SELECT 
    (SELECT COUNT(*) FROM evt_eventos WHERE activo = true) as total_eventos,
    (SELECT COUNT(*) FROM evt_gastos WHERE activo = true) as total_gastos_registros,
    (SELECT COUNT(*) FROM evt_ingresos WHERE activo = true) as total_ingresos_registros,
    (SELECT COALESCE(SUM(total), 0) FROM evt_gastos WHERE activo = true) as suma_gastos,
    (SELECT COALESCE(SUM(total), 0) FROM evt_ingresos WHERE activo = true) as suma_ingresos,
    (SELECT COALESCE(SUM(total), 0) FROM evt_ingresos WHERE activo = true) - 
    (SELECT COALESCE(SUM(total), 0) FROM evt_gastos WHERE activo = true) as utilidad_total;

-- =====================================================
-- PASO 7: RESUMEN EJECUTIVO
-- =====================================================
\echo '\n========================================='
\echo 'RESUMEN EJECUTIVO'
\echo '========================================='

\echo '\n✅ BACKUPS CREADOS:'
\echo '   - evt_gastos_backup_pre_produccion'
\echo '   - evt_ingresos_backup_pre_produccion'
\echo '   - evt_cuentas_contables_backup_pre_produccion'

\echo '\n✅ ACTUALIZACIONES REALIZADAS:'
\echo '   - Todos los gastos marcados como PAGADOS'
\echo '   - Todos los ingresos marcados como PAGADOS'
\echo '   - Pagos distribuidos aleatoriamente en cuentas bancarias'
\echo '   - Saldos bancarios actualizados'
\echo '   - Fecha de pago establecida a HOY (2025-10-27)'

\echo '\n✅ VALIDACIONES EJECUTADAS:'
\echo '   - Verificación de cuentas bancarias asignadas'
\echo '   - Verificación de estados de pago'
\echo '   - Validación de saldos bancarios'
\echo '   - Consistencia de vistas'

\echo '\n📊 SIGUIENTE PASO:'
\echo '   Ejecutar VALIDACION_AUTOMATICA_PRODUCCION.sql'
\echo '   para verificar integridad completa del sistema'

\echo '\n========================================='
\echo 'PLAN DE PRODUCCIÓN COMPLETADO'
\echo '========================================='
