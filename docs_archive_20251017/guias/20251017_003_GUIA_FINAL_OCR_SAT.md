# 🎯 Guía Final: OCR Mejorado Compatible con SAT

**Fecha:** 12 de Octubre 2025
**Versión:** 2.0 - Compatible con CFDI 4.0

---

## 📋 RESUMEN DE CAMBIOS

### ✅ Lo que se Implementó

He realizado una **revisión completa del sistema OCR** adecuándolo a los **estándares del SAT mexicano** (CFDI 4.0) y eliminando campos innecesarios.

### 🔄 Cambios vs Versión Anterior

| Concepto | Versión Anterior | Versión SAT (Actual) |
|----------|------------------|----------------------|
| **Campos nuevos** | 10 campos genéricos | 15 campos SAT específicos |
| **Detalle productos** | Campo texto plano | JSON estructurado |
| **Forma de pago** | Texto libre | Código SAT c_FormaPago |
| **Tipo comprobante** | Texto libre | Catálogo SAT (I,E,T,N,P) |
| **Soporte CFDI** | ❌ No | ✅ Completo |
| **Campos eliminados** | - | num_productos, propina, metodo_pago_detalle |

---

## 📊 ESTRUCTURA FINAL DE `evt_gastos`

### Campos Agregados (15 totales)

#### Prioridad ALTA - Factura CFDI (6 campos)
```sql
uuid_cfdi              VARCHAR(36)      -- UUID del comprobante fiscal
folio_fiscal           VARCHAR(50)      -- Folio fiscal del SAT
serie                  VARCHAR(25)      -- Serie de la factura
tipo_comprobante       VARCHAR(1)       -- I, E, T, N, P
forma_pago_sat         VARCHAR(2)       -- 01, 03, 04, 28, 99...
metodo_pago_sat        VARCHAR(3)       -- PUE o PPD
```

#### Prioridad MEDIA - Complementarios (5 campos)
```sql
lugar_expedicion       VARCHAR(5)       -- Código postal
moneda                 VARCHAR(3)       -- MXN, USD, EUR
tipo_cambio            NUMERIC(10,6)    -- Tipo de cambio
descuento              NUMERIC          -- Descuento aplicado
motivo_descuento       TEXT             -- Razón del descuento
```

#### Prioridad BAJA - Tickets (3 campos)
```sql
folio_interno          VARCHAR(50)      -- Folio del ticket
hora_emision           TIME             -- Hora de emisión
telefono_proveedor     VARCHAR(20)      -- Teléfono
```

#### Estructurado - Productos (1 campo JSON)
```sql
detalle_productos      JSONB            -- Array de productos estructurado
```

---

## 🗄️ ESTRUCTURA JSON PARA PRODUCTOS

### Formato Estándar:

```json
{
  "productos": [
    {
      "numero": 1,
      "codigo": "7501234567890",
      "clave_prod_serv": "50202306",
      "descripcion": "COCA COLA 600ML",
      "cantidad": 2,
      "unidad": "PZA",
      "precio_unitario": 15.00,
      "importe": 30.00,
      "descuento": 0
    },
    {
      "numero": 2,
      "codigo": "7501234567891",
      "clave_prod_serv": "10111501",
      "descripcion": "PAN BLANCO BIMBO",
      "cantidad": 1,
      "unidad": "PZA",
      "precio_unitario": 35.00,
      "importe": 35.00,
      "descuento": 0
    }
  ],
  "total_productos": 2,
  "subtotal_productos": 65.00
}
```

---

## 🚀 IMPLEMENTACIÓN - PASO A PASO

### PASO 1: Ejecutar Migración en Supabase (10 minutos)

1. **Abre Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Selecciona tu proyecto
   - Ve a **SQL Editor**

2. **Ejecuta la Migración**
   - Archivo: `/supabase_old/migrations/20251012_add_sat_ocr_fields.sql`
   - Copia TODO el contenido
   - Pega en SQL Editor
   - Haz clic en **RUN**
   - Espera el mensaje de éxito

3. **Verifica los Cambios**

```sql
-- Query de verificación
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'evt_gastos'
  AND column_name IN (
    'uuid_cfdi', 'folio_fiscal', 'serie',
    'tipo_comprobante', 'forma_pago_sat',
    'metodo_pago_sat', 'detalle_productos',
    'moneda', 'lugar_expedicion'
  )
ORDER BY column_name;
```

**Resultado esperado:** 9+ filas

4. **Prueba las Funciones**

