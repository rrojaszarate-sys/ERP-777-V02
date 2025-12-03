-- ============================================================================
-- SCRIPT: CREAR TABLAS DE INVENTARIO FALTANTES
-- Fecha: 3 de Diciembre 2025
-- Descripción: Crea las tablas de inventario que faltan en el sistema
-- ============================================================================

-- Habilitar UUID si no está habilitado
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA: inv_existencias
-- Propósito: Gestión de stock por producto y almacén
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_existencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos_erp(id) ON DELETE CASCADE,
    almacen_id UUID NOT NULL REFERENCES almacenes_erp(id) ON DELETE CASCADE,
    cantidad DECIMAL(15,4) NOT NULL DEFAULT 0,
    cantidad_reservada DECIMAL(15,4) NOT NULL DEFAULT 0,
    cantidad_disponible DECIMAL(15,4) GENERATED ALWAYS AS (cantidad - cantidad_reservada) STORED,
    costo_promedio DECIMAL(15,4) DEFAULT 0,
    ultimo_movimiento TIMESTAMP WITH TIME ZONE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID NOT NULL,
    UNIQUE(producto_id, almacen_id)
);

-- Índices para inv_existencias
CREATE INDEX IF NOT EXISTS idx_inv_existencias_producto ON inv_existencias(producto_id);
CREATE INDEX IF NOT EXISTS idx_inv_existencias_almacen ON inv_existencias(almacen_id);
CREATE INDEX IF NOT EXISTS idx_inv_existencias_company ON inv_existencias(company_id);

-- Comentarios
COMMENT ON TABLE inv_existencias IS 'Tabla de existencias de inventario por producto y almacén';
COMMENT ON COLUMN inv_existencias.cantidad IS 'Cantidad total en existencia';
COMMENT ON COLUMN inv_existencias.cantidad_reservada IS 'Cantidad reservada para pedidos pendientes';
COMMENT ON COLUMN inv_existencias.cantidad_disponible IS 'Cantidad disponible para venta (calculada automáticamente)';

-- ============================================================================
-- TABLA: inv_documentos
-- Propósito: Documentación de movimientos de inventario
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'transferencia', 'ajuste', 'devolucion')),
    numero_documento VARCHAR(50) NOT NULL,
    fecha_documento DATE NOT NULL DEFAULT CURRENT_DATE,
    almacen_origen_id UUID REFERENCES almacenes_erp(id),
    almacen_destino_id UUID REFERENCES almacenes_erp(id),
    proveedor_id UUID,
    cliente_id UUID,
    evento_id UUID REFERENCES evt_eventos_erp(id),
    observaciones TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesado', 'anulado')),
    total_items INTEGER DEFAULT 0,
    total_cantidad DECIMAL(15,4) DEFAULT 0,
    total_costo DECIMAL(15,2) DEFAULT 0,
    creado_por UUID NOT NULL,
    procesado_por UUID,
    fecha_procesado TIMESTAMP WITH TIME ZONE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID NOT NULL
);

-- Índices para inv_documentos
CREATE INDEX IF NOT EXISTS idx_inv_documentos_tipo ON inv_documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_inv_documentos_fecha ON inv_documentos(fecha_documento);
CREATE INDEX IF NOT EXISTS idx_inv_documentos_numero ON inv_documentos(numero_documento);
CREATE INDEX IF NOT EXISTS idx_inv_documentos_estado ON inv_documentos(estado);
CREATE INDEX IF NOT EXISTS idx_inv_documentos_evento ON inv_documentos(evento_id);
CREATE INDEX IF NOT EXISTS idx_inv_documentos_company ON inv_documentos(company_id);

-- Comentarios
COMMENT ON TABLE inv_documentos IS 'Documentos de movimientos de inventario';
COMMENT ON COLUMN inv_documentos.tipo IS 'Tipo de documento: entrada, salida, transferencia, ajuste, devolucion';

