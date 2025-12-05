/**
 * ============================================================================
 * SERVICIO: Extractor de Datos Fiscales de PDF - V5 (SIMPLIFICADO)
 * ============================================================================
 *
 * Usa pdf-parse (que internamente usa pdfjs-dist) para extraer texto.
 * Patrones regex optimizados para facturas CFDI mexicanas.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Extrae texto de un PDF usando pdf-parse v1.1.1
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF
 * @returns {Promise<string>} Texto extraído de todas las páginas
 */
async function extraerTextoConPdfParse(pdfBuffer) {
  try {
    console.log('📄 [pdf-parse] Extrayendo texto del PDF...');

    // Parsear el PDF usando pdf-parse v1.1.1
    const data = await pdfParse(pdfBuffer);

    console.log(`✅ [pdf-parse] Texto extraído: ${data.text?.length || 0} caracteres`);
    console.log(`📄 [pdf-parse] Páginas: ${data.numpages}`);

    return data.text || '';

  } catch (error) {
    console.error('❌ [pdf-parse] Error:', error.message);
    return '';
  }
}

/**
 * Busca datos fiscales en el texto extraído del PDF
 * Patrones optimizados para facturas CFDI mexicanas
 *
 * @param {string} texto - Texto extraído del PDF
 * @returns {object} Datos fiscales encontrados
 */
