# Migration Files Summary

**Total Migrations**: 5

| # | File | Size |
|---|------|------|
| 1 | 20250929012201_fierce_island.sql | 2.63 KB |
| 2 | 20250929015118_lucky_lake.sql | 5.94 KB |
| 3 | 20250929015143_calm_plain.sql | 9.92 KB |
| 4 | 20250929015224_flat_swamp.sql | 3.30 KB |
| 5 | 20250929015238_ancient_peak.sql | 5.36 KB |

## Migration Contents

### 20250929012201_fierce_island.sql

```sql
/*
  # Create evt_clientes table

  1. New Tables
    - `evt_clientes`
      - `id` (serial, primary key)
      - `company_id` (uuid, nullable, foreign key reference)
      - `razon_social` (text, required)
      - `nombre_comercial` (text, nullable)
      - `rfc` (text, required)
      - `email` (text, nullable)
      - `telefono` (text, nullable)
      - `direccion_fiscal` (text, nullable)
      - `contacto_principal` (text, nullable)
      - `telefono_contacto` (text, nullable)
      - `email_contacto` (text, nullable)
      - `regimen_fiscal` (text, nullable)
      - `uso_cfdi` (text, nullable)
      - `metodo_pago` (text, nullable)
      - `forma_pago` (text, nullable)
      - `dias_credito` (integer, nullable)
      - `limite_credito` (numeric, nullable)
      - `activo` (boolean, default true)
      - `notas` (text, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `created_by` (uuid, nullable, foreign key reference)

  2. Security
    - Enable RLS on `evt_clientes` table
    - Add policy for authenticated users to manage their company's clients
*/

CREATE TABLE IF NOT EXISTS evt_clientes (
  id SERIAL PRIMARY KEY,
  company_id uuid,
  razon_social text NOT NULL,
  nombre_comercial text,
  rfc text NOT NULL,
  email text,
  telefono text,
  direccion_fiscal text,
  contacto_principal text,
  telefono_contacto text,
  email_contacto text,
  regimen_fiscal text,
  uso_cfdi text,
  metodo_pago text,
  forma_pago text,
  dias_credito integer,
  limite_credito numeric,
  activo boolean DEFAULT true,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Enable Row Level Security
ALTER TABLE evt_clientes ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to access clients
CREATE POLICY "Users can manage clients"
  ON evt_clientes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evt_clientes_company_id ON evt_clientes(company_id);
CREATE INDEX IF NOT EXISTS idx_evt_clientes_rfc ON evt_clientes(rfc);
CREATE INDEX IF NOT EXISTS idx_evt_clientes_activo ON evt_clientes(activo);
CREATE INDEX IF NOT EXISTS idx_evt_clientes_created_at ON evt_clientes(created_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_evt_clientes_updated_at
    BEFORE UPDATE ON evt_clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 20250929015118_lucky_lake.sql

```sql
/*
  # Reconstruct Core Tables

  1. New Tables
    - `core_companies` - Company information
    - `core_users` - User management with company association
    - `core_roles` - Role definitions with permissions
    - `core_user_roles` - User-role assignments
    - `core_system_config` - System configuration
    - `core_security_config` - Security settings
    - `core_audit_log` - Audit trail

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Create proper foreign key relationships

  3. Functions
    - Update timestamp trigger function
*/

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS core_user_roles CASCADE;
DROP TABLE IF EXISTS core_users CASCADE;
DROP TABLE IF EXISTS core_roles CASCADE;
DROP TABLE IF EXISTS core_system_config CASCADE;
DROP TABLE IF EXISTS core_security_config CASCADE;
DROP TABLE IF EXISTS core_audit_log CASCADE;
DROP TABLE IF EXISTS core_companies CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create companies table
CREATE TABLE core_companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre varchar(255) NOT NULL,
  rfc varchar(13) UNIQUE NOT NULL,
  email varchar(255),
  telefono varchar(20),
  direccion text,
  logo_url text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create roles table
