/**
 * SERVICIO: Procesamiento de Imágenes con OCR
 * ============================================
 * Extracción inteligente de datos de tickets mexicanos
 * Patrones optimizados para: OXXO, 7-Eleven, Walmart, etc.
 */
import { processFileWithOCR } from '../modules/ocr/services/dualOCRService';

export interface DatosTicket {
    establecimiento?: string;
    rfc?: string;
    concepto?: string;
    fecha?: string;
    subtotal?: number;
    iva?: number;
    total?: number;
    direccion?: string;
    metodoPago?: string;
    folio?: string;
    confianza?: number;
}

export interface ResultadoProcesoImagen {
    success: boolean;
    datos?: DatosTicket;
    textoCompleto?: string;
    error?: string;
}

interface OCRResponse {
    success?: boolean;
    texto_completo?: string;
    lineas?: Array<{ texto: string; confianza: number }> | string[];
    confianza_general?: number;
    procesador?: string;
    raw_detections?: number;
    // Datos ya extraídos por el servidor
    datos_extraidos?: {
        establecimiento?: string | null;
        direccion?: string | null;
        telefono?: string | null;
        rfc?: string | null;
        fecha?: string | null;
        hora?: string | null;
        total?: number | null;
        subtotal?: number | null;
        iva?: number | null;
        forma_pago?: string | null;
        productos?: Array<{ nombre: string; precio_unitario: number; cantidad: number }>;
    };
}