```sql
-- Probar función de estadísticas
SELECT * FROM get_ocr_stats_completo();

-- Probar vista completa
SELECT * FROM vw_gastos_ocr_completo LIMIT 3;

-- Probar función de conversión
SELECT convertir_forma_pago_a_sat('efectivo'); -- Debe retornar '01'
SELECT convertir_forma_pago_a_sat('tarjeta'); -- Debe retornar '04'
```

---

### PASO 2: Archivos de Código Ya Listos

Los siguientes archivos **YA ESTÁN ACTUALIZADOS**:

#### ✅ Tipos TypeScript
**Archivo:** `/src/modules/eventos/types/Finance.ts`

**Cambios aplicados:**
- ✅ Interface `Expense` con 15 campos SAT nuevos
- ✅ Interface `OCRMetadata` actualizada
- ✅ Tipo `detalle_productos` como objeto estructurado (no texto plano)
- ✅ Catálogos SAT exportados: `SAT_FORMA_PAGO`, `SAT_METODO_PAGO`, etc.

#### ✅ Parser Inteligente
**Archivo:** `/src/modules/eventos/components/finances/smartTicketParser.ts`

**Funcionalidades:**
- ✅ Corrección de errores OCR (O/0, I/1, comas)
- ✅ Extracción de 20+ campos
- ✅ Validación post-OCR
- ✅ Generación de JSON de productos
- ✅ Categorización automática

---

### PASO 3: Actualizar Formulario (Pendiente)

**Archivo a modificar:** `/src/modules/eventos/components/finances/GoogleVisionExpenseForm.tsx`

**Cambios necesarios:**

#### 3.1 Importar Parser y Tipos

```typescript
import {
  parseSmartMexicanTicket,
  validarYCorregirDatosOCR,
  type ExtendedOCRData
} from './smartTicketParser';
import { SAT_FORMA_PAGO, SAT_METODO_PAGO, type OCRMetadata } from '../../types/Finance';
```

#### 3.2 Actualizar State

```typescript
const [formData, setFormData] = useState({
  // ... campos existentes ...

  // Nuevos campos SAT
  uuid_cfdi: expense?.uuid_cfdi || '',
  folio_fiscal: expense?.folio_fiscal || '',
  forma_pago_sat: expense?.forma_pago_sat || '',
  metodo_pago_sat: expense?.metodo_pago_sat || 'PUE',
  tipo_comprobante: expense?.tipo_comprobante || 'I',
  moneda: expense?.moneda || 'MXN',
  folio_interno: expense?.folio_interno || '',
  hora_emision: expense?.hora_emision || '',
  detalle_productos: expense?.detalle_productos || null,
});

const [ocrMetadata, setOcrMetadata] = useState<OCRMetadata | null>(null);
```

#### 3.3 Reemplazar extractMexicanTicketData

**ELIMINAR:** Función `extractMexicanTicketData` (líneas ~90-232)

**USAR:** En su lugar:

```typescript
// En processGoogleVisionOCR y processTesseractOCR
let datosExtraidos = parseSmartMexicanTicket(text, confidence);
datosExtraidos = validarYCorregirDatosOCR(datosExtraidos);
```

#### 3.4 Función de Auto-completado

```typescript
const autoCompletarFormulario = (datos: ExtendedOCRData, texto: string) => {
  console.log('🎯 Auto-completando formulario con datos SAT');

  // Generar JSON de productos
  const detalle_productos = datos.productos.length > 0 ? {
    productos: datos.productos.map((p, i) => ({
      numero: i + 1,
      codigo: p.codigo,
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
                        SAT_FORMA_PAGO.POR_DEFINIR;

  setFormData(prev => ({
    ...prev,
    // Básicos
    concepto: datos.establecimiento || 'Gasto procesado con OCR',
    proveedor: datos.establecimiento || '',
    rfc_proveedor: datos.rfc || '',
    total: datos.total || 0,
    fecha_gasto: datos.fecha || new Date().toISOString().split('T')[0],

    // Campos SAT
    forma_pago_sat,
    metodo_pago_sat: 'PUE',
    tipo_comprobante: datos.tipo_comprobante === 'factura' ? 'I' : 'I',
    moneda: datos.moneda || 'MXN',
    folio_interno: datos.folio || '',
    hora_emision: datos.hora || '',
    telefono_proveedor: datos.telefono || '',
    descuento: datos.descuento || 0,

    // Productos (JSON)
    detalle_productos
  }));

  // Guardar metadata
  setOcrMetadata({
    texto_completo: texto,
    confianza_general: datos.confianza_total,
    motor_usado: 'google_vision', // ajustar según motor
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
  if (datos.categoria_sugerida.confianza > 0.7 && categories) {
    const cat = categories.find(c =>
      c.nombre.toLowerCase().includes(datos.categoria_sugerida.nombre)
    );
    if (cat) {
      setFormData(prev => ({ ...prev, categoria_id: cat.id }));
    }
  }
};
```

