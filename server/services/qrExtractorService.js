/**
 * ============================================================================
 * SERVICIO: Extractor de Datos Fiscales de PDF (OCR)
 * ============================================================================
 *
 * Extrae datos fiscales de facturas CFDI mexicanas usando:
 * 1. PRIMERO: Extracción directa de texto con pdf-parse (rápido)
 * 2. FALLBACK: OCR con Google Vision si el PDF es imagen
 *
 * Busca en el texto del PDF:
 *   - UUID/Folio Fiscal
 *   - RFC del Emisor
 *   - RFC del Receptor
 *   - Total de la factura
 *
 * Con estos datos se puede validar directamente con el SAT sin necesidad
 * de decodificar el código QR.
 *
 * MEJORAS V3:
 * - Extracción híbrida: texto directo + OCR como fallback
 * - Múltiples patrones regex para mayor precisión
 * - Validación con SAT directo desde PDF
 */

/**
 * Extrae texto de un PDF usando pdf-parse
 * @param {Buffer} pdfBuffer
 * @returns {Promise<string>} Texto extraído
 */
async function extraerTextoPDF(pdfBuffer) {
  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default;
    const data = await pdfParse(pdfBuffer);
    console.log('✅ pdf-parse: Texto extraído exitosamente');
    return data.text || '';
  } catch (err) {
    console.warn('⚠️ Error extrayendo texto del PDF:', err.message);
    return '';
  }
}

/**
 * Parsea la URL del QR del SAT y extrae los datos de la factura
 * @param {string} qrUrl - URL completa del QR o contenido del QR
 * @returns {object} Datos extraídos del QR
 */
