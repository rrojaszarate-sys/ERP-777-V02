# ✅ Mejoras al Flujo de Ingresos

## 🎯 Cambios Implementados

### 1. **Estado Inicial: Facturado por Defecto**

**Cambio:** Los ingresos ahora siempre comienzan con `facturado: true`

**Justificación:**
- Los ingresos SIEMPRE deben tener una factura XML asociada
- No tiene sentido un ingreso "sin facturar"
- Simplifica el flujo y evita errores

**Código:**
```typescript
facturado: income?.facturado !== undefined ? income.facturado : true, // ✅ SIEMPRE empieza facturado
```

---

### 2. **Campo "Días de Crédito" Agregado**

**Ubicación:** `src/modules/eventos/types/Finance.ts`

**Nuevo campo:**
```typescript
export interface Income {
  // ... campos existentes
  dias_credito?: number;              // ✅ Días de crédito para calcular vencimiento (30, 60, 90, etc.)
  // ...
}
```

**UI en formulario:**
```tsx
<input
  type="number"
  min="0"
  max="365"
  value={formData.dias_credito}
  onChange={(e) => handleInputChange('dias_credito', parseInt(e.target.value) || 0)}
  className="..."
  required
/>
```

**Valor por defecto:** 30 días

---

### 3. **Cálculo Automático de Fecha de Vencimiento**

**Implementación:**
```typescript
// ✅ AUTO-CALCULAR fecha de compromiso de pago basado en días de crédito
React.useEffect(() => {
  if (formData.fecha_facturacion && formData.dias_credito) {
    const fechaFacturacion = new Date(formData.fecha_facturacion);
    fechaFacturacion.setDate(fechaFacturacion.getDate() + formData.dias_credito);
    const fechaCompromiso = fechaFacturacion.toISOString().split('T')[0];
    
    if (formData.fecha_compromiso_pago !== fechaCompromiso) {
      setFormData(prev => ({
        ...prev,
        fecha_compromiso_pago: fechaCompromiso
      }));
    }
  }
}, [formData.fecha_facturacion, formData.dias_credito]);
```

**Funcionamiento:**
1. Usuario ingresa **Fecha de Facturación** (ej: 15/10/2025)
2. Usuario ingresa **Días de Crédito** (ej: 30 días)
3. Sistema calcula automáticamente **Fecha de Vencimiento** (14/11/2025)

---

### 4. **Comprobante de Pago Requerido**

**Nuevos campos:**
```typescript
export interface Income {
  // ... campos existentes
  documento_pago_url?: string;        // ✅ Comprobante de pago
  documento_pago_nombre?: string;
  // ...
}
```

**Validación:**
```typescript
// ✅ VALIDAR: Comprobante de pago requerido cuando está cobrado
if (formData.cobrado && !formData.documento_pago_url) {
  newErrors.documento_pago_url = 'El comprobante de pago es obligatorio para ingresos cobrados';
}
```

**UI:**
- Solo aparece cuando se marca el checkbox "Cobrado"
- Permite subir PDF o imagen
- Obligatorio para completar el cobro

---

## 📊 Flujo Completo de Ingresos

```
┌─────────────────────────────────────────────────────────┐
│  1. CREAR INGRESO                                       │
│     ✓ Factura XML (obligatoria)                        │
│     ✓ PDF visual de la factura                         │
│     ✓ Fecha de facturación: 15/10/2025                 │
│     ✓ Días de crédito: 30                              │
│     ✓ Fecha vencimiento: 14/11/2025 (calculado auto)   │
│     ✓ Estado: Facturado ✅ | Cobrado ❌                │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  2. ESPERAR PAGO                                        │
│     ⏳ Pendiente de cobro                               │
│     ⏰ Vencimiento: 14/11/2025                          │
│     📧 Sistema enviará alertas automáticas             │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  3. REGISTRAR PAGO RECIBIDO                             │
│     ✓ Marcar checkbox "Cobrado"                        │
│     ✓ Fecha de cobro: 10/11/2025                       │
│     ✓ Subir comprobante de pago (obligatorio) 📄       │
│     ✓ Estado: Facturado ✅ | Cobrado ✅                │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
                    [COMPLETO]
```

---

## 🎨 Cambios en la UI

### Sección "Gestión de Pagos y Facturación"

**Antes:**
```
┌──────────────────────────────────────┐
│ Fecha Facturación | Fecha Compromiso │
└──────────────────────────────────────┘
```

**Ahora:**
```
┌─────────────────────────────────────────────────────────┐
│ Fecha Facturación * | Días Crédito * | Fecha Vencimiento│
│  15/10/2025         |      30        | 14/11/2025 ✓     │
│                     |                | (calculado auto)  │
└─────────────────────────────────────────────────────────┘
```

### Estado del Ingreso

**Antes:**
```
☐ Facturado
☐ Cobrado
```

**Ahora:**
```
┌────────────────────────────────────────────────────┐
│ 📋 Flujo: Los ingresos siempre comienzan con      │
│    factura emitida. Marca "Cobrado" cuando        │
│    recibas el pago y sube el comprobante.         │
└────────────────────────────────────────────────────┘

☑ Facturado  (Los ingresos siempre tienen factura)
☐ Cobrado    (Marca cuando recibas el pago)
```

### Comprobante de Pago (cuando está cobrado)

