# 📥 Instrucciones de Restauración de Base de Datos

## 📋 Información General

Este documento explica cómo restaurar los respaldos generados por `scripts/backup-database.mjs`.

**Archivos de respaldo generados:**
- `backup_schema.sql` - Solo estructura (tablas, índices, constraints)
- `backup_data.sql` - Solo datos (INSERT statements)
- `backup_full.sql` - Respaldo completo (estructura + datos)
- `backup_stats.json` - Estadísticas del respaldo

---

## ⚠️ ADVERTENCIA IMPORTANTE

**La restauración SOBRESCRIBIRÁ todos los datos existentes en las tablas.**

Antes de restaurar:
1. ✅ Verifica que tienes un respaldo reciente
2. ✅ Confirma que quieres reemplazar los datos actuales
3. ✅ Considera hacer un respaldo de la base de datos actual primero

---

## 🚀 Método 1: Restauración Completa (RECOMENDADO)

### Usando Supabase Dashboard

**Paso 1:** Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)

**Paso 2:** Navega a **SQL Editor** en el menú lateral

**Paso 3:** Haz clic en **New Query**

**Paso 4:** Abre el archivo `backups/latest/backup_full.sql` y copia TODO su contenido

**Paso 5:** Pega el contenido en el editor SQL

**Paso 6:** Haz clic en **Run** (o presiona `Ctrl+Enter`)

**Paso 7:** Verifica que no haya errores en la salida

**Paso 8:** Verifica los datos restaurados:
```sql
-- Verificar cantidad de registros por tabla
SELECT 'core_companies' as tabla, COUNT(*) as registros FROM core_companies
UNION ALL
SELECT 'core_users', COUNT(*) FROM core_users
UNION ALL
SELECT 'evt_clientes', COUNT(*) FROM evt_clientes
UNION ALL
SELECT 'evt_eventos', COUNT(*) FROM evt_eventos
UNION ALL
SELECT 'evt_ingresos', COUNT(*) FROM evt_ingresos
UNION ALL
SELECT 'evt_gastos', COUNT(*) FROM evt_gastos;
```

---

## 🔧 Método 2: Restauración por Partes

### Caso de uso: Quieres restaurar solo la estructura O solo los datos

#### A. Solo restaurar estructura (sin datos)

1. Abre `backups/latest/backup_schema.sql`
2. Ejecuta en SQL Editor de Supabase
3. Esto creará/actualizará las tablas sin modificar datos existentes

#### B. Solo restaurar datos (sin modificar estructura)

1. Abre `backups/latest/backup_data.sql`
2. **ADVERTENCIA:** Este archivo contiene `DELETE FROM tabla` antes de cada INSERT
3. Ejecuta en SQL Editor de Supabase
4. Los datos actuales se eliminarán y reemplazarán

---

## 💻 Método 3: Usando Script Node.js (PRÓXIMAMENTE)

```bash
# Restaurar respaldo más reciente
node scripts/restore-database.mjs

# Restaurar respaldo específico
node scripts/restore-database.mjs --backup=2025-10-27T18-08-05

# Solo verificar sin restaurar
node scripts/restore-database.mjs --dry-run
```

---

## 🔍 Verificación Post-Restauración

### 1. Verificar cantidad de registros

Compara con `backup_stats.json`:

```sql
SELECT
  'evt_clientes' as tabla,
  COUNT(*) as registros_actuales,
  71 as registros_esperados
FROM evt_clientes
UNION ALL
SELECT 'evt_gastos', COUNT(*), 75 FROM evt_gastos
UNION ALL
SELECT 'evt_ingresos', COUNT(*), 15 FROM evt_ingresos;
```

### 2. Verificar integridad de datos

```sql
-- Verificar que no haya registros huérfanos
SELECT COUNT(*)
FROM evt_ingresos i
LEFT JOIN evt_clientes c ON i.cliente_id = c.id
WHERE c.id IS NULL AND i.cliente_id IS NOT NULL;

-- Debería retornar 0
```

### 3. Verificar secuencias

```sql
-- Las secuencias deben estar sincronizadas con los IDs más altos
SELECT
  'evt_clientes' as tabla,
  MAX(id) as max_id,
  nextval('evt_clientes_id_seq'::regclass) - 1 as secuencia_actual
FROM evt_clientes;
```

---

## 🐛 Solución de Problemas

### Error: "duplicate key value violates unique constraint"

**Causa:** Ya existen registros con los mismos IDs

