/**
 * Servicio Centralizado de Storage - FASE 6
 * Cada empresa tiene su propio bucket para aislamiento total
 *
 * Nombrado de buckets: erp-{codigo_empresa}
 * Ejemplo: erp-madregroup, erp-acme-corp
 *
 * Estructura por bucket de empresa:
 *   erp-{codigo}/
 *   ├── branding/
 *   │   ├── logo_principal/
 *   │   ├── logo_secundario/
 *   │   ├── membrete/
 *   │   ├── favicon/
 *   │   ├── firma/
 *   │   └── sello/
 *   ├── eventos/
 *   │   └── {evento_clave}/
 *   │       └── documentos/
 *   ├── gastos/
 *   │   └── comprobantes/
 *   ├── facturas/
 *   │   ├── xml/
 *   │   └── pdf/
 *   └── documentos/
 *       └── generales/
 *
 * Bucket legacy (event_docs) - mantener compatibilidad hacia atrás
 */

import { supabase } from '../core/config/supabase';

// Bucket legacy del ERP (para archivos existentes)
export const BUCKET_NAME = 'event_docs';

/**
 * Genera el nombre de bucket para una empresa usando el código
 * El código se obtiene del campo 'codigo' de core_companies
 * Formato: erp-{codigo} (ej: erp-madregroup)
 * @deprecated Usar getCompanyBucket() que obtiene el nombre correcto de la BD
 */
export function generateBucketName(codigo: string): string {
  // Sanitizar: minúsculas, sin espacios, sin caracteres especiales
  const sanitized = codigo
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return 'erp-' + sanitized;
}

/**
 * Obtiene el bucket de una empresa (crea si no existe)
 * Usa el campo 'codigo' de la empresa para generar el nombre
 */
export async function getCompanyBucket(companyId: string): Promise<string> {
  // Primero intentar con la función RPC que usa el codigo de la empresa
  const { data, error } = await supabase.rpc('get_company_bucket', {
    p_company_id: companyId
  });

  if (!error && data) {
    return data;
  }

  // Fallback: obtener el codigo de la empresa directamente
  const { data: company } = await supabase
    .from('core_companies')
    .select('codigo, nombre')
    .eq('id', companyId)
    .single();

  if (company?.codigo) {
    return generateBucketName(company.codigo);
  }

  // Último fallback: usar el nombre de la empresa
  if (company?.nombre) {
    return generateBucketName(company.nombre);
  }

  // Si todo falla, usar bucket legacy
  console.warn('No se pudo determinar bucket para empresa:', companyId);
  return BUCKET_NAME;
}

// Tipos de archivos soportados
export type StorageCategory =
  | 'branding'
  | 'eventos'
  | 'gastos'
  | 'facturas'
  | 'documentos'
  | 'inventario'
  | 'contabilidad';

export type BrandingType =
  | 'logo_principal'
  | 'logo_secundario'
  | 'membrete'
  | 'favicon'
  | 'firma'
  | 'sello';

export interface UploadOptions {
  companyId: string;
  category: StorageCategory;
  subPath?: string;
  fileName?: string;
  upsert?: boolean;
  useLegacyBucket?: boolean; // Para compatibilidad con archivos existentes en event_docs
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  bucketName?: string;
  error?: string;
}

/**
 * Servicio centralizado de storage
 */
