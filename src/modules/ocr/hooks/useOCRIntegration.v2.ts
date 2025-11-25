/**
 * ADAPTADOR PARA MANTENER COMPATIBILIDAD CON ExpenseForm
 *
 * Este hook mantiene la misma interfaz que useOCRIntegration pero usa el nuevo sistema V2
 */

import { useState } from 'react';
import { useOCRV2 } from './useOCR.v2';
import { useAuth } from '../../../core/auth/AuthProvider';

export const useOCRIntegrationV2 = (eventId: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const ocrV2 = useOCRV2();

  /**
   * Procesa archivo OCR y retorna en formato compatible con ExpenseForm
   */
  const processOCRFile = async (file: File) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔍 [Adaptador V2] Procesando:', file.name);

      const result = await ocrV2.processExpenseFile(file, eventId, user.id);

      const expense = result.expense;
      const ocr = result.ocr_result;

      // Formatear en estructura esperada por ExpenseForm
      const formData = {
        concepto: expense.concepto || '',
        descripcion: expense.descripcion || '',
        total_con_iva: expense.total || 0,
        subtotal: expense.subtotal || 0,
        iva: expense.iva || 0,
        iva_porcentaje: expense.iva_porcentaje || 16,
        cantidad: expense.cantidad || 1,
        proveedor: expense.proveedor || '',
        rfc_proveedor: expense.rfc_proveedor || '',
        fecha_gasto: expense.fecha_gasto || new Date().toISOString().split('T')[0],
        forma_pago: expense.forma_pago || 'efectivo',
        referencia: expense.referencia || '',
        categoria_id: expense.categoria_id || '',
        notas: expense.notas || '',
        _documentType: 'ticket',
        _warnings: result.warnings,
        _ocrFile: file
      };

      const confidence = ocr.confianza_general;
      const needsValidation = result.calidad !== 'excelente';

      console.log('✅ [Adaptador V2] Procesado - Calidad:', result.calidad, 'Confianza:', confidence + '%');

      return {
        ocrData: result,
        formData,
        confidence,
        needsValidation
      };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ [Adaptador V2] Error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processOCRFile,
    isProcessing,
    error
  };
};
