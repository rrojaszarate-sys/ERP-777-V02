# 🔧 Fix Completo: Módulo de Ingresos

## 📋 Problemas Identificados

Basado en tu reporte:
> "en ingreso está pasando algo parecido, está metiendo un precio unitario el cual no debería servir, solo importa el total"

### Problemas Actuales:

1. ✅ **Trigger calcula mal** - Usa `cantidad * precio_unitario` (igual que gastos)
2. ✅ **Precio unitario no debe importar** - Solo el TOTAL del XML
3. ✅ **Fecha de facturación** - Debe llenarse automáticamente del XML
4. ✅ **Responsable falta** - No hay campo para asignar trabajador responsable
5. ✅ **Notificaciones** - Necesita responsable para enviar correos

---

## ✅ Soluciones Implementadas

### 1. Trigger de Ingresos Corregido

**ANTES (❌ Incorrecto):**
```sql
NEW.subtotal = NEW.cantidad * NEW.precio_unitario;  ❌
NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100); ❌
NEW.total = NEW.subtotal + NEW.iva;                  ❌
```

**DESPUÉS (✅ Correcto):**
```sql
-- Usa el TOTAL del XML como fuente de verdad
NEW.subtotal := ROUND((NEW.total / iva_factor)::numeric, 2);  ✅
NEW.iva := ROUND((NEW.total - NEW.subtotal)::numeric, 2);     ✅
```

### 2. Campo Responsable Agregado

```sql
ALTER TABLE evt_ingresos 
ADD COLUMN responsable_id UUID REFERENCES core_users(id);
```

**Para qué sirve:**
- Asignar un trabajador responsable del ingreso
- Enviar notificaciones de vencimiento de pago
- Tracking de quién gestiona cada factura

### 3. Fecha de Facturación Automática

El trigger ahora copia automáticamente `fecha_ingreso` a `fecha_facturacion` si viene vacía:

```sql
IF NEW.fecha_facturacion IS NULL AND NEW.fecha_ingreso IS NOT NULL THEN
    NEW.fecha_facturacion := NEW.fecha_ingreso;
END IF;
```

---

## 📊 Flujo Correcto del Módulo de Ingresos

### Cuando se sube un XML CFDI:

```
1. 📄 Parser XML extrae:
   - total (FUENTE DE VERDAD)
   - fecha (→ fecha_facturacion)
   - cliente
   - RFC
   - UUID
   
2. 🧮 Trigger calcula:
   - subtotal = total / 1.16
   - iva = total - subtotal
   
3. 👤 Usuario asigna:
   - responsable_id (trabajador)
   - dias_credito (default 30)
   
4. 📅 Sistema calcula:
   - fecha_compromiso_pago = fecha_facturacion + dias_credito
   
5. ✅ Se guarda con:
   - facturado = true (siempre)
   - cobrado = false (inicial)
   
6. 💰 Cuando se cobra:
   - Usuario sube comprobante_pago
   - cobrado = true
   - fecha_pago = hoy
```

---

## 🗃️ Estructura Final de evt_ingresos

### Campos del XML (Automáticos):
```
total                  → Del XML (TOTAL FINAL con descuentos)
subtotal              → Calculado desde total
iva                   → Calculado desde total
fecha_facturacion     → Del XML (fecha emisión)
cliente               → Receptor CFDI
rfc_cliente          → RFC receptor
uuid_cfdi            → UUID timbre
```

### Campos de Gestión:
```
responsable_id        → Usuario asignado (NUEVO) 🆕
dias_credito         → Días de crédito (default 30)
fecha_compromiso_pago → Auto-calculada
facturado            → Siempre true
cobrado              → false → true cuando se paga
```

### Campos de Pago:
```
fecha_pago           → Cuando se marca cobrado
documento_pago_url    → Comprobante de pago
documento_pago_nombre → Nombre del archivo
```

---

## 🚀 Pasos para Aplicar el Fix

### 1. Ejecutar Script en Supabase

Abrir **Supabase Dashboard → SQL Editor** y ejecutar:

`FIX_TRIGGER_INGRESOS_COMPLETO.sql`

El script hará:
- ✅ Eliminar trigger incorrecto
- ✅ Crear trigger correcto (usa total del XML)
- ✅ Agregar campo `responsable_id`
- ✅ Crear índice para búsquedas rápidas
- ✅ Verificar que todo se aplicó correctamente

### 2. Actualizar Frontend (IncomeForm.tsx)

Necesitamos agregar:

**a) Selector de Responsable:**
```tsx
// Después del campo proveedor/cliente
<Select
  label="Responsable"
  value={formData.responsable_id || ''}
  onChange={(e) => setFormData(prev => ({ 
    ...prev, 
    responsable_id: e.target.value 
  }))}
>
  {trabajadores.map(t => (
    <SelectItem key={t.id} value={t.id}>
      {t.nombre} - {t.email}
    </SelectItem>
  ))}
</Select>
```

**b) Mostrar Fecha de Facturación:**
```tsx
// Mostrar la fecha que viene del XML (read-only)
<Input
  label="Fecha de Facturación (del XML)"
  type="date"
  value={formData.fecha_facturacion || ''}
  disabled
  description="Esta fecha se obtiene automáticamente del XML"
/>
```

---

## 🧪 Cómo Probar

### Prueba 1: Verificar Trigger

```sql
-- Ver que el trigger se aplicó
SELECT 
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'calculate_income_totals';

-- Debe contener: NEW.subtotal := ROUND((NEW.total / iva_factor)
```

### Prueba 2: Verificar Campo Responsable

```sql
-- Ver que el campo existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
AND column_name = 'responsable_id';

-- Resultado esperado: responsable_id | uuid
```

### Prueba 3: Consultar Trabajadores

```sql
-- Ver trabajadores disponibles
SELECT id, nombre, email, rol
FROM core_users
WHERE activo = true
ORDER BY nombre;
```

### Prueba 4: En la Aplicación

1. Subir un XML de factura emitida
2. Verificar que muestre:
   - Total correcto (del XML)
   - Subtotal calculado correctamente
   - IVA calculado correctamente
   - Fecha de facturación del XML
3. Asignar un responsable del dropdown
4. Guardar y verificar en BD

---

## 📧 Sistema de Notificaciones (Próximo Paso)

Con el campo `responsable_id` ya podemos:

1. **Enviar correo cuando se crea ingreso:**
   ```
   Para: responsable.email
   Asunto: Nueva factura asignada
   Contenido: Factura #XXX por $X,XXX - Vence: DD/MM/YYYY
   ```

2. **Notificar próximo vencimiento:**
   ```sql
   -- Facturas que vencen en 3 días
   SELECT 
       i.uuid_cfdi,
       i.total,
       i.fecha_compromiso_pago,
       u.email as responsable_email
   FROM evt_ingresos i
   JOIN core_users u ON i.responsable_id = u.id
   WHERE i.cobrado = false
   AND i.fecha_compromiso_pago <= CURRENT_DATE + INTERVAL '3 days';
   ```

3. **Alerta de vencimiento:**
   ```
   Para: responsable.email
   CC: evento.responsable.email
   Asunto: ⚠️ Factura por vencer
   Contenido: La factura #XXX por $X,XXX vence en 3 días
   ```

---

## ✅ Checklist de Implementación

- [x] Script SQL creado (FIX_TRIGGER_INGRESOS_COMPLETO.sql)
- [ ] **PENDIENTE:** Ejecutar script en Supabase
- [ ] **PENDIENTE:** Agregar selector de responsable en IncomeForm.tsx
- [ ] **PENDIENTE:** Mostrar fecha de facturación (read-only)
- [ ] **PENDIENTE:** Probar con XML real
- [ ] **PENDIENTE:** Verificar cálculos correctos
- [ ] **PENDIENTE:** Implementar sistema de notificaciones

---

## 📝 Resumen de Cambios

| Componente | Cambio | Estado |
|------------|--------|--------|
| Trigger calculate_income_totals | Calcula desde total (no desde precio_unitario) | ✅ Listo |
| Campo responsable_id | Agregado a evt_ingresos | ✅ Listo |
| Fecha facturación | Auto-fill desde fecha_ingreso | ✅ Listo |
| Frontend IncomeForm | Agregar selector responsable | ⏳ Pendiente |
| Sistema notificaciones | Enviar correos a responsable | 🔜 Próximo |

---

## 🎯 Resultado Final Esperado

**Usuario sube XML de factura emitida:**
```
✅ Total: $5,220 (del XML, incluye descuentos)
✅ Subtotal: $4,500 (calculado)
✅ IVA: $720 (calculado)
✅ Fecha Facturación: 14/10/2025 (del XML)
✅ Responsable: Juan Pérez (asignado)
✅ Días Crédito: 30
✅ Fecha Vencimiento: 13/11/2025 (auto-calculada)
✅ Estado: Facturado ✓ | Cobrado ✗
```

**Sistema funcional con:**
- Cálculos correctos desde total del XML
- Responsable asignado para seguimiento
- Fechas automáticas
- Listo para notificaciones

---

**¿Ejecutamos el script ahora o prefieres revisar algo primero?**
