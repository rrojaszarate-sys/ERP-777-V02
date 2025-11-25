-- ============================================================================
-- EJECUTAR ESTE SQL EN EL DASHBOARD DE SUPABASE
-- ============================================================================
-- Ir a: https://supabase.com/dashboard/project/gomnouwackzvthpwyric/editor
-- Abrir SQL Editor y pegar este código completo
-- ============================================================================

-- PASO 1: AGREGAR COLUMNAS NUEVAS
ALTER TABLE evt_eventos
ADD COLUMN IF NOT EXISTS provision_combustible_peaje NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS provision_materiales NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS provision_recursos_humanos NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS provision_solicitudes_pago NUMERIC DEFAULT 0;

-- PASO 2: AGREGAR COMENTARIOS
COMMENT ON COLUMN evt_eventos.provision_combustible_peaje IS 'Provisión para combustible y peajes';
COMMENT ON COLUMN evt_eventos.provision_materiales IS 'Provisión para materiales y suministros';
COMMENT ON COLUMN evt_eventos.provision_recursos_humanos IS 'Provisión para recursos humanos';
COMMENT ON COLUMN evt_eventos.provision_solicitudes_pago IS 'Provisión para solicitudes de pago';

-- PASO 3: MARCAR CAMPOS OBSOLETOS
COMMENT ON COLUMN evt_eventos.provisiones IS '[OBSOLETO] Campo en desuso. Ver provision_* por categoría';
COMMENT ON COLUMN evt_eventos.utilidad_estimada IS '[OBSOLETO] Se calcula en vista';
COMMENT ON COLUMN evt_eventos.porcentaje_utilidad_estimada IS '[OBSOLETO] Se calcula en vista';
COMMENT ON COLUMN evt_eventos.total_gastos IS '[OBSOLETO] Se calcula en vista';
COMMENT ON COLUMN evt_eventos.utilidad IS '[OBSOLETO] Se calcula en vista';
COMMENT ON COLUMN evt_eventos.margen_utilidad IS '[OBSOLETO] Se calcula en vista';

-- CONFIRMACIÓN
SELECT 'Columnas agregadas exitosamente' AS mensaje;
