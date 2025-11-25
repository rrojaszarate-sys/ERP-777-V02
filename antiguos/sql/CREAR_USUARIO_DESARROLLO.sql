-- ========================================
-- CREAR USUARIO DE DESARROLLO
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ========================================

-- Este usuario se usa automáticamente en modo desarrollo
-- para evitar problemas de foreign key constraint

-- Crear el usuario de desarrollo si no existe
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

-- Verificar que se creó correctamente
SELECT
  'Usuario de desarrollo creado/actualizado correctamente' as status,
  id,
  email,
  nombre,
  role,
  activo
FROM core_users
WHERE id = '00000000-0000-0000-0000-000000000001';
