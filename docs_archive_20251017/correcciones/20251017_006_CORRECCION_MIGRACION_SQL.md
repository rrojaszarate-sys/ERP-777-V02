# 🔧 CORRECCIÓN APLICADA - MIGRACION_INGRESOS_CFDI_COMPLETA.sql

## ❌ Error Original

```
ERROR:  42703: column i.proveedor does not exist
LINE 223:   i.proveedor AS emisor,
```

## ✅ Correcciones Aplicadas

### 1. **Agregadas columnas faltantes de soft delete**

```sql
ALTER TABLE evt_ingresos
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES core_users(id),
  ADD COLUMN IF NOT EXISTS delete_reason TEXT;
```

**Razón**: La tabla `evt_ingresos` original no tenía estas columnas, pero el código TypeScript las usa.

---

### 2. **Vista corregida - evt_ingresos**

**ANTES** (❌ Error):
```sql
i.proveedor AS emisor,      -- ❌ Esta columna NO existe
i.rfc_proveedor AS rfc_emisor,
```

**DESPUÉS** (✅ Correcto):
```sql
NULL AS emisor,             -- ✅ En ingresos no hay emisor externo
NULL AS rfc_emisor,         -- ✅ Solo hay cliente (receptor)
```

**Razón**: En ingresos, el cliente es quien paga (receptor CFDI), no hay proveedor.

---

### 3. **WHERE corregido en la vista**

**ANTES**:
```sql
WHERE i.activo = true   -- Para ingresos
WHERE g.activo = true   -- Para gastos
```

**DESPUÉS**:
```sql
WHERE i.deleted_at IS NULL   -- Para ingresos
WHERE g.deleted_at IS NULL   -- Para gastos
```

**Razón**: Es más confiable usar `deleted_at IS NULL` para filtrar registros no eliminados.

---

### 4. **Columna folio en gastos**

**ANTES**:
```sql
g.folio AS folio,  -- ❌ Esta columna NO existe en evt_gastos
```

**DESPUÉS**:
```sql
g.folio_interno AS folio,  -- ✅ Usar folio_interno (que sí existe)
```

**Razón**: En `evt_gastos` existe `folio_interno` (para tickets), no `folio` (campo CFDI).

---

## 📋 Estructura Final de evt_ingresos

Después de ejecutar la migración, `evt_ingresos` tendrá:

### Campos Básicos (Ya existían)
- id, evento_id, concepto, descripcion
- subtotal, iva, iva_porcentaje, total
- fecha_ingreso, referencia, documento_url
- facturado, cobrado, fecha_facturacion, fecha_cobro, metodo_cobro
- archivo_adjunto, archivo_nombre, archivo_tamaño, archivo_tipo
- notas, created_at, updated_at, created_by

### Campos CFDI (NUEVOS)
- uuid_cfdi, folio_fiscal, serie, folio, tipo_comprobante
- forma_pago_sat, metodo_pago_sat
- moneda, tipo_cambio, lugar_expedicion
- uso_cfdi, regimen_fiscal_receptor, regimen_fiscal_emisor

### Campos Cliente (NUEVOS)
- cliente_id (FK a evt_clientes)
- cliente
- rfc_cliente

### Campos Detalle (NUEVOS)
- detalle_compra (JSONB)

### Campos Documentos (NUEVOS)
- documento_pago_url
- documento_pago_nombre

### Campos Soft Delete (NUEVOS)
- activo
- deleted_at
- deleted_by
- delete_reason

---

## 🚀 Ejecutar Migración Corregida

```bash
# Conectar a Supabase
psql "postgresql://postgres.[PROJECT-REF].supabase.co:5432/postgres" -U postgres

# Ejecutar migración
\i MIGRACION_INGRESOS_CFDI_COMPLETA.sql

# Verificar columnas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns  
WHERE table_name = 'evt_ingresos'
ORDER BY ordinal_position;
```

---

## ✅ Resultado Esperado

Al final deberías ver:

```
✅ Migración completada exitosamente
📊 evt_ingresos ahora tiene los mismos campos CFDI que evt_gastos
🔗 Se creó vista vw_movimientos_financieros para consultas unificadas

⚠️  IMPORTANTE:
   1. El campo "cliente" es OBLIGATORIO para ingresos
   2. Actualizar código TypeScript para remover filtros innecesarios
   3. Probar formulario de ingresos con XML CFDI
```

---

## 🎯 Siguiente Paso

Después de ejecutar la migración exitosamente, continúa con:

**INSTRUCCIONES_FINALES_INGRESOS.md** → Paso 2: Agregar selector de cliente

---

**Última actualización**: 15 de octubre 2025
**Estado**: Script SQL corregido y listo para ejecutar ✅
