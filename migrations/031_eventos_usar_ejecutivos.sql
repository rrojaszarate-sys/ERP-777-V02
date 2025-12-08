-- =====================================================
-- Migration: Eventos usan catálogo de ejecutivos
-- Fecha: 2025-12-06
-- Descripción:
--   - Agregar columnas ejecutivo_responsable_id y ejecutivo_solicitante_id a evt_eventos_erp
--   - Mantener responsable_id y solicitante_id como legacy (UUIDs de core_users)
--   - Los ejecutivos son del catálogo cont_ejecutivos
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Agregar columnas de ejecutivos a evt_eventos_erp
-- =====================================================

-- Agregar referencia a ejecutivo responsable
ALTER TABLE evt_eventos_erp
ADD COLUMN IF NOT EXISTS ejecutivo_responsable_id INTEGER REFERENCES cont_ejecutivos(id);

-- Agregar referencia a ejecutivo solicitante
ALTER TABLE evt_eventos_erp
ADD COLUMN IF NOT EXISTS ejecutivo_solicitante_id INTEGER REFERENCES cont_ejecutivos(id);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_evt_eventos_ejecutivo_resp ON evt_eventos_erp(ejecutivo_responsable_id);
CREATE INDEX IF NOT EXISTS idx_evt_eventos_ejecutivo_sol ON evt_eventos_erp(ejecutivo_solicitante_id);

-- =====================================================
-- PASO 2: Comentarios
-- =====================================================

COMMENT ON COLUMN evt_eventos_erp.ejecutivo_responsable_id IS 'Ejecutivo responsable del evento (del catálogo cont_ejecutivos)';
COMMENT ON COLUMN evt_eventos_erp.ejecutivo_solicitante_id IS 'Ejecutivo que solicita el evento (del catálogo cont_ejecutivos)';

-- =====================================================
-- PASO 3: Migrar datos existentes (si hay ejecutivos vinculados a usuarios)
-- =====================================================

-- Intentar vincular responsables existentes con ejecutivos
UPDATE evt_eventos_erp e
SET ejecutivo_responsable_id = ej.id
FROM cont_ejecutivos ej
WHERE e.responsable_id IS NOT NULL
  AND ej.user_id = e.responsable_id
  AND e.ejecutivo_responsable_id IS NULL;

-- Intentar vincular solicitantes existentes con ejecutivos
UPDATE evt_eventos_erp e
SET ejecutivo_solicitante_id = ej.id
FROM cont_ejecutivos ej
WHERE e.solicitante_id IS NOT NULL
  AND ej.user_id = e.solicitante_id
  AND e.ejecutivo_solicitante_id IS NULL;

COMMIT;

-- =====================================================
-- ROLLBACK (si es necesario)
-- =====================================================
-- BEGIN;
-- ALTER TABLE evt_eventos_erp DROP COLUMN IF EXISTS ejecutivo_responsable_id;
-- ALTER TABLE evt_eventos_erp DROP COLUMN IF EXISTS ejecutivo_solicitante_id;
-- COMMIT;
