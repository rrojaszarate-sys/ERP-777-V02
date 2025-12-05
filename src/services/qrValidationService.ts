/**
 * ============================================================================
 * SERVICIO: Validación QR de Facturas CFDI
 * ============================================================================
 *
 * Valida que el PDF de una factura corresponda al XML CFDI mediante:
 * 1. Extracción del QR del PDF usando Google Vision
 * 2. Comparación de datos QR vs datos XML
 * 3. Validación con SAT si los datos coinciden
 *
 * Flujo de validación:
 * PDF + XML → Extraer QR → Comparar → Si coincide → Validar SAT
 */

const API_BASE_URL = import.meta.env.VITE_OCR_API_URL || 'http://localhost:3001';

/**
 * Datos extraídos del QR de una factura CFDI
 */
export interface DatosQRFactura {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: number;
  selloUltimos8?: string;
}

/**
 * Resultado de la extracción de QR
 */
export interface ResultadoExtraccionQR {
  success: boolean;
  qrContent?: string;
  datosExtraidos?: DatosQRFactura;
  error?: string;
  advertencia?: string;
  metodo?: string;
}

/**
 * Resultado de la comparación QR vs XML
 */
export interface ResultadoComparacionQR {
  success: boolean;
  coinciden: boolean;
  diferencias: {
    campo: string;
    valorXML: string;
    valorQR: string;
    critico: boolean;
  }[];
  detalles: {
    uuid?: { xml: string; qr: string; coincide: boolean };
    rfcEmisor?: { xml: string; qr: string; coincide: boolean };
    rfcReceptor?: { xml: string; qr: string; coincide: boolean };
    total?: { xml: number; qr: number; diferencia: number; coincide: boolean };
  };
  porcentajeCoincidencia: number;
  mensaje: string;
  error?: string;
}

/**
 * Resultado completo de validación QR vs XML
 */
export interface ResultadoValidacionQR {
  success: boolean;
  pasos: {
    paso: number;
    descripcion: string;
    estado: 'completado' | 'error' | 'en_proceso';
    error?: string;
  }[];
  qrExtraido?: ResultadoExtraccionQR;
  comparacion?: ResultadoComparacionQR;
  esValida: boolean;
  bloqueante?: boolean;
  advertencia?: boolean;
  mensaje: string;
  error?: string;
}

/**
 * Extrae el QR de una imagen o PDF de factura
 */
export async function extraerQRDeFactura(file: File): Promise<ResultadoExtraccionQR> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/qr/extraer`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Error ${response.status}: ${response.statusText}`
      };
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error extrayendo QR:', error);
    return {
      success: false,
      error: error.message || 'Error de conexión con el servidor'
    };
  }
}

/**
 * Valida que el PDF corresponda al XML comparando datos del QR
 *
 * @param pdfFile - Archivo PDF de la factura
 * @param datosXML - Datos extraídos del XML CFDI
 * @returns Resultado de la validación cruzada
 */
export async function validarQRvsXML(
  pdfFile: File,
  datosXML: {
    uuid: string;
    rfcEmisor: string;
    rfcReceptor: string;
    total: number;
  }
): Promise<ResultadoValidacionQR> {
  try {
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('datosXML', JSON.stringify(datosXML));

    const response = await fetch(`${API_BASE_URL}/api/qr/validar-cruzado`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        pasos: [],
        esValida: false,
        advertencia: true,
        mensaje: errorData.error || `Error ${response.status}`,
        error: errorData.error
      };
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error en validación QR vs XML:', error);
    return {
      success: false,
      pasos: [],
      esValida: false,
      advertencia: true,
      mensaje: 'Error de conexión con el servidor de validación',
      error: error.message
    };
  }
}

/**
 * Parsea una URL de QR del SAT
 */
export async function parsearURLQR(qrUrl: string): Promise<{
  success: boolean;
  uuid?: string;
  rfcEmisor?: string;
  rfcReceptor?: string;
  total?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/qr/parsear-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrUrl })
    });

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validación completa de factura: QR + XML + SAT
 *
 * Flujo:
 * 1. Parsear XML CFDI
 * 2. Extraer QR del PDF
 * 3. Comparar datos QR vs XML
 * 4. Si coinciden, validar con SAT
 *
 * @param xmlFile - Archivo XML CFDI
 * @param pdfFile - Archivo PDF de la factura
 * @param datosXML - Datos ya parseados del XML (opcional, se parsean si no se proporcionan)
 */
