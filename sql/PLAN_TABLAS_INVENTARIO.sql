-- ============================================================================
-- PLAN DE CREACIÓN DE TABLAS FALTANTES - MÓDULO INVENTARIO
-- ERP 777 V2
-- Fecha: 2025-12-03
-- ============================================================================
-- 
-- CONTEXTO:
-- El código del módulo de inventario espera estas tablas que NO EXISTEN.
-- Los servicios actualmente usan "almacenamiento en memoria" como fallback.
--
-- PRIORIDAD: CRÍTICA
-- ============================================================================

-- ============================================================================
-- 1. TABLA: transferencias_erp
-- Propósito: Transferencias de stock entre almacenes
-- ============================================================================
CREATE TABLE IF NOT EXISTS transferencias_erp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES empresas(id),
    numero VARCHAR(20) NOT NULL UNIQUE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    almacen_origen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    almacen_destino_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    estado VARCHAR(30) NOT NULL DEFAULT 'borrador' 
        CHECK (estado IN ('borrador', 'pendiente_aprobacion', 'aprobada', 'en_transito', 'recibida_parcial', 'recibida', 'cancelada')),
    notas TEXT,
    usuario_solicita_id UUID REFERENCES auth.users(id),
    usuario_aprueba_id UUID REFERENCES auth.users(id),
    usuario_recibe_id UUID REFERENCES auth.users(id),
    fecha_aprobacion TIMESTAMPTZ,
    fecha_envio TIMESTAMPTZ,
    fecha_recepcion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_almacenes_diferentes CHECK (almacen_origen_id != almacen_destino_id)
);

-- ============================================================================
-- 2. TABLA: transferencias_detalle_erp
-- Propósito: Detalle de productos en cada transferencia
-- ============================================================================
CREATE TABLE IF NOT EXISTS transferencias_detalle_erp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transferencia_id UUID NOT NULL REFERENCES transferencias_erp(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    cantidad_solicitada DECIMAL(12,2) NOT NULL CHECK (cantidad_solicitada > 0),
    cantidad_enviada DECIMAL(12,2),
    cantidad_recibida DECIMAL(12,2),
    lote_id UUID REFERENCES inv_lotes(id),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TABLA: inv_existencias
-- Propósito: Stock actual por producto/almacén/ubicación
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_existencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES empresas(id),
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    almacen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    ubicacion_id UUID REFERENCES inv_ubicaciones(id),
    lote_id UUID REFERENCES inv_lotes(id),
    cantidad DECIMAL(12,2) NOT NULL DEFAULT 0,
    cantidad_reservada DECIMAL(12,2) NOT NULL DEFAULT 0,
    cantidad_disponible DECIMAL(12,2) GENERATED ALWAYS AS (cantidad - cantidad_reservada) STORED,
    costo_unitario DECIMAL(12,4),
    ultimo_movimiento TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(producto_id, almacen_id, COALESCE(ubicacion_id, '00000000-0000-0000-0000-000000000000'), COALESCE(lote_id, '00000000-0000-0000-0000-000000000000'))
);

-- ============================================================================
-- 4. TABLA: inv_ubicaciones
-- Propósito: Ubicaciones físicas dentro de almacenes (pasillo, rack, nivel)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_ubicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES empresas(id),
    almacen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(100),
    tipo VARCHAR(30) DEFAULT 'rack' CHECK (tipo IN ('rack', 'pasillo', 'estante', 'piso', 'zona', 'otro')),
    pasillo VARCHAR(10),
    rack VARCHAR(10),
    nivel VARCHAR(10),
    posicion VARCHAR(10),
    capacidad_maxima DECIMAL(12,2),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(almacen_id, codigo)
);

-- ============================================================================
-- 5. TABLA: inv_lotes
-- Propósito: Trazabilidad por lotes (fecha fabricación, caducidad)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES empresas(id),
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    numero_lote VARCHAR(50) NOT NULL,
    fecha_fabricacion DATE,
    fecha_caducidad DATE,
    proveedor_id INTEGER,
    documento_entrada VARCHAR(50),
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(producto_id, numero_lote)
);

-- ============================================================================
-- 6. TABLA: inv_reservas
-- Propósito: Reservar stock para eventos futuros
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES empresas(id),
    evento_id INTEGER REFERENCES evt_eventos_erp(id),
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    almacen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    cantidad DECIMAL(12,2) NOT NULL CHECK (cantidad > 0),
    fecha_requerida DATE NOT NULL,
    fecha_devolucion DATE,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'entregada', 'devuelta', 'cancelada')),
    notas TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. TABLA: inv_conteos_erp
