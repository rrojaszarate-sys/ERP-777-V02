/**
 * HOOK REACT PARA OCR V2
 *
 * Hook simple y limpio para usar OCR en componentes
 */

import { useState } from 'react';
import { expenseOCRServiceV2, ExpenseFromOCRResult } from '../services/expenseOCRService.v2';
import { ocrServiceV2 } from '../services/ocrService.v2';

export const useOCRV2 = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExpenseFromOCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  /**
   * Procesa archivo para prellenar formulario de gastos
   */
  const processExpenseFile = async (
    file: File,
    eventId: string,
    userId: string
  ): Promise<ExpenseFromOCRResult> => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔍 [useOCRV2] Procesando archivo:', file.name);

      const result = await expenseOCRServiceV2.processFileToExpense(file, eventId, userId);

      setResult(result);
      console.log('✅ [useOCRV2] Procesamiento completado');
      console.log('📊 Calidad:', result.calidad);
      console.log('⚠️  Advertencias:', result.warnings.length);

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ [useOCRV2] Error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Verifica estado del backend
   */
  const checkBackend = async (): Promise<boolean> => {
    setBackendStatus('checking');
    try {
      const isOnline = await ocrServiceV2.checkBackendHealth();
      setBackendStatus(isOnline ? 'online' : 'offline');
      return isOnline;
    } catch (error) {
      setBackendStatus('offline');
      return false;
    }
  };

  /**
   * Limpia estado
   */
  const clear = () => {
    setResult(null);
    setError(null);
  };

  return {
    // Estado
    isProcessing,
    result,
    error,
    backendStatus,

    // Métodos
    processExpenseFile,
    checkBackend,
    clear
  };
};
