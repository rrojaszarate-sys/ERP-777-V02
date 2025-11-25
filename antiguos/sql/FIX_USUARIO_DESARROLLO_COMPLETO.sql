-- ========================================
-- CREAR USUARIO DE DESARROLLO EN TODAS LAS TABLAS NECESARIAS
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ========================================

-- 1. Verificar qué tablas de usuarios existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%user%'
ORDER BY table_name;

-- 2. Crear usuario en la tabla 'users' si existe
INSERT INTO users (id, email, nombre, role, activo)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@localhost',
  'Usuario de Desarrollo',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  role = EXCLUDED.role,
  activo = EXCLUDED.activo;

-- 3. Crear usuario en la tabla 'core_users' si existe
INSERT INTO core_users (id, email, nombre, role, activo)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@localhost',
  'Usuario de Desarrollo',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  role = EXCLUDED.role,
  activo = EXCLUDED.activo;

-- 4. Verificar el constraint de evt_documentos
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'evt_documentos'
AND tc.constraint_type = 'FOREIGN KEY';

-- 5. Verificar que el usuario se creó en ambas tablas
SELECT 'users' as tabla, id, email, nombre, role
FROM users
WHERE id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'core_users' as tabla, id, email, nombre, role
FROM core_users
WHERE id = '00000000-0000-0000-0000-000000000001';
