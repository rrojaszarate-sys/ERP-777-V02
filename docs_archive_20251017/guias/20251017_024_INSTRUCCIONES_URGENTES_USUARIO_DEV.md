# 🚨 INSTRUCCIONES URGENTES - Usuario de Desarrollo

## ❌ Error Actual

```
Key (created_by)=(00000000-0000-0000-0000-000000000001) is not present in table "users"
```

## 🔍 Causa

La tabla `evt_documentos` tiene una foreign key constraint que apunta a la tabla `users`, pero el usuario de desarrollo solo existe en `core_users`.

## ✅ Solución Inmediata

### Paso 1: Ir a Supabase Dashboard

1. Abrir: https://gomnouwackzvthpwyric.supabase.co
2. Click en: **SQL Editor**
3. Click en: **New Query**

### Paso 2: Ejecutar el Script

Copiar y pegar este SQL completo:

```sql
-- Crear usuario en la tabla 'users'
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

-- Crear usuario en la tabla 'core_users' (por si acaso)
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
SELECT 'Usuario creado en users' as status, id, email, nombre FROM users WHERE id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Usuario creado en core_users' as status, id, email, nombre FROM core_users WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Paso 3: Verificar Resultado

Deberías ver dos filas en el resultado:
- ✅ Usuario creado en users
- ✅ Usuario creado en core_users

## 🧪 Prueba

Después de ejecutar el SQL:

1. Recargar la página de la aplicación
2. Ir a Detalle de Evento → Tab Archivos
3. Subir un documento
4. **Debería funcionar sin errores**

## 📊 Logs Esperados

```
✅ Documento subido correctamente
✅ Estado avanzado a: [Nuevo Estado]
✅ [AuditService] Log de auditoría guardado
```

## ⚠️ Si Sigue Fallando

Si después de ejecutar el script sigue apareciendo el error, hay dos posibles causas:

### Opción A: La tabla se llama diferente

Ejecutar este query para ver todas las tablas de usuarios:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%user%'
ORDER BY table_name;
```

### Opción B: La columna en evt_documentos es diferente

Ejecutar este query para ver las foreign keys:

```sql
SELECT
  tc.constraint_name,
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
```

Y compartir el resultado para ajustar la solución.

## 📝 Resumen

El problema es que tienes **dos tablas de usuarios**:
- `users` - Tabla principal de usuarios
- `core_users` - ¿Tabla de respaldo/legacy?

Y `evt_documentos.created_by` apunta a `users`, no a `core_users`.

La solución es crear el usuario de desarrollo en **ambas tablas**.
