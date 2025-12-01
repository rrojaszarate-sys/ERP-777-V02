/**
 * 🤖 Servicio de Mapeo Inteligente con Google Gemini
 *
 * Este módulo usa Google Gemini para interpretar texto extraído por OCR
 * y mapearlo inteligentemente a los campos estructurados de una factura mexicana.
 *
 * Ventajas:
 * - ✅ Corrige errores del OCR automáticamente
 * - ✅ Entiende contexto y puede inferir campos aunque estén mal formateados
 * - ✅ Maneja diferentes formatos de facturas sin reglas rígidas
 * - ✅ Extrae información estructurada de texto no estructurado
 * - ✅ Muy económico (~$0.001 por factura)
 */

export interface GeminiMappedData {
  establecimiento: string | null;
  rfc: string | null;
  telefono: string | null;
  fecha: string | null; // Formato: YYYY-MM-DD
  hora: string | null;
  total: number | null;
  subtotal: number | null;
  iva: number | null;
  forma_pago: string | null; // "efectivo" | "tarjeta_credito" | "tarjeta_debito" | "transferencia"
  concepto_sugerido: string | null; // Descripción inteligente del gasto
  categoria_sugerida: string | null; // Categoría recomendada
  detalle_compra: string | null; // Lista de productos/servicios

  // Campos SAT (Factura Electrónica)
  uuid_cfdi: string | null;
  serie: string | null;
  folio: string | null;
  folio_fiscal: string | null;
  metodo_pago_sat: string | null; // "PUE" (Pago en una Exhibición) | "PPD" (Pago en Parcialidades)
  forma_pago_sat: string | null; // Código SAT: "01" (Efectivo), "03" (Transferencia), "04" (Tarjeta)
  uso_cfdi: string | null; // Ej: "G03" (Gastos en general)
  lugar_expedicion: string | null; // Código postal
  moneda: string | null; // "MXN", "USD", etc.

  // Información adicional del proveedor
  direccion_proveedor: string | null;
  email_proveedor: string | null;
  regimen_fiscal: string | null;
}

export interface GeminiMapperOptions {
  apiKey?: string;
  temperature?: number; // 0-1, menor = más preciso
  maxTokens?: number;
}

/**
 * 🎯 Mapea texto de OCR a campos estructurados usando Gemini (API REST directa)
 */
export async function mapOCRWithGemini(
  ocrText: string,
  options: GeminiMapperOptions = {}
): Promise<GeminiMappedData> {
  console.log('🤖 Iniciando mapeo inteligente con Gemini...');
  console.log('📝 Texto a procesar:', ocrText.substring(0, 200) + '...');

  try {
    const apiKey = options.apiKey || import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('🔑 API Key de Gemini no configurada');
    }

    const prompt = createExtractionPrompt(ocrText);

    // ✅ CORRECTO: v1beta con gemini-1.5-flash (modelo verificado y disponible)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    console.log('📤 Enviando a Gemini API v1beta/gemini-1.5-flash...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.1,
          maxOutputTokens: options.maxTokens || 2000,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de API:', errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 Respuesta de Gemini:', data);

    // Extraer el texto de la respuesta
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No se recibió respuesta válida de Gemini');
    }

    console.log('📝 Texto extraído:', text);

    // Parsear JSON (Gemini puede devolver JSON con o sin backticks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }

    const parsedData = JSON.parse(jsonText);

    // Validar y normalizar datos
    const mappedData = normalizeGeminiResponse(parsedData);

    console.log('✅ Mapeo completado exitosamente:', mappedData);
    return mappedData;

  } catch (error) {
    console.error('❌ Error en mapeo con Gemini:', error);

    if (error instanceof Error) {
      if (error.message.includes('API Key') || error.message.includes('401')) {
        throw new Error('🔑 API Key de Gemini no válida o no configurada');
      }
      if (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('429')) {
        throw new Error('📊 Límite de uso de Gemini alcanzado. Intenta más tarde.');
      }
    }

    throw new Error('❌ Error al procesar con Gemini: ' + (error as Error).message);
  }
}

