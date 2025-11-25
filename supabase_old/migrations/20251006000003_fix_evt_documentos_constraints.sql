-- Asegurar que la tabla evt_documentos tenga las columnas y restricciones correctas
CREATE TABLE IF NOT EXISTS public.evt_documentos (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER NOT NULL REFERENCES public.evt_eventos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT evt_documentos_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES auth.users(id)
    ON DELETE SET NULL
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_evt_documentos_evento_id ON public.evt_documentos(evento_id);
CREATE INDEX IF NOT EXISTS idx_evt_documentos_created_by ON public.evt_documentos(created_by);

-- Modificar la columna created_by para permitir valores nulos
ALTER TABLE public.evt_documentos ALTER COLUMN created_by DROP NOT NULL;