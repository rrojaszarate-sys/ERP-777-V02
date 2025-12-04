/**
 * ============================================================================
 * HOOK: useSATValidation
 * ============================================================================
 *
 * Hook de React para validar facturas CFDI contra el SAT.
 *
 * Uso:
 * ```tsx
 * const {
 *   validar,
 *   resultado,
 *   isValidating,
 *   error,
 *   resetear
 * } = useSATValidation();
 *
 * // Al procesar un XML CFDI
 * const handleXMLProcessed = async (cfdiData) => {
 *   const satResult = await validar({
 *     rfcEmisor: cfdiData.emisor.rfc,
 *     rfcReceptor: cfdiData.receptor.rfc,
 *     total: cfdiData.total,
 *     uuid: cfdiData.timbreFiscal.uuid
 *   });
 *
 *   if (!satResult.permitirGuardar) {
 *     toast.error(satResult.mensaje);
 *     return;
 *   }
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import {
  validarCFDI,
  DatosValidacionCFDI,
  ResultadoValidacionSAT,
  limpiarCacheSAT
} from '../../../services/satValidationService';

export interface UseSATValidationReturn {
  /** Función para validar un CFDI */
  validar: (datos: DatosValidacionCFDI) => Promise<ResultadoValidacionSAT>;
  /** Resultado de la última validación */
  resultado: ResultadoValidacionSAT | null;
  /** true mientras se está validando */
  isValidating: boolean;
  /** Error si hubo alguno */
  error: string | null;
  /** Resetea el estado del hook */
  resetear: () => void;
  /** Limpia el cache de validaciones */
  limpiarCache: () => void;
}

/**
 * Hook para validar facturas CFDI contra el SAT
 */
export function useSATValidation(): UseSATValidationReturn {
  const [resultado, setResultado] = useState<ResultadoValidacionSAT | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Valida un CFDI contra el SAT
   */
  const validar = useCallback(async (datos: DatosValidacionCFDI): Promise<ResultadoValidacionSAT> => {
    setIsValidating(true);
    setError(null);

    try {
      const result = await validarCFDI(datos);
      setResultado(result);

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Error desconocido';
      setError(errorMessage);

      const errorResult: ResultadoValidacionSAT = {
        success: false,
        uuid: datos.uuid || '',
        estado: 'Error',
        esValida: false,
        esCancelada: false,
        noEncontrada: false,
        permitirGuardar: false,
        mensaje: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        error: errorMessage
      };

      setResultado(errorResult);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Resetea el estado del hook
   */
  const resetear = useCallback(() => {
    setResultado(null);
    setIsValidating(false);
    setError(null);
  }, []);

  /**
   * Limpia el cache de validaciones
   */
  const limpiarCache = useCallback(() => {
    limpiarCacheSAT();
    resetear();
  }, [resetear]);

  return {
    validar,
    resultado,
    isValidating,
    error,
    resetear,
    limpiarCache
  };
}

export default useSATValidation;
