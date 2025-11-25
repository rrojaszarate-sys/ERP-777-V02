# Modificaciones a Formularios de Ingresos y Gastos

## Estado: En Progreso

Este documento detalla las modificaciones específicas que deben aplicarse a `IncomeForm.tsx` y `ExpenseForm.tsx`.

---

## 📋 IncomeForm.tsx - Cambios Requeridos

### 1. Agregar Nuevos Estados al FormData (Línea ~31-55)

```typescript
const [formData, setFormData] = useState({
  // ... campos existentes ...

  // ✅ NUEVOS CAMPOS PARA CONTROL DE FACTURACIÓN
  estado_id: income?.estado_id || 1, // Default: PLANEADO
  dias_facturacion: income?.dias_facturacion || 5, // Default: 5 días
  fecha_limite_facturacion: income?.fecha_limite_facturacion || '',
  orden_compra_url: income?.orden_compra_url || '',
  orden_compra_nombre: income?.orden_compra_nombre || '',
  alertas_enviadas: income?.alertas_enviadas || [],
});
```

### 2. Agregar Estado para Orden de Compra (Después de línea ~66)

```typescript
// Estados para archivos
const [xmlFile, setXmlFile] = useState<File | null>(null);
const [pdfFile, setPdfFile] = useState<File | null>(null);
const [ordenCompraFile, setOrdenCompraFile] = useState<File | null>(null); // ✅ NUEVO
```

### 3. Modificar Validación - HACER ARCHIVOS OPCIONALES (Línea ~112-118)

**ANTES:**
```typescript
// Validate that PDF is uploaded for income
if (!formData.archivo_adjunto) {
  if (pdfFile && !formData.archivo_adjunto) {
    newErrors.archivo_adjunto = '⚠️ Debes clickear "Procesar XML + PDF" primero para subir los archivos';
  } else {
    newErrors.archivo_adjunto = 'La factura PDF es obligatoria para los ingresos';
  }
}
```

**DESPUÉS:**
```typescript
// ✅ ARCHIVOS OPCIONALES - Solo validar si hay XML sin procesar
if (xmlFile && !formData.archivo_adjunto) {
  newErrors.archivo_adjunto = '⚠️ Debes clickear "Procesar XML + PDF" primero para subir los archivos';
}

// ✅ Si no hay factura adjunta, marcar como PENDIENTE_FACTURAR (estado_id = 1)
if (!formData.archivo_adjunto && formData.estado_id > 1) {
  // Si no hay archivo pero el estado es mayor a PLANEADO, advertir
  newErrors.archivo_adjunto = 'Debe adjuntar la factura PDF para cambiar el estado';
}
```

### 4. Auto-calcular fecha_limite_facturacion (Agregar después de línea ~89)

```typescript
// ✅ AUTO-CALCULAR fecha límite de facturación basado en días_facturacion
React.useEffect(() => {
  if (formData.fecha_ingreso && formData.dias_facturacion && !formData.fecha_limite_facturacion) {
    const fechaIngreso = new Date(formData.fecha_ingreso);
    fechaIngreso.setDate(fechaIngreso.getDate() + formData.dias_facturacion);
    const fechaLimite = fechaIngreso.toISOString().split('T')[0];

    setFormData(prev => ({
      ...prev,
      fecha_limite_facturacion: fechaLimite
    }));
  }
}, [formData.fecha_ingreso, formData.dias_facturacion]);
```

### 5. Función para subir Orden de Compra (Agregar después de línea ~341)

```typescript
// ✅ FUNCIÓN PARA SUBIR ORDEN DE COMPRA
const handleOrdenCompraUpload = async (file: File) => {
  try {
    console.log('📎 Subiendo orden de compra:', file.name);
    const uploadResult = await uploadFile({ file, type: 'orden_compra', eventId });

    setFormData(prev => ({
      ...prev,
      orden_compra_url: uploadResult.url,
      orden_compra_nombre: uploadResult.fileName,
      estado_id: 2 // Cambiar a ORDEN_COMPRA
    }));

    toast.success('✅ Orden de compra adjuntada correctamente');
  } catch (error) {
    console.error('❌ Error subiendo orden de compra:', error);
    toast.error('Error al subir la orden de compra');
  }
};
```

### 6. Agregar Campos en el Formulario (UBICACIÓN SUGERIDA: Después del campo "Responsable")

**Buscar la sección de "Responsable" (aprox línea ~700-750) y agregar:**

