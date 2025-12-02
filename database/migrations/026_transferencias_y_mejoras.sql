-- =====================================================
-- MIGRACIÓN 026: Transferencias entre Almacenes y Mejoras
-- Autor: Sistema ERP-777
-- Fecha: Diciembre 2025
-- =====================================================

-- =====================================================
-- 1. TABLA DE TRANSFERENCIAS ENTRE ALMACENES
-- =====================================================

CREATE TABLE IF NOT EXISTS transferencias_almacen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(20) NOT NULL UNIQUE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    almacen_origen_id UUID NOT NULL REFERENCES almacenes(id),
    almacen_destino_id UUID NOT NULL REFERENCES almacenes(id),
    estado VARCHAR(30) NOT NULL DEFAULT 'borrador' CHECK (
        estado IN ('borrador', 'pendiente_aprobacion', 'aprobada', 'en_transito', 'recibida_parcial', 'recibida', 'cancelada')
    ),
    notas TEXT,
    usuario_solicita_id UUID REFERENCES usuarios(id),
    usuario_aprueba_id UUID REFERENCES usuarios(id),
    usuario_recibe_id UUID REFERENCES usuarios(id),
    fecha_aprobacion TIMESTAMPTZ,
    fecha_envio TIMESTAMPTZ,
    fecha_recepcion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_almacenes_diferentes CHECK (almacen_origen_id != almacen_destino_id)
);

-- Índices para transferencias
CREATE INDEX IF NOT EXISTS idx_transferencias_numero ON transferencias_almacen(numero);
CREATE INDEX IF NOT EXISTS idx_transferencias_estado ON transferencias_almacen(estado);
CREATE INDEX IF NOT EXISTS idx_transferencias_fecha ON transferencias_almacen(fecha);
CREATE INDEX IF NOT EXISTS idx_transferencias_origen ON transferencias_almacen(almacen_origen_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_destino ON transferencias_almacen(almacen_destino_id);

-- Detalle de transferencias
CREATE TABLE IF NOT EXISTS transferencias_almacen_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transferencia_id UUID NOT NULL REFERENCES transferencias_almacen(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad_solicitada DECIMAL(15,4) NOT NULL CHECK (cantidad_solicitada > 0),
    cantidad_enviada DECIMAL(15,4),
    cantidad_recibida DECIMAL(15,4),
    lote_id UUID REFERENCES lotes(id),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transferencias_det_trans ON transferencias_almacen_detalle(transferencia_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_det_prod ON transferencias_almacen_detalle(producto_id);

-- =====================================================
-- 2. MEJORAS A TABLA DE PRODUCTOS
-- =====================================================

-- Agregar campo punto_reorden si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'productos' AND column_name = 'punto_reorden') THEN
        ALTER TABLE productos ADD COLUMN punto_reorden DECIMAL(15,4);
    END IF;
END $$;

-- Agregar campo proveedor_preferido_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'productos' AND column_name = 'proveedor_preferido_id') THEN
        ALTER TABLE productos ADD COLUMN proveedor_preferido_id UUID REFERENCES proveedores(id);
    END IF;
END $$;

-- Agregar campo codigo_barras_fabrica si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'productos' AND column_name = 'codigo_barras_fabrica') THEN
        ALTER TABLE productos ADD COLUMN codigo_barras_fabrica VARCHAR(100);
    END IF;
END $$;

-- Índice para código de barras de fábrica
CREATE INDEX IF NOT EXISTS idx_productos_barras_fabrica ON productos(codigo_barras_fabrica) WHERE codigo_barras_fabrica IS NOT NULL;

-- =====================================================
-- 3. MEJORAS A TABLA DE REQUISICIONES
-- =====================================================

-- Agregar campo origen para identificar requisiciones automáticas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'requisiciones' AND column_name = 'origen') THEN
        ALTER TABLE requisiciones ADD COLUMN origen VARCHAR(20) DEFAULT 'manual' 
            CHECK (origen IN ('manual', 'automatico', 'evento'));
    END IF;
