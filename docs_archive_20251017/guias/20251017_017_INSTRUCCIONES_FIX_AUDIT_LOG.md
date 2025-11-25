# 🔧 Instrucciones para Arreglar el Audit Log

## Problema Detectado
El sistema de auditoría estaba fallando porque la tabla `core_audit_log` no tiene las columnas que el código espera:
- El código usa: `datos_anteriores`, `datos_nuevos`, `usuario_id`, `evento_id`
- La tabla tiene: `old_value`, `new_value`, `user_id`, `entity_id`

## Solución Implementada
Se creó una migración que:
1. ✅ Agrega las columnas faltantes como alias
2. ✅ Crea un trigger que sincroniza automáticamente los datos entre las columnas
3. ✅ Agrega índices para mejorar el rendimiento
4. ✅ Mejora el manejo de errores en el servicio de auditoría

## Pasos para Aplicar el Fix

### Opción 1: Ejecutar SQL Directamente en Supabase Dashboard (RECOMENDADO)

1. **Ir a Supabase Dashboard**
   - URL: https://gomnouwackzvthpwyric.supabase.co
   - Navegar a: SQL Editor

2. **Copiar el contenido del archivo**
   - Archivo: `EJECUTAR_AUDITLOG_FIX.sql`

3. **Pegar y ejecutar**
   - Click en "New Query"
   - Pegar el contenido completo del archivo
   - Click en "Run"

4. **Verificar resultado**
   - Deberías ver un mensaje de éxito
   - La última query mostrará que todas las columnas existen

### Opción 2: Ejecutar Migración (si tienes Supabase CLI configurado)

```bash
cd /home/rodrichrz/proyectos/V19-project-bolt-sb1-h2x1vjm7/project
npx supabase db push
```

## Verificación

Después de aplicar el fix, cuando subas un archivo deberías ver en la consola:

```
[AuditService] Log de auditoría guardado: estado_cambiado
```

En lugar de:

```
Error logging audit action: Could not find the 'datos_anteriores' column...
```

## Qué hace el Fix

### 1. Columnas Agregadas
```sql
- datos_anteriores (jsonb) - Alias de old_value
- datos_nuevos (jsonb)     - Alias de new_value
- usuario_id (uuid)        - Alias de user_id
- evento_id (varchar)      - Alias de entity_id
```

### 2. Trigger de Sincronización
Automáticamente copia los datos entre las columnas cuando se inserta un registro:
- `datos_anteriores` → `old_value`
- `datos_nuevos` → `new_value`
- `usuario_id` → `user_id`
- `evento_id` → `entity_id`

También establece valores por defecto:
- `module` = 'eventos'
- `entity_type` = 'evento'

### 3. Índices para Rendimiento
```sql
- idx_audit_log_usuario_id
- idx_audit_log_evento_id
- idx_audit_log_action
- idx_audit_log_timestamp
```

## Beneficios

✅ **Compatibilidad**: El código funciona sin necesidad de cambios
✅ **Auditoría completa**: Se registran todos los cambios de estado
✅ **Sin errores**: No más mensajes de columnas faltantes
✅ **Rendimiento**: Búsquedas más rápidas gracias a los índices
✅ **Mantenibilidad**: El código usa nombres más descriptivos en español

## Cambios en el Código

También se mejoró el servicio de auditoría (`auditService.ts`) para:
- ✅ No interrumpir el flujo principal si falla el audit log
- ✅ Mostrar mensajes más claros en consola
- ✅ Usar `console.warn` en lugar de `console.error` para errores no críticos

## Estado Actual

Después de aplicar este fix, el flujo completo de subida de documentos debería funcionar:

1. ✅ Sube el documento
2. ✅ Detecta el tipo de documento
3. ✅ Avanza el estado automáticamente
4. ✅ Actualiza la base de datos
5. ✅ **Registra el cambio en el audit log** ← ARREGLADO
6. ✅ Refresca el UI sin cerrar el modal
7. ✅ Muestra toast de éxito con el nuevo estado
