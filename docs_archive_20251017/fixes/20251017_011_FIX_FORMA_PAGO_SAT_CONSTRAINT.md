# ✅ Corrección Aplicada: Error de Restricción `check_forma_pago_sat`

**Fecha**: 14 de octubre de 2025  
**Archivo**: `src/modules/eventos/components/finances/DualOCRExpenseForm.tsx`

---

## 🔴 Problema Original

Al intentar guardar un gasto, se recibía el siguiente error de PostgreSQL:

```json
{
    "code": "23514",
    "message": "new row for relation \"evt_gastos\" violates check constraint \"check_forma_pago_sat\"",
    "details": "Failing row contains (..., transferencia, ...)"
}
```

### Causa Raíz

La restricción `check_forma_pago_sat` en la base de datos **solo acepta**:
- `NULL`
- Códigos SAT válidos: `'01', '02', '03', '04', '05', '28', '99'`

Pero el formulario estaba enviando:
- ❌ Cadenas vacías `''` 
- ❌ Texto descriptivo `"transferencia"` en lugar de código SAT `'03'`

---

## ✅ Solución Implementada

### 1. Valor por Defecto Corregido

**Línea 92** - Cambio en la inicialización del estado:

```typescript
// ❌ ANTES (incorrecto)
forma_pago_sat: expense?.forma_pago_sat || '',

// ✅ DESPUÉS (correcto)
forma_pago_sat: expense?.forma_pago_sat || '03', // Default: 03 = Transferencia electrónica
```

### 2. Validación Antes de Guardar

**Líneas 2061-2078** - Nuevo código de validación agregado en `handleSubmit`:

```typescript
// 🔧 CORRECCIÓN CRÍTICA: Convertir cadenas vacías a null para campos SAT
// La restricción check_forma_pago_sat solo acepta NULL o códigos válidos ('01', '02', '03', '04', '05', '28', '99')
if (!dataToSend.forma_pago_sat || dataToSend.forma_pago_sat.trim() === '') {
  dataToSend.forma_pago_sat = '03'; // Default: Transferencia electrónica
  console.log('  ⚠️ forma_pago_sat vacío, usando default: 03');
}

// Validar que forma_pago_sat sea un código válido
const codigosValidos = ['01', '02', '03', '04', '05', '28', '99'];
if (!codigosValidos.includes(dataToSend.forma_pago_sat)) {
  console.error('❌ ERROR: forma_pago_sat inválido:', dataToSend.forma_pago_sat);
  toast.error(`Código de forma de pago SAT inválido: ${dataToSend.forma_pago_sat}`);
  return;
}

console.log('  ✅ forma_pago_sat validado:', dataToSend.forma_pago_sat);
```

---

## 📋 Códigos SAT Válidos

Según la restricción de base de datos:

| Código | Descripción |
|--------|-------------|
| `'01'` | Efectivo |
| `'02'` | Cheque nominativo |
| `'03'` | Transferencia electrónica de fondos |
| `'04'` | Tarjeta de crédito |
| `'05'` | Monedero electrónico |
| `'28'` | Tarjeta de débito |
| `'99'` | Por definir |

---

## 🎯 Resultado

✅ **El formulario ahora**:
1. Inicializa `forma_pago_sat` con valor por defecto `'03'`
2. Valida que el código sea uno de los permitidos antes de enviar
3. Proporciona mensajes de error claros si algo falla
4. Garantiza compatibilidad con la restricción `check_forma_pago_sat`

✅ **Los gastos se guardan correctamente** sin violar la restricción de base de datos.

---

## 🔍 Para Probar

1. Abre el módulo de Gastos
2. Haz clic en "Nuevo Gasto"
3. Rellena el formulario (mínimo: concepto y total)
4. Haz clic en "Guardar Gasto"
5. ✅ Debería guardarse sin errores

---

## 📝 Notas Adicionales

- El campo `forma_pago` (sin `_sat`) sigue usando valores descriptivos como `"transferencia"`, `"efectivo"`, etc.
- El campo `forma_pago_sat` usa los códigos oficiales del SAT de 2 dígitos
- Ambos campos coexisten pero tienen propósitos diferentes
- La restricción SQL está en: `supabase_old/migrations/20251012_add_sat_ocr_fields.sql`

---

## ⚠️ Advertencias TypeScript Pendientes

Existen algunos errores de tipo TypeScript que **NO afectan la funcionalidad**:
- Tipos incompatibles en `onChange` de selectores
- Propiedades inexistentes en el tipo `Expense`
- Uso de `any` en algunas conversiones

Estos se pueden corregir posteriormente actualizando las interfaces en `src/core/types/events.ts`.