// Patrones regex para extracción de datos de tickets mexicanos
const PATRONES = {
    // RFC: 3-4 letras + 6 dígitos + 3 caracteres alfanuméricos
    rfc: /\b([A-ZÑ&]{3,4})[-\s]?(\d{6})[-\s]?([A-Z0-9]{3})\b/i,

    // Total: buscar "TOTAL", "IMPORTE", etc. seguido de monto
    total: /(?:TOTAL|IMPORTE\s*TOTAL|MONTO|PAGAR|A\s*PAGAR|CASH|EFECTIVO)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,

    // Subtotal
    subtotal: /(?:SUBTOTAL|SUB\s*TOTAL|SUMA)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,

    // IVA
    iva: /(?:IVA|I\.V\.A\.?|IMPUESTO)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,

    // Fecha: varios formatos mexicanos
    fecha: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    fechaAlternativa: /(\d{1,2})\s+(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*\s+(\d{2,4})/i,

    // Folio
    folio: /(?:FOLIO|TICKET|NO\.|NUMERO|#)[:\s#]*([A-Z0-9\-]+)/i,

    // Método de pago
    metodoPago: /(?:FORMA\s*DE\s*PAGO|METODO|TIPO\s*PAGO)[:\s]*(EFECTIVO|TARJETA|DEBITO|CREDITO|TRANSFERENCIA)/i,

    // Establecimientos conocidos
    establecimientos: [
        { patron: /OXXO/i, nombre: 'OXXO' },
        { patron: /7[-\s]?ELEVEN/i, nombre: '7-Eleven' },
        { patron: /WALMART/i, nombre: 'Walmart' },
        { patron: /SORIANA/i, nombre: 'Soriana' },
        { patron: /CHEDRAUI/i, nombre: 'Chedraui' },
        { patron: /HEB|H[\s-]E[\s-]B/i, nombre: 'HEB' },
        { patron: /COSTCO/i, nombre: 'Costco' },
        { patron: /SAMS|SAM'?S\s*CLUB/i, nombre: 'Sam\'s Club' },
        { patron: /BODEGA\s*AURRERA/i, nombre: 'Bodega Aurrerá' },
        { patron: /OFFICE\s*DEPOT/i, nombre: 'Office Depot' },
        { patron: /LIVERPOOL/i, nombre: 'Liverpool' },
        { patron: /PALACIO\s*DE\s*HIERRO/i, nombre: 'Palacio de Hierro' },
        { patron: /STARBUCKS/i, nombre: 'Starbucks' },
        { patron: /MCDONALDS|MC\s*DONALD/i, nombre: 'McDonald\'s' },
        { patron: /BURGER\s*KING/i, nombre: 'Burger King' },
        { patron: /DOMINOS|DOMINO'?S/i, nombre: 'Domino\'s Pizza' },
        { patron: /LITTLE\s*CAESARS/i, nombre: 'Little Caesars' },
        { patron: /FARMACIA/i, nombre: 'Farmacia' },
        { patron: /GASOLINERA|PEMEX/i, nombre: 'Gasolinera' },
    ]
};

/**
 * Extrae datos estructurados del texto OCR de un ticket
 */
function extraerDatosDelTexto(texto: string): DatosTicket {
    const datos: DatosTicket = {};
    const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // 1. Buscar RFC
    const matchRFC = texto.match(PATRONES.rfc);
    if (matchRFC) {
        datos.rfc = (matchRFC[1] + matchRFC[2] + matchRFC[3]).toUpperCase();
    }

    // 2. Buscar establecimiento conocido
    for (const est of PATRONES.establecimientos) {
        if (est.patron.test(texto)) {
            datos.establecimiento = est.nombre;
            break;
        }
    }

    // Si no hay establecimiento conocido, usar la primera línea significativa
    if (!datos.establecimiento && lineas.length > 0) {
        // Buscar primera línea que no sea fecha ni número
        for (const linea of lineas.slice(0, 5)) {
            if (linea.length > 3 && !/^\d+$/.test(linea) && !PATRONES.fecha.test(linea)) {
                datos.establecimiento = linea.slice(0, 50);
                break;
            }
        }
    }

    // 3. Buscar Total (el más importante)
    const matchTotal = texto.match(PATRONES.total);
    if (matchTotal) {
        datos.total = parseFloat(matchTotal[1].replace(/,/g, ''));
    } else {
        // Buscar el número más grande que parezca un total
        const numeros = texto.match(/\$?\s*([\d,]+\.\d{2})/g);
        if (numeros && numeros.length > 0) {
            const valores = numeros.map(n => parseFloat(n.replace(/[$,\s]/g, ''))).filter(n => !isNaN(n));
            if (valores.length > 0) {
                datos.total = Math.max(...valores);
            }
        }
    }

    // 4. Buscar Subtotal
    const matchSubtotal = texto.match(PATRONES.subtotal);
    if (matchSubtotal) {
        datos.subtotal = parseFloat(matchSubtotal[1].replace(/,/g, ''));
    }

    // 5. Buscar IVA
    const matchIVA = texto.match(PATRONES.iva);
    if (matchIVA) {
        datos.iva = parseFloat(matchIVA[1].replace(/,/g, ''));
    }

    // Si tenemos total pero no subtotal/IVA, calcular
    if (datos.total && !datos.subtotal && !datos.iva) {
        // Asumir 16% IVA
        datos.subtotal = Math.round((datos.total / 1.16) * 100) / 100;
        datos.iva = Math.round((datos.total - datos.subtotal) * 100) / 100;
    }

    // 6. Buscar Fecha
    const matchFecha = texto.match(PATRONES.fecha);
    if (matchFecha) {
        let [, dia, mes, año] = matchFecha;
        if (año.length === 2) año = '20' + año;
        datos.fecha = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    } else {
        const matchFechaAlt = texto.match(PATRONES.fechaAlternativa);
        if (matchFechaAlt) {
            const meses: Record<string, string> = {
                'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
                'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
                'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
            };
            const mesTexto = matchFechaAlt[0].match(/ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC/i)?.[0].toUpperCase();
            if (mesTexto && meses[mesTexto]) {
                let año = matchFechaAlt[2];
                if (año.length === 2) año = '20' + año;
                datos.fecha = `${año}-${meses[mesTexto]}-${matchFechaAlt[1].padStart(2, '0')}`;
            }
        }
    }

    // 7. Buscar Folio
    const matchFolio = texto.match(PATRONES.folio);
    if (matchFolio) {
        datos.folio = matchFolio[1];
    }

    // 8. Buscar Método de pago
    const matchMetodo = texto.match(PATRONES.metodoPago);
    if (matchMetodo) {
        datos.metodoPago = matchMetodo[1];
    } else if (/EFECTIVO/i.test(texto)) {
        datos.metodoPago = 'EFECTIVO';
    } else if (/TARJETA|TC\s*\*|DEBITO|CREDITO/i.test(texto)) {
        datos.metodoPago = 'TARJETA';
    }

    // 9. Generar concepto si no tenemos
    if (!datos.concepto) {
        if (datos.establecimiento) {
            datos.concepto = `Compra en ${datos.establecimiento}`;
        } else {
            datos.concepto = 'Compra según ticket';
        }
    }

    return datos;
}

/**
 * Procesa una imagen de ticket con OCR y extrae datos
 */
export async function procesarImagenOCR(file: File): Promise<ResultadoProcesoImagen> {
    try {
        // Validar tipo de archivo
        const tiposValidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!tiposValidos.includes(file.type)) {
            return {
                success: false,
                error: 'Tipo de imagen no soportado. Use JPG, PNG o WEBP'
            };
        }

        // Validar tamaño (máximo 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return {
                success: false,
                error: 'Imagen muy grande. Máximo 10MB'
            };
        }

        // Procesar con OCR
        const resultado = await processFileWithOCR(file) as OCRResponse | null;

        if (!resultado) {
            return {
                success: false,
                error: 'No se pudo procesar la imagen'
            };
        }

        console.log('📝 [OCR] Resultado recibido:', {
            success: resultado.success,
            textoLength: resultado.texto_completo?.length || 0,
            datosExtraidos: resultado.datos_extraidos
        });

        // Obtener texto completo
        const textoCompleto = resultado.texto_completo || '';

        // PRIORIDAD 1: Usar datos ya extraídos por el servidor
        const datosServidor = resultado.datos_extraidos;
        let datos: DatosTicket = {};

        if (datosServidor) {
            datos = {
                establecimiento: datosServidor.establecimiento || undefined,
                rfc: datosServidor.rfc || undefined,
                total: datosServidor.total || undefined,
                subtotal: datosServidor.subtotal || undefined,
                iva: datosServidor.iva || undefined,
                fecha: datosServidor.fecha || undefined,
                direccion: datosServidor.direccion || undefined,
                metodoPago: datosServidor.forma_pago || undefined,
                confianza: resultado.confianza_general
            };

            // Generar concepto
            if (datos.establecimiento) {
                datos.concepto = `Compra en ${datos.establecimiento}`;
            }
        }

        // PRIORIDAD 2: Si el servidor no extrajo datos, intentar localmente
        if (!datos.total && textoCompleto.length > 10) {
            const datosLocales = extraerDatosDelTexto(textoCompleto);
            datos = { ...datosLocales, confianza: resultado.confianza_general };
        }

        // Calcular subtotal/IVA si tenemos total pero faltan
        if (datos.total && !datos.subtotal && !datos.iva) {
            datos.subtotal = Math.round((datos.total / 1.16) * 100) / 100;
            datos.iva = Math.round((datos.total - datos.subtotal) * 100) / 100;
        }

        // Verificar que tenemos al menos el total
        if (!datos.total || datos.total <= 0) {
            return {
                success: false,
                error: 'No se pudo detectar el total del ticket',
                textoCompleto
            };
        }

        console.log('✅ [OCR] Datos finales:', datos);

        return {
            success: true,
            datos,
            textoCompleto
        };

    } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error desconocido procesando imagen';
        console.error('❌ [OCR] Error:', mensaje);
        return { success: false, error: mensaje };
    }
}

/**
 * Valida si un archivo es una imagen soportada
 */
export function esImagenValida(file: File): boolean {
    const tiposValidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    return tiposValidos.includes(file.type);
}

/**
 * Detecta automáticamente el tipo de documento basado en el archivo
 */
export function detectarTipoDocumento(file: File): 'xml' | 'pdf' | 'imagen' | 'desconocido' {
    const nombre = file.name.toLowerCase();
    const tipo = file.type.toLowerCase();

    if (nombre.endsWith('.xml') || tipo.includes('xml')) {
        return 'xml';
    }
    if (nombre.endsWith('.pdf') || tipo === 'application/pdf') {
        return 'pdf';
    }
    if (tipo.startsWith('image/')) {
        return 'imagen';
    }
    return 'desconocido';
}
