/**
 * SERVICIO: Procesamiento de XML CFDI
 * ====================================
 * Centraliza toda la lógica de parseo y validación de XML CFDI
 * Reutilizable en todos los formularios de gastos
 */
import { parseCFDIXml, cfdiToExpenseData } from '../modules/eventos-erp/utils/cfdiXmlParser';

export interface DatosFactura {
    proveedor: string;
    rfc: string;
    concepto: string;
    fecha: string;
    subtotal: number;
    iva: number;
    total: number;
    uuid: string;
    folio?: string;
    cadenaOriginal?: string;
    // Datos para validación SAT
    rfcEmisor: string;
    rfcReceptor: string;
}

export interface ResultadoProcesoXML {
    success: boolean;
    datos?: DatosFactura;
    error?: string;
    cfdiCompleto?: ReturnType<typeof parseCFDIXml> extends Promise<infer T> ? T : never;
}

/**
 * Procesa un archivo XML CFDI y extrae los datos de factura
 */
export async function procesarXMLCFDI(file: File): Promise<ResultadoProcesoXML> {
    try {
        // Validar extensión
        if (!file.name.toLowerCase().endsWith('.xml')) {
            return { success: false, error: 'El archivo debe ser XML' };
        }

        // Leer contenido
        const content = await file.text();

        // Parsear CFDI
        const cfdi = await parseCFDIXml(content);
        if (!cfdi) {
            return { success: false, error: 'No se pudo parsear el XML CFDI' };
        }

        // Extraer UUID (requerido para validación SAT)
        const uuid = cfdi.timbreFiscal?.uuid;
        if (!uuid) {
            return { success: false, error: 'XML sin UUID (TimbreFiscalDigital)' };
        }

        // Convertir a datos de gasto
        const expenseData = cfdiToExpenseData(cfdi);

        const datos: DatosFactura = {
            proveedor: expenseData.proveedor || cfdi.emisor?.nombre || '',
            rfc: expenseData.rfc_proveedor || cfdi.emisor?.rfc || '',
            concepto: expenseData.concepto || '',
            fecha: expenseData.fecha_gasto || '',
            subtotal: expenseData.subtotal || cfdi.subTotal || 0,
            iva: expenseData.iva || 0,
            total: expenseData.total || cfdi.total || 0,
            uuid,
            folio: expenseData.folio || cfdi.folio,
            cadenaOriginal: cfdi.complemento?.timbreFiscal?.cadenaOriginal,
            rfcEmisor: cfdi.emisor?.rfc || '',
            rfcReceptor: cfdi.receptor?.rfc || ''
        };

        return {
            success: true,
            datos,
            cfdiCompleto: cfdi
        };

    } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error desconocido procesando XML';
        return { success: false, error: mensaje };
    }
}

/**
 * Extrae la cadena original de un XML CFDI para comparar con PDF
 */
export async function extraerCadenaOriginal(file: File): Promise<string | null> {
    try {
        const content = await file.text();
        const cfdi = await parseCFDIXml(content);
        return cfdi?.complemento?.timbreFiscal?.cadenaOriginal || null;
    } catch {
        return null;
    }
}

/**
 * Valida que un XML sea un CFDI válido (estructura mínima)
 */
export async function validarEstructuraXML(file: File): Promise<{ valido: boolean; error?: string }> {
    try {
        const content = await file.text();

        // Verificar que es XML
        if (!content.trim().startsWith('<?xml') && !content.includes('<cfdi:Comprobante')) {
            return { valido: false, error: 'No es un archivo XML válido' };
        }

        // Verificar elementos mínimos del CFDI
        const tieneCFDI = content.includes('cfdi:Comprobante') || content.includes('<Comprobante');
        const tieneEmisor = content.includes('cfdi:Emisor') || content.includes('<Emisor');
        const tieneReceptor = content.includes('cfdi:Receptor') || content.includes('<Receptor');
        const tieneTimbre = content.includes('tfd:TimbreFiscalDigital') || content.includes('TimbreFiscalDigital');

        if (!tieneCFDI) return { valido: false, error: 'No es un CFDI válido' };
        if (!tieneEmisor) return { valido: false, error: 'CFDI sin emisor' };
        if (!tieneReceptor) return { valido: false, error: 'CFDI sin receptor' };
        if (!tieneTimbre) return { valido: false, error: 'CFDI sin timbre fiscal' };

        return { valido: true };

    } catch {
        return { valido: false, error: 'Error leyendo archivo XML' };
    }
}
