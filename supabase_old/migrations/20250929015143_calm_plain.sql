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