```tsx
{/* ✅ NUEVO: Estado del Ingreso */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Estado del Ingreso
  </label>
  <select
    value={formData.estado_id}
    onChange={(e) => handleInputChange('estado_id', parseInt(e.target.value))}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
  >
    <option value={1}>📋 PLANEADO</option>
    <option value={2}>📄 ORDEN DE COMPRA</option>
    <option value={3}>💰 FACTURADO</option>
    <option value={4}>✅ PAGADO</option>
  </select>
</div>

{/* ✅ NUEVO: Días para Facturar */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Días para Facturar
  </label>
  <input
    type="number"
    min="1"
    max="90"
    value={formData.dias_facturacion}
    onChange={(e) => handleInputChange('dias_facturacion', parseInt(e.target.value))}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
  />
  <p className="text-xs text-gray-500 mt-1">
    Días permitidos después del evento para emitir la factura
  </p>
</div>

{/* ✅ NUEVO: Fecha Límite de Facturación (Auto-calculada) */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
    <Calendar className="w-4 h-4 mr-1" />
    Fecha Límite de Facturación
  </label>
  <input
    type="date"
    value={formData.fecha_limite_facturacion}
    onChange={(e) => handleInputChange('fecha_limite_facturacion', e.target.value)}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
  />
  {formData.fecha_limite_facturacion && (
    <p className="text-xs text-gray-500 mt-1">
      {new Date(formData.fecha_limite_facturacion) < new Date()
        ? '⚠️ FECHA VENCIDA'
        : '✅ Dentro del plazo'}
    </p>
  )}
</div>

{/* ✅ NUEVO: Orden de Compra */}
<div className="col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
    <Upload className="w-4 h-4 mr-1" />
    Orden de Compra (Opcional)
  </label>
  <div className="flex items-center gap-2">
    <input
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      onChange={(e) => {
        if (e.target.files?.[0]) {
          setOrdenCompraFile(e.target.files[0]);
        }
      }}
      className="flex-1 text-sm"
    />
    {ordenCompraFile && (
      <Button
        onClick={() => handleOrdenCompraUpload(ordenCompraFile)}
        disabled={isUploading}
        className="text-sm px-3 py-1"
      >
        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subir'}
      </Button>
    )}
  </div>
  {formData.orden_compra_nombre && (
    <p className="text-xs text-green-600 mt-1">
      ✅ {formData.orden_compra_nombre}
    </p>
  )}
</div>
```

### 7. Modificar Botones de Adjuntar (REDUCIR TAMAÑO)

**Buscar los botones "Adjuntar Factura" y "Adjuntar XML" y cambiar:**

**ANTES:**
```tsx
<Button className="...">
```

**DESPUÉS:**
```tsx
<Button className="text-sm px-2 py-1"> {/* ✅ Botones más pequeños */}
```

---

## 📋 ExpenseForm.tsx - Cambios Requeridos

### 1. Importar Hook de Cuentas (Al inicio del archivo)

```typescript
import { useAccountsGasto } from '../../hooks/useAccounts';
import { CuentaContable } from '../../types/Finance';
```

### 2. Agregar Nuevos Estados al FormData

```typescript
const [formData, setFormData] = useState({
  // ... campos existentes ...

  // ✅ NUEVOS CAMPOS
  cuenta_id: expense?.cuenta_id || null, // ✅ Cuenta contable (OBLIGATORIO)
  comprobante_pago_url: expense?.comprobante_pago_url || '',
  comprobante_pago_nombre: expense?.comprobante_pago_nombre || '',
  fecha_pago: expense?.fecha_pago || '',
  responsable_pago_id: expense?.responsable_pago_id || '',
  pagado: expense?.pagado || false,
  comprobado: expense?.comprobado || false,
  autorizado: expense?.autorizado !== undefined ? expense.autorizado : true, // ✅ Default TRUE
});
```

### 3. Cargar Hook de Cuentas

```typescript
const { data: cuentasGasto, isLoading: loadingCuentas } = useAccountsGasto();
```

### 4. Modificar Validación - HACER ARCHIVOS OPCIONALES

**ANTES:**
```typescript
if (!formData.archivo_adjunto) {
  newErrors.archivo_adjunto = 'El comprobante es obligatorio';
}
```

**DESPUÉS:**
```typescript
// ✅ ARCHIVOS OPCIONALES - No validar como obligatorio
// Si no hay archivo, marcar automáticamente como comprobado = false
if (!formData.archivo_adjunto) {
  setFormData(prev => ({ ...prev, comprobado: false }));
}

// ✅ VALIDAR: Cuenta contable es OBLIGATORIA
if (!formData.cuenta_id) {
  newErrors.cuenta_id = 'La cuenta contable es obligatoria';
}
```

### 5. Ocultar Campo "Provisiones" (NO ELIMINAR, SOLO OCULTAR)

**Buscar el campo de provisiones y envolverlo en:**

```tsx
{/* ❌ PROVISIONES - Campo oculto (mantenido por compatibilidad) */}
<div style={{ display: 'none' }}>
  <input
    type="hidden"
    name="provisiones"
    value={formData.provisiones || ''}
  />
</div>
```

### 6. Agregar Campo de Cuenta Contable (OBLIGATORIO)

