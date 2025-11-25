/**
 * MÓDULO OCR INTELIGENTE - CLASIFICADOR DE GASTOS
 *
 * Este módulo actúa como el "cerebro" del sistema OCR para GASTOS:
 * 1. Detectar automáticamente diferentes tipos de documentos de GASTO
 * 2. Extraer información relevante estructurada (monto, proveedor, fecha, etc.)
 * 3. Clasificar el tipo/categoría de gasto (compras, transporte, alimentación, etc.)
 * 4. Validar y detectar errores o datos faltantes
 * 5. Devolver JSON estructurado listo para usar
 */

import type { TicketData, FacturaData } from '../types/OCRTypes';

/**
 * TIPOS DE DOCUMENTO DE GASTO DETECTADOS
 */
export enum DocumentType {
  TICKET_COMPRA = 'ticket_compra',           // Ticket de compra en establecimiento
  FACTURA_RECIBIDA = 'factura_recibida',     // Factura que nos cobraron
  RECIBO_SIMPLE = 'recibo_simple',           // Recibo simple/manual
  COMPROBANTE_PAGO = 'comprobante_pago',     // Comprobante de pago
  NO_RECONOCIDO = 'no_reconocido'            // No se pudo clasificar
}

/**
 * CATEGORÍAS DE GASTO
 */
export enum ExpenseCategory {
  COMPRAS = 'compras',                       // Supermercado, tiendas
  TRANSPORTE = 'transporte',                 // Gasolina, taxis, transporte
  ALIMENTACION = 'alimentacion',             // Restaurantes, comida
  HOSPEDAJE = 'hospedaje',                   // Hoteles, alojamiento
  MATERIAL = 'material',                     // Papelería, material de oficina
  EQUIPAMIENTO = 'equipamiento',             // Equipo, mobiliario
  SERVICIOS = 'servicios',                   // Servicios profesionales
  CONSTRUCCION = 'construccion',             // Materiales de construcción
  OTROS = 'otros'                            // Otros gastos
}

/**
 * RESULTADO DE LA CLASIFICACIÓN INTELIGENTE DE GASTOS
 */
export interface ExpenseClassificationResult {
  // Clasificación del documento
  tipoDocumento: DocumentType;
  categoriaGasto: ExpenseCategory;
  confianzaClasificacion: number; // 0-100%

  // Datos extraídos y estructurados
  datosExtraidos: {
    // Campos principales
    monto: number | null;
    fecha: string | null;
    concepto: string | null;

    // Proveedor/Establecimiento
    proveedor: {
      nombre: string | null;
      rfc: string | null;
      direccion: string | null;
    };

    // Detalles de pago
    metodoPago: string | null;
    formaPago: string | null;

    // Desglose fiscal
    subtotal: number | null;
    iva: number | null;
    ieps: number | null;

    // Identificadores fiscales
    uuid?: string | null;
    serie?: string | null;
    folio?: string | null;

    // Productos/servicios comprados
    items?: Array<{
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      importe: number;
    }>;
  };

  // Validación y calidad de datos
  validacion: {
    datosCompletos: boolean;
    camposFaltantes: string[];
    erroresDetectados: string[];
    advertencias: string[];
  };

  // Explicación de la clasificación
  razonamiento: {
    factoresPositivos: string[];
    factoresNegativos: string[];
    explicacion: string;
  };

  // Datos RAW originales del OCR
  datosOriginalesOCR: {
    textoCompleto: string;
    ticketData?: TicketData;
    facturaData?: FacturaData;
  };
}

/**
 * SERVICIO DE CLASIFICACIÓN INTELIGENTE DE GASTOS
 */
export class IntelligentExpenseClassifier {

  /**
   * MÉTODO PRINCIPAL: Clasifica y estructura un documento de GASTO
   */
  static classify(
    textoCompleto: string,
    ticketData?: TicketData,
    facturaData?: FacturaData
  ): ExpenseClassificationResult {

    // Paso 1: Detectar tipo de documento
    const tipoDocumento = this.detectDocumentType(textoCompleto, ticketData, facturaData);

    // Paso 2: Clasificar categoría de gasto
    const { categoriaGasto, confianza, razonamiento } = this.classifyExpense(
      textoCompleto,
      tipoDocumento,
      ticketData,
      facturaData
    );

    // Paso 3: Extraer y estructurar datos
    const datosExtraidos = this.extractStructuredData(
      textoCompleto,
      categoriaGasto,
      ticketData,
      facturaData
    );

    // Paso 4: Validar datos y detectar problemas
    const validacion = this.validateData(datosExtraidos);

    return {
      tipoDocumento,
      categoriaGasto,
      confianzaClasificacion: confianza,
      datosExtraidos,
      validacion,
      razonamiento,
      datosOriginalesOCR: {
        textoCompleto,
        ticketData,
        facturaData
      }
    };
  }

