# 🤖 MÓDULO OCR INTELIGENTE - CLASIFICADOR CONTABLE

## 📋 ¿Qué es este módulo?

Un sistema inteligente de reconocimiento óptico de caracteres (OCR) que **automáticamente clasifica documentos contables** en dos categorías principales:

- **💸 GASTOS**: Tickets de compra, facturas recibidas, comprobantes de pago a proveedores
- **💰 INGRESOS**: Facturas emitidas, recibos de pago, comprobantes de depósito

El módulo utiliza **lógica contable avanzada** para:
1. Analizar el contenido del documento
2. Extraer datos estructurados (montos, fechas, RFC, conceptos)
3. Inferir si es un gasto o ingreso (incluso sin indicadores explícitos)
4. Validar la calidad y completitud de los datos
5. Proporcionar explicaciones del razonamiento
6. Devolver JSON estructurado listo para integrar

---

## 🎯 Características principales

### ✅ Clasificación automática inteligente
- Detecta 6 tipos de documentos diferentes
- Aplica más de 20 reglas de inferencia contable
- Confianza de clasificación del 20% al 98%
- Explicaciones detalladas del razonamiento

### 📊 Extracción de datos estructurados
Extrae automáticamente:
- ✓ Monto total, subtotal, IVA, IEPS
- ✓ Fechas en múltiples formatos
- ✓ RFC emisor/receptor
- ✓ UUID de facturas CFDI
- ✓ Series y folios
- ✓ Métodos de pago
- ✓ Productos/servicios con precios
- ✓ Nombres de establecimientos/proveedores

### 🔍 Validación y detección de errores
- Identifica campos faltantes
- Detecta inconsistencias fiscales (subtotal + IVA ≠ total)
- Valida coherencia de fechas
- Alerta sobre documentos con datos incompletos
- Sugerencias de qué información falta

### 🧠 Lógica contable avanzada
Infiere correctamente la categoría analizando:
- Palabras clave contextuales
- Estructura del documento
- Relación emisor/receptor
- Tipo de establecimiento
- Indicadores de transacción

---

## 📁 Estructura de archivos

```
src/modules/ocr/
├── services/
│   ├── intelligentOCRClassifier.ts    # ⭐ Motor principal de clasificación
│   ├── tesseractOCRService_OPTIMIZED.ts  # Servicio OCR base
│   └── ocrToFinanceService.ts         # Conversión a formatos financieros
├── hooks/
│   └── useIntelligentOCR.ts           # Hook React personalizado
├── pages/
│   └── IntelligentOCRDemo.tsx         # Página de demostración
└── types/
    └── OCRTypes.ts                     # Tipos TypeScript
```

---

## 🚀 Cómo usar el módulo

### Opción 1: Usar el Hook (React)

```tsx
import { useIntelligentOCR } from '@/modules/ocr/hooks/useIntelligentOCR';

function MyComponent() {
  const {
    processDocument,
    isProcessing,
    result,
    error,
    getFormattedJSON,
    getVisualReport
  } = useIntelligentOCR();

  const handleUpload = async (file: File) => {
    const classification = await processDocument(file);

    if (classification) {
      console.log('Categoría:', classification.categoria); // "GASTO" o "INGRESO"
      console.log('Monto:', classification.datosExtraidos.monto);
      console.log('Confianza:', classification.confianzaClasificacion + '%');

      // Ver reporte visual
      console.log(getVisualReport());
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleUpload(e.target.files[0])}
      />

      {isProcessing && <p>Procesando... ⏳</p>}

      {result && (
        <div>
          <h3>{result.categoria}</h3>
          <p>Monto: ${result.datosExtraidos.monto}</p>
          <p>Fecha: {result.datosExtraidos.fecha}</p>
          <p>Confianza: {result.confianzaClasificacion}%</p>
        </div>
      )}

      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### Opción 2: Usar el servicio directamente

```typescript
import { IntelligentOCRClassifier } from '@/modules/ocr/services/intelligentOCRClassifier';
import { tesseractOCRService } from '@/modules/ocr/services/tesseractOCRService_OPTIMIZED';

