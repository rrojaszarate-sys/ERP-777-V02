# Documentación: Sistema OCR con Análisis Espacial

## Descripción General

Este documento describe la **refactorización completa** del sistema OCR basado en Google Vision API, implementando **análisis espacial y contextual** mediante el uso de `boundingPoly` (coordenadas x, y) para una extracción precisa de datos.

## Cambios Principales

### Antes (Versión Antigua)
- Procesaba el texto completo como una sola cadena
- Usaba expresiones regulares simples
- Sin análisis de posición espacial
- Baja precisión en la extracción de campos

### Después (Versión Nueva)
- Procesa cada `textAnnotation` individualmente
- Analiza posición espacial usando `boundingPoly`
- Identifica líneas y columnas por coordenadas
- Alta precisión en la extracción de campos estructurados

---

## Arquitectura del Sistema

### 1. Funciones de Análisis Espacial Base

#### `getAverageY(boundingPoly)`
Calcula el promedio de las coordenadas Y de un boundingPoly.
- **Uso**: Determinar la posición vertical de un texto en el documento.

#### `getAverageX(boundingPoly)`
Calcula el promedio de las coordenadas X de un boundingPoly.
- **Uso**: Determinar la posición horizontal de un texto.

#### `getMaxX(boundingPoly)`
Obtiene la coordenada X más a la derecha.
- **Uso**: Identificar el final de una palabra o columna.

#### `isOnSameLine(annotation1, annotation2, threshold)`
Verifica si dos anotaciones están en la misma línea horizontal.
- **Parámetros**:
  - `threshold`: Tolerancia de píxeles (default: 15px)
- **Retorna**: `boolean`

#### `groupByLines(annotations, threshold)`
Agrupa todas las anotaciones por líneas basándose en coordenadas Y similares.
- **Retorna**: Array de líneas, donde cada línea es un array de anotaciones ordenadas por X.

#### `findValueInSameLine(annotations, keywordIndex, pattern)`
Busca un valor que coincida con un patrón en la misma línea que una palabra clave.
- **Uso**: Encontrar el valor asociado a una etiqueta (ej: "TOTAL" → "450.00")

---

## Extractores de Campos Específicos

### 2.1 `extractTotal(annotations)`

**Objetivo**: Extraer el monto total del ticket/factura.

**Algoritmo**:
1. Busca la palabra clave "TOTAL" (o variantes: "Total", "IMPORTE")
2. Identifica el monto en formato moneda en la misma línea (coordenadas Y similares)
3. **Fallback**: Si no encuentra "TOTAL", busca el último monto en el documento

**Patrones**:
- Palabra clave: `/^(TOTAL|Total|total|IMPORTE)$/i`
- Formato moneda: `/^\$?\d{1,3}(?:,?\d{3})*(?:\.\d{2})?$/`

**Ejemplo de extracción**:
```
Anotaciones en el documento:
[...otras anotaciones...]
{ description: "TOTAL", boundingPoly: { vertices: [{x:50, y:800}...] } }
{ description: "$450.50", boundingPoly: { vertices: [{x:200, y:802}...] } }
```
→ Resultado: `450.50`

---

### 2.2 `extractCodigoPostal(annotations)`

**Objetivo**: Extraer el código postal del establecimiento.

**Algoritmo**:
1. Busca la palabra clave "C.P." o "CP"
2. Identifica el número de 5 dígitos en la misma línea
3. **Fallback**: Si no encuentra "C.P.", busca cualquier secuencia de 5 dígitos en el primer tercio del documento

**Patrones**:
- Palabra clave: `/^(C\.P\.|CP|C\.P|cp)$/i`
- Código postal: `/^\d{5}$/`

**Ejemplo de extracción**:
```
Anotaciones:
{ description: "C.P.", boundingPoly: { vertices: [{x:50, y:150}...] } }
{ description: "06600", boundingPoly: { vertices: [{x:90, y:152}...] } }
```
→ Resultado: `"06600"`

---

### 2.3 `extractDetalle(annotations)` ⭐ NUEVO CAMPO

**Objetivo**: Extraer los artículos/productos del ticket con descripción y precio.

**Algoritmo**:
1. **Identificar zona de productos**:
   - Busca palabras clave de inicio: "CANTIDAD", "DESCRIPCION", "PRODUCTO", etc.
   - Busca palabras clave de fin: "SUBTOTAL", "TOTAL", "IVA"
   - Si no encuentra marcadores, usa heurística: desde 15% hasta 80% del documento

