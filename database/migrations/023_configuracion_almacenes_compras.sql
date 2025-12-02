-- =====================================================
-- MIGRACIÓN 023: Configuración de Tipos de Almacén + Módulo de Compras
-- Fecha: 2025-12-01
-- Descripción: 
--   - Tipos de almacén configurables (materia prima, mobiliario, medicamentos, etc.)
--   - Cada tipo define qué funcionalidades aplican
--   - Módulo completo de compras para adquisición de materiales
-- =====================================================

-- =====================================================
-- PARTE 1: TIPOS DE ALMACÉN CONFIGURABLES
-- =====================================================

-- Tabla de tipos de almacén
CREATE TABLE IF NOT EXISTS tipos_almacen_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Información básica
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50) DEFAULT 'warehouse',
    color VARCHAR(7) DEFAULT '#6366F1',
    
    -- Configuración de funcionalidades
    config JSONB DEFAULT '{
        "usa_lotes": false,
        "usa_fecha_caducidad": false,
        "usa_ubicaciones": true,
        "usa_numero_serie": false,
        "usa_peso": false,
        "usa_dimensiones": false,
        "requiere_inspeccion_entrada": false,
        "requiere_inspeccion_salida": false,
        "permite_reservas": true,
        "permite_transferencias": true,
        "control_temperatura": false,
        "es_consumible": true,
        "es_reutilizable": false,
        "dias_alerta_stock_bajo": 7,
        "porcentaje_stock_minimo": 20
    }'::jsonb,
    
    -- Categorías de productos permitidas
    categorias_permitidas TEXT[], -- NULL = todas
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    es_default BOOLEAN DEFAULT false,
    orden INTEGER DEFAULT 0,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(empresa_id, codigo)
);

-- Agregar columna tipo_almacen_id a almacenes existentes
ALTER TABLE almacenes_erp 
    ADD COLUMN IF NOT EXISTS tipo_almacen_id INTEGER REFERENCES tipos_almacen_erp(id);

-- Agregar más configuración a almacenes
ALTER TABLE almacenes_erp 
    ADD COLUMN IF NOT EXISTS config_override JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS capacidad_maxima DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS unidad_capacidad VARCHAR(20) DEFAULT 'm3',
    ADD COLUMN IF NOT EXISTS horario_operacion JSONB;

-- =====================================================
-- PARTE 2: MÓDULO DE COMPRAS
-- =====================================================

-- Estados de órdenes de compra
CREATE TYPE estado_orden_compra AS ENUM (
    'borrador',
    'pendiente_aprobacion',
    'aprobada',
    'enviada_proveedor',
    'parcialmente_recibida',
    'recibida',
    'cancelada',
    'cerrada'
);

-- Tabla de órdenes de compra
CREATE TABLE IF NOT EXISTS ordenes_compra_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Número y referencia
    numero_orden VARCHAR(30) NOT NULL,
    numero_cotizacion_proveedor VARCHAR(50),
    referencia_interna VARCHAR(50),
    
    -- Proveedor
    proveedor_id INTEGER NOT NULL REFERENCES proveedores_erp(id),
    contacto_proveedor VARCHAR(100),
    
    -- Fechas
    fecha_orden DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_entrega_esperada DATE,
    fecha_entrega_real DATE,
    fecha_vencimiento DATE,
    
    -- Almacén destino
    almacen_destino_id INTEGER REFERENCES almacenes_erp(id),
    
    -- Evento relacionado (si aplica)
    evento_id INTEGER REFERENCES eventos(id),
    proyecto_id INTEGER,
    
    -- Estado y aprobación
    estado estado_orden_compra DEFAULT 'borrador',
    requiere_aprobacion BOOLEAN DEFAULT false,
    aprobado_por UUID REFERENCES auth.users(id),
    fecha_aprobacion TIMESTAMPTZ,
    motivo_rechazo TEXT,
    
    -- Montos
    subtotal DECIMAL(15,2) DEFAULT 0,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_monto DECIMAL(15,2) DEFAULT 0,
    iva DECIMAL(15,2) DEFAULT 0,
    otros_impuestos DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    moneda VARCHAR(3) DEFAULT 'MXN',
    tipo_cambio DECIMAL(10,4) DEFAULT 1,
    
    -- Condiciones
    condiciones_pago TEXT,
    dias_credito INTEGER DEFAULT 0,
    metodo_envio VARCHAR(50),
    costo_envio DECIMAL(15,2) DEFAULT 0,
    
    -- Notas
    notas_internas TEXT,
    notas_proveedor TEXT,
    terminos_condiciones TEXT,
    
    -- Documentos
    documento_adjunto TEXT,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(empresa_id, numero_orden)
);

