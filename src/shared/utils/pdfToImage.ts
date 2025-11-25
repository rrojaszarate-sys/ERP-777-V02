// src/shared/utils/pdfToImage.ts

/**
 * Convierte un archivo PDF a imagen PNG usando PDF.js
 * Extrae la primera página del PDF como imagen de alta calidad
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js
// Usar CDN con la versión correcta que coincida con la instalada
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Usar la versión 5.4.296 que coincide con la instalada en node_modules
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;
}

export interface PDFToImageOptions {
  /** Escala de renderizado (1.0 = 100%, 2.0 = 200%, etc.) */
  scale?: number;
  /** Página a convertir (empezando desde 1) */
  pageNumber?: number;
  /** Calidad de la imagen resultante (0.0 - 1.0) */
  quality?: number;
  /** Formato de salida */
  format?: 'png' | 'jpeg';
}

export interface PDFToImageResult {
  /** Archivo de imagen generado */
  imageFile: File;
  /** Data URL de la imagen */
  dataUrl: string;
  /** Dimensiones de la imagen */
  width: number;
  height: number;
  /** Tamaño del archivo original PDF */
  originalSize: number;
  /** Tamaño del archivo de imagen generado */
  imageSize: number;
}

/**
 * Convierte la primera página de un PDF a imagen
 */
export async function convertPDFToImage(
  pdfFile: File,
  options: PDFToImageOptions = {}
): Promise<PDFToImageResult> {
  const {
    scale = 2.0, // Alta calidad por defecto
    pageNumber = 1,
    quality = 0.92,
    format = 'png'
  } = options;

  console.log(`📄 Convirtiendo PDF a imagen: ${pdfFile.name}`);
  console.log(`   Opciones: escala=${scale}x, página=${pageNumber}, calidad=${quality}`);

  try {
    // Leer el PDF como ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Cargar el documento PDF
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`   ✅ PDF cargado: ${pdf.numPages} página(s)`);
    
    // Verificar que la página solicitada existe
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Página ${pageNumber} no existe. El PDF tiene ${pdf.numPages} página(s).`);
    }
    
    // Obtener la página
    const page = await pdf.getPage(pageNumber);
    
    // Obtener el viewport con la escala deseada
    const viewport = page.getViewport({ scale });
    
    console.log(`   📐 Dimensiones: ${viewport.width.toFixed(0)}x${viewport.height.toFixed(0)}px`);
    
    // Crear canvas para renderizar
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('No se pudo crear el contexto 2D del canvas');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Renderizar la página en el canvas
    // PDF.js requiere tanto canvas como canvasContext en versiones recientes
    const renderContext: any = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    console.log('   🎨 Página renderizada en canvas');
    
    // Convertir canvas a blob
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Error al convertir canvas a blob'));
          }
        },
        mimeType,
        quality
      );
    });
    
    // Crear File desde el Blob
    const imageFileName = pdfFile.name.replace(/\.pdf$/i, `.${format}`);
    const imageFile = new File([blob], imageFileName, { type: mimeType });
    
    // Crear data URL para preview
    const dataUrl = canvas.toDataURL(mimeType, quality);
    
    console.log(`   ✅ Imagen generada: ${(blob.size / 1024).toFixed(1)}KB`);
    console.log(`   📊 Compresión: ${pdfFile.size} → ${blob.size} (${((blob.size / pdfFile.size) * 100).toFixed(1)}%)`);
    
    return {
      imageFile,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
      originalSize: pdfFile.size,
      imageSize: blob.size
    };
  } catch (error) {
    console.error('❌ Error convirtiendo PDF a imagen:', error);
    throw new Error(`Error al convertir PDF a imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Convierte todas las páginas de un PDF a imágenes
 */
export async function convertPDFToImages(
  pdfFile: File,
  options: Omit<PDFToImageOptions, 'pageNumber'> = {}
): Promise<PDFToImageResult[]> {
  console.log(`📄 Convirtiendo todas las páginas del PDF: ${pdfFile.name}`);

  try {
    // Leer el PDF como ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Cargar el documento PDF
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`   ✅ PDF cargado: ${pdf.numPages} página(s)`);
    
    // Convertir cada página
    const results: PDFToImageResult[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const result = await convertPDFToImage(pdfFile, { ...options, pageNumber: pageNum });
      results.push(result);
    }
    
    console.log(`   ✅ Todas las páginas convertidas (${results.length})`);
    
    return results;
  } catch (error) {
    console.error('❌ Error convirtiendo páginas del PDF:', error);
    throw new Error(`Error al convertir páginas del PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