  /**
   * DETECTA EL TIPO DE DOCUMENTO DE GASTO
   */
  private static detectDocumentType(
    texto: string,
    ticketData?: TicketData,
    facturaData?: FacturaData
  ): DocumentType {
    const textoLower = texto.toLowerCase();

    // 1. Factura recibida (nos cobraron)
    if (this.isFacturaRecibida(textoLower, facturaData)) {
      return DocumentType.FACTURA_RECIBIDA;
    }

    // 2. Ticket de compra
    if (this.isTicketCompra(textoLower, ticketData)) {
      return DocumentType.TICKET_COMPRA;
    }

    // 3. Recibo simple
    if (this.isReciboSimple(textoLower)) {
      return DocumentType.RECIBO_SIMPLE;
    }

    // 4. Comprobante de pago
    if (this.isComprobantePago(textoLower)) {
      return DocumentType.COMPROBANTE_PAGO;
    }

    return DocumentType.NO_RECONOCIDO;
  }

  /**
   * INFERENCIA: ¿Es factura que nos COBRARON?
   */
  private static isFacturaRecibida(texto: string, facturaData?: FacturaData): boolean {
    if (!facturaData && !texto.includes('factura')) {
      return false;
    }

    // Indicadores de factura recibida
    const indicadores = [
      'factura',
      'cfdi',
      'uuid',
      'rfc',
      'factura electrónica',
      'factura electronica',
      'timbre fiscal'
    ];

    return indicadores.some(ind => texto.includes(ind));
  }

  /**
   * INFERENCIA: ¿Es ticket de compra?
   */
  private static isTicketCompra(texto: string, ticketData?: TicketData): boolean {
    if (ticketData) {
      // Si ya se extrajo como ticket, muy probablemente es compra
      return true;
    }

    const indicadores = [
      'ticket',
      'vale',
      'nota de venta',
      'comprobante de compra',
      'gracias por su compra',
      'total a pagar'
    ];

    // Debe tener al menos 2 indicadores
    const coincidencias = indicadores.filter(ind => texto.includes(ind)).length;

    return coincidencias >= 2;
  }

  /**
   * INFERENCIA: ¿Es recibo simple/manual?
   */
  private static isReciboSimple(texto: string): boolean {
    const indicadores = [
      'recibo',
      'recibí',
      'recibi',
      'por concepto de',
      'la cantidad de',
      'suma de'
    ];

    const tieneIndicadores = indicadores.filter(ind => texto.includes(ind)).length;

    // Debe tener indicador pero NO ser factura fiscal
    return tieneIndicadores >= 1 && !texto.includes('uuid') && !texto.includes('cfdi');
  }

  /**
   * INFERENCIA: ¿Es comprobante de pago?
   */
  private static isComprobantePago(texto: string): boolean {
    const indicadores = [
      'comprobante de pago',
      'pago realizado',
      'transferencia',
      'referencia',
      'operación'
    ];

    return indicadores.some(ind => texto.includes(ind));
  }

  /**
   * CLASIFICA LA CATEGORÍA DEL GASTO CON RAZONAMIENTO
   */
  private static classifyExpense(
    texto: string,
    tipoDocumento: DocumentType,
    ticketData?: TicketData,
    facturaData?: FacturaData
  ): {
    categoriaGasto: ExpenseCategory;
    confianza: number;
    razonamiento: {
      factoresPositivos: string[];
      factoresNegativos: string[];
      explicacion: string;
    };
  } {
    const factoresPositivos: string[] = [];
    const factoresNegativos: string[] = [];
    let confianza = 50; // Base

    // Detectar categoría por proveedor/establecimiento
    const proveedor = (ticketData?.establecimiento || facturaData?.nombre_emisor || '').toLowerCase();
    const categoriaGasto = this.detectExpenseCategory(proveedor, texto, factoresPositivos);

    // Ajustar confianza según tipo de documento
    if (tipoDocumento === DocumentType.FACTURA_RECIBIDA) {
      confianza = 90;
      factoresPositivos.push('Factura fiscal CFDI detectada');
    } else if (tipoDocumento === DocumentType.TICKET_COMPRA) {
      confianza = 85;
      factoresPositivos.push('Ticket de compra identificado');
    } else if (tipoDocumento === DocumentType.NO_RECONOCIDO) {
      confianza = 60;
      factoresNegativos.push('Tipo de documento no identificado claramente');
    } else {
      confianza = 75;
    }

    // Análisis adicional para ajustar confianza
    confianza = this.adjustConfidence(
      texto,
      confianza,
      factoresPositivos,
      factoresNegativos,
      ticketData,
      facturaData
    );

    // Generar explicación
    const explicacion = this.generateExplanation(tipoDocumento, categoriaGasto, factoresPositivos);

    return {
      categoriaGasto,
      confianza: Math.min(98, Math.max(20, confianza)),
      razonamiento: {
        factoresPositivos,
        factoresNegativos,
        explicacion
      }
    };
  }

