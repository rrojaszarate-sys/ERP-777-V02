-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 TABLA: evt_historial_reportes_diarios
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Descripción: Registra el historial de reportes diarios enviados a responsables
-- Uso: Sistema de alertas automáticas de ingresos pendientes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS evt_historial_reportes_diarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Información básica
  fecha_envio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_responsable_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  
  -- Estadísticas del reporte
  total_ingresos INTEGER NOT NULL DEFAULT 0,
  total_vencidas INTEGER NOT NULL DEFAULT 0,
  total_hoy INTEGER NOT NULL DEFAULT 0,
  total_semana INTEGER NOT NULL DEFAULT 0,
  total_proximas INTEGER NOT NULL DEFAULT 0,
  
  -- Montos
  monto_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  monto_vencidas NUMERIC(15,2) NOT NULL DEFAULT 0,
  monto_hoy NUMERIC(15,2) NOT NULL DEFAULT 0,
  monto_semana NUMERIC(15,2) NOT NULL DEFAULT 0,
  monto_proximas NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Estado del envío
  email_enviado BOOLEAN NOT NULL DEFAULT false,
  email_destinatario TEXT,
  error_mensaje TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_historial_reportes_fecha 
  ON evt_historial_reportes_diarios(fecha_envio DESC);

CREATE INDEX IF NOT EXISTS idx_historial_reportes_usuario 
  ON evt_historial_reportes_diarios(usuario_responsable_id);

CREATE INDEX IF NOT EXISTS idx_historial_reportes_email_enviado 
  ON evt_historial_reportes_diarios(email_enviado);

-- 3. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_evt_historial_reportes_diarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_evt_historial_reportes_diarios_updated_at
  BEFORE UPDATE ON evt_historial_reportes_diarios
  FOR EACH ROW
  EXECUTE FUNCTION update_evt_historial_reportes_diarios_updated_at();

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE evt_historial_reportes_diarios ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS

-- Política 1: Usuarios pueden ver su propio historial
CREATE POLICY "Responsables pueden ver su historial de reportes"
  ON evt_historial_reportes_diarios
  FOR SELECT
  USING (auth.uid() = usuario_responsable_id);

-- Política 2: Admins y superadmins pueden ver todo
CREATE POLICY "Admins pueden ver todos los reportes"
  ON evt_historial_reportes_diarios
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE role IN ('admin', 'superadmin')
    )
  );

-- Política 3: Solo el sistema (service_role) puede insertar
CREATE POLICY "Sistema puede insertar reportes"
  ON evt_historial_reportes_diarios
  FOR INSERT
  WITH CHECK (true);

-- Política 4: Solo el sistema puede actualizar
CREATE POLICY "Sistema puede actualizar reportes"
  ON evt_historial_reportes_diarios
  FOR UPDATE
  USING (true);

-- 6. Comentarios de documentación
COMMENT ON TABLE evt_historial_reportes_diarios IS 
  'Registro de reportes diarios enviados a responsables con sus ingresos pendientes';

COMMENT ON COLUMN evt_historial_reportes_diarios.fecha_envio IS 
  'Fecha y hora en que se envió el reporte';

COMMENT ON COLUMN evt_historial_reportes_diarios.usuario_responsable_id IS 
  'ID del usuario responsable que recibió el reporte';

COMMENT ON COLUMN evt_historial_reportes_diarios.total_ingresos IS 
  'Cantidad total de ingresos pendientes en el reporte';

COMMENT ON COLUMN evt_historial_reportes_diarios.total_vencidas IS 
  'Cantidad de facturas vencidas';

COMMENT ON COLUMN evt_historial_reportes_diarios.total_hoy IS 
  'Cantidad de facturas que vencen el día del reporte';

COMMENT ON COLUMN evt_historial_reportes_diarios.monto_total IS 
  'Monto total de todos los ingresos pendientes';

COMMENT ON COLUMN evt_historial_reportes_diarios.email_enviado IS 
  'Indica si el email se envió exitosamente';

COMMENT ON COLUMN evt_historial_reportes_diarios.email_destinatario IS 
  'Email del destinatario del reporte';

COMMENT ON COLUMN evt_historial_reportes_diarios.error_mensaje IS 
  'Mensaje de error si falló el envío del email';

-- 7. Vista para dashboard de reportes
CREATE OR REPLACE VIEW vista_estadisticas_reportes_diarios AS
SELECT 
  DATE(fecha_envio) as fecha,
  COUNT(*) as reportes_enviados,
  SUM(CASE WHEN email_enviado THEN 1 ELSE 0 END) as exitosos,
  SUM(CASE WHEN NOT email_enviado THEN 1 ELSE 0 END) as fallidos,
  SUM(total_ingresos) as total_ingresos,
  SUM(total_vencidas) as total_vencidas,
  SUM(monto_total) as monto_total,
  SUM(monto_vencidas) as monto_vencidas
FROM evt_historial_reportes_diarios
GROUP BY DATE(fecha_envio)
ORDER BY fecha DESC;

-- 8. Datos de ejemplo (opcional, comentados)
/*
INSERT INTO evt_historial_reportes_diarios (
  usuario_responsable_id,
  total_ingresos,
  total_vencidas,
  total_hoy,
  total_semana,
  total_proximas,
  monto_total,
  monto_vencidas,
  email_enviado,
  email_destinatario
) VALUES (
  'uuid-del-usuario',
  12,
  2,
  1,
  4,
  5,
  245890.50,
  57120.00,
  true,
  'responsable@example.com'
);
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ COMPLETADO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Para ejecutar:
-- 1. Abrir Supabase Dashboard > SQL Editor
-- 2. Pegar este script completo
-- 3. Ejecutar (Run)
-- 4. Verificar que la tabla se creó: SELECT * FROM evt_historial_reportes_diarios;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
