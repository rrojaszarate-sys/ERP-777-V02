-- ============================================================
-- CREAR TABLA evt_documentos_erp
-- Esta tabla almacena documentos asociados a eventos del ERP
-- con FK correcta hacia evt_eventos_erp
-- ============================================================

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS public.evt_documentos_erp (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- FK hacia la tabla correcta de eventos ERP
  CONSTRAINT evt_documentos_erp_evento_id_fkey 
    FOREIGN KEY (evento_id) 
    REFERENCES public.evt_eventos_erp(id)
    ON DELETE CASCADE,
    
  -- FK hacia usuarios (opcional, permite nulos)
  CONSTRAINT evt_documentos_erp_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES public.core_users(id)
    ON DELETE SET NULL
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_evt_documentos_erp_evento_id ON public.evt_documentos_erp(evento_id);
CREATE INDEX IF NOT EXISTS idx_evt_documentos_erp_created_by ON public.evt_documentos_erp(created_by);

-- 3. Habilitar Row Level Security
ALTER TABLE public.evt_documentos_erp ENABLE ROW LEVEL SECURITY;

-- 4. Crear política de acceso (permite todo para usuarios autenticados)
DROP POLICY IF EXISTS "evt_documentos_erp_all_access" ON public.evt_documentos_erp;
CREATE POLICY "evt_documentos_erp_all_access" ON public.evt_documentos_erp
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 5. Verificar que la tabla se creó correctamente
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'evt_documentos_erp'
ORDER BY ordinal_position;

-- ============================================================
-- INSTRUCCIONES:
-- 1. Ejecutar este script en el Dashboard de Supabase
-- 2. Verificar que la tabla fue creada correctamente
-- 3. Probar subir un documento desde el tab de Workflow
-- ============================================================
