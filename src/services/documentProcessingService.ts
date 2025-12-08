/**
 * SERVICIO PRINCIPAL: Procesamiento de Documentos
 * ================================================
 * Orquesta todos los servicios de procesamiento:
 * - XML CFDI
 * - PDF
 * - Imágenes/Tickets
 * 
 * Uso:
 *   import { documentService } from '@/services/documentProcessingService';
 *   const resultado = await documentService.procesarDocumento(file);
 */

import { procesarXMLCFDI, extraerCadenaOriginal, DatosFactura } from './xmlProcessingService';
import { procesarPDFConSAT, verificarCorrespondencia, DatosPDF, ResultadoValidacionSAT } from './pdfProcessingService';
import { procesarImagenOCR, detectarTipoDocumento, DatosTicket } from './imageProcessingService';

export type TipoDocumento = 'xml' | 'pdf' | 'imagen' | 'desconocido';

export interface DatosGastoUnificados {
    proveedor?: string;
    rfc?: string;
    concepto?: string;
    fecha?: string;
    subtotal?: number;
    iva?: number;
    total?: number;
    uuid?: string;
    folio?: string;
    tipoOrigen: TipoDocumento;
}

export interface ResultadoProcesamiento {
    success: boolean;
    tipo: TipoDocumento;
    datos?: DatosGastoUnificados;
    datosOriginales?: DatosFactura | DatosPDF | DatosTicket;
    validacionSAT?: ResultadoValidacionSAT;
    error?: string;
}

// Re-exportar tipos para uso externo
export type { DatosFactura, DatosPDF, DatosTicket, ResultadoValidacionSAT };

class DocumentProcessingService {
    /**
     * Procesa cualquier tipo de documento y retorna datos unificados
     */
    async procesarDocumento(file: File): Promise<ResultadoProcesamiento> {
        const tipo = detectarTipoDocumento(file);

        switch (tipo) {
            case 'xml':
                return this.procesarXML(file);
            case 'pdf':
                return this.procesarPDF(file);
            case 'imagen':
                return this.procesarImagen(file);
            default:
                return {
                    success: false,
                    tipo: 'desconocido',
                    error: 'Tipo de archivo no soportado'
                };
        }
    }

    /**
     * Procesa XML CFDI
     */
    async procesarXML(file: File): Promise<ResultadoProcesamiento> {
        const resultado = await procesarXMLCFDI(file);

        if (!resultado.success || !resultado.datos) {
            return {
                success: false,
                tipo: 'xml',
                error: resultado.error
            };
        }

        const datos: DatosGastoUnificados = {
            proveedor: resultado.datos.proveedor,
            rfc: resultado.datos.rfc,
            concepto: resultado.datos.concepto,
            fecha: resultado.datos.fecha,
            subtotal: resultado.datos.subtotal,
            iva: resultado.datos.iva,
            total: resultado.datos.total,
            uuid: resultado.datos.uuid,
            folio: resultado.datos.folio,
            tipoOrigen: 'xml'
        };

        return {
            success: true,
            tipo: 'xml',
            datos,
            datosOriginales: resultado.datos
        };
    }

    /**
     * Procesa PDF y valida con SAT
     */
    async procesarPDF(file: File): Promise<ResultadoProcesamiento> {
        const resultado = await procesarPDFConSAT(file);

        if (!resultado.success) {
            return {
                success: false,
                tipo: 'pdf',
                error: resultado.error
            };
        }

        const datos: DatosGastoUnificados = {
            rfc: resultado.datos?.rfcEmisor,
            total: resultado.datos?.total,
            uuid: resultado.datos?.uuid,
            tipoOrigen: 'pdf'
        };

        return {
            success: true,
            tipo: 'pdf',
            datos,
            datosOriginales: resultado.datos,
            validacionSAT: resultado.validacionSAT
        };
    }

    /**
     * Procesa imagen/ticket con OCR
     */
    async procesarImagen(file: File): Promise<ResultadoProcesamiento> {
        const resultado = await procesarImagenOCR(file);

        if (!resultado.success || !resultado.datos) {
            return {
                success: false,
                tipo: 'imagen',
                error: resultado.error
            };
        }

        const datos: DatosGastoUnificados = {
            proveedor: resultado.datos.establecimiento,
            rfc: resultado.datos.rfc,
            concepto: resultado.datos.concepto,
            fecha: resultado.datos.fecha,
            subtotal: resultado.datos.subtotal,
            iva: resultado.datos.iva,
            total: resultado.datos.total,
            tipoOrigen: 'imagen'
        };

        return {
            success: true,
            tipo: 'imagen',
            datos,
            datosOriginales: resultado.datos
        };
    }

    /**
     * Verifica que un PDF corresponda al XML cargado (mismo CFDI)
     */
    async verificarCorrespondenciaXMLPDF(
        xmlFile: File,
        pdfFile: File
    ): Promise<{ corresponden: boolean; mensaje: string }> {
        // Extraer UUID del XML
        const resultadoXML = await procesarXMLCFDI(xmlFile);
        if (!resultadoXML.success || !resultadoXML.datos?.uuid) {
            return { corresponden: false, mensaje: 'No se pudo leer UUID del XML' };
        }

        // Extraer UUID del PDF
        const resultadoPDF = await procesarPDFConSAT(pdfFile);
        if (!resultadoPDF.success || !resultadoPDF.datos?.uuid) {
            return { corresponden: false, mensaje: 'No se pudo leer UUID del PDF' };
        }

        // Comparar
        return verificarCorrespondencia(
            resultadoXML.datos.uuid,
            resultadoPDF.datos.uuid
        );
    }

    /**
     * Obtiene datos para validación SAT desde un XML
     */
    async obtenerDatosSAT(xmlFile: File): Promise<{
        uuid: string;
        rfcEmisor: string;
        rfcReceptor: string;
        total: number;
    } | null> {
        const resultado = await procesarXMLCFDI(xmlFile);
        if (!resultado.success || !resultado.datos) return null;

        return {
            uuid: resultado.datos.uuid,
            rfcEmisor: resultado.datos.rfcEmisor,
            rfcReceptor: resultado.datos.rfcReceptor,
            total: resultado.datos.total
        };
    }

    /**
     * Detecta el tipo de documento
     */
    detectarTipo(file: File): TipoDocumento {
        return detectarTipoDocumento(file);
    }

    /**
     * Extrae cadena original de XML (para comparación)
     */
    async extraerCadenaXML(file: File): Promise<string | null> {
        return extraerCadenaOriginal(file);
    }
}

// Singleton
export const documentService = new DocumentProcessingService();

// Export para uso como servicio individual
export default documentService;