  /**
   * DETECTA LA CATEGORÍA DE GASTO BASADA EN EL PROVEEDOR Y CONTENIDO
   */
  private static detectExpenseCategory(
    proveedor: string,
    texto: string,
    factoresPositivos: string[]
  ): ExpenseCategory {
    const textoCompleto = (proveedor + ' ' + texto.toLowerCase()).toLowerCase();

    // Compras (supermercado, tiendas)
    if (textoCompleto.match(/oxxo|7-eleven|walmart|soriana|chedraui|bodega|super|market|tienda|farmacia|benavides|guadalajara|ahorro/)) {
      factoresPositivos.push('Establecimiento de compras detectado');
      return ExpenseCategory.COMPRAS;
    }

    // Material de oficina
    if (textoCompleto.match(/office depot|office max|papelería|papeleria|staples|lumen|material|escolar/)) {
      factoresPositivos.push('Papelería/material de oficina');
      return ExpenseCategory.MATERIAL;
    }

    // Transporte (gasolina, combustible)
    if (textoCompleto.match(/gasolinera|pemex|shell|mobil|bp|gasolina|diesel|combustible/)) {
      factoresPositivos.push('Gasolinera/combustible detectado');
      return ExpenseCategory.TRANSPORTE;
    }

    // Alimentación (restaurantes)
    if (textoCompleto.match(/restaurant|comida|taco|pizza|café|cafe|food|cocina|comedor|alimentos|vips|sanborns|burger|mcdonalds|subway/)) {
      factoresPositivos.push('Restaurante/comida detectado');
      return ExpenseCategory.ALIMENTACION;
    }

    // Hospedaje
    if (textoCompleto.match(/hotel|hospedaje|motel|hostal|posada|inn|holiday|marriott|hilton|city express/)) {
      factoresPositivos.push('Hotel/hospedaje detectado');
      return ExpenseCategory.HOSPEDAJE;
    }

    // Construcción
    if (textoCompleto.match(/home depot|tlapalería|ferretería|construcción|construcc|materiales|cemex|interceramic|comex|impermeabiliz/)) {
      factoresPositivos.push('Materiales de construcción');
      return ExpenseCategory.CONSTRUCCION;
    }

    // Equipamiento
    if (textoCompleto.match(/liverpool|palacio|coppel|elektra|tienda departamental|muebl|equipo|mobiliario|sears|suburbia/)) {
      factoresPositivos.push('Equipamiento/mobiliario');
      return ExpenseCategory.EQUIPAMIENTO;
    }

    // Servicios
    if (textoCompleto.match(/servicio|honorarios|consultor|asesor|profesional|mantenimiento|reparaci|instalaci/)) {
      factoresPositivos.push('Servicio profesional');
      return ExpenseCategory.SERVICIOS;
    }

    // Por defecto: OTROS
    factoresPositivos.push('Categoría general (no específica)');
    return ExpenseCategory.OTROS;
  }

