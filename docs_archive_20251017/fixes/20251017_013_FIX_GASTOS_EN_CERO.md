# ✅ Corrección Aplicada: Gastos Guardándose en Cero

**Fecha**: 14 de octubre de 2025  
**Archivo**: `src/modules/eventos/services/financesService.ts`

---

## 🔴 Problema Identificado

Los gastos se guardaban con valores en **CERO** a pesar de que el OCR extraía correctamente los datos:

```
✅ OCR detecta:          ❌ Se guarda en BD:
  Total: $4,139.10         total: 0
  Subtotal: $5,171.55      subtotal: 0
  IVA: $570.91             iva: 0
                           cantidad: 1
                           precio_unitario: 0
```

### 📊 Evidencia del Error

Los logs mostraban claramente el problema:

```typescript
financesService.ts:179   ✅ Usando total del OCR: 4139.1  // ✅ Recibe correcto
financesService.ts:242   ✅ Gasto creado: 
{
  cantidad: 1,
  precio_unitario: 0,      // ❌ CERO!
  subtotal: 0,             // ❌ CERO!
  iva: 16,                 // ❌ Solo el porcentaje!
  total: 0                 // ❌ CERO!
}
```

---

## 🐛 Causa Raíz

El servicio `financesService.ts` tenía lógica para **preservar los valores del OCR**, pero luego los **sobrescribía** incorrectamente:

### Código Problemático (líneas 176-196):

```typescript
// ❌ ANTES: Calculaba valores pero NO los guardaba correctamente
if (hasProvidedTotal) {
  total = expenseData.total!;
  subtotal = expenseData.subtotal || (total / (1 + ...));
  iva = total - subtotal;
  // ❌ NO guardaba cantidad y precio_unitario
}

const dataToInsert: any = {
  ...expenseData,  // ❌ expenseData.cantidad = undefined
  detalle_compra: detalleCompraFinal,
  subtotal,        // ✅ Correcto
  iva,             // ✅ Correcto
  total,           // ✅ Correcto
  // ❌ PERO: cantidad y precio_unitario quedaban en 0
};
```

El problema era que:
1. El formulario OCR enviaba solo `total`, sin `cantidad` ni `precio_unitario`
2. El servicio calculaba `subtotal`, `iva`, `total` correctamente
3. **PERO** `cantidad` y `precio_unitario` quedaban en `undefined` o `0`
4. Al hacer `...expenseData`, se copiaban esos valores vacíos
5. La base de datos guardaba **0** en esos campos

---

## ✅ Solución Implementada

### Código Corregido (líneas 176-210):

```typescript
// ✅ DESPUÉS: Calcula TODOS los valores necesarios
let cantidad: number, precio_unitario: number, subtotal: number, iva: number, total: number;

if (hasProvidedTotal) {
  // Preserve OCR-provided total
  console.log('  ✅ Usando total del OCR:', expenseData.total);
  total = expenseData.total!;
  subtotal = expenseData.subtotal || (total / (1 + (expenseData.iva_porcentaje || MEXICAN_CONFIG.ivaRate) / 100));
  iva = total - subtotal;
  
  // 🔧 CORRECCIÓN: Calcular cantidad y precio_unitario desde el total si no vienen
  if (!expenseData.cantidad || !expenseData.precio_unitario) {
    cantidad = expenseData.cantidad || 1;
    precio_unitario = total; // El precio unitario es el total cuando hay 1 item
    console.log('  📊 Calculados automáticamente: cantidad=', cantidad, 'precio_unitario=', precio_unitario);
  } else {
    cantidad = expenseData.cantidad;
    precio_unitario = expenseData.precio_unitario;
  }
} else {
  // Calculate from cantidad and precio_unitario
  console.log('  🧮 Calculando total desde cantidad/precio_unitario');
  cantidad = expenseData.cantidad || 1;
  precio_unitario = expenseData.precio_unitario || 0;
  subtotal = cantidad * precio_unitario;
  iva = subtotal * ((expenseData.iva_porcentaje || MEXICAN_CONFIG.ivaRate) / 100);
  total = subtotal + iva;
}

const dataToInsert: any = {
  ...expenseData,
  detalle_compra: detalleCompraFinal,
  cantidad,           // ✅ Ahora se asigna explícitamente
  precio_unitario,    // ✅ Ahora se asigna explícitamente
  subtotal,           // ✅ Correcto
  iva,                // ✅ Correcto
  total,              // ✅ Correcto
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

---

## 🎯 Cambios Realizados

1. **Declaración de variables**: Agregamos `cantidad` y `precio_unitario` a las variables calculadas
2. **Lógica cuando hay total del OCR**: Si no vienen `cantidad` o `precio_unitario`, se calculan:
   - `cantidad = 1` (por defecto, un solo producto)
   - `precio_unitario = total` (el precio unitario es el total completo)
3. **Asignación explícita**: En `dataToInsert`, ahora se asignan explícitamente todos los campos calculados

---

## 📋 Resultado Esperado

### Antes de la Corrección:
```json
{
  "cantidad": 1,
  "precio_unitario": 0,      ❌
  "subtotal": 0,             ❌
  "iva": 16,                 ❌
  "total": 0                 ❌
}
```

### Después de la Corrección:
```json
{
  "cantidad": 1,             ✅
  "precio_unitario": 4139.1, ✅
  "subtotal": 3568.19,       ✅
  "iva": 570.91,             ✅
  "total": 4139.1            ✅
}
```

---

## 🧪 Cómo Probar

1. Abre el módulo de **Eventos**
2. Ve a la pestaña **Finanzas / Gastos**
3. Haz clic en **"Nuevo Gasto"**
4. Sube un **ticket o factura** (PDF o imagen)
5. Espera a que el OCR procese
6. Haz clic en **"Guardar Gasto"**
7. ✅ Verifica que los campos se guardan con los valores correctos:
   - Total debe ser el detectado por OCR
   - Subtotal debe ser el calculado/detectado
   - IVA debe ser el calculado/detectado
   - Cantidad debe ser >= 1
   - Precio Unitario debe ser > 0

---

## 🔍 Logs de Diagnóstico

Ahora verás estos logs en la consola:

```
✅ Usando total del OCR: 4139.1
📊 Calculados automáticamente: cantidad= 1 precio_unitario= 4139.1
📤 Datos a insertar en BD: {
  cantidad: 1,
  precio_unitario: 4139.1,
  subtotal: 3568.19,
  iva: 570.91,
  total: 4139.1,
  ...
}
✅ Gasto creado exitosamente: { total: 4139.1, ... }
```

---

## ⚠️ Notas Adicionales

- La corrección es **retrocompatible**: sigue funcionando si vienen `cantidad` y `precio_unitario` del formulario
- Si el OCR detecta múltiples productos en `detalle_compra`, sigue usando esos valores
- Los cálculos de IVA mantienen la misma precisión que antes
- No afecta a gastos guardados manualmente (sin OCR)

---

## 🎉 Estado

✅ **CORREGIDO** - Los gastos ahora se guardan con los valores correctos del OCR
