-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT DE CORRECCIÓN PARA PRUEBAS PENDIENTES
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-10-27
-- Propósito: Arreglar tablas y funciones faltantes para pasar las pruebas
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. ARREGLAR TABLA evt_documentos_ocr (columna tipo_documento faltante)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Agregar columna tipo_documento si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'evt_documentos_ocr' 
    AND column_name = 'tipo_documento'
  ) THEN
    ALTER TABLE evt_documentos_ocr 
    ADD COLUMN tipo_documento VARCHAR(30) DEFAULT 'factura' 
    CHECK (tipo_documento IN ('factura', 'recibo', 'ticket', 'comprobante', 'nota', 'otro'));
    
    RAISE NOTICE 'Columna tipo_documento agregada a evt_documentos_ocr';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. CREAR TABLAS FALTANTES PARA MÓDULO DE CONTABILIDAD
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Tabla evt_cuentas_bancarias (temporal hasta implementar módulo contable completo)
CREATE TABLE IF NOT EXISTS evt_cuentas_bancarias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  banco VARCHAR(50),
  numero_cuenta VARCHAR(20),
  tipo VARCHAR(20) DEFAULT 'banco' CHECK (tipo IN ('banco', 'caja')),
  moneda CHAR(3) DEFAULT 'MXN',
  saldo_inicial NUMERIC DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_evt_cuentas_bancarias_activo 
  ON evt_cuentas_bancarias(activo);
CREATE INDEX IF NOT EXISTS idx_evt_cuentas_bancarias_tipo 
  ON evt_cuentas_bancarias(tipo);

-- Insertar cuentas bancarias de ejemplo si no existen
INSERT INTO evt_cuentas_bancarias (nombre, banco, numero_cuenta, tipo, moneda, saldo_inicial, activo)
SELECT * FROM (VALUES
  ('Banco BBVA - Cuenta Principal', 'BBVA', '0123456789', 'banco', 'MXN', 0, true),
  ('Banco Santander - Operativa', 'Santander', '9876543210', 'banco', 'MXN', 0, true),
  ('Banco HSBC - Nómina', 'HSBC', '1122334455', 'banco', 'MXN', 0, true),
  ('Caja General', 'N/A', NULL, 'caja', 'MXN', 0, true),
  ('Caja Chica', 'N/A', NULL, 'caja', 'MXN', 0, true)
) AS v(nombre, banco, numero_cuenta, tipo, moneda, saldo_inicial, activo)
WHERE NOT EXISTS (SELECT 1 FROM evt_cuentas_bancarias LIMIT 1);

-- Agregar columna cuenta_bancaria_id a evt_gastos si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'evt_gastos' 
    AND column_name = 'cuenta_bancaria_id'
  ) THEN
    ALTER TABLE evt_gastos 
    ADD COLUMN cuenta_bancaria_id INTEGER REFERENCES evt_cuentas_bancarias(id);
    
    RAISE NOTICE 'Columna cuenta_bancaria_id agregada a evt_gastos';
  END IF;
END $$;

-- Agregar columna cuenta_bancaria_id a evt_ingresos si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'evt_ingresos' 
    AND column_name = 'cuenta_bancaria_id'
  ) THEN
    ALTER TABLE evt_ingresos 
    ADD COLUMN cuenta_bancaria_id INTEGER REFERENCES evt_cuentas_bancarias(id);
    
    RAISE NOTICE 'Columna cuenta_bancaria_id agregada a evt_ingresos';
  END IF;
END $$;

