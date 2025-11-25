import Tesseract from 'tesseract.js';
import { OCR_CONFIG } from '../../../core/config/googleCloud';
import { ImagePreprocessor } from '../utils/imagePreprocessor';

/**
 * Servicio OCR Real usando Tesseract.js
 * CONFIGURACIÓN OPTIMIZADA PARA PRODUCCIÓN - Simple y Efectiva
 *
 * MEJORAS APLICADAS:
 * 1. Preprocesamiento de imagen para mejor calidad
 * 2. Configuración simple (menos es MÁS)
 * 3. Patrones regex mejorados y más tolerantes
 * 4. Boost de confianza inteligente
 */
class TesseractOCRService {
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.isInitialized = true;
    console.log('✅ Tesseract OCR Service inicializado - Con preprocesamiento de imagen');
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  private validateFile(file: File): void {
    if (file.size > OCR_CONFIG.maxFileSize) {
      throw new Error(`Archivo demasiado grande. Máximo permitido: ${(OCR_CONFIG.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const supportedFormats = ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'];

    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      throw new Error(`Formato no soportado para OCR real. Use: ${supportedFormats.join(', ')}`);
    }
  }

  /**
   * Procesa un documento usando Tesseract OCR con configuración SIMPLE y EFECTIVA
   */
  async processDocument(file: File): Promise<{
    texto_completo: string;
    datos_ticket?: any;
    datos_factura?: any;
    confianza_general: number;
  }> {
    if (!this.isAvailable()) {
      throw new Error('Tesseract OCR no está disponible');
    }

    try {
      this.validateFile(file);

      console.log('🔍 Procesando con OCR OPTIMIZADO (Tesseract)...', file.name);
      console.log('⏳ Procesando con IA...');

      // PREPROCESAR IMAGEN para mejorar calidad
      let processedFile = file;
      try {
        // Paso 1: Escalar a tamaño óptimo
        processedFile = await ImagePreprocessor.scaleImageForOCR(file);

        // Paso 2: Mejorar contraste y eliminar ruido
        processedFile = await ImagePreprocessor.preprocessImage(processedFile);
      } catch (preprocError) {
        console.warn('⚠️ Error en preprocesamiento, usando imagen original:', preprocError);
        processedFile = file;
      }

      // CONFIGURACIÓN SIMPLE - Menos es MÁS
      // La configuración excesivamente compleja REDUCE la confianza al crear conflictos
      const optimalConfig = {
        // Motor LSTM moderno - mejor precisión que legacy
        oem: Tesseract.OEM.LSTM_ONLY,

        // PSM AUTO - Deja que Tesseract detecte el mejor layout
        // Forzar un modo específico (como SINGLE_BLOCK_VERT_TEXT) reduce confianza
        psm: Tesseract.PSM.AUTO,

        // Logger simple
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`📝 OCR: ${Math.round(m.progress * 100)}%`);
          }
        }
      };

      // Procesamiento con imagen PREPROCESADA
      const { data } = await Tesseract.recognize(
        processedFile, // Usar imagen PREPROCESADA
        'spa+eng', // Español + Inglés para documentos mexicanos
        optimalConfig
      );

      const fullText = data.text || '';
      let confidence = Math.round(data.confidence || 0);

      // Aplicar boost basado en contenido detectado
      confidence = this.boostConfidenceBasedOnContent(fullText, confidence);

      console.log('✅ OCR completado!', {
        confidence,
        textLength: fullText.length,
        fileName: file.name
      });

      console.log('📝 Texto extraído:', fullText.substring(0, 300) + '...');

      const documentType = this.detectDocumentType(fullText);
      console.log('🔍 Tipo detectado:', documentType);

      let extractedData: any = {};

      if (documentType === 'ticket') {
        extractedData.datos_ticket = this.extractRealTicketData(fullText);
        console.log('🎫 Datos de ticket:', extractedData.datos_ticket);
      } else if (documentType === 'factura') {
        extractedData.datos_factura = this.extractRealFacturaData(fullText);
        console.log('🧾 Datos de factura:', extractedData.datos_factura);
      }

      return {
        texto_completo: fullText,
        confianza_general: confidence,
        ...extractedData
      };

    } catch (error) {
      console.error('❌ Error en OCR:', error);
      throw new Error(`OCR falló: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private detectDocumentType(text: string): 'ticket' | 'factura' | 'auto' {
    const textLower = text.toLowerCase();

    // Factura CFDI
    if (textLower.includes('uuid') ||
        textLower.includes('rfc') ||
        textLower.includes('cfdi') ||
        textLower.includes('factura electronica') ||
        textLower.includes('factura electrónica')) {
      return 'factura';
    }

    // Ticket de compra
    if (textLower.includes('ticket') ||
        textLower.includes('comprobante') ||
        textLower.includes('total') ||
        textLower.includes('subtotal') ||
        textLower.includes('gracias por su compra') ||
        textLower.includes('gracias por su preferencia') ||
        textLower.includes('recibo')) {
      return 'ticket';
    }

    return 'auto';
  }

  private extractRealTicketData(text: string): any {
    // PATRONES ULTRA-TOLERANTES para tickets mexicanos con OCR imperfecto
    const patterns = {
      // Total - MUY flexible, tolera caracteres mal reconocidos
      // Busca patrones como "TOTAL", "T O T A L", "TBTAL", etc.
      total: /(?:t[o0a]t[a@]l|[il1|]mporte?|son|suma|pagar|a\s*pagar)[:\s=]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*\.?[0-9]{0,2})/gi,

      subtotal: /(?:subt[o0]tal|sub-t[o0]tal|sub\s*t[o0]tal|base|bs[e3])[:\s=]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*\.?[0-9]{0,2})/gi,

      iva: /(?:[il1|]v[a@]|[il1]\s*\.?\s*v\s*\.?\s*[a@]\s*\.?|impuesto|tax)[:\s=]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*\.?[0-9]{0,2})/gi,

      // Fechas en formatos mexicanos comunes - más tolerante
      fecha: /(?:f[e3]ch[a@]|fch[a@]|d[a@]te?|f\.|d[a@]t[e3])[:\s]*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\s+\d{2,4})/gi,

      hora: /(?:h[o0]r[a@]|hr|t[il1|]me?|h\.)[:\s]*(\d{1,2}[:\.]\d{2}(?:[:\.]\d{2})?(?:\s*[ap]m)?)/gi,

      // Establecimiento - nombres comunes, más tolerante con OCR malo
      establecimiento: /(?:tienda|super|farmacia|oxxo|7-eleven|walmart|soriana|chedraui|costco|sams|home depot|liverpool|palacio|sanborns|bodega aurrera|city club|office depot|comercial mexicana|coppel|elektra|suburbia|sears)\s*([A-Za-z0-9\s&\.,-]{0,60})/gi,

      telefono: /(?:t[e3]l|t[e3]l[é3e]fono|phone|t[é3e]l)[:\s]*([0-9]{2,3}[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{4}|[0-9]{10})/gi,

      direccion: /(?:d[il1|]r[e3]cc[il1|][óo]n|address|sucurs[a@]l|dom[il1|]c[il1|]l[il1|]o)[:\s]*([^\n\r]{10,100})/gi,

      rfc: /(?:rfc|r\s*\.?\s*f\s*\.?\s*c\s*\.?)[:\s]*([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/gi,
    };

    let total = this.extractNumber(text, patterns.total);
    let subtotal = this.extractNumber(text, patterns.subtotal);
    let iva = this.extractNumber(text, patterns.iva);

    // FALLBACK: Si no se encontró total, buscar CUALQUIER monto con $
    if (!total || total === 0) {
      console.warn('⚠️ No se encontró total con patrón estándar, buscando montos con $...');
      total = this.extractLargestAmount(text);
    }

    const extractedData = {
      establecimiento: this.extractPattern(text, patterns.establecimiento),
      direccion: this.extractPattern(text, patterns.direccion),
      telefono: this.extractPattern(text, patterns.telefono),
      rfc: this.extractPattern(text, patterns.rfc),
      fecha: this.extractPattern(text, patterns.fecha) || new Date().toISOString().split('T')[0],
      hora: this.extractPattern(text, patterns.hora),
      total,
      subtotal,
      iva,
      forma_pago: this.detectPaymentMethod(text),
      productos: this.extractProducts(text)
    };

    // Limpiar valores vacíos
    Object.keys(extractedData).forEach(key => {
      const value = (extractedData as any)[key];
      if (value === null || value === undefined || value === '') {
        delete (extractedData as any)[key];
      }
    });

    return extractedData;
  }

  private extractRealFacturaData(text: string): any {
    const patterns = {
      uuid: /(?:uuid|folio\s+fiscal|timbre)[:\s]*([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/gi,
      rfc_emisor: /(?:rfc\s+emisor|rfc\s+del\s+emisor|emisor\s+rfc)[:\s]*([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/gi,
      rfc_receptor: /(?:rfc\s+receptor|receptor\s+rfc|rfc\s+cliente)[:\s]*([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/gi,
      serie: /(?:serie|ser\.)[:\s]*([A-Z0-9]{1,25})/gi,
      folio: /(?:folio|fol\.?)[:\s]*([0-9]{1,40})/gi,
      total: /(?:total|importe\s+total|monto\s+total)[:\s]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*\.?[0-9]{0,2})/gi,
      subtotal: /(?:subtotal|sub\s*total|importe\s+antes)[:\s]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*\.?[0-9]{0,2})/gi,
      iva: /(?:iva|i\.?v\.?a\.?|impuesto\s+trasladado)[:\s]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*\.?[0-9]{0,2})/gi,
      fecha_emision: /(?:fecha\s+(?:de\s+)?(?:emisión|emision|expedición|expedicion)|fech[a\.]?\s+emis)[:\s]*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|\d{4}-\d{2}-\d{2})/gi,
      nombre_emisor: /(?:razón\s+social|razon\s+social|nombre\s+comercial|denominación|emisor)[:\s]*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñü\s&\.,\-]{5,100})/gi,
    };

    const extractedData = {
      uuid: this.extractPattern(text, patterns.uuid),
      rfc_emisor: this.extractPattern(text, patterns.rfc_emisor),
      rfc_receptor: this.extractPattern(text, patterns.rfc_receptor),
      serie: this.extractPattern(text, patterns.serie),
      folio: this.extractPattern(text, patterns.folio),
      fecha_emision: this.extractPattern(text, patterns.fecha_emision),
      nombre_emisor: this.extractPattern(text, patterns.nombre_emisor),
      total: this.extractNumber(text, patterns.total),
      subtotal: this.extractNumber(text, patterns.subtotal),
      iva: this.extractNumber(text, patterns.iva),
    };

    Object.keys(extractedData).forEach(key => {
      const value = (extractedData as any)[key];
      if (value === null || value === undefined || value === '') {
        delete (extractedData as any)[key];
      }
    });

    return extractedData;
  }

  private detectPaymentMethod(text: string): string | null {
    const textLower = text.toLowerCase();

    if (textLower.match(/efectivo|cash|dinero\s+en\s+efectivo/)) return 'Efectivo';
    if (textLower.match(/tarjeta|card|visa|mastercard|american\s+express/)) return 'Tarjeta';
    if (textLower.match(/transferencia|spei|transfer|deposito|depósito/)) return 'Transferencia';
    if (textLower.match(/cheque|chq/)) return 'Cheque';
    if (textLower.match(/vales?\s+de\s+despensa|sodexo|edenred/)) return 'Vales de despensa';

    return null;
  }

  private extractProducts(text: string): any[] {
    const lines = text.split('\n');
    const products = [];

    const excludePatterns = /^(total|subtotal|iva|fecha|hora|folio|ticket|cambio|recibido|gracias|atendio|atendió|cajero|vendedor|sucursal|cliente|nombre|direccion|rfc|tel)/i;

    for (const line of lines) {
      let cleanLine = line.trim()
        .replace(/[=\-_|]{3,}/g, ' ') // Remover separadores
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanLine.length < 3 || excludePatterns.test(cleanLine)) {
        continue;
      }

      // Patrones para productos con precios
      const productPatterns = [
        /^(.+?)\s+\$\s*([0-9]{1,3}(?:[,.]?[0-9]{3})*\.?[0-9]{0,2})$/,
        /^\$\s*([0-9]{1,3}(?:[,.]?[0-9]{3})*\.?[0-9]{0,2})\s+(.+)$/
      ];

      for (const pattern of productPatterns) {
        const match = cleanLine.match(pattern);
        if (match) {
          const producto = (pattern === productPatterns[0] ? match[1] : match[2]).trim();
          const precioStr = pattern === productPatterns[0] ? match[2] : match[1];
          const precio = parseFloat(precioStr.replace(/,/g, ''));

          if (producto.length >= 3 && precio > 0 && precio < 10000 && !excludePatterns.test(producto)) {
            products.push({
              nombre: producto,
              precio_total: precio
            });
            break;
          }
        }
      }
    }

    return products;
  }

  /**
   * Extrae el monto más grande encontrado en el texto
   * Útil como fallback cuando los patrones normales fallan
   */
  private extractLargestAmount(text: string): number | null {
    // Buscar TODOS los montos con formato $xxx.xx o xxx.xx
    const amountPattern = /\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*\.?[0-9]{0,2})/g;
    const matches = Array.from(text.matchAll(amountPattern));

    if (matches.length === 0) {
      console.warn('❌ No se encontraron montos en el texto');
      return null;
    }

    // Convertir todos los montos a números
    const amounts = matches
      .map(match => {
        const cleanNumber = match[1].replace(/[,\s]/g, '');
        return parseFloat(cleanNumber);
      })
      .filter(num => !isNaN(num) && num > 0 && num < 1000000); // Filtrar valores absurdos

    if (amounts.length === 0) {
      return null;
    }

    // Tomar el monto más grande (generalmente es el total)
    const largest = Math.max(...amounts);
    console.log(`💰 Monto más grande encontrado: $${largest.toFixed(2)} (de ${amounts.length} montos)`);

    return largest;
  }

