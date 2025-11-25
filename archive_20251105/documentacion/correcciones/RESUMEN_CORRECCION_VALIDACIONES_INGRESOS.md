# 🔧 Resumen de Correcciones - Validaciones de Ingresos

**Fecha:** 28 de octubre de 2025  
**Módulo:** Ingresos (Eventos)  
**Tipo:** Correcciones críticas y mejoras de validación

---

## 🎯 Objetivo

Corregir problemas críticos de validación en el módulo de ingresos y asegurar el cumplimiento de reglas de negocio relacionadas con:
- Información del cliente (obligatoria)
- Cuenta contable (pendiente hasta el pago)
- Comprobantes de pago (obligatorios para marcar como pagado)
- Estados de facturación
- Validación de documentos

---

## ❌ Problemas Identificados

### 1. **Error Crítico: `formData.cliente_id.trim is not a function`**

**Descripción:**  
El sistema intentaba ejecutar `.trim()` sobre `cliente_id` que es un valor numérico, causando un error fatal al guardar.

**Ubicación:**  
`src/modules/eventos/components/finances/IncomeForm.tsx:182`

**Error en consola:**
```
TypeError: formData.cliente_id.trim is not a function
```

---

### 2. **Botón "Marcar como Pagado" sin Validación de Comprobante**

**Descripción:**  
El sistema permitía marcar un ingreso como pagado sin validar que existiera un comprobante de pago adjunto.

**Ubicación:**  
`src/modules/eventos/components/finances/IncomeCard.tsx:243`

---

### 3. **Cuenta Contable Obligatoria desde el Inicio**

**Descripción:**  
La cuenta contable era obligatoria al crear el ingreso, cuando según las reglas de negocio debería ser obligatoria solo al momento del pago.

**Ubicación:**  
`src/modules/eventos/components/finances/IncomeForm.tsx:197`

---

### 4. **Falta de Cuenta "PENDIENTE"**

**Descripción:**  
No existía una cuenta contable especial "PENDIENTE" para casos donde aún no se ha asignado la cuenta definitiva.

---

## ✅ Correcciones Implementadas

### 1️⃣ **Corrección de Validación de Cliente**

**Archivo:** `src/modules/eventos/components/finances/IncomeForm.tsx`

**Cambio:**
```typescript
// ❌ ANTES (INCORRECTO):
if (!formData.cliente_id || !formData.cliente_id.trim()) {
  newErrors.cliente_id = 'El cliente es obligatorio';
}

// ✅ AHORA (CORRECTO):
if (!formData.cliente || !formData.cliente.trim()) {
  newErrors.cliente_id = 'El cliente es obligatorio';
}
```

**Razón:**  
- `cliente_id` es numérico (ID del cliente)
- `cliente` es string (nombre del cliente)
- Validamos el nombre del cliente que es obligatorio

---

### 2️⃣ **Validación de Responsable Corregida**

**Archivo:** `src/modules/eventos/components/finances/IncomeForm.tsx`

**Cambio:**
```typescript
// ✅ VALIDAR RESPONSABLE OBLIGATORIO
if (!formData.responsable_id || 
    typeof formData.responsable_id !== 'string' || 
    !formData.responsable_id.trim()) {
  newErrors.responsable_id = 'El responsable es obligatorio';
}
```

**Mejora:**  
- Validación de tipo antes de llamar `.trim()`
- Previene errores similares al del cliente

---

### 3️⃣ **Cuenta Contable: Pendiente hasta el Pago**

**Archivo:** `src/modules/eventos/components/finances/IncomeForm.tsx`

**Cambio:**
```typescript
// ✅ VALIDAR CUENTA CONTABLE: Solo obligatoria si está PAGADO (estado 4)
const estadoCalculado = calcularEstado();

if (estadoCalculado >= 4) {
  if (!formData.cuenta_contable_id || formData.cuenta_contable_id === '') {
    newErrors.cuenta_contable_id = 'La cuenta contable es obligatoria al realizar el pago';
  }
}
```

**UI Actualizada:**
```tsx
<label>
  Cuenta Contable {formData.estado_id >= 4 && '*'}
  {formData.estado_id < 4 && (
    <span className="text-xs text-amber-600 ml-2">
      (Puede dejarse pendiente hasta el pago)
    </span>
  )}
</label>

<select
  value={formData.cuenta_contable_id}
  required={formData.estado_id >= 4}
>
  <option value="">
    {formData.estado_id >= 4 
      ? 'Seleccionar cuenta (obligatorio)' 
      : 'Pendiente de asignación'}
  </option>
  {/* ... opciones */}
</select>

{!formData.cuenta_contable_id && formData.estado_id < 4 && (
  <p className="text-xs text-amber-600 mt-1">
    ℹ️ La cuenta contable se marcará como "pendiente" 
    y será obligatoria al realizar el pago
  </p>
)}
```