END $$;

-- Agregar proveedor sugerido a detalle de requisición
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'requisiciones_detalle' AND column_name = 'proveedor_sugerido_id') THEN
        ALTER TABLE requisiciones_detalle ADD COLUMN proveedor_sugerido_id UUID REFERENCES proveedores(id);
    END IF;
END $$;

-- =====================================================
-- 4. TABLA STOCK_ACTUAL (Materializada para performance)
-- =====================================================

-- Crear tabla de stock actual para evitar cálculos repetitivos
CREATE TABLE IF NOT EXISTS stock_actual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    almacen_id UUID NOT NULL REFERENCES almacenes(id) ON DELETE CASCADE,
    cantidad DECIMAL(15,4) NOT NULL DEFAULT 0,
    valor DECIMAL(15,2) NOT NULL DEFAULT 0,
    ultima_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(producto_id, almacen_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_actual_producto ON stock_actual(producto_id);
CREATE INDEX IF NOT EXISTS idx_stock_actual_almacen ON stock_actual(almacen_id);
CREATE INDEX IF NOT EXISTS idx_stock_actual_cantidad ON stock_actual(cantidad) WHERE cantidad <= 0;

-- =====================================================
-- 5. FUNCIÓN PARA ACTUALIZAR STOCK_ACTUAL
-- =====================================================

CREATE OR REPLACE FUNCTION fn_actualizar_stock_actual()
RETURNS TRIGGER AS $$
DECLARE
    v_stock DECIMAL(15,4);
    v_costo_promedio DECIMAL(15,2);
BEGIN
    -- Calcular stock desde movimientos
    SELECT COALESCE(SUM(
        CASE 
            WHEN tipo IN ('entrada', 'ajuste_positivo') THEN cantidad
            WHEN tipo IN ('salida', 'ajuste_negativo') THEN -cantidad
            ELSE 0
        END
    ), 0)
    INTO v_stock
    FROM movimientos_inventario
    WHERE producto_id = COALESCE(NEW.producto_id, OLD.producto_id)
      AND almacen_id = COALESCE(NEW.almacen_id, OLD.almacen_id);
    
    -- Obtener costo promedio del producto
    SELECT COALESCE(costo_promedio, 0) INTO v_costo_promedio
    FROM productos
    WHERE id = COALESCE(NEW.producto_id, OLD.producto_id);
    
    -- Insertar o actualizar stock_actual
    INSERT INTO stock_actual (producto_id, almacen_id, cantidad, valor, ultima_actualizacion)
    VALUES (
        COALESCE(NEW.producto_id, OLD.producto_id),
        COALESCE(NEW.almacen_id, OLD.almacen_id),
        v_stock,
        v_stock * v_costo_promedio,
        NOW()
    )
    ON CONFLICT (producto_id, almacen_id) 
    DO UPDATE SET 
        cantidad = EXCLUDED.cantidad,
        valor = EXCLUDED.valor,
        ultima_actualizacion = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar stock_actual automáticamente
DROP TRIGGER IF EXISTS trg_actualizar_stock_actual ON movimientos_inventario;
CREATE TRIGGER trg_actualizar_stock_actual
    AFTER INSERT OR UPDATE OR DELETE ON movimientos_inventario
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_stock_actual();

-- =====================================================
-- 6. POBLAR STOCK_ACTUAL CON DATOS EXISTENTES
-- =====================================================

INSERT INTO stock_actual (producto_id, almacen_id, cantidad, valor, ultima_actualizacion)
SELECT 
    m.producto_id,
    m.almacen_id,
    COALESCE(SUM(
        CASE 
            WHEN m.tipo IN ('entrada', 'ajuste_positivo') THEN m.cantidad
            WHEN m.tipo IN ('salida', 'ajuste_negativo') THEN -m.cantidad
            ELSE 0
        END
    ), 0) as cantidad,
    COALESCE(SUM(
        CASE 
            WHEN m.tipo IN ('entrada', 'ajuste_positivo') THEN m.cantidad
            WHEN m.tipo IN ('salida', 'ajuste_negativo') THEN -m.cantidad
            ELSE 0
        END
    ), 0) * COALESCE(p.costo_promedio, 0) as valor,
    NOW()
FROM movimientos_inventario m
JOIN productos p ON p.id = m.producto_id
GROUP BY m.producto_id, m.almacen_id, p.costo_promedio
ON CONFLICT (producto_id, almacen_id) DO UPDATE SET
    cantidad = EXCLUDED.cantidad,
    valor = EXCLUDED.valor,
    ultima_actualizacion = NOW();

-- =====================================================
-- 7. ALERTAS MEJORADAS
-- =====================================================

-- Agregar campo datos JSON para información adicional
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'alertas_inventario' AND column_name = 'datos') THEN
        ALTER TABLE alertas_inventario ADD COLUMN datos JSONB;
    END IF;
