-- ============================================================================
-- MIGRACIÓN 015: Sistema de Documentos de Inventario con Firmas
-- ============================================================================
-- Crea tablas para documentos de entrada/salida con múltiples productos,
-- firmas digitales y vinculación a eventos.
-- ============================================================================

-- 1. TABLA PRINCIPAL DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS documentos_inventario_erp (
    id SERIAL PRIMARY KEY,

    -- Numeración automática formato: ENT-2024-0001 o SAL-2024-0001
    numero_documento VARCHAR(20) NOT NULL UNIQUE,

    -- Tipo de documento
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'salida')),

    -- Fecha del documento
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Almacén relacionado
    almacen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),

    -- Evento relacionado (opcional)
    evento_id INTEGER REFERENCES eventos_erp(id),

    -- Información de quién entrega
    nombre_entrega VARCHAR(100),
    firma_entrega TEXT, -- Base64 de la imagen de firma

    -- Información de quién recibe
    nombre_recibe VARCHAR(100),
    firma_recibe TEXT, -- Base64 de la imagen de firma

    -- Observaciones generales
    observaciones TEXT,

    -- Estado del documento
    estado VARCHAR(15) NOT NULL DEFAULT 'borrador'
        CHECK (estado IN ('borrador', 'confirmado', 'cancelado')),

    -- Multi-tenant
    company_id UUID NOT NULL REFERENCES companies_erp(id),

    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Índices para búsqueda rápida
    CONSTRAINT documentos_inventario_numero_unique UNIQUE (numero_documento, company_id)
);

-- 2. TABLA DE DETALLES (PRODUCTOS DEL DOCUMENTO)
CREATE TABLE IF NOT EXISTS detalles_documento_inventario_erp (
    id SERIAL PRIMARY KEY,

    -- Documento padre
    documento_id INTEGER NOT NULL REFERENCES documentos_inventario_erp(id) ON DELETE CASCADE,

    -- Producto
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),

    -- Cantidad
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),

    -- Observaciones por línea
    observaciones TEXT,

    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SECUENCIA PARA NUMERACIÓN DE DOCUMENTOS
CREATE SEQUENCE IF NOT EXISTS seq_doc_inventario_entrada START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_doc_inventario_salida START WITH 1;

-- 4. FUNCIÓN PARA GENERAR NÚMERO DE DOCUMENTO
CREATE OR REPLACE FUNCTION generar_numero_documento_inventario(
    p_tipo VARCHAR(10),
    p_company_id UUID
)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_prefijo VARCHAR(3);
    v_año VARCHAR(4);
    v_consecutivo INTEGER;
    v_numero VARCHAR(20);
