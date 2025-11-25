/**
 * SERVICIO OCR CON SUPABASE EDGE FUNCTIONS
 *
 * Versión integrada que usa Edge Functions de Supabase
 * - Todo centralizado en Supabase
 * - Guardado automático en bucket con versionado
 * - Sistema de versiones para documentos
 */

import { supabase } from '../../../core/config/supabase';

export interface OCRSupabaseResult {
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
  archivo: {
    url: string;
    path: string;
    version: number;
  };
  procesador: 'google_vision';
  error?: string;
}

class OCRSupabaseService {
  /**
   * Procesa documento usando Edge Function de Supabase
   * Incluye guardado automático en bucket con versionado
   */
  async processDocument(
    file: File,
    eventoId: string,
    userId: string
  ): Promise<OCRSupabaseResult> {
    console.log('🚀 [OCR Supabase] Procesando documento:', file.name);
    console.log('📁 Evento:', eventoId);

    try {
      // Crear FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('eventoId', eventoId);
      formData.append('userId', userId);

      // Obtener función URL
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Usuario no autenticado');
      }

      // Llamar a Edge Function
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-process`;

      console.log('📡 Llamando a Edge Function:', functionUrl);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: OCRSupabaseResult = await response.json();

      console.log('✅ [OCR Supabase] Procesamiento exitoso');
      console.log('📊 Confianza:', result.confianza_general + '%');
      console.log('💾 Archivo guardado:', result.archivo.path);
      console.log('🔢 Versión:', result.archivo.version);

      return result;

    } catch (error) {
      console.error('❌ [OCR Supabase] Error:', error);
      throw error;
    }
  }

  /**
   * Obtiene historial de versiones de un documento
   */
  async getDocumentVersions(eventoId: string, nombreArchivo: string) {
    const { data, error } = await supabase
      .from('evt_documentos_ocr')
      .select('*')
      .eq('evento_id', eventoId)
      .like('nombre_archivo', `%${nombreArchivo}%`)
      .is('deleted_at', null)
      .order('version', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo versiones:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Obtiene todos los documentos OCR de un evento
   */
  async getEventDocuments(eventoId: string) {
    const { data, error } = await supabase
      .from('evt_documentos_ocr')
      .select('*')
      .eq('evento_id', eventoId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo documentos:', error);
      return [];
    }

    console.log(`📚 Documentos del evento: ${data?.length || 0}`);
    return data || [];
  }

  /**
   * Obtiene documento OCR por ID
   */
  async getDocumentById(documentId: string) {
    const { data, error } = await supabase
      .from('evt_documentos_ocr')
      .select('*')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('❌ Error obteniendo documento:', error);
      return null;
    }

    return data;
  }

  /**
   * Marca documento como usado para un gasto
   */
  async linkDocumentToExpense(documentId: string, gastoId: string) {
    const { error } = await supabase
      .from('evt_documentos_ocr')
      .update({ gasto_id: gastoId })
      .eq('id', documentId);

    if (error) {
      console.error('❌ Error vinculando documento:', error);
      throw error;
    }

    console.log('✅ Documento vinculado al gasto');
  }

  /**
   * Soft delete de documento
   */
  async deleteDocument(documentId: string, userId: string) {
    const { error } = await supabase
      .from('evt_documentos_ocr')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('id', documentId);

    if (error) {
      console.error('❌ Error eliminando documento:', error);
      throw error;
    }

    console.log('✅ Documento eliminado (soft delete)');
  }

  /**
   * Obtiene estadísticas de OCR para un evento
   */
  async getEventOCRStats(eventoId: string) {
    const { data, error } = await supabase
      .from('evt_documentos_ocr')
      .select('estado_procesamiento, confianza_general, procesador')
      .eq('evento_id', eventoId)
      .is('deleted_at', null);

    if (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }

    const stats = {
      total: data.length,
      completados: data.filter(d => d.estado_procesamiento === 'completed').length,
      fallidos: data.filter(d => d.estado_procesamiento === 'failed').length,
      confianzaPromedio: data.length > 0
        ? Math.round(data.reduce((sum, d) => sum + (d.confianza_general || 0), 0) / data.length)
        : 0,
      porProcesador: {
        google_vision: data.filter(d => d.procesador === 'google_vision').length,
        tesseract: data.filter(d => d.procesador === 'tesseract').length
      }
    };

    console.log('📊 Estadísticas OCR:', stats);
    return stats;
  }

  /**
   * Descarga archivo del bucket
   */
  async downloadDocument(path: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from('event-docs')
      .download(path);

    if (error) {
      throw new Error(`Error descargando archivo: ${error.message}`);
    }

    return data;
  }

  /**
   * Obtiene URL pública de un documento
   */
  getDocumentPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from('event-docs')
      .getPublicUrl(path);

    return data.publicUrl;
  }
}

// Singleton
export const ocrSupabaseService = new OCRSupabaseService();