-- Tabla evt_movimientos_bancarios (temporal)
CREATE TABLE IF NOT EXISTS evt_movimientos_bancarios (
  id SERIAL PRIMARY KEY,
  cuenta_bancaria_id INTEGER REFERENCES evt_cuentas_bancarias(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('deposito', 'retiro', 'transferencia', 'ajuste')),
  monto NUMERIC NOT NULL,
  concepto TEXT NOT NULL,
  referencia TEXT,
  fecha_movimiento DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Referencia a ingreso o gasto
  ingreso_id INTEGER REFERENCES evt_ingresos(id),
  gasto_id INTEGER REFERENCES evt_gastos(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES core_users(id)
);

CREATE INDEX IF NOT EXISTS idx_evt_movimientos_cuenta 
  ON evt_movimientos_bancarios(cuenta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_evt_movimientos_fecha 
  ON evt_movimientos_bancarios(fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_evt_movimientos_tipo 
  ON evt_movimientos_bancarios(tipo);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. CREAR FUNCIÓN get_dashboard_summary
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS TABLE (
  total_eventos INTEGER,
  eventos_activos INTEGER,
  eventos_completados INTEGER,
  ingresos_totales NUMERIC,
  gastos_totales NUMERIC,
  utilidad_total NUMERIC,
  margen_promedio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_eventos,
    COUNT(*) FILTER (WHERE estado_id NOT IN (
      SELECT id FROM evt_estados WHERE nombre IN ('Completado', 'Cancelado')
    ))::INTEGER AS eventos_activos,
    COUNT(*) FILTER (WHERE estado_id IN (
      SELECT id FROM evt_estados WHERE nombre = 'Completado'
    ))::INTEGER AS eventos_completados,
    
    COALESCE(SUM(
      (SELECT COALESCE(SUM(i.total), 0)
       FROM evt_ingresos i
       WHERE i.evento_id = e.id AND i.cobrado = true)
    ), 0) AS ingresos_totales,
    
    COALESCE(SUM(
      (SELECT COALESCE(SUM(g.total), 0)
       FROM evt_gastos g
       WHERE g.evento_id = e.id AND g.pagado = true)
    ), 0) AS gastos_totales,
    
    COALESCE(SUM(
      (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true) -
      (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true)
    ), 0) AS utilidad_total,
    
    CASE 
      WHEN COALESCE(SUM((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true)), 0) > 0
      THEN (
        (COALESCE(SUM((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true) -
                      (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g WHERE g.evento_id = e.id AND g.pagado = true)), 0) /
         COALESCE(SUM((SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i WHERE i.evento_id = e.id AND i.cobrado = true)), 1))
        * 100
      )
      ELSE 0
    END AS margen_promedio
    
  FROM evt_eventos e;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dashboard_summary IS 
  'Retorna resumen del dashboard con métricas clave del sistema';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. CREAR TABLAS PARA MÓDULO DE ADMINISTRACIÓN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Tabla de perfiles (si no existe)
CREATE TABLE IF NOT EXISTS evt_perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES core_users(id) UNIQUE,
  nombre_completo TEXT,
  telefono VARCHAR(20),
  puesto VARCHAR(50),
  departamento VARCHAR(50),
  avatar_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evt_perfiles_user_id ON evt_perfiles(user_id);
CREATE INDEX IF NOT EXISTS idx_evt_perfiles_activo ON evt_perfiles(activo);

-- Tabla de roles (si no existe)
CREATE TABLE IF NOT EXISTS evt_roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  permisos JSONB,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar roles por defecto si no existen
INSERT INTO evt_roles (nombre, descripcion, permisos, activo)
SELECT * FROM (VALUES
  ('admin', 'Administrador del sistema', '{"all": true}'::jsonb, true),
  ('contador', 'Contador/Finanzas', '{"finanzas": true, "reportes": true}'::jsonb, true),
  ('operador', 'Operador de eventos', '{"eventos": true, "gastos": true, "ingresos": true}'::jsonb, true),
  ('viewer', 'Solo lectura', '{"view": true}'::jsonb, true)
) AS v(nombre, descripcion, permisos, activo)
WHERE NOT EXISTS (SELECT 1 FROM evt_roles LIMIT 1);

-- Tabla de audit log (si no existe)
CREATE TABLE IF NOT EXISTS evt_audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES core_users(id),
  accion VARCHAR(50) NOT NULL,
  tabla VARCHAR(50),
  registro_id TEXT,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evt_audit_log_user_id ON evt_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_evt_audit_log_accion ON evt_audit_log(accion);
CREATE INDEX IF NOT EXISTS idx_evt_audit_log_tabla ON evt_audit_log(tabla);
CREATE INDEX IF NOT EXISTS idx_evt_audit_log_created_at ON evt_audit_log(created_at);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. CREAR CATEGORÍAS DE GASTOS E INGRESOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Insertar categorías de gastos si no existen
INSERT INTO evt_categorias_gastos (nombre, descripcion, activo)
SELECT * FROM (VALUES
  ('Alimentos y Bebidas', 'Catering, comida, bebidas para eventos', true),
  ('Renta de Equipo', 'Audio, iluminación, mobiliario', true),
  ('Decoración', 'Flores, centros de mesa, ambientación', true),
  ('Personal', 'Meseros, chef, staff del evento', true),
  ('Transporte', 'Logística y transporte de materiales', true),
  ('Marketing', 'Publicidad y promoción', true),
  ('Administrativo', 'Gastos administrativos generales', true),
  ('Otros', 'Gastos diversos', true)
) AS v(nombre, descripcion, activo)
WHERE NOT EXISTS (SELECT 1 FROM evt_categorias_gastos LIMIT 1);

-- Crear tabla de categorías de ingresos si no existe
CREATE TABLE IF NOT EXISTS evt_categorias_ingresos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evt_categorias_ingresos_activo 
  ON evt_categorias_ingresos(activo);

-- Insertar categorías de ingresos si no existen
INSERT INTO evt_categorias_ingresos (nombre, descripcion, activo)
SELECT * FROM (VALUES
  ('Servicios de Evento', 'Pago por servicios de organización de eventos', true),
  ('Paquetes', 'Paquetes predefinidos de servicios', true),
  ('Extras', 'Servicios adicionales', true),
  ('Anticipos', 'Pagos adelantados', true),
  ('Liquidación', 'Pagos finales', true),
  ('Otros Ingresos', 'Ingresos diversos', true)
) AS v(nombre, descripcion, activo)
WHERE NOT EXISTS (SELECT 1 FROM evt_categorias_ingresos LIMIT 1);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. PERMISOS RLS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Habilitar RLS en nuevas tablas
ALTER TABLE evt_cuentas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_movimientos_bancarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_categorias_ingresos ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permitir a autenticados)
CREATE POLICY "authenticated_select" ON evt_cuentas_bancarias FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_select" ON evt_movimientos_bancarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_select" ON evt_perfiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_select" ON evt_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_select" ON evt_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_select" ON evt_categorias_ingresos FOR SELECT TO authenticated USING (true);

-- También para anon (solo lectura)
CREATE POLICY "anon_select" ON evt_cuentas_bancarias FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON evt_roles FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON evt_categorias_ingresos FOR SELECT TO anon USING (true);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN POST-EJECUCIÓN
-- ═══════════════════════════════════════════════════════════════════════════

-- Verificar tablas creadas
SELECT 
  'TABLAS CREADAS/VERIFICADAS:' AS info,
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'evt_documentos_ocr',
    'evt_cuentas_bancarias',
    'evt_movimientos_bancarios',
    'evt_perfiles',
    'evt_roles',
    'evt_audit_log',
    'evt_categorias_ingresos'
  )
ORDER BY table_name;

-- Verificar función creada
SELECT 
  'FUNCIÓN CREADA:' AS info,
  routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_dashboard_summary';

-- Verificar columnas agregadas
SELECT 
  'COLUMNAS AGREGADAS:' AS info,
  table_name, 
  column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND (
    (table_name = 'evt_documentos_ocr' AND column_name = 'tipo_documento') OR
    (table_name = 'evt_gastos' AND column_name = 'cuenta_bancaria_id') OR
    (table_name = 'evt_ingresos' AND column_name = 'cuenta_bancaria_id')
  )
ORDER BY table_name, column_name;
