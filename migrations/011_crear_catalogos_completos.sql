-- ============================================================================
-- MIGRACIÓN 011: Crear Catálogos Completos del Sistema ERP
-- Fecha: 2025-11-25
-- Descripción: Crea todas las tablas de catálogos necesarias para el sistema
-- ============================================================================

-- ============================================================================
-- CATÁLOGOS DE EVENTOS (evt_*)
-- ============================================================================

-- Tabla: evt_categorias_ingresos
-- Descripción: Categorías para clasificar tipos de ingresos
CREATE TABLE IF NOT EXISTS evt_categorias_ingresos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#10B981',
    icono VARCHAR(10),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios de tabla
COMMENT ON TABLE evt_categorias_ingresos IS 'Catálogo de categorías para clasificar ingresos';
COMMENT ON COLUMN evt_categorias_ingresos.nombre IS 'Nombre de la categoría de ingreso';
COMMENT ON COLUMN evt_categorias_ingresos.color IS 'Color hexadecimal para identificación visual';

-- Índices
CREATE INDEX IF NOT EXISTS idx_evt_categorias_ingresos_company ON evt_categorias_ingresos(company_id);
CREATE INDEX IF NOT EXISTS idx_evt_categorias_ingresos_activo ON evt_categorias_ingresos(activo);

-- Tabla: evt_estados_ingreso
-- Descripción: Estados posibles para los ingresos
CREATE TABLE IF NOT EXISTS evt_estados_ingreso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#3B82F6',
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE evt_estados_ingreso IS 'Catálogo de estados para el seguimiento de ingresos';

CREATE INDEX IF NOT EXISTS idx_evt_estados_ingreso_company ON evt_estados_ingreso(company_id);

-- Tabla: evt_roles
-- Descripción: Roles disponibles para participantes en eventos
CREATE TABLE IF NOT EXISTS evt_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE evt_roles IS 'Catálogo de roles para participantes en eventos';

CREATE INDEX IF NOT EXISTS idx_evt_roles_company ON evt_roles(company_id);

-- ============================================================================
-- CATÁLOGOS GENERALES (cat_*)
-- ============================================================================

-- Tabla: cat_departamentos (si no existe)
CREATE TABLE IF NOT EXISTS cat_departamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#8B5CF6',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE cat_departamentos IS 'Catálogo de departamentos organizacionales';

CREATE INDEX IF NOT EXISTS idx_cat_departamentos_company ON cat_departamentos(company_id);

-- Tabla: cat_estados_workflow (si no existe)
CREATE TABLE IF NOT EXISTS cat_estados_workflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#3B82F6',
    icono VARCHAR(10),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE cat_estados_workflow IS 'Catálogo de estados para flujos de trabajo';

CREATE INDEX IF NOT EXISTS idx_cat_estados_workflow_company ON cat_estados_workflow(company_id);
CREATE INDEX IF NOT EXISTS idx_cat_estados_workflow_orden ON cat_estados_workflow(orden);

-- ============================================================================
-- CATÁLOGOS DE PROYECTOS (prj_*)
-- ============================================================================

-- Tabla: prj_tipos_proyecto
CREATE TABLE IF NOT EXISTS prj_tipos_proyecto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#F97316',
    icono VARCHAR(10),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE prj_tipos_proyecto IS 'Catálogo de tipos de proyectos';

CREATE INDEX IF NOT EXISTS idx_prj_tipos_proyecto_company ON prj_tipos_proyecto(company_id);

-- Tabla: prj_estados_proyecto
CREATE TABLE IF NOT EXISTS prj_estados_proyecto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#14B8A6',
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE prj_estados_proyecto IS 'Catálogo de estados del ciclo de vida de proyectos';

CREATE INDEX IF NOT EXISTS idx_prj_estados_proyecto_company ON prj_estados_proyecto(company_id);
CREATE INDEX IF NOT EXISTS idx_prj_estados_proyecto_orden ON prj_estados_proyecto(orden);

-- Tabla: prj_prioridades
CREATE TABLE IF NOT EXISTS prj_prioridades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#EF4444',
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE prj_prioridades IS 'Catálogo de niveles de prioridad para tareas y proyectos';

CREATE INDEX IF NOT EXISTS idx_prj_prioridades_company ON prj_prioridades(company_id);

-- Tabla: prj_roles
CREATE TABLE IF NOT EXISTS prj_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE prj_roles IS 'Catálogo de roles para miembros de proyectos';

CREATE INDEX IF NOT EXISTS idx_prj_roles_company ON prj_roles(company_id);

-- ============================================================================
-- CATÁLOGOS DE NÓMINA (nom_*)
-- ============================================================================

