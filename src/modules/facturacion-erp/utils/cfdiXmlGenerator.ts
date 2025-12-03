/**
 * Generador de XML CFDI 4.0 - FASE 5.1
 * Genera el XML del comprobante fiscal según especificación del SAT
 */
import type { Factura, ConceptoFactura } from '../types';
import type { CFDI, EmisorCFDI, ReceptorCFDI, ConceptoCFDI } from '../types/cfdi';

// Namespace del CFDI 4.0
const CFDI_NAMESPACE = 'http://www.sat.gob.mx/cfd/4';
const XSI_NAMESPACE = 'http://www.w3.org/2001/XMLSchema-instance';
const SCHEMA_LOCATION = 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd';

/**
 * Escapa caracteres especiales XML
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formatea un número para XML (máximo 6 decimales)
 */
function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

/**
 * Formatea fecha ISO para CFDI
 */
function formatFechaCFDI(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().replace('Z', '');
}

/**
 * Genera atributo XML si el valor existe
 */
function attr(name: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const strValue = typeof value === 'number' ? formatNumber(value) : value;
  return ` ${name}="${escapeXml(strValue.toString())}"`;
}

/**
 * Calcula impuestos por concepto
 */
interface ImpuestoCalculado {
  traslados: {
    impuesto: string;
    tipoFactor: string;
    tasaOCuota: number;
    base: number;
    importe: number;
  }[];
  retenciones: {
    impuesto: string;
    tipoFactor: string;
    tasaOCuota: number;
    base: number;
    importe: number;
  }[];
}

function calcularImpuestosConcepto(
  concepto: ConceptoFactura,
  tasaIVA: number = 0.16,
  tasaISR: number = 0,
  tasaIVARetenido: number = 0
): ImpuestoCalculado {
  const base = concepto.importe - (concepto.descuento || 0);
  const traslados = [];
  const retenciones = [];

  // Si es objeto de impuesto (02)
  if (concepto.objeto_imp === '02') {
    // IVA Trasladado
    if (tasaIVA > 0) {
      traslados.push({
        impuesto: '002',
        tipoFactor: 'Tasa',
        tasaOCuota: tasaIVA,
        base,
        importe: base * tasaIVA
      });
    }

    // ISR Retenido
    if (tasaISR > 0) {
      retenciones.push({
        impuesto: '001',
        tipoFactor: 'Tasa',
        tasaOCuota: tasaISR,
        base,
        importe: base * tasaISR
      });
    }

    // IVA Retenido
    if (tasaIVARetenido > 0) {
      retenciones.push({
        impuesto: '002',
        tipoFactor: 'Tasa',
        tasaOCuota: tasaIVARetenido,
        base,
        importe: base * tasaIVARetenido
      });
    }
  }

  return { traslados, retenciones };
}

export interface GenerarXMLOptions {
  emisor: EmisorCFDI;
  receptor: {
    rfc: string;
    nombre: string;
    domicilio_fiscal: string;
    regimen_fiscal: string;
    uso_cfdi: string;
  };
  factura: Factura;
  conceptos: ConceptoFactura[];
  certificado?: {
    numero: string;
    certificado: string; // Base64 del certificado
  };
  tasaIVA?: number;
  tasaISR?: number;
  tasaIVARetenido?: number;
}

/**
 * Genera el XML del CFDI 4.0
 */