  /**
   * AJUSTA LA CONFIANZA CON FACTORES ADICIONALES
   */
  private static adjustConfidence(
    texto: string,
    confianzaBase: number,
    factoresPositivos: string[],
    factoresNegativos: string[],
    ticketData?: TicketData,
    facturaData?: FacturaData
  ): number {
    let ajuste = 0;

    // Factor: Tiene UUID de factura (+15)
    if (facturaData?.uuid) {
      ajuste += 15;
      factoresPositivos.push('UUID fiscal presente (alta confiabilidad)');
    }

    // Factor: Tiene RFC (+10)
    if (ticketData?.rfc || facturaData?.rfc_emisor) {
      ajuste += 10;
      factoresPositivos.push('RFC detectado (documento fiscal válido)');
    }

    // Factor: Monto presente (+8)
    const tieneMonto = ticketData?.total || facturaData?.total;
    if (tieneMonto && tieneMonto > 0) {
      ajuste += 8;
      factoresPositivos.push(`Monto válido: $${tieneMonto.toFixed(2)}`);
    } else {
      ajuste -= 15;
      factoresNegativos.push('⚠️ No se detectó monto total');
    }

    // Factor: Fecha presente (+5)
    const tieneFecha = ticketData?.fecha || facturaData?.fecha_emision;
    if (tieneFecha) {
      ajuste += 5;
      factoresPositivos.push('Fecha presente');
    } else {
      ajuste -= 10;
      factoresNegativos.push('⚠️ Falta fecha del documento');
    }

    // Factor: Desglose fiscal (subtotal + IVA) (+12)
    const tieneDesglose = (ticketData?.subtotal && ticketData?.iva) ||
                          (facturaData?.subtotal && facturaData?.iva);
    if (tieneDesglose) {
      ajuste += 12;
      factoresPositivos.push('Desglose fiscal completo (subtotal + IVA)');
    }

    // Factor: Productos detectados (+variable)
    if (ticketData?.productos && ticketData.productos.length > 0) {
      const boost = Math.min(10, ticketData.productos.length * 2);
      ajuste += boost;
      factoresPositivos.push(`${ticketData.productos.length} productos/servicios detectados`);
    }

    // Penalización: Texto muy corto
    if (texto.length < 100) {
      ajuste -= 15;
      factoresNegativos.push('⚠️ Documento con poco texto (posible error de OCR)');
    }

    return confianzaBase + ajuste;
  }

  /**
   * GENERA EXPLICACIÓN HUMANA DE LA CLASIFICACIÓN
   */
  private static generateExplanation(
    tipoDocumento: DocumentType,
    categoria: ExpenseCategory,
    factores: string[]
  ): string {
    const tipoDesc = {
      [DocumentType.TICKET_COMPRA]: 'ticket de compra en establecimiento',
      [DocumentType.FACTURA_RECIBIDA]: 'factura recibida de proveedor',
      [DocumentType.RECIBO_SIMPLE]: 'recibo simple de pago',
      [DocumentType.COMPROBANTE_PAGO]: 'comprobante de pago',
      [DocumentType.NO_RECONOCIDO]: 'documento de gasto sin tipo específico'
    }[tipoDocumento];

    const principal = factores[0] || 'análisis de patrones del texto';

    return `Este documento fue clasificado como un **GASTO** de tipo **${categoria}** porque se identificó como un ${tipoDesc}. ${principal}. ${
      factores.length > 1 ? 'También: ' + factores.slice(1, 3).join(', ') + '.' : ''
    }`;
  }

  /**
   * EXTRAE DATOS ESTRUCTURADOS DEL GASTO
   */
  private static extractStructuredData(
    texto: string,
    categoria: ExpenseCategory,
    ticketData?: TicketData,
    facturaData?: FacturaData
  ): ExpenseClassificationResult['datosExtraidos'] {

    // Datos comunes
    const monto = ticketData?.total || facturaData?.total || null;
    const fecha = this.normalizeFecha(ticketData?.fecha || facturaData?.fecha_emision);
    const subtotal = ticketData?.subtotal || facturaData?.subtotal || null;
    const iva = ticketData?.iva || facturaData?.iva || null;

    // Concepto/descripción
    const concepto = this.generateConcept(categoria, ticketData, facturaData);

    // Método de pago
    const metodoPago = ticketData?.forma_pago || facturaData?.metodo_pago || null;
    const formaPago = this.normalizeFormaPago(metodoPago);

    return {
      monto,
      fecha,
      concepto,
      proveedor: {
        nombre: ticketData?.establecimiento || facturaData?.nombre_emisor || null,
        rfc: ticketData?.rfc || facturaData?.rfc_emisor || null,
        direccion: ticketData?.direccion || null
      },
      metodoPago: formaPago,
      formaPago,
      subtotal,
      iva,
      ieps: facturaData?.ieps || null,
      uuid: facturaData?.uuid || null,
      serie: facturaData?.serie || null,
      folio: facturaData?.folio || ticketData?.numero_transaccion || null,
      items: this.normalizeItems(ticketData?.productos || facturaData?.conceptos)
    };
  }

