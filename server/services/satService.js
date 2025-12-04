/**
 * ============================================================================
 * SERVICIO DE VALIDACIÓN CFDI CON SAT
 * ============================================================================
 *
 * Consulta el Web Service oficial del SAT para validar facturas CFDI.
 *
 * Endpoint SAT: https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc
 * Protocolo: SOAP 1.1
 *
 * Estados posibles:
 * - "Vigente": Factura válida y activa
 * - "Cancelado": Factura cancelada (NO SE DEBE ACEPTAR)
 * - "No Encontrado": No existe en SAT (POSIBLE APÓCRIFA)
 *
 * @author ERP-777
 * @version 1.0.0
 */

import axios from 'axios';
import xml2js from 'xml2js';

// Configuración del endpoint SAT
const SAT_ENDPOINT = 'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc';
const SAT_SOAP_ACTION = 'http://tempuri.org/IConsultaCFDIService/Consulta';

// Timeout para la consulta (10 segundos)
const TIMEOUT_MS = 10000;

// Cache en memoria para evitar consultas duplicadas (5 minutos)
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Formatea el total con exactamente 2 decimales
 * @param {number|string} total - El monto total
 * @returns {string} Total formateado (ej: "1234.56")
 */
function formatearTotal(total) {
  const num = typeof total === 'string' ? parseFloat(total) : total;
  if (isNaN(num)) {
    throw new Error('Total inválido: ' + total);
  }
  return num.toFixed(2);
}

/**
 * Construye el envelope SOAP para la consulta al SAT
 * @param {string} rfcEmisor - RFC del emisor
 * @param {string} rfcReceptor - RFC del receptor
 * @param {string} total - Total formateado
 * @param {string} uuid - UUID del CFDI
 * @returns {string} Envelope SOAP completo
 */
function construirSOAPEnvelope(rfcEmisor, rfcReceptor, total, uuid) {
  // Expresión impresa según especificación SAT
  // Formato: ?re={rfcEmisor}&rr={rfcReceptor}&tt={total}&id={uuid}
  const expresionImpresa = `?re=${rfcEmisor}&rr=${rfcReceptor}&tt=${total}&id=${uuid}`;

  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:Consulta>
         <tem:expresionImpresa><![CDATA[${expresionImpresa}]]></tem:expresionImpresa>
      </tem:Consulta>
   </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Parsea la respuesta XML del SAT a un objeto JSON
 * @param {string} xmlResponse - Respuesta XML del SAT
 * @returns {Promise<Object>} Datos parseados
 */
async function parsearRespuestaSAT(xmlResponse) {
  const parser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: false,
    tagNameProcessors: [xml2js.processors.stripPrefix]
  });

  const result = await parser.parseStringPromise(xmlResponse);

  // Navegar la estructura SOAP para obtener la respuesta
  const envelope = result.Envelope || result['soap:Envelope'] || result['s:Envelope'];
  if (!envelope) {
    throw new Error('Respuesta SAT inválida: no se encontró Envelope');
  }

  const body = envelope.Body || envelope['soap:Body'] || envelope['s:Body'];
  if (!body) {
    throw new Error('Respuesta SAT inválida: no se encontró Body');
  }

  // Buscar ConsultaResponse y ConsultaResult
  const consultaResponse = body.ConsultaResponse || body['a:ConsultaResponse'];
  if (!consultaResponse) {
    throw new Error('Respuesta SAT inválida: no se encontró ConsultaResponse');
  }

  const consultaResult = consultaResponse.ConsultaResult || consultaResponse['a:ConsultaResult'];
  if (!consultaResult) {
    throw new Error('Respuesta SAT inválida: no se encontró ConsultaResult');
  }

  // Extraer campos de la respuesta
  // Los atributos pueden estar directamente o bajo '$'
  const attrs = consultaResult.$ || consultaResult;

  return {
    codigoEstatus: attrs.CodigoEstatus || consultaResult.CodigoEstatus || '',
    estado: attrs.Estado || consultaResult.Estado || '',
    esCancelable: attrs.EsCancelable || consultaResult.EsCancelable || '',
    estatusCancelacion: attrs.EstatusCancelacion || consultaResult.EstatusCancelacion || null,
    validacionEFOS: attrs.ValidacionEFOS || consultaResult.ValidacionEFOS || null
  };
}

/**
 * Consulta el estado de un CFDI en el SAT
 *
 * @param {string} rfcEmisor - RFC del emisor de la factura
 * @param {string} rfcReceptor - RFC del receptor de la factura
 * @param {number|string} total - Total de la factura
 * @param {string} uuid - UUID del CFDI (Folio Fiscal)
 * @returns {Promise<Object>} Resultado de la consulta
 *
 * @example
 * const result = await consultarSAT('AAA010101AAA', 'BBB020202BBB', 1234.56, 'abc123-...');
 * console.log(result.estado); // "Vigente" | "Cancelado" | "No Encontrado"
 */
