/**
 * VERCEL SERVERLESS FUNCTION: OCR Processing con Google Vision
 *
 * Endpoint: /api/ocr-process
 * Método: POST
 * Body: { image: "base64_string" }
 *
 * VERSIÓN REFACTORIZADA CON ANÁLISIS ESPACIAL
 * Utiliza boundingPoly (coordenadas x, y) para extracción precisa
 */

import vision from '@google-cloud/vision';

// Inicializar cliente de Google Vision
let visionClient = null;

function parseGoogleKey(raw) {
  if (!raw) return null;

  // Si viene base64, detectarlo y decodificar
  const base64Match = raw.trim().match(/^\s*([A-Za-z0-9+/=\n\r]+)\s*$/);
  if (base64Match && !raw.includes('{')) {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      return parsed;
    } catch (e) {
      // no es base64 válido -> continuar
    }
  }

  // Primer intento: parsear directo (por si ya viene como JSON válido)
  try {
    return JSON.parse(raw);
  } catch (e1) {
    // Segundo intento: reemplazar \\n por \n y parsear
    try {
      const withNewlines = raw.replace(/\\n/g, '\n');
      return JSON.parse(withNewlines);
    } catch (e2) {
      // Tercer intento: eliminar comillas externas si existen
      const trimmed = raw.trim();
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        try {
          const unquoted = trimmed.slice(1, -1);
          return JSON.parse(unquoted.replace(/\\n/g, '\n'));
        } catch (e3) {
          return null;
        }
      }
      return null;
    }
  }
}