/**
 * Crea el prompt optimizado para extraer datos de facturas mexicanas
 */
function createExtractionPrompt(ocrText: string): string {
  return `
Eres un experto en extraer información de facturas y tickets fiscales mexicanos.

**EJEMPLO REAL DE FACTURA SAMSUNG:**
Texto OCR: "SAMSUNG ELECTRONICS MEXICO, S.A. DE C.V. RFC: SEM950215S98 GALAXY WATCH4 40MM 1 $3,568.19 SUBTOTAL $3,568.19 IVA 16% $571.00 TOTAL MXN $4,139.19"

JSON esperado: {"establecimiento": "SAMSUNG ELECTRONICS MEXICO, S.A. DE C.V.", "rfc": "SEM950215S98", "total": 4139.19, "subtotal": 3568.19, "iva": 571.00, "detalle_compra": "GALAXY WATCH4 40MM x1 - $3,568.19", "categoria_sugerida": "tecnologia"}

Analiza el siguiente texto extraído por OCR de una factura/ticket y extrae TODOS los campos posibles.

**IMPORTANTE:**
- Si un campo no está presente, devuelve null
- Los RFCs deben tener formato válido (12-13 caracteres): XXXX000000XXX
- Las fechas deben estar en formato YYYY-MM-DD
- Los montos deben ser números (sin símbolos $)
- Infiere información basándote en el contexto
- Corrige errores obvios del OCR (como "0" en lugar de "O")

**DETALLE_COMPRA:** Lista SOLO productos reales (artículos vendidos), NUNCA metadatos fiscales
- ✅ INCLUYE: "GALAXY WATCH4 40MM", "Laptop HP", "Servicio de consultoría"
- ❌ EXCLUYE: "REGIMEN FISCAL", "FORMA PAGO", "USO CFDI", números sueltos, fechas sueltas

**CAMPOS SAT:**
- metodo_pago_sat: "PUE" (Pago en una Exhibición) o "PPD" (Pago en Parcialidades)
- forma_pago_sat: "01" (Efectivo), "03" (Transferencia), "04" (Tarjeta), "28" (Tarjeta de débito)
- uso_cfdi: "G01" (Adquisición de mercancías), "G03" (Gastos en general), "P01" (Por definir)

**MAPEO DE FORMA DE PAGO:**
- Si menciona "efectivo", "cash": "efectivo"
- Si menciona "tarjeta", "card", "visa", "mastercard": "tarjeta_credito"
- Si menciona "débito", "debit": "tarjeta_debito"
- Si menciona "transferencia", "transfer": "transferencia"

**CATEGORÍA SUGERIDA** (basada en el establecimiento/productos):
- "alimentacion" - Restaurantes, comida, bebidas
- "transporte" - Gasolina, Uber, taxis, peajes
- "hospedaje" - Hoteles, Airbnb
- "material" - Materiales, equipo, herramientas
- "servicios" - Servicios profesionales, mantenimiento
- "publicidad" - Marketing, impresiones, diseño
- "tecnologia" - Software, hardware, equipos electrónicos
- "otros" - Otros gastos

**TEXTO OCR:**
${ocrText}

**RESPONDE ÚNICAMENTE CON UN JSON VÁLIDO EN ESTE FORMATO:**
{
  "establecimiento": "string o null",
  "rfc": "string o null",
  "telefono": "string o null",
  "fecha": "YYYY-MM-DD o null",
  "hora": "HH:MM o null",
  "total": number o null,
  "subtotal": number o null,
  "iva": number o null,
  "forma_pago": "efectivo | tarjeta_credito | tarjeta_debito | transferencia o null",
  "concepto_sugerido": "string descriptivo o null",
  "categoria_sugerida": "string de categoría o null",
  "detalle_compra": "string con lista de productos o null",
  "uuid_cfdi": "string o null",
  "serie": "string o null",
  "folio": "string o null",
  "folio_fiscal": "string o null",
  "metodo_pago_sat": "PUE | PPD o null",
  "forma_pago_sat": "01 | 03 | 04 | 28 o null",
  "uso_cfdi": "string código SAT o null",
  "lugar_expedicion": "string código postal o null",
  "moneda": "string o null",
  "direccion_proveedor": "string o null",
  "email_proveedor": "string o null",
  "regimen_fiscal": "string o null"
}
`;
}

