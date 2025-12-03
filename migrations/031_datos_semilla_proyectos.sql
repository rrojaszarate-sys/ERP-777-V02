-- =====================================================
-- DATOS SEMILLA PARA MÓDULO DE PROYECTOS
-- =====================================================
-- Este script inserta etapas predeterminadas para proyectos y tareas (Kanban)
-- Ejecutar DESPUÉS de 030_modulo_proyectos_completo.sql

-- =====================================================
-- ETAPAS DE PROYECTO (Fases del ciclo de vida)
-- =====================================================

-- Nota: Reemplazar 'TU_COMPANY_ID' con el company_id real de tu empresa
-- Ejemplo: UPDATE abajo con el ID de tu empresa

INSERT INTO proy_etapas_proyecto (company_id, nombre, color, secuencia, activo, created_at, updated_at)
VALUES
  (
    (SELECT id FROM companies LIMIT 1), -- Toma la primera empresa (ajustar si tienes múltiples)
    'Planificación',
    '#3B82F6', -- Azul
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM companies LIMIT 1),
    'En Ejecución',
    '#10B981', -- Verde
    2,
    true,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM companies LIMIT 1),
    'En Revisión',
    '#F59E0B', -- Amarillo
    3,
    true,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM companies LIMIT 1),
    'Completado',
    '#8B5CF6', -- Púrpura
    4,
    true,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM companies LIMIT 1),
    'En Pausa',
    '#EF4444', -- Rojo
    5,
    true,
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- ETAPAS DE TAREA / COLUMNAS KANBAN
-- =====================================================

INSERT INTO proy_etapas_tarea (company_id, nombre, color, secuencia, activo, created_at, updated_at)
VALUES
  (
    (SELECT id FROM companies LIMIT 1),
    'Por Hacer',
    '#94A3B8', -- Gris
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM companies LIMIT 1),
    'En Progreso',
    '#3B82F6', -- Azul
    2,
    true,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM companies LIMIT 1),
    'En Revisión',
    '#F59E0B', -- Amarillo
    3,
    true,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM companies LIMIT 1),
    'Bloqueado',
    '#EF4444', -- Rojo
    4,
    true,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM companies LIMIT 1),
    'Completado',
    '#10B981', -- Verde
    5,
    true,
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- PROYECTO DE EJEMPLO (OPCIONAL)
-- =====================================================
-- Descomenta para crear un proyecto demo

/*
INSERT INTO proy_proyectos (
  company_id,
  nombre,
  descripcion,
  status,
  fecha_inicio,
  fecha_fin_estimada,
  presupuesto,
  costo_real,
  progreso,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM companies LIMIT 1),
  'Proyecto Demo - Implementación ERP',
  'Proyecto de ejemplo para demostración del módulo de gestión de proyectos',
  'en_progreso',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  150000.00,
  45000.00,
  35,
  NOW(),
  NOW()
);

-- TAREAS DE EJEMPLO (requiere ID del proyecto creado arriba)
INSERT INTO proy_tareas (
  proyecto_id,
  nombre,
  descripcion,
  status,
  prioridad,
  fecha_inicio,
  fecha_fin,
  horas_estimadas,
  horas_reales,
  progreso,
  etapa_id,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM proy_proyectos ORDER BY created_at DESC LIMIT 1),
  'Análisis de Requerimientos',
  'Levantar y documentar todos los requerimientos del proyecto',
  'completada',
  'alta',
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '20 days',
  40,
  38,
  100,
  (SELECT id FROM proy_etapas_tarea WHERE nombre = 'Completado' LIMIT 1),
  NOW(),
  NOW()
),
(
  (SELECT id FROM proy_proyectos ORDER BY created_at DESC LIMIT 1),
  'Diseño de Arquitectura',
  'Diseñar la arquitectura técnica del sistema',
  'en_progreso',
  'alta',
  CURRENT_DATE - INTERVAL '15 days',
  CURRENT_DATE + INTERVAL '5 days',
  60,
  45,
  75,
  (SELECT id FROM proy_etapas_tarea WHERE nombre = 'En Progreso' LIMIT 1),
  NOW(),
  NOW()
),
(
  (SELECT id FROM proy_proyectos ORDER BY created_at DESC LIMIT 1),
  'Desarrollo Backend',
  'Implementar APIs y lógica de negocio',
  'pendiente',
  'media',
  CURRENT_DATE + INTERVAL '5 days',
  CURRENT_DATE + INTERVAL '45 days',
  120,
  0,
  0,
  (SELECT id FROM proy_etapas_tarea WHERE nombre = 'Por Hacer' LIMIT 1),
  NOW(),
  NOW()
);

-- HITO DE EJEMPLO
INSERT INTO proy_hitos (
  company_id,
  proyecto_id,
  nombre,
  descripcion,
  fecha_objetivo,
  completado,
  progreso,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM companies LIMIT 1),
  (SELECT id FROM proy_proyectos ORDER BY created_at DESC LIMIT 1),
  'Fase 1: Análisis Completado',
  'Finalización de la fase de análisis y diseño del proyecto',
  CURRENT_DATE - INTERVAL '10 days',
  true,
  100,
  NOW(),
  NOW()
),
(
  (SELECT id FROM companies LIMIT 1),
  (SELECT id FROM proy_proyectos ORDER BY created_at DESC LIMIT 1),
  'Fase 2: MVP Listo',
  'Producto mínimo viable funcional y probado',
  CURRENT_DATE + INTERVAL '60 days',
  false,
  25,
  NOW(),
  NOW()
);
*/

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Consulta para verificar que se insertaron las etapas
SELECT 'Etapas de Proyecto creadas:' as info, COUNT(*) as total FROM proy_etapas_proyecto WHERE activo = true;
SELECT 'Columnas Kanban creadas:' as info, COUNT(*) as total FROM proy_etapas_tarea WHERE activo = true;

-- Mostrar las etapas creadas
SELECT 'ETAPAS DE PROYECTO' as tipo, nombre, color, secuencia as orden FROM proy_etapas_proyecto WHERE activo = true ORDER BY secuencia;
SELECT 'COLUMNAS KANBAN' as tipo, nombre, color, secuencia as orden FROM proy_etapas_tarea WHERE activo = true ORDER BY secuencia;