CREATE TABLE core_roles (
  id serial PRIMARY KEY,
  nombre varchar(100) UNIQUE NOT NULL,
  descripcion text,
  permisos jsonb DEFAULT '[]'::jsonb,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE core_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES core_companies(id) ON DELETE CASCADE,
  email varchar(255) UNIQUE NOT NULL,
  nombre varchar(255) NOT NULL,
  apellidos varchar(255),
  telefono varchar(20),
  puesto varchar(100),
  avatar_url text,
  activo boolean DEFAULT true,
  ultimo_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user roles junction table
CREATE TABLE core_user_roles (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES core_users(id) ON DELETE CASCADE,
  role_id integer REFERENCES core_roles(id) ON DELETE CASCADE,
  asignado_por uuid REFERENCES core_users(id),
  fecha_asignacion timestamptz DEFAULT now(),
  activo boolean DEFAULT true,
  UNIQUE(user_id, role_id)
);

-- Create system config table
CREATE TABLE core_system_config (
  id serial PRIMARY KEY,
  company_id uuid REFERENCES core_companies(id),
  config_key varchar(100) NOT NULL,
  config_value jsonb,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES core_users(id),
  UNIQUE(company_id, config_key)
);

-- Create security config table
CREATE TABLE core_security_config (
  id serial PRIMARY KEY,
  company_id uuid REFERENCES core_companies(id),
  security_mode varchar(20) DEFAULT 'development',
  rls_enabled boolean DEFAULT false,
  bypass_auth boolean DEFAULT true,
  enable_permissions boolean DEFAULT false,
  session_timeout integer DEFAULT 480,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES core_users(id)
);

-- Create audit log table
CREATE TABLE core_audit_log (
  id serial PRIMARY KEY,
  company_id uuid REFERENCES core_companies(id),
  user_id uuid REFERENCES core_users(id),
  timestamp timestamptz DEFAULT now(),
  action varchar(100) NOT NULL,
  module varchar(50) NOT NULL,
  entity_type varchar(50) NOT NULL,
  entity_id varchar(100) NOT NULL,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  session_id varchar(100),
  success boolean DEFAULT true,
  error_message text,
  duration integer
);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_core_companies_updated_at
  BEFORE UPDATE ON core_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_core_users_updated_at
  BEFORE UPDATE ON core_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE core_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_security_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (permissive for development)
CREATE POLICY "Users can manage companies" ON core_companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage users" ON core_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can read roles" ON core_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage user roles" ON core_user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage system config" ON core_system_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage security config" ON core_security_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can read audit log" ON core_audit_log FOR SELECT TO authenticated USING (true);

-- Insert default roles
INSERT INTO core_roles (nombre, descripcion, permisos) VALUES
('Administrador', 'Acceso completo al sistema', '["*.*.*.*"]'::jsonb),
('Ejecutivo', 'Gestión de eventos y clientes', '["eventos.*.*.*", "clientes.*.*.*", "gastos.*.*.*", "ingresos.*.*.*"]'::jsonb),
('Visualizador', 'Solo lectura', '["eventos.read.*.*", "clientes.read.*.*", "gastos.read.*.*", "ingresos.read.*.*"]'::jsonb);

-- Insert default company
INSERT INTO core_companies (nombre, rfc, email) VALUES
('MADE Events SA de CV', 'MEV123456789', 'contacto@madeevents.com');
```

### 20250929015143_calm_plain.sql

```sql
/*
  # Reconstruct Events Module Tables

  1. New Tables
    - `evt_tipos_evento` - Event types with colors
    - `evt_estados` - Event states for workflow
    - `evt_categorias_gastos` - Expense categories
    - `evt_clientes` - Client information with fiscal data
    - `evt_eventos` - Main events table
    - `evt_ingresos` - Income records with file attachments
    - `evt_gastos` - Expense records with file attachments

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Features
    - File attachment support
    - Automatic calculations via triggers
    - Soft delete for expenses
*/

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS evt_gastos CASCADE;
DROP TABLE IF EXISTS evt_ingresos CASCADE;
DROP TABLE IF EXISTS evt_eventos CASCADE;
DROP TABLE IF EXISTS evt_clientes CASCADE;
DROP TABLE IF EXISTS evt_categorias_gastos CASCADE;
DROP TABLE IF EXISTS evt_estados CASCADE;
DROP TABLE IF EXISTS evt_tipos_evento CASCADE;

-- Create event types table
CREATE TABLE evt_tipos_evento (
  id serial PRIMARY KEY,
  company_id uuid REFERENCES core_companies(id),
  nombre varchar(100) NOT NULL,
  descripcion text,
  color varchar(7) DEFAULT '#74F1C8',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create event states table
CREATE TABLE evt_estados (
  id serial PRIMARY KEY,
  nombre varchar(50) UNIQUE NOT NULL,
  descripcion text,
  color varchar(7),
  orden integer DEFAULT 0,
  workflow_step integer
);

-- Create expense categories table
CREATE TABLE evt_categorias_gastos (
  id serial PRIMARY KEY,
  company_id uuid REFERENCES core_companies(id),
  nombre varchar(100) NOT NULL,
  descripcion text,
  color varchar(7) DEFAULT '#16A085',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create clients table
CREATE TABLE evt_clientes (
  id serial PRIMARY KEY,
  company_id uuid REFERENCES core_companies(id),
  razon_social text NOT NULL,
  nombre_comercial text,
  rfc text NOT NULL,
  email text,
  telefono text,
  direccion_fiscal text,
  contacto_principal text,
  telefono_contacto text,
  email_contacto text,
  regimen_fiscal text,
  uso_cfdi text,
  metodo_pago text,
  forma_pago text,
  dias_credito integer,
  limite_credito numeric,
  activo boolean DEFAULT true,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES core_users(id)
);

-- Create events table
CREATE TABLE evt_eventos (
  id serial PRIMARY KEY,
  company_id uuid REFERENCES core_companies(id),
  clave_evento varchar(50) UNIQUE NOT NULL,
  nombre_proyecto text NOT NULL,
  descripcion text,
  cliente_id integer REFERENCES evt_clientes(id),
  tipo_evento_id integer REFERENCES evt_tipos_evento(id),
  estado_id integer REFERENCES evt_estados(id) DEFAULT 1,
  responsable_id uuid REFERENCES core_users(id),
  fecha_evento date NOT NULL,
  fecha_fin date,
  hora_inicio time,
  hora_fin time,
  lugar text,
  numero_invitados integer,
  presupuesto_estimado numeric DEFAULT 0,
  
  -- Financial data
  subtotal numeric DEFAULT 0,
  iva_porcentaje numeric DEFAULT 16,
  iva numeric DEFAULT 0,
  total numeric DEFAULT 0,
  total_gastos numeric DEFAULT 0,
  utilidad numeric DEFAULT 0,
  margen_utilidad numeric DEFAULT 0,
  
  -- Status
  status_facturacion varchar(20) DEFAULT 'pendiente_facturar',
  status_pago varchar(20) DEFAULT 'pendiente',
  fecha_facturacion date,
  fecha_vencimiento date,
  fecha_pago date,
  documento_factura_url text,
  documento_pago_url text,
  
  -- Project management
  prioridad varchar(10) DEFAULT 'media',
  fase_proyecto varchar(20) DEFAULT 'cotizacion',
  notas text,
  
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES core_users(id),
  updated_by uuid REFERENCES core_users(id)
);

-- Create income table
CREATE TABLE evt_ingresos (
  id serial PRIMARY KEY,
  evento_id integer REFERENCES evt_eventos(id) ON DELETE CASCADE,
  concepto text NOT NULL,
  descripcion text,
  cantidad numeric DEFAULT 1,
  precio_unitario numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  iva_porcentaje numeric DEFAULT 16,
  iva numeric DEFAULT 0,
  total numeric DEFAULT 0,
  fecha_ingreso date DEFAULT CURRENT_DATE,
  referencia text,
  documento_url text,
  
  -- Billing status
  facturado boolean DEFAULT false,
  cobrado boolean DEFAULT false,
  fecha_facturacion date,
  fecha_cobro date,
  metodo_cobro varchar(20),
  
  -- File attachment
  archivo_adjunto text,
  archivo_nombre text,
  archivo_tamaño integer,
  archivo_tipo varchar(100),
  
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES core_users(id)
);

-- Create expenses table
CREATE TABLE evt_gastos (
  id serial PRIMARY KEY,
  evento_id integer REFERENCES evt_eventos(id) ON DELETE CASCADE,
  categoria_id integer REFERENCES evt_categorias_gastos(id),
  concepto text NOT NULL,
  descripcion text,
  cantidad numeric DEFAULT 1,
  precio_unitario numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  iva_porcentaje numeric DEFAULT 16,
  iva numeric DEFAULT 0,
  total numeric DEFAULT 0,
  proveedor text,
  rfc_proveedor varchar(13),
  fecha_gasto date DEFAULT CURRENT_DATE,
  forma_pago varchar(20) DEFAULT 'transferencia',
  referencia text,
  documento_url text,
  
  -- Approval workflow
  status_aprobacion varchar(20) DEFAULT 'pendiente',
  aprobado_por uuid REFERENCES core_users(id),
  fecha_aprobacion date,
  
  -- File attachment
  archivo_adjunto text,
  archivo_nombre text,
  archivo_tamaño integer,
  archivo_tipo varchar(100),
  
  -- Soft delete
  notas text,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES core_users(id),
  delete_reason text,
  
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES core_users(id)
);

-- Create indexes for performance
CREATE INDEX idx_evt_clientes_activo ON evt_clientes(activo);
CREATE INDEX idx_evt_clientes_company_id ON evt_clientes(company_id);
CREATE INDEX idx_evt_clientes_rfc ON evt_clientes(rfc);
CREATE INDEX idx_evt_clientes_created_at ON evt_clientes(created_at);

CREATE INDEX idx_evt_eventos_cliente_id ON evt_eventos(cliente_id);
CREATE INDEX idx_evt_eventos_responsable_id ON evt_eventos(responsable_id);
CREATE INDEX idx_evt_eventos_fecha_evento ON evt_eventos(fecha_evento);
CREATE INDEX idx_evt_eventos_status_pago ON evt_eventos(status_pago);
CREATE INDEX idx_evt_eventos_activo ON evt_eventos(activo);

CREATE INDEX idx_evt_ingresos_evento_id ON evt_ingresos(evento_id);
CREATE INDEX idx_evt_ingresos_fecha_ingreso ON evt_ingresos(fecha_ingreso);

CREATE INDEX idx_evt_gastos_evento_id ON evt_gastos(evento_id);
CREATE INDEX idx_evt_gastos_categoria_id ON evt_gastos(categoria_id);
CREATE INDEX idx_evt_gastos_fecha_gasto ON evt_gastos(fecha_gasto);
CREATE INDEX idx_evt_gastos_activo ON evt_gastos(activo);

-- Add update triggers
CREATE TRIGGER update_evt_clientes_updated_at
  BEFORE UPDATE ON evt_clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evt_eventos_updated_at
  BEFORE UPDATE ON evt_eventos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evt_ingresos_updated_at
  BEFORE UPDATE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evt_gastos_updated_at
  BEFORE UPDATE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE evt_tipos_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_categorias_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evt_gastos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage event types" ON evt_tipos_evento FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can read event states" ON evt_estados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage expense categories" ON evt_categorias_gastos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage clients" ON evt_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage events" ON evt_eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage income" ON evt_ingresos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage expenses" ON evt_gastos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default event states
INSERT INTO evt_estados (nombre, descripcion, color, orden, workflow_step) VALUES
('Borrador', 'Evento en borrador', '#6B7280', 1, 1),
('Cotizado', 'Evento cotizado', '#3B82F6', 2, 2),
('Aprobado', 'Evento aprobado por cliente', '#10B981', 3, 3),
('En Proceso', 'Evento en ejecución', '#F59E0B', 4, 4),
('Completado', 'Evento completado', '#059669', 5, 5),
('Facturado', 'Evento facturado', '#7C3AED', 6, 6),
('Cobrado', 'Evento cobrado completamente', '#059669', 7, 7);

-- Insert default expense categories
INSERT INTO evt_categorias_gastos (nombre, descripcion, color) VALUES
('Servicios Profesionales', 'Servicios profesionales y consultoría', '#3B82F6'),
('Recursos Humanos', 'Gastos de personal y nómina', '#10B981'),
('Materiales', 'Materiales y suministros', '#F59E0B'),
('Combustible/Casetas', 'Combustible y gastos de transporte', '#EF4444'),
('Otros', 'Otros gastos diversos', '#8B5CF6');

-- Insert default event types
INSERT INTO evt_tipos_evento (nombre, descripcion, color) VALUES
('Conferencia', 'Eventos de conferencias y seminarios', '#3B82F6'),
('Corporativo', 'Eventos corporativos y empresariales', '#10B981'),
('Social', 'Eventos sociales y celebraciones', '#F59E0B'),
('Comercial', 'Eventos comerciales y ferias', '#EF4444'),
('Educativo', 'Eventos educativos y capacitación', '#8B5CF6');
```

### 20250929015224_flat_swamp.sql

```sql
/*
  # Create Calculation Triggers

  1. Functions
    - `calculate_income_totals()` - Calculates subtotal, IVA, and total for income
    - `calculate_expense_totals()` - Calculates subtotal, IVA, and total for expenses
    - `update_event_financials()` - Updates event financial summary

  2. Triggers
    - Income calculation trigger
    - Expense calculation trigger
    - Event financial update triggers
*/

-- Function to calculate income totals
CREATE OR REPLACE FUNCTION calculate_income_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate subtotal
  NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
  
  -- Calculate IVA
  NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100);
  
  -- Calculate total
  NEW.total = NEW.subtotal + NEW.iva;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate expense totals
CREATE OR REPLACE FUNCTION calculate_expense_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate subtotal
  NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
  
  -- Calculate IVA
  NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100);
  
  -- Calculate total
  NEW.total = NEW.subtotal + NEW.iva;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update event financial summary
CREATE OR REPLACE FUNCTION update_event_financials()
RETURNS TRIGGER AS $$
DECLARE
  evento_id_to_update integer;
  total_ingresos numeric;
  total_gastos_calc numeric;
  utilidad_calc numeric;
  margen_calc numeric;
BEGIN
  -- Determine which event to update
  IF TG_TABLE_NAME = 'evt_ingresos' THEN
    IF TG_OP = 'DELETE' THEN
      evento_id_to_update = OLD.evento_id;
    ELSE
      evento_id_to_update = NEW.evento_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'evt_gastos' THEN
    IF TG_OP = 'DELETE' THEN
      evento_id_to_update = OLD.evento_id;
    ELSE
      evento_id_to_update = NEW.evento_id;
    END IF;
  END IF;
  
  -- Calculate totals for the event
  SELECT COALESCE(SUM(total), 0) INTO total_ingresos
  FROM evt_ingresos
  WHERE evento_id = evento_id_to_update;
  
  SELECT COALESCE(SUM(total), 0) INTO total_gastos_calc
  FROM evt_gastos
  WHERE evento_id = evento_id_to_update 
    AND activo = true 
    AND deleted_at IS NULL;
  
  -- Calculate utilidad and margin
  utilidad_calc = total_ingresos - total_gastos_calc;
  margen_calc = CASE 
    WHEN total_ingresos > 0 THEN (utilidad_calc / total_ingresos) * 100
    ELSE 0
  END;
  
  -- Update event totals
  UPDATE evt_eventos SET
    total = total_ingresos,
    total_gastos = total_gastos_calc,
    utilidad = utilidad_calc,
    margen_utilidad = margen_calc,
    updated_at = now()
  WHERE id = evento_id_to_update;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic calculations
CREATE TRIGGER calculate_income_totals_trigger
  BEFORE INSERT OR UPDATE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION calculate_income_totals();

CREATE TRIGGER calculate_expense_totals_trigger
  BEFORE INSERT OR UPDATE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION calculate_expense_totals();

-- Create triggers for event financial updates
CREATE TRIGGER update_event_financials_on_income
  AFTER INSERT OR UPDATE OR DELETE ON evt_ingresos
  FOR EACH ROW EXECUTE FUNCTION update_event_financials();

CREATE TRIGGER update_event_financials_on_expense
  AFTER INSERT OR UPDATE OR DELETE ON evt_gastos
  FOR EACH ROW EXECUTE FUNCTION update_event_financials();
```

### 20250929015238_ancient_peak.sql

```sql
/*
  # Create Dashboard Views

  1. Views
    - `vw_dashboard_metricas` - Dashboard metrics aggregation
    - `vw_analisis_temporal` - Temporal analysis by month/year
    - `vw_gastos_por_categoria` - Expenses grouped by category
    - `vw_eventos_completos` - Complete event information with joins
    - `vw_master_facturacion` - Billing master view

  2. Security
    - Enable RLS on views
    - Add policies for authenticated users
*/

-- Create dashboard metrics view
CREATE OR REPLACE VIEW vw_dashboard_metricas AS
SELECT
  COUNT(e.id) as total_eventos,
  COUNT(CASE WHEN e.fecha_evento > CURRENT_DATE THEN 1 END) as eventos_futuros,
  COUNT(CASE WHEN e.fecha_evento <= CURRENT_DATE THEN 1 END) as eventos_pasados,
  COUNT(CASE WHEN e.status_pago = 'pago_pendiente' THEN 1 END) as pagos_pendientes,
  COUNT(CASE WHEN e.status_facturacion = 'pendiente_facturar' THEN 1 END) as facturas_pendientes,
  COUNT(CASE WHEN e.status_pago = 'vencido' THEN 1 END) as pagos_vencidos,
  COUNT(CASE WHEN e.status_pago = 'pagado' THEN 1 END) as eventos_cobrados,
  COALESCE(SUM(e.total), 0) as ingresos_totales,
  COALESCE(SUM(CASE WHEN e.status_pago = 'pagado' THEN e.total ELSE 0 END), 0) as ingresos_cobrados,
  COALESCE(SUM(CASE WHEN e.status_pago != 'pagado' THEN e.total ELSE 0 END), 0) as ingresos_por_cobrar,
  COALESCE(SUM(e.total_gastos), 0) as gastos_totales,
  COALESCE(SUM(e.utilidad), 0) as utilidad_total,
  CASE 
    WHEN SUM(e.total) > 0 THEN (SUM(e.utilidad) / SUM(e.total)) * 100
    ELSE 0
  END as margen_promedio,
  CASE 
    WHEN COUNT(e.id) > 0 THEN (COUNT(CASE WHEN e.status_pago = 'pagado' THEN 1 END)::numeric / COUNT(e.id)) * 100
    ELSE 0
  END as tasa_cobranza,
  CASE 
    WHEN SUM(e.total) > 0 THEN SUM(e.total_gastos) / SUM(e.total)
    ELSE 0
  END as ratio_gastos_ingresos
FROM evt_eventos e
WHERE e.activo = true;

-- Create temporal analysis view
CREATE OR REPLACE VIEW vw_analisis_temporal AS
SELECT
  EXTRACT(YEAR FROM e.fecha_evento)::integer as año,
  EXTRACT(MONTH FROM e.fecha_evento)::integer as mes,
  COUNT(e.id) as total_eventos,
  COALESCE(SUM(e.total), 0) as ingresos_mes,
  COALESCE(SUM(e.total_gastos), 0) as gastos_mes,
  COALESCE(SUM(e.utilidad), 0) as utilidad_mes,
  CASE 
    WHEN SUM(e.total) > 0 THEN (SUM(e.utilidad) / SUM(e.total)) * 100
    ELSE 0
  END as margen_promedio,
  COUNT(CASE WHEN e.status_pago = 'pagado' THEN 1 END) as eventos_cobrados,
  COUNT(CASE WHEN e.status_pago != 'pagado' THEN 1 END) as eventos_pendientes
FROM evt_eventos e
WHERE e.activo = true
GROUP BY EXTRACT(YEAR FROM e.fecha_evento), EXTRACT(MONTH FROM e.fecha_evento)
ORDER BY año DESC, mes DESC;

-- Create expenses by category view
CREATE OR REPLACE VIEW vw_gastos_por_categoria AS
SELECT
  c.id as categoria_id,
  c.nombre as categoria,
  c.color as categoria_color,
  COUNT(g.id) as total_gastos,
  COALESCE(SUM(g.total), 0) as monto_total,
  COALESCE(AVG(g.total), 0) as promedio_gasto,
  COUNT(CASE WHEN g.status_aprobacion = 'aprobado' THEN 1 END) as gastos_aprobados,
  COUNT(CASE WHEN g.status_aprobacion = 'pendiente' THEN 1 END) as gastos_pendientes
FROM evt_categorias_gastos c
LEFT JOIN evt_gastos g ON c.id = g.categoria_id 
  AND g.activo = true 
  AND g.deleted_at IS NULL
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.color
ORDER BY monto_total DESC;

-- Create complete events view
CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT
  e.*,
  c.razon_social as cliente_nombre,
  c.nombre_comercial as cliente_comercial,
  c.rfc as cliente_rfc,
  c.email as cliente_email,
  c.telefono as cliente_telefono,
  c.contacto_principal,
  te.nombre as tipo_evento,
  te.color as tipo_color,
  es.nombre as estado,
  es.color as estado_color,
  es.workflow_step,
  u.nombre as responsable_nombre,
  CASE 
    WHEN e.fecha_vencimiento IS NOT NULL AND e.fecha_vencimiento < CURRENT_DATE AND e.status_pago != 'pagado'
    THEN CURRENT_DATE - e.fecha_vencimiento
    ELSE 0
  END as dias_vencido,
  CASE 
    WHEN e.fecha_vencimiento IS NOT NULL AND e.fecha_vencimiento < CURRENT_DATE AND e.status_pago != 'pagado'
    THEN 'vencido'
    ELSE e.status_pago
  END as status_vencimiento,
  uc.nombre as creado_por,
  uu.nombre as actualizado_por
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
LEFT JOIN core_users u ON e.responsable_id = u.id
LEFT JOIN core_users uc ON e.created_by = uc.id
LEFT JOIN core_users uu ON e.updated_by = uu.id
WHERE e.activo = true;

-- Create billing master view
CREATE OR REPLACE VIEW vw_master_facturacion AS
SELECT
  e.id as evento_id,
  e.clave_evento,
  e.nombre_proyecto as evento_nombre,
  e.fecha_evento,
  e.total,
  e.utilidad,
  e.status_facturacion,
  e.status_pago,
  e.fecha_facturacion,
  e.fecha_vencimiento,
  e.fecha_pago,
  c.razon_social as cliente_nombre,
  c.rfc as cliente_rfc,
  u.nombre as responsable,
  EXTRACT(YEAR FROM e.fecha_evento)::integer as año,
  EXTRACT(MONTH FROM e.fecha_evento)::integer as mes,
  CASE 
    WHEN e.fecha_vencimiento IS NOT NULL AND e.fecha_vencimiento < CURRENT_DATE AND e.status_pago != 'pagado'
    THEN CURRENT_DATE - e.fecha_vencimiento
    ELSE 0
  END as dias_vencido
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN core_users u ON e.responsable_id = u.id
WHERE e.activo = true
ORDER BY e.fecha_evento DESC;

-- Enable RLS on views (if supported)
-- Note: RLS on views depends on the underlying tables
```