#### 3.5 Actualizar handleSubmit

```typescript
const dataToSave = {
  ...formData,
  // Cálculos
  subtotal,
  iva,
  total,
  cantidad: 1,
  precio_unitario: formData.total,
  evento_id: eventId,

  // Campos SAT
  uuid_cfdi: formData.uuid_cfdi || null,
  folio_fiscal: formData.folio_fiscal || null,
  serie: formData.serie || null,
  tipo_comprobante: formData.tipo_comprobante,
  forma_pago_sat: formData.forma_pago_sat,
  metodo_pago_sat: formData.metodo_pago_sat,
  moneda: formData.moneda,
  tipo_cambio: formData.tipo_cambio || null,
  lugar_expedicion: formData.lugar_expedicion || null,
  descuento: formData.descuento || 0,
  motivo_descuento: formData.motivo_descuento || null,

  // Ticket
  folio_interno: formData.folio_interno,
  hora_emision: formData.hora_emision,
  telefono_proveedor: formData.telefono_proveedor,

  // Productos (JSON)
  detalle_productos: formData.detalle_productos,

  // OCR Metadata
  ocr_confianza: ocrResult?.confianza_general,
  ocr_validado: false,
  ocr_datos_originales: ocrMetadata,

  created_at: expense ? undefined : new Date().toISOString(),
  updated_at: new Date().toISOString()
};

onSave(dataToSave);
```

---

### PASO 4: Agregar UI de Feedback (Opcional)

Después de la sección de OCR Result, agregar:

```tsx
{/* Detalle de Productos Extraídos */}
{formData.detalle_productos && formData.detalle_productos.productos.length > 0 && (
  <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
    <h5 className="font-semibold text-gray-900 mb-3">
      📦 Productos Detectados ({formData.detalle_productos.total_productos})
    </h5>
    <div className="space-y-2">
      {formData.detalle_productos.productos.map((prod, idx) => (
        <div key={idx} className="flex justify-between text-sm border-b pb-2">
          <div>
            <span className="font-medium">{prod.descripcion}</span>
            <span className="text-gray-500 ml-2">
              ({prod.cantidad} x ${prod.precio_unitario.toFixed(2)})
            </span>
          </div>
          <span className="font-semibold">${prod.importe.toFixed(2)}</span>
        </div>
      ))}
      <div className="flex justify-between font-bold text-base pt-2">
        <span>Subtotal Productos:</span>
        <span>${formData.detalle_productos.subtotal_productos.toFixed(2)}</span>
      </div>
    </div>
  </div>
)}

{/* Clasificación SAT */}
{formData.forma_pago_sat && (
  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
    <h5 className="font-semibold text-blue-900 mb-2">🏛️ Clasificación SAT</h5>
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

## 📚 DOCUMENTACIÓN DE REFERENCIA

### Archivos Creados

1. **[ANALISIS_CAMPOS_SAT_OCR.md](ANALISIS_CAMPOS_SAT_OCR.md)**
   - Análisis completo de campos SAT
   - Justificación de cada campo
   - Catálogos del SAT
   - Estructura JSON para productos

2. **[20251012_add_sat_ocr_fields.sql](supabase_old/migrations/20251012_add_sat_ocr_fields.sql)**
   - Migración SQL completa
   - 15 campos nuevos
   - 7 índices
   - 4 funciones auxiliares
   - 2 vistas analytics

3. **[smartTicketParser.ts](src/modules/eventos/components/finances/smartTicketParser.ts)**
   - Parser inteligente (700+ líneas)
   - Corrección de errores OCR
   - Extracción de 20+ campos
   - Validación post-OCR

4. **[Finance.ts](src/modules/eventos/types/Finance.ts)** (actualizado)
   - Interface `Expense` con campos SAT
   - Catálogos SAT exportados
   - Tipo `detalle_productos` estructurado

5. **[EJECUTAR_EN_SUPABASE.md](EJECUTAR_EN_SUPABASE.md)** (obsoleto - usar nueva migración)

6. **Este archivo:** `GUIA_FINAL_OCR_SAT.md`

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Base de Datos
- [ ] Ejecutar migración `20251012_add_sat_ocr_fields.sql` en Supabase
- [ ] Verificar 15 campos nuevos creados
- [ ] Probar función `get_ocr_stats_completo()`
- [ ] Probar vista `vw_gastos_ocr_completo`
- [ ] Probar conversión `convertir_forma_pago_a_sat()`

### TypeScript (Ya Listo)
- [x] Interface `Expense` actualizada
- [x] Tipo `detalle_productos` como JSON
- [x] Catálogos SAT exportados
- [x] Parser `smartTicketParser.ts` creado

### Frontend (Pendiente)
- [ ] Importar parser en `GoogleVisionExpenseForm.tsx`
- [ ] Agregar state para campos SAT
- [ ] Eliminar función `extractMexicanTicketData` vieja
- [ ] Reemplazar con `parseSmartMexicanTicket`
- [ ] Actualizar `autoCompletarFormulario`
- [ ] Actualizar `handleSubmit` con campos SAT
- [ ] Agregar UI de feedback (opcional)

### Testing
- [ ] Probar con ticket OXXO
- [ ] Probar con ticket PEMEX
- [ ] Probar con factura CFDI (si hay)
- [ ] Verificar JSON de productos en BD
- [ ] Verificar códigos SAT guardados correctamente

---

## 📊 EJEMPLO COMPLETO

### Ticket OXXO

**Entrada (Imagen OCR):**
```
OXXO
RFC: NAV8801231J69
TEL: 555-123-4567
FECHA: 12/10/2025  HORA: 14:30
FOLIO: 123456