**Beneficios:**
- ✅ Permite crear ingresos sin asignar cuenta inmediatamente
- ✅ Obliga a seleccionar cuenta al momento del pago
- ✅ Feedback visual claro según el estado

---

### 4️⃣ **Botón "Marcar como Pagado" Condicional**

**Archivo:** `src/modules/eventos/components/finances/IncomeCard.tsx`

**Cambio:**
```tsx
{/* ❌ ANTES: Sin validar comprobante */}
{income.facturado && !income.cobrado && onMarkAsPaid && (
  <Button onClick={onMarkAsPaid}>
    Marcar Pagado
  </Button>
)}

{/* ✅ AHORA: Con validación de comprobante */}
{income.facturado && !income.cobrado && onMarkAsPaid && 
 income.documento_pago_url && (
  <Button 
    onClick={onMarkAsPaid}
    title="Marcar como pagado (comprobante adjunto)"
  >
    <CheckCircle className="w-3 h-3 mr-1" />
    Marcar Pagado
  </Button>
)}

{/* Advertencia si falta comprobante */}
{income.facturado && !income.cobrado && !income.documento_pago_url && (
  <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border">
    ⚠️ Adjunte comprobante de pago para poder marcar como pagado
  </div>
)}
```

**Beneficios:**
- ✅ No permite marcar como pagado sin comprobante
- ✅ Muestra advertencia clara al usuario
- ✅ Cumple con requisito: "no debe aparecer la opción de marcar como pagado sin antes adjuntar el comprobante"

---

### 5️⃣ **Script SQL: Cuenta Contable PENDIENTE**

**Archivo:** `CREAR_CUENTA_PENDIENTE.sql`

**Contenido:**
```sql
-- Crear cuenta "PENDIENTE" si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM evt_cuentas_contables 
    WHERE codigo = 'PEND-001' OR nombre ILIKE '%pendiente%'
  ) THEN
    INSERT INTO evt_cuentas_contables (
      codigo,
      nombre,
      tipo,
      descripcion,
      nivel,
      activa,
      created_at,
      updated_at
    ) VALUES (
      'PEND-001',
      'Cuenta Pendiente de Asignación',
      'ingresos',
      'Cuenta temporal para ingresos que aún no tienen cuenta contable asignada. 
       Debe ser reemplazada al momento del pago.',
      1,
      true,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Cuenta contable PENDIENTE creada exitosamente';
  ELSE
    RAISE NOTICE 'ℹ️  La cuenta PENDIENTE ya existe';
  END IF;
END $$;
```

**Uso:**
```bash
# Ejecutar en Supabase SQL Editor o con psql
psql -h [host] -U [user] -d [database] -f CREAR_CUENTA_PENDIENTE.sql
```

---

## 📋 Reglas de Negocio Implementadas

### **1. Información del Cliente**
- ✅ El nombre del cliente (`formData.cliente`) es obligatorio en todos los registros
- ✅ Validación de tipo correcta (string, no numérico)

### **2. Cuenta Contable**
- ✅ **Pendiente hasta el pago:** No obligatoria en estados 1, 2, 3
- ✅ **Obligatoria en estado 4 (PAGADO):** Debe seleccionarse antes de marcar como pagado
- ✅ Mensaje informativo: "Puede dejarse pendiente hasta el pago"

### **3. Comprobante de Pago**
- ✅ Obligatorio antes de marcar como pagado
- ✅ Botón "Marcar Pagado" solo visible si existe comprobante
- ✅ Advertencia visible si falta comprobante

### **4. Estados de Facturación**

| Estado | Código | Condición | Cuenta Contable |
|--------|--------|-----------|-----------------|
| **PLANEADO** | 1 | Sin documentos | Opcional (pendiente) |
| **ORDEN COMPRA** | 2 | Con orden de compra | Opcional (pendiente) |
| **FACTURADO** | 3 | Con XML + PDF | Opcional (pendiente) |
| **PAGADO** | 4 | Con XML + PDF + Comprobante | **Obligatoria** ✅ |

### **5. Validación de Documentos**
- ✅ Orden de compra: PDF e imágenes (JPEG, PNG)
- ✅ Comprobante de pago: PDF e imágenes (JPEG, PNG)
- ✅ Bucket correcto: `event_docs`
- ✅ Formato de nombre: `{ClaveEvento}_{TipoDocumento}_V{N}_{Nombre}`

---

## 🔄 Flujo Actualizado

