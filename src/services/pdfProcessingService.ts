/**
 * SERVICIO: Procesamiento de PDF
 * ===============================
 * Centraliza la lógica de validación de PDF con SAT
 * Incluye extracción de QR y comparación con XML
 */
import { validarPDFConSAT } from './qrValidationService';

export interface DatosPDF {
    uuid?: string;
    rfcEmisor?: string;
    rfcReceptor?: string;
    total?: number;
    cadenaOriginalQR?: string;
}

export interface ResultadoValidacionSAT {
    esValida: boolean;
    esCancelada: boolean;
    noEncontrada: boolean;
    mensaje?: string;
}

export interface ResultadoProcesoPDF {
    success: boolean;
    datos?: DatosPDF;
    validacionSAT?: ResultadoValidacionSAT;
    error?: string;
}

/**
 * Procesa un PDF de factura y valida con SAT
 */
export async function procesarPDFConSAT(file: File): Promise<ResultadoProcesoPDF> {
    try {
        // Validar extensión
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return { success: false, error: 'El archivo debe ser PDF' };
        }

        // Llamar al servicio de validación existente
        const resultado = await validarPDFConSAT(file);

        if (!resultado.success) {
            return {
                success: false,
                error: resultado.error || 'Error procesando PDF'
            };
        }

        return {
            success: true,
            datos: resultado.datosExtraidos ? {
                uuid: resultado.datosExtraidos.uuid,
                rfcEmisor: resultado.datosExtraidos.rfcEmisor,
                rfcReceptor: resultado.datosExtraidos.rfcReceptor,
                total: resultado.datosExtraidos.total
            } : undefined,
            validacionSAT: resultado.validacionSAT ? {
                esValida: resultado.validacionSAT.esValida || false,
                esCancelada: resultado.validacionSAT.esCancelada || false,
                noEncontrada: resultado.validacionSAT.noEncontrada || false,
                mensaje: resultado.validacionSAT.mensaje
            } : undefined
        };

    } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error desconocido procesando PDF';
        return { success: false, error: mensaje };
    }
}

/**
 * Compara la cadena original del PDF (QR) con la del XML
 * Retorna true si coinciden (son el mismo CFDI)
 */
export function compararCadenasOriginales(cadenaXML: string, cadenaPDF: string): boolean {
    if (!cadenaXML || !cadenaPDF) return false;

    // Normalizar: quitar espacios y convertir a minúsculas
    const normalizar = (s: string) => s.replace(/\s+/g, '').toLowerCase();

    return normalizar(cadenaXML) === normalizar(cadenaPDF);
}

/**
 * Verifica que un PDF corresponda al mismo CFDI que un XML
 * comparando UUIDs
 */
export function verificarCorrespondencia(
    uuidXML: string,
    uuidPDF: string
): { corresponden: boolean; mensaje: string } {
    if (!uuidXML || !uuidPDF) {
        return {
            corresponden: false,
            mensaje: 'Falta UUID para comparar'
        };
    }

    const normalizar = (s: string) => s.toUpperCase().trim();
    const corresponden = normalizar(uuidXML) === normalizar(uuidPDF);

    return {
        corresponden,
        mensaje: corresponden
            ? '✅ PDF y XML corresponden al mismo CFDI'
            : '❌ PDF y XML tienen UUIDs diferentes'
    };
}
