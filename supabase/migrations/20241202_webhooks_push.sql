-- ============================================
-- FASE 5.3: Webhooks y Notificaciones Push
-- Migración: 20241202_webhooks_push.sql
-- ============================================

-- ============================================
-- TABLA DE WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks_erp (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies_erp(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    url VARCHAR(500) NOT NULL,
    eventos JSONB NOT NULL DEFAULT '[]', -- Array de tipos de eventos
    secret VARCHAR(100),
    headers JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    reintentos_max INTEGER DEFAULT 3,
    timeout_ms INTEGER DEFAULT 30000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_company ON webhooks_erp(company_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_activo ON webhooks_erp(activo);
CREATE INDEX IF NOT EXISTS idx_webhooks_eventos ON webhooks_erp USING GIN (eventos);

-- ============================================
-- TABLA DE LOGS DE WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks_logs_erp (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER NOT NULL REFERENCES webhooks_erp(id) ON DELETE CASCADE,
    evento VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error TEXT,
    intentos INTEGER DEFAULT 1,
    success BOOLEAN DEFAULT false,
    duracion_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhooks_logs_erp(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_evento ON webhooks_logs_erp(evento);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_success ON webhooks_logs_erp(success);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhooks_logs_erp(created_at DESC);

-- ============================================
-- TABLA DE SUSCRIPCIONES PUSH
-- ============================================

CREATE TABLE IF NOT EXISTS push_subscriptions_erp (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL, -- {p256dh, auth}
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_sub_user_endpoint ON push_subscriptions_erp(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions_erp(user_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_activo ON push_subscriptions_erp(activo);

-- ============================================
-- TABLA DE NOTIFICACIONES PUSH
-- ============================================

CREATE TABLE IF NOT EXISTS push_notifications_erp (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    icono VARCHAR(500),
    url VARCHAR(500),
    data JSONB DEFAULT '{}',
    enviada BOOLEAN DEFAULT false,
    leida BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_push_notif_user ON push_notifications_erp(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notif_leida ON push_notifications_erp(leida);
CREATE INDEX IF NOT EXISTS idx_push_notif_created ON push_notifications_erp(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Habilitar RLS
ALTER TABLE webhooks_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks_logs_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications_erp ENABLE ROW LEVEL SECURITY;

-- Políticas para webhooks
CREATE POLICY "Webhooks visible por empresa"
    ON webhooks_erp FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM core_users WHERE id = auth.uid()
    ));

CREATE POLICY "Webhooks editable por empresa"
    ON webhooks_erp FOR ALL
    USING (company_id IN (
        SELECT company_id FROM core_users WHERE id = auth.uid()
    ));

-- Políticas para logs
CREATE POLICY "Logs visible por webhook de empresa"
    ON webhooks_logs_erp FOR SELECT
    USING (webhook_id IN (
        SELECT id FROM webhooks_erp WHERE company_id IN (
            SELECT company_id FROM core_users WHERE id = auth.uid()
        )
    ));

-- Políticas para suscripciones push
CREATE POLICY "Suscripciones push por usuario"
    ON push_subscriptions_erp FOR ALL
    USING (user_id = auth.uid());

-- Políticas para notificaciones
CREATE POLICY "Notificaciones por usuario"
    ON push_notifications_erp FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para obtener webhooks activos por evento
CREATE OR REPLACE FUNCTION get_active_webhooks(
    p_company_id UUID,
    p_evento TEXT
)
RETURNS TABLE(
    id INTEGER,
    url VARCHAR,
    secret VARCHAR,
    headers JSONB,
    reintentos_max INTEGER,
    timeout_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.url,
        w.secret,
        w.headers,
        w.reintentos_max,
        w.timeout_ms
    FROM webhooks_erp w
    WHERE w.company_id = p_company_id
      AND w.activo = true
      AND w.eventos @> jsonb_build_array(p_evento);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar logs antiguos (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_webhook_logs(
    p_dias INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM webhooks_logs_erp
    WHERE created_at < NOW() - (p_dias || ' days')::INTERVAL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de un webhook
CREATE OR REPLACE FUNCTION get_webhook_stats(
    p_webhook_id INTEGER,
    p_dias INTEGER DEFAULT 7
)
RETURNS TABLE(
    total BIGINT,
    exitosos BIGINT,
    fallidos BIGINT,
    duracion_promedio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE success = true)::BIGINT as exitosos,
        COUNT(*) FILTER (WHERE success = false)::BIGINT as fallidos,
        COALESCE(AVG(duracion_ms), 0)::NUMERIC as duracion_promedio
    FROM webhooks_logs_erp
    WHERE webhook_id = p_webhook_id
      AND created_at > NOW() - (p_dias || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at en webhooks
CREATE OR REPLACE FUNCTION update_webhook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_webhooks_updated
    BEFORE UPDATE ON webhooks_erp
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_timestamp();

-- ============================================
-- TABLA DE NOTIFICACIONES DE CLIENTES (para portal)
-- ============================================

CREATE TABLE IF NOT EXISTS notificaciones_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES crm_clientes(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'info', -- info, success, warning, error
    leida BOOLEAN DEFAULT false,
    link VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_cliente ON notificaciones_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_notif_cliente_leida ON notificaciones_cliente(leida);

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE webhooks_erp IS 'Configuración de webhooks por empresa';
COMMENT ON TABLE webhooks_logs_erp IS 'Registro de envíos de webhooks';
COMMENT ON TABLE push_subscriptions_erp IS 'Suscripciones a notificaciones push de usuarios';
COMMENT ON TABLE push_notifications_erp IS 'Historial de notificaciones push enviadas';
COMMENT ON TABLE notificaciones_cliente IS 'Notificaciones para clientes del portal';

-- ============================================
-- DATOS INICIALES DE EJEMPLO
-- ============================================

-- Insertar tipos de webhook comentados para referencia
COMMENT ON COLUMN webhooks_erp.eventos IS
'Array de tipos de eventos soportados:
- evento.created, evento.updated, evento.status_changed, evento.deleted
- factura.created, factura.timbrada, factura.cancelada, factura.pagada
- cliente.created, cliente.updated
- inventario.bajo_stock, inventario.movimiento
- solicitud.created, solicitud.aprobada, solicitud.rechazada
- pago.recibido
- cotizacion.aprobada, cotizacion.rechazada
- notificacion.urgente';
