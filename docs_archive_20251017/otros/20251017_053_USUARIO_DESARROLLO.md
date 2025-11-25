# 👤 Usuario de Desarrollo para Testing

## 🎯 Problema Resuelto

Durante el desarrollo, el usuario autenticado en Supabase Auth (`a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`) no existía en la tabla `core_users`, lo que causaba errores de foreign key constraint al intentar actualizar eventos.

## ✅ Solución Implementada

Se configuró un **usuario de desarrollo fijo** que siempre se usa cuando el sistema está en modo desarrollo:

```typescript
// Usuario de desarrollo que existe en core_users
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
```

### Componentes Modificados

1. **DocumentosEvento.tsx**
2. **StateAdvancementManager.tsx**

### Lógica Implementada

```typescript
// En desarrollo, usar usuario fijo que existe en core_users
const isDevMode = import.meta.env.VITE_SECURITY_MODE === 'development';
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
const effectiveUserId = isDevMode ? DEV_USER_ID : (user?.id || null);
```

### ¿Cuándo se activa?

El usuario de desarrollo se usa cuando:
```bash
VITE_SECURITY_MODE=development
```

## 🔄 Flujo de Usuario

### En Desarrollo (VITE_SECURITY_MODE=development)
```
Usuario se autentica → Usa DEV_USER_ID (00000000-0000-0000-0000-000000000001)
                     → ✅ Todas las operaciones funcionan
                     → ✅ No hay errores de foreign key
```

### En Producción (VITE_SECURITY_MODE=production o cualquier otro)
```
Usuario se autentica → Usa user.id del usuario real
                     → Requiere que el usuario exista en core_users
                     → Trigger debería sincronizar automáticamente
```

## 📋 Requisito en Base de Datos

**El usuario `00000000-0000-0000-0000-000000000001` DEBE existir en `core_users`.**

### Verificar si existe:

```sql
SELECT * FROM core_users WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Si no existe, crearlo:

```sql
INSERT INTO core_users (id, email, nombre, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@localhost',
  'Usuario de Desarrollo',
  'admin'
)
ON CONFLICT (id) DO NOTHING;
```

## 🎬 Logs Esperados

Antes (con error):
```
[DocumentosEvento] userId: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
❌ Error: Key (updated_by)=(...) is not present in table "core_users"
```

Después (funcionando):
```
[DocumentosEvento] userId: 00000000-0000-0000-0000-000000000001
✅ Usuario 00000000-0000-0000-0000-000000000001 existe en core_users
✅ Estado avanzado exitosamente
```

## 🔐 Configuración de Seguridad

El archivo `.env` debe tener:

```bash
# Modo de desarrollo
VITE_SECURITY_MODE=development

# Habilitar logs
VITE_ENABLE_CONSOLE_LOGS=true

# Otras variables...
VITE_APP_ENV=development
```

## ⚠️ Importante para Producción

En producción, **NO usar** `VITE_SECURITY_MODE=development`. Esto haría que:
- ❌ Todos los cambios se atribuyan al usuario de desarrollo
- ❌ Se pierda la trazabilidad de quién hizo qué
- ❌ Se permitan acciones que deberían estar restringidas

### Configuración para Producción:

```bash
VITE_SECURITY_MODE=production
VITE_ENABLE_CONSOLE_LOGS=false
VITE_APP_ENV=production
```

Y asegurarse de tener un **trigger que sincronice usuarios**:

```sql
CREATE OR REPLACE FUNCTION sync_user_to_core_users()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO core_users (id, email, nombre, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre = COALESCE(EXCLUDED.nombre, core_users.nombre);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_to_core_users();
```

## 📊 Beneficios

✅ **Desarrollo sin fricciones**: No hay que crear usuarios en core_users manualmente
✅ **Testing consistente**: Siempre se usa el mismo usuario
✅ **Trazabilidad**: Se puede filtrar logs por el usuario de desarrollo
✅ **Seguridad**: Solo activo en modo desarrollo
✅ **Debugging fácil**: Siempre se sabe qué usuario se está usando

## 🧪 Testing

### Probar en Desarrollo:
1. Asegurarse que `.env` tiene `VITE_SECURITY_MODE=development`
2. Subir un documento
3. Ver logs: debería mostrar `userId: 00000000-0000-0000-0000-000000000001`
4. Verificar que el estado avanza correctamente

### Probar en Producción (cuando esté listo):
1. Cambiar `.env` a `VITE_SECURITY_MODE=production`
2. Crear trigger de sincronización de usuarios
3. Autenticarse como usuario real
4. Subir documento
5. Verificar que se use el ID del usuario real

## 🔍 Dónde se Usa

El `effectiveUserId` se usa en:

1. **Registro de documentos** (`evt_documentos.created_by`)
2. **Avance de estado** (`workflowService.advanceStateOnDocumentUpload`)
3. **Actualización de eventos** (`evt_eventos.updated_by` - si el usuario existe)
4. **Audit log** (`core_audit_log.usuario_id`)

## 📝 Notas Adicionales

- El UUID `00000000-0000-0000-0000-000000000001` es un UUID válido y fácil de identificar
- Este patrón es común en desarrollo para tener datos consistentes
- En producción, cada usuario tendrá su propio UUID único de Supabase Auth
