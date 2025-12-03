-- ============================================
-- FASE 6: Administración de Empresas y Módulos
-- Migración: 20241203_admin_empresas_modulos.sql
-- ============================================

-- ============================================
-- 1. ACTUALIZAR TABLA DE EMPRESAS
-- ============================================

-- Agregar campos para branding y configuración
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS razon_social VARCHAR(255);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS nombre_comercial VARCHAR(255);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS regimen_fiscal VARCHAR(100);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS estado VARCHAR(100);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS colonia VARCHAR(200);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS calle VARCHAR(255);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS numero_exterior VARCHAR(20);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS numero_interior VARCHAR(20);

-- Campos de branding
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS logo_principal_url TEXT;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS logo_secundario_url TEXT;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS membrete_url TEXT;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS firma_digital_url TEXT;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS sello_empresa_url TEXT;

-- Configuración visual
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS color_primario VARCHAR(7) DEFAULT '#006FEE';
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS color_secundario VARCHAR(7) DEFAULT '#17C964';
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS color_acento VARCHAR(7) DEFAULT '#F5A524';

-- Configuración de documentos
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS pie_pagina_documentos TEXT;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS terminos_condiciones TEXT;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS aviso_privacidad TEXT;

-- Datos de contacto adicionales
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS sitio_web VARCHAR(255);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS email_facturacion VARCHAR(255);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS email_soporte VARCHAR(255);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS telefono_secundario VARCHAR(20);
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);

-- Configuración de plan
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS plan_tipo VARCHAR(20) DEFAULT 'basic'; -- basic, pro, enterprise
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS plan_fecha_inicio DATE;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS plan_fecha_fin DATE;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS max_usuarios INTEGER DEFAULT 5;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS max_almacenamiento_gb INTEGER DEFAULT 5;

-- Metadata
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS configuracion_extra JSONB DEFAULT '{}';
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE core_companies ADD COLUMN IF NOT EXISTS updated_by UUID;

-- ============================================
-- 2. TABLA DE MÓDULOS DEL SISTEMA
-- ============================================

