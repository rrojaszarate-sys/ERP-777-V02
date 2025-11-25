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