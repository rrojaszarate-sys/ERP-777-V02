-- ============================================================================
-- MIGRACIÓN 030: MÓDULO DE PROYECTOS COMPLETO
-- ============================================================================
-- Descripción: Crea todas las tablas transaccionales del módulo de proyectos
-- Autor: Sistema ERP
-- Fecha: 2025-12-02
-- ============================================================================

-- ============================================================================
-- PARTE 1: ETAPAS Y CONFIGURACIÓN
-- ============================================================================

-- Tabla: proy_etapas_proyecto (Etapas configurables para proyectos)
CREATE TABLE IF NOT EXISTS proy_etapas_proyecto (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  color VARCHAR(20) DEFAULT '#3B82F6',
  secuencia INTEGER DEFAULT 0,
  es_final BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, nombre)
);

COMMENT ON TABLE proy_etapas_proyecto IS 'Etapas configurables para el ciclo de vida de proyectos';
CREATE INDEX IF NOT EXISTS idx_proy_etapas_proyecto_company ON proy_etapas_proyecto(company_id);
CREATE INDEX IF NOT EXISTS idx_proy_etapas_proyecto_secuencia ON proy_etapas_proyecto(secuencia);

-- Tabla: proy_etapas_tarea (Columnas Kanban configurables)
CREATE TABLE IF NOT EXISTS proy_etapas_tarea (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  color VARCHAR(20) DEFAULT '#6B7280',
  secuencia INTEGER DEFAULT 0,
  es_cerrado BOOLEAN DEFAULT FALSE,
  fold BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, nombre)
);

COMMENT ON TABLE proy_etapas_tarea IS 'Columnas Kanban configurables para tareas';
CREATE INDEX IF NOT EXISTS idx_proy_etapas_tarea_company ON proy_etapas_tarea(company_id);
CREATE INDEX IF NOT EXISTS idx_proy_etapas_tarea_secuencia ON proy_etapas_tarea(secuencia);

-- ============================================================================
-- PARTE 2: PROYECTOS
-- ============================================================================

-- Tabla: proy_proyectos (Tabla principal de proyectos)
CREATE TABLE IF NOT EXISTS proy_proyectos (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
  codigo VARCHAR(50),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  
  -- Relaciones
  cliente_id INTEGER REFERENCES crm_clientes(id) ON DELETE SET NULL,
  responsable_id UUID,
  etapa_id INTEGER REFERENCES proy_etapas_proyecto(id) ON DELETE SET NULL,
  
  -- Fechas
  fecha_inicio DATE NOT NULL,
  fecha_fin_estimada DATE NOT NULL,
  fecha_fin_real DATE,
  
  -- Financiero
  presupuesto DECIMAL(15,2) DEFAULT 0,
  costo_real DECIMAL(15,2) DEFAULT 0,
  ingreso_estimado DECIMAL(15,2) DEFAULT 0,
  ingreso_real DECIMAL(15,2) DEFAULT 0,
  
  -- Control
  progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  status VARCHAR(20) DEFAULT 'planificacion' CHECK (status IN ('planificacion', 'en_progreso', 'pausado', 'completado', 'cancelado')),
  prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  tipo_facturacion VARCHAR(30) DEFAULT 'precio_fijo' CHECK (tipo_facturacion IN ('precio_fijo', 'tiempo_material', 'milestones', 'no_facturable')),
  
  -- Configuración
  privado BOOLEAN DEFAULT FALSE,
  favorito BOOLEAN DEFAULT FALSE,
  color VARCHAR(10),
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  
  UNIQUE(company_id, codigo)
);

COMMENT ON TABLE proy_proyectos IS 'Tabla principal de gestión de proyectos';

CREATE INDEX IF NOT EXISTS idx_proy_proyectos_company ON proy_proyectos(company_id);
CREATE INDEX IF NOT EXISTS idx_proy_proyectos_cliente ON proy_proyectos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_proy_proyectos_responsable ON proy_proyectos(responsable_id);
CREATE INDEX IF NOT EXISTS idx_proy_proyectos_status ON proy_proyectos(status);
CREATE INDEX IF NOT EXISTS idx_proy_proyectos_fechas ON proy_proyectos(fecha_inicio, fecha_fin_estimada);