function getVisionClient() {
  if (!visionClient) {
    try {
      const raw = process.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY || '';
      const credentials = parseGoogleKey(raw);

      if (!credentials || !credentials.client_email) {
        throw new Error('Google Cloud credentials not configured or invalid JSON');
      }

      visionClient = new vision.ImageAnnotatorClient({
        credentials: credentials,
        projectId: credentials.project_id
      });

      console.log('✅ Google Vision client initialized');
    } catch (error) {
      console.error('❌ Error initializing Google Vision:', error.message || error);
      throw error;
    }
  }
  return visionClient;
}

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Inicializar cliente
    const client = getVisionClient();

    // Procesar imagen con Google Vision
    const [result] = await client.textDetection({
      image: { content: image }
    });

    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return res.status(200).json({
        success: true,
        text: '',
        data: {},
        confidence: 0
      });
    }

    const fullText = detections[0].description || '';

    // Extraer información estructurada usando análisis espacial
    const structuredData = extractReceiptInfoSpatial(detections);

    return res.status(200).json({
      success: true,
      text: fullText,
      data: structuredData,
      confidence: result.textAnnotations?.[0]?.confidence || 0
    });

  } catch (error) {
    console.error('Error processing OCR:', error);
    return res.status(500).json({
      error: 'OCR processing failed',
      message: error.message
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE ANÁLISIS ESPACIAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el promedio de coordenadas Y de un boundingPoly
 */
function getAverageY(boundingPoly) {
  if (!boundingPoly || !boundingPoly.vertices || boundingPoly.vertices.length === 0) {
    return 0;
  }
  const sum = boundingPoly.vertices.reduce((acc, vertex) => acc + (vertex.y || 0), 0);
  return sum / boundingPoly.vertices.length;
}

/**
 * Obtiene el promedio de coordenadas X de un boundingPoly
 */
function getAverageX(boundingPoly) {
  if (!boundingPoly || !boundingPoly.vertices || boundingPoly.vertices.length === 0) {
    return 0;
  }
  const sum = boundingPoly.vertices.reduce((acc, vertex) => acc + (vertex.x || 0), 0);
  return sum / boundingPoly.vertices.length;
}

/**
 * Obtiene la X más a la derecha (máxima)
 */
function getMaxX(boundingPoly) {
  if (!boundingPoly || !boundingPoly.vertices || boundingPoly.vertices.length === 0) {
    return 0;
  }
  return Math.max(...boundingPoly.vertices.map(v => v.x || 0));
}

/**
 * Obtiene la X más a la izquierda (mínima)
 */
function getMinX(boundingPoly) {
  if (!boundingPoly || !boundingPoly.vertices || boundingPoly.vertices.length === 0) {
    return 0;
  }
  return Math.min(...boundingPoly.vertices.map(v => v.x || 0));
}

/**
 * Verifica si dos anotaciones están en la misma línea
 * basándose en la proximidad de sus coordenadas Y
 */
function isOnSameLine(annotation1, annotation2, threshold = 15) {
  const y1 = getAverageY(annotation1.boundingPoly);
  const y2 = getAverageY(annotation2.boundingPoly);
  return Math.abs(y1 - y2) <= threshold;
}

/**
 * Agrupa anotaciones por líneas (coordenadas Y similares)
 */
function groupByLines(annotations, threshold = 15) {
  const lines = [];

  for (const annotation of annotations) {
    const y = getAverageY(annotation.boundingPoly);

    // Buscar línea existente con Y similar
    const existingLine = lines.find(line => {
      const lineY = getAverageY(line[0].boundingPoly);
      return Math.abs(lineY - y) <= threshold;
    });

    if (existingLine) {
      existingLine.push(annotation);
    } else {
      lines.push([annotation]);
    }
  }

  // Ordenar anotaciones dentro de cada línea por X
  lines.forEach(line => {
    line.sort((a, b) => getAverageX(a.boundingPoly) - getAverageX(b.boundingPoly));
  });

  // Ordenar líneas por Y
  lines.sort((a, b) => getAverageY(a[0].boundingPoly) - getAverageY(b[0].boundingPoly));

  return lines;
}

/**
 * Busca un patrón de texto en las anotaciones
 */
function findPattern(annotations, pattern) {
  return annotations.find(ann => pattern.test(ann.description));
}

/**
 * Busca el valor en la misma línea después de una palabra clave
 */
function findValueInSameLine(annotations, keywordIndex, pattern) {
  if (keywordIndex < 0 || keywordIndex >= annotations.length) return null;

  const keyword = annotations[keywordIndex];

  // Buscar hacia adelante en las siguientes anotaciones
  for (let i = keywordIndex + 1; i < Math.min(keywordIndex + 10, annotations.length); i++) {
    const annotation = annotations[i];

    // Verificar si está en la misma línea
    if (isOnSameLine(keyword, annotation)) {
      if (pattern.test(annotation.description)) {
        return annotation;
      }
    } else {
      // Si ya no está en la misma línea, detener búsqueda
      break;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACCIÓN DE CAMPOS ESPECÍFICOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extrae el TOTAL del ticket
 * Busca la palabra "TOTAL" y el monto en formato moneda en la misma línea
 */
function extractTotal(annotations) {
  // Patrones para detectar "TOTAL"
  const totalKeywords = /^(TOTAL|Total|total|IMPORTE)$/i;

  // Patrón para montos: $123.45 o 123.45
  const moneyPattern = /^\$?\d{1,3}(?:,?\d{3})*(?:\.\d{2})?$/;

  // Buscar palabra clave TOTAL
  const totalIndex = annotations.findIndex(ann => totalKeywords.test(ann.description));

  if (totalIndex === -1) {
    // Fallback: buscar el último monto en el documento
    for (let i = annotations.length - 1; i >= 0; i--) {
      if (moneyPattern.test(annotations[i].description)) {
        const value = parseFloat(annotations[i].description.replace(/[$,]/g, ''));
        if (!isNaN(value)) {
          return value;
        }
      }
    }
    return null;
  }

  // Buscar monto en la misma línea
  const totalAnnotation = findValueInSameLine(annotations, totalIndex, moneyPattern);

  if (totalAnnotation) {
    const value = parseFloat(totalAnnotation.description.replace(/[$,]/g, ''));
    return !isNaN(value) ? value : null;
  }

  return null;
}

/**
 * Extrae el código postal
 * Busca "C.P." o "CP" y el número de 5 dígitos en la misma línea
 */
function extractCodigoPostal(annotations) {
  // Patrones para detectar "C.P." o "CP"
  const cpKeywords = /^(C\.P\.|CP|C\.P|cp)$/i;

  // Patrón para código postal: 5 dígitos
  const cpPattern = /^\d{5}$/;

  // Buscar palabra clave C.P.
  const cpIndex = annotations.findIndex(ann => cpKeywords.test(ann.description));

  if (cpIndex === -1) {
    // Fallback: buscar cualquier secuencia de 5 dígitos en el primer tercio del documento
    const firstThird = annotations.slice(0, Math.ceil(annotations.length / 3));
    for (const ann of firstThird) {
      if (cpPattern.test(ann.description)) {
        return ann.description;
      }
    }
    return null;
  }

  // Buscar código postal en la misma línea
  const cpAnnotation = findValueInSameLine(annotations, cpIndex, cpPattern);

  return cpAnnotation ? cpAnnotation.description : null;
}

/**
 * Extrae el detalle de artículos/productos
 * Identifica la zona de productos y extrae descripción + precio por línea
 */
function extractDetalle(annotations) {
  // Palabras clave que marcan el inicio de la zona de productos
  const startKeywords = /^(CANT|CANTIDAD|DESCRIPCION|DESCRIPCIÓN|ARTICULO|ARTÍCULO|PRODUCTO|ITEM)$/i;

  // Palabras clave que marcan el fin de la zona de productos
  const endKeywords = /^(SUBTOTAL|SUB-TOTAL|TOTAL|IMPORTE|IVA|DESCUENTO)$/i;

  // Encontrar índice de inicio (después del encabezado)
  let startIndex = annotations.findIndex(ann => startKeywords.test(ann.description));

  // Si no se encuentra encabezado, empezar después de las primeras líneas (información del establecimiento)
  if (startIndex === -1) {
    startIndex = Math.min(8, Math.floor(annotations.length * 0.15));
  } else {
    startIndex += 1; // Empezar después del encabezado
  }

  // Encontrar índice de fin (donde empieza SUBTOTAL/TOTAL)
  let endIndex = annotations.findIndex((ann, idx) => idx > startIndex && endKeywords.test(ann.description));

  // Si no se encuentra fin, usar el último 20% del documento
  if (endIndex === -1) {
    endIndex = Math.floor(annotations.length * 0.8);
  }

  // Extraer zona de productos
  const productZone = annotations.slice(startIndex, endIndex);

  if (productZone.length === 0) {
    return [];
  }

  // Agrupar por líneas
  const lines = groupByLines(productZone, 15);

  const detalle = [];
  const moneyPattern = /^\$?\d{1,3}(?:,?\d{3})*(?:\.\d{2})$/;

  for (const line of lines) {
    if (line.length < 2) continue; // Necesitamos al menos descripción + precio

    // Buscar el precio (número más a la derecha)
    let precioAnnotation = null;
    let maxX = -1;

    for (const ann of line) {
      if (moneyPattern.test(ann.description)) {
        const x = getMaxX(ann.boundingPoly);
        if (x > maxX) {
          maxX = x;
          precioAnnotation = ann;
        }
      }
    }

    if (!precioAnnotation) continue;

    // La descripción es todo lo que está a la izquierda del precio
    const precioIndex = line.indexOf(precioAnnotation);
    const descripcionParts = line.slice(0, precioIndex).map(ann => ann.description);

    if (descripcionParts.length === 0) continue;

    const descripcion = descripcionParts.join(' ');
    const precio = parseFloat(precioAnnotation.description.replace(/[$,]/g, ''));

    if (!isNaN(precio) && descripcion.trim().length > 0) {
      detalle.push({
        descripcion: descripcion.trim(),
        precio: precio
      });
    }
  }

  return detalle;
}

/**
 * Extrae RFC del proveedor
 */
function extractRFC(annotations) {
  const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

  const rfcAnnotation = findPattern(annotations, rfcPattern);
  return rfcAnnotation ? rfcAnnotation.description : null;
}

/**
 * Extrae fecha
 */
function extractFecha(annotations) {
  const fechaPattern = /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/;

  const fechaAnnotation = findPattern(annotations, fechaPattern);
  return fechaAnnotation ? fechaAnnotation.description : null;
}

/**
 * Extrae nombre del proveedor (primeras líneas del documento)
 */
function extractProveedor(annotations) {
  // Tomar las primeras 3 líneas no vacías
  const firstLines = annotations
    .slice(1, 6) // Ignorar el primer elemento (texto completo)
    .filter(ann => ann.description && ann.description.trim().length > 3)
    .slice(0, 3)
    .map(ann => ann.description);

  return firstLines.length > 0 ? firstLines.join(' ') : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL DE EXTRACCIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extrae información estructurada usando análisis espacial de boundingPoly
 */
function extractReceiptInfoSpatial(textAnnotations) {
  if (!textAnnotations || textAnnotations.length === 0) {
    return {};
  }

  // Ignorar el primer elemento (es el texto completo)
  const annotations = textAnnotations.slice(1);

  if (annotations.length === 0) {
    return {};
  }

  console.log(`📊 Procesando ${annotations.length} anotaciones con análisis espacial`);

  // Extraer campos usando análisis espacial
  const total = extractTotal(annotations);
  const codigo_postal = extractCodigoPostal(annotations);
  const detalle = extractDetalle(annotations);
  const rfc = extractRFC(annotations);
  const fecha = extractFecha(annotations);
  const proveedor = extractProveedor(annotations);

  const data = {
    proveedor: proveedor,
    rfc: rfc,
    fecha: fecha,
    codigo_postal: codigo_postal,
    total: total,
    detalle: detalle,
    // Campos calculados
    subtotal: detalle.length > 0 ? detalle.reduce((sum, item) => sum + item.precio, 0) : (total ? total / 1.16 : 0),
    iva: detalle.length > 0
      ? detalle.reduce((sum, item) => sum + item.precio, 0) * 0.16
      : (total ? total - (total / 1.16) : 0)
  };

  // Redondear valores numéricos
  if (data.subtotal) data.subtotal = Math.round(data.subtotal * 100) / 100;
  if (data.iva) data.iva = Math.round(data.iva * 100) / 100;
  if (data.total) data.total = Math.round(data.total * 100) / 100;

  console.log('✅ Datos extraídos:', {
    proveedor: data.proveedor?.substring(0, 30),
    total: data.total,
    codigo_postal: data.codigo_postal,
    detalle_items: data.detalle?.length || 0
  });

  return data;
}