-- Detalle de órdenes de compra
CREATE TABLE IF NOT EXISTS ordenes_compra_detalle_erp (
    id SERIAL PRIMARY KEY,
    orden_id INTEGER NOT NULL REFERENCES ordenes_compra_erp(id) ON DELETE CASCADE,
    
    -- Producto
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    descripcion_adicional TEXT,
    
    -- Cantidades
    cantidad DECIMAL(15,4) NOT NULL,
    cantidad_recibida DECIMAL(15,4) DEFAULT 0,
    cantidad_pendiente DECIMAL(15,4) GENERATED ALWAYS AS (cantidad - cantidad_recibida) STORED,
    unidad_medida VARCHAR(20),
    
    -- Precios
    precio_unitario DECIMAL(15,4) NOT NULL,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_monto DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) GENERATED ALWAYS AS (
        (cantidad * precio_unitario) - descuento_monto
    ) STORED,
    
    -- Impuestos por línea
    iva_porcentaje DECIMAL(5,2) DEFAULT 16,
    iva_monto DECIMAL(15,2) DEFAULT 0,
    
    -- Ubicación destino
    ubicacion_destino_id INTEGER REFERENCES ubicaciones_almacen_erp(id),
    
    -- Notas
    notas TEXT,
    
    -- Estado de la línea
    completada BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recepciones de compra
CREATE TABLE IF NOT EXISTS recepciones_compra_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    orden_id INTEGER NOT NULL REFERENCES ordenes_compra_erp(id),
    
    -- Número de recepción
    numero_recepcion VARCHAR(30) NOT NULL,
    fecha_recepcion TIMESTAMPTZ DEFAULT NOW(),
    
    -- Almacén
    almacen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    
    -- Recibido por
    recibido_por UUID REFERENCES auth.users(id),
    verificado_por UUID REFERENCES auth.users(id),
    
    -- Estado
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, parcial, completa, rechazada
    
    -- Documentos
    numero_factura_proveedor VARCHAR(50),
    numero_remision VARCHAR(50),
    documento_adjunto TEXT,
    
    -- Notas
    notas TEXT,
    observaciones_calidad TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(empresa_id, numero_recepcion)
);

-- Detalle de recepciones
CREATE TABLE IF NOT EXISTS recepciones_compra_detalle_erp (
    id SERIAL PRIMARY KEY,
    recepcion_id INTEGER NOT NULL REFERENCES recepciones_compra_erp(id) ON DELETE CASCADE,
    orden_detalle_id INTEGER NOT NULL REFERENCES ordenes_compra_detalle_erp(id),
    
    -- Cantidades
    cantidad_esperada DECIMAL(15,4) NOT NULL,
    cantidad_recibida DECIMAL(15,4) NOT NULL,
    cantidad_rechazada DECIMAL(15,4) DEFAULT 0,
    
    -- Ubicación
    ubicacion_id INTEGER REFERENCES ubicaciones_almacen_erp(id),
    
    -- Lote (si aplica según tipo de almacén)
    lote_id INTEGER REFERENCES lotes_inventario_erp(id),
    numero_lote_nuevo VARCHAR(50),
    fecha_caducidad DATE,
    
    -- Calidad
    estado_calidad VARCHAR(20) DEFAULT 'aceptado', -- aceptado, rechazado, cuarentena
    motivo_rechazo TEXT,
    
    -- Costo real
    costo_unitario_real DECIMAL(15,4),
    
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Requisiciones de compra (solicitudes internas)
CREATE TABLE IF NOT EXISTS requisiciones_compra_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Número
    numero_requisicion VARCHAR(30) NOT NULL,
    
    -- Solicitante
    solicitante_id UUID NOT NULL REFERENCES auth.users(id),
    departamento VARCHAR(100),
    
    -- Fechas
    fecha_requisicion DATE DEFAULT CURRENT_DATE,
    fecha_requerida DATE,
    
    -- Evento/Proyecto relacionado
    evento_id INTEGER REFERENCES eventos(id),
    proyecto_id INTEGER,
    
    -- Estado
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobada, rechazada, en_compra, completada
    
    -- Aprobación
    aprobada_por UUID REFERENCES auth.users(id),
    fecha_aprobacion TIMESTAMPTZ,
    motivo_rechazo TEXT,
    
    -- Prioridad
    prioridad VARCHAR(10) DEFAULT 'media', -- baja, media, alta, urgente
    
    -- Orden de compra generada
    orden_compra_id INTEGER REFERENCES ordenes_compra_erp(id),
    
    -- Notas
    justificacion TEXT,
    notas TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(empresa_id, numero_requisicion)
);

