import Tesseract from 'tesseract.js';
import { OCR_CONFIG } from '../../../core/config/googleCloud';

/**
 * Servicio OCR Real usando Tesseract.js
 * CONFIGURACIÓN OPTIMIZADA PARA PRODUCCIÓN - Simple y Efectiva
 *
 * MEJORAS APLICADAS:
 * 1. Configuración simple (menos es MÁS)
 * 2. Sin preprocesamiento agresivo
 * 3. Patrones regex mejorados
 * 4. Boost de confianza inteligente
 */
class TesseractOCRService {
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.isInitialized = true;
    console.log('✅ Tesseract OCR Service inicializado - Configuración OPTIMIZADA para producción');
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

      // Procesamiento DIRECTO sin preprocesamiento agresivo
      // El preprocesamiento puede REDUCIR calidad en imágenes ya claras
      // Tesseract tiene preprocesamiento interno optimizado
      const { data } = await Tesseract.recognize(
        file, // Usar imagen ORIGINAL
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
    console.log('🔍 Texto completo a analizar:', text.substring(0, 500));

    // PATRONES ULTRA FLEXIBLES - Buscan en TODO el texto, no solo después de etiquetas
    const patterns = {
      // Total - BUSCAR CUALQUIER NÚMERO CON $ EN EL CONTEXTO DE "TOTAL"
      total: [
        /(?:total|importe|son|suma|pagar|a\s*pagar|t\s*o\s*t\s*a\s*l|tot\s*a\s*l)[:\s=]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*[.,]?[0-9]{0,2})/gi,
        /\$\s*([0-9]{1,3}[.,][0-9]{2}).*(?:total|pagar)/gi, // $ antes
        /(?:total|pagar).*\$\s*([0-9]{1,3}[.,][0-9]{2})/gi, // $ después
      ],

      subtotal: [
        /(?:subtotal|sub-total|sub\s*total|base)[:\s=]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*[.,]?[0-9]{0,2})/gi,
        /\$\s*([0-9]{1,3}[.,][0-9]{2}).*subtotal/gi,
      ],

