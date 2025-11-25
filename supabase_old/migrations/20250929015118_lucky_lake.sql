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