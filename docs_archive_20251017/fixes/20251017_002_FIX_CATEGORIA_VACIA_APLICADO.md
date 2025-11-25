# ✅ FIX: Error "invalid input syntax for type integer" - APLICADO

## 📋 Problema Identificado

```
❌ [financesService] Error de Supabase: 
{code: '22P02', message: 'invalid input syntax for type integer: ""'}
```

**Causa raíz:** El formulario enviaba `categoria_id = ""` (cadena vacía) cuando no se seleccionaba categoría, pero PostgreSQL esperaba un número entero o `NULL`.

## 🔧 Solución Aplicada

### 1. **DualOCRExpenseForm.tsx (Línea ~2243)**

Agregado antes de enviar datos:

```typescript
// 🔧 CORRECCIÓN CRÍTICA: Convertir cadenas vacías a null para campos numéricos
// Esto evita el error "invalid input syntax for type integer: ''"
if (!dataToSend.categoria_id || dataToSend.categoria_id.toString().trim() === '') {
  dataToSend.categoria_id = null as any;
  console.log('  🔧 categoria_id vacío convertido a null');
}
```

### 2. **financesService.ts (Línea ~233)**

Agregado validación antes de insertar en BD:

```typescript
// 🔧 CORRECCIÓN CRÍTICA: Convertir cadenas vacías a null para campos numéricos
const camposNumericos = ['categoria_id', 'cantidad', 'precio_unitario', 'subtotal', 'iva', 'total', 'tipo_cambio'];
camposNumericos.forEach(campo => {
  if (dataToInsert[campo] === '' || dataToInsert[campo] === null || dataToInsert[campo] === undefined) {
    if (campo === 'cantidad' || campo === 'precio_unitario' || campo === 'tipo_cambio') {
      // Estos tienen defaults: cantidad=1, precio_unitario=0, tipo_cambio=1
      if (campo === 'cantidad') dataToInsert[campo] = 1;
      else if (campo === 'tipo_cambio') dataToInsert[campo] = 1;
      else dataToInsert[campo] = 0;
    } else {
      // categoria_id y otros pueden ser null
      dataToInsert[campo] = null;
    }
    console.log(`  🔧 Campo ${campo} convertido de "" a ${dataToInsert[campo]}`);
  }
});
```

## ✅ Resultado Esperado

Ahora cuando se sube un XML CFDI sin seleccionar categoría:

**ANTES (❌):**
```javascript
categoria_id: ""  // PostgreSQL: ERROR 22P02
```

**DESPUÉS (✅):**
```javascript
categoria_id: null  // PostgreSQL: OK (permite NULL)
```

## 🧪 Prueba

1. Sube un XML + PDF de factura
2. **NO selecciones categoría** (dejar en "Seleccionar categoría")
3. Click en "Guardar Gasto"
4. ✅ Debe guardarse exitosamente con `categoria_id = NULL`

## 📊 Logs Esperados

```
  🔧 categoria_id vacío convertido a null
  ✅ Validación pasada. Guardando...
  - Categoría ID: null
  📤 [financesService] Datos a insertar en BD:
  🔧 Campo categoria_id convertido de "" a null
  ✅ [financesService] Gasto creado exitosamente
```

## 🛡️ Campos Protegidos

La validación ahora protege estos campos numéricos:

| Campo | Si está vacío | Valor final |
|-------|---------------|-------------|
| `categoria_id` | `""` → `null` | ✅ NULL permitido |
| `cantidad` | `""` → `1` | ✅ Default: 1 |
| `precio_unitario` | `""` → `0` | ✅ Default: 0 |
| `tipo_cambio` | `""` → `1` | ✅ Default: 1.0 |
| `subtotal` | `""` → `null` | ✅ NULL (se calcula) |
| `iva` | `""` → `null` | ✅ NULL (se calcula) |
| `total` | `""` → `null` | ✅ NULL (se calcula) |

## 📝 Notas Técnicas

- **PostgreSQL Error 22P02:** "invalid input syntax for type integer"
- **Causa:** Intentar insertar `""` en columna tipo `INTEGER`
- **Solución:** Convertir `""` → `null` antes de insertar
- **Preventivo:** Doble validación (frontend + service)

## 🚀 Estado

- ✅ Fix aplicado en `DualOCRExpenseForm.tsx`
- ✅ Fix aplicado en `financesService.ts`
- ⏳ Pendiente: Probar con XML real sin categoría
- ⏳ Pendiente: Aplicar mismo fix a `IncomeForm.tsx` si es necesario

---
**Fecha:** 14 de octubre de 2025
**Archivos modificados:**
1. `src/modules/eventos/components/finances/DualOCRExpenseForm.tsx`
2. `src/modules/eventos/services/financesService.ts`