-- Tabla: nom_tipos_contrato
CREATE TABLE IF NOT EXISTS nom_tipos_contrato (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE nom_tipos_contrato IS 'Catálogo de tipos de contratos laborales';

CREATE INDEX IF NOT EXISTS idx_nom_tipos_contrato_company ON nom_tipos_contrato(company_id);

-- Tabla: nom_puestos
CREATE TABLE IF NOT EXISTS nom_puestos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    departamento_id UUID REFERENCES cat_departamentos(id),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE nom_puestos IS 'Catálogo de puestos de trabajo';

CREATE INDEX IF NOT EXISTS idx_nom_puestos_company ON nom_puestos(company_id);
CREATE INDEX IF NOT EXISTS idx_nom_puestos_departamento ON nom_puestos(departamento_id);

-- ============================================================================
-- CATÁLOGOS DE INVENTARIO (inv_*)
-- ============================================================================

-- Tabla: inv_categorias_producto
CREATE TABLE IF NOT EXISTS inv_categorias_producto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#F59E0B',
    categoria_padre_id UUID REFERENCES inv_categorias_producto(id),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inv_categorias_producto IS 'Catálogo de categorías para clasificar productos del inventario';

CREATE INDEX IF NOT EXISTS idx_inv_categorias_producto_company ON inv_categorias_producto(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_categorias_producto_padre ON inv_categorias_producto(categoria_padre_id);

-- Tabla: inv_unidades_medida
CREATE TABLE IF NOT EXISTS inv_unidades_medida (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inv_unidades_medida IS 'Catálogo de unidades de medida para productos';

CREATE INDEX IF NOT EXISTS idx_inv_unidades_medida_company ON inv_unidades_medida(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_unidades_medida_codigo ON inv_unidades_medida(company_id, codigo);

-- ============================================================================
-- CATÁLOGOS DE PROVEEDORES (prov_*)
-- ============================================================================

-- Tabla: prov_categorias
CREATE TABLE IF NOT EXISTS prov_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#EC4899',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE prov_categorias IS 'Catálogo de categorías para clasificar proveedores';

CREATE INDEX IF NOT EXISTS idx_prov_categorias_company ON prov_categorias(company_id);

-- ============================================================================
-- TABLA PROVEEDOR_PRODUCTO (Relación N:M entre proveedores y productos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proveedor_producto (
    id SERIAL PRIMARY KEY,
    proveedor_id INTEGER NOT NULL REFERENCES proveedores_erp(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos_erp(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    codigo_proveedor VARCHAR(50), -- SKU del proveedor
    precio_proveedor DECIMAL(12,2) NOT NULL,
    tiempo_entrega_dias INTEGER DEFAULT 7,
    cantidad_minima INTEGER DEFAULT 1,
    es_preferido BOOLEAN DEFAULT FALSE,
    fecha_vigencia_inicio DATE,
    fecha_vigencia_fin DATE,
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(proveedor_id, producto_id, company_id)
);

COMMENT ON TABLE proveedor_producto IS 'Relación entre proveedores y productos con precios y condiciones';
COMMENT ON COLUMN proveedor_producto.codigo_proveedor IS 'Código SKU usado por el proveedor para este producto';
COMMENT ON COLUMN proveedor_producto.precio_proveedor IS 'Precio de compra del producto con este proveedor';
COMMENT ON COLUMN proveedor_producto.es_preferido IS 'Indica si es el proveedor preferido para este producto';

CREATE INDEX IF NOT EXISTS idx_proveedor_producto_proveedor ON proveedor_producto(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_proveedor_producto_producto ON proveedor_producto(producto_id);
CREATE INDEX IF NOT EXISTS idx_proveedor_producto_company ON proveedor_producto(company_id);
CREATE INDEX IF NOT EXISTS idx_proveedor_producto_preferido ON proveedor_producto(producto_id, es_preferido) WHERE es_preferido = TRUE;

-- ============================================================================
-- DATOS INICIALES PARA CATÁLOGOS
-- ============================================================================

-- Datos para evt_categorias_ingresos (sin company_id para usar como template)
INSERT INTO evt_categorias_ingresos (nombre, descripcion, color, icono, orden, activo)
SELECT * FROM (VALUES
    ('Servicios', 'Ingresos por prestación de servicios', '#10B981', '💼', 1, TRUE),
    ('Productos', 'Ingresos por venta de productos', '#3B82F6', '📦', 2, TRUE),
    ('Eventos', 'Ingresos por organización de eventos', '#F59E0B', '🎉', 3, TRUE),
    ('Consultoría', 'Ingresos por servicios de consultoría', '#8B5CF6', '💡', 4, TRUE),
    ('Comisiones', 'Ingresos por comisiones', '#EC4899', '💰', 5, TRUE),
    ('Otros', 'Otros tipos de ingresos', '#6B7280', '📋', 6, TRUE)
) AS v(nombre, descripcion, color, icono, orden, activo)
WHERE NOT EXISTS (SELECT 1 FROM evt_categorias_ingresos LIMIT 1);

-- Datos para evt_estados_ingreso
INSERT INTO evt_estados_ingreso (nombre, descripcion, color, orden, activo)
SELECT * FROM (VALUES
    ('Pendiente', 'Ingreso pendiente de cobro', '#F59E0B', 1, TRUE),
    ('Parcial', 'Ingreso cobrado parcialmente', '#3B82F6', 2, TRUE),
    ('Cobrado', 'Ingreso cobrado completamente', '#10B981', 3, TRUE),
    ('Cancelado', 'Ingreso cancelado', '#EF4444', 4, TRUE)
) AS v(nombre, descripcion, color, orden, activo)
WHERE NOT EXISTS (SELECT 1 FROM evt_estados_ingreso LIMIT 1);

-- Datos para evt_roles
INSERT INTO evt_roles (nombre, descripcion, activo)
SELECT * FROM (VALUES
    ('Organizador', 'Responsable principal del evento', TRUE),
    ('Coordinador', 'Coordina aspectos específicos del evento', TRUE),
    ('Asistente', 'Apoya en tareas operativas', TRUE),
    ('Proveedor', 'Proveedor de servicios o productos', TRUE)
) AS v(nombre, descripcion, activo)
WHERE NOT EXISTS (SELECT 1 FROM evt_roles LIMIT 1);

-- Datos para prj_tipos_proyecto
INSERT INTO prj_tipos_proyecto (nombre, descripcion, color, icono, activo)
SELECT * FROM (VALUES
    ('Desarrollo', 'Proyectos de desarrollo de software', '#3B82F6', '💻', TRUE),
    ('Implementación', 'Proyectos de implementación de sistemas', '#10B981', '🚀', TRUE),
    ('Consultoría', 'Proyectos de consultoría', '#8B5CF6', '💡', TRUE),
    ('Mantenimiento', 'Proyectos de mantenimiento', '#F59E0B', '🔧', TRUE),
    ('Evento', 'Proyectos de organización de eventos', '#EC4899', '🎉', TRUE),
    ('Interno', 'Proyectos internos de la empresa', '#6B7280', '🏢', TRUE)
) AS v(nombre, descripcion, color, icono, activo)
WHERE NOT EXISTS (SELECT 1 FROM prj_tipos_proyecto LIMIT 1);

-- Datos para prj_estados_proyecto
INSERT INTO prj_estados_proyecto (nombre, descripcion, color, orden, activo)
SELECT * FROM (VALUES
    ('Propuesta', 'Proyecto en fase de propuesta', '#6B7280', 1, TRUE),
    ('Aprobado', 'Proyecto aprobado', '#3B82F6', 2, TRUE),
    ('En Progreso', 'Proyecto en ejecución', '#F59E0B', 3, TRUE),
    ('En Pausa', 'Proyecto pausado temporalmente', '#EF4444', 4, TRUE),
    ('Completado', 'Proyecto finalizado exitosamente', '#10B981', 5, TRUE),
    ('Cancelado', 'Proyecto cancelado', '#DC2626', 6, TRUE)
) AS v(nombre, descripcion, color, orden, activo)
WHERE NOT EXISTS (SELECT 1 FROM prj_estados_proyecto LIMIT 1);

-- Datos para prj_prioridades
INSERT INTO prj_prioridades (nombre, descripcion, color, orden, activo)
SELECT * FROM (VALUES
    ('Baja', 'Prioridad baja', '#6B7280', 1, TRUE),
    ('Media', 'Prioridad media', '#3B82F6', 2, TRUE),
    ('Alta', 'Prioridad alta', '#F59E0B', 3, TRUE),
    ('Urgente', 'Prioridad urgente', '#EF4444', 4, TRUE)
) AS v(nombre, descripcion, color, orden, activo)
WHERE NOT EXISTS (SELECT 1 FROM prj_prioridades LIMIT 1);

-- Datos para prj_roles
INSERT INTO prj_roles (nombre, descripcion, activo)
SELECT * FROM (VALUES
    ('Líder de Proyecto', 'Responsable principal del proyecto', TRUE),
    ('Desarrollador', 'Encargado del desarrollo técnico', TRUE),
    ('Analista', 'Analista funcional o de requerimientos', TRUE),
    ('Tester', 'Encargado de pruebas y calidad', TRUE)
) AS v(nombre, descripcion, activo)
WHERE NOT EXISTS (SELECT 1 FROM prj_roles LIMIT 1);

-- Datos para nom_tipos_contrato
INSERT INTO nom_tipos_contrato (nombre, descripcion, activo)
SELECT * FROM (VALUES
    ('Indeterminado', 'Contrato por tiempo indeterminado', TRUE),
    ('Determinado', 'Contrato por tiempo determinado', TRUE),
    ('Por Obra', 'Contrato por obra determinada', TRUE),
    ('Honorarios', 'Prestación de servicios profesionales', TRUE),
    ('Temporal', 'Contrato temporal', TRUE)
) AS v(nombre, descripcion, activo)
WHERE NOT EXISTS (SELECT 1 FROM nom_tipos_contrato LIMIT 1);

-- Datos para inv_unidades_medida
INSERT INTO inv_unidades_medida (codigo, nombre, descripcion, activo)
SELECT * FROM (VALUES
    ('PZA', 'Pieza', 'Unidad individual', TRUE),
    ('KG', 'Kilogramo', 'Unidad de peso en kilogramos', TRUE),
    ('LT', 'Litro', 'Unidad de volumen en litros', TRUE),
    ('MT', 'Metro', 'Unidad de longitud en metros', TRUE),
    ('M2', 'Metro Cuadrado', 'Unidad de superficie', TRUE),
    ('M3', 'Metro Cúbico', 'Unidad de volumen', TRUE),
    ('PAQ', 'Paquete', 'Conjunto de unidades empaquetadas', TRUE),
    ('CJA', 'Caja', 'Caja de unidades', TRUE),
    ('HRS', 'Hora', 'Hora de servicio', TRUE),
    ('SRV', 'Servicio', 'Unidad de servicio', TRUE)
) AS v(codigo, nombre, descripcion, activo)
WHERE NOT EXISTS (SELECT 1 FROM inv_unidades_medida LIMIT 1);

-- Datos para prov_categorias
INSERT INTO prov_categorias (nombre, descripcion, color, activo)
SELECT * FROM (VALUES
    ('Materiales', 'Proveedores de materiales y suministros', '#3B82F6', TRUE),
    ('Servicios', 'Proveedores de servicios', '#10B981', TRUE),
    ('Equipamiento', 'Proveedores de equipos y maquinaria', '#F59E0B', TRUE),
    ('Tecnología', 'Proveedores de tecnología y software', '#8B5CF6', TRUE),
    ('Logística', 'Proveedores de servicios logísticos', '#EC4899', TRUE),
    ('Otros', 'Otros proveedores', '#6B7280', TRUE)
) AS v(nombre, descripcion, color, activo)
WHERE NOT EXISTS (SELECT 1 FROM prov_categorias LIMIT 1);

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD RLS
-- ============================================================================

-- Habilitar RLS en todas las tablas de catálogos
ALTER TABLE evt_categorias_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_estados_ingreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_estados_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE prj_tipos_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE prj_estados_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE prj_prioridades ENABLE ROW LEVEL SECURITY;
ALTER TABLE prj_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nom_tipos_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE nom_puestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_categorias_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE prov_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedor_producto ENABLE ROW LEVEL SECURITY;

-- Políticas para lectura (todos los usuarios autenticados pueden ver catálogos globales y de su empresa)
CREATE POLICY "Leer catálogos" ON evt_categorias_ingresos FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON evt_estados_ingreso FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON evt_roles FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON cat_departamentos FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON cat_estados_workflow FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON prj_tipos_proyecto FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON prj_estados_proyecto FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON prj_prioridades FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON prj_roles FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON nom_tipos_contrato FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON nom_puestos FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON inv_categorias_producto FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON inv_unidades_medida FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);
CREATE POLICY "Leer catálogos" ON prov_categorias FOR SELECT USING (company_id IS NULL OR company_id = auth.uid()::uuid);

-- Política para proveedor_producto (basada en company_id)
CREATE POLICY "Leer proveedor_producto" ON proveedor_producto FOR SELECT USING (TRUE);
CREATE POLICY "Insertar proveedor_producto" ON proveedor_producto FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Actualizar proveedor_producto" ON proveedor_producto FOR UPDATE USING (TRUE);
CREATE POLICY "Eliminar proveedor_producto" ON proveedor_producto FOR DELETE USING (TRUE);

-- ============================================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA DE updated_at
-- ============================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas de catálogos
DO $$
DECLARE
    tablas TEXT[] := ARRAY[
        'evt_categorias_ingresos', 'evt_estados_ingreso', 'evt_roles',
        'cat_departamentos', 'cat_estados_workflow',
        'prj_tipos_proyecto', 'prj_estados_proyecto', 'prj_prioridades', 'prj_roles',
        'nom_tipos_contrato', 'nom_puestos',
        'inv_categorias_producto', 'inv_unidades_medida',
        'prov_categorias', 'proveedor_producto'
    ];
    tabla TEXT;
BEGIN
    FOREACH tabla IN ARRAY tablas LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS set_updated_at ON %I;
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_updated_at();
        ', tabla, tabla);
    END LOOP;
END;
$$;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
