-- ============================================
-- Storage por Empresa - Buckets Individuales
-- Migración: 20241203_storage_per_company.sql
-- ============================================

-- ============================================
-- 1. FUNCIÓN PARA CREAR BUCKET DE EMPRESA
-- ============================================

-- Función para generar nombre de bucket válido
CREATE OR REPLACE FUNCTION generate_bucket_name(company_id UUID)
RETURNS TEXT AS $$
BEGIN
    -- Formato: erp-{primeros 8 caracteres del UUID}
    RETURN 'erp-' || REPLACE(company_id::text, '-', '')::text;
END;
$$ LANGUAGE plpgsql;

-- Función para crear bucket de empresa (requiere extensión storage)
CREATE OR REPLACE FUNCTION create_company_bucket(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_bucket_name TEXT;
BEGIN
    v_bucket_name := generate_bucket_name(p_company_id);

    -- Insertar en storage.buckets si no existe
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        v_bucket_name,
        v_bucket_name,
        true,  -- público para acceso a logos/imágenes
        52428800,  -- 50MB límite
        ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp',
              'application/pdf', 'application/xml', 'text/xml',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel']
    )
    ON CONFLICT (id) DO NOTHING;

    -- Actualizar empresa con nombre del bucket
    UPDATE core_companies
    SET configuracion_extra = COALESCE(configuracion_extra, '{}'::jsonb) ||
        jsonb_build_object('bucket_name', v_bucket_name)
    WHERE id = p_company_id;

    RETURN v_bucket_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. POLÍTICAS RLS PARA STORAGE
-- ============================================

-- Crear política para que usuarios solo accedan a su bucket de empresa
CREATE OR REPLACE FUNCTION storage_company_policy(bucket_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_company_id UUID;
    v_expected_bucket TEXT;
BEGIN
    -- Obtener company_id del usuario actual
    SELECT company_id INTO v_user_company_id
    FROM core_users
    WHERE id = auth.uid();

    IF v_user_company_id IS NULL THEN
        RETURN false;
    END IF;

    -- Generar nombre de bucket esperado
    v_expected_bucket := generate_bucket_name(v_user_company_id);

    -- Verificar si coincide
    RETURN bucket_id = v_expected_bucket OR bucket_id = 'event_docs';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. TRIGGER PARA CREAR BUCKET AL CREAR EMPRESA
-- ============================================

CREATE OR REPLACE FUNCTION on_company_created_storage()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear bucket para la nueva empresa
    PERFORM create_company_bucket(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar trigger (después del existente)
DROP TRIGGER IF EXISTS trg_company_created_storage ON core_companies;
CREATE TRIGGER trg_company_created_storage
    AFTER INSERT ON core_companies
    FOR EACH ROW
    EXECUTE FUNCTION on_company_created_storage();

-- ============================================
-- 4. TABLA DE REGISTRO DE ARCHIVOS
-- ============================================

-- Actualizar tabla de archivos para incluir bucket
ALTER TABLE core_company_files ADD COLUMN IF NOT EXISTS bucket_name VARCHAR(100);
ALTER TABLE core_company_files ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- ============================================
-- 5. VISTA DE ARCHIVOS CON URL COMPLETA
-- ============================================

CREATE OR REPLACE VIEW vw_company_files AS
SELECT
    f.*,
    c.nombre as empresa_nombre,
    COALESCE(f.bucket_name, 'event_docs') as bucket,
    CASE
        WHEN f.bucket_name IS NOT NULL THEN
            'https://gomnouwackzvthpwyric.supabase.co/storage/v1/object/public/' ||
            COALESCE(f.bucket_name, 'event_docs') || '/' || f.nombre_storage
        ELSE f.url
    END as url_completa
FROM core_company_files f
LEFT JOIN core_companies c ON f.company_id = c.id;

-- ============================================
-- 6. FUNCIÓN HELPER PARA OBTENER BUCKET
-- ============================================

CREATE OR REPLACE FUNCTION get_company_bucket(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_bucket TEXT;
BEGIN
    -- Primero buscar en configuración
    SELECT configuracion_extra->>'bucket_name' INTO v_bucket
    FROM core_companies
    WHERE id = p_company_id;

    -- Si no existe, generar y crear
    IF v_bucket IS NULL THEN
        v_bucket := create_company_bucket(p_company_id);
    END IF;

    RETURN v_bucket;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. CREAR BUCKETS PARA EMPRESAS EXISTENTES
-- ============================================

-- Crear bucket para la empresa default
SELECT create_company_bucket('00000000-0000-0000-0000-000000000001');

-- Crear buckets para todas las empresas existentes
DO $$
DECLARE
    v_company RECORD;
BEGIN
    FOR v_company IN SELECT id FROM core_companies WHERE activo = true LOOP
        PERFORM create_company_bucket(v_company.id);
    END LOOP;
END $$;

-- ============================================
-- 8. ESTRUCTURA DE CARPETAS ESTÁNDAR
-- ============================================

COMMENT ON FUNCTION create_company_bucket IS
'Crea un bucket de storage para una empresa con la estructura:
  {bucket}/
    ├── branding/
    │   ├── logo_principal/
    │   ├── logo_secundario/
    │   ├── membrete/
    │   ├── favicon/
    │   ├── firma/
    │   └── sello/
    ├── eventos/
    │   └── {clave_evento}/
    ├── gastos/
    │   └── comprobantes/
    ├── facturas/
    │   ├── xml/
    │   └── pdf/
    └── documentos/';

-- ============================================
-- 9. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_company_files_bucket ON core_company_files(bucket_name);
CREATE INDEX IF NOT EXISTS idx_company_files_path ON core_company_files(storage_path);
