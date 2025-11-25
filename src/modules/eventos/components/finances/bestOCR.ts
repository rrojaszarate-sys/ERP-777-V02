import { compressImage } from '../../../../shared/utils/imageCompression';

/**
 * OCR de alta calidad usando OCR.space API
 * Alternativa gratuita y de alta calidad a Google Vision
 */

interface OCRSpaceResponse {
  text: string;
  confidence: number;
}

/**
 * Procesa imagen usando OCR.space (calidad similar a Google Vision)
 */
export async function processWithHighQualityOCR(file: File): Promise<OCRSpaceResponse> {
  console.log('🚀 Procesando con OCR de alta calidad (OCR.space)...');

  try {
    // Comprimir imagen si es necesario (límite OCR.space: 1MB)
    const fileSizeKB = file.size / 1024;
    console.log(`📏 Tamaño original: ${fileSizeKB.toFixed(1)}KB`);
    
    let processFile = file;
    if (fileSizeKB > 1024) {
      console.log('🔄 Comprimiendo imagen para OCR.space...');
      processFile = await compressImage(file, { maxSizeKB: 1024 });
    }

    // OCR.space API - gratuita y de alta calidad
    const formData = new FormData();
    formData.append('file', processFile);
    formData.append('language', 'spa'); // Español
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 es el mejor para español

    console.log('📤 Enviando a OCR.space...');

    // Crear promesa con timeout de 30 segundos
    const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Timeout: OCR.space tardó más de 30 segundos');
        }
        throw error;
      }
    };

    const response = await fetchWithTimeout('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': 'helloworld' // API key gratuita pública
      },
      body: formData
    }, 30000); // 30 segundos timeout

    if (!response.ok) {
      throw new Error(`OCR.space error: ${response.status}`);
    }

    const result = await response.json();
    console.log('📋 Respuesta OCR.space:', result);

    if (result.OCRExitCode !== 1) {
      throw new Error(`OCR.space falló: ${result.ErrorMessage}`);
    }

    const text = result.ParsedResults?.[0]?.ParsedText || '';
    
    if (!text.trim()) {
      throw new Error('No se detectó texto en la imagen');
    }

    // OCR.space no proporciona confidence score, pero es muy preciso
    const confidence = 90;

    console.log('✅ OCR.space exitoso:', text.length, 'caracteres');
    console.log('🎯 Confianza estimada:', confidence + '%');

    return {
      text: text.trim(),
      confidence
    };

  } catch (error) {
    console.error('❌ Error OCR.space:', error);
    throw error;
  }
}

/**
 * Procesa con múltiples servicios de alta calidad
 */
export async function processWithBestOCR(file: File): Promise<OCRSpaceResponse> {
  console.log('🎯 Iniciando procesamiento OCR de máxima calidad...');

  // Detectar si es PDF
  const isPDF = file.type === 'application/pdf';
  
  if (isPDF) {
    console.log('📄 PDF detectado - usando OCR.space directamente (mejor compatibilidad)');
    try {
      return await processWithHighQualityOCR(file);
    } catch (error) {
      console.error('❌ OCR.space falló para PDF:', error);
      throw new Error('No se pudo procesar el PDF. Intenta con una imagen o verifica que el PDF contenga texto.');
    }
  }

  // Para imágenes, usar el flujo normal
  const methods = [
    // Método 1: Google Vision (MÁXIMA CALIDAD - solo imágenes)
    async () => {
      console.log('🔄 Procesando con Google Vision API...');
      const { processWithRealGoogleVision } = await import('./realGoogleVision');
      return await processWithRealGoogleVision(file);
    },

    // Método 2: Tesseract optimizado (fallback confiable)
    async () => {
      console.log('🔄 Fallback a Tesseract optimizado...');
      const { createWorker } = await import('tesseract.js');
      
      const worker = await createWorker(['spa', 'eng']);
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ$.,:%/-() '
      });

      const { data } = await worker.recognize(file);
      await worker.terminate();

      return {
        text: data.text,
        confidence: Math.round(data.confidence)
      };
    },

    // Método 3: OCR.space (última opción)
    async () => {
      console.log('🔄 Última opción: OCR.space...');
      return await processWithHighQualityOCR(file);
    }
  ];

  // Probar cada método hasta que uno funcione
  for (const [index, method] of methods.entries()) {
    try {
      console.log(`🎪 Probando método ${index + 1}...`);
      const result = await method();
      
      if (result.text.trim().length > 20) { // Texto razonable
        console.log(`✅ Método ${index + 1} exitoso!`);
        console.log('📊 Calidad del texto:', result.confidence + '%');
        return result;
      } else {
        console.warn(`⚠️ Método ${index + 1} - texto muy corto:`, result.text.length, 'caracteres');
      }
    } catch (error) {
      console.warn(`⚠️ Método ${index + 1} falló:`, error);
    }
  }

  throw new Error('Todos los métodos OCR fallaron');
}