  /**
   * VALIDA QUE LOS DATOS SEAN SUFICIENTES Y DETECTA ERRORES
   */
  private static validateData(
    datos: ExpenseClassificationResult['datosExtraidos']
  ): ExpenseClassificationResult['validacion'] {
    const camposFaltantes: string[] = [];
    const erroresDetectados: string[] = [];
    const advertencias: string[] = [];

    // Validar campos críticos
    if (!datos.monto || datos.monto <= 0) {
      camposFaltantes.push('monto');
      erroresDetectados.push('❌ No se detectó el monto total o es inválido');
    }

    if (!datos.fecha) {
      camposFaltantes.push('fecha');
      erroresDetectados.push('❌ No se detectó la fecha del documento');
    }

    if (!datos.concepto || datos.concepto.length < 5) {
      camposFaltantes.push('concepto');
      advertencias.push('⚠️ Concepto muy corto o ausente');
    }

    if (!datos.proveedor?.nombre) {
      camposFaltantes.push('proveedor/establecimiento');
      advertencias.push('⚠️ No se identificó el proveedor o establecimiento');
    }

    // Validar coherencia fiscal
    if (datos.subtotal && datos.iva && datos.monto) {
      const calculado = datos.subtotal + datos.iva + (datos.ieps || 0);
      const diferencia = Math.abs(calculado - datos.monto);

      if (diferencia > 0.5) {
        erroresDetectados.push(`⚠️ Inconsistencia fiscal: Subtotal + IVA ≠ Total (diferencia: $${diferencia.toFixed(2)})`);
      }
    }

    // Validar fecha no futura
    if (datos.fecha) {
      const fechaDoc = new Date(datos.fecha);
      const hoy = new Date();
      if (fechaDoc > hoy) {
        advertencias.push('⚠️ La fecha del documento es futura');
      }
    }

    const datosCompletos = camposFaltantes.length === 0 && erroresDetectados.length === 0;

    return {
      datosCompletos,
      camposFaltantes,
      erroresDetectados,
      advertencias
    };
  }

  /**
   * GENERA UN CONCEPTO DESCRIPTIVO DEL GASTO
   */
  private static generateConcept(
    categoria: ExpenseCategory,
    ticketData?: TicketData,
    facturaData?: FacturaData
  ): string {
    // Factura con serie/folio
    if (facturaData?.serie && facturaData?.folio) {
      return `Factura ${facturaData.serie}-${facturaData.folio} - ${facturaData.nombre_emisor || 'Proveedor'}`;
    }

    // Ticket con establecimiento
    if (ticketData?.establecimiento) {
      const productos = ticketData.productos?.length || 0;
      return productos > 0
        ? `Compra en ${ticketData.establecimiento} (${productos} productos)`
        : `Compra en ${ticketData.establecimiento}`;
    }

    // Por categoría
    const conceptosPorCategoria: Record<ExpenseCategory, string> = {
      [ExpenseCategory.COMPRAS]: 'Compras en establecimiento',
      [ExpenseCategory.TRANSPORTE]: 'Gasto de transporte/combustible',
      [ExpenseCategory.ALIMENTACION]: 'Gasto de alimentación',
      [ExpenseCategory.HOSPEDAJE]: 'Gasto de hospedaje',
      [ExpenseCategory.MATERIAL]: 'Material de oficina',
      [ExpenseCategory.EQUIPAMIENTO]: 'Equipo y mobiliario',
      [ExpenseCategory.SERVICIOS]: 'Servicios profesionales',
      [ExpenseCategory.CONSTRUCCION]: 'Materiales de construcción',
      [ExpenseCategory.OTROS]: 'Gasto diversos'
    };

    return conceptosPorCategoria[categoria] || 'Gasto registrado por OCR';
  }

