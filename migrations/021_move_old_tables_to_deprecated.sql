-- Migración 021: Mover tablas viejas (evt_*) al esquema deprecated
-- Fecha: 2025-12-01
-- Descripción: Las tablas evt_* ya no se usan, el sistema ahora usa *_erp
-- Esto permite mantener los datos históricos pero separados del esquema principal

-- ============================================
-- PASO 1: Crear el esquema deprecated si no existe
-- ============================================
CREATE SCHEMA IF NOT EXISTS deprecated;

-- ============================================
-- PASO 2: Mover las tablas evt_* al esquema deprecated
-- ============================================

-- Tablas principales de eventos
ALTER TABLE IF EXISTS public.evt_eventos SET SCHEMA deprecated;
ALTER TABLE IF EXISTS public.evt_gastos SET SCHEMA deprecated;
ALTER TABLE IF EXISTS public.evt_ingresos SET SCHEMA deprecated;
ALTER TABLE IF EXISTS public.evt_clientes SET SCHEMA deprecated;
ALTER TABLE IF EXISTS public.evt_categorias_gastos SET SCHEMA deprecated;
ALTER TABLE IF EXISTS public.evt_provisiones SET SCHEMA deprecated;

-- Tablas de catálogos relacionadas con eventos
ALTER TABLE IF EXISTS public.evt_tipos_evento SET SCHEMA deprecated;
ALTER TABLE IF EXISTS public.evt_documentos_ocr SET SCHEMA deprecated;
ALTER TABLE IF EXISTS public.evt_estados SET SCHEMA deprecated;

-- ============================================
-- PASO 3: Mover las vistas que apuntan a tablas viejas
-- ============================================

-- Primero eliminar las vistas (no se pueden mover, se deben recrear)
DROP VIEW IF EXISTS public.vw_eventos_completos CASCADE;
DROP VIEW IF EXISTS public.vw_eventos_analisis_financiero CASCADE;
DROP VIEW IF EXISTS public.vw_gastos_por_categoria CASCADE;
DROP VIEW IF EXISTS public.vw_ingresos_por_estado CASCADE;
DROP VIEW IF EXISTS public.vw_dashboard_metricas CASCADE;
DROP VIEW IF EXISTS public.vw_analisis_temporal CASCADE;

-- ============================================
-- PASO 4: Comentarios para documentación
-- ============================================
COMMENT ON SCHEMA deprecated IS 'Esquema para tablas obsoletas. Las tablas evt_* fueron reemplazadas por *_erp en diciembre 2025.';

-- ============================================
-- RESUMEN DE TABLAS MOVIDAS:
-- ============================================
-- deprecated.evt_eventos       -> Reemplazada por public.eventos_erp
-- deprecated.evt_gastos        -> Reemplazada por public.gastos_erp
-- deprecated.evt_ingresos      -> Reemplazada por public.ingresos_erp
-- deprecated.evt_clientes      -> Reemplazada por public.clientes_erp
-- deprecated.evt_categorias_gastos -> Reemplazada por public.categorias_gastos_erp
-- deprecated.evt_provisiones   -> Sin reemplazo directo (funcionalidad integrada)
-- deprecated.evt_tipos_evento  -> Reemplazada por public.tipos_evento_erp
-- deprecated.evt_estados       -> Reemplazada por public.estados_erp
--
-- VISTAS ELIMINADAS:
-- vw_eventos_completos         -> Reemplazada por vw_eventos_completos_erp
-- vw_eventos_analisis_financiero -> Reemplazada por vw_eventos_analisis_financiero_erp
-- vw_gastos_por_categoria      -> Reemplazada por vw_gastos_por_categoria_erp
-- vw_dashboard_metricas        -> Reemplazada por vw_dashboard_metricas_erp
-- vw_analisis_temporal         -> Reemplazada por vw_analisis_temporal_erp
