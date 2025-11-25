# 🔄 CAMBIO DE LÓGICA DE IVA - GASTOS

## ❌ **LÓGICA ANTERIOR**
El usuario ingresaba:
- **Precio Unitario** (sin IVA)
- **Cantidad**
- **% IVA**

El sistema calculaba:
```
Subtotal = Precio Unitario × Cantidad
IVA = Subtotal × (% IVA / 100)
Total = Subtotal + IVA
```

## ✅ **NUEVA LÓGICA IMPLEMENTADA**
El usuario ahora ingresa:
- **Total con IVA incluido** (el monto que aparece en el comprobante)
- **Cantidad**  
- **% IVA**

El sistema calcula automáticamente:
```
Total = Total con IVA × Cantidad
IVA Factor = 1 + (% IVA / 100)
Subtotal = Total / IVA Factor
IVA = Total - Subtotal
Precio Unitario = Total con IVA (para compatibilidad con BD)
```

---

## 🛠️ **CAMBIOS TÉCNICOS REALIZADOS**

### **1. Estado del Formulario**
```typescript
// ANTES
precio_unitario: expense?.precio_unitario || 0,

// DESPUÉS  
total_con_iva: expense?.total || 0,
```

### **2. Lógica de Cálculo**
```typescript
// ANTES
const subtotal = formData.cantidad * formData.precio_unitario;
const iva = subtotal * (formData.iva_porcentaje / 100);
const total = subtotal + iva;

// DESPUÉS
const total = formData.total_con_iva * formData.cantidad;
const iva_factor = 1 + (formData.iva_porcentaje / 100);
const subtotal = total / iva_factor;
const iva = total - subtotal;
const precio_unitario = formData.total_con_iva; // Para compatibilidad
```

### **3. Campo de Entrada**
```tsx
// ANTES
<label>Precio Unitario *</label>
<input value={formData.precio_unitario} />

// DESPUÉS
<label>Total (con IVA incluido) *</label>
<input value={formData.total_con_iva} />
<p>Ingrese el monto total que aparece en su comprobante (ya incluye IVA)</p>
```

### **4. Validación**
```typescript
// ANTES
if (formData.precio_unitario <= 0) {
  newErrors.precio_unitario = 'El precio unitario debe ser mayor a 0';
}

// DESPUÉS
if (formData.total_con_iva <= 0) {
  newErrors.total_con_iva = 'El total debe ser mayor a 0';
}
```

### **5. Integración OCR**
```typescript
// ANTES
precio_unitario: ocrData.total || prev.precio_unitario,

// DESPUÉS
total_con_iva: ocrData.total || prev.total_con_iva,
```

---

## 📊 **EJEMPLO PRÁCTICO**

### **Escenario:** Compra en OXXO por $116.00

#### **ANTES (Usuario calculaba):**
- Usuario: "El total es $116, entonces el subtotal debe ser $100 y el IVA $16"
- Captura: Precio Unitario = $100
- Sistema calcula: Subtotal=$100, IVA=$16, Total=$116

#### **DESPUÉS (Sistema calcula automáticamente):**
- Usuario: "El ticket dice $116.00"  
- Captura: Total con IVA = $116
- Sistema calcula automáticamente:
  - Total = $116 × 1 = $116
  - Subtotal = $116 ÷ 1.16 = $100.00
  - IVA = $116 - $100 = $16.00

---

## 🎯 **BENEFICIOS DE LA NUEVA LÓGICA**

1. **✅ Más Intuitivo**: El usuario solo captura el monto que ve en el comprobante
2. **✅ Menos Errores**: No hay que calcular manualmente el subtotal
3. **✅ Más Rápido**: Un solo campo principal vs cálculos manuales
4. **✅ Compatible con OCR**: El OCR extrae el total directamente
5. **✅ Retrocompatible**: Los datos se guardan igual en la base de datos

---

## 🔧 **CÓMO USAR AHORA**

1. **Ir a Gastos** → "Nuevo Gasto"
2. **Capturar concepto** (ej: "Compra OXXO")
3. **Ingresar total con IVA**: $116.00 (el monto del ticket)
4. **Ajustar cantidad** si es necesario
5. **El sistema calcula automáticamente**:
   - Subtotal: $100.00
   - IVA (16%): $16.00
   - Total: $116.00

---

## 📱 **INTERFAZ ACTUALIZADA**

```
┌─ Total (con IVA incluido) * ──┐
│ $116.00                       │
└─ Ingrese el monto total que ──┘
   aparece en su comprobante 
   (ya incluye IVA)

┌─ Resumen de Cálculo ──────────┐
│ Subtotal:        $100.00      │
│ IVA (16%):       $16.00       │ ← Calculado automáticamente
│ Total:           $116.00      │
└───────────────────────────────┘
```

**¡La nueva lógica está activa y lista para usar!** 🚀