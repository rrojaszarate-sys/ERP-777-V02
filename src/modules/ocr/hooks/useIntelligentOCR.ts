/**
 * HOOK PERSONALIZADO: useIntelligentOCR
 *
 * Integra el servicio OCR con el clasificador inteligente de GASTOS
 * para proporcionar una experiencia completa de escaneo + clasificación de gastos
 */

import { useState, useCallback } from 'react';
import { tesseractOCRService } from '../services/tesseractOCRService_OPTIMIZED';
import {
  IntelligentExpenseClassifier,
  ExpenseClassificationResult,
  ExpenseCategory
} from '../services/intelligentOCRClassifier';
import type { TicketData, FacturaData } from '../types/OCRTypes';

interface UseIntelligentOCRState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  result: ExpenseClassificationResult | null;
}

interface UseIntelligentOCRReturn extends UseIntelligentOCRState {
  processDocument: (file: File) => Promise<ExpenseClassificationResult | null>;
  reset: () => void;
  getFormattedJSON: () => string | null;
  getVisualReport: () => string | null;
}

/**
 * Hook para procesamiento OCR inteligente con clasificación automática
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { processDocument, result, isProcessing, error, getVisualReport } = useIntelligentOCR();
 *
 *   const handleFileUpload = async (file: File) => {
 *     const result = await processDocument(file);
 *     if (result) {
 *       console.log('Clasificado como:', result.categoria);
 *       console.log(getVisualReport());
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={(e) => handleFileUpload(e.target.files[0])} />
 *       {isProcessing && <p>Procesando...</p>}
 *       {result && (
 *         <div>
 *           <h3>{result.categoria}</h3>
 *           <p>Monto: ${result.datosExtraidos.monto}</p>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntelligentOCR(): UseIntelligentOCRReturn {
  const [state, setState] = useState<UseIntelligentOCRState>({
    isProcessing: false,
    progress: 0,
    error: null,
    result: null
  });

  /**
   * Procesa un documento con OCR + Clasificación Inteligente de GASTO
   */
  const processDocument = useCallback(async (file: File): Promise<ExpenseClassificationResult | null> => {
    try {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        progress: 0,
        error: null,
        result: null
      }));

      console.log('🚀 Iniciando procesamiento inteligente de gasto...');
      console.log('📄 Archivo:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);

      // PASO 1: Ejecutar OCR (20-80% del progreso)
      setState(prev => ({ ...prev, progress: 20 }));
      console.log('🔍 Paso 1/3: Ejecutando OCR en documento...');

      const ocrResult = await tesseractOCRService.processDocument(file);

      setState(prev => ({ ...prev, progress: 60 }));
      console.log('✅ OCR completado. Confianza:', ocrResult.confianza_general + '%');
      console.log('📝 Texto extraído:', ocrResult.texto_completo.substring(0, 200) + '...');

      // PASO 2: Clasificación Inteligente de GASTO (80-90%)
      setState(prev => ({ ...prev, progress: 80 }));
      console.log('🧠 Paso 2/3: Aplicando clasificación inteligente de gasto...');

      const classification = IntelligentExpenseClassifier.classify(
        ocrResult.texto_completo,
        ocrResult.datos_ticket,
        ocrResult.datos_factura
      );

      setState(prev => ({ ...prev, progress: 90 }));
      console.log('✅ Clasificación completada');
      console.log('💸 Categoría de gasto:', classification.categoriaGasto);
      console.log('🎯 Confianza:', classification.confianzaClasificacion + '%');

      // PASO 3: Validación y reporte (90-100%)
      setState(prev => ({ ...prev, progress: 95 }));
      console.log('📊 Paso 3/3: Generando reporte...');

      const report = IntelligentExpenseClassifier.generateReport(classification);
      console.log('\n' + report + '\n');

      // Completado
      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        result: classification
      }));

      console.log('🎉 Procesamiento completo!');

      // Mostrar advertencias/errores si existen
      if (classification.validacion.erroresDetectados.length > 0) {
        console.warn('⚠️ Errores detectados:', classification.validacion.erroresDetectados);
      }

      if (classification.validacion.advertencias.length > 0) {
        console.warn('⚠️ Advertencias:', classification.validacion.advertencias);
      }

      return classification;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido en OCR';
      console.error('❌ Error en procesamiento OCR:', errorMessage);

      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 0,
        error: errorMessage
      }));

      return null;
    }
  }, []);

  /**
   * Reinicia el estado
   */
  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      progress: 0,
      error: null,
      result: null
    });
  }, []);

  /**
   * Obtiene el resultado en formato JSON estructurado
   */
  const getFormattedJSON = useCallback((): string | null => {
    if (!state.result) return null;
    return IntelligentExpenseClassifier.formatToJSON(state.result);
  }, [state.result]);

  /**
   * Obtiene el reporte visual
   */
  const getVisualReport = useCallback((): string | null => {
    if (!state.result) return null;
    return IntelligentExpenseClassifier.generateReport(state.result);
  }, [state.result]);

  return {
    ...state,
    processDocument,
    reset,
    getFormattedJSON,
    getVisualReport
  };
}

/**
 * HELPER: Convierte el resultado a formato de creación de gasto para la base de datos
 */
export function classificationToExpenseData(
  classification: ExpenseClassificationResult,
  eventoId: string
): any {
  const { datosExtraidos, categoriaGasto, tipoDocumento } = classification;

  return {
    evento_id: eventoId,
    categoria: categoriaGasto, // Usar la categoría detectada automáticamente
    monto: datosExtraidos.monto || 0,
    descripcion: datosExtraidos.concepto || 'Gasto desde OCR',
    fecha: datosExtraidos.fecha || new Date().toISOString().split('T')[0],
    proveedor: datosExtraidos.proveedor?.nombre || 'No especificado',
    rfc_proveedor: datosExtraidos.proveedor?.rfc,
    direccion_proveedor: datosExtraidos.proveedor?.direccion,
    forma_pago: datosExtraidos.formaPago,
    subtotal: datosExtraidos.subtotal,
    iva: datosExtraidos.iva,
    ieps: datosExtraidos.ieps,
    uuid_factura: datosExtraidos.uuid,
    serie: datosExtraidos.serie,
    folio: datosExtraidos.folio,
    notas: generateNotesFromItems(datosExtraidos.items),
    // Metadata de validación OCR
    validado_ocr: classification.validacion.datosCompletos,
    confianza_ocr: classification.confianzaClasificacion,
    errores_ocr: classification.validacion.erroresDetectados.join('; ') || null,
    tipo_documento_ocr: tipoDocumento
  };
}

/**
 * Genera notas desde items/productos
 */
function generateNotesFromItems(items?: ExpenseClassificationResult['datosExtraidos']['items']): string | null {
  if (!items || items.length === 0) return null;

  const lines = ['PRODUCTOS/SERVICIOS (OCR):', ''];
  items.forEach((item, i) => {
    const cantidadStr = item.cantidad > 1 ? `${item.cantidad}x ` : '';
    lines.push(`${i + 1}. ${cantidadStr}${item.descripcion} - $${item.importe.toFixed(2)}`);
  });

  lines.push('');
  lines.push(`TOTAL DE ITEMS: ${items.length}`);

  return lines.join('\n');
}

export default useIntelligentOCR;