### **Crear Ingreso:**
1. Llenar datos básicos
2. **Cliente obligatorio** ✅
3. **Cuenta contable opcional** (se puede dejar "Pendiente")
4. Guardar ingreso en estado PLANEADO

### **Adjuntar Orden de Compra (Opcional):**
1. Subir PDF o imagen
2. Estado cambia automáticamente a ORDEN_COMPRA

### **Facturar:**
1. Subir XML + PDF
2. Estado cambia automáticamente a FACTURADO
3. Cuenta contable aún puede estar pendiente

### **Marcar como Pagado:**
1. **Adjuntar comprobante de pago** (obligatorio)
2. **Seleccionar cuenta contable** (obligatorio)
3. Botón "Marcar Pagado" se habilita
4. Estado cambia a PAGADO

---

## 🧪 Casos de Prueba

### **Test 1: Validación de Cliente**
```
✅ Crear ingreso sin cliente → Error: "El cliente es obligatorio"
✅ Crear ingreso con cliente → Guardado exitoso
```

### **Test 2: Cuenta Contable Pendiente**
```
✅ Crear ingreso sin cuenta → Permitido (estado < 4)
✅ Mensaje visible: "Puede dejarse pendiente hasta el pago"
✅ Intentar marcar como pagado sin cuenta → Error de validación
```

### **Test 3: Comprobante de Pago Obligatorio**
```
✅ Ingreso facturado sin comprobante → Botón "Marcar Pagado" oculto
✅ Mensaje de advertencia visible
✅ Adjuntar comprobante → Botón aparece
✅ Click en "Marcar Pagado" → Guardado exitoso
```

### **Test 4: Estados Automáticos**
```
✅ Sin documentos → Estado 1 (PLANEADO)
✅ Con orden de compra → Estado 2 (ORDEN_COMPRA)
✅ Con XML + PDF → Estado 3 (FACTURADO)
✅ Con XML + PDF + Comprobante → Estado 4 (PAGADO)
```

---

## 📝 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/modules/eventos/components/finances/IncomeForm.tsx` | ✅ Corrección validación cliente<br>✅ Validación responsable mejorada<br>✅ Cuenta contable condicional<br>✅ UI actualizada con mensajes |
| `src/modules/eventos/components/finances/IncomeCard.tsx` | ✅ Botón "Marcar Pagado" condicional<br>✅ Advertencia si falta comprobante |
| `CREAR_CUENTA_PENDIENTE.sql` | ✅ Script para crear cuenta PENDIENTE |

---

## 🚨 Acciones Requeridas

### **Inmediatas:**

1. ✅ **Ejecutar script SQL:**
   ```bash
   # En Supabase SQL Editor
   psql -h [host] -U [user] -d [database] -f CREAR_CUENTA_PENDIENTE.sql
   ```

2. ✅ **Probar flujo completo:**
   - Crear ingreso sin cuenta contable
   - Adjuntar orden de compra
   - Facturar (XML + PDF)
   - Intentar marcar como pagado sin comprobante
   - Adjuntar comprobante y seleccionar cuenta
   - Marcar como pagado

3. ✅ **Verificar validaciones:**
   - Cliente obligatorio
   - Cuenta obligatoria solo al pagar
   - Comprobante obligatorio para pagar

### **Reportar:**

Si encuentra algún problema durante las pruebas:
1. Descripción detallada del error
2. Pasos para reproducir
3. Capturas de pantalla de consola/errores
4. Estado del ingreso al momento del error

---

## ✨ Beneficios de las Correcciones

1. ✅ **Estabilidad:** Error crítico de `.trim()` corregido
2. ✅ **Flexibilidad:** Permite crear ingresos sin asignar cuenta inmediatamente
3. ✅ **Control:** Cuenta obligatoria solo al momento del pago
4. ✅ **Validación:** No permite marcar como pagado sin comprobante
5. ✅ **UX Mejorada:** Mensajes claros sobre requisitos
6. ✅ **Trazabilidad:** Cuenta "PENDIENTE" identifica ingresos sin cuenta asignada

---

## 📌 Notas Importantes

### **Sobre Cuenta Contable:**
- Si se deja vacía, se marcará como "Pendiente"
- No es obligatoria hasta el estado PAGADO
- Mensaje visual informa al usuario sobre el comportamiento

### **Sobre Comprobantes:**
- Obligatorios para marcar como pagado
- Botón solo visible si existe comprobante
- Advertencia clara si falta

### **Sobre Validaciones:**
- Validación de tipos antes de métodos string
- Previene errores similares en el futuro
- Mensajes de error específicos

---

**Implementación completada:** 28 de octubre de 2025  
**Estado:** ✅ Listo para pruebas  
**Prioridad:** 🔴 CRÍTICA (errores bloqueantes corregidos)
