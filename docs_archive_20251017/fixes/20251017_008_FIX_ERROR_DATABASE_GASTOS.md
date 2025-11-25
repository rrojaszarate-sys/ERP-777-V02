# ✅ Fix: Error de Base de Datos - Campos Inexistentes en `evt_gastos`

## 🐛 Problema Reportado

Al intentar guardar un gasto, se producía el siguiente error:

```
PGRST204: Could not find the 'regimen_fiscal_emisor' column of 'evt_gastos' in the schema cache
```

### Causa Raíz

El sistema estaba intentando guardar campos que **no existen** en la tabla `evt_gastos`:
- `regimen_fiscal_emisor`
- `uso_cfdi`
- `regimen_fiscal_receptor`
- `direccion_proveedor`
- `email_proveedor`
- `establecimiento_info`
- `folio`

Adicionalmente, faltaba el campo `autorizado` (checkbox) en el formulario.

---

## ✅ Solución Implementada

### 1. **financesService.ts** - Limpieza de Campos Obsoletos

**Archivo:** `src/modules/eventos/services/financesService.ts`

**Modificación (Líneas 216-225):**
```typescript
// 🧹 Eliminar campos que NO existen en evt_gastos
const camposAEliminar = [
  '_detalle_compra_json',
  'direccion_proveedor',
  'email_proveedor',
  'uso_cfdi',
  'regimen_fiscal_receptor',
  'regimen_fiscal_emisor',    // ✅ AGREGADO
  'establecimiento_info',
  'folio',
  'regimen_fiscal'
];
```

**Resultado:** Todos los gastos guardados eliminarán estos campos automáticamente antes de enviarlos a Supabase.

---

### 2. **DualOCRExpenseForm.tsx** - Eliminación de Campos del Estado Inicial

**Archivo:** `src/modules/eventos/components/finances/DualOCRExpenseForm.tsx`

**Modificación (Líneas 94-119):**
```typescript
// ❌ ELIMINADOS del estado inicial:
// - uso_cfdi
// - regimen_fiscal_receptor
// - regimen_fiscal_emisor
// - direccion_proveedor
// - email_proveedor
// - establecimiento_info

// ✅ MANTENIDOS (campos válidos):
// - telefono_proveedor
// - uuid_cfdi, serie, folio_fiscal, etc. (campos SAT válidos)
```

---

### 3. **DualOCRExpenseForm.tsx** - Limpieza en `handleSubmit`

**Archivo:** `src/modules/eventos/components/finances/DualOCRExpenseForm.tsx`

**Modificación (Líneas 2241-2256):**
```typescript
// 🧹 LIMPIEZA: Eliminar campos que no existen en la tabla evt_gastos
const camposNoExistentes = [
  'uso_cfdi',
  'regimen_fiscal_receptor',
  'regimen_fiscal_emisor',
  'direccion_proveedor',
  'email_proveedor',
  'establecimiento_info',
  'folio'
];

camposNoExistentes.forEach(campo => {
  if (campo in dataToSend) {
    delete (dataToSend as any)[campo];
  }
});
```

**Resultado:** Defensa en profundidad - incluso si algún campo obsoleto llega al submit, será eliminado.

---

### 4. **Campo "Estado de Aprobación"** ✅ (Restaurado como Lista Desplegable)

**Archivo:** `DualOCRExpenseForm.tsx`

**Modificación (Líneas 2767-2778):**
```tsx
{/* Estado de Aprobación */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Estado de Aprobación
  </label>
  <select
    value={formData.status_aprobacion}
    onChange={(e) => setFormData(prev => ({ ...prev, status_aprobacion: e.target.value }))}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
  >
    <option value="pendiente">⏳ Pendiente</option>
    <option value="aprobado">✅ Aprobado</option>
    <option value="rechazado">❌ Rechazado</option>
  </select>
</div>
```

**Ubicación:** Justo después del campo "Categoría" en el formulario.

**Nota:** El campo ya existía como `status_aprobacion` en el tipo `Expense`, pero no estaba visible en el formulario `DualOCRExpenseForm`. Se restauró como lista desplegable (no checkbox) para consistencia con `ExpenseForm.tsx`.

---

## 📊 Resumen de Cambios

