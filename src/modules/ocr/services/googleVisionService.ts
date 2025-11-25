import { OCR_CONFIG } from '../../../core/config/googleCloud';

/**
 * Servicio OCR mejorado que funciona en el navegador
 * 
 * NOTA IMPORTANTE: Google Cloud Vision API está diseñada para backend (Node.js),
 * no para navegadores por razones de seguridad. Esta implementación usa:
 * 
 * 1. Simulación inteligente para desarrollo/demo
 * 2. Procesamiento real de texto para casos simples
 * 
 * Para implementación real en producción, se necesita:
 * - API Backend que llame a Google Vision
 * - O usar Tesseract.js para OCR local en navegador
 */
class GoogleVisionService {
  private isConfigured: boolean = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    // Verificar si tenemos configuración OCR
    this.isConfigured = import.meta.env.VITE_OCR_ENABLED === 'true';

    if (this.isConfigured) {
      console.log('✅ OCR Service inicializado correctamente (modo navegador)');
      console.log('📝 Usando simulación inteligente - Para producción use backend con Google Vision');
    } else {
      console.warn('⚠️ OCR no habilitado');
    }
  }

  /**
   * Verifica si OCR está disponible
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Valida el archivo antes del procesamiento
   */
  private validateFile(file: File): void {
    // Validar tamaño
    if (file.size > OCR_CONFIG.maxFileSize) {
      throw new Error(`Archivo demasiado grande. Máximo permitido: ${(OCR_CONFIG.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
    }

    // Validar tipo
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !OCR_CONFIG.supportedFormats.includes(fileExtension)) {
      throw new Error(`Tipo de archivo no soportañldlllllllllllo. Formatos permitidos: ${OCR_CONFIG.supportedFormats.join(', ')}`);
    }
  }

  /**
   * Procesa un documento usando simulación inteligente
   * En producción real, esto debería conectarse a un backend con Google Vision
   */
  async processDocument(file: File): Promise<{
    texto_completo: string;
    datos_ticket?: any;
    datos_factura?: any;
    confianza_general: number;
  }> {
    if (!this.isAvailable()) {
      throw new Error('OCR no está configurado o disponible');
    }

    try {
      // Validar archivo
      this.validateFile(file);
      
      console.log('🤖 Procesando documento con OCR simulado inteligente...', file.name);
      
      // Simular tiempo de procesamiento real
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
      
      // Analizar nombre del archivo y tipo para simulación inteligente
      const fileName = file.name.toLowerCase();
      const isTicket = fileName.includes('ticket') || fileName.includes('recibo') || fileName.includes('comprobante');
      const isFactura = fileName.includes('factura') || fileName.includes('cfdi') || fileName.includes('invoice');
      
      // Generar datos de OCR simulados pero realistas
      const documentType = this.detectDocumentTypeFromFile(file);
      const confidence = this.generateRealisticConfidence(file);
      
      let extractedData: any = {};
      let fullText = '';

      if (documentType === 'ticket') {
        extractedData.datos_ticket = this.generateTicketData(file);
        fullText = this.generateTicketText(extractedData.datos_ticket);
      } else if (documentType === 'factura') {
        extractedData.datos_factura = this.generateFacturaData(file);
        fullText = this.generateFacturaText(extractedData.datos_factura);
      } else {
        // Documento genérico
        fullText = this.generateGenericText(file);
      }

      console.log('✅ Documento procesado exitosamente', { 
        type: documentType, 
        confidence, 
        fileName: file.name 
      });

      return {
        texto_completo: fullText,
        confianza_general: confidence,
        ...extractedData,
      };
      
    } catch (error) {
      console.error('Error processing with Google Vision:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error en Google Vision API: ${errorMessage}`);
    }
  }

  /**
   * Calcula la confianza promedio del OCR
   */
  private calculateConfidence(result: any): number {
    if (!result.textAnnotations || result.textAnnotations.length === 0) {
      return 0;
    }

    let totalConfidence = 0;
    let count = 0;

    result.textAnnotations.forEach((annotation: any) => {
      if (annotation.confidence !== undefined) {
        totalConfidence += annotation.confidence;
        count++;
      }
    });

    return count > 0 ? Math.round((totalConfidence / count) * 100) : 85;
  }

  /**
   * Detecta el tipo de documento basado en el texto
   */
  private detectDocumentType(text: string): 'ticket' | 'factura' | 'auto' {
    const textLower = text.toLowerCase();
    
    // Patrones para facturas
    if (textLower.includes('uuid') || 
        textLower.includes('rfc') ||
        textLower.includes('cfdi') ||
        textLower.includes('factura')) {
      return 'factura';
    }
    
    // Patrones para tickets
    if (textLower.includes('ticket') ||
        textLower.includes('total') ||
        textLower.includes('subtotal')) {
      return 'ticket';
    }
    
    return 'auto';
  }

  /**
   * Extrae datos específicos de tickets
   */
  private extractTicketData(text: string, _visionResult: any): any {
    // Implementar lógica de extracción usando regex y patrones
    const patterns = {
      total: /total[:\s]*\$?[\s]*([0-9,]+\.?[0-9]*)/i,
      fecha: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      hora: /(\d{1,2}:\d{2})/,
      // Agregar más patrones según necesites
    };

    return {
      establecimiento: this.extractPattern(text, /establecimiento[:\s]*(.*)/i),
      total: this.extractNumber(text, patterns.total),
      fecha: this.extractPattern(text, patterns.fecha),
      hora: this.extractPattern(text, patterns.hora),
      // Más campos según tus necesidades
    };
  }

  /**
   * Extrae datos específicos de facturas
   */
  private extractFacturaData(text: string, _visionResult: any): any {
    return {
      uuid: this.extractPattern(text, /uuid[:\s]*([a-f0-9-]{36})/i),
      rfc_emisor: this.extractPattern(text, /rfc[:\s]*([a-z0-9]{12,13})/i),
      total: this.extractNumber(text, /total[:\s]*\$?[\s]*([0-9,]+\.?[0-9]*)/i),
      // Más campos según tus necesidades
    };
  }

  private extractPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1]?.trim() : null;
  }

  private extractNumber(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanNumber = match[1].replace(/,/g, '');
      return parseFloat(cleanNumber);
    }
    return null;
  }

  // ==================== MÉTODOS PARA SIMULACIÓN INTELIGENTE ====================

  /**
   * Detecta el tipo de documento basado en el archivo
   */
  private detectDocumentTypeFromFile(file: File): 'ticket' | 'factura' | 'auto' {
    const fileName = file.name.toLowerCase();
    
    if (fileName.includes('ticket') || fileName.includes('recibo') || fileName.includes('comprobante')) {
      return 'ticket';
    }
    
    if (fileName.includes('factura') || fileName.includes('cfdi') || fileName.includes('invoice')) {
      return 'factura';
    }
    
    return 'auto';
  }

  /**
   * Genera confianza realista basada en el archivo
   */
  private generateRealisticConfidence(file: File): number {
    const fileName = file.name.toLowerCase();
    const fileSize = file.size;
    
    // Archivos PDF tienden a tener mejor OCR
    if (fileName.endsWith('.pdf')) {
      return Math.floor(Math.random() * 15) + 85; // 85-100%
    }
    
    // Archivos muy pequeños o muy grandes tienen menor confianza
    if (fileSize < 50000 || fileSize > 5000000) {
      return Math.floor(Math.random() * 20) + 60; // 60-80%
    }
    
    // Confianza normal
    return Math.floor(Math.random() * 20) + 75; // 75-95%
  }

  /**
   * Genera datos realistas de ticket
   */
  private generateTicketData(file: File): any {
    const now = new Date();
    const restaurants = [
      'Restaurante Los Comales', 'Tacos El Buen Sabor', 'Café Central',
      'Pizza Italiana', 'Sushi Tokyo', 'Mariscos La Bahía'
    ];
    
    return {
      establecimiento: restaurants[Math.floor(Math.random() * restaurants.length)],
      direccion: 'Av. Principal #' + (Math.floor(Math.random() * 999) + 100) + ', CDMX',
      telefono: '55' + Math.floor(Math.random() * 90000000 + 10000000),
      fecha: now.toISOString().split('T')[0],
      hora: Math.floor(Math.random() * 12 + 8) + ':' + (Math.floor(Math.random() * 6) * 10),
      total: parseFloat((Math.random() * 500 + 50).toFixed(2)),
      subtotal: parseFloat((Math.random() * 400 + 45).toFixed(2)),
      iva: parseFloat((Math.random() * 80 + 8).toFixed(2)),
      forma_pago: ['Efectivo', 'Tarjeta', 'Transferencia'][Math.floor(Math.random() * 3)],
      productos: this.generateTicketProducts()
    };
  }

  private generateTicketProducts(): any[] {
    const products = [
      'Tacos al Pastor', 'Quesadilla', 'Refresco', 'Agua', 'Torta',
      'Hamburguesa', 'Pizza Margherita', 'Ensalada César', 'Café Americano'
    ];
    
    const numProducts = Math.floor(Math.random() * 4) + 1;
    return Array.from({ length: numProducts }, () => ({
      nombre: products[Math.floor(Math.random() * products.length)],
      cantidad: Math.floor(Math.random() * 3) + 1,
      precio_unitario: parseFloat((Math.random() * 100 + 20).toFixed(2)),
      precio_total: parseFloat((Math.random() * 200 + 25).toFixed(2))
    }));
  }

  /**
   * Genera datos realistas de factura
   */
  private generateFacturaData(file: File): any {
    const companies = [
      'Tecnología Avanzada SA de CV', 'Servicios Empresariales MX',
      'Distribuidora Nacional', 'Consultores Profesionales'
    ];
    
    return {
      uuid: this.generateUUID(),
      serie: ['A', 'B', 'F'][Math.floor(Math.random() * 3)],
      folio: String(Math.floor(Math.random() * 9000) + 1000),
      rfc_emisor: this.generateRFC(),
      nombre_emisor: companies[Math.floor(Math.random() * companies.length)],
      rfc_receptor: this.generateRFC(),
      subtotal: parseFloat((Math.random() * 5000 + 1000).toFixed(2)),
      iva: parseFloat((Math.random() * 800 + 160).toFixed(2)),
      total: parseFloat((Math.random() * 5800 + 1160).toFixed(2)),
      forma_pago: '03',
      metodo_pago: 'PUE',
      fecha_emision: new Date().toISOString().split('T')[0],
      estado: 'Vigente',
      validado_sat: Math.random() > 0.2 // 80% válido
    };
  }

  /**
   * Genera texto simulado de ticket
   */
  private generateTicketText(data: any): string {
    return `${data.establecimiento}
${data.direccion}
Tel: ${data.telefono}

FECHA: ${data.fecha}
HORA: ${data.hora}

${data.productos?.map((p: any) => 
  `${p.cantidad} ${p.nombre} $${p.precio_total}`
).join('\n') || ''}

SUBTOTAL: $${data.subtotal}
IVA: $${data.iva}
TOTAL: $${data.total}

FORMA DE PAGO: ${data.forma_pago}

¡GRACIAS POR SU COMPRA!`;
  }

  /**
   * Genera texto simulado de factura
   */
  private generateFacturaText(data: any): string {
    return `FACTURA ELECTRÓNICA

${data.nombre_emisor}
RFC: ${data.rfc_emisor}

Serie: ${data.serie}  Folio: ${data.folio}
UUID: ${data.uuid}

Fecha: ${data.fecha_emision}

SUBTOTAL: $${data.subtotal}
IVA (16%): $${data.iva}
TOTAL: $${data.total}

Método de Pago: ${data.metodo_pago}
Forma de Pago: ${data.forma_pago}

Estado SAT: ${data.estado}`;
  }

  /**
   * Genera texto genérico
   */
  private generateGenericText(file: File): string {
    return `Documento procesado: ${file.name}
Tamaño: ${(file.size / 1024).toFixed(1)} KB
Tipo: ${file.type || 'Desconocido'}
Fecha de procesamiento: ${new Date().toLocaleString()}

Este es un documento de ejemplo procesado con OCR simulado.
En producción real, este texto sería extraído del contenido real del documento.`;
  }

  /**
   * Genera UUID simulado
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Genera RFC mexicano simulado
   */
  private generateRFC(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let rfc = '';
    for (let i = 0; i < 4; i++) {
      rfc += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 6; i++) {
      rfc += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    for (let i = 0; i < 3; i++) {
      rfc += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    return rfc;
  }
}

export const googleVisionService = new GoogleVisionService();