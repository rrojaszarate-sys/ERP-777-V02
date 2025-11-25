-- ========================================
-- SOLUCIÓN SIMPLE: Usuario de desarrollo
-- Ejecutar EN PARTES en Supabase Dashboard > SQL Editor
-- ========================================

-- PARTE 1: Solo crear en core_users
INSERT INTO core_users (
  id,
  email,
  nombre,
  apellidos,
  activo
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'desarrollo@test.com',
  'Usuario',
  'de Desarrollo',
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  activo = EXCLUDED.activo;

-- PARTE 2: Verificar que se creó
SELECT * FROM core_users WHERE id = '00000000-0000-0000-0000-000000000001';