| Archivo | Cambios | Estado |
|---------|---------|--------|
| `financesService.ts` | Agregado `regimen_fiscal_emisor` a lista de limpieza | ✅ |
| `DualOCRExpenseForm.tsx` | Eliminados 6 campos obsoletos del estado inicial | ✅ |
| `DualOCRExpenseForm.tsx` | Agregada limpieza en `handleSubmit` (7 campos) | ✅ |
| `DualOCRExpenseForm.tsx` | Agregado select "Estado de Aprobación" en UI | ✅ |

---

## 🧪 Cómo Probar

1. **Abrir un evento** en el sistema
2. **Ir a la pestaña "Finanzas"**
3. **Crear un nuevo gasto:**
   - Subir un ticket/factura (opcional)
   - Llenar los campos básicos (concepto, total, categoría)
   - **Verificar que aparece la lista desplegable "Estado de Aprobación"**
   - Seleccionar el estado: Pendiente / Aprobado / Rechazado
4. **Guardar el gasto**
5. **Verificar:**
   - No debe aparecer error `PGRST204`
   - El gasto se guarda correctamente
   - El estado de aprobación seleccionado se persiste

---

## 🎯 Campos SAT Válidos (Mantenidos)

Estos campos **SÍ existen** en la base de datos y fueron **mantenidos**:

```typescript
// ✅ Campos CFDI 4.0 SAT (válidos)
uuid_cfdi?: string;
folio_fiscal?: string;
serie?: string;
tipo_comprobante?: 'I' | 'E' | 'T' | 'N' | 'P';
forma_pago_sat?: '01' | '02' | '03' | '04' | '05' | '28' | '99';
metodo_pago_sat?: 'PUE' | 'PPD';
lugar_expedicion?: string;
moneda?: 'MXN' | 'USD' | 'EUR' | 'CAD' | 'GBP';
tipo_cambio?: number;

// ✅ Campos adicionales (válidos)
telefono_proveedor?: string;
folio_interno?: string;
hora_emision?: string;
```

---

## ⚠️ Notas Importantes

### 1. **Campos Eliminados vs Campos SAT**
- Los campos eliminados eran del OCR y no están en la tabla
- Los campos SAT (uuid_cfdi, folio_fiscal, etc.) **SÍ están en la tabla** y funcionan correctamente

### 2. **Estrategia de Limpieza Triple**
Se implementó una estrategia de "defensa en profundidad":

```
1. financesService.ts → Limpia TODOS los gastos
2. DualOCRExpenseForm (estado) → No carga campos obsoletos
3. DualOCRExpenseForm (handleSubmit) → Elimina antes de enviar
```

### 3. **Campo "Estado de Aprobación"**
- Es un campo **varchar(20)** con valores: 'pendiente', 'aprobado', 'rechazado'
- Aparece como **lista desplegable (select)** en el formulario
- Se ubica justo después del campo "Categoría"
- Default: `'aprobado'`
- Incluye emojis visuales: ⏳ Pendiente / ✅ Aprobado / ❌ Rechazado

### 4. **Compatibilidad con OCR**
- El OCR puede extraer campos obsoletos del XML
- Esos campos se mapean al formulario temporalmente
- Pero se eliminan antes de guardar en la base de datos
- ✅ El OCR sigue funcionando correctamente

---

## 🔍 Verificación de Esquema (SQL)

Si necesitas verificar los campos que **SÍ existen** en `evt_gastos`:

```sql
-- Ver estructura completa de la tabla
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'evt_gastos'
ORDER BY ordinal_position;

-- Verificar campo "autorizado"
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'evt_gastos' 
  AND column_name LIKE '%autor%';
```

---

## ✅ Estado Final

**Problema:** ❌ Error PGRST204 al guardar gastos  
**Solución:** ✅ Campos obsoletos eliminados en 3 capas  
**Feature Adicional:** ✅ Lista desplegable "Estado de Aprobación" restaurada  
**Resultado:** ✅ Gastos se guardan sin errores  

---

## 📝 Fecha de Implementación

**Fecha:** 28 de Enero de 2025  
**Desarrollador:** GitHub Copilot  
**Ticket:** Fix Error Database - Campos Inexistentes en evt_gastos