      iva: [
        /(?:iva|i\.?v\.?a\.?|impuesto|tax)[:\s=]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*[.,]?[0-9]{0,2})/gi,
        /\$\s*([0-9]{1,3}[.,][0-9]{2}).*iva/gi,
      ],

      // Fechas - MÁS FLEXIBLE (buscar CUALQUIER patrón de fecha)
      fecha: [
        /(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/gi, // 09/10/2025 o 09-10-25
        /(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\s*\d{2,4})/gi, // 09 Oct 2025
        /(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2})/gi, // 2025-10-09
      ],

      // Hora - cualquier patrón HH:MM
      hora: [
        /(\d{1,2}[:\.]\d{2}(?:[:\.]\d{2})?(?:\s*[ap]m)?)/gi,
      ],

      // Establecimiento - PRIMERAS LÍNEAS del texto (donde suele estar)
      establecimiento: [
        // Buscar en las primeras 3 líneas
        /^([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñü\s&\.,-]{2,60})/m,
        /^(?:tienda|super|farmacia)?\s*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñü\s&\.,-]{2,60})/im,
        // Marcas conocidas en CUALQUIER parte
        /(OXXO|WALMART|SORIANA|CHEDRAUI|COSTCO|SAM'?S|7-ELEVEN|BODEGA\s*AURRERA|LIVERPOOL|PALACIO|SANBORNS|HOME\s*DEPOT)/gi,
      ],

      telefono: [
        /([0-9]{10})/g, // 10 dígitos seguidos
        /([0-9]{2,3}[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{4})/g,
      ],

      direccion: [
        /(?:dirección|direccion|address|sucursal|domicilio)[:\s]*([^\n\r]{10,100})/gi,
        /([A-Z][a-záéíóúñü\s]+\d+[^\n\r]{5,80})/gi, // Dirección genérica (letra + número)
      ],

      rfc: [
        /([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/g, // RFC en cualquier parte
      ],
    };

    const extractedData = {
      establecimiento: this.extractPattern(text, patterns.establecimiento),
      direccion: this.extractPattern(text, patterns.direccion),
      telefono: this.extractPattern(text, patterns.telefono),
      rfc: this.extractPattern(text, patterns.rfc),
      fecha: this.extractPattern(text, patterns.fecha) || new Date().toISOString().split('T')[0],
      hora: this.extractPattern(text, patterns.hora),
      total: this.extractNumber(text, patterns.total),
      subtotal: this.extractNumber(text, patterns.subtotal),
      iva: this.extractNumber(text, patterns.iva),
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

    console.log(`🔍 Analizando ${lines.length} líneas para productos...`);

    const excludePatterns = /^(total|subtotal|iva|fecha|hora|folio|ticket|cambio|recibido|gracias|atendio|atendió|cajero|vendedor|sucursal|cliente|nombre|direccion|rfc|tel|tarjeta|efectivo|credito|debito)/i;

    for (const line of lines) {
      let cleanLine = line.trim()
        .replace(/[=\-_|]{3,}/g, ' ') // Remover separadores largos
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanLine.length < 3 || excludePatterns.test(cleanLine)) {
        continue;
      }

      // Patrones MUY FLEXIBLES para productos con precios
      const productPatterns = [
        // Formato: "Producto $123.45"
        /^(.+?)\s+\$\s*([0-9]{1,3}(?:[,.]?[0-9]{3})*[.,]?[0-9]{0,2})$/,
        // Formato: "$ 123.45 Producto"
        /^\$\s*([0-9]{1,3}(?:[,.]?[0-9]{3})*[.,]?[0-9]{0,2})\s+(.+)$/,
        // Formato: "Producto    123.45" (sin $)
        /^(.+?)\s{2,}([0-9]{1,3}[.,][0-9]{2})$/,
        // Formato: "123.45 Producto" (número primero sin $)
        /^([0-9]{1,3}[.,][0-9]{2})\s+(.+)$/,
        // Formato: "Producto 123.45" (con un solo espacio)
        /^([A-Za-záéíóúñüÁÉÍÓÚÑÜ\s]{3,30})\s+([0-9]{1,3}[.,][0-9]{2})$/,
      ];

      for (let i = 0; i < productPatterns.length; i++) {
        const pattern = productPatterns[i];
        const match = cleanLine.match(pattern);

        if (match) {
          let producto = '';
          let precioStr = '';

          // Determinar qué grupo es producto y cuál es precio
          if (i === 0 || i === 2 || i === 4) {
            // Producto primero, precio segundo
            producto = match[1].trim();
            precioStr = match[2];
          } else {
            // Precio primero, producto segundo
            precioStr = match[1];
            producto = match[2].trim();
          }

          const precio = parseFloat(precioStr.replace(/,/g, '').replace(/\s/g, ''));

          // Validaciones más flexibles
          if (producto.length >= 2 &&
              precio > 0 &&
              precio < 50000 && // Aumentar límite
              !excludePatterns.test(producto) &&
              !/^[0-9\s.,]+$/.test(producto)) { // No solo números

            products.push({
              nombre: producto,
              precio_total: precio
            });

            console.log(`📦 Producto encontrado: ${producto} = $${precio}`);
            break; // Solo un patrón por línea
          }
        }
      }
    }

    console.log(`✅ Total de productos extraídos: ${products.length}`);
    return products;
  }

  private extractPattern(text: string, patterns: RegExp | RegExp[]): string | null {
    // Si es un solo patrón, convertir a array
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    // Probar cada patrón hasta encontrar un match
    for (const pattern of patternArray) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const result = match[1].trim();
        if (result.length > 0) {
          console.log(`✅ Patrón encontrado: ${result.substring(0, 50)}`);
          return result;
        }
      }
    }

    return null;
  }

  private extractNumber(text: string, patterns: RegExp | RegExp[]): number | null {
    // Si es un solo patrón, convertir a array
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    // Probar cada patrón hasta encontrar un match
    for (const pattern of patternArray) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const cleanNumber = match[1].replace(/,/g, '').replace(/\s/g, '');
        const number = parseFloat(cleanNumber);
        if (!isNaN(number) && number > 0) {
          console.log(`💵 Número encontrado: ${number}`);
          return number;
        }
      }
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
