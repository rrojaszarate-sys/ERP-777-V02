# 🚨 URGENTE: Trigger de Base de Datos Sobrescribiendo Cálculos

## 🐛 Problema Confirmado

Tenías razón, **el problema está en la base de datos**. Hay un trigger `calculate_expense_totals()` que está sobrescribiendo los valores correctos que enviamos desde el frontend.

### Trigger Actual (INCORRECTO):

```sql
CREATE FUNCTION calculate_expense_totals()
BEGIN
  NEW.subtotal = NEW.cantidad * NEW.precio_unitario;  ❌
  NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100); ❌
  NEW.total = NEW.subtotal + NEW.iva;                  ❌
END;
```

**Problema:**
- Calcula desde `cantidad * precio_unitario` (que no existe en XML)
- **IGNORA** el total que enviamos desde el frontend
- **IGNORA** el total del XML CFDI
- **SOBRESCRIBE** los valores correctos que calculamos

---

## ✅ Solución

Ejecutar el script SQL que **REEMPLAZA** la función del trigger con la lógica correcta.

---

## 📋 PASOS PARA EJECUTAR EL FIX

### 1. Abrir Supabase Dashboard

1. Ir a: https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a: **SQL Editor** (icono de base de datos en el menú izquierdo)

### 2. Ejecutar el Script

1. Abrir el archivo: `FIX_TRIGGER_GASTOS_URGENTE.sql`
2. **Copiar TODO el contenido** (Ctrl+A, Ctrl+C)
3. Pegar en el SQL Editor de Supabase
4. Click en **"RUN"** o presionar **Ctrl+Enter**

### 3. Verificar que se Aplicó

Deberías ver un mensaje de éxito y los resultados de las queries de verificación:

```
✅ DROP TRIGGER... (Success)
✅ DROP FUNCTION... (Success)
✅ CREATE FUNCTION... (Success)
✅ CREATE TRIGGER... (Success)
```

### 4. Probar en la Aplicación

1. Ir a un evento
2. Subir un XML con descuento
3. **Verificar que ahora guarda correctamente:**
   - Total = el del XML (ej: $5,220)
   - Subtotal = total / 1.16 (ej: $4,500)
   - IVA = total - subtotal (ej: $720)

---

## 🔍 ¿Qué Hace el Fix?

### Trigger ANTES (❌ Incorrecto):

```sql
-- Calcula desde cantidad y precio (no siempre disponibles)
NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100);
NEW.total = NEW.subtotal + NEW.iva;
```

**Resultado:** Ignora el total del XML, calcula mal

### Trigger DESPUÉS (✅ Correcto):

```sql
-- Respeta el total que viene del frontend/XML
IF NEW.total IS NOT NULL AND NEW.total > 0 THEN
    iva_factor := 1.0 + (COALESCE(NEW.iva_porcentaje, 16) / 100.0);
    NEW.subtotal := ROUND((NEW.total / iva_factor)::numeric, 2);
    NEW.iva := ROUND((NEW.total - NEW.subtotal)::numeric, 2);
END IF;
```

**Resultado:** Respeta el total, calcula subtotal e IVA correctamente

---

## 📊 Ejemplo de Funcionamiento

### XML CFDI con descuento:

```xml
<Comprobante 
  SubTotal="5000.00"
  Descuento="500.00"
  Total="5220.00">
```

### Con trigger ANTIGUO (❌):

```
Frontend envía:    total=5220, subtotal=4500, iva=720
Trigger calcula:   cantidad=1 * precio_unitario=0 = subtotal=0 ❌
Base de datos:     total=0, subtotal=0, iva=0 ❌
```

### Con trigger NUEVO (✅):

```
Frontend envía:    total=5220, subtotal=4500, iva=720
Trigger respeta:   total=5220 ✅
Trigger recalcula: subtotal=5220/1.16=4500 ✅
                   iva=5220-4500=720 ✅
Base de datos:     total=5220, subtotal=4500, iva=720 ✅
```

---

## 🎯 Por Qué Esto Soluciona el Problema

1. **Frontend calcula correctamente** (ya lo arreglamos)
2. **Frontend envía valores correctos** (ya lo arreglamos)
3. **Base de datos respeta esos valores** (esto es lo que faltaba) ✅

El trigger ahora:
- ✅ Respeta el `total` que enviamos (del XML o ingresado manualmente)
- ✅ Calcula `subtotal` e `iva` desde ese total
- ✅ NO sobrescribe con cálculos incorrectos

---

## 🧪 Prueba Rápida

Después de ejecutar el script, puedes hacer una prueba directa en el SQL Editor:

```sql
-- Insertar un gasto de prueba
INSERT INTO evt_gastos (
    evento_id,
    concepto,
    total,
    iva_porcentaje,
    proveedor,
    fecha_gasto,
    forma_pago
) VALUES (
    1, -- Cambiar por un evento_id válido
    '🧪 PRUEBA',
    1160.00,
    16,
    'Test',
    CURRENT_DATE,
    'efectivo'
)
RETURNING id, total, subtotal, iva;
```

**Resultado esperado:**
```
total:    1160.00 ✅
subtotal: 1000.00 ✅
iva:       160.00 ✅
```

Si ves esto, **¡el fix funciona!** 🎉

---

## 📝 Archivos Creados

1. **`FIX_TRIGGER_GASTOS_URGENTE.sql`** - Script para ejecutar en Supabase (EJECUTAR ESTE)
2. **`FIX_CALCULOS_GASTOS.sql`** - Script alternativo con más documentación
3. **`FIX_CALCULOS_GASTOS_COMPLETO.md`** - Documentación del fix de frontend
4. **`FIX_DESCUENTOS_XML_CFDI.md`** - Documentación del fix de parser XML

---

## ✅ Checklist

- [x] Frontend: Calcular subtotal/IVA correctamente (HECHO)
- [x] Frontend: Incluir valores calculados en dataToSend (HECHO)
- [x] XML Parser: Usar total del XML como fuente de verdad (HECHO)
- [ ] **Base de datos: Ejecutar script para corregir trigger** ⬅️ **HACER ESTO AHORA**
- [ ] Probar subiendo XML con descuento
- [ ] Verificar que valores se guardan correctamente

---

## 🚀 Acción Inmediata Requerida

**EJECUTAR AHORA:**

1. Abrir Supabase Dashboard → SQL Editor
2. Copiar contenido de `FIX_TRIGGER_GASTOS_URGENTE.sql`
3. Pegar y ejecutar
4. Verificar mensajes de éxito
5. Probar subiendo un XML

**Sin este paso, el sistema seguirá guardando mal** aunque el frontend calcule correctamente.

---

## 💡 Resumen

- **Problema:** Trigger de BD sobrescribe valores correctos
- **Solución:** Reemplazar trigger con lógica correcta
- **Acción:** Ejecutar script SQL en Supabase
- **Tiempo:** 2 minutos
- **Resultado:** Gastos se guardan correctamente con descuentos

**El frontend ya está corregido, solo falta corregir la base de datos.**
