# Cambios Pendientes para GoogleVisionExpenseForm.tsx

## Problema Detectado
El archivo `GoogleVisionExpenseForm.tsx` parece tener problemas de formato (líneas 16-29 rotas).

## Solución: Archivo de Reemplazo Completo

Voy a crear un archivo de reemplazo limpio con todos los cambios SAT implementados.

---

## Cambios a Implementar

### 1. IMPORTS (Agregar al inicio)

```typescript
// Después de la línea 15, agregar:
import {
  Expense,
  OCRMetadata,
  SAT_FORMA_PAGO,
  SAT_METODO_PAGO
} from '../../types/Finance';
import {
  parseSmartMexicanTicket,
  validarYCorregirDatosOCR,
  type ExtendedOCRData
} from './smartTicketParser';
```

### 2. STATE (Reemplazar formData - línea 61)

```typescript
const [formData, setFormData] = useState({
  // Campos básicos existentes
  concepto: expense?.concepto || '',
  descripcion: expense?.descripcion || '',
  total: expense?.total || 0,
  iva_porcentaje: expense?.iva_porcentaje || MEXICAN_CONFIG.ivaRate,
  proveedor: expense?.proveedor || '',
  rfc_proveedor: expense?.rfc_proveedor || '',
  fecha_gasto: expense?.fecha_gasto || new Date().toISOString().split('T')[0],
  categoria_id: expense?.categoria_id || '',
  forma_pago: expense?.forma_pago || 'transferencia',
  referencia: expense?.referencia || '',
  status_aprobacion: expense?.status_aprobacion || 'aprobado',

  // ====== CAMPOS SAT NUEVOS ======
  uuid_cfdi: expense?.uuid_cfdi || '',
  folio_fiscal: expense?.folio_fiscal || '',
  serie: expense?.serie || '',
  tipo_comprobante: expense?.tipo_comprobante || 'I',
  forma_pago_sat: expense?.forma_pago_sat || '',
  metodo_pago_sat: expense?.metodo_pago_sat || 'PUE',
  lugar_expedicion: expense?.lugar_expedicion || '',
  moneda: expense?.moneda || 'MXN',
  tipo_cambio: expense?.tipo_cambio || null,
  descuento: expense?.descuento || 0,
  motivo_descuento: expense?.motivo_descuento || '',
  folio_interno: expense?.folio_interno || '',
  hora_emision: expense?.hora_emision || '',
  telefono_proveedor: expense?.telefono_proveedor || '',
  detalle_productos: expense?.detalle_productos || null,
});

// Agregar después de línea 80:
const [ocrMetadata, setOcrMetadata] = useState<OCRMetadata | null>(null);
```

### 3. ELIMINAR extractMexicanTicketData (líneas 90-232)

**Eliminar completamente** la función `extractMexicanTicketData`.

### 4. ACTUALIZAR processGoogleVisionOCR (línea 294)

Reemplazar esta línea:
```typescript
const datosExtraidos = extractMexicanTicketData(text);
```

Por:
```typescript
let datosExtraidos = parseSmartMexicanTicket(text, 95);
datosExtraidos = validarYCorregirDatosOCR(datosExtraidos);
```

Y después de la línea 305, reemplazar:
```typescript
autoCompletarFormulario(datosExtraidos);
```

Por:
```typescript
autoCompletarFormularioSAT(datosExtraidos, text);
```

### 5. ACTUALIZAR processTesseractOCR (línea 381)

Reemplazar:
```typescript
const datosExtraidos = extractMexicanTicketData(text);
```

Por:
```typescript
let datosExtraidos = parseSmartMexicanTicket(text, Math.round(confidence));
datosExtraidos = validarYCorregirDatosOCR(datosExtraidos);
```

### 6. NUEVA FUNCIÓN autoCompletarFormularioSAT

Agregar después de la función `processTesseractOCR` (antes de `handleFileChange`):

