# Fix Completo: Cálculos de Gastos 

## 📋 Resumen del Problema

**Problema reportado por el usuario:**
> "erregla el modulo de gastos que m, los calculos los hace mal capta el total, y debe calcular el subtotal y el iva, cuando subo un costo lo guarda mal"

**Causa raíz identificada:**
El sistema tenía **DOS problemas simultáneos**:

1. **Frontend (DualOCRExpenseForm.tsx)**: Los valores calculados `subtotal` e `iva` (líneas 140-144) NO se incluían en el objeto `dataToSend` al guardar.
2. **Backend (Trigger SQL)**: La función `calculate_expense_totals()` calculaba INCORRECTAMENTE asumiendo que se proporcionaba el subtotal primero.

---

## 🔧 Solución Aplicada

### ✅ 1. Fix en Frontend (DualOCRExpenseForm.tsx)

**Archivo:** `src/modules/eventos/components/finances/DualOCRExpenseForm.tsx`

**Cambio realizado (líneas 2232-2262):**

**ANTES:**
```typescript
// Preparar datos para envío
const dataToSend = { ...formData };
```

**DESPUÉS:**
```typescript
// 🧮 CALCULAR subtotal e IVA desde el total
const total = formData.total;
const iva_factor = 1 + (formData.iva_porcentaje / 100);
const subtotalCalculado = total / iva_factor;
const ivaCalculado = total - subtotalCalculado;

console.log('  💰 Cálculos financieros:');
console.log('    - Total ingresado:', total.toFixed(2));
console.log('    - IVA %:', formData.iva_porcentaje);
console.log('    - Factor IVA:', iva_factor);
console.log('    - Subtotal calculado:', subtotalCalculado.toFixed(2));
console.log('    - IVA calculado:', ivaCalculado.toFixed(2));

// Preparar datos para envío CON los valores calculados
const dataToSend = { 
  ...formData,
  subtotal: subtotalCalculado,  // ✅ Usar valor calculado
  iva: ivaCalculado             // ✅ Usar valor calculado
};
```

**Explicación:**
- Ahora se calculan explícitamente `subtotal` e `iva` ANTES de enviar al backend
- Estos valores se incluyen en el objeto `dataToSend`
- Se agregan logs detallados para debugging

---

### ✅ 2. Fix en Backend (Trigger SQL)

**Archivo creado:** `FIX_CALCULOS_GASTOS.sql`

**Problema en el trigger original:**
```sql
-- ❌ INCORRECTO: Asumía que subtotal venía primero
NEW.subtotal = COALESCE(NEW.cantidad, 1) * COALESCE(NEW.precio_unitario, 0);
NEW.iva = NEW.subtotal * (COALESCE(NEW.iva_porcentaje, 16) / 100);
NEW.total = NEW.subtotal + NEW.iva;
```

**Solución implementada:**
```sql
-- ✅ CORRECTO: Calcula desde el total (como el usuario ingresa)
IF NEW.total IS NOT NULL AND NEW.total > 0 THEN
    iva_factor := 1 + (COALESCE(NEW.iva_porcentaje, 16) / 100);
    NEW.subtotal := NEW.total / iva_factor;
    NEW.iva := NEW.total - NEW.subtotal;
END IF;
```

---

## 📊 Ejemplo de Funcionamiento

### Caso de prueba: Gasto de $1,160 con IVA 16%

**Usuario ingresa:**
- Total: `$1,160.00`
- IVA %: `16`

**Sistema calcula automáticamente:**
1. Factor IVA: `1 + (16/100) = 1.16`
2. Subtotal: `$1,160 / 1.16 = $1,000.00`
3. IVA: `$1,160 - $1,000 = $160.00`

**Resultado en base de datos:**
```
total:         $1,160.00
subtotal:      $1,000.00
iva:           $  160.00
iva_porcentaje:     16
```

---

## 🚀 Pasos para Aplicar el Fix Completo

### Paso 1: Fix de Frontend (✅ YA APLICADO)
El cambio en `DualOCRExpenseForm.tsx` ya está aplicado en el código.

### Paso 2: Fix de Base de Datos (⏳ PENDIENTE - REQUIERE EJECUTAR SQL)

**Ejecutar en Supabase:**

1. Ir a: **Supabase Dashboard → SQL Editor**
2. Abrir el archivo: `FIX_CALCULOS_GASTOS.sql`
3. Copiar TODO el contenido del archivo
4. Pegar en el SQL Editor
5. Ejecutar el script completo

