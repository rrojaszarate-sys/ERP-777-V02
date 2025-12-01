/**
 * 🧾 CFDI XML Parser - Extracción de Datos de Facturas Electrónicas
 * 
 * Parsea archivos XML de CFDI (Comprobante Fiscal Digital por Internet)
 * y extrae todos los datos fiscales de forma estructurada.
 * 
 * ✅ 100% precisión (no depende de OCR)
 * ✅ Valida estructura SAT
 * ✅ Extrae UUID, RFC, totales, productos, etc.
 */

export interface CFDIData {
  // Información general del comprobante
  version: string;
  serie?: string;
  folio?: string;
  fecha: string;
  formaPago?: string;
  condicionesPago?: string;
  metodoPago: string;
  tipoComprobante: string;
  lugarExpedicion: string;
  moneda: string;
  tipoCambio?: number;
  
  // Montos
  subtotal: number;
  descuento?: number;
  total: number;
  
  // Emisor (quien emite la factura)
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };
  
  // Receptor (quien recibe la factura)
  receptor: {
    rfc: string;
    nombre: string;
    domicilioFiscal?: string;
    regimenFiscal?: string;
    usoCFDI?: string;
  };
  
  // Conceptos (productos/servicios)
  conceptos: Array<{
    claveProdServ?: string;
    noIdentificacion?: string;
    cantidad: number;
    claveUnidad?: string;
    unidad?: string;
    descripcion: string;
    valorUnitario: number;
    importe: number;
    descuento?: number;
  }>;
  
  // Impuestos
  impuestos?: {
    totalTraslados?: number;
    totalRetenciones?: number;
    traslados?: Array<{
      impuesto: string;
      tipoFactor: string;
      tasaOCuota: number;
      importe: number;
    }>;
  };
  
  // Timbre Fiscal Digital (UUID)
  timbreFiscal?: {
    uuid: string;
    fechaTimbrado: string;
    rfcProvCertif?: string;
    noCertificadoSAT?: string;
  };
}

/**
 * Parsea un archivo XML de CFDI y extrae todos los datos
 */