export function generarXMLCFDI(options: GenerarXMLOptions): string {
  const {
    emisor,
    receptor,
    factura,
    conceptos,
    certificado,
    tasaIVA = 0.16,
    tasaISR = 0,
    tasaIVARetenido = 0
  } = options;

  // Calcular totales de impuestos
  let totalImpuestosTrasladados = 0;
  let totalImpuestosRetenidos = 0;
  const impuestosPorConcepto: ImpuestoCalculado[] = [];

  conceptos.forEach(concepto => {
    const impuestos = calcularImpuestosConcepto(concepto, tasaIVA, tasaISR, tasaIVARetenido);
    impuestosPorConcepto.push(impuestos);

    impuestos.traslados.forEach(t => {
      totalImpuestosTrasladados += t.importe;
    });
    impuestos.retenciones.forEach(r => {
      totalImpuestosRetenidos += r.importe;
    });
  });

  const subtotal = conceptos.reduce((sum, c) => sum + c.importe, 0);
  const descuento = conceptos.reduce((sum, c) => sum + (c.descuento || 0), 0);
  const total = subtotal - descuento + totalImpuestosTrasladados - totalImpuestosRetenidos;

  // Iniciar XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<cfdi:Comprobante';
  xml += ` xmlns:cfdi="${CFDI_NAMESPACE}"`;
  xml += ` xmlns:xsi="${XSI_NAMESPACE}"`;
  xml += ` xsi:schemaLocation="${SCHEMA_LOCATION}"`;
  xml += attr('Version', '4.0');
  xml += attr('Serie', factura.serie);
  xml += attr('Folio', factura.folio);
  xml += attr('Fecha', formatFechaCFDI(factura.fecha_emision));
  xml += attr('FormaPago', factura.forma_pago);
  xml += attr('NoCertificado', certificado?.numero);
  xml += attr('Certificado', certificado?.certificado);
  xml += attr('CondicionesDePago', factura.condiciones_pago);
  xml += attr('SubTotal', formatNumber(subtotal));
  if (descuento > 0) {
    xml += attr('Descuento', formatNumber(descuento));
  }
  xml += attr('Moneda', factura.moneda);
  if (factura.moneda !== 'MXN' && factura.tipo_cambio) {
    xml += attr('TipoCambio', formatNumber(factura.tipo_cambio, 4));
  }
  xml += attr('Total', formatNumber(total));
  xml += attr('TipoDeComprobante', factura.tipo_comprobante);
  xml += attr('Exportacion', '01'); // No aplica exportación
  xml += attr('MetodoPago', factura.metodo_pago);
  xml += attr('LugarExpedicion', factura.lugar_expedicion);
  xml += '>\n';

  // Emisor
  xml += '  <cfdi:Emisor';
  xml += attr('Rfc', emisor.rfc);
  xml += attr('Nombre', emisor.nombre);
  xml += attr('RegimenFiscal', emisor.regimen_fiscal);
  xml += ' />\n';

  // Receptor
  xml += '  <cfdi:Receptor';
  xml += attr('Rfc', receptor.rfc);
  xml += attr('Nombre', receptor.nombre);
  xml += attr('DomicilioFiscalReceptor', receptor.domicilio_fiscal);
  xml += attr('RegimenFiscalReceptor', receptor.regimen_fiscal);
  xml += attr('UsoCFDI', receptor.uso_cfdi);
  xml += ' />\n';

  // Conceptos
  xml += '  <cfdi:Conceptos>\n';

  conceptos.forEach((concepto, index) => {
    const impuestos = impuestosPorConcepto[index];

    xml += '    <cfdi:Concepto';
    xml += attr('ClaveProdServ', concepto.clave_prod_serv);
    xml += attr('NoIdentificacion', concepto.id?.toString());
    xml += attr('Cantidad', formatNumber(concepto.cantidad, 6));
    xml += attr('ClaveUnidad', concepto.clave_unidad);
    xml += attr('Unidad', concepto.unidad);
    xml += attr('Descripcion', concepto.descripcion);
    xml += attr('ValorUnitario', formatNumber(concepto.valor_unitario));
    xml += attr('Importe', formatNumber(concepto.importe));
    if (concepto.descuento > 0) {
      xml += attr('Descuento', formatNumber(concepto.descuento));
    }
    xml += attr('ObjetoImp', concepto.objeto_imp);

    // Impuestos del concepto
    if (impuestos.traslados.length > 0 || impuestos.retenciones.length > 0) {
      xml += '>\n';
      xml += '      <cfdi:Impuestos>\n';

      if (impuestos.traslados.length > 0) {
        xml += '        <cfdi:Traslados>\n';
        impuestos.traslados.forEach(t => {
          xml += '          <cfdi:Traslado';
          xml += attr('Base', formatNumber(t.base));
          xml += attr('Impuesto', t.impuesto);
          xml += attr('TipoFactor', t.tipoFactor);
          xml += attr('TasaOCuota', formatNumber(t.tasaOCuota, 6));
          xml += attr('Importe', formatNumber(t.importe));
          xml += ' />\n';
        });
        xml += '        </cfdi:Traslados>\n';
      }

      if (impuestos.retenciones.length > 0) {
        xml += '        <cfdi:Retenciones>\n';
        impuestos.retenciones.forEach(r => {
          xml += '          <cfdi:Retencion';
          xml += attr('Base', formatNumber(r.base));
          xml += attr('Impuesto', r.impuesto);
          xml += attr('TipoFactor', r.tipoFactor);
          xml += attr('TasaOCuota', formatNumber(r.tasaOCuota, 6));
          xml += attr('Importe', formatNumber(r.importe));
          xml += ' />\n';
        });
        xml += '        </cfdi:Retenciones>\n';
      }

      xml += '      </cfdi:Impuestos>\n';
      xml += '    </cfdi:Concepto>\n';
    } else {
      xml += ' />\n';
    }
  });

  xml += '  </cfdi:Conceptos>\n';

  // Impuestos totales
  if (totalImpuestosTrasladados > 0 || totalImpuestosRetenidos > 0) {
    xml += '  <cfdi:Impuestos';
    if (totalImpuestosTrasladados > 0) {
      xml += attr('TotalImpuestosTrasladados', formatNumber(totalImpuestosTrasladados));
    }
    if (totalImpuestosRetenidos > 0) {
      xml += attr('TotalImpuestosRetenidos', formatNumber(totalImpuestosRetenidos));
    }
    xml += '>\n';

    // Retenciones totales
    if (totalImpuestosRetenidos > 0) {
      xml += '    <cfdi:Retenciones>\n';

      // Agrupar por tipo de impuesto
      const retencionesAgrupadas: Record<string, number> = {};
      impuestosPorConcepto.forEach(imp => {
        imp.retenciones.forEach(r => {
          const key = r.impuesto;
          retencionesAgrupadas[key] = (retencionesAgrupadas[key] || 0) + r.importe;
        });
      });

      Object.entries(retencionesAgrupadas).forEach(([impuesto, importe]) => {
        xml += '      <cfdi:Retencion';
        xml += attr('Impuesto', impuesto);
        xml += attr('Importe', formatNumber(importe));
        xml += ' />\n';
      });

      xml += '    </cfdi:Retenciones>\n';
    }

    // Traslados totales
    if (totalImpuestosTrasladados > 0) {
      xml += '    <cfdi:Traslados>\n';

      // Agrupar por tipo de impuesto y tasa
      const trasladosAgrupados: Record<string, { base: number; importe: number; tasa: number }> = {};
      impuestosPorConcepto.forEach(imp => {
        imp.traslados.forEach(t => {
          const key = `${t.impuesto}-${t.tasaOCuota}`;
          if (!trasladosAgrupados[key]) {
            trasladosAgrupados[key] = { base: 0, importe: 0, tasa: t.tasaOCuota };
          }
          trasladosAgrupados[key].base += t.base;
          trasladosAgrupados[key].importe += t.importe;
        });
      });

      Object.entries(trasladosAgrupados).forEach(([key, data]) => {
        const impuesto = key.split('-')[0];
        xml += '      <cfdi:Traslado';
        xml += attr('Base', formatNumber(data.base));
        xml += attr('Impuesto', impuesto);
        xml += attr('TipoFactor', 'Tasa');
        xml += attr('TasaOCuota', formatNumber(data.tasa, 6));
        xml += attr('Importe', formatNumber(data.importe));
        xml += ' />\n';
      });

      xml += '    </cfdi:Traslados>\n';
    }

    xml += '  </cfdi:Impuestos>\n';
  }

  xml += '</cfdi:Comprobante>';

  return xml;
}

