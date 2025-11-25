/**
 * HOOK REACT PARA OCR CON SUPABASE
 *
 * Hook simplificado que usa Edge Functions de Supabase
 * Todo integrado: OCR + Guardado en bucket + Versionado
 */

import { useState } from 'react';
import { expenseOCRSupabaseService, ExpenseFromOCRSupabaseResult } from '../services/expenseOCRService.supabase';
import { ocrSupabaseService } from '../services/ocrService.supabase';
import { useAuth } from '../../../core/auth/AuthProvider';

export const useOCRSupabase = (eventId: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExpenseFromOCRSupabaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  /**
   * Procesa archivo para prellenar formulario
   * Automáticamente guarda en bucket con versionado
   */
  const processExpenseFile = async (file: File): Promise<ExpenseFromOCRSupabaseResult> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      console.log('🔍 [useOCRSupabase] Procesando:', file.name);

      // Simular progreso
      setProgress(10);

      const result = await expenseOCRSupabaseService.processFileToExpense(
        file,
        eventId,
        user.id
      );

      setProgress(100);
      setResult(result);

      console.log('✅ [useOCRSupabase] Completado');
      console.log('📊 Calidad:', result.calidad);
      console.log('📁 Archivo guardado:', result.ocr_result.archivo.path);
      console.log('🔢 Versión:', result.ocr_result.archivo.version);

      return result;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ [useOCRSupabase] Error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Obtiene historial de versiones de un documento
   */
  const getDocumentVersions = async (nombreArchivo: string) => {
    try {
      return await ocrSupabaseService.getDocumentVersions(eventId, nombreArchivo);
    } catch (err) {
      console.error('❌ Error obteniendo versiones:', err);
      return [];
    }
  };

  /**
   * Obtiene todos los documentos OCR del evento
   */
  const getEventDocuments = async () => {
    try {
      return await ocrSupabaseService.getEventDocuments(eventId);
    } catch (err) {
      console.error('❌ Error obteniendo documentos:', err);
      return [];
    }
  };

  /**
   * Obtiene estadísticas de OCR del evento
   */
  const getEventStats = async () => {
    try {
      return await ocrSupabaseService.getEventOCRStats(eventId);
    } catch (err) {
      console.error('❌ Error obteniendo estadísticas:', err);
      return null;
    }
  };

  /**
   * Vincula documento OCR con un gasto
   */
  const linkToExpense = async (documentId: string, gastoId: string) => {
    try {
      await ocrSupabaseService.linkDocumentToExpense(documentId, gastoId);
    } catch (err) {
      console.error('❌ Error vinculando documento:', err);
      throw err;
    }
  };

  /**
   * Elimina documento (soft delete)
   */
  const deleteDocument = async (documentId: string) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      await ocrSupabaseService.deleteDocument(documentId, user.id);
    } catch (err) {
      console.error('❌ Error eliminando documento:', err);
      throw err;
    }
  };

  /**
   * Limpia estado
   */
  const clear = () => {
    setResult(null);
    setError(null);
    setProgress(0);
  };

  return {
    // Estado
    isProcessing,
    result,
    error,
    progress,

    // Métodos principales
    processExpenseFile,

    // Métodos auxiliares
    getDocumentVersions,
    getEventDocuments,
    getEventStats,
    linkToExpense,
    deleteDocument,
    clear
  };
};

/**
 * Hook para trabajar con documentos OCR existentes
 */
export const useOCRDocuments = (eventId: string) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carga documentos del evento
   */
  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const docs = await ocrSupabaseService.getEventDocuments(eventId);
      setDocuments(docs);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error cargando documentos';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Recarga documentos
   */
  const refresh = async () => {
    await loadDocuments();
  };

  return {
    documents,
    isLoading,
    error,
    loadDocuments,
    refresh
  };
};