CREATE TABLE IF NOT EXISTS core_modulos_sistema (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    ruta_base VARCHAR(100),
    orden INTEGER DEFAULT 0,
    categoria VARCHAR(50), -- operaciones, finanzas, admin, reportes
    es_core BOOLEAN DEFAULT false, -- Módulos que siempre están activos
    requiere_plan VARCHAR(20) DEFAULT 'basic', -- basic, pro, enterprise
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar módulos del sistema
INSERT INTO core_modulos_sistema (codigo, nombre, descripcion, icono, ruta_base, orden, categoria, es_core, requiere_plan) VALUES
-- Core (siempre activos)
('dashboard', 'Dashboard', 'Panel principal con KPIs', 'LayoutDashboard', '/dashboard', 1, 'core', true, 'basic'),
('configuracion', 'Configuración', 'Configuración del sistema', 'Settings', '/configuracion', 99, 'core', true, 'basic'),

-- Operaciones
('eventos', 'Gestión de Eventos', 'Administración de eventos y proyectos', 'Calendar', '/eventos', 10, 'operaciones', false, 'basic'),
('inventario', 'Inventario', 'Control de almacenes y productos', 'Package', '/inventario', 11, 'operaciones', false, 'basic'),
('crm', 'CRM / Clientes', 'Gestión de clientes y prospectos', 'Users', '/crm', 12, 'operaciones', false, 'basic'),
('proyectos', 'Proyectos', 'Gestión de proyectos y tareas', 'FolderKanban', '/proyectos', 13, 'operaciones', false, 'pro'),

-- Finanzas
('facturacion', 'Facturación CFDI', 'Emisión de facturas electrónicas', 'FileText', '/facturacion', 20, 'finanzas', false, 'pro'),
('contabilidad', 'Contabilidad', 'Gestión contable y pólizas', 'Calculator', '/contabilidad', 21, 'finanzas', false, 'pro'),
('tesoreria', 'Tesorería', 'Control de bancos y flujo de efectivo', 'Wallet', '/tesoreria', 22, 'finanzas', false, 'pro'),
('compras', 'Compras', 'Órdenes de compra y proveedores', 'ShoppingCart', '/compras', 23, 'finanzas', false, 'basic'),
('gastos', 'Control de Gastos', 'Registro y control de gastos', 'Receipt', '/gastos', 24, 'finanzas', false, 'basic'),

-- Recursos Humanos
('rh', 'Recursos Humanos', 'Gestión de personal y nómina', 'UserCog', '/rh', 30, 'rh', false, 'enterprise'),
('nomina', 'Nómina', 'Cálculo y timbrado de nómina', 'DollarSign', '/nomina', 31, 'rh', false, 'enterprise'),

-- Integraciones
('portal-clientes', 'Portal de Clientes', 'Acceso externo para clientes', 'Globe', '/portal-clientes', 40, 'integraciones', false, 'pro'),
('webhooks', 'Webhooks', 'Integraciones y notificaciones', 'Webhook', '/webhooks', 41, 'integraciones', false, 'pro'),
('api', 'API Externa', 'Acceso API REST', 'Code', '/api', 42, 'integraciones', false, 'enterprise'),

-- Reportes
('reportes', 'Reportes', 'Reportes y analytics', 'BarChart3', '/reportes', 50, 'reportes', false, 'basic'),
('bi', 'Business Intelligence', 'Dashboards avanzados', 'TrendingUp', '/bi', 51, 'reportes', false, 'enterprise'),

-- Admin
('admin-usuarios', 'Administración de Usuarios', 'Gestión de usuarios y roles', 'Shield', '/admin/usuarios', 90, 'admin', false, 'basic'),
('admin-empresas', 'Administración de Empresas', 'Gestión multi-empresa', 'Building2', '/admin/empresas', 91, 'admin', false, 'enterprise'),
('auditoria', 'Auditoría', 'Logs y trazabilidad', 'FileSearch', '/admin/auditoria', 92, 'admin', false, 'pro')

ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    icono = EXCLUDED.icono,
    ruta_base = EXCLUDED.ruta_base,
    orden = EXCLUDED.orden,
    categoria = EXCLUDED.categoria,
    es_core = EXCLUDED.es_core,
    requiere_plan = EXCLUDED.requiere_plan;

-- ============================================
-- 3. TABLA DE MÓDULOS POR EMPRESA
-- ============================================

CREATE TABLE IF NOT EXISTS core_company_modules (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    modulo_id INTEGER NOT NULL REFERENCES core_modulos_sistema(id) ON DELETE CASCADE,
    habilitado BOOLEAN DEFAULT true,
    fecha_activacion DATE,
    fecha_expiracion DATE,
    limite_registros INTEGER, -- NULL = sin límite
    limite_usuarios INTEGER,  -- NULL = sin límite
    configuracion JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    UNIQUE(company_id, modulo_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_modules_company ON core_company_modules(company_id);
CREATE INDEX IF NOT EXISTS idx_company_modules_habilitado ON core_company_modules(habilitado);

-- ============================================
-- 4. TABLA DE ROLES POR EMPRESA
-- ============================================

CREATE TABLE IF NOT EXISTS core_roles_empresa (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    permisos JSONB NOT NULL DEFAULT '[]',
    color VARCHAR(7) DEFAULT '#006FEE',
    es_predeterminado BOOLEAN DEFAULT false,
    es_admin BOOLEAN DEFAULT false,
    puede_eliminar BOOLEAN DEFAULT true, -- false para roles del sistema
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    UNIQUE(company_id, nombre)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_roles_empresa_company ON core_roles_empresa(company_id);
CREATE INDEX IF NOT EXISTS idx_roles_empresa_activo ON core_roles_empresa(activo);

-- ============================================
-- 5. TABLA DE SOLICITUDES DE ACCESO (migrada)
-- ============================================

CREATE TABLE IF NOT EXISTS core_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255),
    avatar_url TEXT,
    empresa_solicitada VARCHAR(255),
    puesto_solicitado VARCHAR(100),
    motivo TEXT,
    telefono VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobada', 'rechazada', 'expirada')),
    role_id INTEGER REFERENCES core_roles(id),
    company_id UUID REFERENCES core_companies(id),
    revisado_por UUID REFERENCES core_users(id),
    fecha_revision TIMESTAMPTZ,
    motivo_rechazo TEXT,
    notas_admin TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON core_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON core_access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_created ON core_access_requests(created_at DESC);

-- ============================================
-- 6. TABLA DE ARCHIVOS DE EMPRESA (branding)
-- ============================================

CREATE TABLE IF NOT EXISTS core_company_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- logo_principal, logo_secundario, membrete, favicon, firma, sello, documento
    nombre_original VARCHAR(255) NOT NULL,
    nombre_storage VARCHAR(255) NOT NULL, -- nombre en el bucket
    url TEXT NOT NULL,
    mime_type VARCHAR(100),
    size_bytes INTEGER,
    width INTEGER, -- para imágenes
    height INTEGER,
    metadata JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_files_company ON core_company_files(company_id);
CREATE INDEX IF NOT EXISTS idx_company_files_tipo ON core_company_files(tipo);

-- ============================================
-- 7. TABLA DE INVITACIONES
-- ============================================

CREATE TABLE IF NOT EXISTS core_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    nombre VARCHAR(255),
    role_id INTEGER REFERENCES core_roles_empresa(id),
    token VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aceptada', 'rechazada', 'expirada', 'cancelada')),
    mensaje_personalizado TEXT,
    enviado_por UUID REFERENCES core_users(id),
    aceptado_por UUID REFERENCES core_users(id),
    fecha_envio TIMESTAMPTZ DEFAULT NOW(),
    fecha_expiracion TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    fecha_aceptacion TIMESTAMPTZ,
    intentos_reenvio INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invitations_company ON core_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON core_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON core_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON core_invitations(status);

-- ============================================
-- 8. VISTA DE EMPRESAS CON ESTADÍSTICAS
-- ============================================

CREATE OR REPLACE VIEW vw_empresas_stats AS
SELECT
    c.id,
    c.nombre,
    c.nombre_comercial,
    c.rfc,
    c.email,
    c.telefono,
    c.logo_principal_url,
    c.plan_tipo,
    c.plan_fecha_fin,
    c.max_usuarios,
    c.activo,
    c.created_at,
    (SELECT COUNT(*) FROM core_users u WHERE u.company_id = c.id AND u.activo = true) as total_usuarios,
    (SELECT COUNT(*) FROM core_company_modules cm WHERE cm.company_id = c.id AND cm.habilitado = true) as modulos_activos,
    (SELECT COUNT(*) FROM core_invitations i WHERE i.company_id = c.id AND i.status = 'pendiente') as invitaciones_pendientes,
    CASE
        WHEN c.plan_fecha_fin IS NULL THEN 'sin_expiracion'
        WHEN c.plan_fecha_fin < CURRENT_DATE THEN 'expirado'
        WHEN c.plan_fecha_fin < CURRENT_DATE + INTERVAL '30 days' THEN 'por_expirar'
        ELSE 'activo'
    END as estado_plan
FROM core_companies c;

-- ============================================
-- 9. VISTA DE USUARIOS CON EMPRESA Y ROL
-- ============================================

CREATE OR REPLACE VIEW vw_usuarios_completo AS
SELECT
    u.id,
    u.email,
    u.nombre,
    u.apellidos,
    u.nombre || ' ' || COALESCE(u.apellidos, '') as nombre_completo,
    u.telefono,
    u.puesto,
    u.avatar_url,
    u.activo,
    u.ultimo_login,
    u.created_at,
    c.id as company_id,
    c.nombre as empresa_nombre,
    c.logo_principal_url as empresa_logo,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', r.id,
            'nombre', r.nombre,
            'es_admin', r.es_admin
        ))
        FROM core_user_roles ur
        JOIN core_roles r ON ur.role_id = r.id
        WHERE ur.user_id = u.id AND ur.activo = true),
        '[]'::json
    ) as roles