function parsearURLQRSAT(qrUrl) {
  const resultado = {
    success: false,
    uuid: null,
    rfcEmisor: null,
    rfcReceptor: null,
    total: null,
    selloUltimos8: null,
    urlOriginal: qrUrl
  };

  try {
    if (!qrUrl || typeof qrUrl !== 'string') {
      resultado.error = 'URL del QR vacía o inválida';
      return resultado;
    }

    // El QR puede contener la URL directa o solo los parámetros
    let urlToParse = qrUrl.trim();

    // Si es una URL completa
    if (urlToParse.includes('http')) {
      try {
        const url = new URL(urlToParse);

        // Extraer parámetros de query string
        resultado.uuid = url.searchParams.get('id') || url.searchParams.get('Id') || url.searchParams.get('ID');
        resultado.rfcEmisor = url.searchParams.get('re') || url.searchParams.get('Re') || url.searchParams.get('RE');
        resultado.rfcReceptor = url.searchParams.get('rr') || url.searchParams.get('Rr') || url.searchParams.get('RR');
        resultado.selloUltimos8 = url.searchParams.get('fe') || url.searchParams.get('Fe') || url.searchParams.get('FE');

        // El total viene con formato especial: 0000001234.567890
        const totalStr = url.searchParams.get('tt') || url.searchParams.get('Tt') || url.searchParams.get('TT');
        if (totalStr) {
          resultado.total = parseFloat(totalStr);
        }

      } catch (urlError) {
        // Si falla el parsing de URL, intentar con regex
        console.log('⚠️ Error parseando URL, intentando con regex:', urlError.message);
      }
    }

    // Si no se obtuvieron datos de URL, usar regex como fallback
    if (!resultado.uuid) {
      // Patrones para extraer datos del QR
      const patterns = {
        uuid: /[?&]id=([A-Fa-f0-9\-]{36})/i,
        rfcEmisor: /[?&]re=([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/i,
        rfcReceptor: /[?&]rr=([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/i,
        total: /[?&]tt=([0-9]+\.?[0-9]*)/i,
        sello: /[?&]fe=([A-Za-z0-9+/=]{8})/i
      };

      const uuidMatch = urlToParse.match(patterns.uuid);
      if (uuidMatch) resultado.uuid = uuidMatch[1];

      const emisorMatch = urlToParse.match(patterns.rfcEmisor);
      if (emisorMatch) resultado.rfcEmisor = emisorMatch[1];

      const receptorMatch = urlToParse.match(patterns.rfcReceptor);
      if (receptorMatch) resultado.rfcReceptor = receptorMatch[1];

      const totalMatch = urlToParse.match(patterns.total);
      if (totalMatch) resultado.total = parseFloat(totalMatch[1]);

      const selloMatch = urlToParse.match(patterns.sello);
      if (selloMatch) resultado.selloUltimos8 = selloMatch[1];
    }

    // Normalizar UUID a mayúsculas
    if (resultado.uuid) {
      resultado.uuid = resultado.uuid.toUpperCase();
    }

    // Normalizar RFCs a mayúsculas
    if (resultado.rfcEmisor) {
      resultado.rfcEmisor = resultado.rfcEmisor.toUpperCase();
    }
    if (resultado.rfcReceptor) {
      resultado.rfcReceptor = resultado.rfcReceptor.toUpperCase();
    }

    // Verificar que se extrajeron los datos mínimos
    resultado.success = !!(resultado.uuid && resultado.rfcEmisor && resultado.rfcReceptor && resultado.total);

    if (!resultado.success) {
      resultado.error = 'No se pudieron extraer todos los datos del QR';
      resultado.datosFaltantes = [];
      if (!resultado.uuid) resultado.datosFaltantes.push('UUID');
      if (!resultado.rfcEmisor) resultado.datosFaltantes.push('RFC Emisor');
      if (!resultado.rfcReceptor) resultado.datosFaltantes.push('RFC Receptor');
      if (!resultado.total) resultado.datosFaltantes.push('Total');
    }

    return resultado;

  } catch (error) {
    resultado.error = `Error parseando QR: ${error.message}`;
    return resultado;
  }
}

/**
 * Compara los datos del QR con los datos del XML
 * @param {object} datosQR - Datos extraídos del QR
 * @param {object} datosXML - Datos extraídos del XML CFDI
 * @returns {object} Resultado de la comparación
 */
function compararQRvsXML(datosQR, datosXML) {
  const resultado = {
    success: false,
    coinciden: false,
    diferencias: [],
    advertencias: [],
    detalles: {}
  };

  try {
    // Validar que existan ambos conjuntos de datos
    if (!datosQR || !datosQR.success) {
      resultado.error = 'Datos del QR no válidos o incompletos';
      return resultado;
    }

    if (!datosXML) {
      resultado.error = 'Datos del XML no proporcionados';
      return resultado;
    }

    resultado.success = true;
    let coincidencias = 0;
    let totalComparaciones = 0;

    // Comparar UUID
    if (datosXML.uuid) {
      totalComparaciones++;
      const uuidXML = datosXML.uuid.toUpperCase();
      const uuidQR = datosQR.uuid.toUpperCase();

      resultado.detalles.uuid = {
        xml: uuidXML,
        qr: uuidQR,
        coincide: uuidXML === uuidQR
      };

      if (uuidXML === uuidQR) {
        coincidencias++;
      } else {
        resultado.diferencias.push({
          campo: 'UUID',
          valorXML: uuidXML,
          valorQR: uuidQR,
          critico: true
        });
      }
    }

    // Comparar RFC Emisor
    if (datosXML.rfcEmisor) {
      totalComparaciones++;
      const rfcEmisorXML = datosXML.rfcEmisor.toUpperCase();
      const rfcEmisorQR = datosQR.rfcEmisor.toUpperCase();

      resultado.detalles.rfcEmisor = {
        xml: rfcEmisorXML,
        qr: rfcEmisorQR,
        coincide: rfcEmisorXML === rfcEmisorQR
      };

      if (rfcEmisorXML === rfcEmisorQR) {
        coincidencias++;
      } else {
        resultado.diferencias.push({
          campo: 'RFC Emisor',
          valorXML: rfcEmisorXML,
          valorQR: rfcEmisorQR,
          critico: true
        });
      }
    }

    // Comparar RFC Receptor
    if (datosXML.rfcReceptor) {
      totalComparaciones++;
      const rfcReceptorXML = datosXML.rfcReceptor.toUpperCase();
      const rfcReceptorQR = datosQR.rfcReceptor.toUpperCase();

      resultado.detalles.rfcReceptor = {
        xml: rfcReceptorXML,
        qr: rfcReceptorQR,
        coincide: rfcReceptorXML === rfcReceptorQR
      };

      if (rfcReceptorXML === rfcReceptorQR) {
        coincidencias++;
      } else {
        resultado.diferencias.push({
          campo: 'RFC Receptor',
          valorXML: rfcReceptorXML,
          valorQR: rfcReceptorQR,
          critico: true
        });
      }
    }

    // Comparar Total (con tolerancia de 0.01 por redondeo)
    if (datosXML.total !== undefined) {
      totalComparaciones++;
      const totalXML = parseFloat(datosXML.total);
      const totalQR = parseFloat(datosQR.total);
      const diferencia = Math.abs(totalXML - totalQR);
      const tolerancia = 0.01;

      resultado.detalles.total = {
        xml: totalXML,
        qr: totalQR,
        diferencia: diferencia,
        coincide: diferencia <= tolerancia
      };

      if (diferencia <= tolerancia) {
        coincidencias++;
      } else {
        resultado.diferencias.push({
          campo: 'Total',
          valorXML: totalXML.toFixed(2),
          valorQR: totalQR.toFixed(2),
          diferencia: diferencia.toFixed(2),
          critico: diferencia > 1 // Crítico si la diferencia es mayor a $1
        });
      }
    }

    // Determinar resultado final
    resultado.coincidencias = coincidencias;
    resultado.totalComparaciones = totalComparaciones;
    resultado.porcentajeCoincidencia = totalComparaciones > 0
      ? Math.round((coincidencias / totalComparaciones) * 100)
      : 0;

    // Si hay diferencias críticas, marcar como no coincide
    const diferenciasCriticas = resultado.diferencias.filter(d => d.critico);
    resultado.coinciden = diferenciasCriticas.length === 0;

    // Generar mensaje descriptivo
    if (resultado.coinciden) {
      resultado.mensaje = '✅ QR y XML coinciden perfectamente';
    } else {
      const camposDiferentes = diferenciasCriticas.map(d => d.campo).join(', ');
      resultado.mensaje = `❌ QR y XML NO coinciden. Diferencias en: ${camposDiferentes}`;
    }

    return resultado;

  } catch (error) {
    resultado.error = `Error comparando datos: ${error.message}`;
    return resultado;
  }
}

/**
 * Extrae datos fiscales del PDF/imagen usando OCR (Google Vision)
 * @param {Buffer} imageBuffer - Buffer de la imagen/PDF
 * @param {object} visionClient - Cliente de Google Vision
 * @returns {Promise<object>} Resultado con datos fiscales extraídos
 */
async function extraerQRDeImagen(imageBuffer, visionClient) {
  const resultado = {
    success: false,
    qrContent: null,
    datosExtraidos: null,
    metodo: 'ocr_texto'
  };

  try {
    if (!visionClient) {
      resultado.error = 'Google Vision no está configurado';
      return resultado;
    }

    if (!imageBuffer) {
      resultado.error = 'No se proporcionó imagen';
      return resultado;
    }

    console.log('🔍 Extrayendo datos fiscales con OCR...');

    // Usar TEXT_DETECTION para extraer todo el texto
    const [result] = await visionClient.annotateImage({
      image: { content: imageBuffer },
      features: [{ type: 'TEXT_DETECTION' }]
    });

    const textAnnotations = result.textAnnotations || [];
    const fullText = textAnnotations[0]?.description || '';

    if (!fullText || fullText.length < 50) {
      resultado.error = 'No se pudo extraer texto del documento';
      return resultado;
    }

    console.log('📄 Texto extraído:', fullText.length, 'caracteres');

    // ====== EXTRAER DATOS FISCALES DEL TEXTO ======

    // 1. Buscar UUID (Folio Fiscal) - formato: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
    const uuidPatterns = [
      /(?:folio\s*fiscal|uuid|timbre)[:\s]*([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})/gi,
      /([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})/gi
    ];

    let uuid = null;
    for (const pattern of uuidPatterns) {
      const match = fullText.match(pattern);
      if (match) {
        // Extraer solo el UUID del match
        const uuidExtract = match[0].match(/[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/i);
        if (uuidExtract) {
          uuid = uuidExtract[0].toUpperCase();
          console.log('✅ UUID encontrado:', uuid);
          break;
        }
      }
    }

    // 2. Buscar RFCs - formato: 3-4 letras + 6 dígitos + 3 caracteres
    // RFC de persona moral: XXX000000XXX (12 chars)
    // RFC de persona física: XXXX000000XXX (13 chars)
    const rfcPattern = /\b([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})\b/gi;
    const rfcsEncontrados = [];
    let rfcMatch;
    while ((rfcMatch = rfcPattern.exec(fullText)) !== null) {
      const rfc = rfcMatch[1].toUpperCase();
      // Filtrar RFCs genéricos o inválidos
      if (!rfcsEncontrados.includes(rfc) &&
          rfc !== 'XAXX010101000' && // RFC genérico público general
          rfc.length >= 12 && rfc.length <= 13) {
        rfcsEncontrados.push(rfc);
      }
    }

    console.log('📋 RFCs encontrados:', rfcsEncontrados);

    // Determinar emisor y receptor basado en contexto
    let rfcEmisor = null;
    let rfcReceptor = null;

    // Buscar con contexto "emisor" o "receptor"
    const emisorMatch = fullText.match(/(?:emisor|quien\s*factura)[:\s\n]*(?:rfc)?[:\s]*([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/i);
    const receptorMatch = fullText.match(/(?:receptor|cliente)[:\s\n]*(?:rfc)?[:\s]*([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/i);

    if (emisorMatch) rfcEmisor = emisorMatch[1].toUpperCase();
    if (receptorMatch) rfcReceptor = receptorMatch[1].toUpperCase();

    // Si no se encontraron con contexto, usar los primeros dos encontrados
    if (!rfcEmisor && rfcsEncontrados.length >= 1) {
      rfcEmisor = rfcsEncontrados[0];
    }
    if (!rfcReceptor && rfcsEncontrados.length >= 2) {
      rfcReceptor = rfcsEncontrados[1];
    }

    // 3. Buscar Total de la factura
    const totalPatterns = [
      /(?:total)[:\s]*\$?\s*([\d,]+\.?\d*)/gi,
      /(?:importe\s*total)[:\s]*\$?\s*([\d,]+\.?\d*)/gi,
      /(?:monto\s*total)[:\s]*\$?\s*([\d,]+\.?\d*)/gi,
      /\$\s*([\d,]+\.\d{2})\b/g // Cualquier monto con formato $X,XXX.XX
    ];

    let total = null;
    let maxTotal = 0;

    for (const pattern of totalPatterns) {
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        const valorStr = match[1].replace(/,/g, '');
        const valor = parseFloat(valorStr);
        if (!isNaN(valor) && valor > maxTotal && valor < 10000000) { // Límite razonable
          maxTotal = valor;
          total = valor;
        }
      }
    }

    console.log('💰 Total encontrado:', total);

    // Construir resultado
    const datosExtraidos = {
      success: !!(uuid || (rfcEmisor && rfcReceptor)),
      uuid: uuid,
      rfcEmisor: rfcEmisor,
      rfcReceptor: rfcReceptor,
      total: total,
      rfcsEncontrados: rfcsEncontrados
    };

    resultado.datosExtraidos = datosExtraidos;
    resultado.textoOCR = fullText.substring(0, 1000); // Para debug

    // Si encontramos al menos UUID o ambos RFCs, considerarlo exitoso
    if (datosExtraidos.success) {
      resultado.success = true;
      console.log('✅ Datos fiscales extraídos:', {
        uuid: uuid?.substring(0, 8) + '...',
        rfcEmisor,
        rfcReceptor,
        total
      });
    } else {
      resultado.error = 'No se encontraron suficientes datos fiscales en el documento';
      resultado.advertencia = true;
    }

    return resultado;

  } catch (error) {
    console.error('❌ Error extrayendo datos:', error);
    resultado.error = `Error en extracción OCR: ${error.message}`;
    return resultado;
  }
}

/**
 * Valida una factura comparando datos OCR de la imagen vs datos del XML
 *
 * IMPORTANTE: Esta validación es SOLO ADVERTENCIA, no bloqueante.
 * La validación SAT es la definitiva.
 *
 * @param {Buffer} imageBuffer - Buffer de la imagen del PDF/factura
 * @param {object} datosXML - Datos extraídos del XML CFDI
 * @param {object} visionClient - Cliente de Google Vision
 * @returns {Promise<object>} Resultado de validación completo
 */
async function validarFacturaQRvsXML(imageBuffer, datosXML, visionClient) {
  const resultado = {
    success: false,
    pasos: [],
    qrExtraido: null,
    comparacion: null,
    esValida: false,
    advertencia: true, // Por defecto es solo advertencia
    bloqueante: false, // NO bloqueante - SAT es el validador principal
    mensaje: ''
  };

  try {
    // Paso 1: Extraer datos fiscales con OCR
    resultado.pasos.push({ paso: 1, descripcion: 'Extrayendo datos con OCR', estado: 'en_proceso' });

    const ocrResult = await extraerQRDeImagen(imageBuffer, visionClient);
    resultado.qrExtraido = ocrResult;

    if (!ocrResult.success) {
      resultado.pasos[0].estado = 'advertencia';
      resultado.pasos[0].error = ocrResult.error;
      resultado.mensaje = `⚠️ No se pudieron extraer datos del PDF: ${ocrResult.error}`;
      resultado.advertencia = true;
      resultado.success = true; // Permitir continuar
      return resultado;
    }

    resultado.pasos[0].estado = 'completado';

    // Paso 2: Comparar datos OCR vs XML
    resultado.pasos.push({ paso: 2, descripcion: 'Comparando datos OCR vs XML', estado: 'en_proceso' });

    const datosOCR = ocrResult.datosExtraidos;

    // Construir comparación
    const comparacion = {
      success: true,
      coinciden: true,
      diferencias: [],
      advertencias: [],
      detalles: {}
    };

    // Comparar UUID si está disponible en ambos
    if (datosOCR.uuid && datosXML.uuid) {
      const uuidXML = datosXML.uuid.toUpperCase();
      const uuidOCR = datosOCR.uuid.toUpperCase();
      comparacion.detalles.uuid = { xml: uuidXML, ocr: uuidOCR, coincide: uuidXML === uuidOCR };

      if (uuidXML !== uuidOCR) {
        comparacion.diferencias.push({
          campo: 'UUID',
          valorXML: uuidXML,
          valorQR: uuidOCR,
          critico: true
        });
        comparacion.coinciden = false;
      }
    }

    // Comparar RFC Emisor
    if (datosOCR.rfcEmisor && datosXML.rfcEmisor) {
      const rfcXML = datosXML.rfcEmisor.toUpperCase();
      const rfcOCR = datosOCR.rfcEmisor.toUpperCase();
      comparacion.detalles.rfcEmisor = { xml: rfcXML, ocr: rfcOCR, coincide: rfcXML === rfcOCR };

      if (rfcXML !== rfcOCR) {
        // Verificar si el RFC del XML está en la lista de RFCs encontrados
        const rfcEncontrado = datosOCR.rfcsEncontrados?.some(r => r === rfcXML);
        if (!rfcEncontrado) {
          comparacion.diferencias.push({
            campo: 'RFC Emisor',
            valorXML: rfcXML,
            valorQR: rfcOCR,
            critico: false // No crítico si no coincide exactamente
          });
          comparacion.advertencias.push(`RFC Emisor diferente: XML=${rfcXML}, OCR=${rfcOCR}`);
        }
      }
    }

    // Comparar RFC Receptor
    if (datosOCR.rfcReceptor && datosXML.rfcReceptor) {
      const rfcXML = datosXML.rfcReceptor.toUpperCase();
      const rfcOCR = datosOCR.rfcReceptor.toUpperCase();
      comparacion.detalles.rfcReceptor = { xml: rfcXML, ocr: rfcOCR, coincide: rfcXML === rfcOCR };

      if (rfcXML !== rfcOCR) {
        const rfcEncontrado = datosOCR.rfcsEncontrados?.some(r => r === rfcXML);
        if (!rfcEncontrado) {
          comparacion.advertencias.push(`RFC Receptor diferente: XML=${rfcXML}, OCR=${rfcOCR}`);
        }
      }
    }

    // Comparar Total (con tolerancia amplia del 5%)
    if (datosOCR.total && datosXML.total) {
      const totalXML = parseFloat(datosXML.total);
      const totalOCR = parseFloat(datosOCR.total);
      const diferencia = Math.abs(totalXML - totalOCR);
      const tolerancia = totalXML * 0.05; // 5% de tolerancia

      comparacion.detalles.total = {
        xml: totalXML,
        ocr: totalOCR,
        diferencia: diferencia,
        coincide: diferencia <= tolerancia
      };

      if (diferencia > tolerancia) {
        comparacion.advertencias.push(`Total diferente: XML=$${totalXML.toFixed(2)}, OCR=$${totalOCR.toFixed(2)}`);
      }
    }

    resultado.comparacion = comparacion;
    resultado.pasos[1].estado = 'completado';

    // Determinar resultado final
    resultado.success = true;

    // Solo marcar como no válido si el UUID es diferente (crítico)
    const diferenciasUUID = comparacion.diferencias.filter(d => d.campo === 'UUID' && d.critico);
    resultado.esValida = diferenciasUUID.length === 0;
    resultado.bloqueante = false; // NUNCA bloquear - SAT es el validador principal

    if (resultado.esValida) {
      if (comparacion.advertencias.length > 0) {
        resultado.mensaje = `⚠️ Datos extraídos con diferencias menores: ${comparacion.advertencias.join(', ')}`;
      } else {
        resultado.mensaje = '✅ Datos OCR coinciden con XML';
      }
    } else {
      resultado.mensaje = `⚠️ UUID diferente entre PDF y XML - Verificar manualmente`;
      resultado.advertencia = true;
    }

    return resultado;

  } catch (error) {
    resultado.error = `Error en validación OCR vs XML: ${error.message}`;
    resultado.mensaje = '⚠️ Error durante la validación - No bloqueante';
    resultado.success = true; // Permitir continuar
    return resultado;
  }
}

/**
 * Extrae datos fiscales directamente del texto del PDF
 * @param {string} fullText - Texto completo extraído del PDF
 * @returns {object} Datos fiscales encontrados
 */
function extraerDatosFiscalesDeTexto(fullText) {
  console.log('🔍 Analizando texto para datos fiscales...');
  console.log('📄 Longitud del texto:', fullText.length, 'caracteres');

  // ====== EXTRAER DATOS FISCALES DEL TEXTO ======

  // 1. Buscar UUID (Folio Fiscal) - formato: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
  const uuidPatterns = [
    /(?:folio\s*fiscal|uuid|timbre)[:\s]*([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})/gi,
    /([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})/gi
  ];

  let uuid = null;
  for (const pattern of uuidPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const uuidExtract = match[0].match(/[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/i);
      if (uuidExtract) {
        uuid = uuidExtract[0].toUpperCase();
        console.log('✅ UUID encontrado:', uuid);
        break;
      }
    }
  }

  // 2. Buscar RFCs - formato: 3-4 letras + 6 dígitos + 3 caracteres
  const rfcPattern = /\b([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})\b/gi;
  const rfcsEncontrados = [];
  let rfcMatch;
  while ((rfcMatch = rfcPattern.exec(fullText)) !== null) {
    const rfc = rfcMatch[1].toUpperCase();
    if (!rfcsEncontrados.includes(rfc) &&
        rfc !== 'XAXX010101000' &&
        rfc.length >= 12 && rfc.length <= 13) {
      rfcsEncontrados.push(rfc);
    }
  }

  console.log('📋 RFCs encontrados:', rfcsEncontrados);

  // Determinar emisor y receptor basado en contexto
  let rfcEmisor = null;
  let rfcReceptor = null;

  // Buscar con contexto "emisor" o "receptor"
  const emisorMatch = fullText.match(/(?:emisor|quien\s*factura)[:\s\n]*(?:rfc)?[:\s]*([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/i);
  const receptorMatch = fullText.match(/(?:receptor|cliente)[:\s\n]*(?:rfc)?[:\s]*([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/i);

  if (emisorMatch) rfcEmisor = emisorMatch[1].toUpperCase();
  if (receptorMatch) rfcReceptor = receptorMatch[1].toUpperCase();

  // Si no se encontraron con contexto, usar los primeros dos encontrados
  if (!rfcEmisor && rfcsEncontrados.length >= 1) {
    rfcEmisor = rfcsEncontrados[0];
  }
  if (!rfcReceptor && rfcsEncontrados.length >= 2) {
    rfcReceptor = rfcsEncontrados[1];
  }

  // 3. Buscar Total de la factura
  const totalPatterns = [
    /(?:total)[:\s]*\$?\s*([\d,]+\.?\d*)/gi,
    /(?:importe\s*total)[:\s]*\$?\s*([\d,]+\.?\d*)/gi,
    /(?:monto\s*total)[:\s]*\$?\s*([\d,]+\.?\d*)/gi,
    /\$\s*([\d,]+\.\d{2})\b/g
  ];

  let total = null;
  let maxTotal = 0;

  for (const pattern of totalPatterns) {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      const valorStr = match[1].replace(/,/g, '');
      const valor = parseFloat(valorStr);
      if (!isNaN(valor) && valor > maxTotal && valor < 10000000) {
        maxTotal = valor;
        total = valor;
      }
    }
  }

  console.log('💰 Total encontrado:', total);

  return {
    uuid,
    rfcEmisor,
    rfcReceptor,
    total,
    rfcsEncontrados
  };
}

/**
 * Extrae datos fiscales de un PDF para validar solo con PDF (sin XML)
 *
 * ESTRATEGIA:
 * 1. Primero intenta extraer texto directo con pdf-parse (rápido, sin API)
 * 2. Si no hay suficiente texto, usa OCR con Google Vision (fallback)
 *
 * @param {Buffer} pdfBuffer - Buffer del PDF
 * @param {object} visionClient - Cliente de Google Vision
 * @returns {Promise<object>} Datos extraídos para validación SAT
 */
async function extraerDatosFiscalesPDF(pdfBuffer, visionClient) {
  console.log('🔍 Extrayendo datos fiscales con OCR...');

  try {
    // ========================================
    // PASO 1: Intentar extracción directa de texto
    // ========================================
    console.log('📄 [Paso 1] Extrayendo texto directo del PDF...');

    let fullText = '';
    let metodo = 'texto_directo';

    // Usar la función extraerTextoPDF que maneja pdf-parse correctamente
    fullText = await extraerTextoPDF(pdfBuffer);
    console.log('📄 Texto extraído directamente:', fullText.length, 'caracteres');

    // Si hay suficiente texto (más de 200 caracteres), usar extracción directa
    if (fullText.length > 200) {
      console.log('✅ Usando extracción de texto directo (sin OCR)');

      const datos = extraerDatosFiscalesDeTexto(fullText);

      // Verificar que tenemos los datos mínimos
      if (datos.uuid && datos.rfcEmisor && datos.rfcReceptor && datos.total) {
        return {
          success: true,
          metodo: 'texto_directo',
          datosParaSAT: {
            uuid: datos.uuid,
            rfcEmisor: datos.rfcEmisor,
            rfcReceptor: datos.rfcReceptor,
            total: datos.total
          },
          datosExtraidos: datos,
          mensaje: '✅ Datos extraídos del texto del PDF - Listo para validar con SAT'
        };
      }

      // Si faltaron datos, continuar con OCR
      console.log('⚠️ Faltan datos en texto directo, intentando OCR...');
    }

    // ========================================
    // PASO 2: Fallback a OCR con Google Vision
    // ========================================
    console.log('📸 [Paso 2] Usando OCR con Google Vision...');

    if (!visionClient) {
      // Si no hay Vision y no se encontraron todos los datos
      const datos = extraerDatosFiscalesDeTexto(fullText);
      return {
        success: false,
        error: 'Google Vision no configurado y el PDF no tiene suficiente texto legible',
        datosFaltantes: {
          uuid: !datos.uuid,
          rfcEmisor: !datos.rfcEmisor,
          rfcReceptor: !datos.rfcReceptor,
          total: !datos.total
        },
        datosExtraidos: datos
      };
    }

    // Usar OCR de Google Vision
    const ocrResult = await extraerQRDeImagen(pdfBuffer, visionClient);

    if (!ocrResult.success || !ocrResult.datosExtraidos) {
      // Combinar datos de texto directo + OCR si los hay
      const datosParciales = extraerDatosFiscalesDeTexto(fullText);
      return {
        success: false,
        error: ocrResult.error || 'No se pudieron extraer datos del PDF',
        datosExtraidos: datosParciales,
        datosFaltantes: {
          uuid: !datosParciales.uuid,
          rfcEmisor: !datosParciales.rfcEmisor,
          rfcReceptor: !datosParciales.rfcReceptor,
          total: !datosParciales.total
        }
      };
    }

    const datos = ocrResult.datosExtraidos;

    // Verificar que tenemos los datos mínimos para validar con SAT
    if (!datos.uuid || !datos.rfcEmisor || !datos.rfcReceptor || !datos.total) {
      return {
        success: false,
        error: 'Faltan datos para validar con SAT',
        datosFaltantes: {
          uuid: !datos.uuid,
          rfcEmisor: !datos.rfcEmisor,
          rfcReceptor: !datos.rfcReceptor,
          total: !datos.total
        },
        datosExtraidos: datos
      };
    }

    return {
      success: true,
      metodo: 'ocr_google_vision',
      datosParaSAT: {
        uuid: datos.uuid,
        rfcEmisor: datos.rfcEmisor,
        rfcReceptor: datos.rfcReceptor,
        total: datos.total
      },
      datosExtraidos: datos,
      mensaje: '✅ Datos extraídos con OCR - Listo para validar con SAT'
    };

  } catch (error) {
    console.error('❌ Error extrayendo datos fiscales:', error);
    return {
      success: false,
      error: `Error al procesar PDF: ${error.message}`,
      datosParaSAT: null
    };
  }
}

export {
  parsearURLQRSAT,
  compararQRvsXML,
  extraerQRDeImagen,
  validarFacturaQRvsXML,
  extraerDatosFiscalesPDF
};
