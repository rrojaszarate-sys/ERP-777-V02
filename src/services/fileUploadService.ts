// src/services/fileUploadService.ts

import { supabase } from '../core/config/supabase';
import { fileLogger } from '../core/utils/logger';
import { autoCompressIfNeeded } from '../shared/utils/imageCompression';

export interface FileUploadResult {
  url: string;
  path: string;
  fileName: string;
  fileSize: number;
  tipo: string;
  mimeType: string;
}

export class FileUploadService {
  private static instance: FileUploadService;
  private readonly BUCKET_NAME = 'event_docs';

  private constructor() {}

  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Subida de documentos para eventos (PDF e imágenes con compresión automática)
   */
  async uploadEventDocument(
    file: File,
    eventId: string,
    tipoDocumento: string
  ): Promise<FileUploadResult> {
    // Comprimir automáticamente si es imagen y excede límite
    const processedFile = await autoCompressIfNeeded(file, {
      maxSizeKB: 2048, // 2MB límite para documentos de evento
      maxWidth: 2400,
      maxHeight: 2400,
      quality: 0.85
    });
    
    // Validar tipo y tamaño
    const errors: string[] = [];
    
    const isImage = processedFile.type.startsWith('image/');
    const isPDF = processedFile.type === 'application/pdf';

    if (!isImage && !isPDF) {
      errors.push('Solo se permiten archivos PDF e imágenes (JPG, PNG, WebP, GIF).');
    }

    // Validar tamaño después de compresión
    const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB imágenes, 10MB PDFs
    if (processedFile.size > maxSize) {
      errors.push(`El archivo es demasiado grande. Máximo ${maxSize / (1024 * 1024)}MB.`);
    }

    const fileExtension = processedFile.name.split('.').pop()?.toLowerCase();
    if (!processedFile.name || !fileExtension) {
      errors.push('Nombre de archivo inválido.');
    }

    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(processedFile.name)) {
      errors.push('El nombre del archivo contiene caracteres no permitidos.');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(' '));
    }
    
    // Log si hubo compresión
    if (processedFile.size !== file.size) {
      fileLogger.info(`📸 Imagen comprimida: ${(file.size / 1024).toFixed(1)}KB → ${(processedFile.size / 1024).toFixed(1)}KB`);
    }

    // Obtener la clave_evento para usarla en la ruta
    const { data: eventData, error: eventError } = await supabase
      .from('evt_eventos')
      .select('clave_evento')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      throw new Error('No se pudo encontrar el evento para la subida del archivo.');
    }

    // --- LÓGICA DE VERSIONADO Y RUTA ESPECÍFICA ---

    // 1. Definir la carpeta de destino
    const folderPath = `${eventData.clave_evento}/${tipoDocumento}`;

    // 2. Consultar archivos existentes para determinar la versión
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .list(folderPath);

    if (listError) {
      // Si la carpeta no existe, es la primera versión. No es un error fatal.
      fileLogger.warn(`No se pudo listar la carpeta ${folderPath}, asumiendo versión 1. Error: ${listError.message}`);
    }

    const newVersion = (existingFiles?.length || 0) + 1;

    // 3. Construir el nombre del archivo con la nueva convención
    const cleanName = processedFile.name.replace(/[^\w.-]/g, '_');
    const finalFileName = `${eventData.clave_evento}_${tipoDocumento}_V${newVersion}_${cleanName}`;

    // 4. Construir la ruta completa
    const finalPath = `${folderPath}/${finalFileName}`;

    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(finalPath, processedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      fileLogger.error('Error al subir documento', error);
      throw new Error(`Error al subir documento: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(finalPath);

    return {
      url: urlData.publicUrl,
      path: finalPath,
      fileName: finalFileName,
      fileSize: processedFile.size,
      mimeType: processedFile.type,
      tipo: tipoDocumento,
    };
  }

  /**
   * Upload file for income or expense with type-specific validation
   * Nueva estructura: [clave_evento]/ingresos/ o [clave_evento]/gastos/
   */
  async uploadFile(file: File, type: 'income' | 'expense', eventId?: string): Promise<FileUploadResult> {
    const validation = this.validateFile(file, type);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Si no hay eventId, no podemos usar la nueva estructura
    if (!eventId) {
      throw new Error('eventId es requerido para la subida de archivos');
    }

    // Obtener la clave_evento para usarla en la ruta
    const { data: eventData, error: eventError } = await supabase
      .from('evt_eventos')
      .select('clave_evento')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      throw new Error('No se pudo encontrar el evento para la subida del archivo.');
    }

    const claveEvento = eventData.clave_evento;

    // Generate safe filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const cleanName = file.name.replace(/[^\w.-]/g, '_');
    
    // Nueva estructura: [clave_evento]/ingresos/ o [clave_evento]/gastos/
    const folder = type === 'income' ? 'ingresos' : 'gastos';
    const finalFileName = `${claveEvento}/${folder}/${timestamp}-${randomSuffix}-${cleanName}`;

    fileLogger.info(`Uploading ${type} file: ${finalFileName}`);

    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(finalFileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      fileLogger.error('Upload error', error);
      throw new Error(`Error al subir archivo: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(finalFileName);

    fileLogger.info(`File uploaded successfully: ${urlData.publicUrl}`);

    return {
      url: urlData.publicUrl,
      path: finalFileName,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      tipo: type,
    };
  }

  /**
   * Validate file based on type
   */
  validateFile(file: File, type: 'income' | 'expense'): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Type-specific validations
    if (type === 'income') {
      // ✅ ACTUALIZADO: Income files ahora aceptan PDF e imágenes (para orden de compra y pago)
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        errors.push('Los archivos de ingreso deben ser PDF, JPG, JPEG o PNG');
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        errors.push(`Archivo demasiado grande: ${this.formatFileSize(file.size)} (máximo 10MB)`);
      }
    } else {
      // Expense files can be PDF, JPG, JPEG, PNG
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        errors.push('Los gastos aceptan archivos PDF, JPG, JPEG o PNG');
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        errors.push(`Archivo demasiado grande: ${this.formatFileSize(file.size)} (máximo 5MB para comprobantes)`);
      }
    }
    
    // Common validations
    if (file.size === 0) {
      errors.push('El archivo está vacío');
    }
    
    if (!file.name || file.name.trim().length === 0) {
      errors.push('Nombre de archivo inválido');
    }
    
    if (file.name.length > 255) {
      errors.push('Nombre de archivo demasiado largo (máximo 255 caracteres)');
    }
    
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(file.name)) {
      errors.push('Nombre de archivo contiene caracteres no permitidos');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Eliminar archivo de Supabase Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const fileUploadService = FileUploadService.getInstance();