END $$;

-- =====================================================
-- 8. VISTA DE STOCK CON ALERTAS
-- =====================================================

CREATE OR REPLACE VIEW vw_stock_con_alertas AS
SELECT 
    sa.id,
    sa.producto_id,
    p.nombre as producto_nombre,
    p.sku,
    p.unidad_medida,
    sa.almacen_id,
    a.nombre as almacen_nombre,
    sa.cantidad as stock_actual,
    p.stock_minimo,
    p.stock_maximo,
    p.punto_reorden,
    sa.valor,
    sa.ultima_actualizacion,
    CASE 
        WHEN sa.cantidad <= 0 THEN 'sin_stock'
        WHEN sa.cantidad <= COALESCE(p.punto_reorden, p.stock_minimo * 0.5) THEN 'critico'
        WHEN sa.cantidad <= p.stock_minimo THEN 'bajo'
        WHEN sa.cantidad >= COALESCE(p.stock_maximo, p.stock_minimo * 3) THEN 'exceso'
        ELSE 'normal'
    END as estado_stock,
    CASE 
        WHEN sa.cantidad <= 0 THEN 1
        WHEN sa.cantidad <= COALESCE(p.punto_reorden, p.stock_minimo * 0.5) THEN 2
        WHEN sa.cantidad <= p.stock_minimo THEN 3
        ELSE 4
    END as prioridad
FROM stock_actual sa
JOIN productos p ON p.id = sa.producto_id
JOIN almacenes a ON a.id = sa.almacen_id
WHERE p.activo = true AND a.activo = true;

-- =====================================================
-- 9. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE transferencias_almacen IS 'Transferencias de inventario entre almacenes';
COMMENT ON TABLE transferencias_almacen_detalle IS 'Detalle de productos en cada transferencia';
COMMENT ON TABLE stock_actual IS 'Tabla materializada con stock actual por producto/almacén para mejor performance';
COMMENT ON VIEW vw_stock_con_alertas IS 'Vista de stock con estado de alertas calculado';
COMMENT ON FUNCTION fn_actualizar_stock_actual() IS 'Función que actualiza stock_actual cuando hay movimientos de inventario';

-- =====================================================
-- 10. POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS
ALTER TABLE transferencias_almacen ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencias_almacen_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_actual ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura (todos pueden ver)
CREATE POLICY IF NOT EXISTS "Transferencias viewable by authenticated" 
    ON transferencias_almacen FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY IF NOT EXISTS "Transferencias detalle viewable by authenticated" 
    ON transferencias_almacen_detalle FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY IF NOT EXISTS "Stock actual viewable by authenticated" 
    ON stock_actual FOR SELECT 
    TO authenticated 
    USING (true);

-- Políticas de escritura
CREATE POLICY IF NOT EXISTS "Transferencias editable by authenticated" 
    ON transferencias_almacen FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Transferencias detalle editable by authenticated" 
    ON transferencias_almacen_detalle FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Stock actual editable by authenticated" 
    ON stock_actual FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- FIN DE MIGRACIÓN 026
-- =====================================================

SELECT 'Migración 026 completada exitosamente' as resultado;