async function processMyDocument(file: File) {
  // Paso 1: Ejecutar OCR
  const ocrResult = await tesseractOCRService.processDocument(file);

  // Paso 2: Clasificar inteligentemente
  const classification = IntelligentOCRClassifier.classify(
    ocrResult.texto_completo,
    ocrResult.datos_ticket,
    ocrResult.datos_factura
  );

  // Paso 3: Usar los resultados
  console.log('Categoría:', classification.categoria);
  console.log('Tipo documento:', classification.tipoDocumento);
  console.log('Confianza:', classification.confianzaClasificacion + '%');

  // Generar reporte
  const report = IntelligentOCRClassifier.generateReport(classification);
  console.log(report);

  // Obtener JSON
  const json = IntelligentOCRClassifier.formatToJSON(classification);

  return classification;
}
```

### Opción 3: Integrar con formularios

```typescript
import { classificationToExpenseData, classificationToIncomeData } from '@/modules/ocr/hooks/useIntelligentOCR';
import { TransactionCategory } from '@/modules/ocr/services/intelligentOCRClassifier';

async function handleOCRAndCreateTransaction(file: File, eventoId: string) {
  // Procesar documento
  const classification = await processDocument(file);

  if (!classification) {
    throw new Error('No se pudo clasificar el documento');
  }

  // Convertir a formato de base de datos
  if (classification.categoria === TransactionCategory.GASTO) {
    const expenseData = classificationToExpenseData(classification, eventoId);

    // Crear gasto en la base de datos
    await createExpense(expenseData);
  } else {
    const incomeData = classificationToIncomeData(classification, eventoId);

    // Crear ingreso en la base de datos
    await createIncome(incomeData);
  }
}
```

---

## 📊 Estructura del resultado

El módulo devuelve un objeto `IntelligentClassificationResult` con la siguiente estructura:

```typescript
{
  // Clasificación principal
  categoria: "GASTO" | "INGRESO",
  tipoDocumento: "ticket_compra" | "factura_recibida" | "factura_emitida" | ...,
  confianzaClasificacion: 85, // 0-100%

  // Datos extraídos
  datosExtraidos: {
    monto: 1234.56,
    fecha: "2025-01-15",
    concepto: "Compra en OXXO (5 productos)",

    // Para gastos
    emisor: {
      nombre: "OXXO",
      rfc: "OXX010101ABC",
      direccion: "..."
    },

    // Para ingresos
    receptor: {
      nombre: "Cliente ABC",
      rfc: "ABC010101XYZ"
    },

    // Detalles fiscales
    subtotal: 1068.97,
    iva: 165.59,
    metodoPago: "Tarjeta",
    uuid: "12345678-1234-...",

    // Productos/servicios
    items: [
      {
        descripcion: "Producto 1",
        cantidad: 2,
        precioUnitario: 50.00,
        importe: 100.00
      }
    ]
  },

  // Validación
  validacion: {
    datosCompletos: true,
    camposFaltantes: [],
    erroresDetectados: [],
    advertencias: ["⚠️ Falta RFC del proveedor"]
  },

  // Explicación
  razonamiento: {
    factoresPositivos: [
      "Documento identificado como compra/gasto",
      "Monto válido: $1234.56",
      "RFC detectado",
      "5 productos detectados"
    ],
    factoresNegativos: [],
    explicacion: "Este documento fue clasificado como GASTO porque se identificó como un ticket de compra en establecimiento..."
  },

  // Datos originales del OCR
  datosOriginalesOCR: {
    textoCompleto: "...",
    ticketData: { ... },
    facturaData: { ... }
  }
}
```

---

## 🧠 Lógica de inferencia

### ¿Cómo decide si es GASTO o INGRESO?

El módulo aplica un proceso de análisis en 3 pasos:

#### **Paso 1: Detectar tipo de documento**
```
¿Tiene UUID fiscal + "emisor"? → Factura emitida (INGRESO)
¿Tiene UUID fiscal sin "emisor"? → Factura recibida (GASTO)
¿Dice "depósito" + número de cuenta? → Comprobante depósito (INGRESO)
¿Dice "recibí de" + monto? → Recibo de pago (INGRESO)
¿Tiene "total" + establecimiento? → Ticket de compra (GASTO)
```

#### **Paso 2: Análisis de palabras clave**
```
Palabras de GASTO:
- compra, adquisición, pago a proveedor
- nos cobraron, pagamos, erogación
- factura recibida, gasto, costo