  private extractPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1]?.trim() || null : null;
  }

  private extractNumber(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanNumber = match[1].replace(/,/g, '');
      const number = parseFloat(cleanNumber);
      return isNaN(number) ? null : number;
    }
    return null;
  }

  /**
   * Boost de confianza inteligente basado en contenido detectado
   */
  private boostConfidenceBasedOnContent(text: string, originalConfidence: number): number {
    let boost = 0;
    const textLower = text.toLowerCase();

    // Montos detectados (+15)
    if (textLower.match(/\$\s*\d+(?:[.,]\d{1,2})?/)) {
      boost += 15;
      console.log('💰 Montos detectados: +15 pts');
    }

    // Fechas (+10)
    if (textLower.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/)) {
      boost += 10;
      console.log('📅 Fechas detectadas: +10 pts');
    }

    // Términos fiscales (+12)
    if (textLower.match(/total|subtotal|iva|impuesto/)) {
      boost += 12;
      console.log('📊 Términos fiscales: +12 pts');
    }

    // RFC mexicano (+20)
    if (textLower.match(/[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}/)) {
      boost += 20;
      console.log('🆔 RFC: +20 pts');
    }

    // UUID CFDI (+25)
    if (textLower.match(/[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/)) {
      boost += 25;
      console.log('📄 UUID CFDI: +25 pts');
    }

    // Establecimiento conocido (+8)
    if (textLower.match(/oxxo|walmart|soriana|chedraui|costco|liverpool|sanborns|bodega aurrera/)) {
      boost += 8;
      console.log('🏪 Establecimiento: +8 pts');
    }

    // Marcas conocidas (+5)
    if (textLower.match(/coca cola|pepsi|bimbo|lala|nestlé|sabritas|gamesa|barcel/)) {
      boost += 5;
      console.log('🏷️ Marca conocida: +5 pts');
    }

    // Productos con precios (+variable)
    const productMatches = text.match(/[\w\s]{3,}\s+\$\s*\d+/g);
    if (productMatches && productMatches.length > 0) {
      const productBoost = Math.min(15, productMatches.length * 3);
      boost += productBoost;
      console.log(`📦 ${productMatches.length} productos: +${productBoost} pts`);
    }

    // PENALIZACIONES
    // Texto muy corto pero con datos clave = penalizar menos
    if (text.length < 50) {
      if (textLower.match(/total|subtotal|\$/)) {
        boost -= 5; // Penalizar menos si tiene datos útiles
        console.log('⚠️ Texto corto con datos: -5 pts');
      } else {
        boost -= 10;
        console.log('⚠️ Texto muy corto: -10 pts');
      }
    }

    // Muchos caracteres extraños (-15)
    const strangeChars = text.match(/[^\w\s$.,áéíóúñü\-:()\[\]{}%#&]/g);
    if (strangeChars && strangeChars.length > text.length * 0.2) {
      boost -= 15;
      console.log('⚠️ Caracteres extraños: -15 pts');
    }

    const finalConfidence = Math.min(98, Math.max(10, originalConfidence + boost));

    if (boost !== 0) {
      console.log(`🎯 Confianza: ${originalConfidence}% → ${finalConfidence}% (${boost > 0 ? '+' : ''}${boost} pts)`);
    }

    return finalConfidence;
  }
}

export const tesseractOCRService = new TesseractOCRService();
export default TesseractOCRService;
