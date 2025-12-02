-- ============================================================================
-- MIGRACIÓN 028: INTEGRACIÓN DOCUMENTOS → MOVIMIENTOS DE INVENTARIO
-- ============================================================================
-- Esta migración crea los triggers necesarios para que cuando un documento
-- de inventario se confirme, se generen automáticamente los movimientos
-- de stock correspondientes.
-- ============================================================================

-- 1. FUNCIÓN PARA GENERAR MOVIMIENTOS AL CONFIRMAR DOCUMENTO
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_generar_movimientos_documento()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle RECORD;
    v_tipo_movimiento VARCHAR(15);
    v_cantidad INTEGER;
BEGIN
    -- Solo actuar cuando el estado cambia a 'confirmado'
    IF NEW.estado = 'confirmado' AND (OLD.estado IS NULL OR OLD.estado != 'confirmado') THEN
        
        -- Determinar tipo de movimiento según tipo de documento
        IF NEW.tipo = 'entrada' THEN
            v_tipo_movimiento := 'entrada';
        ELSE
            v_tipo_movimiento := 'salida';
        END IF;
        
        -- Iterar sobre los detalles del documento
        FOR v_detalle IN 
            SELECT producto_id, cantidad, observaciones
            FROM detalles_documento_inventario_erp
            WHERE documento_id = NEW.id
        LOOP
            -- Crear movimiento de inventario
            INSERT INTO movimientos_inventario_erp (
                almacen_id,
                producto_id,
                tipo,
                cantidad,
                referencia,
                concepto,
                fecha_creacion
            ) VALUES (
                NEW.almacen_id,
                v_detalle.producto_id,
                v_tipo_movimiento,
                v_detalle.cantidad,
                NEW.numero_documento,
                COALESCE(v_detalle.observaciones, 'Generado desde documento ' || NEW.numero_documento),
                NOW()
            );
        END LOOP;
        
        RAISE NOTICE 'Movimientos generados para documento %', NEW.numero_documento;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_generar_movimientos_documento() IS 
'Genera movimientos de inventario automáticamente al confirmar un documento';

-- 2. TRIGGER EN documentos_inventario_erp
-- ============================================================================
DROP TRIGGER IF EXISTS trg_documento_genera_movimientos ON documentos_inventario_erp;

CREATE TRIGGER trg_documento_genera_movimientos
    AFTER UPDATE ON documentos_inventario_erp
    FOR EACH ROW
    WHEN (NEW.estado = 'confirmado' AND OLD.estado != 'confirmado')
    EXECUTE FUNCTION fn_generar_movimientos_documento();

COMMENT ON TRIGGER trg_documento_genera_movimientos ON documentos_inventario_erp IS
'Genera movimientos de inventario al confirmar documento';

-- 3. TABLA DE TRANSFERENCIAS DE INVENTARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS transferencias_inventario_erp (
    id SERIAL PRIMARY KEY,
    
    -- Referencia
    numero_transferencia VARCHAR(20) NOT NULL,
    
    -- Almacenes
    almacen_origen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    almacen_destino_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    
    -- Fechas
    fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_envio DATE,
    fecha_recepcion DATE,
    
    -- Estado
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'en_transito', 'recibida', 'cancelada')),
    
    -- Responsables
    solicitado_por VARCHAR(100),
    enviado_por VARCHAR(100),
    recibido_por VARCHAR(100),
    
    -- Observaciones
    observaciones TEXT,
    
    -- Multi-tenant
    company_id UUID NOT NULL REFERENCES companies_erp(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Evitar transferir al mismo almacén
    CONSTRAINT check_almacenes_diferentes CHECK (almacen_origen_id != almacen_destino_id)
);

COMMENT ON TABLE transferencias_inventario_erp IS 'Transferencias de inventario entre almacenes';