-- Detalle de requisiciones
CREATE TABLE IF NOT EXISTS requisiciones_compra_detalle_erp (
    id SERIAL PRIMARY KEY,
    requisicion_id INTEGER NOT NULL REFERENCES requisiciones_compra_erp(id) ON DELETE CASCADE,
    
    -- Producto
    producto_id INTEGER REFERENCES productos_erp(id),
    descripcion_libre TEXT, -- Para productos no catalogados
    
    -- Cantidad
    cantidad DECIMAL(15,4) NOT NULL,
    unidad_medida VARCHAR(20),
    
    -- Proveedor sugerido
    proveedor_sugerido_id INTEGER REFERENCES proveedores_erp(id),
    
    -- Precio estimado
    precio_estimado DECIMAL(15,2),
    
    -- Notas
    especificaciones TEXT,
    notas TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTE 3: ÍNDICES Y TRIGGERS
-- =====================================================

-- Índices para tipos de almacén
CREATE INDEX IF NOT EXISTS idx_tipos_almacen_empresa ON tipos_almacen_erp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_almacen_activo ON tipos_almacen_erp(empresa_id, activo);

-- Índices para órdenes de compra
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_empresa ON ordenes_compra_erp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_proveedor ON ordenes_compra_erp(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_estado ON ordenes_compra_erp(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_fecha ON ordenes_compra_erp(empresa_id, fecha_orden DESC);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_evento ON ordenes_compra_erp(evento_id) WHERE evento_id IS NOT NULL;

-- Índices para recepciones
CREATE INDEX IF NOT EXISTS idx_recepciones_empresa ON recepciones_compra_erp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_recepciones_orden ON recepciones_compra_erp(orden_id);

-- Índices para requisiciones
CREATE INDEX IF NOT EXISTS idx_requisiciones_empresa ON requisiciones_compra_erp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_requisiciones_estado ON requisiciones_compra_erp(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_requisiciones_solicitante ON requisiciones_compra_erp(solicitante_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_tipos_almacen_updated
    BEFORE UPDATE ON tipos_almacen_erp
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_ordenes_compra_updated
    BEFORE UPDATE ON ordenes_compra_erp
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_recepciones_compra_updated
    BEFORE UPDATE ON recepciones_compra_erp
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_requisiciones_updated
    BEFORE UPDATE ON requisiciones_compra_erp
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para generar número de orden
CREATE OR REPLACE FUNCTION generar_numero_orden_compra(p_empresa_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_año VARCHAR(4);
    v_secuencia INTEGER;
    v_numero VARCHAR(30);
BEGIN
    v_año := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(numero_orden FROM 'OC-\d{4}-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_secuencia
    FROM ordenes_compra_erp
    WHERE empresa_id = p_empresa_id
    AND numero_orden LIKE 'OC-' || v_año || '-%';
    
    v_numero := 'OC-' || v_año || '-' || LPAD(v_secuencia::TEXT, 5, '0');
    
    RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de requisición
CREATE OR REPLACE FUNCTION generar_numero_requisicion(p_empresa_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_año VARCHAR(4);
    v_secuencia INTEGER;
BEGIN
    v_año := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(numero_requisicion FROM 'REQ-\d{4}-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_secuencia
    FROM requisiciones_compra_erp
    WHERE empresa_id = p_empresa_id
    AND numero_requisicion LIKE 'REQ-' || v_año || '-%';
    
    RETURN 'REQ-' || v_año || '-' || LPAD(v_secuencia::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de recepción
CREATE OR REPLACE FUNCTION generar_numero_recepcion(p_empresa_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_año VARCHAR(4);
    v_secuencia INTEGER;
BEGIN
    v_año := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(numero_recepcion FROM 'REC-\d{4}-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_secuencia
    FROM recepciones_compra_erp
    WHERE empresa_id = p_empresa_id
    AND numero_recepcion LIKE 'REC-' || v_año || '-%';
    
    RETURN 'REC-' || v_año || '-' || LPAD(v_secuencia::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar cantidades recibidas en orden
CREATE OR REPLACE FUNCTION actualizar_cantidad_recibida_orden()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar cantidad recibida en detalle de orden
    UPDATE ordenes_compra_detalle_erp
    SET cantidad_recibida = cantidad_recibida + NEW.cantidad_recibida
    WHERE id = NEW.orden_detalle_id;
    
    -- Verificar si la orden está completa
    UPDATE ordenes_compra_erp o
    SET estado = CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM ordenes_compra_detalle_erp d
            WHERE d.orden_id = o.id AND d.cantidad_pendiente > 0
        ) THEN 'recibida'::estado_orden_compra
        ELSE 'parcialmente_recibida'::estado_orden_compra
    END
    WHERE o.id = (
        SELECT r.orden_id FROM recepciones_compra_erp r
        WHERE r.id = NEW.recepcion_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_actualizar_cantidad_recibida
    AFTER INSERT ON recepciones_compra_detalle_erp
    FOR EACH ROW EXECUTE FUNCTION actualizar_cantidad_recibida_orden();

-- =====================================================
-- PARTE 4: DATOS INICIALES - TIPOS DE ALMACÉN
-- =====================================================

-- Insertar tipos de almacén predeterminados (se insertarán por empresa al crearla)
-- Esta es una función que se puede llamar para inicializar tipos para una empresa
CREATE OR REPLACE FUNCTION inicializar_tipos_almacen(p_empresa_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- Materia Prima (para fabricación de eventos)
    INSERT INTO tipos_almacen_erp (empresa_id, codigo, nombre, descripcion, icono, color, config, es_default, orden, created_by)
    VALUES (
        p_empresa_id,
        'MATERIA_PRIMA',
        'Materia Prima',
        'Materiales para fabricación de elementos de eventos',
        'package',
        '#6366F1',
        '{
            "usa_lotes": false,
            "usa_fecha_caducidad": false,
            "usa_ubicaciones": true,
            "usa_numero_serie": false,
            "usa_peso": true,
            "usa_dimensiones": true,
            "requiere_inspeccion_entrada": false,
            "requiere_inspeccion_salida": false,
            "permite_reservas": true,
            "permite_transferencias": true,
            "control_temperatura": false,
            "es_consumible": true,
            "es_reutilizable": false,
            "dias_alerta_stock_bajo": 7,
            "porcentaje_stock_minimo": 20
        }'::jsonb,
        true,
        1,
        p_user_id
    ) ON CONFLICT (empresa_id, codigo) DO NOTHING;
    
    -- Mobiliario (reutilizable)
    INSERT INTO tipos_almacen_erp (empresa_id, codigo, nombre, descripcion, icono, color, config, orden, created_by)
    VALUES (
        p_empresa_id,
        'MOBILIARIO',
        'Mobiliario',
        'Mesas, sillas, carpas y mobiliario para eventos',
        'armchair',
        '#10B981',
        '{
            "usa_lotes": false,
            "usa_fecha_caducidad": false,
            "usa_ubicaciones": true,
            "usa_numero_serie": true,
            "usa_peso": false,
            "usa_dimensiones": false,
            "requiere_inspeccion_entrada": true,
            "requiere_inspeccion_salida": true,
            "permite_reservas": true,
            "permite_transferencias": true,
            "control_temperatura": false,
            "es_consumible": false,
            "es_reutilizable": true,
            "dias_alerta_stock_bajo": 3,
            "porcentaje_stock_minimo": 10
        }'::jsonb,
        2,
        p_user_id
    ) ON CONFLICT (empresa_id, codigo) DO NOTHING;
    
    -- Medicamentos (con vencimiento y lotes)
    INSERT INTO tipos_almacen_erp (empresa_id, codigo, nombre, descripcion, icono, color, config, orden, created_by)
    VALUES (
        p_empresa_id,
        'MEDICAMENTOS',
        'Medicamentos',
        'Medicamentos y suministros médicos',
        'pill',
        '#EF4444',
        '{
            "usa_lotes": true,
            "usa_fecha_caducidad": true,
            "usa_ubicaciones": true,
            "usa_numero_serie": false,
            "usa_peso": false,
            "usa_dimensiones": false,
            "requiere_inspeccion_entrada": true,
            "requiere_inspeccion_salida": false,
            "permite_reservas": true,
            "permite_transferencias": true,
            "control_temperatura": true,
            "es_consumible": true,
            "es_reutilizable": false,
            "dias_alerta_stock_bajo": 30,
            "porcentaje_stock_minimo": 30,
            "dias_alerta_vencimiento": 90
        }'::jsonb,
        3,
        p_user_id
    ) ON CONFLICT (empresa_id, codigo) DO NOTHING;
    
    -- Alimentos (con vencimiento, lotes y temperatura)
    INSERT INTO tipos_almacen_erp (empresa_id, codigo, nombre, descripcion, icono, color, config, orden, created_by)
    VALUES (
        p_empresa_id,
        'ALIMENTOS',
        'Alimentos y Bebidas',
        'Alimentos perecederos y no perecederos',
        'utensils',
        '#F59E0B',
        '{
            "usa_lotes": true,
            "usa_fecha_caducidad": true,
            "usa_ubicaciones": true,
            "usa_numero_serie": false,
            "usa_peso": true,
            "usa_dimensiones": false,
            "requiere_inspeccion_entrada": true,
            "requiere_inspeccion_salida": false,
            "permite_reservas": true,
            "permite_transferencias": true,
            "control_temperatura": true,
            "es_consumible": true,
            "es_reutilizable": false,
            "dias_alerta_stock_bajo": 3,
            "porcentaje_stock_minimo": 25,
            "dias_alerta_vencimiento": 7
        }'::jsonb,
        4,
        p_user_id
    ) ON CONFLICT (empresa_id, codigo) DO NOTHING;
    
    -- Decoración (reutilizable)
    INSERT INTO tipos_almacen_erp (empresa_id, codigo, nombre, descripcion, icono, color, config, orden, created_by)
    VALUES (
        p_empresa_id,
        'DECORACION',
        'Decoración',
        'Elementos decorativos para eventos',
        'sparkles',
        '#EC4899',
        '{
            "usa_lotes": false,
            "usa_fecha_caducidad": false,
            "usa_ubicaciones": true,
            "usa_numero_serie": false,
            "usa_peso": false,
            "usa_dimensiones": false,
            "requiere_inspeccion_entrada": false,
            "requiere_inspeccion_salida": true,
            "permite_reservas": true,
            "permite_transferencias": true,
            "control_temperatura": false,
            "es_consumible": false,
            "es_reutilizable": true,
            "dias_alerta_stock_bajo": 5,
            "porcentaje_stock_minimo": 15
        }'::jsonb,
        5,
        p_user_id
    ) ON CONFLICT (empresa_id, codigo) DO NOTHING;
    
    -- Equipo Técnico (con número de serie)
    INSERT INTO tipos_almacen_erp (empresa_id, codigo, nombre, descripcion, icono, color, config, orden, created_by)
    VALUES (
        p_empresa_id,
        'EQUIPO_TECNICO',
        'Equipo Técnico',
        'Audio, iluminación y equipo técnico',
        'speaker',
        '#8B5CF6',
        '{
            "usa_lotes": false,
            "usa_fecha_caducidad": false,
            "usa_ubicaciones": true,
            "usa_numero_serie": true,
            "usa_peso": false,
            "usa_dimensiones": false,
            "requiere_inspeccion_entrada": true,
            "requiere_inspeccion_salida": true,
            "permite_reservas": true,
            "permite_transferencias": true,
            "control_temperatura": false,
            "es_consumible": false,
            "es_reutilizable": true,
            "dias_alerta_stock_bajo": 1,
            "porcentaje_stock_minimo": 5
        }'::jsonb,
        6,
        p_user_id
    ) ON CONFLICT (empresa_id, codigo) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE tipos_almacen_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra_detalle_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE recepciones_compra_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE recepciones_compra_detalle_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisiciones_compra_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisiciones_compra_detalle_erp ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
CREATE POLICY tipos_almacen_empresa ON tipos_almacen_erp
    FOR ALL USING (empresa_id IN (
        SELECT empresa_id FROM usuarios_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY ordenes_compra_empresa ON ordenes_compra_erp
    FOR ALL USING (empresa_id IN (
        SELECT empresa_id FROM usuarios_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY recepciones_empresa ON recepciones_compra_erp
    FOR ALL USING (empresa_id IN (
        SELECT empresa_id FROM usuarios_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY requisiciones_empresa ON requisiciones_compra_erp
    FOR ALL USING (empresa_id IN (
        SELECT empresa_id FROM usuarios_empresas WHERE user_id = auth.uid()
    ));

-- Comentarios
COMMENT ON TABLE tipos_almacen_erp IS 'Tipos de almacén configurables con funcionalidades específicas';
COMMENT ON TABLE ordenes_compra_erp IS 'Órdenes de compra a proveedores';
COMMENT ON TABLE recepciones_compra_erp IS 'Recepciones de mercancía de órdenes de compra';
COMMENT ON TABLE requisiciones_compra_erp IS 'Solicitudes internas de compra de materiales';
