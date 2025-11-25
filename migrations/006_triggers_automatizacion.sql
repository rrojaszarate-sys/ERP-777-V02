-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 006: TRIGGERS Y FUNCIONES DE AUTOMATIZACIÓN
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-10-27
-- Propósito: Automatizar creación de asientos, movimientos y auditoría
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCIÓN 1: Crear asiento contable automático al cobrar/pagar
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_crear_asiento_automatico()
RETURNS TRIGGER AS $$
DECLARE
  v_asiento_id INTEGER;
  v_numero_asiento TEXT;
  v_cuenta_banco_id INTEGER;
  v_cuenta_contable_id INTEGER;
  v_descripcion TEXT;
  v_fecha DATE;
  v_tipo_asiento VARCHAR(30);
  v_es_ingreso BOOLEAN;
BEGIN
  -- Determinar si es ingreso o gasto
  v_es_ingreso := (TG_TABLE_NAME LIKE '%ingreso%');
  
  -- Solo crear asiento si se marca como cobrado/pagado
  IF (v_es_ingreso AND NEW.cobrado = true AND (OLD IS NULL OR OLD.cobrado = false)) OR
     (NOT v_es_ingreso AND NEW.pagado = true AND (OLD IS NULL OR OLD.pagado = false)) THEN
    
    -- Obtener cuentas
    v_cuenta_banco_id := NEW.cuenta_id;
    
    IF v_cuenta_banco_id IS NULL THEN
      RAISE EXCEPTION 'No se puede crear asiento sin cuenta bancaria/caja asignada';
    END IF;
    
    v_cuenta_contable_id := CASE 
      WHEN v_es_ingreso THEN NEW.cuenta_contable_ingreso_id
      ELSE NEW.cuenta_contable_gasto_id
    END;
    
    -- Generar número de asiento
    v_fecha := COALESCE(NEW.fecha_cobro, NEW.fecha_pago, NEW.fecha_ingreso, NEW.fecha_gasto, CURRENT_DATE);
    v_numero_asiento := 'A-' || TO_CHAR(v_fecha, 'YYYYMM') || '-' || 
                        LPAD(NEXTVAL('seq_numero_asiento')::TEXT, 4, '0');
    
    -- Descripción
    v_descripcion := CASE 
      WHEN v_es_ingreso THEN 'Cobro: ' || NEW.concepto
      ELSE 'Pago: ' || NEW.concepto
    END;
    
    v_tipo_asiento := CASE 
      WHEN v_es_ingreso THEN 'ingreso'
      ELSE 'egreso'
    END;
    
    -- Crear asiento
    INSERT INTO cont_asientos_contables (
      numero_asiento, fecha_asiento, periodo, descripcion,
      referencia_tabla, referencia_id, tipo_asiento, estado, 
      created_by, confirmado_at, confirmado_por
    ) VALUES (
      v_numero_asiento, 
      v_fecha,
      TO_CHAR(v_fecha, 'YYYY-MM'),
      v_descripcion,
      TG_TABLE_NAME, NEW.id,
      v_tipo_asiento,
      'confirmado',
      COALESCE(NEW.created_by, NEW.updated_by),
      now(),
      COALESCE(NEW.updated_by, NEW.created_by)
    ) RETURNING id INTO v_asiento_id;
    
    -- Crear partidas (partida doble)
    IF v_es_ingreso THEN
      -- INGRESO: DEBE Banco / HABER Ingreso
      INSERT INTO cont_partidas (asiento_id, cuenta_id, debe, concepto)
      VALUES (v_asiento_id, v_cuenta_banco_id, NEW.total, 'Depósito bancario');
      
      IF v_cuenta_contable_id IS NOT NULL THEN
        INSERT INTO cont_partidas (asiento_id, cuenta_id, haber, concepto)
        VALUES (v_asiento_id, v_cuenta_contable_id, NEW.total, v_descripcion);
      END IF;
      
      -- Crear movimiento bancario (depósito)
      INSERT INTO cont_movimientos_bancarios (
        tipo, cuenta_destino_id, monto, concepto,
        referencia_tabla, referencia_id, fecha_movimiento, 
        estado, created_by
      ) VALUES (
        'deposito', v_cuenta_banco_id, NEW.total, v_descripcion,
        TG_TABLE_NAME, NEW.id, v_fecha,
        'confirmado', COALESCE(NEW.updated_by, NEW.created_by)
      );
    ELSE
      -- GASTO: DEBE Gasto / HABER Banco
      IF v_cuenta_contable_id IS NOT NULL THEN
        INSERT INTO cont_partidas (asiento_id, cuenta_id, debe, concepto)
        VALUES (v_asiento_id, v_cuenta_contable_id, NEW.total, v_descripcion);
      END IF;
      
      INSERT INTO cont_partidas (asiento_id, cuenta_id, haber, concepto)
      VALUES (v_asiento_id, v_cuenta_banco_id, NEW.total, 'Retiro bancario');
      
      -- Crear movimiento bancario (retiro)
      INSERT INTO cont_movimientos_bancarios (
        tipo, cuenta_origen_id, monto, concepto,
        referencia_tabla, referencia_id, fecha_movimiento,
        estado, created_by
      ) VALUES (
        'retiro', v_cuenta_banco_id, NEW.total, v_descripcion,
        TG_TABLE_NAME, NEW.id, v_fecha,
        'confirmado', COALESCE(NEW.updated_by, NEW.created_by)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas de ingresos
CREATE TRIGGER trg_asiento_evt_ingresos
  AFTER INSERT OR UPDATE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION fn_crear_asiento_automatico();

-- Aplicar trigger a tablas de gastos
CREATE TRIGGER trg_asiento_evt_gastos
  AFTER INSERT OR UPDATE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION fn_crear_asiento_automatico();

-- Aplicar trigger a ingresos externos (se asume cobrado=true al crear)
CREATE TRIGGER trg_asiento_cont_ingresos_externos
  AFTER INSERT ON cont_ingresos_externos
  FOR EACH ROW 
  WHEN (NEW.cobrado = true)
  EXECUTE FUNCTION fn_crear_asiento_automatico();

-- Aplicar trigger a gastos externos (se asume pagado=true al crear)
CREATE TRIGGER trg_asiento_cont_gastos_externos
  AFTER INSERT ON cont_gastos_externos
  FOR EACH ROW
  WHEN (NEW.pagado = true)
  EXECUTE FUNCTION fn_crear_asiento_automatico();

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCIÓN 2: Auditoría de modificaciones
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_auditoria_modificacion()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_email TEXT;
  v_usuario_rol TEXT;
  v_usuario_id UUID;
BEGIN
  -- Obtener información del usuario desde JWT claims (Supabase)
  BEGIN
    v_usuario_email := current_setting('request.jwt.claims', true)::json->>'email';
    v_usuario_rol := current_setting('request.jwt.claims', true)::json->>'role';
    v_usuario_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  EXCEPTION
    WHEN OTHERS THEN
      v_usuario_email := 'sistema';
      v_usuario_rol := 'system';
      v_usuario_id := NULL;
  END;
  
  -- Validar que solo admin/contador pueda modificar registros existentes
  IF TG_OP = 'UPDATE' THEN
    IF v_usuario_rol NOT IN ('admin', 'contador', 'authenticated') THEN
      RAISE EXCEPTION 'Permisos insuficientes. Solo admin o contador pueden modificar registros financieros';
    END IF;
    
    -- Si ha pasado más de 7 días, solo admin
    IF OLD.created_at < NOW() - INTERVAL '7 days' AND v_usuario_rol != 'admin' THEN
      RAISE EXCEPTION 'Solo administradores pueden modificar registros con más de 7 días de antigüedad';
    END IF;
  END IF;
  
  -- Registrar cambios en campos críticos
  IF TG_OP = 'UPDATE' THEN
    -- Cambio en total
    IF OLD.total IS DISTINCT FROM NEW.total THEN
      INSERT INTO cont_auditoria_modificaciones (
        tabla, registro_id, campo_modificado, valor_anterior, valor_nuevo,
        razon, usuario_id, usuario_nombre, usuario_rol, operacion
      ) VALUES (
        TG_TABLE_NAME, OLD.id, 'total', 
        OLD.total::TEXT, NEW.total::TEXT,
        COALESCE(NEW.notas, 'Modificación sin justificación'),
        v_usuario_id, v_usuario_email, v_usuario_rol, 'UPDATE'
      );
    END IF;
    
    -- Cambio en fecha
    IF (OLD.fecha_ingreso IS DISTINCT FROM NEW.fecha_ingreso) OR 
       (OLD.fecha_gasto IS DISTINCT FROM NEW.fecha_gasto) THEN
      INSERT INTO cont_auditoria_modificaciones (
        tabla, registro_id, campo_modificado, valor_anterior, valor_nuevo,
        razon, usuario_id, usuario_nombre, usuario_rol, operacion
      ) VALUES (
        TG_TABLE_NAME, OLD.id, 'fecha',
        COALESCE(OLD.fecha_ingreso, OLD.fecha_gasto)::TEXT,
        COALESCE(NEW.fecha_ingreso, NEW.fecha_gasto)::TEXT,
        COALESCE(NEW.notas, 'Modificación sin justificación'),
        v_usuario_id, v_usuario_email, v_usuario_rol, 'UPDATE'
      );
    END IF;
    
    -- Cambio en concepto
    IF OLD.concepto IS DISTINCT FROM NEW.concepto THEN
      INSERT INTO cont_auditoria_modificaciones (
        tabla, registro_id, campo_modificado, valor_anterior, valor_nuevo,
        razon, usuario_id, usuario_nombre, usuario_rol, operacion
      ) VALUES (
        TG_TABLE_NAME, OLD.id, 'concepto',
        OLD.concepto, NEW.concepto,
        COALESCE(NEW.notas, 'Modificación sin justificación'),
        v_usuario_id, v_usuario_email, v_usuario_rol, 'UPDATE'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de auditoría BEFORE UPDATE
CREATE TRIGGER trg_auditoria_evt_ingresos
  BEFORE UPDATE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria_modificacion();

CREATE TRIGGER trg_auditoria_evt_gastos
  BEFORE UPDATE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria_modificacion();

CREATE TRIGGER trg_auditoria_cont_ingresos_externos
  BEFORE UPDATE ON cont_ingresos_externos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria_modificacion();

CREATE TRIGGER trg_auditoria_cont_gastos_externos
  BEFORE UPDATE ON cont_gastos_externos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria_modificacion();

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCIÓN 3: Generar nombre de archivo para documentos
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_generar_nombre_documento(
  p_referencia_tabla TEXT,
  p_referencia_id INTEGER,
  p_fecha DATE,
  p_extension TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_cuenta_nombre TEXT;
  v_tipo_prefix TEXT;
  v_nombre_limpio TEXT;
  v_nombre_archivo TEXT;
BEGIN
  -- Obtener nombre de cuenta según la tabla
  SELECT REPLACE(c.nombre, ' ', '_')
  INTO v_cuenta_nombre
  FROM evt_cuentas c
  WHERE c.id = (
    CASE p_referencia_tabla
      WHEN 'evt_ingresos' THEN
        (SELECT cuenta_id FROM evt_ingresos WHERE id = p_referencia_id)
      WHEN 'evt_gastos' THEN
        (SELECT cuenta_id FROM evt_gastos WHERE id = p_referencia_id)
      WHEN 'cont_ingresos_externos' THEN
        (SELECT cuenta_id FROM cont_ingresos_externos WHERE id = p_referencia_id)
      WHEN 'cont_gastos_externos' THEN
        (SELECT cuenta_id FROM cont_gastos_externos WHERE id = p_referencia_id)
    END
  );
  
  -- Si no hay cuenta, usar 'Sin_Cuenta'
  v_cuenta_nombre := COALESCE(v_cuenta_nombre, 'Sin_Cuenta');
  
  -- Determinar prefijo según tipo
  v_tipo_prefix := CASE p_referencia_tabla
    WHEN 'evt_ingresos' THEN 'ING'
    WHEN 'evt_gastos' THEN 'GAS'
    WHEN 'cont_ingresos_externos' THEN 'EXTING'
    WHEN 'cont_gastos_externos' THEN 'EXTGAS'
    ELSE 'DOC'
  END;
  
  -- Construir nombre: YYYY-MM-DD-NOMBRE_CUENTA-TIPO_ID.ext
  v_nombre_archivo := 
    TO_CHAR(p_fecha, 'YYYY-MM-DD') || '-' ||
    v_cuenta_nombre || '-' ||
    v_tipo_prefix || LPAD(p_referencia_id::TEXT, 6, '0') ||
    '.' || LOWER(p_extension);
  
  RETURN v_nombre_archivo;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCIÓN 4: Obtener ruta de carpeta por mes
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_obtener_ruta_carpeta(p_fecha DATE)
RETURNS TEXT AS $$
BEGIN
  RETURN 'documentos/' || TO_CHAR(p_fecha, 'YYYY-MM') || '/';
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (en caso de necesitar revertir)
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP FUNCTION IF EXISTS fn_obtener_ruta_carpeta CASCADE;
-- DROP FUNCTION IF EXISTS fn_generar_nombre_documento CASCADE;
-- DROP TRIGGER IF EXISTS trg_auditoria_cont_gastos_externos ON cont_gastos_externos;
-- DROP TRIGGER IF EXISTS trg_auditoria_cont_ingresos_externos ON cont_ingresos_externos;
-- DROP TRIGGER IF EXISTS trg_auditoria_evt_gastos ON evt_gastos;
-- DROP TRIGGER IF EXISTS trg_auditoria_evt_ingresos ON evt_ingresos;
-- DROP FUNCTION IF EXISTS fn_auditoria_modificacion CASCADE;
-- DROP TRIGGER IF EXISTS trg_asiento_cont_gastos_externos ON cont_gastos_externos;
-- DROP TRIGGER IF EXISTS trg_asiento_cont_ingresos_externos ON cont_ingresos_externos;
-- DROP TRIGGER IF EXISTS trg_asiento_evt_gastos ON evt_gastos;
-- DROP TRIGGER IF EXISTS trg_asiento_evt_ingresos ON evt_ingresos;
-- DROP FUNCTION IF EXISTS fn_crear_asiento_automatico CASCADE;
-- COMMIT;