-- Propósito: Conteos físicos de inventario
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_conteos_erp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES empresas(id),
    almacen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo VARCHAR(20) DEFAULT 'parcial' CHECK (tipo IN ('completo', 'parcial', 'ciclico')),
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'en_proceso', 'completado', 'aprobado')),
    usuario_id UUID REFERENCES auth.users(id),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_conteos_detalle_erp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conteo_id UUID NOT NULL REFERENCES inv_conteos_erp(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id),
    ubicacion_id UUID REFERENCES inv_ubicaciones(id),
    cantidad_sistema DECIMAL(12,2),
    cantidad_fisica DECIMAL(12,2),
    diferencia DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_fisica - cantidad_sistema) STORED,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. TABLA: inv_alertas_erp
-- Propósito: Alertas de stock bajo, próximo a vencer, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_alertas_erp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES empresas(id),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('stock_bajo', 'stock_agotado', 'proximo_vencer', 'vencido', 'sobre_stock', 'sin_movimiento')),
    prioridad VARCHAR(10) DEFAULT 'media' CHECK (prioridad IN ('critica', 'alta', 'media', 'baja')),
    producto_id INTEGER REFERENCES productos_erp(id),
    almacen_id INTEGER REFERENCES almacenes_erp(id),
    lote_id UUID REFERENCES inv_lotes(id),
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    resuelta BOOLEAN DEFAULT FALSE,
    fecha_resolucion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. TABLA: inv_checklists_erp
-- Propósito: Checklists de verificación de inventario
-- ============================================================================
CREATE TABLE IF NOT EXISTS inv_checklists_erp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES empresas(id),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(30) DEFAULT 'verificacion' CHECK (tipo IN ('verificacion', 'recepcion', 'despacho', 'auditoria')),
    plantilla JSONB, -- items del checklist
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_checklists_ejecucion_erp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES inv_checklists_erp(id),
    almacen_id INTEGER REFERENCES almacenes_erp(id),
    evento_id INTEGER REFERENCES evt_eventos_erp(id),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completado')),
    resultados JSONB, -- respuestas del checklist
    usuario_id UUID REFERENCES auth.users(id),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_transferencias_estado ON transferencias_erp(estado);
CREATE INDEX IF NOT EXISTS idx_transferencias_fecha ON transferencias_erp(fecha);
CREATE INDEX IF NOT EXISTS idx_existencias_producto ON inv_existencias(producto_id);
CREATE INDEX IF NOT EXISTS idx_existencias_almacen ON inv_existencias(almacen_id);
CREATE INDEX IF NOT EXISTS idx_lotes_producto ON inv_lotes(producto_id);
CREATE INDEX IF NOT EXISTS idx_lotes_caducidad ON inv_lotes(fecha_caducidad);
CREATE INDEX IF NOT EXISTS idx_reservas_evento ON inv_reservas(evento_id);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON inv_reservas(fecha_requerida);
CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON inv_alertas_erp(tipo, resuelta);
CREATE INDEX IF NOT EXISTS idx_conteos_estado ON inv_conteos_erp(estado);

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
ALTER TABLE transferencias_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencias_detalle_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_existencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_conteos_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_alertas_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_checklists_erp ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
CREATE POLICY "Usuarios autenticados pueden ver transferencias de su empresa" 
    ON transferencias_erp FOR SELECT 
    USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Usuarios autenticados pueden ver existencias de su empresa" 
    ON inv_existencias FOR SELECT 
    USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE transferencias_erp IS 'Transferencias de stock entre almacenes';
COMMENT ON TABLE inv_existencias IS 'Stock actual por producto/almacén/ubicación';
COMMENT ON TABLE inv_ubicaciones IS 'Ubicaciones físicas dentro de almacenes';
COMMENT ON TABLE inv_lotes IS 'Trazabilidad por lotes con fechas de caducidad';
COMMENT ON TABLE inv_reservas IS 'Reservas de stock para eventos futuros';
COMMENT ON TABLE inv_conteos_erp IS 'Conteos físicos de inventario';
COMMENT ON TABLE inv_alertas_erp IS 'Alertas de stock bajo, vencimiento, etc.';
COMMENT ON TABLE inv_checklists_erp IS 'Plantillas de checklists de verificación';

-- ============================================================================
-- FIN DEL SCRIPT
-- Para ejecutar: Copiar y pegar en Supabase SQL Editor
-- ============================================================================
