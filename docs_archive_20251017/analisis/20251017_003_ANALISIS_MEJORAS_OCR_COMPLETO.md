# Análisis Completo y Mejoras del Sistema OCR

**Fecha:** 12 de Octubre 2025
**Objetivo:** Revisar sistema OCR y mejorar mapeo automático de datos de tickets/facturas

---

## 1. ANÁLISIS DEL SISTEMA ACTUAL

### 1.1 Arquitectura OCR Actual

El sistema funciona con **3 motores OCR en cascada**:
1. **Google Vision API** (95-98% precisión) - Motor principal
2. **Tesseract.js** (75-85% precisión) - Fallback confiable
3. **OCR.space** (80-90% precisión) - Última opción

**Ubicación:** [bestOCR.ts](src/modules/eventos/components/finances/bestOCR.ts)

### 1.2 Flujo Actual de Extracción

```typescript
Usuario sube imagen
    ↓
bestOCR.ts procesa con 3 motores
    ↓
Retorna texto plano: { text, confidence }
    ↓
GoogleVisionExpenseForm.tsx:90 - extractMexicanTicketData(text)
    ↓
Mapeo manual con regex
    ↓
autoCompletarFormulario(datosExtraidos)
```

### 1.3 Campos Actuales en Base de Datos

**Tabla:** `evt_gastos`

| Campo Existente | Tipo | Uso Actual | Mapeo OCR |
|----------------|------|------------|-----------|
| `concepto` | text | Manual | ❌ No mapeado |
| `descripcion` | text | Manual | ⚠️ Parcial |
| `detalle_compra` | text | **No existe en BD** | ❌ |
| `proveedor` | text | Manual | ✅ Mapeado |
| `rfc_proveedor` | varchar(13) | Manual | ✅ Mapeado |
| `total` | numeric | Manual | ✅ Mapeado |
| `subtotal` | numeric | Calculado | ⚠️ A veces extraído |
| `iva` | numeric | Calculado | ⚠️ A veces extraído |
| `iva_porcentaje` | numeric | Fijo (16%) | ❌ No mapeado |
| `fecha_gasto` | date | Manual | ✅ Mapeado |
| `forma_pago` | varchar(20) | Manual | ⚠️ Parcial |
| `referencia` | text | Manual | ❌ No mapeado |
| `categoria_id` | integer | Manual | ❌ No mapeado |
| `ocr_confianza` | integer | ✅ Existe | ✅ Usado |
| `ocr_validado` | boolean | ✅ Existe | ✅ Usado |
| `ocr_datos_originales` | jsonb | ✅ Existe | ❌ No usado |

---

## 2. PROBLEMAS IDENTIFICADOS

### 🔴 Problema 1: Campo `detalle_compra` No Existe en BD

