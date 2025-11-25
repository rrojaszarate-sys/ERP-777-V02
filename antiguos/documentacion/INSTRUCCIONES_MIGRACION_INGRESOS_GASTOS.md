# 🚀 INSTRUCCIONES PARA APLICAR MIGRACIÓN DE INGRESOS Y GASTOS

## ⚠️ IMPORTANTE: Verificación Pre-Migración

**ANTES DE APLICAR LA MIGRACIÓN**, ejecuta el script de verificación para ver qué campos ya existen en tu base de datos:

1. Ve a [Supabase Dashboard](https://app.supabase.com) > SQL Editor
2. Abre el archivo `VERIFICAR_CAMPOS_ANTES_MIGRACION.sql`
3. Copia TODO el contenido y ejecútalo
4. Revisa la salida para ver qué campos ya existen

Esto es crucial porque algunos campos pueden ya existir de migraciones anteriores.

---

## Sobre Esta Migración

Esta migración implementa mejoras importantes a los módulos de Ingresos y Gastos:

- **Estados de Ingresos**: Flujo de trabajo con 4 estados (PLANEADO → ORDEN_COMPRA → FACTURADO → PAGADO)
- **Cuentas Contables**: Sistema de clasificación contable para gastos
- **Control de Facturación**: Fechas límite y alertas para facturación pendiente
- **Control de Pagos**: Seguimiento de pagos realizados y comprobantes
- **Vistas Analíticas**: Vistas para ingresos pendientes de facturar, gastos pendientes de pago y gastos sin comprobar

## Aplicar la Migración

### Opción 1: Usando Supabase Dashboard (RECOMENDADO)

#### Paso 1: Acceder al SQL Editor
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New Query"**

#### Paso 2: Copiar y Pegar el SQL
1. Abre el archivo: `supabase_old/migrations/20251024_ingresos_gastos_improvements.sql`
2. Copia TODO el contenido del archivo
3. Pégalo en el editor SQL de Supabase

#### Paso 3: Ejecutar la Migración
1. Haz clic en el botón **"Run"** (o presiona Cmd/Ctrl + Enter)
2. Espera a que se complete la ejecución
3. Verifica que aparezca el mensaje de éxito

### Opción 2: Usando psql (Línea de Comandos)

```bash
# Obtén la cadena de conexión desde Supabase Dashboard > Project Settings > Database
psql "postgresql://[TU_CADENA_DE_CONEXION]" -f supabase_old/migrations/20251024_ingresos_gastos_improvements.sql
```

## ✅ Verificación Post-Migración

Después de aplicar la migración, ejecuta estas consultas para verificar:

### 1. Verificar Nuevas Tablas

```sql
-- Verificar estados de ingreso
SELECT * FROM evt_estados_ingreso ORDER BY orden;

-- Verificar cuentas contables
SELECT * FROM evt_cuentas_contables ORDER BY codigo;
```

### 2. Verificar Nuevas Columnas en Ingresos

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
  AND column_name IN (
    'estado_id',
    'dias_facturacion',
    'fecha_limite_facturacion',
    'orden_compra_url',
    'orden_compra_nombre',
    'alertas_enviadas'
  );
```

### 3. Verificar Nuevas Columnas en Gastos

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'evt_gastos'
  AND column_name IN (
    'cuenta_id',
    'comprobante_pago_url',
    'comprobante_pago_nombre',
    'fecha_pago',
    'responsable_pago_id',
    'pagado',
    'comprobado'
  );
```

### 4. Verificar Vistas

```sql
-- Vista de ingresos pendientes de facturar
SELECT COUNT(*) as total_pendientes_facturar
FROM vw_ingresos_pendientes_facturar;

-- Vista de gastos pendientes de pago
SELECT COUNT(*) as total_pendientes_pago
FROM vw_gastos_pendientes_pago;

-- Vista de gastos pendientes de comprobar
SELECT COUNT(*) as total_pendientes_comprobar
FROM vw_gastos_pendientes_comprobar;
```

### 5. Verificar Índices

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('evt_ingresos', 'evt_gastos')
  AND indexname LIKE '%estado%' OR indexname LIKE '%cuenta%' OR indexname LIKE '%pagado%';
```

## 📊 Datos de Ejemplo

La migración inserta datos iniciales:

### Estados de Ingreso
- PLANEADO (azul)
- ORDEN_COMPRA (índigo)
- FACTURADO (amarillo)
- PAGADO (verde)

### Cuentas Contables
- 1001 - Caja (activo)
- 1002 - Bancos (activo)
- 2001 - Proveedores (pasivo)
- 4001 - Ventas (ingreso)
- 5001 - Compras (gasto)
- 5002 - Gastos de Operación (gasto)
- 5003 - Gastos de Administración (gasto)
- 5004 - Gastos de Venta (gasto)

## 🔄 Actualización de Datos Existentes

La migración actualiza automáticamente los registros existentes:

1. **Ingresos**:
   - Asigna estado basado en campos `cobrado` y `facturado`
   - Calcula `fecha_limite_facturacion` si existe `fecha_cobro`

2. **Gastos**:
   - Marca todos como `autorizado = true`
   - Marca como `comprobado = true` los que tienen archivo adjunto

## 🔍 Troubleshooting

### Error: "relation evt_estados_ingreso already exists"
**Solución**: La tabla ya existe. Esto es normal si re-ejecutas la migración. Continúa con el resto.

### Error: "column already exists"
**Solución**: El script usa `ADD COLUMN IF NOT EXISTS`, así que esto es seguro.

### Error: "permission denied"
**Solución**: Ejecuta como usuario con permisos de admin/superuser.

### Faltan datos en las vistas
**Solución**: Verifica que tengas ingresos/gastos con `activo = true`.

## 📝 Rollback (Si es necesario)

Si necesitas revertir los cambios:

```sql
-- ADVERTENCIA: Esto eliminará todos los datos nuevos

-- Eliminar vistas
DROP VIEW IF EXISTS vw_ingresos_pendientes_facturar;
DROP VIEW IF EXISTS vw_gastos_pendientes_pago;
DROP VIEW IF EXISTS vw_gastos_pendientes_comprobar;

-- Eliminar columnas de ingresos
ALTER TABLE evt_ingresos
DROP COLUMN IF EXISTS estado_id,
DROP COLUMN IF EXISTS dias_facturacion,
DROP COLUMN IF EXISTS fecha_limite_facturacion,
DROP COLUMN IF EXISTS orden_compra_url,
DROP COLUMN IF EXISTS orden_compra_nombre,
DROP COLUMN IF EXISTS alertas_enviadas;

-- Eliminar columnas de gastos
ALTER TABLE evt_gastos
DROP COLUMN IF EXISTS cuenta_id,
DROP COLUMN IF EXISTS comprobante_pago_url,
DROP COLUMN IF EXISTS comprobante_pago_nombre,
DROP COLUMN IF EXISTS fecha_pago,
DROP COLUMN IF EXISTS responsable_pago_id,
DROP COLUMN IF EXISTS pagado,
DROP COLUMN IF EXISTS comprobado;

-- Eliminar tablas
DROP TABLE IF EXISTS evt_cuentas_contables;
DROP TABLE IF EXISTS evt_estados_ingreso;
```

## ✨ Siguiente Paso

Una vez aplicada exitosamente la migración, continúa con:

1. ✅ Migración de base de datos (ESTE PASO)
2. ⏭️ Actualizar tipos TypeScript (Finance.ts)
3. ⏭️ Crear servicios y hooks
4. ⏭️ Modificar IncomeForm y ExpenseForm
5. ⏭️ Crear vistas de listados
6. ⏭️ Crear módulo de administración de cuentas

---

**Fecha de Creación**: 2025-10-24
**Archivo SQL**: `supabase_old/migrations/20251024_ingresos_gastos_improvements.sql`
**Versión**: 1.0
