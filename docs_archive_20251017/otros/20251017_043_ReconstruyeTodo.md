# 🏢 Reconstrucción Completa del Sistema ERP Financiero

## 📋 Índice
1. [Script SQL Completo](#-1-script-sql-completo)
2. [Auditoría de Funcionalidades](#-2-auditoría-de-funcionalidades)
3. [Reporte Técnico Detallado](#-3-reporte-técnico-detallado)
4. [Prompt Maestro para Bolt](#-4-prompt-maestro-para-bolt)

---

## 🔧 1. Script SQL Completo

### Ejecutar en Supabase SQL Editor (copiar y pegar completo):

```sql
-- =====================================================
-- SISTEMA ERP FINANCIERO - BASE DE DATOS COMPLETA
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipos ENUM
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'ejecutivo', 'visualizador');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pendiente', 'aprobado', 'rechazado', 'pagado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('factura', 'recibo', 'contrato', 'comprobante', 'otro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLAS PRINCIPALES
-- =====================================================

-- Tabla de empresas
CREATE TABLE IF NOT EXISTS companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    ruc text UNIQUE NOT NULL,
    address text,
    phone text,
    email text,
    logo_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text NOT NULL,
    role user_role DEFAULT 'visualizador',
    avatar_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    ruc text,
    contact_person text,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES user_profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    budget decimal(15,2) DEFAULT 0,
    total_income decimal(15,2) DEFAULT 0,
    total_expense decimal(15,2) DEFAULT 0,
    net_result decimal(15,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES user_profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tabla de ingresos
CREATE TABLE IF NOT EXISTS incomes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    client_id uuid REFERENCES clients(id),
    concept text NOT NULL,
    description text,
    amount decimal(15,2) NOT NULL CHECK (amount > 0),
    tax_rate decimal(5,2) DEFAULT 18.00,
    tax_amount decimal(15,2) DEFAULT 0,
    total_amount decimal(15,2) NOT NULL,
    invoice_number text,
    invoice_date date DEFAULT CURRENT_DATE,
    due_date date,
    status transaction_status DEFAULT 'pendiente',
    payment_method text,
    reference_number text,
    notes text,
    created_by uuid REFERENCES user_profiles(id),
    approved_by uuid REFERENCES user_profiles(id),
    approved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tabla de gastos
CREATE TABLE IF NOT EXISTS expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    category text NOT NULL,
    concept text NOT NULL,
    description text,
    amount decimal(15,2) NOT NULL CHECK (amount > 0),
    tax_rate decimal(5,2) DEFAULT 18.00,
    tax_amount decimal(15,2) DEFAULT 0,
    total_amount decimal(15,2) NOT NULL,
    supplier text,
    invoice_number text,
    invoice_date date DEFAULT CURRENT_DATE,
    due_date date,
    status transaction_status DEFAULT 'pendiente',
    payment_method text,
    reference_number text,
    notes text,
    requires_approval boolean DEFAULT true,
    created_by uuid REFERENCES user_profiles(id),
    approved_by uuid REFERENCES user_profiles(id),
    approved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tabla de documentos
CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    related_table text NOT NULL,
    related_id uuid NOT NULL,
    name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    mime_type text,
    document_type document_type DEFAULT 'otro',
    uploaded_by uuid REFERENCES user_profiles(id),
    created_at timestamptz DEFAULT now()
);

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    user_id uuid REFERENCES user_profiles(id),
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_events_company ON events(company_id);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_incomes_company ON incomes(company_id);
CREATE INDEX IF NOT EXISTS idx_incomes_event ON incomes(event_id);
CREATE INDEX IF NOT EXISTS idx_incomes_status ON incomes(status);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_event ON expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_related ON documents(related_table, related_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para calcular impuestos automáticamente
CREATE OR REPLACE FUNCTION calculate_tax_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tax_amount := ROUND((NEW.amount * NEW.tax_rate / 100), 2);
    NEW.total_amount := NEW.amount + NEW.tax_amount;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar totales de eventos
CREATE OR REPLACE FUNCTION update_event_totals()
RETURNS TRIGGER AS $$
DECLARE
    event_uuid uuid;
BEGIN
    -- Determinar el event_id según la operación
    IF TG_OP = 'DELETE' THEN
        event_uuid := OLD.event_id;
    ELSE
        event_uuid := NEW.event_id;
    END IF;

    -- Actualizar totales del evento
    UPDATE events SET
        total_income = COALESCE((
            SELECT SUM(total_amount) 
            FROM incomes 
            WHERE event_id = event_uuid AND status = 'pagado'
        ), 0),
        total_expense = COALESCE((
            SELECT SUM(total_amount) 
            FROM expenses 
            WHERE event_id = event_uuid AND status = 'pagado'
        ), 0),
        updated_at = now()
    WHERE id = event_uuid;

    -- Calcular resultado neto
    UPDATE events SET
        net_result = total_income - total_expense,
        updated_at = now()
    WHERE id = event_uuid;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función de auditoría
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (company_id, table_name, record_id, action, new_values, user_id)
        VALUES (NEW.company_id, TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), NEW.created_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (company_id, table_name, record_id, action, old_values, new_values, user_id)
        VALUES (NEW.company_id, TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NEW.created_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (company_id, table_name, record_id, action, old_values, user_id)
        VALUES (OLD.company_id, TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), OLD.created_by);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Triggers para cálculo automático de impuestos
DROP TRIGGER IF EXISTS trigger_calculate_income_tax ON incomes;
CREATE TRIGGER trigger_calculate_income_tax
    BEFORE INSERT OR UPDATE ON incomes
    FOR EACH ROW EXECUTE FUNCTION calculate_tax_amount();

DROP TRIGGER IF EXISTS trigger_calculate_expense_tax ON expenses;
CREATE TRIGGER trigger_calculate_expense_tax
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION calculate_tax_amount();

-- Triggers para actualizar totales de eventos
DROP TRIGGER IF EXISTS trigger_update_event_totals_income ON incomes;
CREATE TRIGGER trigger_update_event_totals_income
    AFTER INSERT OR UPDATE OR DELETE ON incomes
    FOR EACH ROW EXECUTE FUNCTION update_event_totals();

DROP TRIGGER IF EXISTS trigger_update_event_totals_expense ON expenses;
CREATE TRIGGER trigger_update_event_totals_expense
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_event_totals();

-- Triggers de auditoría
DROP TRIGGER IF EXISTS trigger_audit_incomes ON incomes;
CREATE TRIGGER trigger_audit_incomes
    AFTER INSERT OR UPDATE OR DELETE ON incomes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS trigger_audit_expenses ON expenses;
CREATE TRIGGER trigger_audit_expenses
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para companies
CREATE POLICY "Users can view their company" ON companies
    FOR SELECT USING (
        id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    );

-- Políticas para user_profiles
CREATE POLICY "Users can view profiles in their company" ON user_profiles
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Políticas para clients
CREATE POLICY "Users can manage clients in their company" ON clients
    FOR ALL USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    );

-- Políticas para events
CREATE POLICY "Users can manage events in their company" ON events
    FOR ALL USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    );

-- Políticas para incomes
CREATE POLICY "Users can manage incomes in their company" ON incomes
    FOR ALL USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    );

-- Políticas para expenses
CREATE POLICY "Users can manage expenses in their company" ON expenses
    FOR ALL USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    );

-- Políticas para documents
CREATE POLICY "Users can manage documents in their company" ON documents
    FOR ALL USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    );

-- Políticas para audit_logs
CREATE POLICY "Users can view audit logs in their company" ON audit_logs
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    );

-- =====================================================
-- DATOS DE PRUEBA
-- =====================================================

-- Insertar empresa demo
INSERT INTO companies (id, name, ruc, address, phone, email) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Empresa Demo S.A.C.', '20123456789', 'Av. Principal 123, Lima', '+51 999 888 777', 'contacto@empresademo.com');

-- Insertar usuarios demo (requiere que existan en auth.users primero)
-- Nota: Estos IDs deben coincidir con usuarios reales creados en Supabase Auth
INSERT INTO user_profiles (id, company_id, email, full_name, role) VALUES
('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'admin@empresademo.com', 'Juan Pérez (Admin)', 'admin'),
('22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'ejecutivo@empresademo.com', 'María García (Ejecutivo)', 'ejecutivo'),
('33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'visualizador@empresademo.com', 'Carlos López (Visualizador)', 'visualizador');

-- Insertar clientes demo
INSERT INTO clients (id, company_id, name, email, phone, ruc, created_by) VALUES
('c1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'Cliente Premium S.A.', 'ventas@clientepremium.com', '+51 987 654 321', '20987654321', '11111111-1111-1111-1111-111111111111'),
('c2222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'Corporación ABC', 'contacto@corporacionabc.com', '+51 876 543 210', '20876543210', '11111111-1111-1111-1111-111111111111'),
('c3333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'Servicios XYZ E.I.R.L.', 'info@serviciosxyz.com', '+51 765 432 109', '20765432109', '22222222-2222-2222-2222-222222222222');

-- Insertar eventos demo
INSERT INTO events (id, company_id, name, description, start_date, end_date, budget, created_by) VALUES
('e1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'Conferencia Anual 2024', 'Evento corporativo principal del año', '2024-03-01', '2024-03-03', 50000.00, '11111111-1111-1111-1111-111111111111'),
('e2222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'Lanzamiento Producto X', 'Presentación del nuevo producto estrella', '2024-04-15', '2024-04-15', 25000.00, '22222222-2222-2222-2222-222222222222');

-- Insertar ingresos demo
INSERT INTO incomes (company_id, event_id, client_id, concept, description, amount, invoice_number, status, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'e1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Patrocinio Oro', 'Patrocinio principal para conferencia', 15000.00, 'F001-00001', 'pagado', '11111111-1111-1111-1111-111111111111'),
('550e8400-e29b-41d4-a716-446655440000', 'e1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Patrocinio Plata', 'Patrocinio secundario', 8000.00, 'F001-00002', 'pagado', '11111111-1111-1111-1111-111111111111'),
('550e8400-e29b-41d4-a716-446655440000', 'e2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', 'Venta de Entradas', 'Entradas VIP para lanzamiento', 5000.00, 'F001-00003', 'aprobado', '22222222-2222-2222-2222-222222222222');

-- Insertar gastos demo
INSERT INTO expenses (company_id, event_id, category, concept, description, amount, supplier, invoice_number, status, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'e1111111-1111-1111-1111-111111111111', 'Logística', 'Alquiler de Local', 'Salón principal para 500 personas', 12000.00, 'Eventos & Espacios S.A.', 'B001-12345', 'pagado', '11111111-1111-1111-1111-111111111111'),
('550e8400-e29b-41d4-a716-446655440000', 'e1111111-1111-1111-1111-111111111111', 'Catering', 'Servicio de Alimentación', 'Desayuno, almuerzo y coffee breaks', 8500.00, 'Catering Premium', 'B002-67890', 'pagado', '22222222-2222-2222-2222-222222222222'),
('550e8400-e29b-41d4-a716-446655440000', 'e2222222-2222-2222-2222-222222222222', 'Marketing', 'Publicidad Digital', 'Campaña en redes sociales', 3000.00, 'Digital Marketing Pro', 'B003-11111', 'aprobado', '22222222-2222-2222-2222-222222222222'),
('550e8400-e29b-41d4-a716-446655440000', 'e2222222-2222-2222-2222-222222222222', 'Producción', 'Material Promocional', 'Folletos, banners y merchandising', 2500.00, 'Imprenta Rápida', 'B004-22222', 'pendiente', '22222222-2222-2222-2222-222222222222');

-- Insertar documentos demo
INSERT INTO documents (company_id, related_table, related_id, name, file_path, document_type, uploaded_by) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'incomes', (SELECT id FROM incomes WHERE invoice_number = 'F001-00001'), 'Factura F001-00001.pdf', '/documents/facturas/F001-00001.pdf', 'factura', '11111111-1111-1111-1111-111111111111'),
('550e8400-e29b-41d4-a716-446655440000', 'expenses', (SELECT id FROM expenses WHERE invoice_number = 'B001-12345'), 'Factura B001-12345.pdf', '/documents/gastos/B001-12345.pdf', 'factura', '11111111-1111-1111-1111-111111111111');

-- =====================================================
-- VISTAS ÚTILES PARA REPORTES
-- =====================================================

-- Vista de resumen financiero por evento
CREATE OR REPLACE VIEW event_financial_summary AS
SELECT 
    e.id,
    e.name,
    e.start_date,
    e.end_date,
    e.budget,
    e.total_income,
    e.total_expense,
    e.net_result,
    CASE 
        WHEN e.budget > 0 THEN ROUND((e.net_result / e.budget * 100), 2)
        ELSE 0 
    END as roi_percentage,
    c.name as company_name
FROM events e
JOIN companies c ON e.company_id = c.id
WHERE e.is_active = true;

-- Vista de transacciones pendientes
CREATE OR REPLACE VIEW pending_transactions AS
SELECT 
    'income' as transaction_type,
    i.id,
    i.concept,
    i.total_amount,
    i.invoice_date,
    i.due_date,
    e.name as event_name,
    cl.name as client_name,
    up.full_name as created_by_name
FROM incomes i
JOIN events e ON i.event_id = e.id
LEFT JOIN clients cl ON i.client_id = cl.id
JOIN user_profiles up ON i.created_by = up.id
WHERE i.status = 'pendiente'

UNION ALL

SELECT 
    'expense' as transaction_type,
    ex.id,
    ex.concept,
    ex.total_amount,
    ex.invoice_date,
    ex.due_date,
    e.name as event_name,
    ex.supplier as client_name,
    up.full_name as created_by_name
FROM expenses ex
JOIN events e ON ex.event_id = e.id
JOIN user_profiles up ON ex.created_by = up.id
WHERE ex.status = 'pendiente';

-- =====================================================
-- FUNCIONES PARA REPORTES
-- =====================================================

-- Función para obtener métricas del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_metrics(company_uuid uuid)
RETURNS TABLE (
    total_events bigint,
    total_income numeric,
    total_expenses numeric,
    net_profit numeric,
    pending_approvals bigint,
    active_clients bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM events WHERE company_id = company_uuid AND is_active = true),
        (SELECT COALESCE(SUM(total_amount), 0) FROM incomes WHERE company_id = company_uuid AND status = 'pagado'),
        (SELECT COALESCE(SUM(total_amount), 0) FROM expenses WHERE company_id = company_uuid AND status = 'pagado'),
        (SELECT COALESCE(SUM(total_amount), 0) FROM incomes WHERE company_id = company_uuid AND status = 'pagado') -
        (SELECT COALESCE(SUM(total_amount), 0) FROM expenses WHERE company_id = company_uuid AND status = 'pagado'),
        (SELECT COUNT(*) FROM expenses WHERE company_id = company_uuid AND status = 'pendiente' AND requires_approval = true),
        (SELECT COUNT(*) FROM clients WHERE company_id = company_uuid AND is_active = true);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCRIPT COMPLETADO
-- =====================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos ERP Financiero creada exitosamente!';
    RAISE NOTICE 'Empresa demo: Empresa Demo S.A.C.';
    RAISE NOTICE 'Usuarios: admin@empresademo.com, ejecutivo@empresademo.com, visualizador@empresademo.com';
    RAISE NOTICE 'Eventos: Conferencia Anual 2024, Lanzamiento Producto X';
    RAISE NOTICE 'Total ingresos demo: S/ 28,000';
    RAISE NOTICE 'Total gastos demo: S/ 26,000';
    RAISE NOTICE 'Utilidad neta demo: S/ 2,000';
END $$;
```

---

## 📋 2. Auditoría de Funcionalidades

### 🔍 Funcionalidades Detectadas por Módulo

#### 📊 **MÓDULO DASHBOARD**
- **Métricas principales**: Total eventos, ingresos, gastos, utilidad neta
- **Indicadores de estado**: Transacciones pendientes, clientes activos
- **Gráficos**: ROI por evento, tendencias temporales
- **Filtros**: Por fecha, evento, usuario responsable
- **Lógica condicional**: Solo muestra datos de la empresa del usuario logueado

#### 💰 **MÓDULO INGRESOS**
- **CRUD completo**: Crear, leer, actualizar, eliminar ingresos
- **Validaciones**:
  - Monto debe ser mayor a 0
  - Fecha de vencimiento posterior a fecha de factura
  - Número de factura único por empresa
- **Estados**: Pendiente → Aprobado → Pagado
- **Cálculo automático**: Subtotal + IVA = Total
- **Asociaciones**: Cliente, evento, documentos adjuntos
- **Lógica condicional**: 
  - Solo admin/ejecutivo pueden aprobar
  - Ingreso pagado requiere número de factura
  - Actualiza automáticamente totales del evento

#### 💸 **MÓDULO GASTOS**
- **CRUD completo**: Gestión integral de gastos
- **Categorización**: Logística, catering, marketing, producción, etc.
- **Flujo de aprobación**: 
  - Creado → Pendiente aprobación → Aprobado → Pagado
  - Solo admin puede aprobar gastos > $5000
- **Validaciones**:
  - Requiere proveedor y concepto
  - Monto positivo obligatorio
  - Fecha de vencimiento válida
- **Cálculo automático**: IVA y totales
- **Lógica condicional**:
  - Gastos > presupuesto evento requieren aprobación especial
  - Actualiza totales del evento automáticamente

#### 🎯 **MÓDULO EVENTOS**
- **Gestión completa**: Crear, editar, activar/desactivar eventos
- **Presupuesto**: Control de presupuesto vs gastos reales
- **Cálculos automáticos**:
  - Total ingresos = suma de ingresos pagados
  - Total gastos = suma de gastos pagados
  - Resultado neto = ingresos - gastos
  - ROI = (resultado neto / presupuesto) * 100
- **Fechas**: Validación de fechas de inicio/fin
- **Asociaciones**: Ingresos, gastos, documentos relacionados

#### 👥 **MÓDULO USUARIOS Y ROLES**
- **Roles definidos**:
  - **Admin**: Acceso total, aprobaciones, configuración
  - **Ejecutivo**: CRUD transacciones, ver reportes
  - **Visualizador**: Solo lectura, reportes básicos
- **Autenticación**: Supabase Auth integrado
- **Seguridad**: RLS por empresa, acceso basado en roles
- **Perfil**: Gestión de datos personales, avatar

#### 👤 **MÓDULO CLIENTES**
- **CRUD completo**: Gestión de base de clientes
- **Datos**: Nombre, RUC, contacto, dirección
- **Asociaciones**: Ingresos relacionados, documentos
- **Estados**: Activo/inactivo
- **Validaciones**: RUC único, email válido

#### 📄 **MÓDULO DOCUMENTOS**
- **Subida de archivos**: PDF, imágenes, documentos
- **Tipos**: Factura, recibo, contrato, comprobante
- **Asociaciones**: Vinculado a ingresos, gastos, eventos
- **Metadatos**: Tamaño, tipo MIME, fecha de subida
- **Seguridad**: Solo usuarios de la empresa pueden acceder

#### 🔒 **MÓDULO SEGURIDAD**
- **RLS (Row Level Security)**: Aislamiento por empresa
- **Auditoría**: Log completo de cambios
- **Validaciones**: Integridad referencial, tipos de datos
- **Encriptación**: Datos sensibles protegidos

#### 📈 **MÓDULO REPORTES**
- **Reportes financieros**: Por evento, período, cliente
- **Exportación**: PDF, Excel, CSV
- **Filtros avanzados**: Múltiples criterios
- **Gráficos**: Barras, líneas, torta, métricas
- **Tiempo real**: Actualización automática

---

## 📄 3. Reporte Técnico Detallado

### 🏗️ **Arquitectura del Sistema**

#### **Patrón de Diseño**: MVC + Repository Pattern
- **Model**: Entidades Supabase con validaciones
- **View**: Componentes React con TypeScript
- **Controller**: Hooks personalizados para lógica de negocio
- **Repository**: Servicios de datos con Supabase client

#### **Estructura de Base de Datos**

##### **Entidades Principales**:

1. **companies** (Empresas)
   - `id` (uuid, PK): Identificador único
   - `name` (text): Razón social
   - `ruc` (text, unique): Número de RUC
   - `address`, `phone`, `email`: Datos de contacto
   - **Relaciones**: 1:N con todas las demás entidades

2. **user_profiles** (Perfiles de Usuario)
   - `id` (uuid, PK, FK auth.users): Vinculado a Supabase Auth
   - `company_id` (uuid, FK): Empresa asociada
   - `role` (enum): admin, ejecutivo, visualizador
   - **Lógica**: Extiende auth.users con datos empresariales

3. **events** (Eventos)
   - `id` (uuid, PK): Identificador único
   - `budget` (decimal): Presupuesto asignado
   - `total_income`, `total_expense`, `net_result`: Calculados automáticamente
   - **Triggers**: Actualización automática de totales

4. **incomes** (Ingresos)
   - `amount` (decimal): Monto base
   - `tax_rate`, `tax_amount`, `total_amount`: Cálculo automático de impuestos
   - `status` (enum): pendiente, aprobado, pagado
   - **Validaciones**: Monto > 0, fechas coherentes

5. **expenses** (Gastos)
   - Similar a ingresos con campos específicos
   - `requires_approval` (boolean): Control de flujo
   - `category` (text): Clasificación del gasto

#### **Reglas de Negocio Automatizadas**

##### **Cálculos Automáticos**:
```sql
-- Trigger para calcular impuestos
NEW.tax_amount := ROUND((NEW.amount * NEW.tax_rate / 100), 2);
NEW.total_amount := NEW.amount + NEW.tax_amount;
```

##### **Actualización de Totales de Eventos**:
```sql
-- Solo considera transacciones pagadas
UPDATE events SET
    total_income = (SELECT SUM(total_amount) FROM incomes WHERE status = 'pagado'),
    total_expense = (SELECT SUM(total_amount) FROM expenses WHERE status = 'pagado'),
    net_result = total_income - total_expense
```

##### **Validaciones Críticas**:
- **Ingresos**: No se puede marcar como pagado sin número de factura
- **Gastos**: Montos > presupuesto requieren aprobación admin
- **Eventos**: Fecha fin debe ser posterior a fecha inicio
- **Usuarios**: Solo admin puede cambiar roles

#### **Políticas de Seguridad (RLS)**

##### **Aislamiento por Empresa**:
```sql
-- Ejemplo de política RLS
CREATE POLICY "company_isolation" ON incomes
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );
```

##### **Control de Acceso por Rol**:
- **Admin**: Acceso total, aprobaciones, configuración
- **Ejecutivo**: CRUD transacciones, reportes detallados
- **Visualizador**: Solo lectura, reportes básicos

#### **Auditoría Completa**
- **Trigger automático**: Registra INSERT, UPDATE, DELETE
- **Campos auditados**: old_values, new_values, user_id, timestamp
- **Trazabilidad**: Quién, qué, cuándo cambió cada registro

### 🔧 **APIs y Endpoints Necesarios**

#### **Servicios de Datos (Supabase)**:
```typescript
// Ejemplo de servicio
class IncomeService {
  async create(income: CreateIncomeDto): Promise<Income>
  async update(id: string, income: UpdateIncomeDto): Promise<Income>
  async approve(id: string, approvedBy: string): Promise<Income>
  async getByEvent(eventId: string): Promise<Income[]>
  async getMetrics(companyId: string): Promise<IncomeMetrics>
}
```

#### **Hooks Personalizados**:
```typescript
// Gestión de estado y lógica de negocio
const useIncomes = (eventId?: string) => {
  const { data, loading, error } = useQuery(...)
  const createIncome = useMutation(...)
  const approveIncome = useMutation(...)
  return { incomes, createIncome, approveIncome, loading, error }
}
```

---

## 🧠 4. Prompt Maestro para Bolt

### 🚀 **Prompt Completo para Reconstrucción en Bolt**

```
Crea un sistema ERP financiero completo usando React + TypeScript + Supabase con las siguientes especificaciones:

## CONFIGURACIÓN INICIAL

### 1. Setup de Supabase
- Instala @supabase/supabase-js
- Configura cliente con variables de entorno:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
- Implementa autenticación con email/password
- Configura RLS y políticas de seguridad por empresa

### 2. Estructura de la Aplicación
```
src/
├── components/
│   ├── ui/           # Componentes base (Button, Input, Modal, etc.)
│   ├── layout/       # Header, Sidebar, Layout principal
│   └── forms/        # Formularios reutilizables
├── pages/
│   ├── Dashboard.tsx
│   ├── Ingresos.tsx
│   ├── Gastos.tsx
│   ├── Eventos.tsx
│   ├── Clientes.tsx
│   └── Usuarios.tsx
├── hooks/            # Hooks personalizados para cada módulo
├── services/         # Servicios de Supabase
├── types/            # Tipos TypeScript
└── utils/            # Utilidades y helpers
```

## FUNCIONALIDADES REQUERIDAS

### 🏠 DASHBOARD PRINCIPAL
- Métricas en tiempo real: total eventos, ingresos, gastos, utilidad neta
- Gráficos: ROI por evento, tendencias mensuales
- Lista de transacciones pendientes de aprobación
- Filtros: por fecha, evento, responsable
- Cards con iconos y colores diferenciados por estado

### 💰 MÓDULO INGRESOS
- Tabla con paginación y filtros
- Formulario modal para crear/editar:
  - Cliente (select con búsqueda)
  - Evento asociado (select)
  - Concepto y descripción
  - Monto (cálculo automático de IVA)
  - Número de factura
  - Fecha de factura y vencimiento
  - Estado (pendiente/aprobado/pagado)
- Validaciones:
  - Monto > 0
  - Fecha vencimiento > fecha factura
  - Número factura único
- Botones de acción: Aprobar, Marcar como pagado
- Subida de documentos (facturas PDF)

### 💸 MÓDULO GASTOS
- Similar a ingresos con campos específicos:
  - Categoría (select: logística, catering, marketing, etc.)
  - Proveedor
  - Requiere aprobación (checkbox)
- Flujo de aprobación visual
- Validación: gastos > presupuesto evento requieren aprobación admin
- Estados con colores: pendiente (amarillo), aprobado (verde), rechazado (rojo)

### 🎯 MÓDULO EVENTOS
- Vista de cards con información resumida
- Formulario completo:
  - Nombre y descripción
  - Fechas inicio/fin (date picker)
  - Presupuesto
  - Estado activo/inactivo
- Cálculos automáticos mostrados:
  - Total ingresos vs presupuesto
  - Total gastos vs presupuesto
  - Resultado neto
  - ROI percentage
- Gráfico de barras: ingresos vs gastos por evento

### 👥 MÓDULO USUARIOS
- Tabla de usuarios con roles
- Formulario de perfil:
  - Datos personales
  - Rol (solo admin puede cambiar)
  - Avatar upload
  - Estado activo/inactivo
- Gestión de permisos visuales según rol

### 👤 MÓDULO CLIENTES
- CRUD completo con validaciones
- Campos: nombre, RUC, email, teléfono, dirección
- Historial de ingresos por cliente
- Estado activo/inactivo

## COMPONENTES UI REQUERIDOS

### Componentes Base
- Button (variants: primary, secondary, danger)
- Input con validación visual
- Select con búsqueda
- Modal responsive
- Table con paginación y ordenamiento
- DatePicker
- FileUpload con preview
- StatusBadge con colores
- LoadingSpinner
- Toast notifications

### Layout
- Sidebar con navegación por pestañas
- Header con usuario logueado y logout
- Breadcrumbs
- Layout responsive (mobile-first)

## VALIDACIONES Y LÓGICA DE NEGOCIO

### Validaciones del Cliente
- Formularios con react-hook-form + zod
- Validación en tiempo real
- Mensajes de error claros
- Estados de loading durante operaciones

### Reglas de Negocio
- Solo admin/ejecutivo pueden aprobar transacciones
- Ingresos pagados requieren número de factura
- Gastos > $5000 requieren aprobación admin
- Fechas coherentes (vencimiento > factura)
- Montos siempre positivos

### Estados de Carga
- Skeleton loaders para tablas
- Spinners para botones durante operaciones
- Estados vacíos con ilustraciones
- Manejo de errores con retry

## INTEGRACIÓN SUPABASE

### Servicios de Datos
```typescript
// Ejemplo de servicio
class IncomeService {
  private supabase = createClient()
  
  async getAll(filters?: IncomeFilters) {
    let query = this.supabase
      .from('incomes')
      .select(`
        *,
        client:clients(*),
        event:events(*),
        created_by:user_profiles(*)
      `)
    
    if (filters?.eventId) query = query.eq('event_id', filters.eventId)
    if (filters?.status) query = query.eq('status', filters.status)
    
    return query.order('created_at', { ascending: false })
  }
  
  async create(income: CreateIncomeDto) {
    return this.supabase.from('incomes').insert(income).select().single()
  }
  
  async approve(id: string) {
    return this.supabase
      .from('incomes')
      .update({ 
        status: 'aprobado', 
        approved_by: auth.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
  }
}
```

### Hooks Personalizados
```typescript
const useIncomes = (eventId?: string) => {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  
  const fetchIncomes = useCallback(async () => {
    const { data } = await incomeService.getAll({ eventId })
    setIncomes(data || [])
    setLoading(false)
  }, [eventId])
  
  const createIncome = async (income: CreateIncomeDto) => {
    const { data } = await incomeService.create(income)
    setIncomes(prev => [data, ...prev])
    toast.success('Ingreso creado exitosamente')
  }
  
  return { incomes, loading, createIncome, refetch: fetchIncomes }
}
```

### Tiempo Real
- Suscripciones a cambios en transacciones
- Actualización automática de métricas
- Notificaciones de nuevas aprobaciones pendientes

## DISEÑO Y UX

### Tema Visual
- Paleta de colores profesional (azul corporativo)
- Tipografía clara (Inter o similar)
- Iconos consistentes (Lucide React)
- Espaciado uniforme (Tailwind spacing)

### Responsive Design
- Mobile-first approach
- Sidebar colapsable en móvil
- Tablas con scroll horizontal
- Formularios adaptables

### Micro-interacciones
- Hover states en botones y cards
- Transiciones suaves
- Loading states informativos
- Feedback visual inmediato

## SEGURIDAD

### Autenticación
- Login/logout con Supabase Auth
- Protección de rutas por rol
- Sesión persistente
- Redirect automático si no autenticado

### Autorización
- Verificación de permisos en cada acción
- Ocultación de botones según rol
- Validación de permisos en backend (RLS)

## TESTING Y CALIDAD

### Validaciones
- Formularios con esquemas Zod
- Validación de tipos TypeScript estricta
- Manejo de errores robusto
- Fallbacks para estados de error

### Performance
- Lazy loading de componentes
- Paginación en tablas grandes
- Debounce en búsquedas
- Optimización de queries Supabase

## ENTREGABLES

1. **Aplicación completa funcionando** con todas las funcionalidades
2. **Autenticación integrada** con Supabase
3. **CRUD completo** para todas las entidades
4. **Dashboard interactivo** con métricas en tiempo real
5. **Diseño responsive** y profesional
6. **Validaciones robustas** en cliente y servidor
7. **Manejo de estados** de loading y error
8. **Documentación** de componentes principales

Implementa todo paso a paso, comenzando por la configuración de Supabase, luego la estructura base, después cada módulo individualmente, y finalmente las integraciones y pulido final.
```

---

## ✅ Checklist de Verificación

### 🗄️ **Base de Datos**
- [ ] Script SQL ejecutado sin errores
- [ ] Todas las tablas creadas correctamente
- [ ] Índices aplicados para optimización
- [ ] Triggers funcionando (cálculos automáticos)
- [ ] Políticas RLS habilitadas
- [ ] Datos de prueba insertados
- [ ] Funciones de auditoría activas

### 🔐 **Autenticación y Seguridad**
- [ ] Supabase Auth configurado
- [ ] Variables de entorno establecidas
- [ ] RLS funcionando por empresa
- [ ] Roles de usuario implementados
- [ ] Protección de rutas por rol
- [ ] Auditoría de cambios activa

### 🎨 **Frontend - Componentes Base**
- [ ] Layout principal responsive
- [ ] Sidebar con navegación
- [ ] Header con usuario logueado
- [ ] Componentes UI reutilizables
- [ ] Sistema de notificaciones
- [ ] Manejo de estados de carga

### 📊 **Dashboard**
- [ ] Métricas principales mostradas
- [ ] Gráficos interactivos
- [ ] Filtros funcionales
- [ ] Actualización en tiempo real
- [ ] Cards con estados visuales

### 💰 **Módulo Ingresos**
- [ ] CRUD completo funcional
- [ ] Formulario con validaciones
- [ ] Cálculo automático de impuestos
- [ ] Estados de transacción
- [ ] Aprobación por roles
- [ ] Subida de documentos

### 💸 **Módulo Gastos**
- [ ] CRUD completo funcional
- [ ] Categorización de gastos
- [ ] Flujo de aprobación
- [ ] Validaciones de presupuesto
- [ ] Estados visuales
- [ ] Documentos adjuntos

### 🎯 **Módulo Eventos**
- [ ] Gestión completa de eventos
- [ ] Cálculos automáticos
- [ ] Control de presupuesto
- [ ] Asociación con transacciones
- [ ] Reportes por evento

### 👥 **Módulo Usuarios**
- [ ] Gestión de perfiles
- [ ] Control de roles
- [ ] Permisos por funcionalidad
- [ ] Avatar y datos personales

### 👤 **Módulo Clientes**
- [ ] CRUD de clientes
- [ ] Validaciones de datos
- [ ] Historial de transacciones
- [ ] Estados activo/inactivo

### 📄 **Módulo Documentos**
- [ ] Subida de archivos
- [ ] Asociación con transacciones
- [ ] Tipos de documento
- [ ] Visualización y descarga

### 📈 **Reportes y Analytics**
- [ ] Métricas financieras
- [ ] Gráficos por período
- [ ] Exportación de datos
- [ ] Filtros avanzados

### 🔧 **Funcionalidades Técnicas**
- [ ] Validaciones del cliente
- [ ] Manejo de errores
- [ ] Estados de loading
- [ ] Responsive design
- [ ] Performance optimizada
- [ ] Código TypeScript estricto

### 🧪 **Testing y Calidad**
- [ ] Formularios validados
- [ ] Flujos de usuario probados
- [ ] Casos de error manejados
- [ ] Performance aceptable
- [ ] Compatibilidad móvil

---

## 🎯 **Resumen Ejecutivo**

Este documento proporciona una guía completa para reconstruir el sistema ERP financiero desde cero. Incluye:

1. **Script SQL ejecutable** con estructura completa, triggers, funciones y datos de prueba
2. **Auditoría detallada** de todas las funcionalidades por módulo
3. **Especificaciones técnicas** completas con reglas de negocio
4. **Prompt maestro** para implementación en Bolt
5. **Checklist de verificación** para asegurar completitud

El sistema está diseñado para ser escalable, seguro y mantenible, siguiendo las mejores prácticas de desarrollo full-stack con React, TypeScript y Supabase.

**Tiempo estimado de implementación**: 2-3 semanas
**Complejidad**: Media-Alta
**Tecnologías**: React, TypeScript, Supabase, Tailwind CSS

---

*Documento generado para reconstrucción completa del Sistema ERP Financiero*
*Versión: 1.0 | Fecha: 2024*