```tsx
{/* ✅ NUEVO: Cuenta Contable (OBLIGATORIO) */}
<div className="col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Cuenta Contable * <span className="text-red-500">Obligatorio</span>
  </label>
  <select
    value={formData.cuenta_id || ''}
    onChange={(e) => handleInputChange('cuenta_id', parseInt(e.target.value))}
    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 ${
      errors.cuenta_id ? 'border-red-500' : 'border-gray-300'
    }`}
    required
  >
    <option value="">Seleccionar cuenta...</option>
    {loadingCuentas ? (
      <option disabled>Cargando cuentas...</option>
    ) : (
      cuentasGasto?.map((cuenta: CuentaContable) => (
        <option key={cuenta.id} value={cuenta.id}>
          {cuenta.codigo} - {cuenta.nombre}
        </option>
      ))
    )}
  </select>
  {errors.cuenta_id && (
    <p className="text-xs text-red-600 mt-1">{errors.cuenta_id}</p>
  )}
</div>
```

### 7. Agregar Campos de Control de Pago

```tsx
{/* ✅ NUEVO: Control de Pago */}
<div className="col-span-2 border-t pt-4 mt-4">
  <h4 className="text-sm font-medium text-gray-700 mb-3">Control de Pago</h4>

  <div className="grid grid-cols-2 gap-4">
    {/* Checkbox Pagado */}
    <div className="flex items-center">
      <input
        type="checkbox"
        id="pagado"
        checked={formData.pagado}
        onChange={(e) => handleInputChange('pagado', e.target.checked)}
        className="mr-2"
      />
      <label htmlFor="pagado" className="text-sm text-gray-700">
        ✅ Pagado
      </label>
    </div>

    {/* Fecha de Pago */}
    {formData.pagado && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha de Pago
        </label>
        <input
          type="date"
          value={formData.fecha_pago}
          onChange={(e) => handleInputChange('fecha_pago', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>
    )}

    {/* Responsable de Pago */}
    {formData.pagado && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Responsable de Pago
        </label>
        <select
          value={formData.responsable_pago_id}
          onChange={(e) => handleInputChange('responsable_pago_id', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Seleccionar...</option>
          {users?.map((user: any) => (
            <option key={user.id} value={user.id}>
              {user.nombre}
            </option>
          ))}
        </select>
      </div>
    )}

    {/* Comprobante de Pago */}
    {formData.pagado && (
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Comprobante de Pago (Opcional)
        </label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleComprobantePagoUpload(e.target.files[0]);
            }
          }}
          className="text-sm"
        />
        {formData.comprobante_pago_nombre && (
          <p className="text-xs text-green-600 mt-1">
            ✅ {formData.comprobante_pago_nombre}
          </p>
        )}
      </div>
    )}
  </div>
</div>
```

### 8. Función para Subir Comprobante de Pago (Agregar)

```typescript
const handleComprobantePagoUpload = async (file: File) => {
  try {
    console.log('📎 Subiendo comprobante de pago:', file.name);
    const uploadResult = await uploadFile({ file, type: 'comprobante_pago', eventId });

    setFormData(prev => ({
      ...prev,
      comprobante_pago_url: uploadResult.url,
      comprobante_pago_nombre: uploadResult.fileName
    }));

    toast.success('✅ Comprobante de pago adjuntado');
  } catch (error) {
    console.error('❌ Error subiendo comprobante:', error);
    toast.error('Error al subir el comprobante');
  }
};
```

### 9. Auto-marcar como Comprobado (Effect)

```typescript
// ✅ AUTO-MARCAR como comprobado si hay archivo
React.useEffect(() => {
  if (formData.archivo_adjunto && !formData.comprobado) {
    setFormData(prev => ({ ...prev, comprobado: true }));
  }
}, [formData.archivo_adjunto]);
```

### 10. Reducir Tamaño de Botones

**Igual que en IncomeForm, cambiar todos los botones de carga a:**

```tsx
<Button className="text-sm px-2 py-1">
```

---

## ✅ Checklist de Implementación

### IncomeForm.tsx
- [ ] Agregar nuevos campos al formData
- [ ] Agregar estado para orden de compra
- [ ] Modificar validación (archivos opcionales)
- [ ] Agregar auto-cálculo de fecha_limite_facturacion
- [ ] Agregar función handleOrdenCompraUpload
- [ ] Agregar campos en el formulario (estado, días facturación, fecha límite, orden compra)
- [ ] Reducir tamaño de botones

### ExpenseForm.tsx
- [ ] Importar hook useAccountsGasto
- [ ] Agregar nuevos campos al formData
- [ ] Cargar cuentas con el hook
- [ ] Modificar validación (archivos opcionales + cuenta obligatoria)
- [ ] Ocultar campo provisiones
- [ ] Agregar campo cuenta contable (obligatorio)
- [ ] Agregar sección de control de pago
- [ ] Agregar función handleComprobantePagoUpload
- [ ] Agregar effect para auto-marcar comprobado
- [ ] Reducir tamaño de botones

---

**Nota**: Este documento sirve como guía. Cada cambio debe aplicarse cuidadosamente revisando el contexto del código existente.

**Última Actualización**: 2025-10-24
