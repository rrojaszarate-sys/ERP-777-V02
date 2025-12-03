-- =====================================================
-- MIGRACIÓN CORREGIDA - MÓDULO DE PROYECTOS
-- =====================================================
-- Versión: 030_fix - Corrige orden de creación de tablas
-- Fecha: 2025-12-02
-- =====================================================

-- Eliminar tablas existentes si causan conflicto
DROP TABLE IF EXISTS proy_registros_tiempo CASCADE;
DROP TABLE IF EXISTS proy_comentarios_tarea CASCADE;
DROP TABLE IF EXISTS proy_archivos_tarea CASCADE;
DROP TABLE IF EXISTS proy_documentos CASCADE;
DROP TABLE IF EXISTS proy_equipo CASCADE;
DROP TABLE IF EXISTS proy_hitos CASCADE;
DROP TABLE IF EXISTS proy_tareas CASCADE;
DROP TABLE IF EXISTS proy_proyectos CASCADE;

-- =====================================================
-- 1. TABLA PRINCIPAL: PROYECTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS proy_proyectos (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cliente_id BIGINT REFERENCES crm_clientes(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  codigo VARCHAR(50),
  status VARCHAR(50) DEFAULT 'planificacion' CHECK (status IN ('planificacion', 'en_progreso', 'en_pausa', 'completado', 'cancelado')),
  prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
  fecha_inicio DATE,
  fecha_fin_estimada DATE,
  fecha_fin_real DATE,
  presupuesto DECIMAL(15,2) DEFAULT 0,
  costo_real DECIMAL(15,2) DEFAULT 0,
  progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  responsable_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  etapa_id BIGINT REFERENCES proy_etapas_proyecto(id) ON DELETE SET NULL,
  notas TEXT,
  tags TEXT[],
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE proy_proyectos IS 'Tabla principal de proyectos';
CREATE INDEX IF NOT EXISTS idx_proy_proyectos_company ON proy_proyectos(company_id);
CREATE INDEX IF NOT EXISTS idx_proy_proyectos_status ON proy_proyectos(status);
CREATE INDEX IF NOT EXISTS idx_proy_proyectos_cliente ON proy_proyectos(cliente_id);

-- =====================================================
-- 2. TABLA: TAREAS
-- =====================================================
CREATE TABLE IF NOT EXISTS proy_tareas (
  id BIGSERIAL PRIMARY KEY,
  proyecto_id BIGINT NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES proy_tareas(id) ON DELETE CASCADE,
  etapa_id BIGINT REFERENCES proy_etapas_tarea(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  status VARCHAR(50) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'en_revision', 'completada', 'cancelada', 'bloqueada')),
  prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
  fecha_inicio DATE,
  fecha_fin DATE,
  fecha_completada TIMESTAMPTZ,
  horas_estimadas DECIMAL(8,2) DEFAULT 0,
  horas_reales DECIMAL(8,2) DEFAULT 0,
  progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  asignado_a UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  orden INTEGER DEFAULT 0,
  checklist JSONB DEFAULT '[]'::JSONB,
  subtareas JSONB DEFAULT '[]'::JSONB,
  dependencias BIGINT[] DEFAULT '{}',
  watchers UUID[] DEFAULT '{}',
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE proy_tareas IS 'Tareas de proyectos con soporte para subtareas y checklist';
CREATE INDEX IF NOT EXISTS idx_proy_tareas_proyecto ON proy_tareas(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proy_tareas_etapa ON proy_tareas(etapa_id);
CREATE INDEX IF NOT EXISTS idx_proy_tareas_asignado ON proy_tareas(asignado_a);
CREATE INDEX IF NOT EXISTS idx_proy_tareas_status ON proy_tareas(status);

-- =====================================================
-- 3. TABLA: EQUIPO DEL PROYECTO
-- =====================================================
CREATE TABLE IF NOT EXISTS proy_equipo (
  id BIGSERIAL PRIMARY KEY,
  proyecto_id BIGINT NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol VARCHAR(100) DEFAULT 'miembro',
  tarifa_hora DECIMAL(10,2) DEFAULT 0,
  horas_asignadas DECIMAL(8,2) DEFAULT 0,
  fecha_incorporacion DATE DEFAULT CURRENT_DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proyecto_id, usuario_id)
);

COMMENT ON TABLE proy_equipo IS 'Miembros del equipo por proyecto';
CREATE INDEX IF NOT EXISTS idx_proy_equipo_proyecto ON proy_equipo(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proy_equipo_usuario ON proy_equipo(usuario_id);

-- =====================================================
-- 4. TABLA: HITOS (MILESTONES)
-- =====================================================
CREATE TABLE IF NOT EXISTS proy_hitos (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  proyecto_id BIGINT NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha_objetivo DATE NOT NULL,
  fecha_completado TIMESTAMPTZ,
  completado BOOLEAN DEFAULT false,
  progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  responsable_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tareas_asociadas BIGINT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proy_hitos IS 'Hitos/milestones de proyectos';
CREATE INDEX IF NOT EXISTS idx_proy_hitos_proyecto ON proy_hitos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proy_hitos_company ON proy_hitos(company_id);
CREATE INDEX IF NOT EXISTS idx_proy_hitos_fecha ON proy_hitos(fecha_objetivo);

-- =====================================================
-- 5. TABLA: REGISTROS DE TIEMPO (TIMESHEET)
-- =====================================================
CREATE TABLE IF NOT EXISTS proy_registros_tiempo (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  proyecto_id BIGINT NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  tarea_id BIGINT REFERENCES proy_tareas(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  horas DECIMAL(5,2) NOT NULL CHECK (horas > 0 AND horas <= 24),
  descripcion TEXT,
  tipo_trabajo VARCHAR(50) DEFAULT 'desarrollo',
  facturable BOOLEAN DEFAULT true,
  tarifa_hora DECIMAL(10,2) DEFAULT 0,
  costo_total DECIMAL(12,2) GENERATED ALWAYS AS (horas * tarifa_hora) STORED,
  aprobado BOOLEAN DEFAULT false,
  aprobado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprobado_en TIMESTAMPTZ,
  facturado BOOLEAN DEFAULT false,
  factura_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proy_registros_tiempo IS 'Registros de tiempo trabajado (timesheet)';
CREATE INDEX IF NOT EXISTS idx_proy_registros_tiempo_proyecto ON proy_registros_tiempo(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proy_registros_tiempo_usuario ON proy_registros_tiempo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_proy_registros_tiempo_fecha ON proy_registros_tiempo(fecha);
CREATE INDEX IF NOT EXISTS idx_proy_registros_tiempo_tarea ON proy_registros_tiempo(tarea_id);

-- =====================================================
-- 6. FUNCIONES RPC
-- =====================================================

-- Función para actualizar horas reales de una tarea
CREATE OR REPLACE FUNCTION actualizar_horas_tarea(p_tarea_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE proy_tareas
  SET horas_reales = COALESCE((
    SELECT SUM(horas) FROM proy_registros_tiempo WHERE tarea_id = p_tarea_id
  ), 0),
  updated_at = NOW()
  WHERE id = p_tarea_id;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular progreso de un hito
CREATE OR REPLACE FUNCTION calcular_progreso_hito(p_hito_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  v_progreso INTEGER;
  v_tareas_ids BIGINT[];
BEGIN
  SELECT tareas_asociadas INTO v_tareas_ids FROM proy_hitos WHERE id = p_hito_id;
  
  IF v_tareas_ids IS NULL OR array_length(v_tareas_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT COALESCE(AVG(progreso), 0)::INTEGER INTO v_progreso
  FROM proy_tareas
  WHERE id = ANY(v_tareas_ids);
  
  UPDATE proy_hitos SET progreso = v_progreso, updated_at = NOW() WHERE id = p_hito_id;
  
  RETURN v_progreso;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar progreso del proyecto
CREATE OR REPLACE FUNCTION actualizar_progreso_proyecto(p_proyecto_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  v_progreso INTEGER;
BEGIN
  SELECT COALESCE(AVG(progreso), 0)::INTEGER INTO v_progreso
  FROM proy_tareas
  WHERE proyecto_id = p_proyecto_id AND parent_id IS NULL;
  
  UPDATE proy_proyectos SET progreso = v_progreso, updated_at = NOW() WHERE id = p_proyecto_id;
  
  RETURN v_progreso;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger para actualizar progreso del proyecto cuando cambia una tarea
CREATE OR REPLACE FUNCTION trigger_actualizar_progreso_proyecto()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM actualizar_progreso_proyecto(COALESCE(NEW.proyecto_id, OLD.proyecto_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_progreso_proyecto ON proy_tareas;
CREATE TRIGGER trg_actualizar_progreso_proyecto
AFTER INSERT OR UPDATE OF progreso, status OR DELETE ON proy_tareas
FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_progreso_proyecto();

-- Trigger para actualizar horas cuando se agrega/modifica un registro de tiempo
CREATE OR REPLACE FUNCTION trigger_actualizar_horas_tarea()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.tarea_id IS NOT NULL THEN
      PERFORM actualizar_horas_tarea(OLD.tarea_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.tarea_id IS NOT NULL THEN
      PERFORM actualizar_horas_tarea(NEW.tarea_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_horas_tarea ON proy_registros_tiempo;
CREATE TRIGGER trg_actualizar_horas_tarea
AFTER INSERT OR UPDATE OR DELETE ON proy_registros_tiempo
FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_horas_tarea();

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE proy_proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_hitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_registros_tiempo ENABLE ROW LEVEL SECURITY;

-- Políticas para proy_proyectos
DROP POLICY IF EXISTS proy_proyectos_select ON proy_proyectos;
CREATE POLICY proy_proyectos_select ON proy_proyectos FOR SELECT USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS proy_proyectos_insert ON proy_proyectos;
CREATE POLICY proy_proyectos_insert ON proy_proyectos FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS proy_proyectos_update ON proy_proyectos;
CREATE POLICY proy_proyectos_update ON proy_proyectos FOR UPDATE USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS proy_proyectos_delete ON proy_proyectos;
CREATE POLICY proy_proyectos_delete ON proy_proyectos FOR DELETE USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

-- Políticas para proy_tareas (basadas en proyecto)
DROP POLICY IF EXISTS proy_tareas_select ON proy_tareas;
CREATE POLICY proy_tareas_select ON proy_tareas FOR SELECT USING (
  proyecto_id IN (SELECT id FROM proy_proyectos WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS proy_tareas_insert ON proy_tareas;
CREATE POLICY proy_tareas_insert ON proy_tareas FOR INSERT WITH CHECK (
  proyecto_id IN (SELECT id FROM proy_proyectos WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS proy_tareas_update ON proy_tareas;
CREATE POLICY proy_tareas_update ON proy_tareas FOR UPDATE USING (
  proyecto_id IN (SELECT id FROM proy_proyectos WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS proy_tareas_delete ON proy_tareas;
CREATE POLICY proy_tareas_delete ON proy_tareas FOR DELETE USING (
  proyecto_id IN (SELECT id FROM proy_proyectos WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))
);

-- Políticas para proy_equipo
DROP POLICY IF EXISTS proy_equipo_select ON proy_equipo;
CREATE POLICY proy_equipo_select ON proy_equipo FOR SELECT USING (
  proyecto_id IN (SELECT id FROM proy_proyectos WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS proy_equipo_insert ON proy_equipo;
CREATE POLICY proy_equipo_insert ON proy_equipo FOR INSERT WITH CHECK (
  proyecto_id IN (SELECT id FROM proy_proyectos WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS proy_equipo_update ON proy_equipo;
CREATE POLICY proy_equipo_update ON proy_equipo FOR UPDATE USING (
  proyecto_id IN (SELECT id FROM proy_proyectos WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS proy_equipo_delete ON proy_equipo;
CREATE POLICY proy_equipo_delete ON proy_equipo FOR DELETE USING (
  proyecto_id IN (SELECT id FROM proy_proyectos WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))
);

-- Políticas para proy_hitos
DROP POLICY IF EXISTS proy_hitos_select ON proy_hitos;
CREATE POLICY proy_hitos_select ON proy_hitos FOR SELECT USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS proy_hitos_insert ON proy_hitos;
CREATE POLICY proy_hitos_insert ON proy_hitos FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS proy_hitos_update ON proy_hitos;
CREATE POLICY proy_hitos_update ON proy_hitos FOR UPDATE USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS proy_hitos_delete ON proy_hitos;
CREATE POLICY proy_hitos_delete ON proy_hitos FOR DELETE USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

-- Políticas para proy_registros_tiempo
DROP POLICY IF EXISTS proy_registros_tiempo_select ON proy_registros_tiempo;
CREATE POLICY proy_registros_tiempo_select ON proy_registros_tiempo FOR SELECT USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS proy_registros_tiempo_insert ON proy_registros_tiempo;
CREATE POLICY proy_registros_tiempo_insert ON proy_registros_tiempo FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS proy_registros_tiempo_update ON proy_registros_tiempo;
CREATE POLICY proy_registros_tiempo_update ON proy_registros_tiempo FOR UPDATE USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS proy_registros_tiempo_delete ON proy_registros_tiempo;
CREATE POLICY proy_registros_tiempo_delete ON proy_registros_tiempo FOR DELETE USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

-- Políticas para proy_etapas_proyecto
DROP POLICY IF EXISTS proy_etapas_proyecto_all ON proy_etapas_proyecto;
CREATE POLICY proy_etapas_proyecto_all ON proy_etapas_proyecto FOR ALL USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

-- Políticas para proy_etapas_tarea
DROP POLICY IF EXISTS proy_etapas_tarea_all ON proy_etapas_tarea;
CREATE POLICY proy_etapas_tarea_all ON proy_etapas_tarea FOR ALL USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

-- =====================================================
-- 9. VERIFICACIÓN
-- =====================================================
SELECT 'Tablas creadas:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'proy_%' 
ORDER BY table_name;

SELECT 'Funciones RPC creadas:' as info;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%tarea%' OR routine_name LIKE '%hito%' OR routine_name LIKE '%proyecto%';
