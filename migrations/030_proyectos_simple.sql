-- =====================================================
-- MIGRACIÓN SIMPLIFICADA - MÓDULO DE PROYECTOS
-- =====================================================
-- Versión: 030_simple - Sin dependencias externas opcionales
-- Fecha: 2025-12-02
-- =====================================================

-- Eliminar tablas si existen (orden inverso por dependencias)
DROP TABLE IF EXISTS proy_registros_tiempo CASCADE;
DROP TABLE IF EXISTS proy_hitos CASCADE;
DROP TABLE IF EXISTS proy_equipo CASCADE;
DROP TABLE IF EXISTS proy_tareas CASCADE;
DROP TABLE IF EXISTS proy_proyectos CASCADE;

-- =====================================================
-- 1. TABLA PRINCIPAL: PROYECTOS (sin FK a crm_clientes)
-- =====================================================
CREATE TABLE proy_proyectos (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cliente_id BIGINT,  -- Sin FK, será manual
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
CREATE INDEX idx_proy_proyectos_company ON proy_proyectos(company_id);
CREATE INDEX idx_proy_proyectos_status ON proy_proyectos(status);

-- =====================================================
-- 2. TABLA: TAREAS
-- =====================================================
CREATE TABLE proy_tareas (
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

COMMENT ON TABLE proy_tareas IS 'Tareas de proyectos';
CREATE INDEX idx_proy_tareas_proyecto ON proy_tareas(proyecto_id);
CREATE INDEX idx_proy_tareas_etapa ON proy_tareas(etapa_id);
CREATE INDEX idx_proy_tareas_status ON proy_tareas(status);

-- =====================================================
-- 3. TABLA: EQUIPO DEL PROYECTO
-- =====================================================
CREATE TABLE proy_equipo (
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

COMMENT ON TABLE proy_equipo IS 'Miembros del equipo de cada proyecto';
CREATE INDEX idx_proy_equipo_proyecto ON proy_equipo(proyecto_id);
CREATE INDEX idx_proy_equipo_usuario ON proy_equipo(usuario_id);

-- =====================================================
-- 4. TABLA: HITOS
-- =====================================================
CREATE TABLE proy_hitos (
  id BIGSERIAL PRIMARY KEY,
  proyecto_id BIGINT NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha_objetivo DATE,
  fecha_completado DATE,
  status VARCHAR(50) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'completado', 'atrasado')),
  entregables TEXT[],
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proy_hitos IS 'Hitos y entregables del proyecto';
CREATE INDEX idx_proy_hitos_proyecto ON proy_hitos(proyecto_id);
CREATE INDEX idx_proy_hitos_status ON proy_hitos(status);

-- =====================================================
-- 5. TABLA: REGISTROS DE TIEMPO
-- =====================================================
CREATE TABLE proy_registros_tiempo (
  id BIGSERIAL PRIMARY KEY,
  proyecto_id BIGINT NOT NULL REFERENCES proy_proyectos(id) ON DELETE CASCADE,
  tarea_id BIGINT REFERENCES proy_tareas(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  horas DECIMAL(5,2) NOT NULL CHECK (horas > 0),
  descripcion TEXT,
  facturable BOOLEAN DEFAULT true,
  tarifa DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proy_registros_tiempo IS 'Registro de horas trabajadas';
CREATE INDEX idx_proy_tiempo_proyecto ON proy_registros_tiempo(proyecto_id);
CREATE INDEX idx_proy_tiempo_tarea ON proy_registros_tiempo(tarea_id);
CREATE INDEX idx_proy_tiempo_usuario ON proy_registros_tiempo(usuario_id);
CREATE INDEX idx_proy_tiempo_fecha ON proy_registros_tiempo(fecha);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION proy_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER tr_proy_proyectos_updated
  BEFORE UPDATE ON proy_proyectos
  FOR EACH ROW EXECUTE FUNCTION proy_update_timestamp();

CREATE TRIGGER tr_proy_tareas_updated
  BEFORE UPDATE ON proy_tareas
  FOR EACH ROW EXECUTE FUNCTION proy_update_timestamp();

CREATE TRIGGER tr_proy_equipo_updated
  BEFORE UPDATE ON proy_equipo
  FOR EACH ROW EXECUTE FUNCTION proy_update_timestamp();

CREATE TRIGGER tr_proy_hitos_updated
  BEFORE UPDATE ON proy_hitos
  FOR EACH ROW EXECUTE FUNCTION proy_update_timestamp();

CREATE TRIGGER tr_proy_tiempo_updated
  BEFORE UPDATE ON proy_registros_tiempo
  FOR EACH ROW EXECUTE FUNCTION proy_update_timestamp();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE proy_proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_hitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proy_registros_tiempo ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (ajustar según necesidad)
CREATE POLICY "proy_proyectos_all" ON proy_proyectos FOR ALL USING (true);
CREATE POLICY "proy_tareas_all" ON proy_tareas FOR ALL USING (true);
CREATE POLICY "proy_equipo_all" ON proy_equipo FOR ALL USING (true);
CREATE POLICY "proy_hitos_all" ON proy_hitos FOR ALL USING (true);
CREATE POLICY "proy_registros_tiempo_all" ON proy_registros_tiempo FOR ALL USING (true);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migración de proyectos completada exitosamente';
  RAISE NOTICE 'Tablas creadas: proy_proyectos, proy_tareas, proy_equipo, proy_hitos, proy_registros_tiempo';
END $$;