-- 4. TABLA DE DETALLES DE TRANSFERENCIA
-- ============================================================================
CREATE TABLE IF NOT EXISTS detalles_transferencia_erp (
    id SERIAL PRIMARY KEY,
    transferencia_id INTEGER NOT NULL REFERENCES transferencias_inventario_erp(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    cantidad_solicitada INTEGER NOT NULL,
    cantidad_enviada INTEGER,
    cantidad_recibida INTEGER,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE detalles_transferencia_erp IS 'Productos incluidos en cada transferencia';

-- Índices
CREATE INDEX IF NOT EXISTS idx_transferencias_origen ON transferencias_inventario_erp(almacen_origen_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_destino ON transferencias_inventario_erp(almacen_destino_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_estado ON transferencias_inventario_erp(estado);
CREATE INDEX IF NOT EXISTS idx_transferencias_company ON transferencias_inventario_erp(company_id);
CREATE INDEX IF NOT EXISTS idx_detalles_trans_producto ON detalles_transferencia_erp(producto_id);

-- 5. FUNCIÓN PARA GENERAR NÚMERO DE TRANSFERENCIA
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_generar_numero_transferencia()
RETURNS TRIGGER AS $$
DECLARE
    v_anio TEXT;
    v_consecutivo INTEGER;
    v_numero TEXT;
BEGIN
    v_anio := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Obtener siguiente consecutivo
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(numero_transferencia FROM 'TRF-\d{4}-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_consecutivo
    FROM transferencias_inventario_erp
    WHERE numero_transferencia LIKE 'TRF-' || v_anio || '-%'
      AND company_id = NEW.company_id;
    
    NEW.numero_transferencia := 'TRF-' || v_anio || '-' || LPAD(v_consecutivo::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_numero_transferencia ON transferencias_inventario_erp;
CREATE TRIGGER trg_numero_transferencia
    BEFORE INSERT ON transferencias_inventario_erp
    FOR EACH ROW
    WHEN (NEW.numero_transferencia IS NULL OR NEW.numero_transferencia = '')
    EXECUTE FUNCTION fn_generar_numero_transferencia();

-- 6. FUNCIÓN PARA GENERAR MOVIMIENTOS AL COMPLETAR TRANSFERENCIA
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_procesar_transferencia()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle RECORD;
BEGIN
    -- Cuando se envía: generar salida del origen
    IF NEW.estado = 'en_transito' AND OLD.estado = 'pendiente' THEN
        FOR v_detalle IN 
            SELECT producto_id, cantidad_enviada
            FROM detalles_transferencia_erp
            WHERE transferencia_id = NEW.id AND cantidad_enviada > 0
        LOOP
            INSERT INTO movimientos_inventario_erp (
                almacen_id, producto_id, tipo, cantidad, referencia, concepto
            ) VALUES (
                NEW.almacen_origen_id,
                v_detalle.producto_id,
                'salida',
                v_detalle.cantidad_enviada,
                NEW.numero_transferencia,
                'Transferencia salida a ' || (SELECT nombre FROM almacenes_erp WHERE id = NEW.almacen_destino_id)
            );
        END LOOP;
    END IF;
    
    -- Cuando se recibe: generar entrada en destino
    IF NEW.estado = 'recibida' AND OLD.estado = 'en_transito' THEN
        FOR v_detalle IN 
            SELECT producto_id, cantidad_recibida
            FROM detalles_transferencia_erp
            WHERE transferencia_id = NEW.id AND cantidad_recibida > 0
        LOOP
            INSERT INTO movimientos_inventario_erp (
                almacen_id, producto_id, tipo, cantidad, referencia, concepto
            ) VALUES (
                NEW.almacen_destino_id,
                v_detalle.producto_id,
                'entrada',
                v_detalle.cantidad_recibida,
                NEW.numero_transferencia,
                'Transferencia entrada desde ' || (SELECT nombre FROM almacenes_erp WHERE id = NEW.almacen_origen_id)
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_procesar_transferencia ON transferencias_inventario_erp;
CREATE TRIGGER trg_procesar_transferencia
    AFTER UPDATE ON transferencias_inventario_erp
    FOR EACH ROW
    EXECUTE FUNCTION fn_procesar_transferencia();

-- 7. VISTA DE KARDEX (MOVIMIENTOS CON SALDO ACUMULADO)
-- ============================================================================
CREATE OR REPLACE VIEW vw_kardex_inventario AS
WITH movimientos_ordenados AS (
    SELECT 
        m.id,
        m.producto_id,
        p.nombre AS producto_nombre,
        p.clave AS producto_clave,
        m.almacen_id,
        a.nombre AS almacen_nombre,
        m.tipo,
        m.cantidad,
        m.costo_unitario,
        m.referencia,
        m.concepto,
        m.fecha_creacion,
        p.company_id,
        ROW_NUMBER() OVER (PARTITION BY m.producto_id, m.almacen_id ORDER BY m.fecha_creacion, m.id) AS rn
    FROM movimientos_inventario_erp m
    JOIN productos_erp p ON m.producto_id = p.id
    JOIN almacenes_erp a ON m.almacen_id = a.id
)
SELECT 
    mo.*,
    SUM(
        CASE 
            WHEN mo.tipo IN ('entrada', 'ajuste') THEN mo.cantidad 
            WHEN mo.tipo = 'salida' THEN -mo.cantidad 
            ELSE 0 
        END
    ) OVER (PARTITION BY mo.producto_id, mo.almacen_id ORDER BY mo.fecha_creacion, mo.id) AS saldo_acumulado
FROM movimientos_ordenados mo
ORDER BY mo.producto_id, mo.almacen_id, mo.fecha_creacion, mo.id;

COMMENT ON VIEW vw_kardex_inventario IS 'Vista de kardex con saldo acumulado por producto y almacén';

-- 8. VISTA DE STOCK ACTUAL POR PRODUCTO Y ALMACÉN
-- ============================================================================
CREATE OR REPLACE VIEW vw_stock_actual AS
SELECT 
    p.id AS producto_id,
    p.nombre AS producto_nombre,
    p.clave AS producto_clave,
    p.unidad,
    a.id AS almacen_id,
    a.nombre AS almacen_nombre,
    a.tipo AS almacen_tipo,
    COALESCE(SUM(
        CASE 
            WHEN m.tipo IN ('entrada', 'ajuste') THEN m.cantidad 
            WHEN m.tipo = 'salida' THEN -m.cantidad 
            ELSE 0 
        END
    ), 0) AS stock_actual,
    p.company_id
FROM productos_erp p
CROSS JOIN almacenes_erp a
LEFT JOIN movimientos_inventario_erp m 
    ON m.producto_id = p.id AND m.almacen_id = a.id
WHERE p.company_id = a.company_id
GROUP BY p.id, p.nombre, p.clave, p.unidad, a.id, a.nombre, a.tipo, p.company_id
HAVING COALESCE(SUM(
    CASE 
        WHEN m.tipo IN ('entrada', 'ajuste') THEN m.cantidad 
        WHEN m.tipo = 'salida' THEN -m.cantidad 
        ELSE 0 
    END
), 0) != 0
ORDER BY p.nombre, a.nombre;

COMMENT ON VIEW vw_stock_actual IS 'Stock actual por producto y almacén';

-- 9. RLS POLICIES
-- ============================================================================
ALTER TABLE transferencias_inventario_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_transferencia_erp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transferencias_company_isolation" ON transferencias_inventario_erp;
CREATE POLICY "transferencias_company_isolation" ON transferencias_inventario_erp
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "detalles_trans_access" ON detalles_transferencia_erp;
CREATE POLICY "detalles_trans_access" ON detalles_transferencia_erp
    FOR ALL USING (
        transferencia_id IN (
            SELECT id FROM transferencias_inventario_erp 
            WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- ============================================================================
-- FIN DE MIGRACIÓN 028
-- ============================================================================