```typescript
const autoCompletarFormularioSAT = (datos: ExtendedOCRData, texto: string) => {
  console.log('🎯 Auto-completando formulario con datos SAT');

  // Generar JSON de productos
  const detalle_productos = datos.productos.length > 0 ? {
    productos: datos.productos.map((p, i) => ({
      numero: i + 1,
      codigo: p.codigo || '',
      clave_prod_serv: '',
      descripcion: p.nombre,
      cantidad: p.cantidad,
      unidad: 'PZA',
      precio_unitario: p.precio_unitario,
      importe: p.subtotal_producto,
      descuento: p.descuento || 0
    })),
    total_productos: datos.productos.length,
    subtotal_productos: datos.productos.reduce((sum, p) => sum + p.subtotal_producto, 0)
  } : null;

  // Convertir forma de pago a código SAT
  const forma_pago_sat = datos.forma_pago === 'efectivo' ? SAT_FORMA_PAGO.EFECTIVO :
                        datos.forma_pago === 'transferencia' ? SAT_FORMA_PAGO.TRANSFERENCIA :
                        datos.forma_pago === 'tarjeta' ? SAT_FORMA_PAGO.TARJETA_CREDITO :
                        datos.forma_pago === 'debito' ? SAT_FORMA_PAGO.TARJETA_DEBITO :
                        SAT_FORMA_PAGO.POR_DEFINIR;

  setFormData(prev => ({
    ...prev,
    // Básicos
    concepto: datos.establecimiento || 'Gasto procesado con OCR',
    proveedor: datos.establecimiento || '',
    rfc_proveedor: datos.rfc || '',
    total: datos.total || 0,
    fecha_gasto: datos.fecha || new Date().toISOString().split('T')[0],
    descripcion: datos.direccion || prev.descripcion,

    // Campos SAT
    forma_pago_sat,
    metodo_pago_sat: 'PUE',
    tipo_comprobante: datos.tipo_comprobante === 'factura' ? 'I' : 'I',
    moneda: datos.moneda || 'MXN',
    folio_interno: datos.folio || '',
    hora_emision: datos.hora || '',
    telefono_proveedor: datos.telefono || '',
    descuento: datos.descuento || 0,
    motivo_descuento: datos.motivo_descuento || '',

    // Productos (JSON)
    detalle_productos,

    // Forma de pago texto (legacy)
    forma_pago: datos.forma_pago || 'transferencia'
  }));

  // Guardar metadata completa
  setOcrMetadata({
    texto_completo: texto,
    confianza_general: datos.confianza_total,
    motor_usado: 'google_vision',
    timestamp: new Date().toISOString(),
    productos_detectados: datos.productos.map(p => ({
      codigo: p.codigo,
      nombre: p.nombre,
      cantidad: p.cantidad,
      unidad: 'PZA',
      precio_unitario: p.precio_unitario,
      subtotal: p.subtotal_producto,
      descuento: p.descuento
    })),
    metadata_adicional: {
      establecimiento: datos.establecimiento || undefined,
      rfc: datos.rfc || undefined,
      telefono: datos.telefono || undefined,
      folio_interno: datos.folio || undefined,
      hora: datos.hora || undefined
    },
    campos_confianza: {},
    errores_detectados: datos.campos_fallidos
  });

  // Auto-categorizar
  if (datos.categoria_sugerida && datos.categoria_sugerida.confianza > 0.7 && categories) {
    const cat = categories.find(c =>
      c.nombre.toLowerCase().includes(datos.categoria_sugerida.nombre.toLowerCase())
    );
    if (cat) {
      setFormData(prev => ({ ...prev, categoria_id: cat.id }));
    }
  }
};
```

### 7. ACTUALIZAR handleSubmit (línea 497-510)

Reemplazar todo el `dataToSave` por:

```typescript
const dataToSave = {
  ...formData,
  // Campos calculados
  subtotal,
  iva,
  total,
  cantidad: 1,
  precio_unitario: formData.total,
  evento_id: eventId,
  categoria_id: formData.categoria_id || undefined,

  // ====== CAMPOS SAT ======
  uuid_cfdi: formData.uuid_cfdi || null,
  folio_fiscal: formData.folio_fiscal || null,
  serie: formData.serie || null,
  tipo_comprobante: formData.tipo_comprobante,
  forma_pago_sat: formData.forma_pago_sat || null,
  metodo_pago_sat: formData.metodo_pago_sat,
  moneda: formData.moneda,
  tipo_cambio: formData.tipo_cambio || null,
  lugar_expedicion: formData.lugar_expedicion || null,
  descuento: formData.descuento || 0,
  motivo_descuento: formData.motivo_descuento || null,

  // Ticket
  folio_interno: formData.folio_interno || null,
  hora_emision: formData.hora_emision || null,
  telefono_proveedor: formData.telefono_proveedor || null,

  // Productos (JSON)
  detalle_productos: formData.detalle_productos,

  // OCR Metadata
  ocr_confianza: ocrResult?.confianza_general || ocrResult?.confidence,
  ocr_validado: false,
  ocr_datos_originales: ocrMetadata,

  created_at: expense ? undefined : new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

### 8. AGREGAR UI DE PRODUCTOS (después de línea 817)

Agregar después del campo de descripción:

```tsx
{/* Detalle de Productos Extraídos */}
{formData.detalle_productos && formData.detalle_productos.productos.length > 0 && (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
      <Bot className="w-4 h-4 mr-2" />
      Productos Detectados por OCR ({formData.detalle_productos.total_productos})
    </h5>
    <div className="space-y-2">
      {formData.detalle_productos.productos.map((prod, idx) => (
        <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-b-0">
          <div className="flex-1">
            <span className="font-medium">{prod.descripcion}</span>
            <span className="text-gray-500 ml-2 text-xs">
              ({prod.cantidad} x ${prod.precio_unitario.toFixed(2)})
            </span>
          </div>
          <span className="font-semibold">${prod.importe.toFixed(2)}</span>
        </div>
      ))}
      <div className="flex justify-between font-bold text-base pt-2 border-t">
        <span>Subtotal Productos:</span>
        <span>${formData.detalle_productos.subtotal_productos.toFixed(2)}</span>
      </div>
    </div>
  </div>
)}

{/* Clasificación SAT */}
{formData.forma_pago_sat && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
    <h5 className="font-semibold text-blue-900 mb-2 flex items-center">
      <CheckCircle className="w-4 h-4 mr-2" />
      Clasificación SAT
    </h5>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-gray-600">Forma de Pago:</span>
        <span className="ml-2 font-medium">{formData.forma_pago_sat}</span>
      </div>
      <div>
        <span className="text-gray-600">Método:</span>
        <span className="ml-2 font-medium">{formData.metodo_pago_sat}</span>
      </div>
      <div>
        <span className="text-gray-600">Tipo:</span>
        <span className="ml-2 font-medium">{formData.tipo_comprobante}</span>
      </div>
      <div>
        <span className="text-gray-600">Moneda:</span>
        <span className="ml-2 font-medium">{formData.moneda}</span>
      </div>
    </div>
  </div>
)}
```

---

## Resumen de Cambios

| Cambio | Ubicación | Status |
|--------|-----------|--------|
| Imports | Línea 1-20 | Pendiente |
| State campos SAT | Línea 61-73 | Pendiente |
| Eliminar extractMexicanTicketData | Línea 90-232 | Pendiente |
| Usar parseSmartMexicanTicket | Línea 294, 381 | Pendiente |
| Nueva función autoCompletarFormularioSAT | Después línea 459 | Pendiente |
| Actualizar handleSubmit | Línea 497-510 | Pendiente |
| Agregar UI productos | Después línea 817 | Pendiente |

---

## Próximo Paso

Debido a problemas de formato en el archivo, recomiendo:

1. **Hacer backup** del archivo actual
2. **Crear nuevo archivo** limpio con todos los cambios
3. **Probar** con un ticket real

¿Quieres que cree el archivo completo limpio?
