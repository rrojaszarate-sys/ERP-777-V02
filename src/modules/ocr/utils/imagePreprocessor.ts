/**
 * PREPROCESADOR DE IMÁGENES PARA OCR
 *
 * Mejora la calidad de imágenes antes del procesamiento OCR
 * Optimizado para tickets y facturas mexicanas
 */

export class ImagePreprocessor {
  /**
   * Preprocesa una imagen para mejorar resultados de OCR
   * Aplica mejoras de contraste, nitidez y reducción de ruido
   */
  static async preprocessImage(file: File): Promise<File> {
    try {
      console.log('🖼️ Preprocesando imagen para mejor calidad OCR...');

      // Cargar imagen
      const bitmap = await this.loadImage(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No se pudo crear contexto canvas');
      }

      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      // Dibujar imagen original
      ctx.drawImage(bitmap, 0, 0);

      // Obtener datos de píxeles
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // PASO 1: Convertir a escala de grises (mejora reconocimiento)
      this.convertToGrayscale(imageData);

      // PASO 2: Aumentar contraste (hace el texto más legible)
      this.enhanceContrast(imageData, 1.5);

      // PASO 3: Aplicar umbralización adaptativa (elimina fondos)
      this.adaptiveThreshold(imageData);

      // PASO 4: Reducir ruido (elimina puntos pequeños)
      this.reduceNoise(imageData);

      // Colocar imagen procesada
      ctx.putImageData(imageData, 0, 0);

      // Convertir canvas a Blob y luego a File
      return await new Promise<File>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Error al convertir canvas a blob'));
            return;
          }

          const processedFile = new File([blob], file.name, {
            type: 'image/png',
            lastModified: Date.now()
          });

          console.log('✅ Imagen preprocesada con éxito');
          resolve(processedFile);
        }, 'image/png', 0.95);
      });

    } catch (error) {
      console.warn('⚠️ Error en preprocesamiento, usando imagen original:', error);
      return file; // Fallback a imagen original si falla
    }
  }

  /**
   * Carga imagen como HTMLImageElement
   */
  private static loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Error al cargar imagen'));
      };

      img.src = url;
    });
  }

  /**
   * Convierte imagen a escala de grises
   */
  private static convertToGrayscale(imageData: ImageData): void {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Fórmula luminosidad estándar
      const gray = Math.round(
        data[i] * 0.299 + // R
        data[i + 1] * 0.587 + // G
        data[i + 2] * 0.114 // B
      );

      data[i] = gray; // R
      data[i + 1] = gray; // G
      data[i + 2] = gray; // B
      // Alpha (data[i + 3]) no cambia
    }
  }

  /**
   * Aumenta el contraste de la imagen
   */
  private static enhanceContrast(imageData: ImageData, factor: number): void {
    const data = imageData.data;
    const intercept = 128 * (1 - factor);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * factor + intercept));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor + intercept));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor + intercept));
    }
  }

  /**
   * Umbralización adaptativa (binarización)
   * Convierte a blanco y negro puro basado en promedio local
   */
  private static adaptiveThreshold(imageData: ImageData): void {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const windowSize = 15; // Tamaño de ventana para calcular umbral local
    const constant = 10; // Constante de ajuste

    // Crear copia de datos originales
    const original = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calcular promedio local
        let sum = 0;
        let count = 0;

        for (let wy = -windowSize; wy <= windowSize; wy++) {
          for (let wx = -windowSize; wx <= windowSize; wx++) {
            const nx = x + wx;
            const ny = y + wy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              sum += original[idx];
              count++;
            }
          }
        }

        const threshold = (sum / count) - constant;
        const idx = (y * width + x) * 4;
        const value = original[idx] > threshold ? 255 : 0;

        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
      }
    }
  }

  /**
   * Reduce ruido mediante filtro de mediana
   */
  private static reduceNoise(imageData: ImageData): void {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const original = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const neighbors: number[] = [];

        // Recolectar valores de vecinos 3x3
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            neighbors.push(original[idx]);
          }
        }

        // Ordenar y tomar mediana
        neighbors.sort((a, b) => a - b);
        const median = neighbors[4]; // Valor central de 9 elementos

        const idx = (y * width + x) * 4;
        data[idx] = median;
        data[idx + 1] = median;
        data[idx + 2] = median;
      }
    }
  }

  /**
   * Escala imagen a tamaño óptimo para OCR
   * Tesseract funciona mejor con imágenes entre 1000-2000px de ancho
   */
  static async scaleImageForOCR(file: File): Promise<File> {
    try {
      const bitmap = await this.loadImage(file);
      const targetWidth = 1500; // Ancho óptimo para Tesseract

      // Si ya tiene buen tamaño, no escalar
      if (bitmap.width >= 1000 && bitmap.width <= 2000) {
        return file;
      }

      const scale = targetWidth / bitmap.width;
      const newWidth = Math.round(bitmap.width * scale);
      const newHeight = Math.round(bitmap.height * scale);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return file;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Usar interpolación suave para mejor calidad
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);

      return await new Promise<File>((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const scaledFile = new File([blob], file.name, {
            type: 'image/png',
            lastModified: Date.now()
          });

          console.log(`🔍 Imagen escalada: ${bitmap.width}x${bitmap.height} → ${newWidth}x${newHeight}`);
          resolve(scaledFile);
        }, 'image/png', 0.95);
      });

    } catch (error) {
      console.warn('⚠️ Error escalando imagen:', error);
      return file;
    }
  }
}