export async function consultarSAT(rfcEmisor, rfcReceptor, total, uuid) {
  // Validar parámetros
  if (!rfcEmisor || typeof rfcEmisor !== 'string') {
    throw new Error('RFC Emisor es requerido');
  }
  if (!rfcReceptor || typeof rfcReceptor !== 'string') {
    throw new Error('RFC Receptor es requerido');
  }
  if (total === undefined || total === null) {
    throw new Error('Total es requerido');
  }
  if (!uuid || typeof uuid !== 'string') {
    throw new Error('UUID es requerido');
  }

  // Normalizar parámetros
  const rfcEmisorNorm = rfcEmisor.toUpperCase().trim();
  const rfcReceptorNorm = rfcReceptor.toUpperCase().trim();
  const totalFormateado = formatearTotal(total);
  const uuidNorm = uuid.toUpperCase().trim();

  // Verificar cache
  const cacheKey = `${rfcEmisorNorm}|${rfcReceptorNorm}|${totalFormateado}|${uuidNorm}`;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log('🔵 [SAT] Resultado desde cache:', uuidNorm.substring(0, 8));
    return { ...cached.data, fromCache: true };
  }

  console.log('🟡 [SAT] Consultando:', {
    rfcEmisor: rfcEmisorNorm,
    rfcReceptor: rfcReceptorNorm,
    total: totalFormateado,
    uuid: uuidNorm.substring(0, 8) + '...'
  });

  // Construir envelope SOAP
  const soapEnvelope = construirSOAPEnvelope(
    rfcEmisorNorm,
    rfcReceptorNorm,
    totalFormateado,
    uuidNorm
  );

  try {
    // Realizar petición al SAT
    const response = await axios.post(SAT_ENDPOINT, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': SAT_SOAP_ACTION
      },
      timeout: TIMEOUT_MS
    });

    // Parsear respuesta
    const resultado = await parsearRespuestaSAT(response.data);

    console.log('🟢 [SAT] Respuesta:', resultado);

    // Determinar si la factura es válida para aceptar
    const esValida = resultado.estado === 'Vigente';
    const esCancelada = resultado.estado === 'Cancelado' ||
                        resultado.estatusCancelacion === 'Cancelado';
    const noEncontrada = resultado.estado === 'No Encontrado' ||
                         resultado.codigoEstatus?.includes('N - 601') ||
                         resultado.codigoEstatus?.includes('N - 602');

    const resultadoFinal = {
      success: true,
      uuid: uuidNorm,
      estado: resultado.estado,
      codigoEstatus: resultado.codigoEstatus,
      esCancelable: resultado.esCancelable,
      estatusCancelacion: resultado.estatusCancelacion,
      validacionEFOS: resultado.validacionEFOS,

      // Flags para lógica de negocio
      esValida,
      esCancelada,
      noEncontrada,
      permitirGuardar: esValida, // Solo permitir si está vigente

      // Mensaje para mostrar al usuario
      mensaje: esValida
        ? '✅ Factura vigente en el SAT'
        : esCancelada
          ? '❌ Factura CANCELADA - No se puede registrar'
          : noEncontrada
            ? '⚠️ Factura no encontrada en SAT - Posible factura apócrifa'
            : `⚠️ Estado desconocido: ${resultado.estado}`,

      timestamp: new Date().toISOString()
    };

    // Guardar en cache
    cache.set(cacheKey, {
      data: resultadoFinal,
      timestamp: Date.now()
    });

    return resultadoFinal;

  } catch (error) {
    console.error('🔴 [SAT] Error:', error.message);

    // Si es error de timeout, permitir guardar con advertencia
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        success: false,
        error: 'Timeout al consultar SAT',
        uuid: uuidNorm,
        estado: 'Sin Verificar',
        esValida: false,
        esCancelada: false,
        noEncontrada: false,
        permitirGuardar: true, // Permitir con advertencia
        mensaje: '⚠️ No se pudo verificar con SAT (timeout) - Proceda con precaución',
        timestamp: new Date().toISOString()
      };
    }

    // Si es error de red, permitir guardar con advertencia
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Error de conexión con SAT',
        uuid: uuidNorm,
        estado: 'Sin Verificar',
        esValida: false,
        esCancelada: false,
        noEncontrada: false,
        permitirGuardar: true, // Permitir con advertencia
        mensaje: '⚠️ No se pudo conectar con SAT - Proceda con precaución',
        timestamp: new Date().toISOString()
      };
    }

    // Otros errores
    return {
      success: false,
      error: error.message,
      uuid: uuidNorm,
      estado: 'Error',
      esValida: false,
      esCancelada: false,
      noEncontrada: false,
      permitirGuardar: false,
      mensaje: `❌ Error al validar: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Limpia el cache de consultas
 */
export function limpiarCache() {
  cache.clear();
  console.log('🧹 [SAT] Cache limpiado');
}

export default {
  consultarSAT,
  limpiarCache
};