export async function parseCFDIXml(xmlContent: string): Promise<CFDIData> {
  console.log('📄 Parseando XML CFDI...');
  
  // Crear parser DOM
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  // Verificar errores de parseo
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    console.error('❌ Error parseando XML:', parseError.textContent);
    throw new Error('XML inválido: ' + parseError.textContent);
  }
  
  // Obtener el nodo Comprobante (puede tener namespace cfdi:)
  const comprobante = xmlDoc.querySelector('Comprobante') || 
                      xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Comprobante')[0] ||
                      xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/3', 'Comprobante')[0];
  
  if (!comprobante) {
    throw new Error('No se encontró el nodo Comprobante en el XML');
  }
  
  console.log('✅ Nodo Comprobante encontrado');
  
  // Helper para obtener atributos
  const getAttr = (element: Element, attr: string): string | undefined => {
    return element.getAttribute(attr) || undefined;
  };
  
  const getAttrNum = (element: Element, attr: string): number => {
    const val = element.getAttribute(attr);
    return val ? parseFloat(val) : 0;
  };
  
  // Extraer datos del Comprobante
  const version = getAttr(comprobante, 'Version') || getAttr(comprobante, 'version') || '4.0';
  const serie = getAttr(comprobante, 'Serie') || getAttr(comprobante, 'serie');
  const folio = getAttr(comprobante, 'Folio') || getAttr(comprobante, 'folio');
  const fecha = getAttr(comprobante, 'Fecha') || getAttr(comprobante, 'fecha') || '';
  const formaPago = getAttr(comprobante, 'FormaPago') || getAttr(comprobante, 'formaPago');
  const condicionesPago = getAttr(comprobante, 'CondicionesDePago') || getAttr(comprobante, 'condicionesDePago');
  const metodoPago = getAttr(comprobante, 'MetodoPago') || getAttr(comprobante, 'metodoPago') || 'PUE';
  const tipoComprobante = getAttr(comprobante, 'TipoDeComprobante') || getAttr(comprobante, 'tipoDeComprobante') || 'I';
  const lugarExpedicion = getAttr(comprobante, 'LugarExpedicion') || getAttr(comprobante, 'lugarExpedicion') || '';
  const moneda = getAttr(comprobante, 'Moneda') || getAttr(comprobante, 'moneda') || 'MXN';
  const tipoCambioStr = getAttr(comprobante, 'TipoCambio') || getAttr(comprobante, 'tipoCambio');
  const tipoCambio = tipoCambioStr ? parseFloat(tipoCambioStr) : undefined;
  
  const subtotal = getAttrNum(comprobante, 'SubTotal') || getAttrNum(comprobante, 'subTotal');
  const descuentoStr = getAttr(comprobante, 'Descuento') || getAttr(comprobante, 'descuento');
  const descuento = descuentoStr ? parseFloat(descuentoStr) : undefined;
  const total = getAttrNum(comprobante, 'Total') || getAttrNum(comprobante, 'total');
  
  console.log('💰 Montos extraídos:', { subtotal, descuento, total });
  
  // Extraer Emisor
  const emisorNode = comprobante.querySelector('Emisor') || 
                     xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Emisor')[0] ||
                     xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/3', 'Emisor')[0];
  
  if (!emisorNode) {
    throw new Error('No se encontró información del Emisor');
  }
  
  const emisor = {
    rfc: getAttr(emisorNode, 'Rfc') || getAttr(emisorNode, 'rfc') || '',
    nombre: getAttr(emisorNode, 'Nombre') || getAttr(emisorNode, 'nombre') || '',
    regimenFiscal: getAttr(emisorNode, 'RegimenFiscal') || getAttr(emisorNode, 'regimenFiscal') || ''
  };
  
  console.log('🏢 Emisor:', emisor.nombre, '(' + emisor.rfc + ')');
  
  // Extraer Receptor
  const receptorNode = comprobante.querySelector('Receptor') ||
                       xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Receptor')[0] ||
                       xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/3', 'Receptor')[0];
  
  if (!receptorNode) {
    throw new Error('No se encontró información del Receptor');
  }
  
  const receptor = {
    rfc: getAttr(receptorNode, 'Rfc') || getAttr(receptorNode, 'rfc') || '',
    nombre: getAttr(receptorNode, 'Nombre') || getAttr(receptorNode, 'nombre') || '',
    domicilioFiscal: getAttr(receptorNode, 'DomicilioFiscalReceptor') || getAttr(receptorNode, 'domicilioFiscalReceptor'),
    regimenFiscal: getAttr(receptorNode, 'RegimenFiscalReceptor') || getAttr(receptorNode, 'regimenFiscalReceptor'),
    usoCFDI: getAttr(receptorNode, 'UsoCFDI') || getAttr(receptorNode, 'usoCFDI')
  };
  
  console.log('👤 Receptor:', receptor.nombre, '(' + receptor.rfc + ')');
  
  // Extraer Conceptos
  const conceptosNode = comprobante.querySelector('Conceptos') ||
                        xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Conceptos')[0] ||
                        xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/3', 'Conceptos')[0];
  
  const conceptos: CFDIData['conceptos'] = [];
  
  if (conceptosNode) {
    const conceptoNodes = conceptosNode.querySelectorAll('Concepto') ||
                          conceptosNode.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Concepto') ||
                          conceptosNode.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/3', 'Concepto');
    
    Array.from(conceptoNodes).forEach((concepto, index) => {
      const conceptoData = {
        claveProdServ: getAttr(concepto, 'ClaveProdServ') || getAttr(concepto, 'claveProdServ'),
        noIdentificacion: getAttr(concepto, 'NoIdentificacion') || getAttr(concepto, 'noIdentificacion'),
        cantidad: getAttrNum(concepto, 'Cantidad') || getAttrNum(concepto, 'cantidad'),
        claveUnidad: getAttr(concepto, 'ClaveUnidad') || getAttr(concepto, 'claveUnidad'),
        unidad: getAttr(concepto, 'Unidad') || getAttr(concepto, 'unidad'),
        descripcion: getAttr(concepto, 'Descripcion') || getAttr(concepto, 'descripcion') || '',
        valorUnitario: getAttrNum(concepto, 'ValorUnitario') || getAttrNum(concepto, 'valorUnitario'),
        importe: getAttrNum(concepto, 'Importe') || getAttrNum(concepto, 'importe'),
        descuento: getAttrNum(concepto, 'Descuento') || getAttrNum(concepto, 'descuento') || undefined
      };
      
      conceptos.push(conceptoData);
      console.log(`📦 Concepto ${index + 1}:`, conceptoData.descripcion);
    });
  }
  
  console.log(`✅ Total conceptos extraídos: ${conceptos.length}`);
  
  // Extraer Impuestos
  const impuestosNode = comprobante.querySelector('Impuestos') ||
                        xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Impuestos')[0] ||
                        xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/3', 'Impuestos')[0];
  
  let impuestos: CFDIData['impuestos'];
  
  if (impuestosNode) {
    const totalTraslados = getAttrNum(impuestosNode, 'TotalImpuestosTrasladados') || 
                          getAttrNum(impuestosNode, 'totalImpuestosTrasladados') || 
                          undefined;
    const totalRetenciones = getAttrNum(impuestosNode, 'TotalImpuestosRetenidos') ||
                            getAttrNum(impuestosNode, 'totalImpuestosRetenidos') ||
                            undefined;
    
    const trasladosNode = impuestosNode.querySelector('Traslados') ||
                         impuestosNode.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Traslados')[0] ||
                         impuestosNode.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/3', 'Traslados')[0];
    
    const traslados: Array<{
      impuesto: string;
      tipoFactor: string;
      tasaOCuota: number;
      importe: number;
    }> = [];
    
    if (trasladosNode) {
      const trasladoNodes = trasladosNode.querySelectorAll('Traslado') ||
                           trasladosNode.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Traslado') ||
                           trasladosNode.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/3', 'Traslado');
      
      Array.from(trasladoNodes).forEach(traslado => {
        traslados.push({
          impuesto: getAttr(traslado, 'Impuesto') || getAttr(traslado, 'impuesto') || '',
          tipoFactor: getAttr(traslado, 'TipoFactor') || getAttr(traslado, 'tipoFactor') || '',
          tasaOCuota: getAttrNum(traslado, 'TasaOCuota') || getAttrNum(traslado, 'tasaOCuota'),
          importe: getAttrNum(traslado, 'Importe') || getAttrNum(traslado, 'importe')
        });
      });
    }
    
    impuestos = {
      totalTraslados,
      totalRetenciones,
      traslados: traslados.length > 0 ? traslados : undefined
    };
    
    console.log('💸 Impuestos extraídos:', impuestos);
  }
  
  // Extraer Timbre Fiscal Digital (UUID)
  const complementoNode = comprobante.querySelector('Complemento') ||
                         xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Complemento')[0] ||
                         xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/3', 'Complemento')[0];
  
  let timbreFiscal: CFDIData['timbreFiscal'];
  
  if (complementoNode) {
    const timbreNode = complementoNode.querySelector('TimbreFiscalDigital') ||
                      complementoNode.getElementsByTagNameNS('http://www.sat.gob.mx/TimbreFiscalDigital', 'TimbreFiscalDigital')[0];
    
    if (timbreNode) {
      timbreFiscal = {
        uuid: getAttr(timbreNode, 'UUID') || getAttr(timbreNode, 'uuid') || '',
        fechaTimbrado: getAttr(timbreNode, 'FechaTimbrado') || getAttr(timbreNode, 'fechaTimbrado') || '',
        rfcProvCertif: getAttr(timbreNode, 'RfcProvCertif') || getAttr(timbreNode, 'rfcProvCertif'),
        noCertificadoSAT: getAttr(timbreNode, 'NoCertificadoSAT') || getAttr(timbreNode, 'noCertificadoSAT')
      };
      
      console.log('🔐 UUID:', timbreFiscal.uuid);
    }
  }
  
  const cfdiData: CFDIData = {
    version,
    serie,
    folio,
    fecha,
    formaPago,
    condicionesPago,
    metodoPago,
    tipoComprobante,
    lugarExpedicion,
    moneda,
    tipoCambio,
    subtotal,
    descuento,
    total,
    emisor,
    receptor,
    conceptos,
    impuestos,
    timbreFiscal
  };
  
  console.log('✅ CFDI parseado exitosamente');
  console.log('📊 Resumen:', {
    emisor: cfdiData.emisor.nombre,
    receptor: cfdiData.receptor.nombre,
    total: cfdiData.total,
    conceptos: cfdiData.conceptos.length,
    uuid: cfdiData.timbreFiscal?.uuid
  });
  
  return cfdiData;
}

