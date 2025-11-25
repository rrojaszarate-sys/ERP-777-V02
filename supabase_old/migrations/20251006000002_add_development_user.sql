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