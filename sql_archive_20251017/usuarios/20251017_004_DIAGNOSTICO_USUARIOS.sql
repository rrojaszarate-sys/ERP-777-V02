-- ========================================
-- DIAGNÓSTICO: Verificar esquema de usuarios
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ========================================

-- Paso 1: Verificar qué tablas de usuarios existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%user%' 
OR table_name LIKE '%auth%'
ORDER BY table_name;

-- Paso 2: Verificar estructura de auth.users (tabla estándar de Supabase)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Paso 3: Ver si existe tabla core_users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'core_users'
ORDER BY ordinal_position;

-- Paso 4: Verificar usuarios existentes en auth.users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
LIMIT 5;