```
┌─────────────────────────────────────────────────────────┐
│ 📄 Comprobante de Pago *                                │
│                                                         │
│  ┌─────────────────────────────────────────────┐      │
│  │  📤 Subir comprobante de pago                │      │
│  │  Documento que comprueba que el pago fue     │      │
│  │  recibido (PDF o imagen)                     │      │
│  └─────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Cambios en la Base de Datos

### Nuevos Campos en `evt_ingresos`

```sql
ALTER TABLE evt_ingresos
ADD COLUMN dias_credito INTEGER DEFAULT 30,
ADD COLUMN documento_pago_url TEXT,
ADD COLUMN documento_pago_nombre TEXT;

-- Actualizar ingresos existentes para que estén facturados
UPDATE evt_ingresos 
SET facturado = true 
WHERE facturado IS NULL OR facturado = false;
```

---

## ✅ Validaciones Implementadas

| Validación | Condición | Mensaje de Error |
|------------|-----------|------------------|
| Factura XML | Siempre obligatoria | "La factura PDF es obligatoria para los ingresos" |
| Fecha Facturación | Requerida | Auto-llenada con fecha actual |
| Días de Crédito | Requerido, > 0 | Campo obligatorio |
| Fecha Vencimiento | Calculada automáticamente | No editable manualmente |
| Comprobante de Pago | Requerido si `cobrado = true` | "El comprobante de pago es obligatorio para ingresos cobrados" |
| Fecha de Cobro | Requerida si `cobrado = true` | "La fecha de cobro es requerida para ingresos pagados" |

---

## 🧪 Cómo Probar

### Test 1: Crear Ingreso Nuevo

1. **Ir a un evento** → Pestaña "Finanzas" → "Agregar Ingreso"
2. **Verificar:**
   - ✅ Campo "Facturado" ya está marcado y deshabilitado
   - ✅ Mensaje informativo sobre el flujo aparece
   - ✅ Campo "Días de Crédito" muestra 30 por defecto
3. **Llenar:**
   - Concepto: "Servicio de Consultoría"
   - Cantidad: 1
   - Precio: $50,000
   - Fecha Facturación: Hoy
   - Días Crédito: 30
4. **Verificar:**
   - ✅ "Fecha de Vencimiento" se calcula automáticamente
   - ✅ Muestra "(calculado automáticamente)" en azul
5. **Subir factura XML y PDF**
6. **Guardar**
7. **Verificar:**
   - ✅ Ingreso guardado con estado "Facturado (Pendiente de pago)"

### Test 2: Cambiar Días de Crédito

1. **Editar ingreso existente**
2. **Cambiar días de crédito:**
   - De 30 a 60
3. **Verificar:**
   - ✅ Fecha de vencimiento se actualiza automáticamente
   - Nueva fecha = Fecha facturación + 60 días

### Test 3: Marcar como Cobrado

1. **Editar ingreso facturado**
2. **Marcar checkbox "Cobrado"**
3. **Verificar:**
   - ✅ Aparece campo "Fecha de Cobro" (obligatorio)
   - ✅ Aparece sección "Comprobante de Pago" (obligatoria)
4. **Intentar guardar sin comprobante:**
   - ✅ Muestra error: "El comprobante de pago es obligatorio..."
5. **Subir comprobante** (PDF o imagen)
6. **Ingresar fecha de cobro**
7. **Guardar**
8. **Verificar:**
   - ✅ Ingreso guardado con estado "Pagado"
   - ✅ Comprobante asociado

### Test 4: Validación de Comprobante

1. **Editar ingreso cobrado**
2. **Desmarcar "Cobrado"**
3. **Guardar**
4. **Verificar:**
   - ✅ Comprobante se mantiene guardado
   - ✅ Estado cambia a "Facturado (Pendiente de pago)"
5. **Volver a marcar "Cobrado"**
6. **Verificar:**
   - ✅ Comprobante anterior sigue disponible

---

## 📝 Resumen de Archivos Modificados

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| `Finance.ts` | Agregados campos `dias_credito`, `documento_pago_url`, `documento_pago_nombre` | 3 nuevos |
| `IncomeForm.tsx` | Estado inicial con `facturado: true`, campo días de crédito, cálculo automático, comprobante pago | ~150 |

---

## 🎯 Beneficios

1. **✅ Flujo Claro:** El usuario entiende inmediatamente que los ingresos comienzan facturados
2. **✅ Automatización:** Cálculo automático de fecha de vencimiento ahorra tiempo
3. **✅ Control:** Comprobante obligatorio asegura trazabilidad de pagos
4. **✅ Auditoría:** Cada pago tiene su documento respaldatorio
5. **✅ Alertas:** Sistema puede enviar recordatorios basados en fecha de vencimiento
6. **✅ Reportes:** Métricas de cobros más precisas (días promedio de cobro, mora, etc.)

---

## 🔄 Próximos Pasos

- [ ] **Migración SQL:** Crear script para agregar columnas a `evt_ingresos`
- [ ] **Dashboard:** Mostrar ingresos próximos a vencer
- [ ] **Alertas:** Email automático X días antes del vencimiento
- [ ] **Reportes:** Gráficas de días promedio de cobro
- [ ] **Histórico:** Registro de cambios de estado con auditoría

---

**Fecha:** 14 de Octubre de 2025  
**Autor:** Sistema de Gestión de Eventos