/**
 * Normaliza y valida la respuesta de Gemini
 */
function normalizeGeminiResponse(data: any): GeminiMappedData {
  return {
    establecimiento: data.establecimiento || null,
    rfc: normalizeRFC(data.rfc),
    telefono: data.telefono || null,
    fecha: normalizeDate(data.fecha),
    hora: data.hora || null,
    total: parseFloat(data.total) || null,
    subtotal: parseFloat(data.subtotal) || null,
    iva: parseFloat(data.iva) || null,
    forma_pago: normalizeFormaPago(data.forma_pago),
    concepto_sugerido: data.concepto_sugerido || null,
    categoria_sugerida: data.categoria_sugerida || null,
    detalle_compra: data.detalle_compra || null,
    uuid_cfdi: data.uuid_cfdi || null,
    serie: data.serie || null,
    folio: data.folio || null,
    folio_fiscal: data.folio_fiscal || null,
    metodo_pago_sat: data.metodo_pago_sat || null,
    forma_pago_sat: data.forma_pago_sat || null,
    uso_cfdi: data.uso_cfdi || null,
    lugar_expedicion: data.lugar_expedicion || null,
    moneda: data.moneda || 'MXN',
    direccion_proveedor: data.direccion_proveedor || null,
    email_proveedor: data.email_proveedor || null,
    regimen_fiscal: data.regimen_fiscal || null,
  };
}

/**
 * Normaliza RFC (quita espacios, guiones y valida formato)
 */
function normalizeRFC(rfc: any): string | null {
  if (!rfc) return null;

  const cleaned = String(rfc).replace(/[-\s]/g, '').toUpperCase();

  // Validar formato básico: 3-4 letras + 6 dígitos + 2-3 caracteres
  if (cleaned.match(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{2,3}$/)) {
    return cleaned;
  }

  return null;
}

/**
 * Normaliza fecha a formato YYYY-MM-DD
 */
function normalizeDate(fecha: any): string | null {
  if (!fecha) return null;

  const dateStr = String(fecha);

  // Si ya está en formato correcto
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }

  // Intentar parsear otros formatos comunes
  const patterns = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/, // DD/MM/YYYY o DD-MM-YYYY
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/, // YYYY/MM/DD o YYYY-MM-DD
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const [, a, b, c] = match;

      // Determinar formato
      if (a.length === 4) {
        // YYYY-MM-DD
        return `${a}-${b}-${c}`;
      } else {
        // DD-MM-YYYY
        return `${c}-${b}-${a}`;
      }
    }
  }

  return null;
}

/**
 * Normaliza forma de pago a valores aceptados
 */
function normalizeFormaPago(formaPago: any): string | null {
  if (!formaPago) return null;

  const fp = String(formaPago).toLowerCase();

  if (fp.includes('efectivo') || fp === 'efectivo') return 'efectivo';
  if (fp.includes('tarjeta_credito') || fp === 'tarjeta_credito') return 'tarjeta_credito';
  if (fp.includes('tarjeta_debito') || fp === 'tarjeta_debito') return 'tarjeta_debito';
  if (fp.includes('transferencia') || fp === 'transferencia') return 'transferencia';

  return null;
}

/**
 * Verifica si Gemini está configurado y disponible
 */
export function isGeminiAvailable(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}

/**
 * Obtiene información sobre el uso de Gemini
 */
export function getGeminiInfo(): {
  available: boolean;
  model: string;
  estimatedCostPerRequest: string;
} {
  return {
    available: isGeminiAvailable(),
    model: 'gemini-pro',
    estimatedCostPerRequest: '$0.001 USD', // Muy económico
  };
}
