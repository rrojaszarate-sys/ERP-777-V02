-- ========================================
-- VERIFICAR SI EL USUARIO YA EXISTE
-- Ejecuta esto primero en Supabase Dashboard
-- ========================================

SELECT 'Verificando usuario de desarrollo...' as mensaje;

-- Verificar en core_users
SELECT 
  'CORE_USERS' as tabla,
  id, 
  email, 
  nombre, 
  activo
FROM core_users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Si no existe, crear con este SQL:
-- (Solo ejecutar si no apareció nada arriba)
/*
INSERT INTO core_users (id, email, nombre, apellidos, activo)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'desarrollo@test.com',
  'Usuario',
  'de Desarrollo',
  true
);
*/