-- ============================================================================
-- TABLA: inv_documentos_detalle
-- Propósito: Detalle de productos en cada documento
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_documentos_detalle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID NOT NULL REFERENCES inv_documentos(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos_erp(id),
    cantidad DECIMAL(15,4) NOT NULL,
    costo_unitario DECIMAL(15,4) DEFAULT 0,
    costo_total DECIMAL(15,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
    lote_id UUID REFERENCES inv_lotes(id),
    ubicacion_id UUID REFERENCES inv_ubicaciones(id),
    observaciones TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para inv_documentos_detalle
CREATE INDEX IF NOT EXISTS idx_inv_doc_detalle_documento ON inv_documentos_detalle(documento_id);
CREATE INDEX IF NOT EXISTS idx_inv_doc_detalle_producto ON inv_documentos_detalle(producto_id);

-- ============================================================================
-- TABLA: inv_ubicaciones
-- Propósito: Ubicaciones físicas dentro de almacenes
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_ubicaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    almacen_id UUID NOT NULL REFERENCES almacenes_erp(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(30) DEFAULT 'rack' CHECK (tipo IN ('rack', 'pasillo', 'estante', 'piso', 'zona', 'otro')),
    pasillo VARCHAR(10),
    estante VARCHAR(10),
    nivel VARCHAR(10),
    posicion VARCHAR(10),
    capacidad_maxima DECIMAL(15,4),
    unidad_capacidad VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID NOT NULL,
    UNIQUE(almacen_id, codigo)
);

-- Índices para inv_ubicaciones
CREATE INDEX IF NOT EXISTS idx_inv_ubicaciones_almacen ON inv_ubicaciones(almacen_id);
CREATE INDEX IF NOT EXISTS idx_inv_ubicaciones_codigo ON inv_ubicaciones(codigo);
CREATE INDEX IF NOT EXISTS idx_inv_ubicaciones_company ON inv_ubicaciones(company_id);

-- Comentarios
COMMENT ON TABLE inv_ubicaciones IS 'Ubicaciones físicas dentro de los almacenes';

-- ============================================================================
-- TABLA: inv_lotes
-- Propósito: Control de lotes de productos
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_lotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos_erp(id) ON DELETE CASCADE,
    almacen_id UUID NOT NULL REFERENCES almacenes_erp(id),
    numero_lote VARCHAR(50) NOT NULL,
    fecha_fabricacion DATE,
    fecha_caducidad DATE,
    cantidad_inicial DECIMAL(15,4) NOT NULL,
    cantidad_actual DECIMAL(15,4) NOT NULL,
    costo_unitario DECIMAL(15,4) DEFAULT 0,
    proveedor VARCHAR(200),
    documento_entrada VARCHAR(50),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'agotado', 'caducado', 'bloqueado')),
    observaciones TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID NOT NULL,
    UNIQUE(producto_id, numero_lote, almacen_id)
);

-- Índices para inv_lotes
CREATE INDEX IF NOT EXISTS idx_inv_lotes_producto ON inv_lotes(producto_id);
CREATE INDEX IF NOT EXISTS idx_inv_lotes_almacen ON inv_lotes(almacen_id);
CREATE INDEX IF NOT EXISTS idx_inv_lotes_numero ON inv_lotes(numero_lote);
CREATE INDEX IF NOT EXISTS idx_inv_lotes_caducidad ON inv_lotes(fecha_caducidad);
CREATE INDEX IF NOT EXISTS idx_inv_lotes_estado ON inv_lotes(estado);
CREATE INDEX IF NOT EXISTS idx_inv_lotes_company ON inv_lotes(company_id);

-- Comentarios
COMMENT ON TABLE inv_lotes IS 'Control de lotes de productos con trazabilidad';
COMMENT ON COLUMN inv_lotes.estado IS 'Estado del lote: activo, agotado, caducado, bloqueado';

