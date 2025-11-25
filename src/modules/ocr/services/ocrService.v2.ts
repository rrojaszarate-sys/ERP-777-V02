/**
 * SERVICIO OCR V2 - RECONSTRUCCIÓN COMPLETA
 *
 * Sistema híbrido profesional:
 * 1. Google Vision API (backend) - Alta precisión
 * 2. Tesseract.js (frontend) - Fallback sin backend
 *
 * Optimizado para:
 * - Tickets y facturas mexicanas
 * - Español México (sin distorsión de caracteres)
 * - Extracción precisa de montos
 */

import Tesseract from 'tesseract.js';
import { ImagePreprocessor } from '../utils/imagePreprocessor';

// Detectar si estamos en producción (Vercel) o desarrollo (local)
const isProduction = import.meta.env.PROD || (typeof window !== 'undefined' && window.location.hostname !== 'localhost');
const OCR_API_URL = import.meta.env.VITE_OCR_API_URL || (isProduction ? '' : 'http://localhost:3001');
const OCR_ENDPOINT = isProduction ? '/api/ocr-process' : `${OCR_API_URL}/api/ocr/process`;

export interface OCRResult {
  success: boolean;
  texto_completo: string;
  confianza_general: number;
  datos_extraidos: {
    establecimiento: string | null;
    direccion: string | null;
    telefono: string | null;
    rfc: string | null;
    fecha: string | null;
    hora: string | null;
    total: number | null;
    subtotal: number | null;
    iva: number | null;
    forma_pago: string | null;
    productos: Array<{
      nombre: string;
      precio_unitario: number;
      cantidad: number;
    }>;
  };
  procesador: 'google_vision' | 'tesseract';
  warning?: string;
}

class OCRServiceV2 {
  private backendAvailable: boolean | null = null;

  /**
   * MÉTODO PRINCIPAL: Procesa documento con mejor método disponible
   */
  async processDocument(file: File): Promise<OCRResult> {
    console.log('🔍 OCR V2: Procesando documento:', file.name);

    // Paso 1: Intentar con Google Vision (backend)
    try {
      const result = await this.processWithGoogleVision(file);
      console.log('✅ Procesado con Google Vision API');
      return result;
    } catch (error) {
      console.warn('⚠️ Google Vision no disponible, usando Tesseract fallback');
      console.warn('Error:', error instanceof Error ? error.message : 'Unknown');
    }

    // Paso 2: Fallback a Tesseract (local)
    try {
      const result = await this.processWithTesseract(file);
      console.log('✅ Procesado con Tesseract.js (fallback)');
      return result;
    } catch (error) {
      console.error('❌ Error en Tesseract fallback:', error);
      throw new Error('No se pudo procesar el documento con ningún método OCR');
    }
  }

  /**
   * Procesa con Google Vision API (backend)
   * Método preferido por su alta precisión
   */
  private async processWithGoogleVision(file: File): Promise<OCRResult> {
    // Verificar disponibilidad del backend
    if (this.backendAvailable === false) {
      throw new Error('Backend no disponible');
    }

    // En producción: enviar base64 como JSON, en desarrollo: FormData
    let body: FormData | string;
    let headers: Record<string, string> = {};
    
    if (isProduction) {
      const base64 = await this.fileToBase64(file);
      body = JSON.stringify({ image: base64 });
      headers['Content-Type'] = 'application/json';
    } else {
      const formData = new FormData();
      formData.append('file', file);
      body = formData;
    }

    const response = await fetch(OCR_ENDPOINT, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(30000) // 30s timeout
    });

    if (!response.ok) {
      this.backendAvailable = false;
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    this.backendAvailable = true;
    const data = await response.json();

    return {
      success: true,
      texto_completo: data.texto_completo,
      confianza_general: data.confianza_general,
      datos_extraidos: data.datos_extraidos,
      procesador: 'google_vision'
    };
  }