2. **Agrupar por líneas**:
   - Usa `groupByLines()` para agrupar anotaciones con Y similar

3. **Extraer por línea**:
   - **Precio**: Busca el número en formato moneda más a la derecha (mayor X)
   - **Descripción**: Todo el texto a la izquierda del precio

**Patrones**:
- Inicio: `/^(CANT|CANTIDAD|DESCRIPCION|PRODUCTO|ITEM)$/i`
- Fin: `/^(SUBTOTAL|SUB-TOTAL|TOTAL|IMPORTE|IVA)$/i`
- Precio: `/^\$?\d{1,3}(?:,?\d{3})*(?:\.\d{2})$/`

**Ejemplo de extracción**:
```
Zona de productos:
Línea 1: [{ desc: "Café", x:50, y:300 }, { desc: "Americano", x:100, y:302 }, { desc: "$45.00", x:400, y:301 }]
Línea 2: [{ desc: "Pan", x:50, y:330 }, { desc: "Dulce", x:100, y:331 }, { desc: "$25.00", x:400, y:332 }]

Resultado:
[
  { descripcion: "Café Americano", precio: 45.00 },
  { descripcion: "Pan Dulce", precio: 25.00 }
]
```

---

### 2.4 Otros Extractores

#### `extractRFC(annotations)`
Busca RFC con patrón: `/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/`

#### `extractFecha(annotations)`
Busca fechas con patrón: `/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/`

#### `extractProveedor(annotations)`
Toma las primeras 3 líneas no vacías del documento.

---

## Función Principal

### `extractReceiptInfoSpatial(textAnnotations)`

**Entrada**: Array de `textAnnotations` de Google Vision API

**Proceso**:
1. Ignora el primer elemento (texto completo)
2. Extrae cada campo usando análisis espacial
3. Calcula subtotal e IVA si se extrajo detalle
4. Redondea valores numéricos a 2 decimales

**Salida**:
```javascript
{
  proveedor: "Restaurante XYZ",
  rfc: "ABC123456DEF",
  fecha: "27/10/2025",
  codigo_postal: "06600",
  total: 450.50,
  detalle: [
    { descripcion: "Café Americano", precio: 45.00 },
    { descripcion: "Pan Dulce", precio: 25.00 },
    // ...
  ],
  subtotal: 388.36,
  iva: 62.14
}
```

---

## Integración con el Sistema

### Endpoint de Vercel
**Ruta**: `/api/ocr-process`
**Método**: `POST`
**Body**: `{ image: "base64_string" }`

### Respuesta
```json
{
  "success": true,
  "text": "Texto completo extraído...",
  "data": {
    "proveedor": "...",
    "total": 450.50,
    "codigo_postal": "06600",
    "detalle": [...]
  },
  "confidence": 0.95
}
```

---

## Tipos TypeScript Actualizados

### `TicketData`
Se agregaron los siguientes campos:
- `codigo_postal?: string` - Código postal del establecimiento
- `rfc?: string` - RFC del emisor
- `proveedor?: string` - Nombre del proveedor
- `detalle?: DetalleItem[]` - **NUEVO**: Array de artículos extraídos

### `DetalleItem` (Nueva interfaz)
```typescript
export interface DetalleItem {
  descripcion: string;  // Descripción del artículo
  precio: number;       // Precio del artículo
}
```

---

## Ventajas del Análisis Espacial

1. **Precisión**: Usa la posición física del texto en el documento
2. **Contexto**: Entiende relaciones entre palabras (misma línea, columnas)
3. **Robustez**: Maneja variaciones en el formato de tickets
4. **Escalabilidad**: Fácil agregar nuevos campos con la misma lógica

---

## Mejoras Futuras

1. **Detección de cantidad**: Agregar campo `cantidad` en `DetalleItem`
2. **Múltiples columnas**: Detectar precios unitarios vs totales
3. **Confianza por campo**: Agregar nivel de confianza a cada campo extraído
4. **Machine Learning**: Entrenar modelo para mejorar detección de zonas

---

## Testing

Para probar la nueva implementación:

1. Subir un ticket/factura al sistema
2. Verificar que el campo `detalle` contenga los artículos
3. Validar que `total` coincida con la suma de `detalle`
4. Revisar que `codigo_postal` se extraiga correctamente

---

## Contacto

Para dudas o mejoras, contactar al equipo de desarrollo.

**Fecha de implementación**: Octubre 2025
**Versión**: 2.0 - Análisis Espacial