FROM core_users u
LEFT JOIN core_companies c ON u.company_id = c.id;

-- ============================================
-- 10. VISTA DE MÓDULOS POR EMPRESA
-- ============================================

CREATE OR REPLACE VIEW vw_modulos_empresa AS
SELECT
    cm.id,
    cm.company_id,
    c.nombre as empresa_nombre,
    m.id as modulo_id,
    m.codigo,
    m.nombre as modulo_nombre,
    m.descripcion,
    m.icono,
    m.ruta_base,
    m.orden,
    m.categoria,
    m.es_core,
    m.requiere_plan,
    cm.habilitado,
    cm.fecha_activacion,
    cm.fecha_expiracion,
    cm.limite_registros,
    cm.limite_usuarios,
    cm.configuracion,
    CASE
        WHEN m.es_core THEN true
        WHEN NOT cm.habilitado THEN false
        WHEN cm.fecha_expiracion IS NOT NULL AND cm.fecha_expiracion < CURRENT_DATE THEN false
        ELSE true
    END as acceso_permitido
FROM core_modulos_sistema m
CROSS JOIN core_companies c
LEFT JOIN core_company_modules cm ON cm.company_id = c.id AND cm.modulo_id = m.id
WHERE m.activo = true
ORDER BY c.id, m.orden;

