-- ============================================================================
-- MIGRACIÓN: Sistema de Auditoría - FASE 4.3
-- Fecha: Diciembre 2024
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE LOGS DE AUDITORÍA
-- ============================================================================

CREATE TABLE IF NOT EXISTS core_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Usuario
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_name VARCHAR(255),

  -- Acción
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'IMPORT',
    'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'CANCEL', 'PRINT'
  )),

  -- Módulo y entidad
  module VARCHAR(50) NOT NULL CHECK (module IN (
    'eventos', 'clientes', 'inventario', 'contabilidad',
    'facturacion', 'usuarios', 'configuracion', 'reportes', 'sistema'
  )),
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255),
  entity_name VARCHAR(500),

  -- Valores (cambios)
  old_values JSONB,
  new_values JSONB,

  -- Contexto
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',

  -- Empresa (multitenancy)
  company_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON core_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON core_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_module ON core_audit_log(module);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON core_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON core_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_company_id ON core_audit_log(company_id);

-- Índice parcial para búsquedas de cambios (UPDATE/DELETE)
CREATE INDEX IF NOT EXISTS idx_audit_changes ON core_audit_log(entity_type, entity_id)
  WHERE action IN ('UPDATE', 'DELETE');

-- ============================================================================
-- 2. POLÍTICAS RLS
-- ============================================================================

ALTER TABLE core_audit_log ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver logs de su empresa
CREATE POLICY "Users can view company audit logs" ON core_audit_log
  FOR SELECT
  USING (
    company_id IS NULL OR
    company_id IN (
      SELECT company_id FROM core_users WHERE auth_id = auth.uid()
    )
  );

-- Solo el sistema puede insertar logs
CREATE POLICY "System can insert audit logs" ON core_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Nadie puede actualizar o eliminar logs
-- (No crear políticas para UPDATE/DELETE)

-- ============================================================================
-- 3. FUNCIÓN PARA AUDITORÍA AUTOMÁTICA
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_old_values JSONB;
  v_new_values JSONB;
  v_action VARCHAR(50);
BEGIN
  -- Obtener usuario actual
  v_user_id := auth.uid();

  -- Determinar acción
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_new_values := to_jsonb(NEW);
    v_old_values := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  END IF;

  -- Insertar log
  INSERT INTO core_audit_log (
    user_id,
    action,
    module,
    entity_type,
    entity_id,
    old_values,
    new_values,
    company_id
  ) VALUES (
    v_user_id,
    v_action,
    TG_ARGV[0], -- módulo pasado como argumento
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    v_old_values,
    v_new_values,
    COALESCE(NEW.company_id, OLD.company_id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. APLICAR TRIGGERS A TABLAS CRÍTICAS
-- ============================================================================

-- Eventos
DROP TRIGGER IF EXISTS audit_eventos ON evt_eventos_erp;
CREATE TRIGGER audit_eventos
  AFTER INSERT OR UPDATE OR DELETE ON evt_eventos_erp
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function('eventos');

-- Ingresos
DROP TRIGGER IF EXISTS audit_ingresos ON evt_ingresos_erp;
CREATE TRIGGER audit_ingresos
  AFTER INSERT OR UPDATE OR DELETE ON evt_ingresos_erp
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function('eventos');

-- Gastos
DROP TRIGGER IF EXISTS audit_gastos ON evt_gastos_erp;
CREATE TRIGGER audit_gastos
  AFTER INSERT OR UPDATE OR DELETE ON evt_gastos_erp
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function('eventos');

-- Clientes
DROP TRIGGER IF EXISTS audit_clientes ON evt_clientes_erp;
CREATE TRIGGER audit_clientes
  AFTER INSERT OR UPDATE OR DELETE ON evt_clientes_erp
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function('clientes');

-- Productos
DROP TRIGGER IF EXISTS audit_productos ON inv_productos_erp;
CREATE TRIGGER audit_productos
  AFTER INSERT OR UPDATE OR DELETE ON inv_productos_erp
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function('inventario');

-- ============================================================================
-- 5. VISTA PARA CONSULTAS RÁPIDAS
-- ============================================================================

CREATE OR REPLACE VIEW vw_audit_log_summary AS
SELECT
  DATE_TRUNC('day', created_at) AS fecha,
  module,
  action,
  COUNT(*) AS total,
  COUNT(DISTINCT user_id) AS usuarios_unicos
FROM core_audit_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), module, action
ORDER BY fecha DESC, module, action;

-- ============================================================================
-- 6. FUNCIÓN PARA LIMPIAR LOGS ANTIGUOS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(dias_retener INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM core_audit_log
  WHERE created_at < NOW() - (dias_retener || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Log de la limpieza
  INSERT INTO core_audit_log (action, module, entity_type, metadata)
  VALUES ('DELETE', 'sistema', 'audit_cleanup', jsonb_build_object(
    'deleted_count', v_deleted,
    'retention_days', dias_retener
  ));

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE core_audit_log IS 'Sistema de auditoría - FASE 4.3';