Palabras de INGRESO:
- venta, cobro, honorarios
- nos pagaron, cobramos, recibimos
- factura emitida, ingreso, servicio prestado
```

#### **Paso 3: Ajuste de confianza**
```
Factores que AUMENTAN confianza:
+ UUID fiscal presente: +15%
+ RFC detectado: +10%
+ Monto válido: +8%
+ Desglose fiscal (subtotal+IVA): +12%
+ Productos detectados: +2% por producto (máx +10%)
+ Fecha presente: +5%

Factores que REDUCEN confianza:
- Texto muy corto: -15%
- Sin monto: -15%
- Sin fecha: -10%
- Inconsistencia fiscal: -10%
```

---

## 🎨 Página de demostración

Incluye una página de demo completa en:
```
src/modules/ocr/pages/IntelligentOCRDemo.tsx
```

### Características del demo:
- 📤 Upload con drag & drop
- 🖼️ Preview de imagen
- 📊 Barra de progreso en tiempo real
- 🎯 Visualización de clasificación con colores
- ✅ Panel de validación
- 🧠 Explicación del razonamiento
- 📋 Vista JSON exportable
- 📄 Reporte visual copiable

### Para agregar la ruta al demo:

En tu archivo de rutas (ej. `App.tsx` o router):

```tsx
import IntelligentOCRDemo from '@/modules/ocr/pages/IntelligentOCRDemo';

// Agregar la ruta
{
  path: '/ocr/intelligent-demo',
  element: <IntelligentOCRDemo />
}
```

Luego acceder en: `http://localhost:5173/ocr/intelligent-demo`

---

## 🔧 Configuración y personalización

### Agregar tu RFC de empresa

Para mejorar la detección de facturas emitidas vs recibidas:

```typescript
// En intelligentOCRClassifier.ts, línea ~150
private static isFacturaEmitida(texto: string, facturaData?: FacturaData): boolean {
  // TODO: Configurar RFC de tu empresa
  const MI_RFC_EMPRESA = 'TU_RFC_AQUI'; // ← Agregar tu RFC

  if (facturaData?.rfc_emisor === MI_RFC_EMPRESA) {
    return true; // Somos el emisor → INGRESO
  }

  // ... resto del código
}
```

### Personalizar categorías de gasto

```typescript
// En useIntelligentOCR.ts, función detectExpenseCategory
function detectExpenseCategory(proveedor: string): string {
  const proveedorLower = proveedor.toLowerCase();

  // Agregar tus propias reglas
  if (proveedorLower.match(/mi-proveedor-favorito/)) {
    return 'categoria_personalizada';
  }

  // ... resto
}
```

---

## 📈 Ejemplos de casos de uso

### Caso 1: Ticket de OXXO (GASTO)
```
Entrada: Foto de ticket de OXXO
Salida:
- Categoría: GASTO ✅
- Tipo: ticket_compra
- Confianza: 92%
- Monto: $234.50
- Proveedor: OXXO
- Productos: 7 detectados
```

### Caso 2: Factura emitida a cliente (INGRESO)
```
Entrada: PDF de factura CFDI que emitimos
Salida:
- Categoría: INGRESO ✅
- Tipo: factura_emitida
- Confianza: 96%
- Monto: $5,800.00
- Cliente: ABC S.A. DE C.V.
- UUID: 12345678-1234-...
- RFC Receptor: ABC010101XYZ
```

### Caso 3: Factura recibida de proveedor (GASTO)
```
Entrada: Factura CFDI que nos cobraron
Salida:
- Categoría: GASTO ✅
- Tipo: factura_recibida
- Confianza: 94%
- Monto: $12,000.00
- Proveedor: Proveedor XYZ
- UUID: 87654321-4321-...
```

---