function buscarDatosFiscales(texto) {
  console.log('🔍 Buscando datos fiscales en texto...');

  // Normalizar texto para búsqueda
  const textoNormalizado = texto
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .toUpperCase();

  const resultado = {
    uuid: null,
    rfcEmisor: null,
    rfcReceptor: null,
    total: null,
    rfcsEncontrados: []
  };

  // Lista de RFCs de PACs conocidos (certificadores) a excluir
  const pacRFCs = new Set([
    'SNF171020F3A', // Software NFe
    'FLI081010EK2', // Facturación Electrónica
    'TSO211020B22', // Tralix
    'SAT970701NN3', // SAT (pruebas)
    'MAS0810247C0', // Masivo Fiscal
    'SFE0807172W7', // Solución Factible
    'LSO1306189R5', // Otro PAC común
  ]);

  // RFCs genéricos - SIEMPRE son receptor, NUNCA emisor
  const rfcsGenericos = new Set([
    'XAXX010101000', // Público en general
    'XEXX010101000', // Extranjeros
  ]);

  // ============================================
  // 1. BUSCAR UUID (Folio Fiscal Digital)
  // ============================================
  const patronesUUID = [
    /FOLIO\s*FISCAL[:\s]*([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/gi,
    /UUID[:\s]*([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/gi,
    /ID=([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/gi,
    /([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/gi
  ];

  for (const patron of patronesUUID) {
    const match = textoNormalizado.match(patron);
    if (match && match[0]) {
      const uuidMatch = match[0].match(/[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/i);
      if (uuidMatch) {
        resultado.uuid = uuidMatch[0].toUpperCase();
        console.log('✅ UUID encontrado:', resultado.uuid);
        break;
      }
    }
  }

  // ============================================
  // 2. EXTRAER DE URL DEL QR SAT (MÁS CONFIABLE)
  // ============================================
  // El QR del SAT tiene formato: ?id=UUID&re=RFC_EMISOR&rr=RFC_RECEPTOR&tt=TOTAL&fe=SELLO
  // Buscar la URL completa del QR primero
  const urlQRMatch = textoNormalizado.match(/\?ID=([A-F0-9-]{36})&RE=([A-ZÑ&0-9]{12,13})&RR=([A-ZÑ&0-9]{12,13})&TT=([0-9.]+)/i);

  if (urlQRMatch) {
    console.log('🎯 URL del QR SAT encontrada!');
    if (!resultado.uuid) {
      resultado.uuid = urlQRMatch[1].toUpperCase();
      console.log('✅ UUID (QR):', resultado.uuid);
    }
    resultado.rfcEmisor = urlQRMatch[2].toUpperCase();
    console.log('✅ RFC Emisor (QR):', resultado.rfcEmisor);
    resultado.rfcReceptor = urlQRMatch[3].toUpperCase();
    console.log('✅ RFC Receptor (QR):', resultado.rfcReceptor);
    resultado.total = parseFloat(urlQRMatch[4]);
    console.log('✅ Total (QR):', resultado.total);
  } else {
    // Fallback: buscar parámetros individuales
    const reMatch = textoNormalizado.match(/RE=([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
    const rrMatch = textoNormalizado.match(/RR=([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
    const ttMatch = textoNormalizado.match(/TT=(\d+\.?\d*)/i);
    const idMatch = textoNormalizado.match(/ID=([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/i);

    if (idMatch && !resultado.uuid) {
      resultado.uuid = idMatch[1].toUpperCase();
      console.log('✅ UUID (ID=):', resultado.uuid);
    }
    if (reMatch) {
      resultado.rfcEmisor = reMatch[1].toUpperCase();
      console.log('✅ RFC Emisor (RE=):', resultado.rfcEmisor);
    }
    if (rrMatch) {
      resultado.rfcReceptor = rrMatch[1].toUpperCase();
      console.log('✅ RFC Receptor (RR=):', resultado.rfcReceptor);
    }
    if (ttMatch && !resultado.total) {
      resultado.total = parseFloat(ttMatch[1]);
      console.log('✅ Total (TT=):', resultado.total);
    }
  }

  // ============================================
  // 2.1 EXTRAER DE CADENA ORIGINAL DEL SAT
  // ============================================
  // Formato: ||VERSION|UUID|FECHA|RFC_PAC|SELLO...||
  // Pero también buscar patrones más largos que incluyen datos fiscales
  if (!resultado.uuid || !resultado.rfcEmisor || !resultado.rfcReceptor) {
    // Buscar cadena original: ||1.1|UUID|FECHA|...
    const cadenaMatch = textoNormalizado.match(/\|\|1\.1\|([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})\|/i);
    if (cadenaMatch && !resultado.uuid) {
      resultado.uuid = cadenaMatch[1].toUpperCase();
      console.log('✅ UUID (cadena original):', resultado.uuid);
    }
  }

  // ============================================
  // 3. BUSCAR TODOS LOS RFCs DEL DOCUMENTO
  // ============================================
  const patronRFC = /\b([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})\b/g;
  const rfcsUnicos = new Set();
  let rfcMatch;
  while ((rfcMatch = patronRFC.exec(textoNormalizado)) !== null) {
    const rfc = rfcMatch[0].toUpperCase();
    if (rfc.length >= 12 && rfc.length <= 13) {
      rfcsUnicos.add(rfc);
    }
  }

  // Filtrar PACs
  resultado.rfcsEncontrados = Array.from(rfcsUnicos).filter(rfc => !pacRFCs.has(rfc));
  console.log('📋 RFCs encontrados (sin PACs):', resultado.rfcsEncontrados);

  // ============================================
  // 4. ASIGNAR EMISOR Y RECEPTOR CON LÓGICA INTELIGENTE
  // ============================================
  // Regla clave: RFCs genéricos SIEMPRE son receptor

  if (!resultado.rfcEmisor || !resultado.rfcReceptor) {
    // Separar RFCs genéricos de no-genéricos
    const rfcsNoGenericos = resultado.rfcsEncontrados.filter(rfc => !rfcsGenericos.has(rfc));
    const rfcsGenericosEncontrados = resultado.rfcsEncontrados.filter(rfc => rfcsGenericos.has(rfc));

    console.log('📋 RFCs no-genéricos:', rfcsNoGenericos);
    console.log('📋 RFCs genéricos:', rfcsGenericosEncontrados);

    // Si hay RFC genérico, ESE es el receptor
    if (rfcsGenericosEncontrados.length > 0 && !resultado.rfcReceptor) {
      resultado.rfcReceptor = rfcsGenericosEncontrados[0];
      console.log('✅ RFC Receptor (genérico):', resultado.rfcReceptor);
    }

    // El emisor es el primer RFC no-genérico
    if (rfcsNoGenericos.length >= 1 && !resultado.rfcEmisor) {
      resultado.rfcEmisor = rfcsNoGenericos[0];
      console.log('✅ RFC Emisor (no-genérico):', resultado.rfcEmisor);
    }

    // Si hay más RFCs no-genéricos y aún no hay receptor, usar el segundo
    if (rfcsNoGenericos.length >= 2 && !resultado.rfcReceptor) {
      resultado.rfcReceptor = rfcsNoGenericos[1];
      console.log('✅ RFC Receptor (segundo no-genérico):', resultado.rfcReceptor);
    }
  }

  // ============================================
  // 5. BUSCAR TOTAL - MEJORADO
  // ============================================
  if (!resultado.total) {
    const totalesEncontrados = [];

    // Patrón 1: "Total Comprobante" (común en facturas Huawei y otras)
    const patronTotalComprobante = /TOTAL\s*COMPROBANTE[:\s]*\$?\s*([\d,]+\.?\d*)/gi;
    let match;
    while ((match = patronTotalComprobante.exec(textoNormalizado)) !== null) {
      const valorStr = match[1].replace(/,/g, '');
      const valor = parseFloat(valorStr);
      if (!isNaN(valor) && valor > 0 && valor < 10000000) {
        totalesEncontrados.push({ valor, fuente: 'Total Comprobante' });
      }
    }

    // Patrón 2: "TOTAL" pero NO "SUBTOTAL" ni "IVA"
    // Buscar "TOTAL" que no sea precedido por "SUB" o seguido por "IVA"
    const patronTotalSimple = /(?<!SUB)TOTAL(?!\s*IVA)[:\s$MXN]*\s*\$?\s*([\d,]+\.?\d*)/gi;
    while ((match = patronTotalSimple.exec(textoNormalizado)) !== null) {
      const valorStr = match[1].replace(/,/g, '');
      const valor = parseFloat(valorStr);
      if (!isNaN(valor) && valor > 0 && valor < 10000000) {
        // Evitar duplicados
        if (!totalesEncontrados.some(t => Math.abs(t.valor - valor) < 0.01)) {
          totalesEncontrados.push({ valor, fuente: 'Total simple' });
        }
      }
    }

    console.log('📋 Totales encontrados:', totalesEncontrados);

    // Prioridad: "Total Comprobante" > mayor valor
    const totalComprobante = totalesEncontrados.find(t => t.fuente === 'Total Comprobante');
    if (totalComprobante) {
      resultado.total = totalComprobante.valor;
      console.log('✅ Total (Total Comprobante):', resultado.total);
    } else if (totalesEncontrados.length > 0) {
      resultado.total = Math.max(...totalesEncontrados.map(t => t.valor));
      console.log('✅ Total (máximo encontrado):', resultado.total);
    }
  }

  // Fallback: buscar en URL SAT (TT=)
  if (!resultado.total && ttMatch) {
    resultado.total = parseFloat(ttMatch[1]);
    console.log('✅ Total (TT= SAT):', resultado.total);
  }

  // Último fallback: el monto más grande en el documento
  if (!resultado.total) {
    const patronMonto = /\$\s*([\d,]+\.\d{2})/g;
    let maxMonto = 0;
    let match;
    while ((match = patronMonto.exec(textoNormalizado)) !== null) {
      const valor = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(valor) && valor > maxMonto && valor < 10000000) {
        maxMonto = valor;
      }
    }
    if (maxMonto > 0) {
      resultado.total = maxMonto;
      console.log('⚠️ Total (inferido máximo $):', resultado.total);
    }
  }

  // ============================================
  // 6. VALIDACIÓN FINAL
  // ============================================
  // Si el emisor terminó siendo genérico, intercambiar con receptor
  if (resultado.rfcEmisor && rfcsGenericos.has(resultado.rfcEmisor)) {
    console.log('⚠️ Intercambiando: el emisor era genérico');
    const temp = resultado.rfcEmisor;
    resultado.rfcEmisor = resultado.rfcReceptor;
    resultado.rfcReceptor = temp;
    console.log('✅ RFC Emisor (corregido):', resultado.rfcEmisor);
    console.log('✅ RFC Receptor (corregido):', resultado.rfcReceptor);
  }

  return resultado;
}

/**
 * Extrae datos fiscales de un PDF para validación con SAT
 *
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF
 * @param {object} visionClient - Cliente de Google Vision (no se usa actualmente)
 * @returns {Promise<object>} Datos extraídos para validar con SAT
 */
async function extraerDatosFiscalesPDF(pdfBuffer, visionClient) {
  console.log('═══════════════════════════════════════');
  console.log('🔍 INICIANDO EXTRACCIÓN DE DATOS FISCALES');
  console.log('═══════════════════════════════════════');

  try {
    // ========================================
    // PASO 1: Extraer texto con pdf-parse
    // ========================================
    console.log('\n📄 [Paso 1] Extrayendo texto con pdf-parse...');
    const textoExtraido = await extraerTextoConPdfParse(pdfBuffer);

    if (!textoExtraido || textoExtraido.length < 50) {
      console.log('⚠️ Texto insuficiente extraído del PDF');
      return {
        success: false,
        error: 'No se pudo extraer texto del PDF. El archivo puede estar escaneado o protegido.',
        datosFaltantes: { uuid: true, rfcEmisor: true, rfcReceptor: true, total: true }
      };
    }

    // ========================================
    // PASO 2: Buscar datos fiscales en el texto
    // ========================================
    console.log('\n🔍 [Paso 2] Buscando datos fiscales...');
    const datos = buscarDatosFiscales(textoExtraido);

    // Verificar si tenemos todos los datos necesarios
    const datosCompletos = datos.uuid && datos.rfcEmisor && datos.rfcReceptor && datos.total;

    if (datosCompletos) {
      console.log('\n✅ EXTRACCIÓN EXITOSA');
      console.log('═══════════════════════════════════════');
      return {
        success: true,
        metodo: 'pdf-parse',
        datosParaSAT: {
          uuid: datos.uuid,
          rfcEmisor: datos.rfcEmisor,
          rfcReceptor: datos.rfcReceptor,
          total: datos.total
        },
        datosExtraidos: datos,
        mensaje: '✅ Datos fiscales extraídos del PDF'
      };
    }

    // ========================================
    // RESULTADO: Datos incompletos
    // ========================================
    console.log('\n⚠️ EXTRACCIÓN INCOMPLETA');
    console.log('═══════════════════════════════════════');

    // Mostrar qué se encontró y qué falta
    console.log('Datos encontrados:', {
      uuid: datos.uuid ? '✅' : '❌',
      rfcEmisor: datos.rfcEmisor ? '✅' : '❌',
      rfcReceptor: datos.rfcReceptor ? '✅' : '❌',
      total: datos.total ? '✅' : '❌'
    });

    return {
      success: false,
      error: 'No se pudieron extraer todos los datos fiscales del PDF',
      datosFaltantes: {
        uuid: !datos.uuid,
        rfcEmisor: !datos.rfcEmisor,
        rfcReceptor: !datos.rfcReceptor,
        total: !datos.total
      },
      datosExtraidos: datos
    };

  } catch (error) {
    console.error('❌ Error en extracción:', error);
    return {
      success: false,
      error: `Error procesando PDF: ${error.message}`,
      datosParaSAT: null
    };
  }
}

export {
  extraerTextoConPdfParse,
  buscarDatosFiscales,
  extraerDatosFiscalesPDF
};