**Solución:**
```sql
-- Opción 1: Eliminar todos los datos primero
TRUNCATE TABLE evt_gastos CASCADE;
TRUNCATE TABLE evt_ingresos CASCADE;
TRUNCATE TABLE evt_eventos CASCADE;
TRUNCATE TABLE evt_clientes CASCADE;
-- ... continuar con todas las tablas
```

**Solución alternativa:**
```sql
-- Opción 2: Usar el archivo backup_data.sql que incluye DELETE
-- Este archivo elimina automáticamente antes de insertar
```

### Error: "permission denied"

**Causa:** No tienes permisos suficientes

**Solución:**
- Asegúrate de usar el service role key en el script
- O ejecuta desde Supabase Dashboard (que tiene permisos de administrador)

### Error: "relation does not exist"

**Causa:** Las tablas no existen en la base de datos

**Solución:**
1. Primero ejecuta `backup_schema.sql` para crear las tablas
2. Luego ejecuta `backup_data.sql` para insertar los datos

### Error: "syntax error at or near"

**Causa:** Problemas con caracteres especiales en los datos

**Solución:**
- El script de respaldo ya escapa correctamente los valores
- Si persiste, verifica que copiaste TODO el contenido del archivo
- Asegúrate de no haber modificado manualmente el archivo SQL

---

## 📊 Comparación de Métodos

| Método | Velocidad | Dificultad | Recomendado para |
|--------|-----------|------------|------------------|
| Supabase Dashboard | ⚡ Rápido | 🟢 Fácil | Restauraciones ocasionales |
| SQL Editor Manual | ⚡ Rápido | 🟡 Medio | Restauraciones parciales |
| Script Node.js | 🚀 Muy rápido | 🟢 Fácil | Restauraciones frecuentes |

---

## 🔄 Estrategias de Respaldo

### Respaldos Regulares

Recomendamos hacer respaldos:
- ✅ Antes de cualquier migración de base de datos
- ✅ Antes de cambios estructurales importantes
- ✅ Semanalmente como rutina
- ✅ Antes de despliegues a producción

### Retención de Respaldos

Los respaldos se guardan en:
```
backups/
├── latest/          -> symlink al respaldo más reciente
├── 2025-10-27T18-08-05/
├── 2025-10-26T14-30-12/
└── 2025-10-25T09-15-45/
```

**Sugerencia:** Mantén al menos los últimos 5-10 respaldos.

---

## 📝 Notas Importantes

### Secuencias Auto-incrementales

El archivo `backup_data.sql` incluye al final:
```sql
SELECT setval(pg_get_serial_sequence('tabla', 'id'), COALESCE(MAX(id), 1), true)
FROM tabla;
```

Esto asegura que las secuencias de auto-incremento (`id`) estén sincronizadas con los datos restaurados.

### Triggers y Constraints

Durante la restauración, los triggers se deshabilitan temporalmente:
```sql
SET session_replication_role = replica;
-- ... INSERTs ...
SET session_replication_role = DEFAULT;
```

Esto acelera la restauración y evita problemas con triggers complejos.

### Tipos JSONB

Los campos JSONB (como `alertas_enviadas`) se restauran correctamente:
```sql
INSERT INTO evt_ingresos (..., alertas_enviadas, ...)
VALUES (..., '[]'::jsonb, ...);
```

---

## 🆘 Soporte

Si encuentras problemas durante la restauración:

1. Verifica el archivo `backup_stats.json` para confirmar que el respaldo se completó correctamente
2. Revisa los logs de Supabase Dashboard para errores específicos
3. Intenta restaurar tabla por tabla para identificar cuál causa problemas
4. Verifica que las credenciales en `.env` sean correctas

---

## ✅ Checklist de Restauración

Antes de restaurar:
- [ ] Tengo un respaldo reciente de la base de datos actual
- [ ] Confirmé que quiero reemplazar los datos
- [ ] Verifiqué que el archivo de respaldo existe y no está corrupto
- [ ] Revisé las estadísticas en `backup_stats.json`

Durante la restauración:
- [ ] Ejecuté el SQL completo sin interrupciones
- [ ] No hubo errores en la salida

Después de restaurar:
- [ ] Verifiqué la cantidad de registros por tabla
- [ ] Probé consultas básicas
- [ ] Verifiqué que las relaciones entre tablas son correctas
- [ ] Las secuencias están sincronizadas

---

**Última actualización:** 2025-10-27
**Versión del script de respaldo:** 1.0
**Compatible con:** Supabase PostgreSQL
