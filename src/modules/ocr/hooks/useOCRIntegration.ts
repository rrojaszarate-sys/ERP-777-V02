import { useState } from 'react';
import { expenseOCRIntegration, ExpenseOCRIntegrationResult } from '../services/expenseOCRIntegration';
import { financesService } from '../../eventos/services/financesService';
import { useAuth } from '../../../core/auth/AuthProvider';
import { supabase } from '../../../core/config/supabase';

/**
 * Hook para integración completa OCR INTELIGENTE → GASTOS
 * Usa el clasificador inteligente para extracción y mapeo automático de datos
 */
export const useOCRIntegration = (eventId: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<ExpenseOCRIntegrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  /**
   * Procesa archivo OCR con clasificador INTELIGENTE y retorna datos para prellenar formulario
   */
  const processOCRFile = async (file: File): Promise<{
    ocrData: any;
    formData: any;
    confidence: number;
    needsValidation: boolean;
  }> => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔍 Iniciando procesamiento OCR INTELIGENTE:', file.name);

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Usar el NUEVO integrador inteligente
      const integrationResult = await expenseOCRIntegration.processFileToExpense(
        file,
        eventId,
        user.id
      );

      // CAMBIO: Solo lanzar error si hay errores CRÍTICOS
      // Los warnings no deben impedir el procesamiento
      if (!integrationResult.success && integrationResult.errors.length > 0) {
        // Si hay errores críticos, lanzar excepción
        throw new Error(integrationResult.errors.join(', ') || 'Error procesando documento');
      }

      const { expense, classification } = integrationResult;
      const confidence = classification.confianzaClasificacion;
      const needsValidation = confidence < 70 || !classification.validacion.datosCompletos;

      console.log('✅ Clasificación inteligente completada:', {
        categoria: classification.categoriaGasto,
        tipo: classification.tipoDocumento,
        confianza: confidence + '%',
        datosCompletos: classification.validacion.datosCompletos
      });

      // Mostrar advertencias si existen
      if (integrationResult.warnings.length > 0) {
        console.warn('⚠️ Advertencias OCR:', integrationResult.warnings);
      }

      // Convertir a formato del formulario (para compatibilidad)
      const formData = {
        concepto: expense?.concepto || '',
        descripcion: expense?.descripcion || '',
        total_con_iva: expense?.total || 0,
        subtotal: expense?.subtotal || 0,
        iva: expense?.iva || 0,
        iva_porcentaje: expense?.iva_porcentaje || 16,
        cantidad: expense?.cantidad || 1,
        proveedor: expense?.proveedor || '',
        rfc_proveedor: expense?.rfc_proveedor || '',
        fecha_gasto: expense?.fecha_gasto || new Date().toISOString().split('T')[0],
        forma_pago: expense?.forma_pago || 'efectivo',
        referencia: expense?.referencia || '',
        categoria_id: expense?.categoria_id || '',
        notas: expense?.notas || '',
        // Metadatos OCR
        _ocrConfidence: confidence,
        _needsValidation: needsValidation,
        _ocrFile: file,
        _documentType: 'ticket',
        _warnings: integrationResult.warnings,
        _classification: classification
      };

      const result = {
        ocrData: integrationResult,
        formData,
        confidence,
        needsValidation
      };

      setOcrResult(integrationResult);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido en OCR';
      console.error('❌ Error en OCR:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Crea gasto automáticamente desde datos OCR (sin formulario)
   */
  const createExpenseFromOCR = async (file: File): Promise<any> => {
    try {
      const ocrResult = await processOCRFile(file);
      
      if (ocrResult.formData._documentType !== 'ticket') {
        throw new Error('El documento debe ser un ticket para crear un gasto');
      }

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Subir archivo primero
      const fileUrl = await uploadOCRFile(file);
      
      // Guardar documento OCR
      const ocrDoc = await saveOCRDocument(ocrResult.ocrData, file.name, fileUrl);
      
      // Crear gasto
      const expense = await financesService.createExpenseFromOCR(eventId, ocrDoc, user.id);
      
      console.log('✅ Gasto creado automáticamente desde OCR');
      return expense;

    } catch (err) {
      console.error('❌ Error creando gasto desde OCR:', err);
      throw err;
    }
  };

  /**
   * Crea ingreso automáticamente desde datos OCR (sin formulario)
   */
  const createIncomeFromOCR = async (file: File): Promise<any> => {
    try {
      const ocrResult = await processOCRFile(file);
      
      if (ocrResult.formData._documentType !== 'factura') {
        throw new Error('El documento debe ser una factura para crear un ingreso');
      }

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Subir archivo primero
      const fileUrl = await uploadOCRFile(file);
      
      // Guardar documento OCR
      const ocrDoc = await saveOCRDocument(ocrResult.ocrData, file.name, fileUrl);
      
      // Crear ingreso
      const income = await financesService.createIncomeFromOCR(eventId, ocrDoc, user.id);
      
      console.log('✅ Ingreso creado automáticamente desde OCR');
      return income;

    } catch (err) {
      console.error('❌ Error creando ingreso desde OCR:', err);
      throw err;
    }
  };

  /**
   * Sube archivo OCR a Supabase Storage
   */
  const uploadOCRFile = async (file: File): Promise<string> => {
    const fileName = `${eventId}/${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('eventos-documentos')
      .upload(fileName, file);

    if (error) {
      throw new Error(`Error subiendo archivo: ${error.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('eventos-documentos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  /**
   * Guarda documento OCR en base de datos
   */
  const saveOCRDocument = async (ocrData: any, fileName: string, fileUrl: string): Promise<any> => {
    const { data, error } = await supabase
      .from('evt_documentos_ocr')
      .insert([{
        nombre_archivo: fileName,
        estado_procesamiento: 'completed',
        texto_completo: ocrData.texto_completo,
        confianza_general: ocrData.confianza_general,
        datos_ticket: ocrData.datos_ticket || null,
        datos_factura: ocrData.datos_factura || null,
        archivo_url: fileUrl,
        evento_id: eventId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Error guardando documento OCR: ${error.message}`);
    }

    return data;
  };

  /**
   * Limpia estado del hook
   */
  const clearOCRState = () => {
    setOcrResult(null);
    setError(null);
  };

  return {
    // Estado
    isProcessing,
    ocrResult,
    error,
    
    // Funciones principales
    processOCRFile,           // Para prellenar formularios
    createExpenseFromOCR,     // Creación automática de gastos
    createIncomeFromOCR,      // Creación automática de ingresos
    clearOCRState,
    
    // Utilidades
    uploadOCRFile,
    saveOCRDocument
  };
};

/**
 * Formatea productos OCR para campo de notas
 */
const formatProductsForNotes = (productos?: any[]): string => {
  if (!productos || productos.length === 0) {
    return 'Productos extraídos automáticamente por OCR';
  }

  return productos
    .filter(p => p.nombre && p.precio_total)
    .map(p => `• ${p.nombre}: $${p.precio_total.toFixed(2)}`)
    .join('\n') || 'Productos detectados por OCR';
};

export default useOCRIntegration;