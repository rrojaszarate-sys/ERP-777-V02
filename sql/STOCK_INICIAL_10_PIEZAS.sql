-- ============================================================================
-- SCRIPT: Crear Stock Inicial de 10 piezas para todos los productos
-- Fecha: 2025-12-01
-- Descripción: Consolida un inventario inicial con entrada documentada
-- ============================================================================

-- Primero verificamos los almacenes disponibles
SELECT id, nombre, codigo FROM almacenes_erp WHERE activo = true;

-- ============================================================================
-- 1. CREAR DOCUMENTO DE ENTRADA INICIAL
-- ============================================================================
DO $$
DECLARE
    v_almacen_id INTEGER;
    v_company_id UUID;
    v_documento_id INTEGER;
    v_folio TEXT;
    v_producto RECORD;
    v_linea INTEGER := 1;
    v_total_items INTEGER := 0;
    v_total_cantidad NUMERIC := 0;
BEGIN
    -- Obtener el primer almacén activo
    SELECT id INTO v_almacen_id 
    FROM almacenes_erp 
    WHERE activo = true 
    ORDER BY id 
    LIMIT 1;
    
    IF v_almacen_id IS NULL THEN
        -- Crear almacén principal si no existe
        INSERT INTO almacenes_erp (nombre, codigo, activo, company_id)
        SELECT 'Almacén Principal', 'ALM-001', true, company_id
        FROM productos_erp
        LIMIT 1
        RETURNING id INTO v_almacen_id;
    END IF;
    
    -- Obtener company_id
    SELECT company_id INTO v_company_id
    FROM productos_erp
    LIMIT 1;
    
    -- Generar folio único
    v_folio := 'ENT-INI-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI');
    
    -- Contar productos
    SELECT COUNT(*), SUM(10) INTO v_total_items, v_total_cantidad
    FROM productos_erp;
    
    -- Crear documento de entrada
    INSERT INTO documentos_inventario_erp (
        folio,
        tipo,
        estado,
        fecha,
        almacen_id,
        referencia,
        observaciones,
        total_items,
        total_cantidad,
        company_id,
        created_at
    ) VALUES (
        v_folio,
        'entrada',
        'confirmado',
        NOW(),
        v_almacen_id,
        'INVENTARIO INICIAL',
        'Stock inicial de 10 piezas por producto - Consolidación de inventario',
        v_total_items,
        v_total_cantidad,
        v_company_id,
        NOW()
    ) RETURNING id INTO v_documento_id;
    
    RAISE NOTICE 'Documento creado: ID=%, Folio=%', v_documento_id, v_folio;
    
    -- Insertar detalles para cada producto
    FOR v_producto IN 
        SELECT id, clave, nombre, costo
        FROM productos_erp
        ORDER BY clave
    LOOP
        INSERT INTO detalles_documento_inventario_erp (
            documento_id,
            producto_id,
            cantidad,
            costo_unitario,
            subtotal,
            notas
        ) VALUES (
            v_documento_id,
            v_producto.id,
            10,
            COALESCE(v_producto.costo, 0),
            COALESCE(v_producto.costo, 0) * 10,
            'Stock inicial'
        );
        
        v_linea := v_linea + 1;
    END LOOP;
    
    RAISE NOTICE 'Se agregaron % líneas de detalle', v_linea - 1;
    
    -- ========================================================================
    -- 2. ACTUALIZAR O CREAR REGISTROS DE STOCK
    -- ========================================================================
    
    -- Eliminar stock existente (si lo hay) para empezar limpio
    DELETE FROM stock_erp WHERE almacen_id = v_almacen_id;
    
    -- Insertar stock de 10 piezas para cada producto
    INSERT INTO stock_erp (producto_id, almacen_id, cantidad, cantidad_minima, cantidad_maxima, ubicacion, company_id)
    SELECT 
        p.id,
        v_almacen_id,
        10,  -- Stock inicial de 10 piezas
        5,   -- Mínimo sugerido
        100, -- Máximo sugerido
        'A-01',
        p.company_id
    FROM productos_erp p
    ON CONFLICT (producto_id, almacen_id) 
    DO UPDATE SET cantidad = 10;
    
    RAISE NOTICE 'Stock actualizado para todos los productos en almacén %', v_almacen_id;
    
END $$;

-- ============================================================================
-- 3. VERIFICAR RESULTADOS
-- ============================================================================

-- Ver el documento creado
SELECT 
    d.id,
    d.folio,
    d.tipo,
    d.estado,
    d.fecha,
    a.nombre as almacen,
    d.total_items,
    d.total_cantidad,
    d.observaciones
FROM documentos_inventario_erp d
LEFT JOIN almacenes_erp a ON d.almacen_id = a.id
WHERE d.folio LIKE 'ENT-INI-%'
ORDER BY d.created_at DESC
LIMIT 1;

-- Ver resumen de stock
SELECT 
    COUNT(*) as total_productos,
    SUM(cantidad) as total_piezas,
    AVG(cantidad) as promedio_por_producto
FROM stock_erp;

-- Ver primeros productos con stock
SELECT 
    p.clave,
    p.nombre,
    s.cantidad as stock,
    a.nombre as almacen
FROM stock_erp s
JOIN productos_erp p ON s.producto_id = p.id
JOIN almacenes_erp a ON s.almacen_id = a.id
ORDER BY p.clave
LIMIT 20;

-- ============================================================================
-- NOTAS:
-- - Este script crea un documento de ENTRADA con tipo 'entrada' y estado 'confirmado'
-- - Cada producto recibe 10 piezas de stock inicial
-- - El documento queda registrado para trazabilidad
-- - Si necesitas más stock, puedes crear otra entrada con cantidades diferentes
-- ============================================================================