  /**
   * Convierte archivo a base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Clean = base64.split(',')[1];
        resolve(base64Clean);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Procesa con Tesseract.js (fallback local)
   * Usado cuando backend no está disponible
   */
  private async processWithTesseract(file: File): Promise<OCRResult> {
    console.log('⏳ Procesando con Tesseract.js...');

    // Preprocesar imagen para mejor calidad
    let processedFile = file;
    try {
      processedFile = await ImagePreprocessor.scaleImageForOCR(file);
      processedFile = await ImagePreprocessor.preprocessImage(processedFile);
    } catch (error) {
      console.warn('⚠️ Error en preprocesamiento:', error);
    }

    // Configuración optimizada para español México
    const { data } = await Tesseract.recognize(
      processedFile,
      'spa', // Solo español para mejor precisión
      {
        oem: Tesseract.OEM.LSTM_ONLY,
        psm: Tesseract.PSM.AUTO,
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`📝 OCR: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    const fullText = data.text || '';
    const confidence = Math.round(data.confidence || 0);

    // Extraer datos con mismo extractor que backend
    const datos_extraidos = this.extractMexicanTicketData(fullText);

    return {
      success: true,
      texto_completo: fullText,
      confianza_general: confidence,
      datos_extraidos,
      procesador: 'tesseract',
      warning: 'Procesado localmente. Para mejor calidad, active el backend con Google Vision.'
    };
  }

  /**
   * Extractor de datos para tickets mexicanos
   * IDÉNTICO al del backend para consistencia
   */
  private extractMexicanTicketData(text: string): OCRResult['datos_extraidos'] {
    const data: OCRResult['datos_extraidos'] = {
      establecimiento: null,
      direccion: null,
      telefono: null,
      rfc: null,
      fecha: null,
      hora: null,
      total: null,
      subtotal: null,
      iva: null,
      forma_pago: null,
      productos: []
    };

    // PATRONES OPTIMIZADOS PARA ESPAÑOL MEXICANO
    const patterns = {
      rfc: /RFC[\s:]*([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/i,
      telefono: /(?:TEL|TELÉFONO|TELEFONO|TEL\.|T\.)[\s:]*(\(?[0-9]{2,3}\)?[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{4})/i,
      fecha: /(?:FECHA|FCHA|F\.)[\s:]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
      hora: /(?:HORA|HR|H\.)[\s:]*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s*[AP]M)?)/i,
      total: /(?:TOTAL|T\s*O\s*T\s*A\s*L|IMPORTE\s*TOTAL)[\s:$]*([0-9]{1,3}(?:,?[0-9]{3})*\.?[0-9]{0,2})/i,
      subtotal: /(?:SUBTOTAL|SUB-TOTAL|SUB\s*TOTAL)[\s:$]*([0-9]{1,3}(?:,?[0-9]{3})*\.?[0-9]{0,2})/i,
      iva: /(?:IVA|I\.V\.A\.|IMPUESTO)[\s:$]*([0-9]{1,3}(?:,?[0-9]{3})*\.?[0-9]{0,2})/i,
      direccion: /(?:DIRECCIÓN|DIRECCION|DOMICILIO|DIR\.|SUCURSAL)[\s:]*([^\n]{20,100})/i,
    };

    // Extraer con patrones
    Object.keys(patterns).forEach(key => {
      const match = text.match(patterns[key as keyof typeof patterns]);
      if (match) {
        (data as any)[key] = match[1].trim();
      }
    });

    // Convertir montos a números
    (['total', 'subtotal', 'iva'] as const).forEach(key => {
      if (data[key]) {
        data[key] = parseFloat(String(data[key]).replace(/,/g, ''));
      }
    });

    // Si no se encontró total, buscar el monto más grande
    if (!data.total || data.total === 0) {
      const amounts = text.match(/\$?\s*([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/g);
      if (amounts && amounts.length > 0) {
        const parsed = amounts.map(a => parseFloat(a.replace(/[$,]/g, ''))).filter(n => n > 0);
        if (parsed.length > 0) {
          data.total = Math.max(...parsed);
          console.log('💰 Total detectado como monto máximo:', data.total);
        }
      }
    }

    // Detectar establecimiento
    const lines = text.split('\n').filter(l => l.trim().length > 3);
    if (lines.length > 0) {
      const conocidos = ['OXXO', 'WALMART', 'SORIANA', 'CHEDRAUI', 'COSTCO', 'SAMS', '7-ELEVEN',
                         'HOME DEPOT', 'LIVERPOOL', 'PALACIO', 'SUBURBIA', 'COPPEL', 'ELEKTRA'];

      for (const line of lines.slice(0, 5)) {
        const lineUpper = line.toUpperCase();
        if (conocidos.some(e => lineUpper.includes(e))) {
          data.establecimiento = line.trim();
          break;
        }
      }

      if (!data.establecimiento && lines[0].length > 5) {
        data.establecimiento = lines[0].trim();
      }
    }

    // Detectar forma de pago
    const textLower = text.toLowerCase();
    if (textLower.includes('efectivo') || textLower.includes('cash')) {
      data.forma_pago = 'efectivo';
    } else if (textLower.includes('tarjeta') || textLower.includes('card') || textLower.includes('visa') || textLower.includes('mastercard')) {
      data.forma_pago = 'tarjeta';
    } else if (textLower.includes('transferencia') || textLower.includes('transfer')) {
      data.forma_pago = 'transferencia';
    }

    // Extraer productos
    const productLines = text.split('\n');
    productLines.forEach(line => {
      const match = line.match(/^([A-ZÁÉÍÓÚÑ][A-Za-z0-9áéíóúñ\s]{2,40})\s+\$?\s*([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/);
      if (match) {
        const producto = match[1].trim();
        const precio = parseFloat(match[2].replace(/,/g, ''));

        if (!producto.match(/TOTAL|SUBTOTAL|IVA|CAMBIO|PAGO/i) && precio > 0 && precio < 10000) {
          data.productos.push({
            nombre: producto,
            precio_unitario: precio,
            cantidad: 1
          });
        }
      }
    });

    return data;
  }

  /**
   * Verifica disponibilidad del backend
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${OCR_API_URL}/health`, {
        signal: AbortSignal.timeout(5000)
      });
      const data = await response.json();
      this.backendAvailable = response.ok && data.status === 'ok';
      return this.backendAvailable;
    } catch (error) {
      this.backendAvailable = false;
      return false;
    }
  }
}

// Singleton
export const ocrServiceV2 = new OCRServiceV2();
