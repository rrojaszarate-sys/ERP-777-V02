-- ============================================================================
-- SOFT DELETE CON AUDITORÍA COMPLETA
-- ============================================================================
-- Este script agrega las columnas necesarias para implementar soft delete
-- con auditoría completa en las tablas de finanzas del ERP.
-- 
-- BENEFICIOS:
-- ✅ Los registros nunca se eliminan físicamente (recuperables)
-- ✅ Se registra quién eliminó, cuándo y desde dónde
-- ✅ Historial completo de eliminaciones para auditoría
-- ✅ Base para implementar confirmación con contraseña en el futuro
-- ============================================================================
-- ============================================================================
-- PASO 1: AGREGAR COLUMNAS DE SOFT DELETE A evt_gastos_erp
-- ============================================================================
ALTER TABLE evt_gastos_erp
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
    ADD COLUMN IF NOT EXISTS deleted_from_ip TEXT,
    ADD COLUMN IF NOT EXISTS deleted_user_agent TEXT;
-- Comentarios descriptivos
COMMENT ON COLUMN evt_gastos_erp.activo IS 'Indica si el registro está activo (TRUE) o fue eliminado (FALSE)';
COMMENT ON COLUMN evt_gastos_erp.deleted_at IS 'Fecha y hora de eliminación (soft delete)';
COMMENT ON COLUMN evt_gastos_erp.deleted_by IS 'UUID del usuario que eliminó el registro';
COMMENT ON COLUMN evt_gastos_erp.deleted_reason IS 'Razón/motivo de la eliminación (opcional)';
COMMENT ON COLUMN evt_gastos_erp.deleted_from_ip IS 'Dirección IP desde donde se eliminó';
COMMENT ON COLUMN evt_gastos_erp.deleted_user_agent IS 'User Agent del navegador/dispositivo';
-- Índice para optimizar consultas de registros activos
CREATE INDEX IF NOT EXISTS idx_gastos_activo ON evt_gastos_erp(activo)
WHERE activo = TRUE;
-- ============================================================================
-- PASO 2: AGREGAR COLUMNAS DE SOFT DELETE A evt_ingresos_erp
-- ============================================================================
ALTER TABLE evt_ingresos_erp
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
    ADD COLUMN IF NOT EXISTS deleted_from_ip TEXT,
    ADD COLUMN IF NOT EXISTS deleted_user_agent TEXT;
-- Comentarios
COMMENT ON COLUMN evt_ingresos_erp.activo IS 'Indica si el registro está activo (TRUE) o fue eliminado (FALSE)';
COMMENT ON COLUMN evt_ingresos_erp.deleted_at IS 'Fecha y hora de eliminación (soft delete)';
COMMENT ON COLUMN evt_ingresos_erp.deleted_by IS 'UUID del usuario que eliminó el registro';
COMMENT ON COLUMN evt_ingresos_erp.deleted_reason IS 'Razón/motivo de la eliminación (opcional)';
COMMENT ON COLUMN evt_ingresos_erp.deleted_from_ip IS 'Dirección IP desde donde se eliminó';
COMMENT ON COLUMN evt_ingresos_erp.deleted_user_agent IS 'User Agent del navegador/dispositivo';
-- Índice
CREATE INDEX IF NOT EXISTS idx_ingresos_activo ON evt_ingresos_erp(activo)
WHERE activo = TRUE;
-- ============================================================================
-- PASO 3: AGREGAR COLUMNAS DE SOFT DELETE A evt_provisiones_erp
-- ============================================================================
ALTER TABLE evt_provisiones_erp
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
    ADD COLUMN IF NOT EXISTS deleted_from_ip TEXT,
    ADD COLUMN IF NOT EXISTS deleted_user_agent TEXT;
