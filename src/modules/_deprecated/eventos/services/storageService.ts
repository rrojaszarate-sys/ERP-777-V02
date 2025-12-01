import { supabase } from '../../../core/config/supabase';

export class StorageService {
  private static instance: StorageService;
  private readonly BUCKET_NAME = 'documents';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  private readonly ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Sube un archivo a Supabase Storage con validaciones de seguridad
   */
  async uploadFile(
    file: File, 
    folder: string = 'general',
    options: {
      upsert?: boolean;
      cacheControl?: string;
      contentType?: string;
    } = {}
  ): Promise<{ url: string; path: string }> {
    try {
      // Validar archivo
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(`Archivo inválido: ${validation.errors.join(', ')}`);
      }

      // Generar nombre único
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = this.getFileExtension(file.name);
      const fileName = `${folder}/${timestamp}-${randomSuffix}.${fileExtension}`;

      console.log(`☁️ Subiendo archivo: ${fileName}`);

      // Configurar opciones de subida
      const uploadOptions = {
        cacheControl: options.cacheControl || '3600',
        upsert: options.upsert || false,
        contentType: options.contentType || file.type
      };

      // Subir archivo
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, uploadOptions);

      if (error) {
        console.error('Error subiendo archivo:', error);
        throw new Error(`Error al subir archivo: ${error.message}`);
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      // Verificar que el archivo se subió correctamente
      const integrity = await this.verifyFileIntegrity(urlData.publicUrl, file.size);
      if (!integrity.valid) {
        console.warn('Advertencia de integridad:', integrity.error);
      }

      console.log(`✅ Archivo subido exitosamente: ${urlData.publicUrl}`);
      
      return {
        url: urlData.publicUrl,
        path: fileName
      };
    } catch (error) {
      console.error('Error en uploadFile:', error);
      throw error;
    }
  }

  /**
   * Descarga un archivo desde Supabase Storage
   */
  async downloadFile(filePath: string): Promise<Blob> {
    try {
      console.log(`📥 Descargando archivo: ${filePath}`);

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .download(filePath);

      if (error) {
        console.error('Error descargando archivo:', error);
        throw new Error(`Error al descargar archivo: ${error.message}`);
      }

      if (!data) {
        throw new Error('No se recibieron datos del archivo');
      }

      console.log(`✅ Archivo descargado exitosamente: ${data.size} bytes`);
      return data;
    } catch (error) {
      console.error('Error en downloadFile:', error);
      throw error;
    }
  }

  /**
   * Elimina un archivo de Supabase Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      console.log(`🗑️ Eliminando archivo: ${filePath}`);

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Error eliminando archivo:', error);
        throw new Error(`Error al eliminar archivo: ${error.message}`);
      }

      console.log(`✅ Archivo eliminado exitosamente`);
    } catch (error) {
      console.error('Error en deleteFile:', error);
      throw error;
    }
  }

  /**
   * Lista archivos en una carpeta específica
   */
  async listFiles(folder: string = '', limit: number = 100): Promise<any[]> {
    try {
      console.log(`📂 Listando archivos en: ${folder || 'raíz'}`);

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(folder, {
          limit,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error listando archivos:', error);
        throw new Error(`Error al listar archivos: ${error.message}`);
      }

      console.log(`✅ ${data?.length || 0} archivos encontrados`);
      return data || [];
    } catch (error) {
      console.error('Error en listFiles:', error);
      throw error;
    }
  }

  /**
   * Verifica la integridad de un archivo
   */
  async verifyFileIntegrity(fileUrl: string, expectedSize?: number): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(fileUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        return { 
          valid: false, 
          error: `Archivo no accesible: ${response.status} ${response.statusText}` 
        };
      }

      const contentLength = response.headers.get('content-length');
      const actualSize = contentLength ? parseInt(contentLength) : 0;
      
      if (actualSize === 0) {
        return { valid: false, error: 'Archivo vacío' };
      }

      if (expectedSize && Math.abs(actualSize - expectedSize) > 1024) { // Tolerancia de 1KB
        return { 
          valid: false, 
          error: `Tamaño no coincide: esperado ${expectedSize}, actual ${actualSize}` 
        };
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `Error verificando integridad: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      };
    }
  }

  /**
   * Valida un archivo antes de subirlo
   */
  private validateFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Obtener extensión del archivo
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    
    // Validar tamaño
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(2)}MB (máximo 10MB)`);
    }
    
    // Validar tanto MIME type como extensión para mayor seguridad
    const isMimeTypeValid = this.ALLOWED_MIME_TYPES.includes(file.type);
    const isExtensionValid = this.ALLOWED_EXTENSIONS.includes(fileExtension);
    
    if (!isMimeTypeValid || !isExtensionValid) {
      errors.push(`Tipo de archivo no permitido: ${file.type} (${fileExtension}). Extensiones aceptadas: ${this.ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    // Validar que no esté vacío
    if (file.size === 0) {
      errors.push('El archivo está vacío');
    }
    
    // Validar nombre
    if (!file.name || file.name.trim().length === 0) {
      errors.push('Nombre de archivo inválido');
    }
    
    if (file.name.length > 255) {
      errors.push('Nombre de archivo demasiado largo (máximo 255 caracteres)');
    }
    
    // Validar caracteres peligrosos en el nombre
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
   * Obtiene la extensión de un archivo de forma segura
   */
  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
  }

  /**
   * Genera un nombre de archivo seguro
   */
  generateSafeFileName(originalName: string, prefix: string = ''): string {
    // Limpiar nombre original
    const cleanName = originalName
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return prefix ? `${prefix}_${timestamp}_${randomSuffix}_${cleanName}` : `${timestamp}_${randomSuffix}_${cleanName}`;
  }

  /**
   * Obtiene información detallada de un archivo
   */
  async getFileInfo(filePath: string): Promise<any> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('', {
          search: filePath
        });

      if (error) throw error;
      
      return data?.find(file => file.name === filePath.split('/').pop()) || null;
    } catch (error) {
      console.error('Error obteniendo información del archivo:', error);
      return null;
    }
  }

  /**
   * Crea una URL firmada para acceso temporal
   */
  async createSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(`Error creando URL firmada: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creando URL firmada:', error);
      throw error;
    }
  }

  /**
   * Limpia archivos antiguos (housekeeping)
   */
  async cleanupOldFiles(olderThanDays: number = 30): Promise<{ deleted: number; errors: string[] }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' }
        });

      if (error) throw error;

      const filesToDelete = files?.filter(file => 
        new Date(file.created_at) < cutoffDate
      ) || [];

      const errors: string[] = [];
      let deletedCount = 0;

      for (const file of filesToDelete) {
        try {
          await this.deleteFile(file.name);
          deletedCount++;
        } catch (error) {
          errors.push(`Error eliminando ${file.name}: ${this.getErrorMessage(error)}`);
        }
      }

      console.log(`🧹 Limpieza completada: ${deletedCount} archivos eliminados, ${errors.length} errores`);
      
      return { deleted: deletedCount, errors };
    } catch (error) {
      console.error('Error en limpieza de archivos:', error);
      return { deleted: 0, errors: [this.getErrorMessage(error)] };
    }
  }
}

export const storageService = StorageService.getInstance();