-- ============================================================================
-- PARTE 3: HITOS (MILESTONES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proy_hitos (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
  proyecto_id INTEGER NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha_objetivo DATE NOT NULL,
  fecha_completado DATE,
  completado BOOLEAN DEFAULT FALSE,
  progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  responsable_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proy_hitos IS 'Milestones/Hitos del proyecto';

CREATE INDEX IF NOT EXISTS idx_proy_hitos_proyecto ON proy_hitos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proy_hitos_fecha ON proy_hitos(fecha_objetivo);
CREATE INDEX IF NOT EXISTS idx_proy_hitos_company ON proy_hitos(company_id);

-- ============================================================================
-- PARTE 4: TAREAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS proy_tareas (
  id SERIAL PRIMARY KEY,
  proyecto_id INTEGER NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  tarea_padre_id INTEGER REFERENCES proy_tareas(id) ON DELETE SET NULL,
  
  -- Información básica
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  
  -- Fechas
  fecha_inicio DATE,
  fecha_fin DATE,
  fecha_inicio_real DATE,
  fecha_fin_real DATE,
  
  -- Horas
  horas_estimadas DECIMAL(8,2) DEFAULT 0,
  horas_reales DECIMAL(8,2) DEFAULT 0,
  horas_facturables DECIMAL(8,2) DEFAULT 0,
  
  -- Control
  progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'bloqueada', 'completada', 'cancelada')),
  prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  
  -- Asignación
  asignado_a UUID,
  etapa_id INTEGER REFERENCES proy_etapas_tarea(id) ON DELETE SET NULL,
  milestone_id INTEGER REFERENCES proy_hitos(id) ON DELETE SET NULL,
  
  -- Arrays
  watchers UUID[] DEFAULT '{}',
  dependencias INTEGER[] DEFAULT '{}',
  etiquetas TEXT[] DEFAULT '{}',
  
  -- Checklist (JSONB)
  checklist JSONB DEFAULT '[]',
  
  -- Facturación
  facturable BOOLEAN DEFAULT TRUE,
  facturado BOOLEAN DEFAULT FALSE,
  costo_estimado DECIMAL(12,2) DEFAULT 0,
  costo_real DECIMAL(12,2) DEFAULT 0,
  
  -- Orden y visual
  secuencia INTEGER DEFAULT 0,
  color VARCHAR(10),
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

COMMENT ON TABLE proy_tareas IS 'Tareas de proyectos con soporte para Kanban, dependencias y checklist';

CREATE INDEX IF NOT EXISTS idx_proy_tareas_proyecto ON proy_tareas(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proy_tareas_padre ON proy_tareas(tarea_padre_id);
CREATE INDEX IF NOT EXISTS idx_proy_tareas_asignado ON proy_tareas(asignado_a);
CREATE INDEX IF NOT EXISTS idx_proy_tareas_etapa ON proy_tareas(etapa_id);
CREATE INDEX IF NOT EXISTS idx_proy_tareas_milestone ON proy_tareas(milestone_id);
CREATE INDEX IF NOT EXISTS idx_proy_tareas_status ON proy_tareas(status);
CREATE INDEX IF NOT EXISTS idx_proy_tareas_fechas ON proy_tareas(fecha_inicio, fecha_fin);

-- ============================================================================
-- PARTE 5: EQUIPO DE PROYECTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS proy_equipo (
  id SERIAL PRIMARY KEY,
  proyecto_id INTEGER NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  rol VARCHAR(50) DEFAULT 'miembro' CHECK (rol IN ('gestor', 'desarrollador', 'diseñador', 'qa', 'consultor', 'miembro', 'otro')),
  fecha_asignacion DATE DEFAULT CURRENT_DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proyecto_id, usuario_id)
);

COMMENT ON TABLE proy_equipo IS 'Miembros del equipo de cada proyecto';

CREATE INDEX IF NOT EXISTS idx_proy_equipo_proyecto ON proy_equipo(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proy_equipo_usuario ON proy_equipo(usuario_id);

-- ============================================================================
-- PARTE 6: REGISTROS DE TIEMPO (TIMESHEET)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proy_registros_tiempo (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
  proyecto_id INTEGER NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  tarea_id INTEGER REFERENCES proy_tareas(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL,
  
  -- Tiempo
  fecha DATE NOT NULL,
  horas DECIMAL(5,2) NOT NULL CHECK (horas > 0 AND horas <= 24),
  descripcion TEXT,
  
  -- Facturación
  facturable BOOLEAN DEFAULT TRUE,
  facturado BOOLEAN DEFAULT FALSE,
  costo_hora DECIMAL(10,2) DEFAULT 0,
  precio_hora DECIMAL(10,2) DEFAULT 0,
  
  -- Aprobación
  aprobado BOOLEAN DEFAULT FALSE,
  aprobado_por UUID,
  aprobado_en TIMESTAMPTZ,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proy_registros_tiempo IS 'Registro de horas trabajadas (Timesheet)';

CREATE INDEX IF NOT EXISTS idx_proy_registros_tiempo_proyecto ON proy_registros_tiempo(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proy_registros_tiempo_tarea ON proy_registros_tiempo(tarea_id);
CREATE INDEX IF NOT EXISTS idx_proy_registros_tiempo_usuario ON proy_registros_tiempo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_proy_registros_tiempo_fecha ON proy_registros_tiempo(fecha);
CREATE INDEX IF NOT EXISTS idx_proy_registros_tiempo_company ON proy_registros_tiempo(company_id);

-- ============================================================================
-- PARTE 7: COMENTARIOS DE TAREAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS proy_comentarios_tarea (
  id SERIAL PRIMARY KEY,
  tarea_id INTEGER NOT NULL REFERENCES proy_tareas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proy_comentarios_tarea IS 'Comentarios en tareas de proyectos';

CREATE INDEX IF NOT EXISTS idx_proy_comentarios_tarea ON proy_comentarios_tarea(tarea_id);

-- ============================================================================
-- PARTE 8: ARCHIVOS DE TAREAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS proy_archivos_tarea (
  id SERIAL PRIMARY KEY,
  tarea_id INTEGER NOT NULL REFERENCES proy_tareas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  tipo VARCHAR(100),
  tamano INTEGER DEFAULT 0,
  subido_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proy_archivos_tarea IS 'Archivos adjuntos a tareas';

CREATE INDEX IF NOT EXISTS idx_proy_archivos_tarea ON proy_archivos_tarea(tarea_id);

-- ============================================================================
-- PARTE 9: DOCUMENTOS DE PROYECTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS proy_documentos (
  id SERIAL PRIMARY KEY,
  proyecto_id INTEGER NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  url TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'otro' CHECK (tipo IN ('propuesta', 'contrato', 'especificacion', 'reporte', 'otro')),
  version VARCHAR(20) DEFAULT '1.0',
  subido_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proy_documentos IS 'Documentos asociados a proyectos';

CREATE INDEX IF NOT EXISTS idx_proy_documentos_proyecto ON proy_documentos(proyecto_id);

-- ============================================================================
-- PARTE 10: PLANTILLAS DE PROYECTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS proy_plantillas (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  etapas_predeterminadas INTEGER[] DEFAULT '{}',
  tareas_plantilla JSONB DEFAULT '[]',
  horas_estimadas_total DECIMAL(8,2) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, nombre)
);

COMMENT ON TABLE proy_plantillas IS 'Plantillas reutilizables para crear proyectos';

CREATE INDEX IF NOT EXISTS idx_proy_plantillas_company ON proy_plantillas(company_id);

-- ============================================================================
-- PARTE 11: FUNCIONES RPC
-- ============================================================================

-- Función: Actualizar horas reales de una tarea
CREATE OR REPLACE FUNCTION actualizar_horas_tarea(p_tarea_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_horas_reales DECIMAL(8,2);
  v_horas_facturables DECIMAL(8,2);
BEGIN
  -- Calcular horas reales totales
  SELECT COALESCE(SUM(horas), 0)
  INTO v_horas_reales
  FROM proy_registros_tiempo
  WHERE tarea_id = p_tarea_id;
  
  -- Calcular horas facturables
  SELECT COALESCE(SUM(horas), 0)
  INTO v_horas_facturables
  FROM proy_registros_tiempo
  WHERE tarea_id = p_tarea_id AND facturable = TRUE;
  
  -- Actualizar tarea
  UPDATE proy_tareas
  SET horas_reales = v_horas_reales,
      horas_facturables = v_horas_facturables,
      updated_at = NOW()
  WHERE id = p_tarea_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_horas_tarea IS 'Actualiza las horas reales y facturables de una tarea sumando desde registros de tiempo';

-- Función: Calcular progreso de un hito
CREATE OR REPLACE FUNCTION calcular_progreso_hito(p_hito_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_progreso INTEGER;
BEGIN
  SELECT COALESCE(AVG(progreso), 0)::INTEGER
  INTO v_progreso
  FROM proy_tareas
  WHERE milestone_id = p_hito_id;
  
  -- Actualizar hito
  UPDATE proy_hitos
  SET progreso = v_progreso,
      completado = CASE WHEN v_progreso = 100 THEN TRUE ELSE FALSE END,
      fecha_completado = CASE WHEN v_progreso = 100 THEN CURRENT_DATE ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_hito_id;
  
  RETURN v_progreso;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_progreso_hito IS 'Calcula el progreso de un hito basándose en el promedio de sus tareas';

-- Función: Actualizar progreso de proyecto
CREATE OR REPLACE FUNCTION actualizar_progreso_proyecto(p_proyecto_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_progreso INTEGER;
BEGIN
  SELECT COALESCE(AVG(progreso), 0)::INTEGER
  INTO v_progreso
  FROM proy_tareas
  WHERE proyecto_id = p_proyecto_id;
  
  -- Actualizar proyecto
  UPDATE proy_proyectos
  SET progreso = v_progreso,
      updated_at = NOW()
  WHERE id = p_proyecto_id;
  
  RETURN v_progreso;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_progreso_proyecto IS 'Actualiza el progreso del proyecto basándose en el promedio de sus tareas';

-- Función: Calcular costos reales de proyecto
CREATE OR REPLACE FUNCTION actualizar_costos_proyecto(p_proyecto_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_costo_real DECIMAL(15,2);
  v_ingreso_real DECIMAL(15,2);
BEGIN
  -- Calcular costo real (horas * costo_hora)
  SELECT COALESCE(SUM(horas * costo_hora), 0)
  INTO v_costo_real
  FROM proy_registros_tiempo
  WHERE proyecto_id = p_proyecto_id;
  
  -- Calcular ingreso real (horas facturables * precio_hora)
  SELECT COALESCE(SUM(horas * precio_hora), 0)
  INTO v_ingreso_real
  FROM proy_registros_tiempo
  WHERE proyecto_id = p_proyecto_id AND facturable = TRUE;
  
  -- Actualizar proyecto
  UPDATE proy_proyectos
  SET costo_real = v_costo_real,
      ingreso_real = v_ingreso_real,
      updated_at = NOW()
  WHERE id = p_proyecto_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_costos_proyecto IS 'Actualiza los costos e ingresos reales del proyecto';

-- ============================================================================
-- PARTE 12: TRIGGERS
-- ============================================================================

-- Trigger: Actualizar progreso de proyecto cuando cambia tarea
CREATE OR REPLACE FUNCTION trg_actualizar_progreso_proyecto()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM actualizar_progreso_proyecto(COALESCE(NEW.proyecto_id, OLD.proyecto_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tarea_progreso_proyecto ON proy_tareas;
CREATE TRIGGER trg_tarea_progreso_proyecto
AFTER INSERT OR UPDATE OF progreso OR DELETE ON proy_tareas
FOR EACH ROW EXECUTE FUNCTION trg_actualizar_progreso_proyecto();

-- Trigger: Actualizar progreso de hito cuando cambia tarea
CREATE OR REPLACE FUNCTION trg_actualizar_progreso_hito()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.milestone_id IS NOT NULL THEN
    PERFORM calcular_progreso_hito(NEW.milestone_id);
  END IF;
  IF OLD.milestone_id IS NOT NULL AND OLD.milestone_id != COALESCE(NEW.milestone_id, 0) THEN
    PERFORM calcular_progreso_hito(OLD.milestone_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tarea_progreso_hito ON proy_tareas;
CREATE TRIGGER trg_tarea_progreso_hito
AFTER INSERT OR UPDATE OF progreso, milestone_id ON proy_tareas
FOR EACH ROW EXECUTE FUNCTION trg_actualizar_progreso_hito();

-- Trigger: Actualizar horas de tarea cuando cambia registro de tiempo
CREATE OR REPLACE FUNCTION trg_actualizar_horas_tarea()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.tarea_id IS NOT NULL THEN
      PERFORM actualizar_horas_tarea(OLD.tarea_id);
    END IF;
    PERFORM actualizar_costos_proyecto(OLD.proyecto_id);
  ELSE
    IF NEW.tarea_id IS NOT NULL THEN
      PERFORM actualizar_horas_tarea(NEW.tarea_id);
    END IF;
    PERFORM actualizar_costos_proyecto(NEW.proyecto_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registro_tiempo_horas ON proy_registros_tiempo;
CREATE TRIGGER trg_registro_tiempo_horas
AFTER INSERT OR UPDATE OR DELETE ON proy_registros_tiempo
FOR EACH ROW EXECUTE FUNCTION trg_actualizar_horas_tarea();

-- Trigger: Auto-generar código de proyecto
CREATE OR REPLACE FUNCTION trg_generar_codigo_proyecto()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 'PROY-\d{4}-(\d+)')::INTEGER), 0) + 1
    INTO v_seq
    FROM proy_proyectos
    WHERE company_id = NEW.company_id AND codigo LIKE 'PROY-' || v_year || '-%';
    
    NEW.codigo := 'PROY-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proyecto_codigo ON proy_proyectos;
CREATE TRIGGER trg_proyecto_codigo
BEFORE INSERT ON proy_proyectos
FOR EACH ROW EXECUTE FUNCTION trg_generar_codigo_proyecto();

-- ============================================================================
-- PARTE 13: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE proy_etapas_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_etapas_tarea ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_hitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_registros_tiempo ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_comentarios_tarea ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_archivos_tarea ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_plantillas ENABLE ROW LEVEL SECURITY;

-- Policies para proy_etapas_proyecto
DROP POLICY IF EXISTS "proy_etapas_proyecto_select" ON proy_etapas_proyecto;
CREATE POLICY "proy_etapas_proyecto_select" ON proy_etapas_proyecto
FOR SELECT USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_etapas_proyecto_insert" ON proy_etapas_proyecto;
CREATE POLICY "proy_etapas_proyecto_insert" ON proy_etapas_proyecto
FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_etapas_proyecto_update" ON proy_etapas_proyecto;
CREATE POLICY "proy_etapas_proyecto_update" ON proy_etapas_proyecto
FOR UPDATE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_etapas_proyecto_delete" ON proy_etapas_proyecto;
CREATE POLICY "proy_etapas_proyecto_delete" ON proy_etapas_proyecto
FOR DELETE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

-- Policies para proy_etapas_tarea
DROP POLICY IF EXISTS "proy_etapas_tarea_select" ON proy_etapas_tarea;
CREATE POLICY "proy_etapas_tarea_select" ON proy_etapas_tarea
FOR SELECT USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_etapas_tarea_insert" ON proy_etapas_tarea;
CREATE POLICY "proy_etapas_tarea_insert" ON proy_etapas_tarea
FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_etapas_tarea_update" ON proy_etapas_tarea;
CREATE POLICY "proy_etapas_tarea_update" ON proy_etapas_tarea
FOR UPDATE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_etapas_tarea_delete" ON proy_etapas_tarea;
CREATE POLICY "proy_etapas_tarea_delete" ON proy_etapas_tarea
FOR DELETE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

-- Policies para proy_proyectos
DROP POLICY IF EXISTS "proy_proyectos_select" ON proy_proyectos;
CREATE POLICY "proy_proyectos_select" ON proy_proyectos
FOR SELECT USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_proyectos_insert" ON proy_proyectos;
CREATE POLICY "proy_proyectos_insert" ON proy_proyectos
FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_proyectos_update" ON proy_proyectos;
CREATE POLICY "proy_proyectos_update" ON proy_proyectos
FOR UPDATE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_proyectos_delete" ON proy_proyectos;
CREATE POLICY "proy_proyectos_delete" ON proy_proyectos
FOR DELETE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

-- Policies para proy_hitos
DROP POLICY IF EXISTS "proy_hitos_select" ON proy_hitos;
CREATE POLICY "proy_hitos_select" ON proy_hitos
FOR SELECT USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_hitos_insert" ON proy_hitos;
CREATE POLICY "proy_hitos_insert" ON proy_hitos
FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_hitos_update" ON proy_hitos;
CREATE POLICY "proy_hitos_update" ON proy_hitos
FOR UPDATE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_hitos_delete" ON proy_hitos;
CREATE POLICY "proy_hitos_delete" ON proy_hitos
FOR DELETE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

-- Policies para proy_tareas (basado en proyecto)
DROP POLICY IF EXISTS "proy_tareas_select" ON proy_tareas;
CREATE POLICY "proy_tareas_select" ON proy_tareas
FOR SELECT USING (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

DROP POLICY IF EXISTS "proy_tareas_insert" ON proy_tareas;
CREATE POLICY "proy_tareas_insert" ON proy_tareas
FOR INSERT WITH CHECK (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

DROP POLICY IF EXISTS "proy_tareas_update" ON proy_tareas;
CREATE POLICY "proy_tareas_update" ON proy_tareas
FOR UPDATE USING (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

DROP POLICY IF EXISTS "proy_tareas_delete" ON proy_tareas;
CREATE POLICY "proy_tareas_delete" ON proy_tareas
FOR DELETE USING (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

-- Policies para proy_equipo
DROP POLICY IF EXISTS "proy_equipo_select" ON proy_equipo;
CREATE POLICY "proy_equipo_select" ON proy_equipo
FOR SELECT USING (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

DROP POLICY IF EXISTS "proy_equipo_insert" ON proy_equipo;
CREATE POLICY "proy_equipo_insert" ON proy_equipo
FOR INSERT WITH CHECK (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

DROP POLICY IF EXISTS "proy_equipo_update" ON proy_equipo;
CREATE POLICY "proy_equipo_update" ON proy_equipo
FOR UPDATE USING (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

DROP POLICY IF EXISTS "proy_equipo_delete" ON proy_equipo;
CREATE POLICY "proy_equipo_delete" ON proy_equipo
FOR DELETE USING (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

-- Policies para proy_registros_tiempo
DROP POLICY IF EXISTS "proy_registros_tiempo_select" ON proy_registros_tiempo;
CREATE POLICY "proy_registros_tiempo_select" ON proy_registros_tiempo
FOR SELECT USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_registros_tiempo_insert" ON proy_registros_tiempo;
CREATE POLICY "proy_registros_tiempo_insert" ON proy_registros_tiempo
FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_registros_tiempo_update" ON proy_registros_tiempo;
CREATE POLICY "proy_registros_tiempo_update" ON proy_registros_tiempo
FOR UPDATE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_registros_tiempo_delete" ON proy_registros_tiempo;
CREATE POLICY "proy_registros_tiempo_delete" ON proy_registros_tiempo
FOR DELETE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

-- Policies para proy_comentarios_tarea
DROP POLICY IF EXISTS "proy_comentarios_tarea_select" ON proy_comentarios_tarea;
CREATE POLICY "proy_comentarios_tarea_select" ON proy_comentarios_tarea
FOR SELECT USING (tarea_id IN (
  SELECT t.id FROM proy_tareas t
  JOIN proy_proyectos p ON t.proyecto_id = p.id
  WHERE p.company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "proy_comentarios_tarea_insert" ON proy_comentarios_tarea;
CREATE POLICY "proy_comentarios_tarea_insert" ON proy_comentarios_tarea
FOR INSERT WITH CHECK (tarea_id IN (
  SELECT t.id FROM proy_tareas t
  JOIN proy_proyectos p ON t.proyecto_id = p.id
  WHERE p.company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "proy_comentarios_tarea_update" ON proy_comentarios_tarea;
CREATE POLICY "proy_comentarios_tarea_update" ON proy_comentarios_tarea
FOR UPDATE USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "proy_comentarios_tarea_delete" ON proy_comentarios_tarea;
CREATE POLICY "proy_comentarios_tarea_delete" ON proy_comentarios_tarea
FOR DELETE USING (usuario_id = auth.uid());

-- Policies para proy_archivos_tarea
DROP POLICY IF EXISTS "proy_archivos_tarea_select" ON proy_archivos_tarea;
CREATE POLICY "proy_archivos_tarea_select" ON proy_archivos_tarea
FOR SELECT USING (tarea_id IN (
  SELECT t.id FROM proy_tareas t
  JOIN proy_proyectos p ON t.proyecto_id = p.id
  WHERE p.company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "proy_archivos_tarea_insert" ON proy_archivos_tarea;
CREATE POLICY "proy_archivos_tarea_insert" ON proy_archivos_tarea
FOR INSERT WITH CHECK (tarea_id IN (
  SELECT t.id FROM proy_tareas t
  JOIN proy_proyectos p ON t.proyecto_id = p.id
  WHERE p.company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "proy_archivos_tarea_delete" ON proy_archivos_tarea;
CREATE POLICY "proy_archivos_tarea_delete" ON proy_archivos_tarea
FOR DELETE USING (subido_por = auth.uid());

-- Policies para proy_documentos
DROP POLICY IF EXISTS "proy_documentos_select" ON proy_documentos;
CREATE POLICY "proy_documentos_select" ON proy_documentos
FOR SELECT USING (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

DROP POLICY IF EXISTS "proy_documentos_insert" ON proy_documentos;
CREATE POLICY "proy_documentos_insert" ON proy_documentos
FOR INSERT WITH CHECK (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

DROP POLICY IF EXISTS "proy_documentos_update" ON proy_documentos;
CREATE POLICY "proy_documentos_update" ON proy_documentos
FOR UPDATE USING (proyecto_id IN (
  SELECT id FROM proy_proyectos WHERE company_id IN (
    SELECT company_id FROM usuarios WHERE id = auth.uid()
  )
));

DROP POLICY IF EXISTS "proy_documentos_delete" ON proy_documentos;
CREATE POLICY "proy_documentos_delete" ON proy_documentos
FOR DELETE USING (subido_por = auth.uid());

-- Policies para proy_plantillas
DROP POLICY IF EXISTS "proy_plantillas_select" ON proy_plantillas;
CREATE POLICY "proy_plantillas_select" ON proy_plantillas
FOR SELECT USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_plantillas_insert" ON proy_plantillas;
CREATE POLICY "proy_plantillas_insert" ON proy_plantillas
FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_plantillas_update" ON proy_plantillas;
CREATE POLICY "proy_plantillas_update" ON proy_plantillas
FOR UPDATE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "proy_plantillas_delete" ON proy_plantillas;
CREATE POLICY "proy_plantillas_delete" ON proy_plantillas
FOR DELETE USING (company_id IN (SELECT company_id FROM usuarios WHERE id = auth.uid()));

-- ============================================================================
-- PARTE 14: DATOS INICIALES
-- ============================================================================

-- Insertar etapas de proyecto por defecto (para company_id NULL = globales)
INSERT INTO proy_etapas_proyecto (company_id, nombre, descripcion, color, secuencia, es_final)
SELECT NULL, nombre, descripcion, color, secuencia, es_final
FROM (VALUES
  ('Nuevo', 'Proyecto recién creado', '#6B7280', 1, FALSE),
  ('En Análisis', 'Fase de análisis y planificación', '#3B82F6', 2, FALSE),
  ('En Desarrollo', 'Desarrollo activo', '#8B5CF6', 3, FALSE),
  ('En Revisión', 'Revisión y control de calidad', '#F59E0B', 4, FALSE),
  ('Entregado', 'Proyecto entregado al cliente', '#10B981', 5, TRUE),
  ('Cancelado', 'Proyecto cancelado', '#EF4444', 6, TRUE)
) AS v(nombre, descripcion, color, secuencia, es_final)
WHERE NOT EXISTS (SELECT 1 FROM proy_etapas_proyecto LIMIT 1);

-- Insertar etapas de tarea (Kanban) por defecto
INSERT INTO proy_etapas_tarea (company_id, nombre, descripcion, color, secuencia, es_cerrado, fold)
SELECT NULL, nombre, descripcion, color, secuencia, es_cerrado, fold
FROM (VALUES
  ('Por Hacer', 'Tareas pendientes de iniciar', '#6B7280', 1, FALSE, FALSE),
  ('En Progreso', 'Tareas en desarrollo activo', '#3B82F6', 2, FALSE, FALSE),
  ('En Revisión', 'Tareas en código review o QA', '#F59E0B', 3, FALSE, FALSE),
  ('Pruebas', 'Tareas en testing', '#8B5CF6', 4, FALSE, FALSE),
  ('Completado', 'Tareas finalizadas', '#10B981', 5, TRUE, TRUE)
) AS v(nombre, descripcion, color, secuencia, es_cerrado, fold)
WHERE NOT EXISTS (SELECT 1 FROM proy_etapas_tarea LIMIT 1);

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