-- ============================================
-- 11. FUNCIONES AUXILIARES
-- ============================================

-- Función para obtener módulos habilitados de una empresa
CREATE OR REPLACE FUNCTION get_modulos_empresa(p_company_id UUID)
RETURNS TABLE(
    codigo VARCHAR,
    nombre VARCHAR,
    icono VARCHAR,
    ruta_base VARCHAR,
    categoria VARCHAR,
    habilitado BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.codigo,
        m.nombre,
        m.icono,
        m.ruta_base,
        m.categoria,
        CASE
            WHEN m.es_core THEN true
            WHEN cm.id IS NULL THEN false
            WHEN NOT cm.habilitado THEN false
            WHEN cm.fecha_expiracion IS NOT NULL AND cm.fecha_expiracion < CURRENT_DATE THEN false
            ELSE true
        END as habilitado
    FROM core_modulos_sistema m
    LEFT JOIN core_company_modules cm ON cm.modulo_id = m.id AND cm.company_id = p_company_id
    WHERE m.activo = true
    ORDER BY m.orden;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para activar módulos según plan
CREATE OR REPLACE FUNCTION activar_modulos_plan(
    p_company_id UUID,
    p_plan_tipo VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_modulo RECORD;
BEGIN
    FOR v_modulo IN
        SELECT id, codigo, requiere_plan
        FROM core_modulos_sistema
        WHERE activo = true
    LOOP
        -- Verificar si el módulo está incluido en el plan
        IF v_modulo.requiere_plan = 'basic' OR
           (v_modulo.requiere_plan = 'pro' AND p_plan_tipo IN ('pro', 'enterprise')) OR
           (v_modulo.requiere_plan = 'enterprise' AND p_plan_tipo = 'enterprise') THEN

            INSERT INTO core_company_modules (company_id, modulo_id, habilitado, fecha_activacion)
            VALUES (p_company_id, v_modulo.id, true, CURRENT_DATE)
            ON CONFLICT (company_id, modulo_id) DO UPDATE SET
                habilitado = true,
                fecha_activacion = COALESCE(core_company_modules.fecha_activacion, CURRENT_DATE),
                updated_at = NOW();

            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Función para crear roles predeterminados de empresa
CREATE OR REPLACE FUNCTION crear_roles_empresa(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Administrador
    INSERT INTO core_roles_empresa (company_id, nombre, descripcion, permisos, es_admin, puede_eliminar)
    VALUES (
        p_company_id,
        'Administrador',
        'Acceso total al sistema',
        '["*.*.*.*"]'::jsonb,
        true,
        false
    ) ON CONFLICT (company_id, nombre) DO NOTHING;
    v_count := v_count + 1;

    -- Gerente
    INSERT INTO core_roles_empresa (company_id, nombre, descripcion, permisos, color)
    VALUES (
        p_company_id,
        'Gerente',
        'Gestión de operaciones y reportes',
        '["eventos.*.*.*", "clientes.*.*.*", "inventario.*.*.*", "reportes.*.*.*", "gastos.*.*.*", "ingresos.*.*.*"]'::jsonb,
        '#17C964'
    ) ON CONFLICT (company_id, nombre) DO NOTHING;
    v_count := v_count + 1;

    -- Ejecutivo
    INSERT INTO core_roles_empresa (company_id, nombre, descripcion, permisos, color)
    VALUES (
        p_company_id,
        'Ejecutivo',
        'Operación diaria',
        '["eventos.read.*.*", "eventos.create.*.*", "eventos.update.*.*", "clientes.*.*.*", "gastos.create.*.*", "gastos.read.*.*"]'::jsonb,
        '#F5A524'
    ) ON CONFLICT (company_id, nombre) DO NOTHING;
    v_count := v_count + 1;

    -- Visualizador
    INSERT INTO core_roles_empresa (company_id, nombre, descripcion, permisos, color, es_predeterminado)
    VALUES (
        p_company_id,
        'Visualizador',
        'Solo lectura',
        '["*.read.*.*"]'::jsonb,
        '#71717A',
        true
    ) ON CONFLICT (company_id, nombre) DO NOTHING;
    v_count := v_count + 1;

    -- Contador
    INSERT INTO core_roles_empresa (company_id, nombre, descripcion, permisos, color)
    VALUES (
        p_company_id,
        'Contador',
        'Acceso a módulos financieros',
        '["contabilidad.*.*.*", "facturacion.*.*.*", "gastos.*.*.*", "ingresos.*.*.*", "reportes.read.*.*"]'::jsonb,
        '#0070F0'
    ) ON CONFLICT (company_id, nombre) DO NOTHING;
    v_count := v_count + 1;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 12. TRIGGER PARA NUEVAS EMPRESAS
-- ============================================

CREATE OR REPLACE FUNCTION on_company_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear roles predeterminados
    PERFORM crear_roles_empresa(NEW.id);

    -- Activar módulos según plan
    PERFORM activar_modulos_plan(NEW.id, COALESCE(NEW.plan_tipo, 'basic'));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_created ON core_companies;
CREATE TRIGGER trg_company_created
    AFTER INSERT ON core_companies
    FOR EACH ROW
    EXECUTE FUNCTION on_company_created();

-- ============================================
-- 13. RLS POLICIES
-- ============================================

-- Habilitar RLS
ALTER TABLE core_company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_roles_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_company_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_invitations ENABLE ROW LEVEL SECURITY;

-- Políticas para módulos de empresa
CREATE POLICY "Módulos visibles por empresa" ON core_company_modules
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM core_users WHERE id = auth.uid())
    );

CREATE POLICY "Módulos editables por admin" ON core_company_modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM core_user_roles ur
            JOIN core_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.activo = true
            AND r.nombre = 'Administrador'
        )
    );