**Ubicación:** [Finance.ts:42](src/modules/eventos/types/Finance.ts#L42)

```typescript
// TypeScript define el campo
detalle_compra?: string;

// Pero la base de datos NO lo tiene
```

**Impacto:** Los productos extraídos del OCR se pierden.

---

### 🔴 Problema 2: Mapeo Incompleto en `extractMexicanTicketData`

**Ubicación:** [GoogleVisionExpenseForm.tsx:90-232](src/modules/eventos/components/finances/GoogleVisionExpenseForm.tsx#L90-L232)

#### Campos que NO se extraen:
- ❌ **Teléfono del establecimiento**
- ❌ **Folio/Ticket number**
- ❌ **Método de pago detallado** (solo forma genérica)
- ❌ **Moneda** (asume siempre MXN)
- ❌ **Categoría automática** (basada en tipo de establecimiento)
- ❌ **Descuentos**
- ❌ **Propinas**

---

### 🔴 Problema 3: No Usa Campo `ocr_datos_originales`

**Impacto:** Se pierden datos valiosos del OCR original.

**Solución propuesta:** Guardar JSON completo:
```json
{
  "texto_completo": "...",
  "confianza": 95,
  "motor_usado": "google_vision",
  "timestamp": "2025-10-12T10:30:00Z",
  "productos_detectados": [...],
  "metadata": {
    "establecimiento": "OXXO",
    "rfc": "ABC123456XYZ",
    "telefono": "555-1234",
    "folio": "123456"
  }
}
```

---

### 🔴 Problema 4: Generación de Concepto No Es Inteligente

**Actual:**
```typescript
// GoogleVisionExpenseForm.tsx:410
const concepto = datosExtraidos.establecimiento || 'Gasto procesado con OCR';
```

**Debería ser:**
```typescript
const concepto = generarConceptoInteligente(datosExtraidos);
// "OXXO" → "Alimentación y bebidas"
// "PEMEX" → "Combustible y lubricantes"
// "Office Depot" → "Papelería y suministros"
```

---

### 🔴 Problema 5: No Detecta Errores Comunes del OCR

Errores frecuentes:
- `1,895` leído como `1895` (falta punto decimal)
- `O` (letra) confundido con `0` (cero) en números
- `I` (i mayúscula) confundido con `1`
- RFC con `/` mal parseado: `NAV8801231/69` → `NAV880123169`

---

## 3. CAMPOS FALTANTES SUGERIDOS

### 3.1 Nuevos Campos para `evt_gastos`

| Campo Nuevo | Tipo | Descripción | Ejemplo |
|-------------|------|-------------|---------|
| `detalle_compra` | text | **CRÍTICO** - Productos detallados | `"1x Coca Cola $15.00\n2x Pan $10.00"` |
| `telefono_proveedor` | varchar(20) | Teléfono del establecimiento | `"555-1234-5678"` |
| `folio_ticket` | varchar(50) | Número de folio/ticket | `"TICKET-123456"` |
| `moneda` | varchar(3) | Código de moneda ISO | `"MXN"`, `"USD"` |
| `tipo_comprobante` | varchar(20) | Tipo de documento | `"ticket"`, `"factura"`, `"nota"` |
| `descuento` | numeric | Descuento aplicado | `50.00` |
| `propina` | numeric | Propina incluida | `20.00` |
| `metodo_pago_detalle` | varchar(50) | Detalles del pago | `"VISA **** 1234"` |
| `num_productos` | integer | Cantidad de productos | `5` |
| `hora_compra` | time | Hora de la compra | `"14:30:00"` |

### 3.2 Mejora de Campos Existentes

| Campo Actual | Mejora Propuesta |
|--------------|------------------|
| `forma_pago` | Agregar: `"debito"`, `"credito"`, `"vales"` |
| `referencia` | Auto-llenar con folio del ticket |
| `categoria_id` | Auto-asignar con IA basada en establecimiento |

---

## 4. MEJORAS PROPUESTAS AL PARSER

### 4.1 Nuevo Parser Mejorado

**Archivo:** `src/modules/eventos/components/finances/smartTicketParser.ts`

```typescript
interface ExtendedOCRData {
  // Datos básicos
  establecimiento: string | null;
  rfc: string | null;
  telefono: string | null;
  direccion: string | null;

  // Datos temporales
  fecha: string | null;
  hora: string | null;
  folio: string | null;

  // Datos monetarios
  total: number | null;
  subtotal: number | null;
  iva: number | null;
  iva_porcentaje: number | null;
  descuento: number | null;
  propina: number | null;
  moneda: string;

  // Pago
  forma_pago: string | null;
  metodo_pago_detalle: string | null;
  ultimos_digitos_tarjeta: string | null;

  // Productos
  productos: Array<{
    codigo?: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal_producto: number;
    descuento?: number;
  }>;

  // Metadata
  tipo_comprobante: 'ticket' | 'factura' | 'nota' | 'otro';
  confianza_total: number;
  campos_detectados: string[];
  campos_fallidos: string[];
}

/**
 * Parser inteligente de tickets mexicanos
 * Detecta y corrige errores comunes del OCR
 */
export function parseSmartMexicanTicket(text: string, confidence: number): ExtendedOCRData {
  // Implementación completa más abajo
}
```

### 4.2 Detección de Errores Comunes

```typescript
/**
 * Corrige errores típicos del OCR
 */
function corregirErroresOCR(text: string): string {
  let corrected = text;

  // 1. Corregir confusión O/0 en números
  corrected = corrected.replace(/\b([A-Z]{3,4})O(\d{6})/g, '$10$2'); // RFC
  corrected = corrected.replace(/\$(\d+)O(\d+)/g, '$$$1o$2'); // Montos

  // 2. Corregir I/1 en números
  corrected = corrected.replace(/\$(\d+)I(\d+)/g, '$$$11$2');

  // 3. Normalizar formatos de fecha
  corrected = corrected.replace(/(\d{2})-(\d{2})-(\d{4})/g, '$1/$2/$3');

  // 4. Corregir espacios en RFC
  corrected = corrected.replace(/([A-Z]{3,4})\s+(\d{6})/g, '$1$2');

  // 5. Normalizar montos con comas
  // 1,895.00 debe reconocerse correctamente

  return corrected;
}
```

### 4.3 Categorización Automática Inteligente

```typescript
/**
 * Determina categoría de gasto basada en establecimiento
 */
function determinarCategoriaAutomatica(establecimiento: string): {
  categoria_id: number | null;
  categoria_nombre: string;
  confianza: number;
} {
  const establecimientoLower = establecimiento.toLowerCase();

  // Patrones de establecimientos conocidos
  const patrones = {
    'alimentacion': [
      /oxxo/i, /7-?eleven/i, /soriana/i, /walmart/i, /superama/i,
      /restaurante/i, /cafe/i, /tortas/i, /tacos/i
    ],
    'combustible': [
      /pemex/i, /shell/i, /bp/i, /mobil/i, /gasolinera/i
    ],
    'papeleria': [
      /office\s*depot/i, /lumen/i, /papeleria/i
    ],
    'servicios': [
      /hotel/i, /renta/i, /servicio/i
    ],
    'transporte': [
      /uber/i, /taxi/i, /didi/i, /transporte/i, /caseta/i
    ]
  };

  for (const [categoria, patterns] of Object.entries(patrones)) {
    for (const pattern of patterns) {
      if (pattern.test(establecimientoLower)) {
        return {
          categoria_id: getCategoriaId(categoria),
          categoria_nombre: categoria,
          confianza: 0.9
        };
      }
    }
  }

  return {
    categoria_id: null,
    categoria_nombre: 'sin_clasificar',
    confianza: 0
  };
}
```

---

## 5. GENERADOR DE DETALLE DE COMPRA

```typescript
/**
 * Genera resumen estructurado de productos para campo detalle_compra
 */
function generarDetalleCompra(productos: Array<{
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

**Ejemplo de salida:**
```
=== DETALLE DE COMPRA ===

1. COCA COLA 600ML
   Cantidad: 2
   Precio unitario: $15.00
   Subtotal: $30.00

2. PAN BLANCO BIMBO
   Cantidad: 1
   Precio unitario: $35.00
   Subtotal: $35.00

─────────────────────────
Total productos: 2
Total: $65.00
```

---

## 6. MIGRACIÓN SQL COMPLETA

**Archivo:** `supabase_old/migrations/20251012_add_ocr_enhanced_fields.sql`

```sql
-- ============================================
-- Migración: Campos Mejorados para OCR
-- Fecha: 2025-10-12
-- Descripción: Agrega campos faltantes para
--              captura completa de datos OCR
-- ============================================

-- 1. Agregar campos nuevos a evt_gastos
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS detalle_compra TEXT,
  ADD COLUMN IF NOT EXISTS telefono_proveedor VARCHAR(20),
  ADD COLUMN IF NOT EXISTS folio_ticket VARCHAR(50),
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(20) DEFAULT 'ticket',
  ADD COLUMN IF NOT EXISTS descuento NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS propina NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metodo_pago_detalle VARCHAR(50),
  ADD COLUMN IF NOT EXISTS num_productos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hora_compra TIME;

-- 2. Agregar índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_evt_gastos_folio_ticket
  ON evt_gastos(folio_ticket);

CREATE INDEX IF NOT EXISTS idx_evt_gastos_telefono_proveedor
  ON evt_gastos(telefono_proveedor);

CREATE INDEX IF NOT EXISTS idx_evt_gastos_tipo_comprobante
  ON evt_gastos(tipo_comprobante);

-- 3. Agregar comentarios descriptivos
COMMENT ON COLUMN evt_gastos.detalle_compra IS
  'Resumen estructurado de productos extraídos del ticket/factura';

COMMENT ON COLUMN evt_gastos.telefono_proveedor IS
  'Teléfono del establecimiento extraído del ticket';

COMMENT ON COLUMN evt_gastos.folio_ticket IS
  'Número de folio/ticket del comprobante';

COMMENT ON COLUMN evt_gastos.tipo_comprobante IS
  'Tipo de comprobante: ticket, factura, nota, otro';

COMMENT ON COLUMN evt_gastos.metodo_pago_detalle IS
  'Detalles del método de pago (últimos dígitos de tarjeta, banco, etc)';

-- 4. Agregar constraint para tipo_comprobante
ALTER TABLE evt_gastos
  ADD CONSTRAINT check_tipo_comprobante
  CHECK (tipo_comprobante IN ('ticket', 'factura', 'nota', 'otro'));

-- 5. Ampliar forma_pago para incluir más opciones
COMMENT ON COLUMN evt_gastos.forma_pago IS
  'Forma de pago: efectivo, transferencia, cheque, tarjeta, debito, credito, vales';

-- 6. Función trigger para auto-calcular num_productos desde detalle_compra
CREATE OR REPLACE FUNCTION calcular_num_productos()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.detalle_compra IS NOT NULL THEN
    -- Contar líneas con formato "1. PRODUCTO"
    NEW.num_productos := (
      SELECT COUNT(*)
      FROM regexp_split_to_table(NEW.detalle_compra, E'\n') AS line
      WHERE line ~ '^\d+\.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_num_productos
  BEFORE INSERT OR UPDATE ON evt_gastos
  FOR EACH ROW
  EXECUTE FUNCTION calcular_num_productos();

-- 7. Vista para análisis de gastos con OCR
CREATE OR REPLACE VIEW vw_gastos_ocr_analytics AS
SELECT
  g.id,
  g.evento_id,
  g.concepto,
  g.proveedor,
  g.total,
  g.num_productos,
  g.ocr_confianza,
  g.ocr_validado,
  g.tipo_comprobante,
  g.forma_pago,
  g.created_at,
  CASE
    WHEN g.ocr_confianza >= 90 THEN 'alta'
    WHEN g.ocr_confianza >= 70 THEN 'media'
    ELSE 'baja'
  END AS calidad_ocr,
  e.clave_evento,
  e.nombre_proyecto
FROM evt_gastos g
LEFT JOIN evt_eventos e ON g.evento_id = e.id
WHERE g.ocr_confianza IS NOT NULL;

COMMENT ON VIEW vw_gastos_ocr_analytics IS
  'Vista analítica de gastos procesados con OCR';
```

---

## 7. ACTUALIZACIÓN DE TIPOS TYPESCRIPT

**Archivo:** `src/modules/eventos/types/Finance.ts`

```typescript
export interface Expense {
  id: string;
  evento_id: string;
  categoria_id?: string;
  concepto: string;
  descripcion?: string;

  // ====== CAMPOS OCR MEJORADOS ======
  detalle_compra?: string;          // NUEVO: Resumen estructurado de productos
  telefono_proveedor?: string;      // NUEVO: Teléfono del establecimiento
  folio_ticket?: string;            // NUEVO: Folio del ticket/factura
  moneda?: string;                  // NUEVO: Moneda (MXN, USD, etc)
  tipo_comprobante?: 'ticket' | 'factura' | 'nota' | 'otro'; // NUEVO
  descuento?: number;               // NUEVO: Descuento aplicado
  propina?: number;                 // NUEVO: Propina incluida
  metodo_pago_detalle?: string;     // NUEVO: Detalles del método de pago
  num_productos?: number;           // NUEVO: Cantidad de productos
  hora_compra?: string;             // NUEVO: Hora de la compra
  // ==================================

  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  iva_porcentaje: number;
  iva: number;
  total: number;
  proveedor?: string;
  rfc_proveedor?: string;
  fecha_gasto: string;
  forma_pago: 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'debito' | 'credito' | 'vales';
  referencia?: string;
  documento_url?: string;

  // Approval workflow
  status_aprobacion: 'pendiente' | 'aprobado' | 'rechazado';
  aprobado_por?: string;
  fecha_aprobacion?: string;

  // File attachment
  archivo_adjunto?: string;
  archivo_nombre?: string;
  archivo_tamaño?: number;
  archivo_tipo?: string;

  // OCR metadata
  ocr_confianza?: number;
  ocr_validado?: boolean;
  ocr_datos_originales?: OCRMetadata;

  // Soft delete
  notas?: string;
  deleted_at?: string;
  deleted_by?: string;
  delete_reason?: string;

  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relations
  categoria?: ExpenseCategory;
}

// NUEVO: Tipo para metadata OCR completa
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

---

## 8. IMPLEMENTACIÓN COMPLETA DEL PARSER

**Archivo:** `src/modules/eventos/components/finances/smartTicketParser.ts`

```typescript
/**
 * Smart Mexican Ticket Parser
 * Extracción inteligente de datos de tickets/facturas mexicanas
 * Con corrección automática de errores comunes del OCR
 */

export interface ProductoDetallado {
  codigo?: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_producto: number;
  descuento?: number;
  linea_original: string;
}

export interface ExtendedOCRData {
  // Datos del establecimiento
  establecimiento: string | null;
  rfc: string | null;
  telefono: string | null;
  direccion: string | null;

  // Datos temporales
  fecha: string | null;
  hora: string | null;
  folio: string | null;

  // Datos monetarios
  total: number | null;
  subtotal: number | null;
  iva: number | null;
  iva_porcentaje: number | null;
  descuento: number | null;
  propina: number | null;
  moneda: string;

  // Pago
  forma_pago: string | null;
  metodo_pago_detalle: string | null;
  ultimos_digitos_tarjeta: string | null;

  // Productos
  productos: ProductoDetallado[];

  // Metadata
  tipo_comprobante: 'ticket' | 'factura' | 'nota' | 'otro';
  confianza_total: number;
  campos_detectados: string[];
  campos_fallidos: string[];
  categoria_sugerida: {
    nombre: string;
    confianza: number;
  };
}

/**
 * Parser principal - Extrae todos los datos posibles del ticket
 */
export function parseSmartMexicanTicket(
  text: string,
  confidence: number
): ExtendedOCRData {

  // 1. Pre-procesar y corregir errores comunes
  const textCorregido = corregirErroresOCR(text);
  const lines = textCorregido.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // 2. Inicializar estructura de datos
  const data: ExtendedOCRData = {
    establecimiento: null,
    rfc: null,
    telefono: null,
    direccion: null,
    fecha: null,
    hora: null,
    folio: null,
    total: null,
    subtotal: null,
    iva: null,
    iva_porcentaje: null,
    descuento: null,
    propina: null,
    moneda: 'MXN',
    forma_pago: null,
    metodo_pago_detalle: null,
    ultimos_digitos_tarjeta: null,
    productos: [],
    tipo_comprobante: 'ticket',
    confianza_total: confidence,
    campos_detectados: [],
    campos_fallidos: [],
    categoria_sugerida: { nombre: 'sin_clasificar', confianza: 0 }
  };

  // 3. Extraer cada campo
  data.establecimiento = extraerEstablecimiento(lines);
  data.rfc = extraerRFC(textCorregido);
  data.telefono = extraerTelefono(textCorregido);
  data.direccion = extraerDireccion(lines);
  data.fecha = extraerFecha(textCorregido);
  data.hora = extraerHora(textCorregido);
  data.folio = extraerFolio(textCorregido);

  // Datos monetarios
  const datosMonetarios = extraerDatosMonetarios(textCorregido);
  Object.assign(data, datosMonetarios);

  // Forma de pago
  const datosPago = extraerDatosPago(textCorregido);
  Object.assign(data, datosPago);

  // Productos
  data.productos = extraerProductos(lines, data.total || 0);

  // Determinar tipo de comprobante
  data.tipo_comprobante = determinarTipoComprobante(textCorregido);

  // Categoría sugerida
  if (data.establecimiento) {
    data.categoria_sugerida = determinarCategoriaAutomatica(data.establecimiento);
  }

  // 4. Validar campos detectados
  data.campos_detectados = Object.keys(data).filter(key =>
    data[key as keyof ExtendedOCRData] !== null &&
    data[key as keyof ExtendedOCRData] !== undefined &&
    !['campos_detectados', 'campos_fallidos', 'confianza_total'].includes(key)
  );

  data.campos_fallidos = Object.keys(data).filter(key =>
    data[key as keyof ExtendedOCRData] === null &&
    !['campos_detectados', 'campos_fallidos', 'confianza_total', 'productos'].includes(key)
  );

  return data;
}

/**
 * Corrige errores típicos del OCR
 */
function corregirErroresOCR(text: string): string {
  let corrected = text;

  // Errores O/0
  corrected = corrected.replace(/([A-Z]{3,4})O(\d{6})/g, '$10$2');
  corrected = corrected.replace(/\$(\d+)O(\d+)/g, '$$$10$2');

  // Errores I/1
  corrected = corrected.replace(/\$(\d+)I(\d+)/g, '$$$11$2');
  corrected = corrected.replace(/([A-Z]{3,4}\d{6}[A-Z0-9]{2})I(\d)/g, '$11$2');

  // Normalizar fechas
  corrected = corrected.replace(/(\d{2})-(\d{2})-(\d{4})/g, '$1/$2/$3');

  // Espacios en RFC
  corrected = corrected.replace(/([A-Z]{3,4})\s+(\d{6})/g, '$1$2');

  // Normalizar simbolo de pesos
  corrected = corrected.replace(/\$/g, '$');

  return corrected;
}

/**
 * Extrae el nombre del establecimiento
 */
function extraerEstablecimiento(lines: string[]): string | null {
  // Buscar en las primeras 5 líneas
  for (const line of lines.slice(0, 5)) {
    // Debe tener más de 3 caracteres
    if (line.length < 3) continue;

    // Excluir líneas con patrones comunes de no-establecimiento
    if (
      /^\d+$/.test(line) || // Solo números
      /RFC|TEL|FECHA|HORA|TOTAL|SUBTOTAL|IVA|TICKET|FOLIO/i.test(line) ||
      /^\$/.test(line) || // Empieza con $
      /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(line) // Fecha
    ) {
      continue;
    }

    // Es probablemente el establecimiento
    return line.toUpperCase().trim();
  }

  return null;
}

/**
 * Extrae RFC con formato correcto (incluyendo /)
 */
function extraerRFC(text: string): string | null {
  // Patrón RFC mexicano: 3-4 letras + 6 dígitos + 3 caracteres alfanuméricos
  const patterns = [
    /RFC[:\s]*([A-Z]{3,4}\d{6}[A-Z0-9]{3})/i,
    /\b([A-Z]{3,4}\d{6}[A-Z0-9]{3})\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let rfc = match[1].toUpperCase();

      // Insertar / antes de los últimos 3 caracteres si no existe
      if (!rfc.includes('/') && rfc.length === 13) {
        rfc = rfc.slice(0, 12) + '/' + rfc.slice(12);
      }

      return rfc;
    }
  }

  return null;
}

/**
 * Extrae teléfono
 */
function extraerTelefono(text: string): string | null {
  const patterns = [
    /(?:TEL|TELEFONO|PHONE)[:\s]*([0-9\-\s\(\)]+)/i,
    /(\d{3}[-\s]?\d{3}[-\s]?\d{4})/,
    /(\(\d{3}\)\s*\d{3}[-\s]?\d{4})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extrae dirección (líneas después del establecimiento)
 */
function extraerDireccion(lines: string[]): string | null {
  // Buscar líneas que parezcan direcciones
  for (const line of lines.slice(1, 8)) {
    if (
      /(?:CALLE|AVENIDA|AV\.|BOULEVARD|BLVD|COL\.|COLONIA)/i.test(line) ||
      /\d{5}/.test(line) // Código postal
    ) {
      return line.trim();
    }
  }

  return null;
}

/**
 * Extrae fecha
 */
function extraerFecha(text: string): string | null {
  const patterns = [
    /(?:FECHA[:\s]*)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Convertir a formato yyyy-mm-dd
      let fecha = match[1];
      const parts = fecha.split(/[\/\-]/);

      if (parts[0].length === 4) {
        // Ya está en formato yyyy-mm-dd
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        // Formato dd/mm/yyyy
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  return null;
}

/**
 * Extrae hora
 */
function extraerHora(text: string): string | null {
  const patterns = [
    /(?:HORA[:\s]*)?(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extrae folio/ticket number
 */
function extraerFolio(text: string): string | null {
  const patterns = [
    /(?:FOLIO|TICKET|NO\.?\s*TICKET)[:\s#]*(\w+)/i,
    /(?:FACTURA|INVOICE)[:\s#]*([A-Z0-9\-]+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extrae datos monetarios (total, subtotal, IVA, etc.)
 */
function extraerDatosMonetarios(text: string): Partial<ExtendedOCRData> {
  const resultado: Partial<ExtendedOCRData> = {
    total: null,
    subtotal: null,
    iva: null,
    iva_porcentaje: null,
    descuento: null,
    propina: null
  };

  // Total
  const totalPatterns = [
    /TOTAL[:\s]*\$?\s*([0-9,]+\.?\d*)/i,
    /IMPORTE[:\s]*\$?\s*([0-9,]+\.?\d*)/i
  ];

  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      resultado.total = parseMontoSeguro(match[1]);
      break;
    }
  }

  // Subtotal
  const subtotalMatch = text.match(/(?:SUBTOTAL|SUB-TOTAL)[:\s]*\$?\s*([0-9,]+\.?\d*)/i);
  if (subtotalMatch) {
    resultado.subtotal = parseMontoSeguro(subtotalMatch[1]);
  }

  // IVA
  const ivaMatch = text.match(/IVA[:\s]*\$?\s*([0-9,]+\.?\d*)/i);
  if (ivaMatch) {
    resultado.iva = parseMontoSeguro(ivaMatch[1]);

    // Calcular porcentaje de IVA si tenemos subtotal
    if (resultado.subtotal && resultado.iva) {
      resultado.iva_porcentaje = (resultado.iva / resultado.subtotal) * 100;
    }
  }

  // Descuento
  const descuentoMatch = text.match(/DESCUENTO[:\s]*\$?\s*([0-9,]+\.?\d*)/i);
  if (descuentoMatch) {
    resultado.descuento = parseMontoSeguro(descuentoMatch[1]);
  }

  // Propina
  const propinaMatch = text.match(/PROPINA[:\s]*\$?\s*([0-9,]+\.?\d*)/i);
  if (propinaMatch) {
    resultado.propina = parseMontoSeguro(propinaMatch[1]);
  }

  return resultado;
}

/**
 * Parsea monto de manera segura manejando comas y puntos
 */
function parseMontoSeguro(montoStr: string): number | null {
  try {
    // Remover espacios
    let cleaned = montoStr.trim();

    // Si tiene comas Y puntos, las comas son separadores de miles
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/,/g, '');
    }
    // Si solo tiene comas, pueden ser decimales o separadores
    else if (cleaned.includes(',')) {
      // Si formato ###,## (2 dígitos después), es decimal
      if (/,\d{2}$/.test(cleaned)) {
        cleaned = cleaned.replace(',', '.');
      } else {
        // Son separadores de miles
        cleaned = cleaned.replace(/,/g, '');
      }
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Extrae datos de pago
 */
function extraerDatosPago(text: string): Partial<ExtendedOCRData> {
  const resultado: Partial<ExtendedOCRData> = {
    forma_pago: null,
    metodo_pago_detalle: null,
    ultimos_digitos_tarjeta: null
  };

  // Forma de pago
  const pagoPatterns = [
    { pattern: /EFECTIVO/i, valor: 'efectivo' },
    { pattern: /TARJETA\s*(?:DE\s*)?DEBITO/i, valor: 'debito' },
    { pattern: /TARJETA\s*(?:DE\s*)?CREDITO/i, valor: 'credito' },
    { pattern: /TRANSFERENCIA/i, valor: 'transferencia' },
    { pattern: /CHEQUE/i, valor: 'cheque' },
    { pattern: /VALES/i, valor: 'vales' }
  ];

  for (const { pattern, valor } of pagoPatterns) {
    if (pattern.test(text)) {
      resultado.forma_pago = valor;
      break;
    }
  }

  // Últimos dígitos de tarjeta
  const tarjetaMatch = text.match(/(?:TARJETA|CARD).*?(\d{4})/i);
  if (tarjetaMatch) {
    resultado.ultimos_digitos_tarjeta = tarjetaMatch[1];
    resultado.metodo_pago_detalle = `Tarjeta ****${tarjetaMatch[1]}`;
  }

  return resultado;
}

/**
 * Extrae productos del ticket
 */
function extraerProductos(lines: string[], totalTicket: number): ProductoDetallado[] {
  const productos: ProductoDetallado[] = [];

  // Patrones de línea de producto
  const patronesProducto = [
    // "COCA COLA 2 $15.00"
    /^(.+?)\s+(\d+)\s+\$?\s*([0-9,]+\.?\d*)$/,
    // "2 COCA COLA $15.00"
    /^(\d+)\s+(.+?)\s+\$?\s*([0-9,]+\.?\d*)$/,
    // "COCA COLA $15.00"
    /^(.+?)\s+\$?\s*([0-9,]+\.?\d*)$/
  ];

  for (const line of lines) {
    // Saltar líneas con palabras clave que no son productos
    if (/TOTAL|SUBTOTAL|IVA|CAMBIO|FECHA|HORA|FOLIO|RFC/i.test(line)) {
      continue;
    }

    for (const patron of patronesProducto) {
      const match = line.match(patron);
      if (match) {
        let producto: ProductoDetallado;

        if (patron === patronesProducto[0]) {
          // Nombre Cantidad Precio
          producto = {
            nombre: match[1].trim(),
            cantidad: parseInt(match[2]),
            precio_unitario: parseMontoSeguro(match[3]) || 0,
            subtotal_producto: 0,
            linea_original: line
          };
        } else if (patron === patronesProducto[1]) {
          // Cantidad Nombre Precio
          producto = {
            nombre: match[2].trim(),
            cantidad: parseInt(match[1]),
            precio_unitario: parseMontoSeguro(match[3]) || 0,
            subtotal_producto: 0,
            linea_original: line
          };
        } else {
          // Nombre Precio (cantidad = 1)
          producto = {
            nombre: match[1].trim(),
            cantidad: 1,
            precio_unitario: parseMontoSeguro(match[2]) || 0,
            subtotal_producto: 0,
            linea_original: line
          };
        }

        producto.subtotal_producto = producto.cantidad * producto.precio_unitario;
        productos.push(producto);
        break;
      }
    }
  }

  // Validación: suma de productos debe ser cercana al total
  if (productos.length > 0 && totalTicket > 0) {
    const sumaProductos = productos.reduce((sum, p) => sum + p.subtotal_producto, 0);
    const diferencia = Math.abs(sumaProductos - totalTicket);

    // Si la diferencia es mayor al 20%, probablemente los productos están mal
    if (diferencia / totalTicket > 0.2) {
      console.warn('⚠️ Suma de productos no coincide con total del ticket');
    }
  }

  return productos;
}

/**
 * Determina tipo de comprobante
 */
function determinarTipoComprobante(text: string): 'ticket' | 'factura' | 'nota' | 'otro' {
  if (/FACTURA/i.test(text)) return 'factura';
  if (/NOTA/i.test(text)) return 'nota';
  if (/TICKET/i.test(text)) return 'ticket';
  return 'otro';
}

/**
 * Determina categoría automática basada en establecimiento
 */
function determinarCategoriaAutomatica(establecimiento: string): {
  nombre: string;
  confianza: number;
} {
  const establecimientoLower = establecimiento.toLowerCase();

  const patrones: Record<string, RegExp[]> = {
    'alimentacion': [
      /oxxo/i, /7-?eleven/i, /soriana/i, /walmart/i, /superama/i,
      /restaurante/i, /cafe/i, /tortas/i, /tacos/i, /comida/i
    ],
    'combustible': [
      /pemex/i, /shell/i, /bp/i, /mobil/i, /gasolinera/i, /gas/i
    ],
    'papeleria': [
      /office\s*depot/i, /lumen/i, /papeleria/i, /office/i
    ],
    'servicios': [
      /hotel/i, /renta/i, /servicio/i
    ],
    'transporte': [
      /uber/i, /taxi/i, /didi/i, /transporte/i, /caseta/i
    ]
  };

  for (const [categoria, patterns] of Object.entries(patrones)) {
    for (const pattern of patterns) {
      if (pattern.test(establecimientoLower)) {
        return {
          nombre: categoria,
          confianza: 0.9
        };
      }
    }
  }

  return {
    nombre: 'sin_clasificar',
    confianza: 0
  };
}
```

---

## 9. INTEGRACIÓN EN GoogleVisionExpenseForm

**Actualizar:** [GoogleVisionExpenseForm.tsx:260-460](src/modules/eventos/components/finances/GoogleVisionExpenseForm.tsx#L260-L460)

```typescript
// Reemplazar función extractMexicanTicketData con:
import { parseSmartMexicanTicket, generarDetalleCompra } from './smartTicketParser';

// En processGoogleVisionOCR (línea 294)
const datosExtraidos = parseSmartMexicanTicket(text, 95);

// En processTesseractOCR (línea 381)
const datosExtraidos = parseSmartMexicanTicket(text, confidence);

// Nueva función de auto-completado mejorada
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
    telefono_proveedor: datos.telefono,
    folio_ticket: datos.folio,
    tipo_comprobante: datos.tipo_comprobante,
    descuento: datos.descuento,
    propina: datos.propina,
    metodo_pago_detalle: datos.metodo_pago_detalle,
    num_productos: datos.productos.length,
    hora_compra: datos.hora,

    // Descripción con información relevante
    descripcion: datos.direccion || prev.descripcion
  }));

  // Guardar metadata completa en campo especial
  setOcrMetadata({
    texto_completo: text,
    confianza_general: datos.confianza_total,
    motor_usado: 'google_vision',
    timestamp: new Date().toISOString(),
    productos_detectados: datos.productos,
    metadata_adicional: {
      establecimiento: datos.establecimiento,
      rfc: datos.rfc,
      telefono: datos.telefono,
      direccion: datos.direccion,
      folio: datos.folio,
      hora: datos.hora
    },
    campos_confianza: {},
    errores_detectados: datos.campos_fallidos
  });

  // Sugerir categoría si está disponible
  if (datos.categoria_sugerida.confianza > 0.7) {
    // Buscar ID de categoría
    const categoriaEncontrada = categories?.find(cat =>
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

---

## 10. MITIGACIÓN DE ERRORES COMUNES

### 10.1 Validaciones Post-OCR

```typescript
/**
 * Valida y corrige datos extraídos del OCR
 */
function validarYCorregirDatosOCR(datos: ExtendedOCRData): ExtendedOCRData {
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
    if (diferencia > validado.total * 0.1) { // Más de 10% de diferencia
      console.warn('⚠️ Total del ticket no coincide con suma de productos');
      console.warn(`Total: ${validado.total}, Suma: ${sumaProductos}`);
    }
  }

  // 3. Validar subtotal + IVA = total
  if (validado.subtotal && validado.iva && validado.total) {
    const calculado = validado.subtotal + validado.iva;
    const diferencia = Math.abs(calculado - validado.total);

    if (diferencia > 1) { // Diferencia de más de $1
      console.warn('⚠️ Subtotal + IVA no coincide con total');
      // Intentar recalcular
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

  // 5. Validar teléfono
  if (validado.telefono) {
    const telefonoLimpio = validado.telefono.replace(/\D/g, '');
    if (telefonoLimpio.length < 10) {
      console.warn('⚠️ Teléfono muy corto:', validado.telefono);
      validado.campos_fallidos.push('telefono');
    }
  }

  return validado;
}
```

### 10.2 Feedback Visual al Usuario

Agregar indicadores en el formulario:

```tsx
{ocrResult && ocrResult.success && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
    <h4 className="font-semibold mb-2">📊 Análisis de Confianza OCR</h4>

    {/* Campos detectados */}
    <div className="mb-2">
      <span className="text-sm font-medium">✅ Campos detectados ({ocrResult.datos_extraidos.campos_detectados.length}):</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {ocrResult.datos_extraidos.campos_detectados.map(campo => (
          <span key={campo} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
            {campo}
          </span>
        ))}
      </div>
    </div>

    {/* Campos fallidos */}
    {ocrResult.datos_extraidos.campos_fallidos.length > 0 && (
      <div>
        <span className="text-sm font-medium">⚠️ Campos no detectados ({ocrResult.datos_extraidos.campos_fallidos.length}):</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {ocrResult.datos_extraidos.campos_fallidos.map(campo => (
            <span key={campo} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
              {campo}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Categoría sugerida */}
    {ocrResult.datos_extraidos.categoria_sugerida.confianza > 0.7 && (
      <div className="mt-2">
        <span className="text-sm">
          💡 <strong>Categoría sugerida:</strong> {ocrResult.datos_extraidos.categoria_sugerida.nombre}
          ({Math.round(ocrResult.datos_extraidos.categoria_sugerida.confianza * 100)}% confianza)
        </span>
      </div>
    )}
  </div>
)}
```

---

## 11. PLAN DE IMPLEMENTACIÓN

### Fase 1: Base de Datos (1 día)
1. ✅ Ejecutar migración SQL
2. ✅ Verificar campos nuevos en Supabase
3. ✅ Probar constraints y triggers

### Fase 2: Backend Types (0.5 días)
1. ✅ Actualizar `Finance.ts` con nuevos campos
2. ✅ Crear tipo `OCRMetadata`
3. ✅ Actualizar interfaces de formularios

### Fase 3: Smart Parser (2 días)
1. ✅ Crear `smartTicketParser.ts`
2. ✅ Implementar todas las funciones de extracción
3. ✅ Crear función de validación
4. ✅ Probar con tickets reales

### Fase 4: Integración en Formulario (1 día)
1. ✅ Reemplazar `extractMexicanTicketData`
2. ✅ Actualizar `autoCompletarFormulario`
3. ✅ Agregar campos nuevos al formulario
4. ✅ Implementar feedback visual

### Fase 5: Testing (1 día)
1. ✅ Probar con 10+ tickets diferentes
2. ✅ Validar precisión de extracción
3. ✅ Corregir edge cases
4. ✅ Documentar casos problemáticos

**Total estimado: 5-6 días**

---

## 12. CASOS DE PRUEBA

### Ticket 1: OXXO Simple
```
OXXO
NAVB801231J69
TEL: 555-1234-5678
FECHA: 12/10/2025 HORA: 14:30
FOLIO: 123456

COCA COLA 600ML      2   $15.00   $30.00
PAN BIMBO            1   $35.00   $35.00

SUBTOTAL             $65.00
IVA 16%              $10.40
TOTAL                $75.40

PAGO: EFECTIVO
```

**Esperado:**
- ✅ Establecimiento: OXXO
- ✅ RFC: NAVB801231/J69
- ✅ Teléfono: 555-1234-5678
- ✅ Total: 75.40
- ✅ 2 productos detectados
- ✅ Categoría: Alimentación

### Ticket 2: PEMEX
```
GASOLINERA PEMEX
RFC: PEM890101ABC
FECHA: 12/10/2025

MAGNA          38.5L  $23.50  $904.75
SERVICIO                       $10.00

SUBTOTAL                      $914.75
IVA                          $146.36
TOTAL                      $1,061.11

TARJETA ****1234
```

**Esperado:**
- ✅ Total: 1061.11 (manejo de coma como separador de miles)
- ✅ Forma de pago: tarjeta
- ✅ Últimos dígitos: 1234
- ✅ Categoría: Combustible

---

## 13. RECOMENDACIONES FINALES

### 🔥 CRÍTICO - Hacer Ahora
1. **Ejecutar migración SQL** para agregar `detalle_compra` y campos nuevos
2. **Implementar `smartTicketParser.ts`** completo
3. **Guardar `ocr_datos_originales`** en cada gasto

### ⚠️ IMPORTANTE - Esta Semana
1. Mejorar detección de productos
2. Validación post-OCR
3. Feedback visual al usuario
4. Categorización automática

### 💡 MEJORAS FUTURAS
1. Machine Learning para mejorar precisión
2. Base de datos de establecimientos conocidos
3. Histórico de correcciones del usuario
4. Sugerencias inteligentes basadas en gastos previos
5. Exportación de reportes de precisión OCR

---

## 14. MÉTRICAS DE ÉXITO

### KPIs a Medir
- **Tasa de éxito OCR:** >90% de campos extraídos correctamente
- **Tiempo de procesamiento:** <5 segundos promedio
- **Correcciones manuales:** <20% de gastos requieren edición
- **Satisfacción del usuario:** Encuesta post-uso

### Dashboard de Analytics
Crear vista para monitorear:
- Precisión por motor OCR
- Campos más problemáticos
- Tipos de establecimientos con mejores resultados
- Errores comunes y frecuencia

---

**FIN DEL ANÁLISIS**

Este documento proporciona una hoja de ruta completa para mejorar significativamente el sistema OCR existente, con enfoque en la captura automática y precisa de datos de tickets y facturas mexicanas.
