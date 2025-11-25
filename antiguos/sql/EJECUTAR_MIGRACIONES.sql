-- =====================================================
-- SCRIPT COMPLETO DE MIGRACIONES - EJECUTAR EN ORDEN
-- =====================================================
--
-- Instrucciones:
-- 1. Abrir Supabase SQL Editor
-- 2. Copiar y pegar este script completo
-- 3. Ejecutar
--
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR EVENTOS EXISTENTES (SI LOS HAY)
-- =====================================================

-- Deshabilitar temporalmente los triggers para evitar conflictos
SET session_replication_role = replica;

-- Eliminar documentos de eventos
DELETE FROM evt_documentos WHERE evento_id IN (SELECT id FROM evt_eventos);

-- Eliminar gastos de eventos
DELETE FROM evt_gastos WHERE evento_id IN (SELECT id FROM evt_eventos);

-- Eliminar ingresos de eventos
DELETE FROM evt_ingresos WHERE evento_id IN (SELECT id FROM evt_eventos);

-- Eliminar todos los eventos
DELETE FROM evt_eventos;

-- Reactivar triggers
SET session_replication_role = DEFAULT;

-- Reiniciar secuencias
ALTER SEQUENCE evt_eventos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_documentos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_gastos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_ingresos_id_seq RESTART WITH 1;

RAISE NOTICE '✓ Paso 1 completado: Eventos eliminados y secuencias reiniciadas';

-- =====================================================
-- PASO 2: AGREGAR ESTADO "CANCELADO" (SI NO EXISTE)
-- =====================================================

INSERT INTO evt_estados (nombre, descripcion, color, orden, workflow_step)
SELECT 'Cancelado', 'Evento cancelado', '#EF4444', 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM evt_estados WHERE nombre = 'Cancelado'
);

RAISE NOTICE '✓ Paso 2 completado: Estado Cancelado verificado';

-- =====================================================
-- PASO 3: ACTUALIZAR NOMBRES DE ESTADOS CORRECTOS
-- =====================================================

-- Estado 1: Borrador (mantener)
UPDATE evt_estados SET
  nombre = 'Borrador',
  descripcion = 'Evento en borrador inicial',
  color = '#6B7280',
  orden = 1,
  workflow_step = 1
WHERE orden = 1;

-- Estado 2: Cotizado → Acuerdo
UPDATE evt_estados SET
  nombre = 'Acuerdo',
  descripcion = 'Acuerdo firmado con el cliente',
  color = '#3B82F6',
  orden = 2,
  workflow_step = 2
WHERE orden = 2;

-- Estado 3: Aprobado → Orden de Compra
UPDATE evt_estados SET
  nombre = 'Orden de Compra',
  descripcion = 'Orden de compra generada',
  color = '#10B981',
  orden = 3,
  workflow_step = 3
WHERE orden = 3;

-- Estado 4: En Proceso → En Ejecución
UPDATE evt_estados SET
  nombre = 'En Ejecución',
  descripcion = 'Evento en ejecución',
  color = '#F59E0B',
  orden = 4,
  workflow_step = 4
WHERE orden = 4;

-- Estado 5: Completado → Finalizado
UPDATE evt_estados SET
  nombre = 'Finalizado', -- Asegura que el nombre sea 'Finalizado'
  descripcion = 'Evento finalizado exitosamente',
  color = '#059669',
  orden = 5,
  workflow_step = 5;

-- =====================================================
-- PASO 4: CREAR USUARIO DE DESARROLLO
-- =====================================================

-- Crear usuario de desarrollo para pruebas
INSERT INTO auth.users (
  id,
  email,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'desarrollo@test.com',
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role;

-- También insertar en core_users para mantener la sincronización
INSERT INTO public.core_users (
  id,
  email,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'desarrollo@test.com',
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role;

RAISE NOTICE '✓ Paso 4 completado: Usuario de desarrollo creado/actualizado';

-- =====================================================
-- PASO 5: CORREGIR RESTRICCIONES DE evt_documentos
-- =====================================================

-- Modificar la columna created_by para permitir valores nulos
ALTER TABLE public.evt_documentos ALTER COLUMN created_by DROP NOT NULL;

-- Asegurar que exista la restricción de clave foránea correcta
ALTER TABLE public.evt_documentos 
  DROP CONSTRAINT IF EXISTS evt_documentos_created_by_fkey,
  ADD CONSTRAINT evt_documentos_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- Crear índices para mejorar el rendimiento si no existen
CREATE INDEX IF NOT EXISTS idx_evt_documentos_evento_id ON public.evt_documentos(evento_id);
CREATE INDEX IF NOT EXISTS idx_evt_documentos_created_by ON public.evt_documentos(created_by);

RAISE NOTICE '✓ Paso 5 completado: Restricciones de evt_documentos actualizadas';
WHERE orden = 5;

-- Estado 6: Facturado (mantener)
UPDATE evt_estados SET
  nombre = 'Facturado',
  descripcion = 'Todos los ingresos han sido facturados',
  color = '#7C3AED',
  orden = 6,
  workflow_step = 6
WHERE orden = 6;

-- Estado 7: Cobrado → Pagado
UPDATE evt_estados SET
  nombre = 'Pagado', -- Asegura que el nombre sea 'Pagado'
  descripcion = 'Todos los ingresos han sido pagados',
  color = '#059669',
  orden = 7,
  workflow_step = 7
WHERE orden = 7;

RAISE NOTICE '✓ Paso 3 completado: Nombres de estados actualizados';

-- =====================================================
-- PASO 4: VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
  estados_count INTEGER;
  eventos_count INTEGER;
BEGIN
  -- Contar estados
  SELECT COUNT(*) INTO estados_count FROM evt_estados;

  -- Contar eventos
  SELECT COUNT(*) INTO eventos_count FROM evt_eventos;

  -- Mostrar resumen
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '          MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Estados en la base de datos: %', estados_count;
  RAISE NOTICE '✓ Eventos en la base de datos: %', eventos_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Estados disponibles:';
  RAISE NOTICE '  1. Borrador';
  RAISE NOTICE '  2. Acuerdo';
  RAISE NOTICE '  3. Orden de Compra';
  RAISE NOTICE '  4. En Ejecución';
  RAISE NOTICE '  5. Finalizado';
  RAISE NOTICE '  6. Facturado';
  RAISE NOTICE '  7. Pagado';
  RAISE NOTICE '  0. Cancelado (estado especial)';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';

  -- Verificar que tengamos exactamente 8 estados
  IF estados_count != 8 THEN
    RAISE WARNING '⚠ ADVERTENCIA: Se esperaban 8 estados, pero se encontraron %', estados_count;
  END IF;
END $$;

-- =====================================================
-- CONSULTA DE VERIFICACIÓN (OPCIONAL)
-- =====================================================

-- Descomentar para ver los estados:
-- SELECT id, nombre, descripcion, color, orden, workflow_step
-- FROM evt_estados
-- ORDER BY orden;