-- ============================================================================
-- TABLA: inv_reservas
-- Propósito: Reservas de inventario para pedidos/eventos
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_reservas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos_erp(id) ON DELETE CASCADE,
    almacen_id UUID NOT NULL REFERENCES almacenes_erp(id),
    lote_id UUID REFERENCES inv_lotes(id),
    cantidad_reservada DECIMAL(15,4) NOT NULL,
    evento_id UUID REFERENCES evt_eventos_erp(id),
    documento_referencia VARCHAR(50),
    tipo_reserva VARCHAR(30) DEFAULT 'evento' CHECK (tipo_reserva IN ('evento', 'pedido', 'produccion', 'otro')),
    fecha_reserva TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP WITH TIME ZONE,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'utilizada', 'liberada', 'vencida')),
    reservado_por UUID NOT NULL,
    observaciones TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID NOT NULL
);

-- Índices para inv_reservas
CREATE INDEX IF NOT EXISTS idx_inv_reservas_producto ON inv_reservas(producto_id);
CREATE INDEX IF NOT EXISTS idx_inv_reservas_almacen ON inv_reservas(almacen_id);
CREATE INDEX IF NOT EXISTS idx_inv_reservas_evento ON inv_reservas(evento_id);
CREATE INDEX IF NOT EXISTS idx_inv_reservas_estado ON inv_reservas(estado);
CREATE INDEX IF NOT EXISTS idx_inv_reservas_vencimiento ON inv_reservas(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_inv_reservas_company ON inv_reservas(company_id);

-- Comentarios
COMMENT ON TABLE inv_reservas IS 'Reservas de inventario para eventos y pedidos';

-- ============================================================================
-- TRIGGERS: Actualización automática de fecha_actualizacion
-- ============================================================================

-- Función para actualizar fecha
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para cada tabla
DROP TRIGGER IF EXISTS trg_inv_existencias_updated ON inv_existencias;
CREATE TRIGGER trg_inv_existencias_updated
    BEFORE UPDATE ON inv_existencias
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

DROP TRIGGER IF EXISTS trg_inv_documentos_updated ON inv_documentos;
CREATE TRIGGER trg_inv_documentos_updated
    BEFORE UPDATE ON inv_documentos
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

DROP TRIGGER IF EXISTS trg_inv_ubicaciones_updated ON inv_ubicaciones;
CREATE TRIGGER trg_inv_ubicaciones_updated
    BEFORE UPDATE ON inv_ubicaciones
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

DROP TRIGGER IF EXISTS trg_inv_lotes_updated ON inv_lotes;
CREATE TRIGGER trg_inv_lotes_updated
    BEFORE UPDATE ON inv_lotes
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

DROP TRIGGER IF EXISTS trg_inv_reservas_updated ON inv_reservas;
CREATE TRIGGER trg_inv_reservas_updated
    BEFORE UPDATE ON inv_reservas
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

-- ============================================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE inv_existencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_documentos_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_reservas ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
CREATE POLICY IF NOT EXISTS "inv_existencias_company_policy" ON inv_existencias
    FOR ALL USING (company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "inv_documentos_company_policy" ON inv_documentos
    FOR ALL USING (company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "inv_ubicaciones_company_policy" ON inv_ubicaciones
    FOR ALL USING (company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "inv_lotes_company_policy" ON inv_lotes
    FOR ALL USING (company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "inv_reservas_company_policy" ON inv_reservas
    FOR ALL USING (company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
DO $$
DECLARE
    tabla_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tabla_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('inv_existencias', 'inv_documentos', 'inv_documentos_detalle', 
                       'inv_ubicaciones', 'inv_lotes', 'inv_reservas');
    
    IF tabla_count = 6 THEN
        RAISE NOTICE '✅ Todas las tablas de inventario fueron creadas correctamente';
    ELSE
        RAISE NOTICE '⚠️ Solo se crearon % de 6 tablas', tabla_count;
    END IF;
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
