# 🔍 DEBUG: Error al Guardar Ingresos

**Fecha:** 14 de Octubre, 2025  
**Estado:** 🔍 DEBUGGANDO

---

## ❌ Error Actual

```
POST /evt_ingresos 400 (Bad Request)
Error creating income: Object
```

---

## ✅ Cambios Aplicados para Debug

### 1. Tipo Income Actualizado

**Archivo:** `Finance.ts`

**Cambios:**
- ❌ Removido `cantidad` y `precio_unitario` como campos requeridos
- ✅ Agregados campos CFDI completos:
  - `proveedor`, `rfc_proveedor`
  - `uuid_cfdi`, `folio_fiscal`, `serie`, `folio`
  - `tipo_comprobante`, `forma_pago_sat`, `metodo_pago_sat`
  - `moneda`, `tipo_cambio`, `lugar_expedicion`
  - `uso_cfdi`, `regimen_fiscal_receptor`, `regimen_fiscal_emisor`
  - `detalle_compra`

### 2. Console.log Detallados Agregados

**Archivo:** `financesService.ts` - Función `createIncome()`

```typescript
console.log('📥 [createIncome] Datos recibidos:', incomeData);
// ... filtra campos
console.log('✅ [createIncome] Datos limpios a insertar:', cleanIncomeData);
console.log('📋 [createIncome] Campos filtrados:', { cliente, rfc_cliente, ... });
// ... inserta
console.log('❌ [createIncome] Error de Supabase:', error);  // Si hay error
console.log('✅ [createIncome] Ingreso creado exitosamente:', data);  // Si éxito
```

---

## 🧪 Pasos para Identificar el Problema

### 1. Abre la Consola del Navegador
- F12 → Console

### 2. Intenta Guardar un Ingreso
1. Ve a evento → Ingresos
2. Sube XML + PDF
3. Click "Procesar XML + PDF"
4. Selecciona responsable
5. Click "Guardar"

### 3. Revisa los Logs en Consola

Busca estos mensajes:

```
📥 [createIncome] Datos recibidos: { ... }
✅ [createIncome] Datos limpios a insertar: { ... }
📋 [createIncome] Campos filtrados: { ... }
❌ [createIncome] Error de Supabase: { ... }
```

### 4. Identifica el Campo Problemático

En el error de Supabase, busca:
```javascript
{
  code: 'PGRST204',  // Error de esquema
  message: "Could not find the 'CAMPO_X' column ..."
}
```

El `CAMPO_X` es el que está causando el problema.

---

## 📋 Campos que Deben Filtrarse

Ya estamos filtrando:
- ✅ `cliente`
- ✅ `rfc_cliente`
- ✅ `fecha_gasto`
- ✅ `cantidad`
- ✅ `precio_unitario`

**Si el error menciona otro campo, necesitamos agregarlo a la lista.**

---

## 🎯 Próximos Pasos Según el Error

### Si el error dice: "Could not find column 'X'"

Agregar `X` a la lista de filtros:

```typescript
const {
  cliente,
  rfc_cliente,
  fecha_gasto,
  cantidad,
  precio_unitario,
  X,  // ← Agregar aquí
  ...cleanIncomeData
} = incomeData as any;
```

### Si el error dice algo diferente

Compartir el mensaje de error completo para analizarlo.

---

## 📊 Campos Válidos de evt_ingresos

Según la estructura actual:

### Campos Básicos:
- `concepto`, `descripcion`
- `total`, `subtotal`, `iva`, `iva_porcentaje`
- `proveedor`, `rfc_proveedor`
- `fecha_ingreso`, `fecha_facturacion`, `fecha_cobro`
- `fecha_compromiso_pago`, `dias_credito`

### Campos CFDI:
- `uuid_cfdi`, `folio_fiscal`, `serie`, `folio`
- `tipo_comprobante`, `forma_pago_sat`, `metodo_pago_sat`
- `moneda`, `tipo_cambio`, `lugar_expedicion`
- `uso_cfdi`, `regimen_fiscal_receptor`, `regimen_fiscal_emisor`

### Campos de Estado:
- `facturado`, `cobrado`
- `responsable_id`
- `metodo_cobro`, `referencia`

### Archivos:
- `archivo_adjunto`, `archivo_nombre`, `archivo_tamaño`, `archivo_tipo`
- `documento_pago_url`, `documento_pago_nombre`

### Metadata:
- `evento_id`
- `created_at`, `updated_at`, `created_by`
- `notas`

### JSON:
- `detalle_compra` (JSONB con info de conceptos)

---

## 🚨 Importante

**Después de ver los logs, comparte:**

1. El contenido de `📥 [createIncome] Datos recibidos:`
2. El contenido de `❌ [createIncome] Error de Supabase:`
3. Específicamente el campo mencionado en el error

Con esa información podremos identificar exactamente qué campo falta filtrar.

---

**Estado:** 🔍 Esperando logs de la consola del navegador  
**Servidor:** http://localhost:5173