COCA COLA 600ML      2   $15.00   $30.00
PAN BIMBO            1   $35.00   $35.00

SUBTOTAL             $65.00
IVA 16%              $10.40
TOTAL                $75.40

PAGO: EFECTIVO
```

**Salida (Base de Datos):**
```json
{
  "concepto": "Alimentación",
  "proveedor": "OXXO",
  "rfc_proveedor": "NAV8801231/J69",
  "total": 75.40,
  "subtotal": 65.00,
  "iva": 10.40,
  "fecha_gasto": "2025-10-12",

  // Campos SAT
  "tipo_comprobante": "I",
  "forma_pago_sat": "01",
  "metodo_pago_sat": "PUE",
  "moneda": "MXN",
  "folio_interno": "123456",
  "hora_emision": "14:30:00",
  "telefono_proveedor": "555-123-4567",

  // Productos (JSON)
  "detalle_productos": {
    "productos": [
      {
        "numero": 1,
        "descripcion": "COCA COLA 600ML",
        "cantidad": 2,
        "unidad": "PZA",
        "precio_unitario": 15.00,
        "importe": 30.00
      },
      {
        "numero": 2,
        "descripcion": "PAN BIMBO",
        "cantidad": 1,
        "unidad": "PZA",
        "precio_unitario": 35.00,
        "importe": 35.00
      }
    ],
    "total_productos": 2,
    "subtotal_productos": 65.00
  },

  // OCR
  "ocr_confianza": 95,
  "ocr_validado": false
}
```

---

## 🎯 DIFERENCIAS CLAVE vs Versión Anterior

### ❌ Eliminado (con razón)
- `num_productos` → Se calcula desde JSON
- `propina` → Va incluida en total o como concepto separado
- `metodo_pago_detalle` → Seguridad PCI DSS (no guardar datos de tarjeta)
- `detalle_compra` (texto) → Reemplazado por JSON estructurado

### ✅ Agregado (campos SAT)
- `uuid_cfdi`, `folio_fiscal`, `serie` → Soporte CFDI
- `forma_pago_sat`, `metodo_pago_sat` → Códigos SAT
- `tipo_comprobante` → Catálogo SAT (I, E, T, N, P)
- `detalle_productos` (JSON) → Estructura completa de productos
- `lugar_expedicion`, `moneda`, `tipo_cambio` → Datos fiscales

---

## 🚀 SIGUIENTE PASO

**Después de ejecutar la migración en Supabase:**

1. Actualiza el formulario `GoogleVisionExpenseForm.tsx` siguiendo el PASO 3
2. Prueba con tickets reales
3. Valida que los datos se guarden correctamente en formato JSON
4. Verifica los códigos SAT en la base de datos

---

**¡Todo listo para soportar CFDI 4.0 y tickets mexicanos! 🎉**