export const storageService = {
  /**
   * Genera la ruta completa para un archivo
   * Para bucket por empresa: {category}/{subPath}/{fileName}
   * Para bucket legacy: {companyId}/{category}/{subPath}/{fileName}
   */
  buildPath(options: UploadOptions, originalFileName: string): string {
    const { companyId, category, subPath, useLegacyBucket } = options;
    const ext = originalFileName.split('.').pop()?.toLowerCase() || '';
    const timestamp = Date.now();
    const safeName = options.fileName || `${timestamp}.${ext}`;

    const parts: string[] = [];

    // En bucket legacy, incluir companyId en el path
    if (useLegacyBucket) {
      parts.push(companyId);
    }

    parts.push(category);
    if (subPath) parts.push(subPath);
    parts.push(safeName);

    return parts.join('/');
  },

  /**
   * Subir archivo genérico al bucket de la empresa
   */
  async upload(file: File, options: UploadOptions): Promise<UploadResult> {
    try {
      // Determinar bucket a usar
      const bucketName = options.useLegacyBucket
        ? BUCKET_NAME
        : await getCompanyBucket(options.companyId);

      const path = this.buildPath(options, file.name);

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: options.upsert ?? false
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return { success: false, error: uploadError.message };
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(path);

      return {
        success: true,
        url: urlData.publicUrl,
        path,
        bucketName
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Subir archivo de branding
   */
  async uploadBranding(
    file: File,
    companyId: string,
    type: BrandingType
  ): Promise<UploadResult> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${type}_${Date.now()}.${ext}`;

    return this.upload(file, {
      companyId,
      category: 'branding',
      subPath: type,
      fileName,
      upsert: true
    });
  },

  /**
   * Subir documento de evento
   */
  async uploadEventoDoc(
    file: File,
    companyId: string,
    claveEvento: string,
    subFolder?: string
  ): Promise<UploadResult> {
    const subPath = subFolder
      ? `${claveEvento}/${subFolder}`
      : claveEvento;

    return this.upload(file, {
      companyId,
      category: 'eventos',
      subPath
    });
  },

  /**
   * Subir comprobante de gasto
   */
  async uploadGastoComprobante(
    file: File,
    companyId: string,
    gastoId?: string | number
  ): Promise<UploadResult> {
    const subPath = gastoId ? `comprobantes/${gastoId}` : 'comprobantes';

    return this.upload(file, {
      companyId,
      category: 'gastos',
      subPath
    });
  },

  /**
   * Subir archivo de factura (XML o PDF)
   */
  async uploadFactura(
    file: File,
    companyId: string,
    tipo: 'xml' | 'pdf',
    uuid?: string
  ): Promise<UploadResult> {
    const fileName = uuid ? `${uuid}.${tipo}` : undefined;

    return this.upload(file, {
      companyId,
      category: 'facturas',
      subPath: tipo,
      fileName
    });
  },

  /**
   * Subir documento general
   */
  async uploadDocumento(
    file: File,
    companyId: string,
    folder?: string
  ): Promise<UploadResult> {
    return this.upload(file, {
      companyId,
      category: 'documentos',
      subPath: folder || 'generales'
    });
  },

  /**
   * Eliminar archivo del bucket de la empresa
   */
  async delete(companyId: string, path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const bucketName = await getCompanyBucket(companyId);

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Eliminar archivo del bucket legacy
   */
  async deleteLegacy(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Eliminar múltiples archivos del bucket de la empresa
   */
  async deleteMany(companyId: string, paths: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const bucketName = await getCompanyBucket(companyId);

      const { error } = await supabase.storage
        .from(bucketName)
        .remove(paths);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Listar archivos en una carpeta del bucket de la empresa
   */
  async list(companyId: string, path: string): Promise<{
    success: boolean;
    files?: { name: string; url: string; size: number; created_at: string }[];
    error?: string;
  }> {
    try {
      const bucketName = await getCompanyBucket(companyId);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(path, {
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        return { success: false, error: error.message };
      }

      const files = (data || []).map(file => {
        const filePath = `${path}/${file.name}`;
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        return {
          name: file.name,
          url: urlData.publicUrl,
          size: file.metadata?.size || 0,
          created_at: file.created_at || ''
        };
      });

      return { success: true, files };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener URL pública de un archivo en bucket de empresa
   */
  async getPublicUrl(companyId: string, path: string): Promise<string> {
    const bucketName = await getCompanyBucket(companyId);
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Obtener URL pública de un archivo en bucket legacy
   */
  getPublicUrlLegacy(path: string): string {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Obtener URL firmada (temporal) para archivos privados
   */
  async getSignedUrl(companyId: string, path: string, expiresIn: number = 3600): Promise<string | null> {
    const bucketName = await getCompanyBucket(companyId);
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data.signedUrl;
  },

  /**
   * Copiar archivo a otra ubicación dentro del mismo bucket de empresa
   */
  async copy(companyId: string, fromPath: string, toPath: string): Promise<UploadResult> {
    try {
      const bucketName = await getCompanyBucket(companyId);

      const { error } = await supabase.storage
        .from(bucketName)
        .copy(fromPath, toPath);

      if (error) {
        return { success: false, error: error.message };
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(toPath);

      return {
        success: true,
        url: urlData.publicUrl,
        path: toPath,
        bucketName
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Mover archivo dentro del bucket de empresa (copiar + eliminar original)
   */
  async move(companyId: string, fromPath: string, toPath: string): Promise<UploadResult> {
    const copyResult = await this.copy(companyId, fromPath, toPath);

    if (!copyResult.success) {
      return copyResult;
    }

    await this.delete(companyId, fromPath);
    return copyResult;
  },

  /**
   * Migrar archivo de bucket legacy a bucket de empresa
   */
  async migrateFromLegacy(
    companyId: string,
    legacyPath: string,
    newPath: string
  ): Promise<UploadResult> {
    try {
      const newBucket = await getCompanyBucket(companyId);

      // Descargar del bucket legacy
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(legacyPath);

      if (downloadError) {
        return { success: false, error: downloadError.message };
      }

      // Subir al nuevo bucket
      const { error: uploadError } = await supabase.storage
        .from(newBucket)
        .upload(newPath, fileData, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(newBucket)
        .getPublicUrl(newPath);

      return {
        success: true,
        url: urlData.publicUrl,
        path: newPath,
        bucketName: newBucket
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};

export default storageService;