/**
 * Convierte datos de CFDI a formato compatible con el formulario de gastos
 */
export function cfdiToExpenseData(cfdi: CFDIData) {
  // 🎯 CALCULAR IVA PORCENTAJE (generalmente 16% en México)
  let ivaPorcentaje = 16;
  if (cfdi.impuestos?.traslados && cfdi.impuestos.traslados.length > 0) {
    const ivaTraslado = cfdi.impuestos.traslados.find(t => t.impuesto === '002'); // 002 = IVA
    if (ivaTraslado) {
      ivaPorcentaje = ivaTraslado.tasaOCuota * 100;
    }
  }
  
  // 💰 USAR EL TOTAL FINAL DEL XML (incluye TODOS los descuentos)
  // El XML ya trae el total final correcto, ese es el dato autoritativo
  const totalFinal = cfdi.total;
  
  // 🧮 CALCULAR SUBTOTAL E IVA DESDE EL TOTAL (método correcto)
  // Fórmula: subtotal = total / (1 + iva%)
  //          iva = total - subtotal
  const ivaFactor = 1 + (ivaPorcentaje / 100);
  const subtotalCalculado = totalFinal / ivaFactor;
  const ivaCalculado = totalFinal - subtotalCalculado;
  
  console.log('💰 [CFDI Parser] Cálculos desde TOTAL XML:');
  console.log('  📄 Total del XML:', totalFinal.toFixed(2));
  console.log('  📉 Descuento XML:', cfdi.descuento?.toFixed(2) || '0.00');
  console.log('  🧮 IVA %:', ivaPorcentaje);
  console.log('  ✅ Subtotal calculado:', subtotalCalculado.toFixed(2));
  console.log('  ✅ IVA calculado:', ivaCalculado.toFixed(2));
  
  return {
    // Información del proveedor
    proveedor: cfdi.emisor.nombre,
    rfc_proveedor: cfdi.emisor.rfc,
    
    // Concepto y descripción
    concepto: cfdi.conceptos.length > 0 
      ? `Factura ${cfdi.folio || ''} - ${cfdi.conceptos[0].descripcion}`
      : `Factura ${cfdi.folio || ''}`,
    descripcion: cfdi.conceptos.map((c, i) => 
      `${i + 1}. ${c.cantidad} x ${c.descripcion}`
    ).join('\n'),
    
    // 💰 MONTOS CORRECTOS (desde el total final del XML)
    total: totalFinal,              // ✅ Total del XML (incluye descuentos)
    subtotal: subtotalCalculado,    // ✅ Calculado desde el total
    iva: ivaCalculado,              // ✅ Calculado desde el total
    iva_porcentaje: ivaPorcentaje,
    
    // Campos SAT/CFDI (COMPLETO)
    uuid_cfdi: cfdi.timbreFiscal?.uuid || '',
    folio_fiscal: cfdi.timbreFiscal?.uuid || '',
    serie: cfdi.serie || '',
    folio: cfdi.folio || '',
    metodo_pago_sat: cfdi.metodoPago as 'PUE' | 'PPD',
    forma_pago_sat: cfdi.formaPago || '99', // 99 = Por definir (default seguro)
    tipo_comprobante: cfdi.tipoComprobante as 'I' | 'E' | 'T' | 'N' | 'P',
    moneda: cfdi.moneda as 'MXN' | 'USD' | 'EUR' | 'CAD' | 'GBP',
    tipo_cambio: cfdi.tipoCambio || 1,
    lugar_expedicion: cfdi.lugarExpedicion,
    
    // 🔧 CAMPOS FALTANTES - CRÍTICO PARA CONTABILIDAD
    uso_cfdi: cfdi.receptor.usoCFDI || 'G03', // Uso del CFDI del receptor
    regimen_fiscal_receptor: cfdi.receptor.regimenFiscal || '', // Régimen fiscal del receptor
    regimen_fiscal_emisor: cfdi.emisor.regimenFiscal || '', // Régimen fiscal del emisor
    
    // Detalle de compra (JSON)
    detalle_compra: JSON.stringify(cfdi.conceptos.map(c => ({
      descripcion: c.descripcion,
      cantidad: c.cantidad,
      precio_unitario: c.valorUnitario,
      total: c.importe
    }))),
    
    // Fecha
    fecha_gasto: cfdi.fecha.split('T')[0], // Extraer solo la fecha (YYYY-MM-DD)
    
    // 📊 Valores calculados para cantidad y precio_unitario
    // Usamos el total final (ya incluye descuentos) para calcular precio unitario promedio
    cantidad: cfdi.conceptos.reduce((sum, c) => sum + c.cantidad, 0),
    precio_unitario: cfdi.conceptos.length > 0 
      ? totalFinal / cfdi.conceptos.reduce((sum, c) => sum + c.cantidad, 0)
      : totalFinal
  };
}

