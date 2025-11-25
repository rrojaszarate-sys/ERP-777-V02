# ✅ Errores Corregidos en la Migración SQL

## Fecha: 2025-10-24

---

## Error 1: Campo `autorizado` no existe ❌

**Error Original:**
```
ERROR: 42703: column "autorizado" does not exist
LINE 80: UPDATE evt_gastos SET autorizado = true WHERE autorizado IS NULL...
```

**Causa:**
La tabla `evt_gastos` NO tiene el campo `autorizado`. Este campo nunca fue agregado en las migraciones anteriores.

**Solución Aplicada:**
- ✅ **Eliminadas** líneas 93-96 que hacían UPDATE del campo inexistente
- ✅ **Eliminada** condición `g.autorizado = true` de la vista `vw_gastos_pendientes_pago`

**Archivos Modificados:**
- [20251024_ingresos_gastos_improvements.sql](supabase_old/migrations/20251024_ingresos_gastos_improvements.sql)

---

## Error 2: Tabla `evt_proveedores` no existe ❌

**Error Original:**
Las vistas hacían JOIN con `evt_proveedores` que no existe en el esquema.

**Causa:**
El sistema almacena el proveedor como campo TEXT (`proveedor`) en lugar de tener una tabla normalizada de proveedores.

**Solución Aplicada:**
- ✅ **Cambiado** `p.nombre as proveedor_nombre` → `g.proveedor as proveedor_nombre`
- ✅ **Eliminado** `LEFT JOIN evt_proveedores p ON g.proveedor_id = p.id`
- ✅ Aplicado en ambas vistas:
  - `vw_gastos_pendientes_pago`
  - `vw_gastos_pendientes_comprobar`

---

## Error 3: Función EXTRACT con tipos incompatibles ❌

**Error Original:**
```
ERROR: 42883: function pg_catalog.extract(unknown, integer) does not exist
LINE 140: EXTRACT(DAY FROM (CURRENT_DATE - g.created_at::date)) as dias_pendiente
HINT: No function matches the given name and argument types. You might need to add explicit type casts.
```

**Causa:**
PostgreSQL no puede usar `EXTRACT(DAY FROM ...)` cuando se resta un `DATE` de un `TIMESTAMPTZ`. La resta de `CURRENT_DATE - created_at::date` ya devuelve un entero (número de días).

**Solución Aplicada:**

**ANTES:**
```sql
EXTRACT(DAY FROM (CURRENT_DATE - g.created_at::date)) as dias_pendiente
```

**DESPUÉS:**
```sql
(CURRENT_DATE - g.created_at::date) as dias_pendiente
```

- ✅ La resta directa `CURRENT_DATE - created_at::date` devuelve automáticamente un INTEGER con los días de diferencia
- ✅ No es necesario usar `EXTRACT()` ni casting adicional
- ✅ Aplicado en:
  - `vw_gastos_pendientes_pago` (línea 140)
  - `vw_gastos_pendientes_comprobar` (línea 158)

---

## Otros Ajustes Realizados ✅

### 1. Campos Agregados a `evt_ingresos`
Se agregaron campos que pueden no existir (usando `IF NOT EXISTS`):
- `cliente_id` - Referencia al cliente
- `responsable_id` - Usuario responsable del seguimiento
- `fecha_compromiso_pago` - Fecha de compromiso de pago

### 2. ON CONFLICT en INSERT
- ✅ Agregado `ON CONFLICT (nombre) DO NOTHING` en INSERT de `evt_estados_ingreso`
- ✅ Agregado `ON CONFLICT (codigo) DO NOTHING` en INSERT de `evt_cuentas_contables`
- Esto permite ejecutar la migración múltiples veces sin errores

### 3. Función `update_updated_at_column()`
- ✅ Se crea con `CREATE OR REPLACE FUNCTION` para evitar errores si ya existe
- ✅ Se usa en trigger para tabla `evt_cuentas_contables`

---

## Estado Final de la Migración ✅

La migración ahora está **lista para ejecutar** sin errores. Incluye:

### Tablas Nuevas:
1. `evt_estados_ingreso` (4 estados: PLANEADO, ORDEN_COMPRA, FACTURADO, PAGADO)
2. `evt_cuentas_contables` (8 cuentas precargadas)

### Campos Nuevos en `evt_ingresos`:
- `cliente_id`, `responsable_id`, `estado_id`
- `dias_facturacion`, `fecha_limite_facturacion`, `fecha_compromiso_pago`
- `orden_compra_url`, `orden_compra_nombre`
- `alertas_enviadas`

### Campos Nuevos en `evt_gastos`:
- `cuenta_id` (FK a cuentas contables)
- `comprobante_pago_url`, `comprobante_pago_nombre`
- `fecha_pago`, `responsable_pago_id`
- `pagado`, `comprobado`

### Vistas Nuevas:
1. `vw_ingresos_pendientes_facturar` - Ingresos en estado PLANEADO u ORDEN_COMPRA
2. `vw_gastos_pendientes_pago` - Gastos no pagados
3. `vw_gastos_pendientes_comprobar` - Gastos sin archivo adjunto

### Índices:
- 6 índices nuevos para optimización de consultas

---

## Cómo Aplicar la Migración

### Opción 1: Supabase Dashboard (RECOMENDADO)

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Haz clic en **New Query**
5. Copia TODO el contenido de `20251024_ingresos_gastos_improvements.sql`
6. Pégalo y haz clic en **Run**

### Opción 2: Verificar Primero

Si quieres ver qué campos ya existen antes de aplicar:

1. Ejecuta primero `VERIFICAR_CAMPOS_ANTES_MIGRACION.sql`
2. Revisa la salida
3. Luego ejecuta la migración completa

---

## Verificación Post-Migración

Después de aplicar, ejecuta estos queries para verificar:

```sql
-- Verificar nuevas tablas
SELECT * FROM evt_estados_ingreso;
SELECT * FROM evt_cuentas_contables;

-- Verificar nuevos campos en ingresos
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
  AND column_name IN ('estado_id', 'dias_facturacion', 'orden_compra_url');

-- Verificar nuevos campos en gastos
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'evt_gastos'
  AND column_name IN ('cuenta_id', 'pagado', 'comprobado');

-- Verificar vistas
SELECT COUNT(*) FROM vw_ingresos_pendientes_facturar;
SELECT COUNT(*) FROM vw_gastos_pendientes_pago;
SELECT COUNT(*) FROM vw_gastos_pendientes_comprobar;
```

---

## Resumen de Correcciones

| Error | Tipo | Estado | Líneas Afectadas |
|-------|------|--------|------------------|
| Campo `autorizado` inexistente | SQL | ✅ Corregido | 93-96, 149 |
| Tabla `evt_proveedores` inexistente | SQL | ✅ Corregido | 133, 138, 145, 155, 160, 165 |
| EXTRACT con tipos incompatibles | SQL | ✅ Corregido | 140, 158 |

**Total de correcciones**: 3 errores críticos resueltos

---

**Última Actualización**: 2025-10-24 16:00
**Estado**: ✅ Migración lista para aplicar
**Archivo**: `supabase_old/migrations/20251024_ingresos_gastos_improvements.sql`
