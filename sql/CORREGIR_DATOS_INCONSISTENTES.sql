-- ============================================================================
-- SCRIPT: CORREGIR DATOS INCONSISTENTES
-- Fecha: 3 de Diciembre 2025
-- Descripción: Corrige inconsistencias encontradas en los datos
-- ============================================================================

-- ============================================================================
-- 1. CORREGIR INGRESOS SIN CLIENTE ASIGNADO
-- ============================================================================

-- Primero, identificar los ingresos huérfanos
DO $$
DECLARE
    ingresos_sin_cliente INTEGER;
    cliente_default_id UUID;
BEGIN
    -- Contar ingresos sin cliente
    SELECT COUNT(*) INTO ingresos_sin_cliente
    FROM evt_ingresos_erp 
    WHERE cliente_id IS NULL;
    
    RAISE NOTICE 'Ingresos sin cliente encontrados: %', ingresos_sin_cliente;
    
    -- Si hay ingresos sin cliente, asignarlos al cliente del evento correspondiente
    IF ingresos_sin_cliente > 0 THEN
        -- Actualizar ingresos con el cliente del evento
        UPDATE evt_ingresos_erp i
        SET cliente_id = e.cliente_id
        FROM evt_eventos_erp e
        WHERE i.evento_id = e.id
        AND i.cliente_id IS NULL
        AND e.cliente_id IS NOT NULL;
        
        RAISE NOTICE '✅ Ingresos actualizados con cliente del evento';
        
        -- Verificar si quedaron ingresos sin cliente (eventos sin cliente)
        SELECT COUNT(*) INTO ingresos_sin_cliente
        FROM evt_ingresos_erp 
        WHERE cliente_id IS NULL;
        
        IF ingresos_sin_cliente > 0 THEN
            RAISE NOTICE '⚠️ Aún quedan % ingresos sin cliente (eventos sin cliente asignado)', ingresos_sin_cliente;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 2. AGREGAR PRECIOS FALTANTES A PRODUCTOS
-- ============================================================================

-- Actualizar productos sin precio de venta con un precio base calculado
-- (costo * 1.3 como margen mínimo del 30%)
UPDATE productos_erp
SET precio_venta = COALESCE(costo, 0) * 1.3
WHERE (precio_venta IS NULL OR precio_venta = 0)
AND costo IS NOT NULL AND costo > 0;

-- Para productos sin costo ni precio, marcar con precio mínimo simbólico
UPDATE productos_erp
SET precio_venta = 1.00
WHERE (precio_venta IS NULL OR precio_venta = 0)
AND (costo IS NULL OR costo = 0);

-- Verificar resultados
DO $$
DECLARE
    productos_sin_precio INTEGER;
BEGIN
    SELECT COUNT(*) INTO productos_sin_precio
    FROM productos_erp
    WHERE precio_venta IS NULL OR precio_venta = 0;
    
    IF productos_sin_precio = 0 THEN
        RAISE NOTICE '✅ Todos los productos tienen precio de venta asignado';
    ELSE
        RAISE NOTICE '⚠️ Aún quedan % productos sin precio', productos_sin_precio;
    END IF;
END $$;

-- ============================================================================
-- 3. COMPLETAR TIPO DE ALMACÉN
-- ============================================================================

-- Asignar tipo 'general' a almacenes sin tipo definido
UPDATE almacenes_erp
SET tipo = 'materia_prima'
WHERE tipo IS NULL OR tipo = '';

-- Verificar
DO $$
DECLARE
    almacenes_sin_tipo INTEGER;
BEGIN
    SELECT COUNT(*) INTO almacenes_sin_tipo
    FROM almacenes_erp
    WHERE tipo IS NULL OR tipo = '';
    
    IF almacenes_sin_tipo = 0 THEN
        RAISE NOTICE '✅ Todos los almacenes tienen tipo asignado';
    ELSE
        RAISE NOTICE '⚠️ Almacenes sin tipo: %', almacenes_sin_tipo;
    END IF;
END $$;

-- ============================================================================
-- 4. VERIFICAR Y CORREGIR ESTADOS DE EVENTOS
-- ============================================================================

-- Eventos sin estado definido
UPDATE evt_eventos_erp
SET estado = 'Prospecto'
WHERE estado IS NULL OR estado = '' OR estado = 'SIN ESTADO';

-- Verificar
DO $$
DECLARE
    eventos_sin_estado INTEGER;
BEGIN
    SELECT COUNT(*) INTO eventos_sin_estado
    FROM evt_eventos_erp
    WHERE estado IS NULL OR estado = '' OR estado = 'SIN ESTADO';
    
    IF eventos_sin_estado = 0 THEN
        RAISE NOTICE '✅ Todos los eventos tienen estado asignado';
    ELSE
        RAISE NOTICE '⚠️ Eventos sin estado: %', eventos_sin_estado;
    END IF;
END $$;

-- ============================================================================
-- 5. OPCIONAL: AUMENTAR LÍMITE DE CAMPO RFC
-- ============================================================================

-- Descomentar si se desea aumentar el límite del campo RFC
-- ALTER TABLE evt_clientes_erp ALTER COLUMN rfc TYPE VARCHAR(20);

-- ============================================================================
-- 6. RESUMEN DE CORRECCIONES
-- ============================================================================

DO $$
DECLARE
    total_productos INTEGER;
    productos_con_precio INTEGER;
    total_ingresos INTEGER;
    ingresos_con_cliente INTEGER;
    total_eventos INTEGER;
    eventos_con_estado INTEGER;
BEGIN
    -- Estadísticas de productos
    SELECT COUNT(*), COUNT(CASE WHEN precio_venta > 0 THEN 1 END)
    INTO total_productos, productos_con_precio
    FROM productos_erp;
    
    -- Estadísticas de ingresos
    SELECT COUNT(*), COUNT(cliente_id)
    INTO total_ingresos, ingresos_con_cliente
    FROM evt_ingresos_erp;
    
    -- Estadísticas de eventos
    SELECT COUNT(*), COUNT(CASE WHEN estado IS NOT NULL AND estado != '' AND estado != 'SIN ESTADO' THEN 1 END)
    INTO total_eventos, eventos_con_estado
    FROM evt_eventos_erp;
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '              RESUMEN DE CORRECCIONES APLICADAS';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Productos con precio: %/%', productos_con_precio, total_productos;
    RAISE NOTICE 'Ingresos con cliente: %/%', ingresos_con_cliente, total_ingresos;
    RAISE NOTICE 'Eventos con estado: %/%', eventos_con_estado, total_eventos;
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