BEGIN
    -- Determinar prefijo según tipo
    IF p_tipo = 'entrada' THEN
        v_prefijo := 'ENT';
        v_consecutivo := nextval('seq_doc_inventario_entrada');
    ELSE
        v_prefijo := 'SAL';
        v_consecutivo := nextval('seq_doc_inventario_salida');
    END IF;

    -- Obtener año actual
    v_año := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

    -- Generar número
    v_numero := v_prefijo || '-' || v_año || '-' || LPAD(v_consecutivo::VARCHAR, 4, '0');

    RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER PARA ASIGNAR NÚMERO AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION trigger_asignar_numero_documento_inventario()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_documento IS NULL OR NEW.numero_documento = '' THEN
        NEW.numero_documento := generar_numero_documento_inventario(NEW.tipo, NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asignar_numero_documento_inventario ON documentos_inventario_erp;
CREATE TRIGGER trg_asignar_numero_documento_inventario
    BEFORE INSERT ON documentos_inventario_erp
    FOR EACH ROW
    EXECUTE FUNCTION trigger_asignar_numero_documento_inventario();

-- 6. TRIGGER PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION trigger_update_documento_inventario_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_documento_inventario_timestamp ON documentos_inventario_erp;
CREATE TRIGGER trg_update_documento_inventario_timestamp
    BEFORE UPDATE ON documentos_inventario_erp
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_documento_inventario_timestamp();

-- 7. TRIGGER PARA CREAR MOVIMIENTOS AUTOMÁTICAMENTE AL CONFIRMAR
CREATE OR REPLACE FUNCTION trigger_crear_movimientos_documento_inventario()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle RECORD;
BEGIN
    -- Solo procesar cuando cambia a 'confirmado'
    IF NEW.estado = 'confirmado' AND OLD.estado != 'confirmado' THEN
        -- Crear movimientos por cada detalle
        FOR v_detalle IN
            SELECT producto_id, cantidad, observaciones
            FROM detalles_documento_inventario_erp
            WHERE documento_id = NEW.id
        LOOP
            INSERT INTO movimientos_inventario_erp (
                tipo,
                producto_id,
                almacen_id,
                cantidad,
                referencia
            ) VALUES (
                NEW.tipo,
                v_detalle.producto_id,
                NEW.almacen_id,
                v_detalle.cantidad,
                'DOC-' || NEW.numero_documento || COALESCE(' - ' || v_detalle.observaciones, '')
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crear_movimientos_documento_inventario ON documentos_inventario_erp;
CREATE TRIGGER trg_crear_movimientos_documento_inventario
    AFTER UPDATE ON documentos_inventario_erp
    FOR EACH ROW
    EXECUTE FUNCTION trigger_crear_movimientos_documento_inventario();

-- 8. ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_documentos_inventario_tipo ON documentos_inventario_erp(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_inventario_fecha ON documentos_inventario_erp(fecha);
CREATE INDEX IF NOT EXISTS idx_documentos_inventario_almacen ON documentos_inventario_erp(almacen_id);
CREATE INDEX IF NOT EXISTS idx_documentos_inventario_evento ON documentos_inventario_erp(evento_id);
CREATE INDEX IF NOT EXISTS idx_documentos_inventario_estado ON documentos_inventario_erp(estado);
CREATE INDEX IF NOT EXISTS idx_documentos_inventario_company ON documentos_inventario_erp(company_id);
CREATE INDEX IF NOT EXISTS idx_detalles_documento_inventario_doc ON detalles_documento_inventario_erp(documento_id);
CREATE INDEX IF NOT EXISTS idx_detalles_documento_inventario_producto ON detalles_documento_inventario_erp(producto_id);

-- 9. AGREGAR CAMPO QR A PRODUCTOS (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'productos_erp' AND column_name = 'codigo_qr'
    ) THEN
        ALTER TABLE productos_erp ADD COLUMN codigo_qr VARCHAR(50);
        -- Por defecto, código QR = código del producto o SKU
        UPDATE productos_erp SET codigo_qr = COALESCE(codigo, sku, 'PROD-' || id::VARCHAR) WHERE codigo_qr IS NULL;
    END IF;
END $$;

-- 10. RLS POLICIES
ALTER TABLE documentos_inventario_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_documento_inventario_erp ENABLE ROW LEVEL SECURITY;

-- Política para documentos
DROP POLICY IF EXISTS "documentos_inventario_company_isolation" ON documentos_inventario_erp;
CREATE POLICY "documentos_inventario_company_isolation" ON documentos_inventario_erp
    FOR ALL
    USING (company_id IN (
        SELECT company_id FROM users_erp WHERE user_id = auth.uid()
    ));

-- Política para detalles (a través del documento)
DROP POLICY IF EXISTS "detalles_documento_inventario_company_isolation" ON detalles_documento_inventario_erp;
CREATE POLICY "detalles_documento_inventario_company_isolation" ON detalles_documento_inventario_erp
    FOR ALL
    USING (documento_id IN (
        SELECT d.id FROM documentos_inventario_erp d
        WHERE d.company_id IN (
            SELECT company_id FROM users_erp WHERE user_id = auth.uid()
        )
    ));

-- 11. VISTA RESUMIDA DE DOCUMENTOS
CREATE OR REPLACE VIEW vista_documentos_inventario_erp AS
SELECT
    d.id,
    d.numero_documento,
    d.tipo,
    d.fecha,
    d.almacen_id,
    a.nombre AS almacen_nombre,
    d.evento_id,
    e.nombre AS evento_nombre,
    d.nombre_entrega,
    d.nombre_recibe,
    d.estado,
    d.observaciones,
    d.company_id,
    d.created_at,
    d.updated_at,
    COUNT(det.id) AS total_lineas,
    SUM(det.cantidad) AS total_productos
FROM documentos_inventario_erp d
LEFT JOIN almacenes_erp a ON d.almacen_id = a.id
LEFT JOIN eventos_erp e ON d.evento_id = e.id
LEFT JOIN detalles_documento_inventario_erp det ON d.id = det.documento_id
GROUP BY d.id, a.nombre, e.nombre;

COMMENT ON TABLE documentos_inventario_erp IS 'Documentos de entrada/salida de inventario con firmas digitales';
COMMENT ON TABLE detalles_documento_inventario_erp IS 'Líneas de detalle de documentos de inventario';
COMMENT ON VIEW vista_documentos_inventario_erp IS 'Vista consolidada de documentos con totales';
