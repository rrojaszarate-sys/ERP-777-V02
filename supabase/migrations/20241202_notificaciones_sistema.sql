-- ============================================================================
-- MIGRACIÓN: Sistema de Notificaciones y mejoras FASE 1-3
-- Fecha: Diciembre 2024
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE NOTIFICACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS core_notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo y contenido
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'evento_proximo', 'pago_vencido', 'gasto_pendiente',
    'stock_bajo', 'tarea_asignada', 'cambio_estado',
    'sistema', 'alerta'
  )),
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT,
  link VARCHAR(500),

  -- Estado
  leida BOOLEAN DEFAULT false,
  prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),

  -- Metadata adicional (JSON)
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Opcional: notificaciones que expiran

  -- Índices para búsqueda rápida
  CONSTRAINT notificaciones_titulo_length CHECK (char_length(titulo) >= 3)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notificaciones_user_id ON core_notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON core_notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON core_notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at ON core_notificaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_prioridad ON core_notificaciones(prioridad);

-- RLS
ALTER TABLE core_notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own notifications" ON core_notificaciones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON core_notificaciones
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON core_notificaciones
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON core_notificaciones
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 2. FUNCIÓN PARA CREAR NOTIFICACIONES
-- ============================================================================

CREATE OR REPLACE FUNCTION crear_notificacion(
  p_user_id UUID,
  p_tipo VARCHAR(50),
  p_titulo VARCHAR(255),
  p_mensaje TEXT DEFAULT NULL,
  p_link VARCHAR(500) DEFAULT NULL,
  p_prioridad VARCHAR(20) DEFAULT 'media',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notificacion_id UUID;
BEGIN
  INSERT INTO core_notificaciones (
    user_id, tipo, titulo, mensaje, link, prioridad, metadata
  ) VALUES (
    p_user_id, p_tipo, p_titulo, p_mensaje, p_link, p_prioridad, p_metadata
  ) RETURNING id INTO v_notificacion_id;

  RETURN v_notificacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. TRIGGER PARA NOTIFICAR EVENTOS PRÓXIMOS
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_notificar_evento_proximo()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el evento está a 7 días o menos
  IF NEW.fecha_inicio::date - CURRENT_DATE <= 7 AND NEW.fecha_inicio::date >= CURRENT_DATE THEN
    -- Notificar al responsable
    IF NEW.responsable_id IS NOT NULL THEN
      PERFORM crear_notificacion(
        NEW.responsable_id,
        'evento_proximo',
        'Evento próximo: ' || NEW.clave_evento,
        'El evento "' || NEW.nombre_proyecto || '" está programado para ' || to_char(NEW.fecha_inicio, 'DD/MM/YYYY'),
        '/eventos-erp?evento=' || NEW.id,
        CASE
          WHEN NEW.fecha_inicio::date - CURRENT_DATE <= 1 THEN 'critica'
          WHEN NEW.fecha_inicio::date - CURRENT_DATE <= 3 THEN 'alta'
          ELSE 'media'
        END,
        jsonb_build_object('evento_id', NEW.id, 'dias_restantes', NEW.fecha_inicio::date - CURRENT_DATE)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger (solo en UPDATE para evitar duplicados)
DROP TRIGGER IF EXISTS trg_notificar_evento_proximo ON evt_eventos_erp;
CREATE TRIGGER trg_notificar_evento_proximo
  AFTER UPDATE OF fecha_inicio ON evt_eventos_erp
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notificar_evento_proximo();

-- ============================================================================
-- 4. FUNCIÓN PARA LIMPIAR NOTIFICACIONES ANTIGUAS
-- ============================================================================

CREATE OR REPLACE FUNCTION limpiar_notificaciones_antiguas(dias_antiguedad INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM core_notificaciones
  WHERE created_at < NOW() - (dias_antiguedad || ' days')::INTERVAL
    AND leida = true;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. MEJORAS DE ÍNDICES PARA BÚSQUEDA GLOBAL
-- ============================================================================

-- Índices de texto para búsqueda rápida en eventos
CREATE INDEX IF NOT EXISTS idx_eventos_busqueda_clave
  ON evt_eventos_erp(clave_evento);

CREATE INDEX IF NOT EXISTS idx_eventos_busqueda_nombre
  ON evt_eventos_erp USING gin(to_tsvector('spanish', nombre_proyecto));

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_busqueda_razon
  ON evt_clientes_erp USING gin(to_tsvector('spanish', razon_social));

CREATE INDEX IF NOT EXISTS idx_clientes_busqueda_rfc
  ON evt_clientes_erp(rfc);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_busqueda_nombre
  ON inv_productos_erp USING gin(to_tsvector('spanish', nombre));

CREATE INDEX IF NOT EXISTS idx_productos_busqueda_codigo
  ON inv_productos_erp(codigo);

-- ============================================================================
-- 6. VISTA PARA RESUMEN DE NOTIFICACIONES
-- ============================================================================

CREATE OR REPLACE VIEW vw_notificaciones_resumen AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE NOT leida) as sin_leer,
  COUNT(*) FILTER (WHERE prioridad = 'critica' AND NOT leida) as criticas,
  COUNT(*) FILTER (WHERE prioridad = 'alta' AND NOT leida) as altas,
  COUNT(*) as total
FROM core_notificaciones
GROUP BY user_id;

-- ============================================================================
-- 7. DATOS INICIALES DE PRUEBA (opcional, comentar en producción)
-- ============================================================================

-- INSERT INTO core_notificaciones (user_id, tipo, titulo, mensaje, prioridad) VALUES
-- (null, 'sistema', 'Bienvenido al ERP MADE 777', 'El sistema está listo para usar', 'baja');

COMMENT ON TABLE core_notificaciones IS 'Sistema de notificaciones in-app para usuarios - FASE 2.2';