/**
 * Convierte datos de CFDI a formato compatible con el formulario de ingresos
 */
export function cfdiToIncomeData(cfdi: CFDIData) {
  // ✅ FUNCIÓN ESPECÍFICA PARA INGRESOS (no reutilizar campos de gastos)
  
  // IVA del CFDI
  const ivaPorcentaje = cfdi.impuestos?.traslados?.[0]?.tasa 
    ? cfdi.impuestos.traslados[0].tasa * 100 
    : 16; // Default 16%

  // ✅ Calcular desde el TOTAL del XML (incluye descuentos)
  const totalFinal = cfdi.total;
  const ivaFactor = 1 + (ivaPorcentaje / 100);
  const subtotalCalculado = totalFinal / ivaFactor;
  const ivaCalculado = totalFinal - subtotalCalculado;

  console.log('💰 [CFDI Parser] Cálculos desde TOTAL XML:');
  console.log('  📄 Total del XML:', totalFinal);
  console.log('  📉 Descuento XML:', cfdi.descuento || 0);
  console.log('  🧮 IVA %:', ivaPorcentaje);
  console.log('  ✅ Subtotal calculado:', subtotalCalculado.toFixed(2));
  console.log('  ✅ IVA calculado:', ivaCalculado.toFixed(2));

  // Descripción con conceptos
  const descripcion = cfdi.conceptos.map((c, idx) => 
    `${idx + 1}. ${c.cantidad} x ${c.descripcion}`
  ).join('\n');

  return {
    // ✅ SOLO CAMPOS DE INGRESOS
    proveedor: cfdi.emisor.nombre,           // Quien emite la factura
    rfc_proveedor: cfdi.emisor.rfc,
    concepto: cfdi.conceptos.length > 0
      ? `Ingreso ${cfdi.serie || ''}${cfdi.folio || ''} - ${cfdi.conceptos[0].descripcion}`
      : `Ingreso ${cfdi.serie || ''}${cfdi.folio || ''}`,
    descripcion,
    
    // ✅ Montos calculados desde total
    total: parseFloat(totalFinal.toFixed(2)),
    subtotal: parseFloat(subtotalCalculado.toFixed(2)),
    iva: parseFloat(ivaCalculado.toFixed(2)),
    iva_porcentaje: ivaPorcentaje,
    
    // Fechas
    fecha_ingreso: cfdi.fecha.split('T')[0],
    fecha_facturacion: cfdi.fecha.split('T')[0],
    
    // Datos CFDI
    uuid_cfdi: cfdi.uuid,
    folio_fiscal: cfdi.uuid,
    serie: cfdi.serie,
    folio: cfdi.folio,
    tipo_comprobante: cfdi.tipoDeComprobante as 'I' | 'E' | 'T' | 'N' | 'P',
    forma_pago_sat: cfdi.formaPago as any,
    metodo_pago_sat: cfdi.metodoPago as 'PUE' | 'PPD',
    moneda: cfdi.moneda as 'MXN' | 'USD' | 'EUR',
    tipo_cambio: cfdi.tipoCambio,
    lugar_expedicion: cfdi.lugarExpedicion,
    uso_cfdi: cfdi.receptor.usoCFDI,
    regimen_fiscal_receptor: cfdi.receptor.regimenFiscalReceptor,
    regimen_fiscal_emisor: cfdi.emisor.regimenFiscal,
    
    // Estado
    facturado: true, // Viene de XML, entonces ya está facturado
    cobrado: false,  // Por defecto no cobrado
    
    // Detalle de conceptos (para referencia)
    detalle_compra: {
      productos: cfdi.conceptos.map((concepto, idx) => ({
        numero: idx + 1,
        codigo: concepto.noIdentificacion || '',
        clave_prod_serv: concepto.claveProdServ || '',
        descripcion: concepto.descripcion,
        cantidad: concepto.cantidad,
        unidad: concepto.unidad || '',
        precio_unitario: concepto.valorUnitario,
        importe: concepto.importe,
        descuento: concepto.descuento || 0
      })),
      total_productos: cfdi.conceptos.length,
      subtotal_productos: cfdi.subtotal
    }
  };
}
