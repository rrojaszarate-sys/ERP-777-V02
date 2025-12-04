/**
 * ============================================================================
 * SERVICIO DE VALIDACIÓN SAT - FRONTEND
 * ============================================================================
 *
 * Cliente HTTP para consumir el endpoint de validación CFDI del backend.
 * Consulta el Web Service oficial del SAT para verificar facturas.
 *
 * Uso:
 * ```typescript
 * import { validarCFDI } from '@/services/satValidationService';
 *
 * const resultado = await validarCFDI({
 *   rfcEmisor: 'AAA010101AAA',
 *   rfcReceptor: 'BBB020202BBB',
 *   total: 1234.56,
 *   uuid: 'abc123...'
 * });
 *
 * if (!resultado.permitirGuardar) {
 *   toast.error(resultado.mensaje);
 *   return;
 * }
 * ```
 */

// URL del backend - Usar variable de entorno o fallback a localhost
const API_BASE_URL = import.meta.env.VITE_OCR_API_URL || 'http://localhost:3001';

/**
 * Datos requeridos para validar un CFDI
 */
export interface DatosValidacionCFDI {
  /** RFC del emisor de la factura */
  rfcEmisor: string;
  /** RFC del receptor de la factura */
  rfcReceptor: string;
  /** Total de la factura */
  total: number;
  /** UUID/Folio Fiscal del CFDI */
  uuid: string;
}

/**
 * Resultado de la validación SAT
 */
export interface ResultadoValidacionSAT {
  /** Si la operación fue exitosa */
  success: boolean;
  /** UUID consultado */
  uuid: string;
  /** Estado del CFDI: "Vigente" | "Cancelado" | "No Encontrado" */
  estado: string;
  /** Código de estatus SAT */
  codigoEstatus?: string;
  /** Si la factura es cancelable */
  esCancelable?: string;
  /** Estatus de cancelación si aplica */
  estatusCancelacion?: string | null;
  /** Validación EFOS (lista negra SAT) */
  validacionEFOS?: string | null;

  // Flags para lógica de negocio
  /** true si la factura está vigente */
  esValida: boolean;
  /** true si la factura está cancelada */
  esCancelada: boolean;
  /** true si la factura no existe en SAT */
  noEncontrada: boolean;
  /** true si se permite guardar el gasto */
  permitirGuardar: boolean;

  /** Mensaje para mostrar al usuario */
  mensaje: string;
  /** Timestamp de la consulta */
  timestamp: string;
  /** true si el resultado viene de cache */
  fromCache?: boolean;
  /** Error si hubo alguno */
  error?: string;
}

/**
 * Cache en memoria para evitar consultas duplicadas
 * Expira en 5 minutos
 */
const cache = new Map<string, { data: ResultadoValidacionSAT; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Genera una clave única para el cache
 */
function generarCacheKey(datos: DatosValidacionCFDI): string {
  return `${datos.rfcEmisor}|${datos.rfcReceptor}|${datos.total}|${datos.uuid}`.toUpperCase();
}

/**
 * Valida un CFDI contra el SAT
 *
 * @param datos - Datos del CFDI a validar
 * @returns Resultado de la validación
 *
 * @example
 * ```typescript
 * const resultado = await validarCFDI({
 *   rfcEmisor: 'EKU9003173C9',
 *   rfcReceptor: 'XEXX010101000',
 *   total: 1500.00,
 *   uuid: '6128396f-c09b-4ec6-8699-43c5f7e3b230'
 * });
 *
 * if (resultado.esCancelada) {
 *   console.error('Factura cancelada');
 * } else if (resultado.noEncontrada) {
 *   console.warn('Factura no encontrada - posible apócrifa');
 * } else if (resultado.esValida) {
 *   console.log('Factura vigente');
 * }
 * ```
 */
export async function validarCFDI(datos: DatosValidacionCFDI): Promise<ResultadoValidacionSAT> {
  // Validar parámetros
  if (!datos.rfcEmisor) {
    return {
      success: false,
      uuid: datos.uuid || '',
      estado: 'Error',
      esValida: false,
      esCancelada: false,
      noEncontrada: false,
      permitirGuardar: false,
      mensaje: 'RFC del emisor es requerido',
      timestamp: new Date().toISOString(),
      error: 'RFC del emisor es requerido'
    };
  }

  if (!datos.rfcReceptor) {
    return {
      success: false,
      uuid: datos.uuid || '',
      estado: 'Error',
      esValida: false,
      esCancelada: false,
      noEncontrada: false,
      permitirGuardar: false,
      mensaje: 'RFC del receptor es requerido',
      timestamp: new Date().toISOString(),
      error: 'RFC del receptor es requerido'
    };
  }

  if (!datos.uuid) {
    return {
      success: false,
      uuid: '',
      estado: 'Error',
      esValida: false,
      esCancelada: false,
      noEncontrada: false,
      permitirGuardar: false,
      mensaje: 'UUID del CFDI es requerido',
      timestamp: new Date().toISOString(),
      error: 'UUID del CFDI es requerido'
    };
  }

  // Verificar cache
  const cacheKey = generarCacheKey(datos);
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log('🔵 [SAT] Resultado desde cache local');
    return { ...cached.data, fromCache: true };
  }

  console.log('🟡 [SAT] Consultando SAT...', {
    uuid: datos.uuid.substring(0, 8) + '...',
    total: datos.total
  });

  try {
    const response = await fetch(`${API_BASE_URL}/api/sat/validar-cfdi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    const resultado: ResultadoValidacionSAT = await response.json();

    console.log('🟢 [SAT] Resultado:', resultado.estado);

    // Guardar en cache
    cache.set(cacheKey, {
      data: resultado,
      timestamp: Date.now()
    });

    return resultado;

  } catch (error: any) {
    console.error('🔴 [SAT] Error:', error.message);

    // Si es error de red, retornar con advertencia pero permitir guardar
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return {
        success: false,
        uuid: datos.uuid,
        estado: 'Sin Verificar',
        esValida: false,
        esCancelada: false,
        noEncontrada: false,
        permitirGuardar: true, // Permitir con advertencia
        mensaje: '⚠️ No se pudo conectar con el servidor de validación SAT',
        timestamp: new Date().toISOString(),
        error: 'Error de conexión'
      };
    }

    return {
      success: false,
      uuid: datos.uuid,
      estado: 'Error',
      esValida: false,
      esCancelada: false,
      noEncontrada: false,
      permitirGuardar: false,
      mensaje: `❌ Error al validar: ${error.message}`,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Limpia el cache de validaciones
 */
export function limpiarCacheSAT(): void {
  cache.clear();
  console.log('🧹 [SAT] Cache local limpiado');
}

/**
 * Verifica si el servidor de validación SAT está disponible
 */
export async function verificarDisponibilidadSAT(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      return data.sat_service === 'available';
    }
    return false;
  } catch {
    return false;
  }
}

export default {
  validarCFDI,
  limpiarCacheSAT,
  verificarDisponibilidadSAT
};
