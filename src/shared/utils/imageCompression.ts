/**
 * Servicio de compresión de imágenes para toda la aplicación
 * Reduce el tamaño de archivos de imagen manteniendo calidad aceptable
 */

export interface CompressionOptions {
  maxSizeKB?: number;      // Tamaño máximo en KB (default: 1024)
  maxWidth?: number;       // Ancho máximo en px (default: 1920)
  maxHeight?: number;      // Alto máximo en px (default: 1920)
  quality?: number;        // Calidad inicial (0-1, default: 0.9)
  minQuality?: number;     // Calidad mínima (0-1, default: 0.3)
  outputFormat?: string;   // Formato de salida (default: 'image/jpeg')
}

const defaultOptions: Required<CompressionOptions> = {
  maxSizeKB: 1024,
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.9,
  minQuality: 0.3,
  outputFormat: 'image/jpeg'
};

/**
 * Comprime una imagen iterativamente hasta cumplir con el límite de tamaño
 * @param file Archivo de imagen a comprimir
 * @param options Opciones de compresión personalizadas
 * @returns Promise con el archivo comprimido
 */
export async function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...defaultOptions, ...options };
  
  const fileSizeKB = file.size / 1024;
  console.log(`📸 Comprimiendo imagen: ${file.name} (${fileSizeKB.toFixed(1)}KB)`);
  
  // Si ya es menor al límite, devolverlo sin comprimir
  if (fileSizeKB <= opts.maxSizeKB) {
    console.log(`✅ Imagen ya cumple el límite (${fileSizeKB.toFixed(1)}KB <= ${opts.maxSizeKB}KB)`);
    return file;
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      let quality = opts.quality;
      
      // Reducir dimensiones si exceden el máximo
      if (width > opts.maxWidth || height > opts.maxHeight) {
        const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
        width *= ratio;
        height *= ratio;
        console.log(`📐 Redimensionando a: ${Math.round(width)}x${Math.round(height)}`);
      }
      
      const compress = () => {
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen en canvas
        ctx?.clearRect(0, 0, width, height);
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob con calidad especificada
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedSizeKB = blob.size / 1024;
            console.log(`🔍 Compresión iteración: ${compressedSizeKB.toFixed(1)}KB (calidad: ${(quality * 100).toFixed(0)}%)`);
            
            // Verificar si cumple el límite o llegamos a calidad mínima
            if (compressedSizeKB <= opts.maxSizeKB || quality <= opts.minQuality) {
              const compressedFile = new File([blob], file.name, {
                type: opts.outputFormat,
                lastModified: Date.now()
              });
              
              const reductionPercent = ((1 - blob.size / file.size) * 100).toFixed(1);
              console.log(`✅ Imagen comprimida: ${fileSizeKB.toFixed(1)}KB → ${compressedSizeKB.toFixed(1)}KB (reducción: ${reductionPercent}%)`);
              resolve(compressedFile);
            } else {
              // Reducir calidad y/o dimensiones para siguiente iteración
              quality -= 0.1;
              
              // Si la calidad ya está baja, reducir también las dimensiones
              if (quality < 0.5 && (width > 800 || height > 600)) {
                width *= 0.9;
                height *= 0.9;
              }
              
              compress();
            }
          } else {
            console.warn('⚠️ No se pudo generar blob, devolviendo archivo original');
            resolve(file);
          }
        }, opts.outputFormat, quality);
      };
      
      compress();
    };
    
    img.onerror = () => {
      console.error('❌ Error al cargar imagen para compresión');
      reject(new Error('No se pudo cargar la imagen'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Comprime múltiples imágenes en paralelo
 * @param files Array de archivos a comprimir
 * @param options Opciones de compresión
 * @returns Promise con array de archivos comprimidos
 */
export async function compressImages(
  files: File[], 
  options: CompressionOptions = {}
): Promise<File[]> {
  console.log(`📸 Comprimiendo ${files.length} imagen(es)...`);
  
  try {
    const compressedFiles = await Promise.all(
      files.map(file => compressImage(file, options))
    );
    
    const originalSize = files.reduce((sum, f) => sum + f.size, 0) / 1024;
    const compressedSize = compressedFiles.reduce((sum, f) => sum + f.size, 0) / 1024;
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    console.log(`✅ ${files.length} imagen(es) comprimida(s): ${originalSize.toFixed(1)}KB → ${compressedSize.toFixed(1)}KB (reducción: ${reduction}%)`);
    
    return compressedFiles;
  } catch (error) {
    console.error('❌ Error comprimiendo imágenes:', error);
    throw error;
  }
}

/**
 * Valida si un archivo es una imagen válida
 * @param file Archivo a validar
 * @returns true si es una imagen soportada
 */
export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return imageTypes.includes(file.type.toLowerCase());
}

/**
 * Comprime automáticamente solo si el archivo es imagen y excede el límite
 * @param file Archivo (puede no ser imagen)
 * @param options Opciones de compresión
 * @returns Promise con archivo (comprimido si aplica, o original)
 */
export async function autoCompressIfNeeded(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  if (!isImageFile(file)) {
    console.log(`ℹ️ Archivo ${file.name} no es imagen, sin comprimir`);
    return file;
  }
  
  return compressImage(file, options);
}
