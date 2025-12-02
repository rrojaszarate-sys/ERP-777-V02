-- ============================================================================
-- MIGRACIÓN 022: INVENTARIO AVANZADO - LOTES, UBICACIONES, CONTEOS, RESERVAS
-- ============================================================================
-- Extiende el módulo de inventario con funcionalidades empresariales
-- Fecha: 2025-12-01
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE UBICACIONES EN ALMACÉN
-- ============================================================================
CREATE TABLE IF NOT EXISTS ubicaciones_almacen_erp (
    id SERIAL PRIMARY KEY,
    almacen_id INTEGER NOT NULL REFERENCES almacenes_erp(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,           -- Ej: "A-01-03" (Pasillo-Rack-Nivel)
    nombre VARCHAR(100),                   -- Ej: "Pasillo A, Rack 1, Nivel 3"
    pasillo VARCHAR(10),                   -- A, B, C...
    rack VARCHAR(10),                      -- 01, 02, 03...
    nivel VARCHAR(10),                     -- 01, 02, 03...
    posicion VARCHAR(10),                  -- Posición horizontal opcional
    tipo VARCHAR(20) DEFAULT 'estante'     -- estante, piso, colgante, refrigerado
        CHECK (tipo IN ('estante', 'piso', 'colgante', 'refrigerado', 'exterior')),
    capacidad_kg DECIMAL(10,2),            -- Capacidad máxima en kg
    capacidad_unidades INTEGER,            -- Capacidad máxima en unidades
    es_picking BOOLEAN DEFAULT FALSE,      -- Zona de picking rápido
    activo BOOLEAN DEFAULT TRUE,
    company_id UUID NOT NULL REFERENCES companies_erp(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(almacen_id, codigo)
);

COMMENT ON TABLE ubicaciones_almacen_erp IS 'Ubicaciones físicas dentro de cada almacén (racks, estantes, niveles)';

CREATE INDEX idx_ubicaciones_almacen ON ubicaciones_almacen_erp(almacen_id);
CREATE INDEX idx_ubicaciones_company ON ubicaciones_almacen_erp(company_id);
CREATE INDEX idx_ubicaciones_codigo ON ubicaciones_almacen_erp(codigo);

-- ============================================================================
-- 2. TABLA DE LOTES DE INVENTARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS lotes_inventario_erp (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id) ON DELETE CASCADE,
    almacen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    ubicacion_id INTEGER REFERENCES ubicaciones_almacen_erp(id),
    
    -- Información del lote
    numero_lote VARCHAR(50) NOT NULL,
    codigo_barras_lote VARCHAR(50),
    
    -- Fechas
    fecha_fabricacion DATE,
    fecha_caducidad DATE,
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Cantidades
    cantidad_inicial INTEGER NOT NULL,
    cantidad_actual INTEGER NOT NULL,
    
    -- Costos
    costo_unitario DECIMAL(12,2),
    
    -- Proveedor
    proveedor_id INTEGER REFERENCES proveedores_erp(id),
    documento_compra VARCHAR(50),          -- Número de factura/remisión
    
    -- Estado
    estado VARCHAR(15) DEFAULT 'activo'
        CHECK (estado IN ('activo', 'agotado', 'vencido', 'bloqueado')),
    
    -- Multi-tenant
    company_id UUID NOT NULL REFERENCES companies_erp(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(producto_id, numero_lote, company_id)
);

COMMENT ON TABLE lotes_inventario_erp IS 'Gestión de lotes con trazabilidad, fechas de caducidad y ubicación';

CREATE INDEX idx_lotes_producto ON lotes_inventario_erp(producto_id);
CREATE INDEX idx_lotes_almacen ON lotes_inventario_erp(almacen_id);
CREATE INDEX idx_lotes_ubicacion ON lotes_inventario_erp(ubicacion_id);
CREATE INDEX idx_lotes_caducidad ON lotes_inventario_erp(fecha_caducidad);
CREATE INDEX idx_lotes_estado ON lotes_inventario_erp(estado);
CREATE INDEX idx_lotes_company ON lotes_inventario_erp(company_id);

-- ============================================================================
-- 3. TABLA DE NÚMEROS DE SERIE
-- ============================================================================
CREATE TABLE IF NOT EXISTS numeros_serie_erp (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id) ON DELETE CASCADE,
    lote_id INTEGER REFERENCES lotes_inventario_erp(id),
    almacen_id INTEGER REFERENCES almacenes_erp(id),
    ubicacion_id INTEGER REFERENCES ubicaciones_almacen_erp(id),
    
    -- Identificación
    numero_serie VARCHAR(100) NOT NULL,
    codigo_barras VARCHAR(100),
    
    -- Información adicional
    fecha_fabricacion DATE,
    fecha_garantia_fin DATE,
    
    -- Estado y ubicación actual
    estado VARCHAR(20) DEFAULT 'disponible'
        CHECK (estado IN ('disponible', 'reservado', 'en_uso', 'en_reparacion', 'dado_baja', 'vendido')),
    
    -- Evento actual (si está asignado)
    evento_id INTEGER REFERENCES eventos_erp(id),
    
    -- Historial de valor
    costo_adquisicion DECIMAL(12,2),
    valor_actual DECIMAL(12,2),
    
    -- Notas y observaciones
    notas TEXT,
    
    -- Multi-tenant
    company_id UUID NOT NULL REFERENCES companies_erp(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(numero_serie, company_id)
);

COMMENT ON TABLE numeros_serie_erp IS 'Seguimiento individual de productos serializados (equipos de alto valor)';

CREATE INDEX idx_series_producto ON numeros_serie_erp(producto_id);
CREATE INDEX idx_series_lote ON numeros_serie_erp(lote_id);
CREATE INDEX idx_series_estado ON numeros_serie_erp(estado);
CREATE INDEX idx_series_evento ON numeros_serie_erp(evento_id);
CREATE INDEX idx_series_company ON numeros_serie_erp(company_id);

-- ============================================================================
-- 4. TABLA DE CONTEOS DE INVENTARIO (Inventario Físico)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conteos_inventario_erp (
    id SERIAL PRIMARY KEY,
    
    -- Identificación
    numero_conteo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100),                   -- Ej: "Conteo Mensual Diciembre 2025"
    
    -- Alcance del conteo
    tipo_conteo VARCHAR(20) NOT NULL DEFAULT 'completo'
        CHECK (tipo_conteo IN ('completo', 'parcial', 'ciclico', 'aleatorio')),
    almacen_id INTEGER REFERENCES almacenes_erp(id), -- NULL = todos los almacenes
    
    -- Fechas
    fecha_programada DATE NOT NULL,
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    
    -- Estado
    estado VARCHAR(15) DEFAULT 'programado'
        CHECK (estado IN ('programado', 'en_proceso', 'completado', 'cancelado')),
    
    -- Responsable
    responsable_id UUID REFERENCES auth.users(id),
    
    -- Resultados
    total_productos INTEGER DEFAULT 0,
    productos_contados INTEGER DEFAULT 0,
    productos_con_diferencia INTEGER DEFAULT 0,
    
    -- Observaciones
    observaciones TEXT,
    
    -- Multi-tenant
    company_id UUID NOT NULL REFERENCES companies_erp(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE conteos_inventario_erp IS 'Cabecera de inventarios físicos programados';

CREATE INDEX idx_conteos_almacen ON conteos_inventario_erp(almacen_id);
CREATE INDEX idx_conteos_estado ON conteos_inventario_erp(estado);
CREATE INDEX idx_conteos_fecha ON conteos_inventario_erp(fecha_programada);
CREATE INDEX idx_conteos_company ON conteos_inventario_erp(company_id);

-- ============================================================================
-- 5. DETALLE DE CONTEOS (Líneas de conteo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conteos_inventario_detalle_erp (
    id SERIAL PRIMARY KEY,
    conteo_id INTEGER NOT NULL REFERENCES conteos_inventario_erp(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    ubicacion_id INTEGER REFERENCES ubicaciones_almacen_erp(id),
    lote_id INTEGER REFERENCES lotes_inventario_erp(id),
    
    -- Cantidades
    cantidad_sistema INTEGER NOT NULL,     -- Lo que dice el sistema
    cantidad_contada INTEGER,              -- Lo que se contó físicamente
    diferencia INTEGER GENERATED ALWAYS AS (COALESCE(cantidad_contada, 0) - cantidad_sistema) STORED,
    
    -- Estado de la línea
    estado VARCHAR(15) DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'contado', 'verificado', 'ajustado')),
    
    -- Quién contó
    contado_por UUID REFERENCES auth.users(id),
    fecha_conteo TIMESTAMPTZ,
    
    -- Ajuste aplicado
    ajuste_aplicado BOOLEAN DEFAULT FALSE,
    movimiento_ajuste_id INTEGER REFERENCES movimientos_inventario_erp(id),
    
    -- Observaciones
    observaciones TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE conteos_inventario_detalle_erp IS 'Líneas de conteo físico por producto';

CREATE INDEX idx_conteo_detalle_conteo ON conteos_inventario_detalle_erp(conteo_id);
CREATE INDEX idx_conteo_detalle_producto ON conteos_inventario_detalle_erp(producto_id);
CREATE INDEX idx_conteo_detalle_estado ON conteos_inventario_detalle_erp(estado);

-- ============================================================================
-- 6. RESERVAS DE STOCK PARA EVENTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservas_stock_erp (
    id SERIAL PRIMARY KEY,
    
    -- Evento vinculado
    evento_id INTEGER NOT NULL REFERENCES eventos_erp(id) ON DELETE CASCADE,
    
    -- Producto reservado
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    almacen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    lote_id INTEGER REFERENCES lotes_inventario_erp(id),
    
    -- Cantidad
    cantidad_reservada INTEGER NOT NULL,
    cantidad_entregada INTEGER DEFAULT 0,
    cantidad_devuelta INTEGER DEFAULT 0,
    
    -- Fechas
    fecha_reserva TIMESTAMPTZ DEFAULT NOW(),
    fecha_necesidad DATE NOT NULL,         -- Cuándo se necesita
    fecha_devolucion_esperada DATE,        -- Cuándo debe volver
    
    -- Estado
    estado VARCHAR(20) DEFAULT 'activa'
        CHECK (estado IN ('activa', 'parcial', 'entregada', 'devuelta', 'cancelada')),
    
    -- Documentos vinculados
    documento_salida_id INTEGER REFERENCES documentos_inventario_erp(id),
    documento_entrada_id INTEGER REFERENCES documentos_inventario_erp(id),
    
    -- Notas
    notas TEXT,
    
    -- Multi-tenant
    company_id UUID NOT NULL REFERENCES companies_erp(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(evento_id, producto_id, almacen_id, lote_id)
);

COMMENT ON TABLE reservas_stock_erp IS 'Reservas de productos para eventos futuros';

CREATE INDEX idx_reservas_evento ON reservas_stock_erp(evento_id);
CREATE INDEX idx_reservas_producto ON reservas_stock_erp(producto_id);
CREATE INDEX idx_reservas_estado ON reservas_stock_erp(estado);
CREATE INDEX idx_reservas_fecha ON reservas_stock_erp(fecha_necesidad);
CREATE INDEX idx_reservas_company ON reservas_stock_erp(company_id);

-- ============================================================================
-- 7. KITS DE MATERIALES PARA EVENTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS kits_evento_erp (
    id SERIAL PRIMARY KEY,
    
    -- Identificación
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    
    -- Clasificación
    tipo_evento VARCHAR(50),               -- Boda, XV Años, Corporativo, etc.
    categoria VARCHAR(50),                 -- Básico, Premium, Deluxe
    
    -- Configuración
    personas_base INTEGER DEFAULT 100,     -- Para cuántas personas está diseñado
    es_escalable BOOLEAN DEFAULT TRUE,     -- Si se puede ajustar por personas
    
    -- Precios sugeridos
    precio_renta_sugerido DECIMAL(12,2),
    
    -- Estado
    activo BOOLEAN DEFAULT TRUE,
    
    -- Multi-tenant
    company_id UUID NOT NULL REFERENCES companies_erp(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(codigo, company_id)
);

COMMENT ON TABLE kits_evento_erp IS 'Kits predefinidos de materiales por tipo de evento';

CREATE INDEX idx_kits_tipo ON kits_evento_erp(tipo_evento);
CREATE INDEX idx_kits_company ON kits_evento_erp(company_id);

-- ============================================================================
-- 8. DETALLE DE KITS (Productos incluidos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS kits_evento_detalle_erp (
    id SERIAL PRIMARY KEY,
    kit_id INTEGER NOT NULL REFERENCES kits_evento_erp(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    
    -- Cantidades
    cantidad_fija INTEGER DEFAULT 0,       -- Cantidad fija (no escala)
    cantidad_por_persona DECIMAL(8,4) DEFAULT 0, -- Cantidad por persona (escala)
    
    -- Opcionalidad
    es_obligatorio BOOLEAN DEFAULT TRUE,
    es_alternativo_de INTEGER REFERENCES kits_evento_detalle_erp(id), -- Producto alternativo
    
    -- Notas
    notas TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(kit_id, producto_id)
);

COMMENT ON TABLE kits_evento_detalle_erp IS 'Productos incluidos en cada kit de evento';

CREATE INDEX idx_kit_detalle_kit ON kits_evento_detalle_erp(kit_id);
CREATE INDEX idx_kit_detalle_producto ON kits_evento_detalle_erp(producto_id);

-- ============================================================================
-- 9. CHECKLIST DE INVENTARIO PARA EVENTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS checklist_evento_inventario_erp (
    id SERIAL PRIMARY KEY,
    
    -- Evento vinculado
    evento_id INTEGER NOT NULL REFERENCES eventos_erp(id) ON DELETE CASCADE,
    
    -- Tipo de checklist
    tipo VARCHAR(15) NOT NULL CHECK (tipo IN ('pre_evento', 'post_evento')),
    
    -- Estado
    estado VARCHAR(15) DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'en_proceso', 'completado')),
    
    -- Fechas
    fecha_programada DATE,
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    
    -- Responsables
    responsable_carga_id UUID REFERENCES auth.users(id),
    responsable_descarga_id UUID REFERENCES auth.users(id),
    
    -- Fotos (URLs de storage)
    fotos_carga JSONB DEFAULT '[]'::jsonb,
    fotos_descarga JSONB DEFAULT '[]'::jsonb,
    
    -- Firmas
    nombre_entrega VARCHAR(100),
    firma_entrega TEXT,
    nombre_recibe VARCHAR(100),
    firma_recibe TEXT,
    
    -- Totales
    total_productos INTEGER DEFAULT 0,
    total_verificados INTEGER DEFAULT 0,
    total_con_daño INTEGER DEFAULT 0,
    total_faltantes INTEGER DEFAULT 0,
    
    -- Observaciones
    observaciones TEXT,
    
    -- Multi-tenant
    company_id UUID NOT NULL REFERENCES companies_erp(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE checklist_evento_inventario_erp IS 'Checklist de verificación pre y post evento';

CREATE INDEX idx_checklist_evento ON checklist_evento_inventario_erp(evento_id);
CREATE INDEX idx_checklist_tipo ON checklist_evento_inventario_erp(tipo);
CREATE INDEX idx_checklist_estado ON checklist_evento_inventario_erp(estado);
CREATE INDEX idx_checklist_company ON checklist_evento_inventario_erp(company_id);

-- ============================================================================
-- 10. DETALLE DE CHECKLIST (Verificación por producto)
-- ============================================================================
CREATE TABLE IF NOT EXISTS checklist_evento_detalle_erp (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES checklist_evento_inventario_erp(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    numero_serie_id INTEGER REFERENCES numeros_serie_erp(id),
    
    -- Cantidades esperadas vs verificadas
    cantidad_esperada INTEGER NOT NULL,
    cantidad_verificada INTEGER DEFAULT 0,
    cantidad_dañada INTEGER DEFAULT 0,
    cantidad_faltante INTEGER DEFAULT 0,
    
    -- Estado del item
    estado VARCHAR(15) DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'verificado', 'con_novedad')),
    
    -- Descripción del daño si aplica
    tipo_daño VARCHAR(50),                 -- roto, rayado, manchado, mojado, etc.
    descripcion_daño TEXT,
    foto_daño TEXT,                        -- URL de foto del daño
    
    -- Costo estimado de reposición
    costo_reposicion DECIMAL(12,2),
    
    -- Verificado por
    verificado_por UUID REFERENCES auth.users(id),
    fecha_verificacion TIMESTAMPTZ,
    
    -- Notas
    notas TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE checklist_evento_detalle_erp IS 'Detalle de verificación de cada producto en el checklist';

CREATE INDEX idx_checklist_det_checklist ON checklist_evento_detalle_erp(checklist_id);
CREATE INDEX idx_checklist_det_producto ON checklist_evento_detalle_erp(producto_id);
CREATE INDEX idx_checklist_det_estado ON checklist_evento_detalle_erp(estado);

-- ============================================================================
-- 11. HISTORIAL DE MOVIMIENTOS DE NÚMEROS DE SERIE
-- ============================================================================
CREATE TABLE IF NOT EXISTS historial_serie_erp (
    id SERIAL PRIMARY KEY,
    numero_serie_id INTEGER NOT NULL REFERENCES numeros_serie_erp(id) ON DELETE CASCADE,
    
    -- Tipo de movimiento
    tipo_movimiento VARCHAR(30) NOT NULL,  -- ingreso, salida, transferencia, reparacion, baja
    
    -- Ubicación anterior y nueva
    almacen_anterior_id INTEGER REFERENCES almacenes_erp(id),
    almacen_nuevo_id INTEGER REFERENCES almacenes_erp(id),
    ubicacion_anterior_id INTEGER REFERENCES ubicaciones_almacen_erp(id),
    ubicacion_nueva_id INTEGER REFERENCES ubicaciones_almacen_erp(id),
    
    -- Evento si aplica
    evento_id INTEGER REFERENCES eventos_erp(id),
    
    -- Documento relacionado
    documento_id INTEGER REFERENCES documentos_inventario_erp(id),
    
    -- Responsable
    responsable_id UUID REFERENCES auth.users(id),
    
    -- Notas
    notas TEXT,
    
    -- Fecha
    fecha TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE historial_serie_erp IS 'Historial de movimientos de productos serializados';

CREATE INDEX idx_historial_serie ON historial_serie_erp(numero_serie_id);
CREATE INDEX idx_historial_serie_fecha ON historial_serie_erp(fecha);

-- ============================================================================
-- 12. ALERTAS DE INVENTARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS alertas_inventario_erp (
    id SERIAL PRIMARY KEY,
    
    -- Tipo de alerta
    tipo VARCHAR(30) NOT NULL,             -- stock_bajo, lote_vencer, conteo_pendiente, reserva_vencida
    
    -- Entidad relacionada
    producto_id INTEGER REFERENCES productos_erp(id),
    lote_id INTEGER REFERENCES lotes_inventario_erp(id),
    conteo_id INTEGER REFERENCES conteos_inventario_erp(id),
    reserva_id INTEGER REFERENCES reservas_stock_erp(id),
    
    -- Mensaje
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    
    -- Prioridad y estado
    prioridad VARCHAR(10) DEFAULT 'media'
        CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
    estado VARCHAR(15) DEFAULT 'activa'
        CHECK (estado IN ('activa', 'leida', 'resuelta', 'ignorada')),
    
    -- Fechas
    fecha_alerta TIMESTAMPTZ DEFAULT NOW(),
    fecha_vencimiento DATE,
    fecha_lectura TIMESTAMPTZ,
    fecha_resolucion TIMESTAMPTZ,
    
    -- Usuario que la resolvió
    resuelta_por UUID REFERENCES auth.users(id),
    
    -- Multi-tenant
    company_id UUID NOT NULL REFERENCES companies_erp(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE alertas_inventario_erp IS 'Sistema de alertas para gestión proactiva del inventario';

CREATE INDEX idx_alertas_tipo ON alertas_inventario_erp(tipo);
CREATE INDEX idx_alertas_estado ON alertas_inventario_erp(estado);
CREATE INDEX idx_alertas_prioridad ON alertas_inventario_erp(prioridad);
CREATE INDEX idx_alertas_company ON alertas_inventario_erp(company_id);

-- ============================================================================
-- 13. AGREGAR CAMPOS A PRODUCTOS EXISTENTES
-- ============================================================================
DO $$ 
BEGIN
    -- Campos para control de lotes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos_erp' AND column_name = 'usa_lotes') THEN
        ALTER TABLE productos_erp ADD COLUMN usa_lotes BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos_erp' AND column_name = 'usa_series') THEN
        ALTER TABLE productos_erp ADD COLUMN usa_series BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos_erp' AND column_name = 'dias_alerta_caducidad') THEN
        ALTER TABLE productos_erp ADD COLUMN dias_alerta_caducidad INTEGER DEFAULT 30;
    END IF;
    
    -- Campos de fotos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos_erp' AND column_name = 'foto_principal') THEN
        ALTER TABLE productos_erp ADD COLUMN foto_principal TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos_erp' AND column_name = 'galeria_fotos') THEN
        ALTER TABLE productos_erp ADD COLUMN galeria_fotos JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Campo de ubicación default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos_erp' AND column_name = 'ubicacion_default_id') THEN
        ALTER TABLE productos_erp ADD COLUMN ubicacion_default_id INTEGER REFERENCES ubicaciones_almacen_erp(id);
    END IF;
END $$;

-- ============================================================================
-- 14. VISTAS ÚTILES
-- ============================================================================

-- Vista de stock disponible (considera reservas)
CREATE OR REPLACE VIEW vw_stock_disponible_erp AS
SELECT 
    p.id AS producto_id,
    p.nombre AS producto_nombre,
    p.clave AS producto_clave,
    a.id AS almacen_id,
    a.nombre AS almacen_nombre,
    COALESCE(SUM(CASE WHEN m.tipo IN ('entrada', 'ajuste') THEN m.cantidad ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN m.tipo = 'salida' THEN m.cantidad ELSE 0 END), 0) AS stock_actual,
    COALESCE(r.cantidad_reservada, 0) AS stock_reservado,
    COALESCE(SUM(CASE WHEN m.tipo IN ('entrada', 'ajuste') THEN m.cantidad ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN m.tipo = 'salida' THEN m.cantidad ELSE 0 END), 0) -
    COALESCE(r.cantidad_reservada, 0) AS stock_disponible,
    p.stock_minimo,
    p.company_id
FROM productos_erp p
CROSS JOIN almacenes_erp a
LEFT JOIN movimientos_inventario_erp m ON p.id = m.producto_id AND a.id = m.almacen_id
LEFT JOIN (
    SELECT producto_id, almacen_id, SUM(cantidad_reservada - cantidad_entregada) AS cantidad_reservada
    FROM reservas_stock_erp
    WHERE estado IN ('activa', 'parcial')
    GROUP BY producto_id, almacen_id
) r ON p.id = r.producto_id AND a.id = r.almacen_id
WHERE p.company_id = a.company_id
GROUP BY p.id, p.nombre, p.clave, a.id, a.nombre, r.cantidad_reservada, p.stock_minimo, p.company_id;

-- Vista de lotes próximos a vencer
CREATE OR REPLACE VIEW vw_lotes_por_vencer_erp AS
SELECT 
    l.*,
    p.nombre AS producto_nombre,
    p.clave AS producto_clave,
    a.nombre AS almacen_nombre,
    u.codigo AS ubicacion_codigo,
    l.fecha_caducidad - CURRENT_DATE AS dias_para_vencer
FROM lotes_inventario_erp l
JOIN productos_erp p ON l.producto_id = p.id
JOIN almacenes_erp a ON l.almacen_id = a.id
LEFT JOIN ubicaciones_almacen_erp u ON l.ubicacion_id = u.id
WHERE l.estado = 'activo'
  AND l.fecha_caducidad IS NOT NULL
  AND l.fecha_caducidad <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY l.fecha_caducidad ASC;

-- Vista de reservas por evento
CREATE OR REPLACE VIEW vw_reservas_evento_erp AS
SELECT 
    r.*,
    e.nombre_proyecto AS evento_nombre,
    e.fecha_evento,
    p.nombre AS producto_nombre,
    p.clave AS producto_clave,
    a.nombre AS almacen_nombre,
    r.cantidad_reservada - r.cantidad_entregada AS cantidad_pendiente
FROM reservas_stock_erp r
JOIN eventos_erp e ON r.evento_id = e.id
JOIN productos_erp p ON r.producto_id = p.id
JOIN almacenes_erp a ON r.almacen_id = a.id
ORDER BY e.fecha_evento, p.nombre;

-- ============================================================================
-- 15. FUNCIONES DE UTILIDAD
-- ============================================================================

-- Función para calcular stock disponible de un producto
CREATE OR REPLACE FUNCTION fn_stock_disponible(
    p_producto_id INTEGER,
    p_almacen_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_stock INTEGER;
    v_reservado INTEGER;
BEGIN
    -- Calcular stock actual
    SELECT COALESCE(
        SUM(CASE WHEN tipo IN ('entrada', 'ajuste') THEN cantidad ELSE -cantidad END),
        0
    ) INTO v_stock
    FROM movimientos_inventario_erp
    WHERE producto_id = p_producto_id
      AND (p_almacen_id IS NULL OR almacen_id = p_almacen_id);
    
    -- Restar reservas activas
    SELECT COALESCE(SUM(cantidad_reservada - cantidad_entregada), 0) INTO v_reservado
    FROM reservas_stock_erp
    WHERE producto_id = p_producto_id
      AND (p_almacen_id IS NULL OR almacen_id = p_almacen_id)
      AND estado IN ('activa', 'parcial');
    
    RETURN v_stock - v_reservado;
END;
$$ LANGUAGE plpgsql;

-- Función para generar alertas de stock bajo
CREATE OR REPLACE FUNCTION fn_generar_alertas_stock_bajo()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_producto RECORD;
BEGIN
    FOR v_producto IN 
        SELECT 
            p.id, p.nombre, p.stock_minimo, p.company_id,
            COALESCE(SUM(CASE WHEN m.tipo IN ('entrada', 'ajuste') THEN m.cantidad ELSE -m.cantidad END), 0) AS stock_actual
        FROM productos_erp p
        LEFT JOIN movimientos_inventario_erp m ON p.id = m.producto_id
        WHERE p.activo = TRUE AND p.stock_minimo > 0
        GROUP BY p.id, p.nombre, p.stock_minimo, p.company_id
        HAVING COALESCE(SUM(CASE WHEN m.tipo IN ('entrada', 'ajuste') THEN m.cantidad ELSE -m.cantidad END), 0) < p.stock_minimo
    LOOP
        -- Solo crear alerta si no existe una activa
        IF NOT EXISTS (
            SELECT 1 FROM alertas_inventario_erp 
            WHERE producto_id = v_producto.id 
              AND tipo = 'stock_bajo' 
              AND estado = 'activa'
        ) THEN
            INSERT INTO alertas_inventario_erp (
                tipo, producto_id, titulo, mensaje, prioridad, company_id
            ) VALUES (
                'stock_bajo',
                v_producto.id,
                'Stock bajo: ' || v_producto.nombre,
                'El producto tiene ' || v_producto.stock_actual || ' unidades (mínimo: ' || v_producto.stock_minimo || ')',
                CASE WHEN v_producto.stock_actual <= 0 THEN 'critica' ELSE 'alta' END,
                v_producto.company_id
            );
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 16. POLÍTICAS RLS
-- ============================================================================
ALTER TABLE ubicaciones_almacen_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_inventario_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE numeros_serie_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteos_inventario_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteos_inventario_detalle_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas_stock_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE kits_evento_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE kits_evento_detalle_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_evento_inventario_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_evento_detalle_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_serie_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_inventario_erp ENABLE ROW LEVEL SECURITY;

-- Crear políticas básicas (SELECT para usuarios autenticados de la misma company)
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOREACH t_name IN ARRAY ARRAY[
        'ubicaciones_almacen_erp', 'lotes_inventario_erp', 'numeros_serie_erp',
        'conteos_inventario_erp', 'reservas_stock_erp', 'kits_evento_erp',
        'checklist_evento_inventario_erp', 'alertas_inventario_erp'
    ]
    LOOP
        EXECUTE format('
            CREATE POLICY IF NOT EXISTS %I_select_policy ON %I
            FOR SELECT USING (
                company_id IN (
                    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
                )
            )', t_name, t_name);
        
        EXECUTE format('
            CREATE POLICY IF NOT EXISTS %I_insert_policy ON %I
            FOR INSERT WITH CHECK (
                company_id IN (
                    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
                )
            )', t_name, t_name);
        
        EXECUTE format('
            CREATE POLICY IF NOT EXISTS %I_update_policy ON %I
            FOR UPDATE USING (
                company_id IN (
                    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
                )
            )', t_name, t_name);
        
        EXECUTE format('
            CREATE POLICY IF NOT EXISTS %I_delete_policy ON %I
            FOR DELETE USING (
                company_id IN (
                    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
                )
            )', t_name, t_name);
    END LOOP;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN 022
-- ============================================================================
