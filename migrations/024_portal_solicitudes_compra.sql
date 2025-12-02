-- =====================================================
-- MIGRACIÓN 024: Portal de Solicitudes de Compra
-- Con autenticación Google Workspace
-- =====================================================

-- 1. Dominios corporativos permitidos
CREATE TABLE IF NOT EXISTS dominios_corporativos_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    dominio VARCHAR(100) NOT NULL, -- Ej: 'tuempresa.com'
    descripcion VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, dominio)
);

-- 2. Usuarios del portal (se crean automáticamente con Google OAuth)
CREATE TABLE IF NOT EXISTS usuarios_portal_erp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    
    -- Datos de Google
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    avatar_url TEXT,
    
    -- Datos organizacionales (pueden editarse después)
    departamento_id INTEGER,
    puesto VARCHAR(100),
    telefono VARCHAR(20),
    extension VARCHAR(10),
    
    -- Permisos de aprobación
    nivel_autorizacion INTEGER DEFAULT 1, -- 1-5
    puede_aprobar BOOLEAN DEFAULT false,
    limite_aprobacion DECIMAL(12,2),
    jefe_directo_id UUID REFERENCES usuarios_portal_erp(id),
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    rol VARCHAR(50) DEFAULT 'solicitante', -- solicitante, aprobador, compras, admin
    primer_acceso BOOLEAN DEFAULT true,
    
    -- Auditoría
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Departamentos (si no existe)
CREATE TABLE IF NOT EXISTS departamentos_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    centro_costos VARCHAR(50),
    responsable_id UUID REFERENCES usuarios_portal_erp(id),
    
    -- Correo del departamento (para notificaciones grupales)
    email_departamento VARCHAR(255), -- ej: compras@empresa.com, operaciones@empresa.com
    
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, codigo)
);

-- 3.1 Tipos de gasto para clasificación y reportes
CREATE TABLE IF NOT EXISTS tipos_gasto_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50), -- 'operativo', 'inversion', 'proyecto', 'evento'
    cuenta_contable VARCHAR(20),
    requiere_proyecto BOOLEAN DEFAULT false,
    requiere_evento BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, codigo)
);

-- 4. Solicitudes de compra
CREATE TABLE IF NOT EXISTS solicitudes_compra_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    numero_solicitud VARCHAR(20) NOT NULL,
    
    -- Solicitante
    solicitante_id UUID NOT NULL REFERENCES usuarios_portal_erp(id),
    departamento_id INTEGER REFERENCES departamentos_erp(id),
    centro_costos VARCHAR(50),
    
    -- Destino/Objetivo
    tipo_destino VARCHAR(20) NOT NULL DEFAULT 'operativo',
    tipo_gasto_id INTEGER REFERENCES tipos_gasto_erp(id), -- Nueva clasificación
    proyecto_id INTEGER,
    evento_id INTEGER,
    objetivo_descripcion TEXT,
    
    -- Urgencia
    prioridad VARCHAR(10) DEFAULT 'normal',
    fecha_requerida DATE,
    
    -- Justificación
    justificacion TEXT NOT NULL,
    impacto_sin_compra TEXT,
    
    -- Presupuesto (sin límite de costo, todo por autorización)
    tiene_presupuesto BOOLEAN DEFAULT false,
    partida_presupuestal VARCHAR(50),
    monto_estimado DECIMAL(12,2) DEFAULT 0,
    monto_aprobado DECIMAL(12,2),
    
    -- Estado y flujo
    estado VARCHAR(30) DEFAULT 'borrador',
    etapa_actual INTEGER DEFAULT 0,
    nivel_aprobacion_requerido INTEGER DEFAULT 1,
    
    -- Resultados
    orden_compra_id INTEGER,
    motivo_rechazo TEXT,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    enviada_at TIMESTAMPTZ,
    cerrada_at TIMESTAMPTZ,
    
    UNIQUE(empresa_id, numero_solicitud),
    CONSTRAINT chk_tipo_destino CHECK (tipo_destino IN ('proyecto', 'evento', 'operativo', 'stock')),
    CONSTRAINT chk_prioridad CHECK (prioridad IN ('normal', 'urgente', 'critica')),
    CONSTRAINT chk_estado CHECK (estado IN (
        'borrador', 'enviada', 'en_revision', 'aprobada', 'rechazada',
        'en_cotizacion', 'orden_generada', 'en_transito', 'recibida', 'cerrada', 'cancelada'
    ))
);