**El script hace:**
- ✅ Elimina trigger antiguo (incorrecto)
- ✅ Reemplaza función `calculate_expense_totals()` con lógica correcta
- ✅ Recrea el trigger con la función corregida
- 📊 Incluye queries de verificación

### Paso 3: Verificación

**Después de ejecutar el SQL, probar:**

```sql
-- 1. Verificar que el trigger existe
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'evt_gastos';

-- 2. Probar INSERT de prueba
INSERT INTO evt_gastos (
    evento_id,
    concepto,
    total,
    iva_porcentaje,
    proveedor,
    fecha_gasto,
    forma_pago
) VALUES (
    1, -- Cambiar por evento_id válido
    'PRUEBA - Cálculo automático',
    1160.00,
    16,
    'Proveedor Test',
    CURRENT_DATE,
    'efectivo'
)
RETURNING id, concepto, total, subtotal, iva;

-- Resultado esperado:
-- total: 1160.00 | subtotal: 1000.00 | iva: 160.00
```

### Paso 4: Prueba en Aplicación

1. Abrir un evento en el sistema
2. Ir a la pestaña "Gastos"
3. Crear un nuevo gasto:
   - Concepto: "Prueba cálculo"
   - Total: `1160`
   - Proveedor: "Test"
4. Guardar
5. **Verificar en la tabla que muestra:**
   - Subtotal: `$1,000.00`
   - IVA: `$160.00`
   - Total: `$1,160.00`

---

## 🔍 Diagnóstico de Problemas

### Si los cálculos siguen mal después del fix:

**1. Verificar que el trigger está aplicado:**
```sql
SELECT trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'evt_gastos'
AND trigger_name LIKE '%expense%';
```

**2. Verificar la función del trigger:**
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'calculate_expense_totals';
```
Debería contener: `NEW.total / iva_factor` (NO `NEW.subtotal * iva_porcentaje`)

**3. Ver logs en consola del navegador:**
Buscar: `"💰 Cálculos financieros:"` - debe mostrar los valores calculados

**4. Revisar datos enviados al backend:**
En DevTools → Network → buscar petición `POST` al guardar gasto
Payload debe contener:
```json
{
  "total": 1160,
  "subtotal": 1000,
  "iva": 160,
  "iva_porcentaje": 16
}
```

---

## 📝 Notas Técnicas

### Fórmulas Matemáticas

**Del total al subtotal e IVA:**
```
factor = 1 + (iva% / 100)
subtotal = total / factor
iva = total - subtotal

Ejemplo con IVA 16%:
factor = 1 + (16/100) = 1.16
subtotal = 1160 / 1.16 = 1000
iva = 1160 - 1000 = 160
```

**Del subtotal al IVA y total:**
```
iva = subtotal * (iva% / 100)
total = subtotal + iva

Ejemplo con IVA 16%:
iva = 1000 * (16/100) = 160
total = 1000 + 160 = 1160
```

### Archivos Modificados

1. **Frontend:**
   - `src/modules/eventos/components/finances/DualOCRExpenseForm.tsx` (líneas 2232-2262)
   
2. **Base de datos:**
   - Función: `calculate_expense_totals()`
   - Trigger: `calculate_expense_totals_trigger` en tabla `evt_gastos`

---

## ✅ Checklist de Implementación

- [x] Fix aplicado en DualOCRExpenseForm.tsx
- [x] Script SQL creado (FIX_CALCULOS_GASTOS.sql)
- [ ] **PENDIENTE**: Ejecutar script SQL en Supabase
- [ ] **PENDIENTE**: Verificar trigger en base de datos
- [ ] **PENDIENTE**: Probar creación de gasto en aplicación
- [ ] **PENDIENTE**: Validar cálculos son correctos

---

## 🎯 Resultado Final Esperado

**Usuario ingresa solo el TOTAL:**
```
Total: $1,160
```

**Sistema muestra automáticamente:**
```
Subtotal: $1,000.00
IVA (16%): $160.00
Total:    $1,160.00
```

**Base de datos guarda:**
```sql
total:         1160.00
subtotal:      1000.00
iva:           160.00
iva_porcentaje: 16
```

✅ **Cálculos correctos**  
✅ **Usuario feliz**  
✅ **Sistema confiable**

---

## 📞 Siguiente Paso Inmediato

**ACCIÓN REQUERIDA:**
Ejecutar el archivo `FIX_CALCULOS_GASTOS.sql` en Supabase Dashboard para que el fix esté completo.

Sin este paso, el frontend calculará correctamente pero el trigger de base de datos podría sobrescribir los valores.