  /**
   * NORMALIZA FECHA A FORMATO ISO
   */
  private static normalizeFecha(fecha?: string): string | null {
    if (!fecha) return null;

    try {
      const date = new Date(fecha);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      const match = fecha.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
      if (match) {
        let [, dia, mes, anio] = match;
        if (anio.length === 2) {
          anio = '20' + anio;
        }
        return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
    }

    return null;
  }

  /**
   * NORMALIZA FORMA DE PAGO
   */
  private static normalizeFormaPago(forma?: string | null): string | null {
    if (!forma) return null;

    const formaLower = forma.toLowerCase();

    if (formaLower.match(/efectivo|cash|01/)) return 'Efectivo';
    if (formaLower.match(/tarjeta|card|04|visa|mastercard/)) return 'Tarjeta';
    if (formaLower.match(/transferencia|03|spei/)) return 'Transferencia';
    if (formaLower.match(/cheque|02/)) return 'Cheque';

    return forma;
  }

  /**
   * NORMALIZA ITEMS/PRODUCTOS
   */
  private static normalizeItems(items?: any[]): ExpenseClassificationResult['datosExtraidos']['items'] {
    if (!items || items.length === 0) return undefined;

    return items.map(item => ({
      descripcion: item.nombre || item.descripcion || 'Sin descripción',
      cantidad: item.cantidad || 1,
      precioUnitario: item.precio_unitario || item.precioUnitario || 0,
      importe: item.precio_total || item.importe || 0
    }));
  }

  /**
   * FORMATEA EL RESULTADO A JSON ESTRUCTURADO
   */
  static formatToJSON(result: ExpenseClassificationResult): string {
    return JSON.stringify({
      tipoDocumento: result.tipoDocumento,
      categoriaGasto: result.categoriaGasto,
      confianza: `${result.confianzaClasificacion}%`,
      datos: result.datosExtraidos,
      validacion: result.validacion,
      razonamiento: result.razonamiento.explicacion
    }, null, 2);
  }

  /**
   * GENERA REPORTE VISUAL EN CONSOLA
   */
  static generateReport(result: ExpenseClassificationResult): string {
    const { tipoDocumento, categoriaGasto, confianzaClasificacion, datosExtraidos, validacion, razonamiento } = result;

    return `
╔════════════════════════════════════════════════════════════╗
║           💸 CLASIFICACIÓN INTELIGENTE DE GASTOS           ║
╚════════════════════════════════════════════════════════════╝

📋 CLASIFICACIÓN:
   Tipo: ${tipoDocumento}
   Categoría: ${categoriaGasto}
   Confianza: ${confianzaClasificacion}%

💵 DATOS EXTRAÍDOS:
   Monto: $${datosExtraidos.monto?.toFixed(2) || 'N/A'}
   Fecha: ${datosExtraidos.fecha || 'N/A'}
   Concepto: ${datosExtraidos.concepto || 'N/A'}
   Proveedor: ${datosExtraidos.proveedor?.nombre || 'N/A'}
   RFC: ${datosExtraidos.proveedor?.rfc || 'N/A'}
   Pago: ${datosExtraidos.formaPago || 'N/A'}

📊 DESGLOSE FISCAL:
   Subtotal: $${datosExtraidos.subtotal?.toFixed(2) || 'N/A'}
   IVA: $${datosExtraidos.iva?.toFixed(2) || 'N/A'}
   ${datosExtraidos.uuid ? `UUID: ${datosExtraidos.uuid.substring(0, 20)}...` : ''}

${datosExtraidos.items && datosExtraidos.items.length > 0 ? `
🛒 PRODUCTOS/SERVICIOS (${datosExtraidos.items.length}):
${datosExtraidos.items.slice(0, 5).map((item, i) =>
  `   ${i + 1}. ${item.descripcion} - $${item.importe.toFixed(2)}`
).join('\n')}
${datosExtraidos.items.length > 5 ? `   ... y ${datosExtraidos.items.length - 5} más` : ''}
` : ''}

✅ VALIDACIÓN:
   Estado: ${validacion.datosCompletos ? '✓ Datos completos' : '⚠️ Datos incompletos'}
   ${validacion.erroresDetectados.length > 0 ? '\n   Errores:\n   ' + validacion.erroresDetectados.join('\n   ') : ''}
   ${validacion.camposFaltantes.length > 0 ? '\n   Faltantes: ' + validacion.camposFaltantes.join(', ') : ''}
   ${validacion.advertencias.length > 0 ? '\n   Advertencias:\n   ' + validacion.advertencias.join('\n   ') : ''}

🧠 RAZONAMIENTO:
   ${razonamiento.explicacion}

   Factores considerados:
   ${razonamiento.factoresPositivos.map(f => `   ✓ ${f}`).join('\n')}
   ${razonamiento.factoresNegativos.length > 0 ? '\n   ' + razonamiento.factoresNegativos.map(f => `   ✗ ${f}`).join('\n') : ''}

────────────────────────────────────────────────────────────
`.trim();
  }
}

// Exportar el clasificador como default y con el nombre anterior para compatibilidad
export const IntelligentOCRClassifier = IntelligentExpenseClassifier;
export default IntelligentExpenseClassifier;
