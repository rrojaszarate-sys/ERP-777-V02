# Instrucciones de Implementación - OCR Mejorado

**Fecha:** 12 de Octubre 2025
**Tiempo estimado:** 5-6 días
**Prioridad:** Alta

---

## 📋 Resumen Ejecutivo

Este documento contiene las instrucciones paso a paso para implementar las mejoras del sistema OCR, incluyendo:
- ✅ Nuevos campos en base de datos
- ✅ Parser inteligente con corrección de errores
- ✅ Mapeo automático mejorado
- ✅ Generación de detalle de compra estructurado

---

## 🚀 FASE 1: Base de Datos (1 día)

### Paso 1.1: Ejecutar Migración SQL

```bash
# Conectar a Supabase
cd "/home/rodrichrz/proyectos/V20--- recuperacion/project2"

# Revisar la migración
cat supabase_old/migrations/20251012_add_ocr_enhanced_fields.sql
```

**Ejecutar en Supabase Dashboard:**
1. Ve a Supabase Dashboard → SQL Editor
2. Copia el contenido de `20251012_add_ocr_enhanced_fields.sql`
3. Ejecuta el script
4. Verifica que no haya errores

### Paso 1.2: Verificar Campos Nuevos

```sql
-- Ejecutar en SQL Editor para verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'evt_gastos'
  AND column_name IN (
    'detalle_compra',
    'telefono_proveedor',
    'folio_ticket',
    'moneda',
    'tipo_comprobante',
    'descuento',
    'propina',
    'metodo_pago_detalle',
    'num_productos',
    'hora_compra'
  )
ORDER BY column_name;
```

**Resultado esperado:** 10 filas con los campos nuevos

### Paso 1.3: Probar Vista Analytics

```sql
-- Verificar que la vista funciona
SELECT * FROM vw_gastos_ocr_analytics LIMIT 5;

-- Obtener estadísticas
SELECT * FROM get_ocr_stats();
```

---

## 🔧 FASE 2: Actualizar Tipos TypeScript (0.5 días)

### Paso 2.1: Actualizar Finance.ts

**Archivo:** `src/modules/eventos/types/Finance.ts`

Agregar los siguientes campos al interface `Expense`:

```typescript
export interface Expense {
  // ... campos existentes ...

  // ====== CAMPOS OCR MEJORADOS ======
  detalle_compra?: string;          // NUEVO
  telefono_proveedor?: string;      // NUEVO
  folio_ticket?: string;            // NUEVO
  moneda?: string;                  // NUEVO (default: 'MXN')
  tipo_comprobante?: 'ticket' | 'factura' | 'nota' | 'otro'; // NUEVO
  descuento?: number;               // NUEVO
  propina?: number;                 // NUEVO
  metodo_pago_detalle?: string;     // NUEVO
  num_productos?: number;           // NUEVO
  hora_compra?: string;             // NUEVO
  // ==================================

  // ... resto de campos ...
}
```

### Paso 2.2: Crear Interface OCRMetadata

Agregar al final de `Finance.ts`:

```typescript
/**
 * Metadata completa del OCR para auditoría y análisis
 */
export interface OCRMetadata {
  texto_completo: string;
  confianza_general: number;
  motor_usado: 'google_vision' | 'tesseract' | 'ocr_space';
  timestamp: string;
  productos_detectados: Array<{
    codigo?: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
  metadata_adicional: {
    establecimiento?: string;
    rfc?: string;
    telefono?: string;
    direccion?: string;
    folio?: string;
    hora?: string;
  };
  campos_confianza: Record<string, number>;
  errores_detectados: string[];
}
```

### Paso 2.3: Actualizar Opciones de forma_pago

```typescript
export const PAYMENT_METHODS = {
  EFECTIVO: 'efectivo',
  TRANSFERENCIA: 'transferencia',
  CHEQUE: 'cheque',
  TARJETA: 'tarjeta',
  DEBITO: 'debito',        // NUEVO
  CREDITO: 'credito',      // NUEVO
  VALES: 'vales'           // NUEVO
} as const;
```

---

## 🎯 FASE 3: Crear Smart Parser (2 días)

### Paso 3.1: Crear Archivo smartTicketParser.ts

**Ubicación:** `src/modules/eventos/components/finances/smartTicketParser.ts`

**IMPORTANTE:** El código completo del parser está en el documento `ANALISIS_MEJORAS_OCR_COMPLETO.md` sección 8.