/**
 * Genera la cadena original del CFDI
 */
export function generarCadenaOriginal(xml: string): string {
  // Nota: En producción, esto debería usar la transformación XSLT del SAT
  // Esta es una implementación simplificada para desarrollo
  const valores: string[] = [];

  // Extraer atributos del XML (simplificado)
  const attrRegex = /(\w+)="([^"]+)"/g;
  let match;

  while ((match = attrRegex.exec(xml)) !== null) {
    const [, , value] = match;
    if (value && value.trim()) {
      valores.push(value.trim());
    }
  }

  return `||${valores.join('|')}||`;
}

/**
 * Valida la estructura del CFDI
 */
export interface ValidacionCFDI {
  valido: boolean;
  errores: string[];
  advertencias: string[];
}

export function validarCFDI(options: GenerarXMLOptions): ValidacionCFDI {
  const errores: string[] = [];
  const advertencias: string[] = [];

  const { emisor, receptor, factura, conceptos } = options;

  // Validaciones de Emisor
  if (!emisor.rfc || emisor.rfc.length < 12 || emisor.rfc.length > 13) {
    errores.push('RFC del emisor inválido');
  }
  if (!emisor.nombre) {
    errores.push('Nombre del emisor requerido');
  }
  if (!emisor.regimen_fiscal) {
    errores.push('Régimen fiscal del emisor requerido');
  }

  // Validaciones de Receptor
  if (!receptor.rfc || receptor.rfc.length < 12 || receptor.rfc.length > 13) {
    errores.push('RFC del receptor inválido');
  }
  if (!receptor.nombre) {
    errores.push('Nombre del receptor requerido');
  }
  if (!receptor.domicilio_fiscal || receptor.domicilio_fiscal.length !== 5) {
    errores.push('Código postal del receptor debe ser de 5 dígitos');
  }
  if (!receptor.regimen_fiscal) {
    errores.push('Régimen fiscal del receptor requerido');
  }
  if (!receptor.uso_cfdi) {
    errores.push('Uso de CFDI requerido');
  }

  // Validaciones de Factura
  if (!factura.serie) {
    advertencias.push('Serie no especificada');
  }
  if (!factura.folio) {
    errores.push('Folio requerido');
  }
  if (!factura.forma_pago) {
    errores.push('Forma de pago requerida');
  }
  if (!factura.metodo_pago) {
    errores.push('Método de pago requerido');
  }
  if (!factura.lugar_expedicion || factura.lugar_expedicion.length !== 5) {
    errores.push('Lugar de expedición (código postal) debe ser de 5 dígitos');
  }

  // Validaciones de Conceptos
  if (conceptos.length === 0) {
    errores.push('Debe haber al menos un concepto');
  }

  conceptos.forEach((concepto, index) => {
    const prefix = `Concepto ${index + 1}:`;

    if (!concepto.clave_prod_serv || concepto.clave_prod_serv.length !== 8) {
      errores.push(`${prefix} Clave de producto/servicio SAT inválida`);
    }
    if (!concepto.clave_unidad) {
      errores.push(`${prefix} Clave de unidad SAT requerida`);
    }
    if (concepto.cantidad <= 0) {
      errores.push(`${prefix} Cantidad debe ser mayor a 0`);
    }
    if (!concepto.descripcion) {
      errores.push(`${prefix} Descripción requerida`);
    }
    if (concepto.valor_unitario < 0) {
      errores.push(`${prefix} Valor unitario no puede ser negativo`);
    }
    if (!concepto.objeto_imp) {
      errores.push(`${prefix} Objeto de impuesto requerido`);
    }
  });

  // Validaciones de montos
  const subtotal = conceptos.reduce((sum, c) => sum + c.importe, 0);
  if (subtotal <= 0) {
    errores.push('El subtotal debe ser mayor a 0');
  }

  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

export default {
  generarXMLCFDI,
  generarCadenaOriginal,
  validarCFDI
};