-- Comentarios
COMMENT ON COLUMN evt_provisiones_erp.activo IS 'Indica si el registro está activo (TRUE) o fue eliminado (FALSE)';
COMMENT ON COLUMN evt_provisiones_erp.deleted_at IS 'Fecha y hora de eliminación (soft delete)';
COMMENT ON COLUMN evt_provisiones_erp.deleted_by IS 'UUID del usuario que eliminó el registro';
COMMENT ON COLUMN evt_provisiones_erp.deleted_reason IS 'Razón/motivo de la eliminación (opcional)';
COMMENT ON COLUMN evt_provisiones_erp.deleted_from_ip IS 'Dirección IP desde donde se eliminó';
COMMENT ON COLUMN evt_provisiones_erp.deleted_user_agent IS 'User Agent del navegador/dispositivo';
-- Índice
CREATE INDEX IF NOT EXISTS idx_provisiones_activo ON evt_provisiones_erp(activo)
WHERE activo = TRUE;
-- ============================================================================
-- PASO 4: TABLA DE AUDITORÍA CENTRALIZADA (OPCIONAL - PARA HISTORIAL DETALLADO)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_eliminaciones_financieras (
    id SERIAL PRIMARY KEY,
    -- Datos del registro eliminado
    tabla_origen TEXT NOT NULL,
    -- 'evt_gastos_erp', 'evt_ingresos_erp', 'evt_provisiones_erp'
    registro_id INTEGER NOT NULL,
    evento_id INTEGER,
    company_id UUID,
    -- Snapshot del registro antes de eliminación
    registro_snapshot JSONB,
    -- Copia completa del registro
    -- Información financiera del registro
    concepto TEXT,
    subtotal NUMERIC(12, 2),
    iva NUMERIC(12, 2),
    total NUMERIC(12, 2),
    -- Auditoría de eliminación
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_by UUID REFERENCES auth.users(id),
    deleted_by_email TEXT,
    deleted_by_nombre TEXT,
    deleted_reason TEXT,
    -- Información del dispositivo
    deleted_from_ip TEXT,
    deleted_user_agent TEXT,
    deleted_device_type TEXT,
    -- 'desktop', 'mobile', 'tablet'
    deleted_browser TEXT,
    -- 'Chrome', 'Firefox', 'Safari', etc.
    deleted_os TEXT,
    -- 'Windows', 'macOS', 'iOS', 'Android'
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_tabla_origen ON audit_eliminaciones_financieras(tabla_origen);
CREATE INDEX IF NOT EXISTS idx_audit_evento_id ON audit_eliminaciones_financieras(evento_id);
CREATE INDEX IF NOT EXISTS idx_audit_deleted_by ON audit_eliminaciones_financieras(deleted_by);
CREATE INDEX IF NOT EXISTS idx_audit_deleted_at ON audit_eliminaciones_financieras(deleted_at);
-- Comentarios
COMMENT ON TABLE audit_eliminaciones_financieras IS 'Registro de auditoría para todas las eliminaciones de gastos, ingresos y provisiones';
-- ============================================================================
-- PASO 5: FUNCIÓN PARA SOFT DELETE CON AUDITORÍA
-- ============================================================================
CREATE OR REPLACE FUNCTION soft_delete_gasto(
        p_gasto_id INTEGER,
        p_user_id UUID,
        p_reason TEXT DEFAULT NULL,
        p_ip_address TEXT DEFAULT NULL,
        p_user_agent TEXT DEFAULT NULL
    ) RETURNS BOOLEAN AS $$
DECLARE v_gasto RECORD;
v_user_email TEXT;
v_user_nombre TEXT;
BEGIN -- Obtener datos del gasto
SELECT * INTO v_gasto
FROM evt_gastos_erp
WHERE id = p_gasto_id;
IF NOT FOUND THEN RETURN FALSE;
END IF;
-- Obtener datos del usuario
SELECT email,
    raw_user_meta_data->>'nombre' INTO v_user_email,
    v_user_nombre
FROM auth.users
WHERE id = p_user_id;
-- Marcar como eliminado (soft delete)
UPDATE evt_gastos_erp
SET activo = FALSE,
    deleted_at = NOW(),
    deleted_by = p_user_id,
    deleted_reason = p_reason,
    deleted_from_ip = p_ip_address,
    deleted_user_agent = p_user_agent
WHERE id = p_gasto_id;
-- Registrar en tabla de auditoría
INSERT INTO audit_eliminaciones_financieras (
        tabla_origen,
        registro_id,
        evento_id,
        company_id,
        registro_snapshot,
        concepto,
        subtotal,
        iva,
        total,
        deleted_by,
        deleted_by_email,
        deleted_by_nombre,
        deleted_reason,
        deleted_from_ip,
        deleted_user_agent
    )
VALUES (
        'evt_gastos_erp',
        v_gasto.id,
        v_gasto.evento_id,
        v_gasto.company_id,
        row_to_json(v_gasto)::jsonb,
        v_gasto.concepto,
        v_gasto.subtotal,
        v_gasto.iva,
        v_gasto.total,
        p_user_id,
        v_user_email,
        v_user_nombre,
        p_reason,
        p_ip_address,
        p_user_agent
    );
RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================================
-- PASO 6: FUNCIÓN PARA RESTAURAR REGISTRO ELIMINADO
-- ============================================================================
CREATE OR REPLACE FUNCTION restaurar_gasto(p_gasto_id INTEGER, p_user_id UUID) RETURNS BOOLEAN AS $$ BEGIN
UPDATE evt_gastos_erp
SET activo = TRUE,
    deleted_at = NULL,
    deleted_by = NULL,
    deleted_reason = NULL,
    deleted_from_ip = NULL,
    deleted_user_agent = NULL
WHERE id = p_gasto_id;
IF FOUND THEN -- Registrar la restauración en auditoría
INSERT INTO audit_eliminaciones_financieras (
        tabla_origen,
        registro_id,
        deleted_reason,
        deleted_by
    )
VALUES (
        'evt_gastos_erp',
        p_gasto_id,
        'RESTAURACIÓN - Registro reactivado',
        p_user_id
    );
RETURN TRUE;
END IF;
RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================================
-- PASO 7: ACTUALIZAR VISTAS PARA EXCLUIR REGISTROS ELIMINADOS
-- ============================================================================
-- Las consultas existentes ya deben filtrar por activo = TRUE
-- Ejemplo de vista filtrada:
-- CREATE OR REPLACE VIEW vw_gastos_activos AS
-- SELECT g.*, c.nombre as categoria_nombre, c.color as categoria_color
-- FROM evt_gastos_erp g
-- LEFT JOIN evt_categorias c ON g.categoria_id = c.id
-- WHERE g.activo = TRUE OR g.activo IS NULL;
-- ============================================================================
-- PASO 8: VERIFICAR IMPLEMENTACIÓN
-- ============================================================================
-- Después de ejecutar este script, verifica las columnas:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'evt_gastos_erp'
-- AND column_name IN ('activo', 'deleted_at', 'deleted_by', 'deleted_reason');
-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN EN EL FRONTEND:
-- ============================================================================
-- 
-- 1. Al eliminar un registro, usar:
--    await supabase.rpc('soft_delete_gasto', {
--        p_gasto_id: gastoId,
--        p_user_id: userId,
--        p_reason: 'Motivo opcional',
--        p_ip_address: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip),
--        p_user_agent: navigator.userAgent
--    });
--
-- 2. Para queries normales, agregar filtro:
--    .eq('activo', true)
--    o
--    .or('activo.eq.true,activo.is.null')
--
-- 3. Para ver registros eliminados (admin):
--    .eq('activo', false)
--
-- 4. Para restaurar:
--    await supabase.rpc('restaurar_gasto', { p_gasto_id: gastoId, p_user_id: userId });
--
-- ============================================================================
-- FUTURO: CONFIRMACIÓN CON CONTRASEÑA
-- ============================================================================
-- 
-- Para implementar confirmación con contraseña:
-- 
-- 1. Crear una función RPC que verifique la contraseña:
--    CREATE FUNCTION verificar_password_para_eliminar(
--        p_user_id UUID,
--        p_password TEXT,
--        p_gasto_id INTEGER
--    ) RETURNS BOOLEAN AS $$
--    DECLARE
--        v_password_hash TEXT;
--    BEGIN
--        -- Verificar contraseña usando pgcrypto
--        SELECT encrypted_password INTO v_password_hash
--        FROM auth.users WHERE id = p_user_id;
--        
--        IF crypt(p_password, v_password_hash) = v_password_hash THEN
--            -- Contraseña correcta, proceder con eliminación
--            PERFORM soft_delete_gasto(p_gasto_id, p_user_id, 'Eliminación con confirmación de contraseña');
--            RETURN TRUE;
--        END IF;
--        
--        RETURN FALSE;
--    END;
--    $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- 2. En el frontend, mostrar modal de confirmación con campo de contraseña
-- 3. Llamar a la función RPC con la contraseña
-- ============================================================================