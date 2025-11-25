-- ========================================
-- CREAR USUARIO DE DESARROLLO (CORREGIDO)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ========================================

-- Paso 1: Insertar en auth.users (tabla estándar de Supabase)
INSERT INTO auth.users (
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'desarrollo@test.com',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Paso 2: Insertar en core_users (sin columna role)
INSERT INTO public.core_users (
  id,
  email,
  nombre,
  apellidos,
  activo,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'desarrollo@test.com',
  'Usuario',
  'de Desarrollo',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  apellidos = EXCLUDED.apellidos,
  activo = EXCLUDED.activo,
  updated_at = NOW();

-- Paso 3: Verificar que se creó correctamente
SELECT
  'Usuario de desarrollo creado correctamente' as status,
  u.id,
  u.email,
  cu.nombre,
  cu.apellidos,
  cu.activo
FROM auth.users u
LEFT JOIN core_users cu ON u.id = cu.id
WHERE u.id = '00000000-0000-0000-0000-000000000001';