-- 5. Items de la solicitud
CREATE TABLE IF NOT EXISTS solicitudes_compra_items_erp (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes_compra_erp(id) ON DELETE CASCADE,
    
    -- Descripción del item
    descripcion TEXT NOT NULL,
    especificaciones TEXT,
    cantidad DECIMAL(12,4) NOT NULL DEFAULT 1,
    unidad_medida VARCHAR(20) DEFAULT 'PZA',
    
    -- Precio estimado
    precio_referencia DECIMAL(12,2),
    subtotal_estimado DECIMAL(12,2),
    
    -- Sugerencias
    proveedor_sugerido_id INTEGER,
    proveedor_sugerido_nombre VARCHAR(255),
    url_referencia TEXT,
    imagen_url TEXT,
    
    notas TEXT,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Flujo de aprobaciones
CREATE TABLE IF NOT EXISTS solicitudes_aprobaciones_erp (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes_compra_erp(id) ON DELETE CASCADE,
    
    nivel INTEGER NOT NULL,
    rol_requerido VARCHAR(50),
    
    aprobador_id UUID REFERENCES usuarios_portal_erp(id),
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_accion TIMESTAMPTZ,
    comentarios TEXT,
    
    -- Delegación
    delegado_por UUID REFERENCES usuarios_portal_erp(id),
    motivo_delegacion TEXT,
    
    -- Recordatorios
    recordatorio_enviado BOOLEAN DEFAULT false,
    fecha_recordatorio TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_estado_aprobacion CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'delegada'))
);

-- 7. Historial de acciones
CREATE TABLE IF NOT EXISTS solicitudes_historial_erp (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes_compra_erp(id) ON DELETE CASCADE,
    
    usuario_id UUID REFERENCES usuarios_portal_erp(id),
    tipo_accion VARCHAR(50) NOT NULL,
    descripcion TEXT,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),
    datos_adicionales JSONB,
    ip_address VARCHAR(45),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Adjuntos
