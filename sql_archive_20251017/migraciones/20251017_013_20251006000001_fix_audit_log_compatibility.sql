-- Agregar columnas de compatibilidad para el servicio de auditoría
-- Esto permite que el código use tanto los nombres antiguos como los nuevos

-- Agregar columnas alias para compatibilidad
ALTER TABLE core_audit_log
ADD COLUMN IF NOT EXISTS datos_anteriores jsonb,
ADD COLUMN IF NOT EXISTS datos_nuevos jsonb,
ADD COLUMN IF NOT EXISTS usuario_id uuid,
ADD COLUMN IF NOT EXISTS evento_id varchar(100);

-- Crear función para sincronizar datos_anteriores/datos_nuevos con old_value/new_value
CREATE OR REPLACE FUNCTION sync_audit_log_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se insertaron datos en datos_anteriores/datos_nuevos, copiarlos a old_value/new_value
  IF NEW.datos_anteriores IS NOT NULL AND NEW.old_value IS NULL THEN
    NEW.old_value := NEW.datos_anteriores;
  END IF;

  IF NEW.datos_nuevos IS NOT NULL AND NEW.new_value IS NULL THEN
    NEW.new_value := NEW.datos_nuevos;
  END IF;

  -- Si se insertó usuario_id, copiarlo a user_id
  IF NEW.usuario_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.user_id := NEW.usuario_id;
  END IF;

  -- Si se insertó evento_id, copiarlo a entity_id
  IF NEW.evento_id IS NOT NULL AND NEW.entity_id IS NULL THEN
    NEW.entity_id := NEW.evento_id;
  END IF;

  -- Establecer valores por defecto si no se proporcionaron
  IF NEW.module IS NULL THEN
    NEW.module := 'eventos';
  END IF;

  IF NEW.entity_type IS NULL THEN
    NEW.entity_type := 'evento';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS sync_audit_log_trigger ON core_audit_log;
CREATE TRIGGER sync_audit_log_trigger
  BEFORE INSERT ON core_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION sync_audit_log_data();

-- Agregar índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario_id ON core_audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_evento_id ON core_audit_log(evento_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON core_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON core_audit_log(timestamp);