-- Políticas para roles de empresa
CREATE POLICY "Roles visibles por empresa" ON core_roles_empresa
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM core_users WHERE id = auth.uid())
    );

CREATE POLICY "Roles editables por admin" ON core_roles_empresa
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM core_user_roles ur
            JOIN core_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.activo = true
            AND r.nombre = 'Administrador'
        )
    );

-- Políticas para archivos de empresa
CREATE POLICY "Archivos visibles por empresa" ON core_company_files
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM core_users WHERE id = auth.uid())
    );

CREATE POLICY "Archivos editables por admin" ON core_company_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM core_user_roles ur
            JOIN core_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.activo = true
            AND r.nombre = 'Administrador'
        )
    );

-- Políticas para invitaciones
CREATE POLICY "Invitaciones visibles por empresa" ON core_invitations
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM core_users WHERE id = auth.uid())
    );

CREATE POLICY "Invitaciones editables por admin" ON core_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM core_user_roles ur
            JOIN core_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.activo = true
            AND r.nombre = 'Administrador'
        )
    );

-- ============================================
-- 14. COMENTARIOS
-- ============================================

COMMENT ON TABLE core_modulos_sistema IS 'Catálogo de módulos disponibles en el sistema';
COMMENT ON TABLE core_company_modules IS 'Módulos habilitados por empresa';
COMMENT ON TABLE core_roles_empresa IS 'Roles personalizados por empresa';
COMMENT ON TABLE core_access_requests IS 'Solicitudes de acceso de nuevos usuarios';
COMMENT ON TABLE core_company_files IS 'Archivos de branding por empresa (logos, membretes)';
COMMENT ON TABLE core_invitations IS 'Invitaciones para nuevos usuarios';

COMMENT ON COLUMN core_companies.logo_principal_url IS 'Logo principal para documentos y sistema';
COMMENT ON COLUMN core_companies.membrete_url IS 'Imagen de membrete para documentos oficiales';
COMMENT ON COLUMN core_companies.firma_digital_url IS 'Imagen de firma autorizada';
COMMENT ON COLUMN core_companies.sello_empresa_url IS 'Sello de la empresa para documentos';

-- ============================================
-- 15. DATOS INICIALES PARA EMPRESA DEFAULT
-- ============================================

-- Actualizar empresa por defecto con campos nuevos
UPDATE core_companies
SET
    razon_social = nombre,
    nombre_comercial = nombre,
    plan_tipo = 'enterprise',
    max_usuarios = 100,
    max_almacenamiento_gb = 50,
    plan_fecha_inicio = CURRENT_DATE,
    plan_fecha_fin = CURRENT_DATE + INTERVAL '1 year'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Activar todos los módulos para la empresa default
SELECT activar_modulos_plan('00000000-0000-0000-0000-000000000001', 'enterprise');

-- Crear roles para empresa default
SELECT crear_roles_empresa('00000000-0000-0000-0000-000000000001');