**Contenido del archivo:**
- Interfaces: `ExtendedOCRData`, `ProductoDetallado`
- Función principal: `parseSmartMexicanTicket()`
- Funciones auxiliares:
  - `corregirErroresOCR()`
  - `extraerEstablecimiento()`
  - `extraerRFC()`
  - `extraerTelefono()`
  - `extraerDireccion()`
  - `extraerFecha()`
  - `extraerHora()`
  - `extraerFolio()`
  - `extraerDatosMonetarios()`
  - `parseMontoSeguro()`
  - `extraerDatosPago()`
  - `extraerProductos()`
  - `determinarTipoComprobante()`
  - `determinarCategoriaAutomatica()`

**Copia el código completo desde:** [ANALISIS_MEJORAS_OCR_COMPLETO.md sección 8](ANALISIS_MEJORAS_OCR_COMPLETO.md#8-implementación-completa-del-parser)

### Paso 3.2: Crear generarDetalleCompra()

En el mismo archivo `smartTicketParser.ts`, agregar:

```typescript
/**
 * Genera resumen estructurado de productos para campo detalle_compra
 */
export function generarDetalleCompra(productos: Array<{
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_producto?: number;
}>): string {
  if (productos.length === 0) {
    return '';
  }

  let detalle = '=== DETALLE DE COMPRA ===\n\n';
  let totalGeneral = 0;

  productos.forEach((prod, index) => {
    const subtotal = prod.subtotal_producto || (prod.cantidad * prod.precio_unitario);
    totalGeneral += subtotal;

    detalle += `${index + 1}. ${prod.nombre}\n`;
    detalle += `   Cantidad: ${prod.cantidad}\n`;
    detalle += `   Precio unitario: $${prod.precio_unitario.toFixed(2)}\n`;
    detalle += `   Subtotal: $${subtotal.toFixed(2)}\n\n`;
  });

  detalle += `─────────────────────────\n`;
  detalle += `Total productos: ${productos.length}\n`;
  detalle += `Total: $${totalGeneral.toFixed(2)}\n`;

  return detalle;
}
```

### Paso 3.3: Crear Función de Validación

Agregar también al archivo:

```typescript
/**
 * Valida y corrige datos extraídos del OCR
 */
export function validarYCorregirDatosOCR(datos: ExtendedOCRData): ExtendedOCRData {
  const validado = { ...datos };

  // 1. Validar RFC
  if (validado.rfc && validado.rfc.length !== 13 && validado.rfc.length !== 14) {
    console.warn('⚠️ RFC con longitud incorrecta:', validado.rfc);
    validado.campos_fallidos.push('rfc');
  }

  // 2. Validar total vs suma de productos
  if (validado.productos.length > 0 && validado.total) {
    const sumaProductos = validado.productos.reduce(
      (sum, p) => sum + p.subtotal_producto,
      0
    );

    const diferencia = Math.abs(sumaProductos - validado.total);
    if (diferencia > validado.total * 0.1) {
      console.warn('⚠️ Total no coincide con suma de productos');
      console.warn(`Total: ${validado.total}, Suma: ${sumaProductos}`);
    }
  }

  // 3. Validar subtotal + IVA = total
  if (validado.subtotal && validado.iva && validado.total) {
    const calculado = validado.subtotal + validado.iva;
    const diferencia = Math.abs(calculado - validado.total);

    if (diferencia > 1) {
      console.warn('⚠️ Subtotal + IVA no coincide con total');
      validado.subtotal = validado.total / 1.16;
      validado.iva = validado.total - validado.subtotal;
    }
  }

  // 4. Validar fecha
  if (validado.fecha) {
    const fechaDate = new Date(validado.fecha);
    if (isNaN(fechaDate.getTime())) {
      console.warn('⚠️ Fecha inválida:', validado.fecha);
      validado.fecha = null;
      validado.campos_fallidos.push('fecha');
    }
  }

  return validado;
}
```

---

## 🔄 FASE 4: Integrar en GoogleVisionExpenseForm (1 día)

### Paso 4.1: Importar Nuevo Parser

**Archivo:** `src/modules/eventos/components/finances/GoogleVisionExpenseForm.tsx`

Agregar al inicio del archivo:

```typescript
import {
  parseSmartMexicanTicket,
  generarDetalleCompra,
  validarYCorregirDatosOCR,
  ExtendedOCRData
} from './smartTicketParser';
```

### Paso 4.2: Agregar State para OCR Metadata

Después de la línea 79 (donde está `useState<any>(null)`):

```typescript
const [ocrMetadata, setOcrMetadata] = useState<OCRMetadata | null>(null);
```

### Paso 4.3: Reemplazar extractMexicanTicketData

**ELIMINAR:** Líneas 90-232 (función `extractMexicanTicketData`)

**MOTIVO:** Ahora usaremos `parseSmartMexicanTicket` del nuevo archivo

### Paso 4.4: Actualizar processGoogleVisionOCR

**Ubicación:** Línea ~294

**CAMBIO:**
```typescript
// ANTES:
const datosExtraidos = extractMexicanTicketData(text);

// DESPUÉS:
let datosExtraidos = parseSmartMexicanTicket(text, 95);
datosExtraidos = validarYCorregirDatosOCR(datosExtraidos);
```

### Paso 4.5: Actualizar processTesseractOCR

**Ubicación:** Línea ~381

**CAMBIO:**
```typescript
// ANTES:
const datosExtraidos = extractMexicanTicketData(text);

// DESPUÉS:
let datosExtraidos = parseSmartMexicanTicket(text, Math.round(confidence));
datosExtraidos = validarYCorregirDatosOCR(datosExtraidos);
```

### Paso 4.6: Crear Nueva Función autoCompletarFormulario

**REEMPLAZAR** la función existente con:

```typescript
const autoCompletarFormulario = (datos: ExtendedOCRData) => {
  console.log('🎯 Auto-completando formulario con datos mejorados');

  // Generar detalle de compra estructurado
  const detalleCompra = generarDetalleCompra(datos.productos);

  setFormData(prev => ({
    ...prev,
    // Campos básicos
    concepto: datos.establecimiento || 'Gasto procesado con OCR',
    proveedor: datos.establecimiento || '',
    rfc_proveedor: datos.rfc || '',

    // Campos monetarios
    total: datos.total || 0,
    iva_porcentaje: datos.iva_porcentaje || 16,

    // Campos de fecha/hora
    fecha_gasto: datos.fecha || new Date().toISOString().split('T')[0],

    // Campos de pago
    forma_pago: datos.forma_pago || 'transferencia',
    referencia: datos.folio || prev.referencia,

    // NUEVOS CAMPOS
    detalle_compra: detalleCompra,
    telefono_proveedor: datos.telefono || undefined,
    folio_ticket: datos.folio || undefined,
    tipo_comprobante: datos.tipo_comprobante,
    descuento: datos.descuento || undefined,
    propina: datos.propina || undefined,
    metodo_pago_detalle: datos.metodo_pago_detalle || undefined,
    num_productos: datos.productos.length,
    hora_compra: datos.hora || undefined,
    moneda: datos.moneda,

    // Descripción con información relevante
    descripcion: datos.direccion || prev.descripcion
  }));

  // Guardar metadata completa
  setOcrMetadata({
    texto_completo: text,
    confianza_general: datos.confianza_total,
    motor_usado: 'google_vision', // Ajustar según el motor usado
    timestamp: new Date().toISOString(),
    productos_detectados: datos.productos.map(p => ({
      codigo: p.codigo,
      nombre: p.nombre,
      cantidad: p.cantidad,
      precio_unitario: p.precio_unitario,
      subtotal: p.subtotal_producto
    })),
    metadata_adicional: {
      establecimiento: datos.establecimiento || undefined,
      rfc: datos.rfc || undefined,
      telefono: datos.telefono || undefined,
      direccion: datos.direccion || undefined,
      folio: datos.folio || undefined,
      hora: datos.hora || undefined
    },
    campos_confianza: {},
    errores_detectados: datos.campos_fallidos
  });

  // Auto-seleccionar categoría si confianza es alta
  if (datos.categoria_sugerida.confianza > 0.7 && categories) {
    const categoriaEncontrada = categories.find(cat =>
      cat.nombre.toLowerCase().includes(datos.categoria_sugerida.nombre.toLowerCase())
    );

    if (categoriaEncontrada) {
      setFormData(prev => ({
        ...prev,
        categoria_id: categoriaEncontrada.id
      }));
    }
  }
};
```

### Paso 4.7: Actualizar handleSubmit para Incluir Nuevos Campos

**Ubicación:** Línea ~497

**AGREGAR** antes de `onSave(dataToSave)`:

```typescript
const dataToSave = {
  ...formData,
  // Campos calculados
  subtotal,
  iva,
  total,
  // Campos requeridos
  cantidad: 1,
  precio_unitario: formData.total,
  evento_id: eventId,
  categoria_id: formData.categoria_id || undefined,

  // ===== NUEVOS CAMPOS OCR =====
  detalle_compra: formData.detalle_compra,
  telefono_proveedor: formData.telefono_proveedor,
  folio_ticket: formData.folio_ticket,
  moneda: formData.moneda || 'MXN',
  tipo_comprobante: formData.tipo_comprobante || 'ticket',
  descuento: formData.descuento || 0,
  propina: formData.propina || 0,
  metodo_pago_detalle: formData.metodo_pago_detalle,
  num_productos: formData.num_productos || 0,
  hora_compra: formData.hora_compra,
  // ============================

  // Metadata OCR
  ocr_confianza: ocrResult?.confianza_general,
  ocr_validado: false,
  ocr_datos_originales: ocrMetadata,

  // Timestamps
  created_at: expense ? undefined : new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

---

## 📊 FASE 5: Agregar Feedback Visual (0.5 días)

### Paso 5.1: Agregar Componente de Análisis

**Ubicación:** Después del div de OCR Result (línea ~633)

**AGREGAR:**

```tsx
{/* Análisis de Confianza OCR */}
{ocrResult && ocrResult.success && ocrResult.datos_extraidos && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
    <h4 className="font-semibold mb-3 text-blue-900">📊 Análisis de Extracción OCR</h4>

    {/* Campos detectados */}
    <div className="mb-3">
      <span className="text-sm font-medium text-blue-800">
        ✅ Campos detectados ({ocrResult.datos_extraidos.campos_detectados.length}):
      </span>
      <div className="flex flex-wrap gap-1 mt-1">
        {ocrResult.datos_extraidos.campos_detectados.map((campo: string) => (
          <span
            key={campo}
            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium"
          >
            {campo}
          </span>
        ))}
      </div>
    </div>

    {/* Campos fallidos */}
    {ocrResult.datos_extraidos.campos_fallidos.length > 0 && (
      <div className="mb-3">
        <span className="text-sm font-medium text-yellow-800">
          ⚠️ Campos no detectados ({ocrResult.datos_extraidos.campos_fallidos.length}):
        </span>
        <div className="flex flex-wrap gap-1 mt-1">
          {ocrResult.datos_extraidos.campos_fallidos.map((campo: string) => (
            <span
              key={campo}
              className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full"
            >
              {campo}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Categoría sugerida */}
    {ocrResult.datos_extraidos.categoria_sugerida &&
      ocrResult.datos_extraidos.categoria_sugerida.confianza > 0.7 && (
      <div className="bg-purple-50 border border-purple-200 rounded p-2 mt-2">
        <span className="text-sm text-purple-800">
          💡 <strong>Categoría sugerida:</strong>{' '}
          {ocrResult.datos_extraidos.categoria_sugerida.nombre}
          {' '}({Math.round(ocrResult.datos_extraidos.categoria_sugerida.confianza * 100)}% confianza)
        </span>
      </div>
    )}

    {/* Resumen de productos */}
    {ocrResult.datos_extraidos.productos.length > 0 && (
      <div className="mt-3">
        <span className="text-sm font-medium text-blue-800">
          🛒 {ocrResult.datos_extraidos.productos.length} productos detectados
        </span>
      </div>
    )}
  </div>
)}
```

### Paso 5.2: Agregar Campo de Detalle de Compra al Formulario

**Ubicación:** Después del campo de descripción (línea ~817)

**AGREGAR:**

```tsx
{/* Detalle de Compra (Solo lectura - generado por OCR) */}
{formData.detalle_compra && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Detalle de Compra (Generado automáticamente por OCR)
    </label>
    <textarea
      value={formData.detalle_compra}
      readOnly
      rows={8}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
    />
    <p className="text-xs text-gray-500 mt-1">
      Este campo es generado automáticamente. Contiene {formData.num_productos || 0} productos.
    </p>
  </div>
)}
```

---

## ✅ FASE 6: Testing (1 día)

### Paso 6.1: Pruebas Unitarias del Parser

Crear archivo de prueba: `src/modules/eventos/components/finances/__tests__/smartTicketParser.test.ts`

```typescript
import { parseSmartMexicanTicket } from '../smartTicketParser';

describe('smartTicketParser', () => {
  test('Extrae datos de ticket OXXO básico', () => {
    const texto = `
      OXXO
      RFC: NAVB801231J69
      FECHA: 12/10/2025
      COCA COLA 2 $15.00
      TOTAL $30.00
    `;

    const resultado = parseSmartMexicanTicket(texto, 95);

    expect(resultado.establecimiento).toBe('OXXO');
    expect(resultado.rfc).toBe('NAVB801231/J69');
    expect(resultado.total).toBe(30);
    expect(resultado.productos.length).toBe(1);
  });

  // Agregar más tests...
});
```

### Paso 6.2: Pruebas Manuales con Tickets Reales

**Checklist de Pruebas:**

1. ✅ Ticket OXXO simple
2. ✅ Ticket PEMEX con comas en total (1,895.00)
3. ✅ Factura con RFC que incluye /
4. ✅ Ticket con múltiples productos
5. ✅ Ticket con descuentos
6. ✅ Ticket con propina
7. ✅ Ticket con tarjeta (últimos 4 dígitos)
8. ✅ Imagen borrosa (baja confianza)
9. ✅ Imagen rotada
10. ✅ Ticket arrugado

### Paso 6.3: Validación de Base de Datos

```sql
-- Verificar que los datos se guardaron correctamente
SELECT
  id,
  concepto,
  proveedor,
  total,
  detalle_compra IS NOT NULL as tiene_detalle,
  num_productos,
  tipo_comprobante,
  ocr_confianza,
  created_at
FROM evt_gastos
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📈 FASE 7: Monitoreo Post-Implementación

### Paso 7.1: Dashboard de Métricas

Consultar estadísticas:

```sql
SELECT * FROM get_ocr_stats();

SELECT * FROM vw_gastos_ocr_analytics
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Paso 7.2: KPIs a Monitorear

- **Tasa de éxito:** % de campos extraídos correctamente
- **Confianza promedio:** Debe ser >85%
- **Tiempo de procesamiento:** <5 segundos
- **Correcciones manuales:** <20% de gastos

---

## 🐛 Troubleshooting

### Error: Campo detalle_compra no existe

**Solución:**
```sql
-- Verificar que la migración se ejecutó
SELECT column_name FROM information_schema.columns
WHERE table_name = 'evt_gastos' AND column_name = 'detalle_compra';

-- Si no existe, ejecutar migración manualmente
```

### Error: Import no encuentra smartTicketParser

**Solución:**
```bash
# Verificar que el archivo existe
ls -la src/modules/eventos/components/finances/smartTicketParser.ts

# Verificar permisos
chmod 644 src/modules/eventos/components/finances/smartTicketParser.ts
```

### OCR no detecta productos

**Posibles causas:**
1. Imagen muy borrosa
2. Formato de ticket no estándar
3. Productos sin precio visible

**Solución:** Revisar logs de consola para ver regex matches

---

## 📚 Documentación Adicional

- [ANALISIS_MEJORAS_OCR_COMPLETO.md](ANALISIS_MEJORAS_OCR_COMPLETO.md) - Análisis completo
- [COMO_FUNCIONA_EL_OCR.md](COMO_FUNCIONA_EL_OCR.md) - Arquitectura actual
- [RESUMEN_OCR_GOOGLE_VISION.md](RESUMEN_OCR_GOOGLE_VISION.md) - Config Google Vision

---

## ✅ Checklist de Implementación

### Base de Datos
- [ ] Ejecutar migración SQL
- [ ] Verificar 10 nuevos campos en evt_gastos
- [ ] Probar vista vw_gastos_ocr_analytics
- [ ] Probar función get_ocr_stats()

### TypeScript
- [ ] Actualizar interface Expense en Finance.ts
- [ ] Crear interface OCRMetadata
- [ ] Actualizar PAYMENT_METHODS

### Smart Parser
- [ ] Crear smartTicketParser.ts
- [ ] Implementar parseSmartMexicanTicket()
- [ ] Implementar generarDetalleCompra()
- [ ] Implementar validarYCorregirDatosOCR()
- [ ] Implementar funciones auxiliares (15 funciones)

### Integración
- [ ] Importar parser en GoogleVisionExpenseForm
- [ ] Eliminar extractMexicanTicketData antigua
- [ ] Actualizar processGoogleVisionOCR
- [ ] Actualizar processTesseractOCR
- [ ] Reescribir autoCompletarFormulario
- [ ] Actualizar handleSubmit con nuevos campos

### UI/UX
- [ ] Agregar componente de análisis OCR
- [ ] Agregar campo detalle_compra (readonly)
- [ ] Agregar indicadores de confianza
- [ ] Agregar sugerencia de categoría

### Testing
- [ ] Crear tests unitarios del parser
- [ ] Probar con 10 tickets diferentes
- [ ] Validar precisión >85%
- [ ] Documentar casos edge

---

**FIN DE LAS INSTRUCCIONES**

Si tienes dudas durante la implementación, consulta los archivos de análisis completo o los logs de consola para debugging.