export async function validacionCompletaFactura(
  pdfFile: File,
  datosXML: {
    uuid: string;
    rfcEmisor: string;
    rfcReceptor: string;
    total: number;
  }
): Promise<{
  success: boolean;
  qrValido: boolean;
  satValido: boolean;
  mensaje: string;
  detalles: {
    qr: ResultadoValidacionQR | null;
    sat: any | null;
  };
  permitirGuardar: boolean;
}> {
  const resultado = {
    success: false,
    qrValido: false,
    satValido: false,
    mensaje: '',
    detalles: {
      qr: null as ResultadoValidacionQR | null,
      sat: null as any
    },
    permitirGuardar: false
  };

  try {
    // Paso 1: Validar QR vs XML
    console.log('🔍 Validando QR vs XML...');
    const qrResult = await validarQRvsXML(pdfFile, datosXML);
    resultado.detalles.qr = qrResult;

    if (qrResult.success && qrResult.esValida) {
      resultado.qrValido = true;
      console.log('✅ QR coincide con XML');
    } else if (qrResult.bloqueante) {
      // Si hay diferencias críticas, bloquear
      resultado.mensaje = qrResult.mensaje || '❌ El PDF no corresponde al XML';
      return resultado;
    } else if (qrResult.advertencia) {
      // Advertencia pero permitir continuar
      console.warn('⚠️ Advertencia en validación QR:', qrResult.mensaje);
      resultado.qrValido = true; // Permitir con advertencia
    }

    // Paso 2: Validar con SAT (si el QR es válido)
    console.log('🔍 Validando con SAT...');
    const satResponse = await fetch(`${API_BASE_URL}/api/sat/validar-cfdi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosXML)
    });

    if (satResponse.ok) {
      const satResult = await satResponse.json();
      resultado.detalles.sat = satResult;

      if (satResult.esValida) {
        resultado.satValido = true;
        resultado.success = true;
        resultado.permitirGuardar = true;
        resultado.mensaje = '✅ Factura validada: QR coincide y está vigente en SAT';
      } else if (satResult.esCancelada) {
        resultado.mensaje = '❌ Factura CANCELADA en SAT - No se puede registrar';
        resultado.permitirGuardar = false;
      } else if (satResult.noEncontrada) {
        resultado.mensaje = '⚠️ Factura NO encontrada en SAT - Posible apócrifa';
        resultado.permitirGuardar = false;
      } else {
        resultado.mensaje = satResult.mensaje || '⚠️ Estado SAT desconocido';
        resultado.permitirGuardar = satResult.permitirGuardar || false;
      }
    } else {
      // Error de conexión con SAT, pero permitir con advertencia si QR es válido
      resultado.mensaje = '⚠️ No se pudo validar con SAT (error de conexión)';
      resultado.permitirGuardar = resultado.qrValido;
    }

    return resultado;

  } catch (error: any) {
    console.error('Error en validación completa:', error);
    resultado.mensaje = `Error: ${error.message}`;
    return resultado;
  }
}

/**
 * Verifica si el servidor de validación está disponible
 */
export async function verificarServidorValidacion(): Promise<{
  disponible: boolean;
  googleVision: boolean;
  satService: boolean;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      return {
        disponible: data.status === 'ok',
        googleVision: data.google_vision === 'configured',
        satService: data.sat_service === 'available'
      };
    }
    return { disponible: false, googleVision: false, satService: false };
  } catch {
    return { disponible: false, googleVision: false, satService: false };
  }
}

/**
 * Resultado de validar PDF directo con SAT
 */
export interface ResultadoValidacionPDFSAT {
  success: boolean;
  datosExtraidos?: {
    uuid: string;
    rfcEmisor: string;
    rfcReceptor: string;
    total: number;
  };
  rfcsEncontrados?: string[];
  validacionSAT?: {
    success: boolean;
    estado: string;
    esValida: boolean;
    esCancelada: boolean;
    noEncontrada: boolean;
    permitirGuardar: boolean;
    mensaje: string;
    codigoEstatus?: string;
    esCancelable?: string;
    timestamp: string;
  };
  error?: string;
  datosFaltantes?: {
    uuid: boolean;
    rfcEmisor: boolean;
    rfcReceptor: boolean;
    total: boolean;
  };
}

/**
 * Valida una factura usando SOLO el PDF (sin necesidad de XML)
 * Extrae los datos fiscales del PDF con OCR y luego valida con el SAT
 *
 * @param pdfFile - Archivo PDF de la factura
 * @returns Resultado con datos extraídos y validación SAT
 *
 * @example
 * ```typescript
 * const result = await validarPDFConSAT(pdfFile);
 *
 * if (result.success && result.validacionSAT?.esValida) {
 *   console.log('Factura vigente!');
 *   console.log('UUID:', result.datosExtraidos?.uuid);
 * } else if (result.validacionSAT?.esCancelada) {
 *   console.error('Factura cancelada');
 * }
 * ```
 */
export async function validarPDFConSAT(pdfFile: File): Promise<ResultadoValidacionPDFSAT> {
  try {
    const formData = new FormData();
    formData.append('file', pdfFile);

    console.log('📄 [PDF-SAT] Enviando PDF para validación...', pdfFile.name);

    const response = await fetch(`${API_BASE_URL}/api/pdf/validar-sat`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Error ${response.status}: ${response.statusText}`,
        datosFaltantes: errorData.datosFaltantes,
        datosExtraidos: errorData.datosExtraidos
      };
    }

    const resultado = await response.json();
    console.log('✅ [PDF-SAT] Resultado:', resultado.validacionSAT?.estado);

    return resultado;
  } catch (error: any) {
    console.error('❌ [PDF-SAT] Error:', error);
    return {
      success: false,
      error: error.message || 'Error de conexión con el servidor'
    };
  }
}