## ⚠️ Manejo de errores y validación

### Errores críticos (bloquean creación)
```typescript
if (result.validacion.erroresDetectados.length > 0) {
  // Mostrar al usuario:
  // "❌ No se detectó el monto total"
  // "❌ Inconsistencia fiscal: Subtotal + IVA ≠ Total"

  // NO permitir crear el registro hasta corregir
}
```

### Advertencias (permiten continuar)
```typescript
if (result.validacion.advertencias.length > 0) {
  // Mostrar al usuario:
  // "⚠️ Falta RFC del proveedor (recomendado)"
  // "⚠️ Concepto muy corto"

  // Permitir crear pero resaltar campos faltantes
}
```

### Baja confianza
```typescript
if (result.confianzaClasificacion < 60) {
  // Mostrar advertencia:
  // "⚠️ Confianza baja (45%). Por favor revisa los datos manualmente."

  // Marcar campos en amarillo para revisión manual
}
```

---

## 🎯 Mejores prácticas

### ✅ DO - Hacer:
- ✓ Mostrar siempre el nivel de confianza al usuario
- ✓ Permitir al usuario corregir datos antes de guardar
- ✓ Resaltar campos con baja confianza
- ✓ Guardar el documento original junto con los datos extraídos
- ✓ Registrar en logs los casos de baja confianza para mejorar el modelo

### ❌ DON'T - No hacer:
- ✗ Guardar automáticamente sin revisión si confianza < 80%
- ✗ Ocultar errores/advertencias al usuario
- ✗ Forzar una categoría si el sistema no está seguro
- ✗ Descartar el texto completo del OCR (guardarlo para auditoría)

---

## 🧪 Testing

### Probar con diferentes documentos:

1. **Tickets simples**: OXXO, Walmart, 7-Eleven
2. **Facturas CFDI**: Emitidas y recibidas
3. **Recibos manuales**: Escritos a mano (menor confianza esperada)
4. **Comprobantes bancarios**: SPEIs, transferencias
5. **Documentos ambiguos**: Ver cómo el sistema infiere

### Casos extremos a probar:
- Documento muy borroso
- Texto en ángulo
- Documentos sin montos
- Facturas sin UUID
- Tickets sin establecimiento claro

---

## 📚 API Reference rápida

### `IntelligentOCRClassifier.classify()`
```typescript
classify(
  textoCompleto: string,
  ticketData?: TicketData,
  facturaData?: FacturaData
): IntelligentClassificationResult
```

### `useIntelligentOCR()`
```typescript
const {
  processDocument: (file: File) => Promise<Result>,
  isProcessing: boolean,
  progress: number,
  error: string | null,
  result: IntelligentClassificationResult | null,
  reset: () => void,
  getFormattedJSON: () => string | null,
  getVisualReport: () => string | null
} = useIntelligentOCR();
```

### `classificationToExpenseData()`
```typescript
classificationToExpenseData(
  classification: IntelligentClassificationResult,
  eventoId: string
): ExpenseData
```

### `classificationToIncomeData()`
```typescript
classificationToIncomeData(
  classification: IntelligentClassificationResult,
  eventoId: string
): IncomeData
```

---

## 🎉 ¡Listo para usar!

El módulo OCR inteligente está completamente funcional y listo para integrarse en tu sistema contable.

### Próximos pasos sugeridos:

1. **Probar el demo**: Accede a `/ocr/intelligent-demo` y prueba con diferentes documentos
2. **Integrar con formularios**: Conecta con tus formularios de gastos/ingresos
3. **Personalizar**: Ajusta categorías y RFC de tu empresa
4. **Entrenar**: Recopila casos de baja confianza para mejorar las reglas
5. **Automatizar**: Crea flujos de trabajo automáticos para documentos con alta confianza

---

## 🆘 Soporte y contacto

Si tienes dudas sobre el módulo:
1. Revisa los comentarios en el código (muy detallados)
2. Consulta los ejemplos en este archivo
3. Prueba el demo interactivo
4. Revisa los logs de consola (muy verbosos y útiles)

**¡Disfruta del OCR inteligente!** 🚀