CREATE TABLE IF NOT EXISTS solicitudes_adjuntos_erp (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes_compra_erp(id) ON DELETE CASCADE,
    
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_archivo VARCHAR(100),
    tamano_bytes INTEGER,
    url_archivo TEXT NOT NULL,
    
    subido_por UUID REFERENCES usuarios_portal_erp(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Configuración de niveles de aprobación
CREATE TABLE IF NOT EXISTS config_aprobacion_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    
    nivel INTEGER NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    monto_minimo DECIMAL(12,2) NOT NULL DEFAULT 0,
    monto_maximo DECIMAL(12,2),
    
    roles_aprobadores TEXT[],
    requiere_todos BOOLEAN DEFAULT false,
    tiempo_limite_horas INTEGER DEFAULT 48,
    
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(empresa_id, nivel)
);

-- 10. Notificaciones del portal
CREATE TABLE IF NOT EXISTS notificaciones_portal_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    usuario_id UUID NOT NULL REFERENCES usuarios_portal_erp(id),
    
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT,
    url_accion VARCHAR(255),
    solicitud_id INTEGER REFERENCES solicitudes_compra_erp(id),
    
    leida BOOLEAN DEFAULT false,
    fecha_leida TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Centro de Mensajes - Comunicación entre usuarios
CREATE TABLE IF NOT EXISTS mensajes_portal_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    
    -- Contexto
    solicitud_id INTEGER REFERENCES solicitudes_compra_erp(id),
    hilo_id INTEGER REFERENCES mensajes_portal_erp(id), -- Para respuestas
    
    -- Remitente y destinatarios
    remitente_id UUID NOT NULL REFERENCES usuarios_portal_erp(id),
    destinatario_id UUID REFERENCES usuarios_portal_erp(id), -- NULL = para todos los involucrados
    destinatario_departamento_id INTEGER REFERENCES departamentos_erp(id), -- Para mensajes a departamento
    
    -- Contenido
    asunto VARCHAR(255),
    mensaje TEXT NOT NULL,
    tipo_mensaje VARCHAR(30) DEFAULT 'comentario', -- comentario, pregunta, respuesta, alerta, sistema
    
    -- Adjuntos
    tiene_adjuntos BOOLEAN DEFAULT false,
    
    -- Estado
    leido BOOLEAN DEFAULT false,
    fecha_leido TIMESTAMPTZ,
    importante BOOLEAN DEFAULT false,
    archivado BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Adjuntos de mensajes
CREATE TABLE IF NOT EXISTS mensajes_adjuntos_erp (
    id SERIAL PRIMARY KEY,
    mensaje_id INTEGER NOT NULL REFERENCES mensajes_portal_erp(id) ON DELETE CASCADE,
    
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_archivo VARCHAR(100),
    tamano_bytes INTEGER,
    url_archivo TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Categorías de reportes para gastos
CREATE TABLE IF NOT EXISTS reportes_gastos_config_erp (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo_reporte VARCHAR(50) NOT NULL, -- 'por_departamento', 'por_tipo_gasto', 'por_evento', 'por_proyecto', 'comparativo'
    filtros_json JSONB, -- Configuración de filtros
    columnas_json JSONB, -- Columnas a mostrar
    orden INTEGER DEFAULT 0,
    
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_portal_email ON usuarios_portal_erp(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_portal_empresa ON usuarios_portal_erp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_portal_google ON usuarios_portal_erp(google_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_empresa ON solicitudes_compra_erp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_solicitante ON solicitudes_compra_erp(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_compra_erp(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha ON solicitudes_compra_erp(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aprobaciones_solicitud ON solicitudes_aprobaciones_erp(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_aprobador ON solicitudes_aprobaciones_erp(aprobador_id);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_pendientes ON solicitudes_aprobaciones_erp(aprobador_id, estado) 
    WHERE estado = 'pendiente';

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones_portal_erp(usuario_id, leida);

-- Índices para centro de mensajes
CREATE INDEX IF NOT EXISTS idx_mensajes_solicitud ON mensajes_portal_erp(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario ON mensajes_portal_erp(destinatario_id, leido);
CREATE INDEX IF NOT EXISTS idx_mensajes_remitente ON mensajes_portal_erp(remitente_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_hilo ON mensajes_portal_erp(hilo_id);

-- Índices para tipos de gasto
CREATE INDEX IF NOT EXISTS idx_tipos_gasto_empresa ON tipos_gasto_erp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_tipo_gasto ON solicitudes_compra_erp(tipo_gasto_id);

-- =====================================================
-- FUNCIONES
-- =====================================================

-- Función para generar número de solicitud
CREATE OR REPLACE FUNCTION generar_numero_solicitud(p_empresa_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INTEGER;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(numero_solicitud FROM 'SC-\d{4}-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM solicitudes_compra_erp
    WHERE empresa_id = p_empresa_id
    AND numero_solicitud LIKE 'SC-' || v_year || '-%';
    
    RETURN 'SC-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para determinar nivel de aprobación requerido
CREATE OR REPLACE FUNCTION determinar_nivel_aprobacion(p_empresa_id UUID, p_monto DECIMAL)
RETURNS INTEGER AS $$
DECLARE
    v_nivel INTEGER;
BEGIN
    SELECT nivel INTO v_nivel
    FROM config_aprobacion_erp
    WHERE empresa_id = p_empresa_id
    AND activo = true
    AND p_monto >= monto_minimo
    AND (monto_maximo IS NULL OR p_monto <= monto_maximo)
    ORDER BY nivel DESC
    LIMIT 1;
    
    RETURN COALESCE(v_nivel, 1);
END;
$$ LANGUAGE plpgsql;

-- Función para crear o actualizar usuario desde Google
CREATE OR REPLACE FUNCTION upsert_usuario_google(
    p_empresa_id UUID,
    p_google_id VARCHAR,
    p_email VARCHAR,
    p_nombre_completo VARCHAR,
    p_nombre VARCHAR,
    p_apellido VARCHAR,
    p_avatar_url TEXT
)
RETURNS usuarios_portal_erp AS $$
DECLARE
    v_usuario usuarios_portal_erp;
BEGIN
    -- Intentar actualizar si existe
    UPDATE usuarios_portal_erp
    SET 
        nombre_completo = p_nombre_completo,
        nombre = p_nombre,
        apellido = p_apellido,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        ultimo_acceso = NOW(),
        updated_at = NOW()
    WHERE google_id = p_google_id OR email = p_email
    RETURNING * INTO v_usuario;
    
    -- Si no existe, crear nuevo
    IF v_usuario.id IS NULL THEN
        INSERT INTO usuarios_portal_erp (
            empresa_id, google_id, email, nombre_completo, 
            nombre, apellido, avatar_url, ultimo_acceso
        ) VALUES (
            p_empresa_id, p_google_id, p_email, p_nombre_completo,
            p_nombre, p_apellido, p_avatar_url, NOW()
        )
        RETURNING * INTO v_usuario;
    END IF;
    
    RETURN v_usuario;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular subtotal de items
CREATE OR REPLACE FUNCTION calcular_subtotal_item()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal_estimado := NEW.cantidad * COALESCE(NEW.precio_referencia, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_subtotal_item ON solicitudes_compra_items_erp;
CREATE TRIGGER trg_calcular_subtotal_item
    BEFORE INSERT OR UPDATE ON solicitudes_compra_items_erp
    FOR EACH ROW EXECUTE FUNCTION calcular_subtotal_item();

-- Trigger para actualizar monto estimado de solicitud
CREATE OR REPLACE FUNCTION actualizar_monto_solicitud()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE solicitudes_compra_erp
    SET 
        monto_estimado = (
            SELECT COALESCE(SUM(subtotal_estimado), 0)
            FROM solicitudes_compra_items_erp
            WHERE solicitud_id = COALESCE(NEW.solicitud_id, OLD.solicitud_id)
        ),
        nivel_aprobacion_requerido = determinar_nivel_aprobacion(
            empresa_id,
            (SELECT COALESCE(SUM(subtotal_estimado), 0)
             FROM solicitudes_compra_items_erp
             WHERE solicitud_id = COALESCE(NEW.solicitud_id, OLD.solicitud_id))
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.solicitud_id, OLD.solicitud_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_monto_solicitud ON solicitudes_compra_items_erp;
CREATE TRIGGER trg_actualizar_monto_solicitud
    AFTER INSERT OR UPDATE OR DELETE ON solicitudes_compra_items_erp
    FOR EACH ROW EXECUTE FUNCTION actualizar_monto_solicitud();

-- Trigger para registrar historial
CREATE OR REPLACE FUNCTION registrar_historial_solicitud()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.estado != NEW.estado THEN
        INSERT INTO solicitudes_historial_erp (
            solicitud_id, usuario_id, tipo_accion,
            estado_anterior, estado_nuevo, descripcion
        ) VALUES (
            NEW.id, NEW.solicitante_id, 'cambio_estado',
            OLD.estado, NEW.estado, 
            'Estado cambiado de ' || OLD.estado || ' a ' || NEW.estado
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_historial_solicitud ON solicitudes_compra_erp;
CREATE TRIGGER trg_historial_solicitud
    AFTER UPDATE ON solicitudes_compra_erp
    FOR EACH ROW EXECUTE FUNCTION registrar_historial_solicitud();

-- Función para crear notificación automática cuando cambia estado
CREATE OR REPLACE FUNCTION notificar_cambio_estado()
RETURNS TRIGGER AS $$
DECLARE
    v_titulo VARCHAR(255);
    v_mensaje TEXT;
    v_tipo VARCHAR(50);
BEGIN
    -- Solo si cambió el estado
    IF OLD.estado = NEW.estado THEN
        RETURN NEW;
    END IF;
    
    -- Determinar mensaje según estado
    CASE NEW.estado
        WHEN 'aprobada' THEN
            v_tipo := 'aprobacion';
            v_titulo := '✅ Solicitud Aprobada';
            v_mensaje := 'Tu solicitud ' || NEW.numero_solicitud || ' ha sido aprobada.';
        WHEN 'rechazada' THEN
            v_tipo := 'rechazo';
            v_titulo := '❌ Solicitud Rechazada';
            v_mensaje := 'Tu solicitud ' || NEW.numero_solicitud || ' ha sido rechazada. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado');
        WHEN 'en_revision' THEN
            v_tipo := 'info';
            v_titulo := '👁️ Solicitud en Revisión';
            v_mensaje := 'Tu solicitud ' || NEW.numero_solicitud || ' está siendo revisada.';
        WHEN 'en_cotizacion' THEN
            v_tipo := 'info';
            v_titulo := '💰 Solicitud en Cotización';
            v_mensaje := 'Tu solicitud ' || NEW.numero_solicitud || ' está en proceso de cotización.';
        WHEN 'orden_generada' THEN
            v_tipo := 'info';
            v_titulo := '📋 Orden de Compra Generada';
            v_mensaje := 'Se ha generado la orden de compra para tu solicitud ' || NEW.numero_solicitud || '.';
        WHEN 'recibida' THEN
            v_tipo := 'exito';
            v_titulo := '📦 Compra Recibida';
            v_mensaje := 'Los artículos de tu solicitud ' || NEW.numero_solicitud || ' han sido recibidos.';
        ELSE
            RETURN NEW;
    END CASE;
    
    -- Crear notificación para el solicitante
    INSERT INTO notificaciones_portal_erp (
        empresa_id, usuario_id, tipo, titulo, mensaje, url_accion, solicitud_id
    ) VALUES (
        NEW.empresa_id,
        NEW.solicitante_id,
        v_tipo,
        v_titulo,
        v_mensaje,
        '/portal/solicitudes/' || NEW.id,
        NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificar_cambio_estado ON solicitudes_compra_erp;
CREATE TRIGGER trg_notificar_cambio_estado
    AFTER UPDATE ON solicitudes_compra_erp
    FOR EACH ROW EXECUTE FUNCTION notificar_cambio_estado();

-- Función para notificar a aprobadores cuando hay solicitud pendiente
CREATE OR REPLACE FUNCTION notificar_aprobadores_pendiente()
RETURNS TRIGGER AS $$
DECLARE
    v_aprobador RECORD;
BEGIN
    -- Solo cuando se envía la solicitud
    IF OLD.estado = 'borrador' AND NEW.estado = 'enviada' THEN
        -- Buscar aprobadores del departamento o nivel correspondiente
        FOR v_aprobador IN 
            SELECT u.id, u.email
            FROM usuarios_portal_erp u
            WHERE u.empresa_id = NEW.empresa_id
            AND u.puede_aprobar = true
            AND u.nivel_autorizacion >= NEW.nivel_aprobacion_requerido
            AND u.activo = true
            LIMIT 5 -- Máximo 5 aprobadores
        LOOP
            INSERT INTO notificaciones_portal_erp (
                empresa_id, usuario_id, tipo, titulo, mensaje, url_accion, solicitud_id
            ) VALUES (
                NEW.empresa_id,
                v_aprobador.id,
                'pendiente_aprobacion',
                '🔔 Nueva Solicitud Pendiente',
                'Hay una nueva solicitud de compra ' || NEW.numero_solicitud || ' pendiente de tu aprobación.',
                '/portal/aprobaciones',
                NEW.id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificar_aprobadores ON solicitudes_compra_erp;
CREATE TRIGGER trg_notificar_aprobadores
    AFTER UPDATE ON solicitudes_compra_erp
    FOR EACH ROW EXECUTE FUNCTION notificar_aprobadores_pendiente();

-- Vista para reportes de gastos por tipo
CREATE OR REPLACE VIEW vw_reporte_gastos_por_tipo AS
SELECT 
    s.empresa_id,
    tg.id as tipo_gasto_id,
    tg.codigo as tipo_gasto_codigo,
    tg.nombre as tipo_gasto_nombre,
    tg.categoria,
    DATE_TRUNC('month', s.created_at) as mes,
    COUNT(*) as cantidad_solicitudes,
    SUM(s.monto_estimado) as monto_total_estimado,
    SUM(s.monto_aprobado) as monto_total_aprobado,
    COUNT(CASE WHEN s.estado = 'aprobada' THEN 1 END) as aprobadas,
    COUNT(CASE WHEN s.estado = 'rechazada' THEN 1 END) as rechazadas,
    COUNT(CASE WHEN s.estado IN ('enviada', 'en_revision') THEN 1 END) as pendientes
FROM solicitudes_compra_erp s
LEFT JOIN tipos_gasto_erp tg ON s.tipo_gasto_id = tg.id
WHERE s.estado != 'borrador'
GROUP BY s.empresa_id, tg.id, tg.codigo, tg.nombre, tg.categoria, DATE_TRUNC('month', s.created_at);

-- Vista para reportes de gastos por evento
CREATE OR REPLACE VIEW vw_reporte_gastos_por_evento AS
SELECT 
    s.empresa_id,
    s.evento_id,
    e.nombre_proyecto as evento_nombre,
    e.fecha_inicio,
    e.fecha_fin,
    COUNT(*) as cantidad_solicitudes,
    SUM(s.monto_estimado) as monto_total_estimado,
    SUM(s.monto_aprobado) as monto_total_aprobado,
    COUNT(CASE WHEN s.estado = 'aprobada' THEN 1 END) as aprobadas,
    COUNT(CASE WHEN s.estado = 'rechazada' THEN 1 END) as rechazadas,
    COUNT(CASE WHEN s.estado = 'recibida' THEN 1 END) as completadas
FROM solicitudes_compra_erp s
LEFT JOIN eventos e ON s.evento_id = e.id
WHERE s.tipo_destino = 'evento' AND s.estado != 'borrador'
GROUP BY s.empresa_id, s.evento_id, e.nombre_proyecto, e.fecha_inicio, e.fecha_fin;

-- Vista para reportes de gastos por departamento
CREATE OR REPLACE VIEW vw_reporte_gastos_por_departamento AS
SELECT 
    s.empresa_id,
    d.id as departamento_id,
    d.codigo as departamento_codigo,
    d.nombre as departamento_nombre,
    d.centro_costos,
    DATE_TRUNC('month', s.created_at) as mes,
    COUNT(*) as cantidad_solicitudes,
    SUM(s.monto_estimado) as monto_total_estimado,
    SUM(s.monto_aprobado) as monto_total_aprobado,
    COUNT(CASE WHEN s.estado = 'aprobada' THEN 1 END) as aprobadas,
    COUNT(CASE WHEN s.estado = 'rechazada' THEN 1 END) as rechazadas
FROM solicitudes_compra_erp s
LEFT JOIN departamentos_erp d ON s.departamento_id = d.id
WHERE s.estado != 'borrador'
GROUP BY s.empresa_id, d.id, d.codigo, d.nombre, d.centro_costos, DATE_TRUNC('month', s.created_at);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar configuración de niveles de aprobación por defecto
INSERT INTO config_aprobacion_erp (empresa_id, nivel, nombre, descripcion, monto_minimo, monto_maximo, roles_aprobadores, tiempo_limite_horas)
SELECT 
    id,
    1,
    'Jefe Inmediato',
    'Aprobación para compras menores',
    0,
    5000,
    ARRAY['jefe_departamento', 'supervisor'],
    24
FROM empresas
WHERE NOT EXISTS (SELECT 1 FROM config_aprobacion_erp WHERE nivel = 1 AND empresa_id = empresas.id)
LIMIT 1;

INSERT INTO config_aprobacion_erp (empresa_id, nivel, nombre, descripcion, monto_minimo, monto_maximo, roles_aprobadores, tiempo_limite_horas)
SELECT 
    id,
    2,
    'Gerente de Área',
    'Aprobación para compras medianas',
    5001,
    25000,
    ARRAY['gerente'],
    48
FROM empresas
WHERE NOT EXISTS (SELECT 1 FROM config_aprobacion_erp WHERE nivel = 2 AND empresa_id = empresas.id)
LIMIT 1;

INSERT INTO config_aprobacion_erp (empresa_id, nivel, nombre, descripcion, monto_minimo, monto_maximo, roles_aprobadores, tiempo_limite_horas)
SELECT 
    id,
    3,
    'Director',
    'Aprobación para compras importantes',
    25001,
    100000,
    ARRAY['director'],
    72
FROM empresas
WHERE NOT EXISTS (SELECT 1 FROM config_aprobacion_erp WHERE nivel = 3 AND empresa_id = empresas.id)
LIMIT 1;

INSERT INTO config_aprobacion_erp (empresa_id, nivel, nombre, descripcion, monto_minimo, monto_maximo, roles_aprobadores, tiempo_limite_horas)
SELECT 
    id,
    4,
    'Dirección General + Finanzas',
    'Aprobación para compras mayores',
    100001,
    500000,
    ARRAY['director_general', 'finanzas'],
    96
FROM empresas
WHERE NOT EXISTS (SELECT 1 FROM config_aprobacion_erp WHERE nivel = 4 AND empresa_id = empresas.id)
LIMIT 1;

INSERT INTO config_aprobacion_erp (empresa_id, nivel, nombre, descripcion, monto_minimo, monto_maximo, roles_aprobadores, tiempo_limite_horas)
SELECT 
    id,
    5,
    'Comité de Compras',
    'Aprobación para compras extraordinarias',
    500001,
    NULL,
    ARRAY['comite_compras'],
    168
FROM empresas
WHERE NOT EXISTS (SELECT 1 FROM config_aprobacion_erp WHERE nivel = 5 AND empresa_id = empresas.id)
LIMIT 1;

-- Insertar algunos departamentos de ejemplo
INSERT INTO departamentos_erp (empresa_id, codigo, nombre, centro_costos)
SELECT id, 'ADM', 'Administración', 'CC-001' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM departamentos_erp WHERE codigo = 'ADM') LIMIT 1;

INSERT INTO departamentos_erp (empresa_id, codigo, nombre, centro_costos)
SELECT id, 'OPS', 'Operaciones', 'CC-002' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM departamentos_erp WHERE codigo = 'OPS') LIMIT 1;

INSERT INTO departamentos_erp (empresa_id, codigo, nombre, centro_costos)
SELECT id, 'VEN', 'Ventas', 'CC-003' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM departamentos_erp WHERE codigo = 'VEN') LIMIT 1;

INSERT INTO departamentos_erp (empresa_id, codigo, nombre, centro_costos)
SELECT id, 'PRO', 'Producción', 'CC-004' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM departamentos_erp WHERE codigo = 'PRO') LIMIT 1;

INSERT INTO departamentos_erp (empresa_id, codigo, nombre, centro_costos)
SELECT id, 'MKT', 'Marketing', 'CC-005' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM departamentos_erp WHERE codigo = 'MKT') LIMIT 1;

INSERT INTO departamentos_erp (empresa_id, codigo, nombre, centro_costos)
SELECT id, 'TI', 'Tecnología', 'CC-006' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM departamentos_erp WHERE codigo = 'TI') LIMIT 1;

-- Tipos de gasto iniciales
INSERT INTO tipos_gasto_erp (empresa_id, codigo, nombre, descripcion, categoria)
SELECT id, 'MAT', 'Materiales', 'Materiales para producción u operación', 'operativo' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto_erp WHERE codigo = 'MAT') LIMIT 1;

INSERT INTO tipos_gasto_erp (empresa_id, codigo, nombre, descripcion, categoria)
SELECT id, 'SRV', 'Servicios', 'Servicios profesionales y contratados', 'operativo' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto_erp WHERE codigo = 'SRV') LIMIT 1;

INSERT INTO tipos_gasto_erp (empresa_id, codigo, nombre, descripcion, categoria)
SELECT id, 'EQP', 'Equipos', 'Equipos y maquinaria', 'inversion' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto_erp WHERE codigo = 'EQP') LIMIT 1;

INSERT INTO tipos_gasto_erp (empresa_id, codigo, nombre, descripcion, categoria)
SELECT id, 'TEC', 'Tecnología', 'Software, hardware y servicios TI', 'inversion' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto_erp WHERE codigo = 'TEC') LIMIT 1;

INSERT INTO tipos_gasto_erp (empresa_id, codigo, nombre, descripcion, categoria, requiere_evento)
SELECT id, 'EVT', 'Evento', 'Gastos relacionados con eventos', 'evento', true FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto_erp WHERE codigo = 'EVT') LIMIT 1;

INSERT INTO tipos_gasto_erp (empresa_id, codigo, nombre, descripcion, categoria, requiere_proyecto)
SELECT id, 'PRY', 'Proyecto', 'Gastos de proyectos específicos', 'proyecto', true FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto_erp WHERE codigo = 'PRY') LIMIT 1;

INSERT INTO tipos_gasto_erp (empresa_id, codigo, nombre, descripcion, categoria)
SELECT id, 'MNT', 'Mantenimiento', 'Mantenimiento y reparaciones', 'operativo' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto_erp WHERE codigo = 'MNT') LIMIT 1;

INSERT INTO tipos_gasto_erp (empresa_id, codigo, nombre, descripcion, categoria)
SELECT id, 'OFI', 'Oficina', 'Papelería y suministros de oficina', 'operativo' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto_erp WHERE codigo = 'OFI') LIMIT 1;

INSERT INTO tipos_gasto_erp (empresa_id, codigo, nombre, descripcion, categoria)
SELECT id, 'VIA', 'Viáticos', 'Gastos de viaje y hospedaje', 'operativo' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto_erp WHERE codigo = 'VIA') LIMIT 1;

INSERT INTO tipos_gasto_erp (empresa_id, codigo, nombre, descripcion, categoria)
SELECT id, 'OTR', 'Otros', 'Otros gastos no clasificados', 'operativo' FROM empresas 
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto_erp WHERE codigo = 'OTR') LIMIT 1;

-- =====================================================
-- RLS (Row Level Security)
-- NOTA: DESACTIVADO DURANTE DESARROLLO
-- Activar antes de producción
-- =====================================================

-- DESACTIVADO TEMPORALMENTE PARA DESARROLLO
-- ALTER TABLE usuarios_portal_erp ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE solicitudes_compra_erp ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE solicitudes_compra_items_erp ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE solicitudes_aprobaciones_erp ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notificaciones_portal_erp ENABLE ROW LEVEL SECURITY;

ALTER TABLE usuarios_portal_erp DISABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_compra_erp DISABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_compra_items_erp DISABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_aprobaciones_erp DISABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_portal_erp DISABLE ROW LEVEL SECURITY;

-- Las políticas están definidas pero no activas hasta habilitar RLS
/*
-- Políticas para usuarios del portal
CREATE POLICY "Usuarios pueden ver usuarios de su empresa"
    ON usuarios_portal_erp FOR SELECT
    USING (empresa_id IN (
        SELECT empresa_id FROM usuarios_portal_erp WHERE id = auth.uid()
    ));

-- Políticas para solicitudes
CREATE POLICY "Usuarios pueden ver sus propias solicitudes"
    ON solicitudes_compra_erp FOR SELECT
    USING (
        solicitante_id = auth.uid()
        OR empresa_id IN (
            SELECT empresa_id FROM usuarios_portal_erp 
            WHERE id = auth.uid() AND (puede_aprobar = true OR rol IN ('compras', 'admin'))
        )
    );

CREATE POLICY "Usuarios pueden crear solicitudes"
    ON solicitudes_compra_erp FOR INSERT
    WITH CHECK (solicitante_id = auth.uid());

CREATE POLICY "Usuarios pueden editar sus solicitudes en borrador"
    ON solicitudes_compra_erp FOR UPDATE
    USING (solicitante_id = auth.uid() AND estado = 'borrador');
*/

-- Comentario final
COMMENT ON TABLE solicitudes_compra_erp IS 'Portal de Solicitudes de Compra - Permite a ejecutivos solicitar compras con flujo de aprobación';
COMMENT ON TABLE usuarios_portal_erp IS 'Usuarios del portal de solicitudes - Se crean automáticamente con Google OAuth';

