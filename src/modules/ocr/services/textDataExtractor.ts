/**
 * EXTRACTOR DE DATOS OCR MEJORADO
 *
 * Extrae datos estructurados del texto crudo de Google Vision u otros OCRs.
 * Optimizado para documentos mexicanos: facturas CFDI y tickets de compra.
 *
 * REGLAS:
 * - Imágenes (jpg, png, etc.) = SIEMPRE tickets
 * - PDFs = SIEMPRE facturas
 */

import type { TicketData, FacturaData } from '../types/OCRTypes';

export interface ExtractedTicketData {
  establecimiento: string | null;
  direccion: string | null;
  telefono: string | null;
  rfc: string | null;
  fecha: string | null;
  hora: string | null;
  total: number | null;
  subtotal: number | null;
  iva: number | null;
  forma_pago: string | null;
  numero_transaccion: string | null;
  productos: Array<{ nombre: string; precio_total: number; cantidad?: number }>;
}

export interface ExtractedFacturaData {
  uuid: string | null;
  rfc_emisor: string | null;
  rfc_receptor: string | null;
  nombre_emisor: string | null;
  nombre_receptor: string | null;
  serie: string | null;
  folio: string | null;
  fecha_emision: string | null;
  fecha_timbrado: string | null;
  lugar_expedicion: string | null;
  metodo_pago: string | null;
  forma_pago: string | null;
  uso_cfdi: string | null;
  subtotal: number | null;
  iva: number | null;
  ieps: number | null;
  total: number | null;
  conceptos: Array<{ descripcion: string; cantidad: number; precioUnitario: number; importe: number }>;
}

/**
 * EXTRACTOR PRINCIPAL DE DATOS OCR
 */
export class TextDataExtractor {

  /**
   * Extrae datos de un TICKET (para imágenes)
   * Optimizado para tickets mexicanos: OXXO, Walmart, Soriana, etc.
   */
  static extractTicketData(texto: string): ExtractedTicketData {
    console.log('🎫 Extrayendo datos de TICKET...');
    console.log('📝 Texto a procesar:', texto.substring(0, 500) + '...');

    const data: ExtractedTicketData = {
      establecimiento: null,
      direccion: null,
      telefono: null,
      rfc: null,
      fecha: null,
      hora: null,
      total: null,
      subtotal: null,
      iva: null,
      forma_pago: null,
      numero_transaccion: null,
      productos: []
    };

    const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const textoLower = texto.toLowerCase();

    // 1. ESTABLECIMIENTO - Buscar en primeras líneas o marcas conocidas
    data.establecimiento = this.extractEstablecimiento(lineas, texto);

    // 2. RFC - Patrón mexicano
    data.rfc = this.extractRFC(texto);

    // 3. FECHA - Múltiples formatos
    data.fecha = this.extractFecha(texto);

    // 4. HORA
    data.hora = this.extractHora(texto);

    // 5. TOTAL - El campo más importante
    data.total = this.extractTotal(texto);

    // 6. SUBTOTAL
    data.subtotal = this.extractSubtotal(texto);

    // 7. IVA
    data.iva = this.extractIVA(texto, data.total, data.subtotal);

    // 8. FORMA DE PAGO
    data.forma_pago = this.extractFormaPago(textoLower);

    // 9. DIRECCION
    data.direccion = this.extractDireccion(texto);

    // 10. TELEFONO
    data.telefono = this.extractTelefono(texto);

    // 11. NUMERO DE TRANSACCION
    data.numero_transaccion = this.extractNumeroTransaccion(texto);

    // 12. PRODUCTOS
    data.productos = this.extractProductos(lineas);

    console.log('✅ Datos de ticket extraídos:', {
      establecimiento: data.establecimiento,
      fecha: data.fecha,
      total: data.total,
      subtotal: data.subtotal,
      iva: data.iva,
      rfc: data.rfc,
      productos: data.productos.length
    });

    return data;
  }

  /**
   * Extrae datos de una FACTURA CFDI (para PDFs)
   * Optimizado para facturas electrónicas mexicanas
   */
  static extractFacturaData(texto: string): ExtractedFacturaData {
    console.log('🧾 Extrayendo datos de FACTURA...');
    console.log('📝 Texto a procesar:', texto.substring(0, 500) + '...');

    const data: ExtractedFacturaData = {
      uuid: null,
      rfc_emisor: null,
      rfc_receptor: null,
      nombre_emisor: null,
      nombre_receptor: null,
      serie: null,
      folio: null,
      fecha_emision: null,
      fecha_timbrado: null,
      lugar_expedicion: null,
      metodo_pago: null,
      forma_pago: null,
      uso_cfdi: null,
      subtotal: null,
      iva: null,
      ieps: null,
      total: null,
      conceptos: []
    };

    const textoLower = texto.toLowerCase();

    // 1. UUID - Folio Fiscal (el más importante para facturas)
    data.uuid = this.extractUUID(texto);

    // 2. RFCs - Emisor y Receptor
    const rfcs = this.extractRFCsFactura(texto);
    data.rfc_emisor = rfcs.emisor;
    data.rfc_receptor = rfcs.receptor;

    // 3. NOMBRES - Emisor y Receptor
    const nombres = this.extractNombresFactura(texto);
    data.nombre_emisor = nombres.emisor;
    data.nombre_receptor = nombres.receptor;

    // 4. SERIE y FOLIO
    data.serie = this.extractSerie(texto);
    data.folio = this.extractFolio(texto);

    // 5. FECHAS
    data.fecha_emision = this.extractFechaEmision(texto);
    data.fecha_timbrado = this.extractFechaTimbrado(texto);

    // 6. MONTOS
    data.total = this.extractTotalFactura(texto);
    data.subtotal = this.extractSubtotalFactura(texto);
    data.iva = this.extractIVAFactura(texto, data.total, data.subtotal);
    data.ieps = this.extractIEPS(texto);

    // 7. METODO/FORMA DE PAGO
    data.metodo_pago = this.extractMetodoPago(textoLower);
    data.forma_pago = this.extractFormaPagoFactura(textoLower);

    // 8. USO CFDI
    data.uso_cfdi = this.extractUsoCFDI(texto);

    // 9. LUGAR EXPEDICION
    data.lugar_expedicion = this.extractLugarExpedicion(texto);

    // 10. CONCEPTOS
    data.conceptos = this.extractConceptos(texto);

    console.log('✅ Datos de factura extraídos:', {
      uuid: data.uuid?.substring(0, 20) + '...',
      rfc_emisor: data.rfc_emisor,
      nombre_emisor: data.nombre_emisor,
      fecha_emision: data.fecha_emision,
      total: data.total,
      subtotal: data.subtotal,
      iva: data.iva
    });

    return data;
  }

  // =====================================================
  // EXTRACTORES DE TICKETS
  // =====================================================

  private static extractEstablecimiento(lineas: string[], texto: string): string | null {
    // Marcas conocidas (prioridad máxima)
    const marcas = [
      /oxxo/i, /walmart/i, /soriana/i, /chedraui/i, /costco/i, /sam'?s\s*club/i,
      /7-?eleven/i, /bodega\s*aurrer[ar]/i, /liverpool/i, /palacio\s*de\s*hierro/i,
      /sanborns/i, /home\s*depot/i, /office\s*depot/i, /sears/i, /suburbia/i,
      /farmacias?\s*(?:del\s*ahorro|benavides|guadalajara|san\s*pablo)/i,
      /super(?:ama)?/i, /extra/i, /aurrera/i, /city\s*market/i
    ];

    for (const marca of marcas) {
      const match = texto.match(marca);
      if (match) {
        console.log('🏪 Marca conocida encontrada:', match[0]);
        return match[0].toUpperCase();
      }
    }

    // Buscar en primeras 5 líneas (donde suele estar el nombre)
    for (let i = 0; i < Math.min(5, lineas.length); i++) {
      const linea = lineas[i];
      // Saltar líneas que son solo números, fechas o muy cortas
      if (linea.length > 3 &&
          linea.length < 60 &&
          !/^\d+$/.test(linea) &&
          !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(linea) &&
          !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(linea) &&
          !/^(?:fecha|hora|ticket|folio|total)/i.test(linea)) {
        console.log('🏪 Establecimiento en línea', i + 1, ':', linea);
        return linea;
      }
    }

    return null;
  }

  private static extractRFC(texto: string): string | null {
    // RFC mexicano: 3-4 letras + 6 dígitos + 3 alfanuméricos
    const rfcPattern = /\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/gi;
    const matches = texto.match(rfcPattern);

    if (matches && matches.length > 0) {
      // Tomar el primero (suele ser el del establecimiento)
      console.log('🆔 RFC encontrado:', matches[0]);
      return matches[0].toUpperCase();
    }

    return null;
  }

  private static extractFecha(texto: string): string | null {
    // Patrones de fecha en orden de preferencia
    const patterns = [
      // Formato: 2024-12-25 o 2024/12/25
      /\b(\d{4}[-\/]\d{2}[-\/]\d{2})\b/,
      // Formato: 25/12/2024 o 25-12-2024
      /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/,
      // Formato: 25/12/24 o 25-12-24
      /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2})\b/,
      // Formato: 25 Dic 2024 o 25 Diciembre 2024
      /\b(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-záéíóú]*\s+\d{4})\b/i,
      // Formato: Dic 25, 2024
      /\b((?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-záéíóú]*\s+\d{1,2},?\s+\d{4})\b/i
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        const fechaStr = match[1];
        const fechaNormalizada = this.normalizarFecha(fechaStr);
        if (fechaNormalizada) {
          console.log('📅 Fecha encontrada:', fechaNormalizada);
          return fechaNormalizada;
        }
      }
    }

    return null;
  }

  private static normalizarFecha(fechaStr: string): string | null {
    try {
      // Si ya está en formato ISO
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
        return fechaStr;
      }

      // Formato dd/mm/yyyy o dd-mm-yyyy
      const matchDMY = fechaStr.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
      if (matchDMY) {
        const [, dia, mes, año] = matchDMY;
        return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }

      // Formato dd/mm/yy o dd-mm-yy
      const matchDMY2 = fechaStr.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/);
      if (matchDMY2) {
        const [, dia, mes, año] = matchDMY2;
        const añoCompleto = parseInt(año) > 50 ? '19' + año : '20' + año;
        return `${añoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }

      // Formato yyyy/mm/dd
      const matchYMD = fechaStr.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
      if (matchYMD) {
        const [, año, mes, dia] = matchYMD;
        return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }

      return fechaStr;
    } catch {
      return null;
    }
  }

  private static extractHora(texto: string): string | null {
    const patterns = [
      /\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?m\.?)?)\b/i,
      /\bhora[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)\b/i
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        console.log('🕐 Hora encontrada:', match[1]);
        return match[1];
      }
    }

    return null;
  }

  private static extractTotal(texto: string): number | null {
    const patterns = [
      // TOTAL con símbolo de peso
      /total[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
      // T O T A L (espaciado)
      /t\s*o\s*t\s*a\s*l[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
      // IMPORTE TOTAL
      /importe(?:\s*total)?[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
      // TOTAL A PAGAR
      /(?:total\s*)?a\s*pagar[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
      // Monto con $ cerca de "total"
      /\$\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*\.[0-9]{2})\s*(?:total|pagar)/gi,
      // Patrón genérico $ cantidad al final
      /\$\s*([0-9]{1,3},[0-9]{3}\.[0-9]{2}|\d+\.\d{2})\s*$/gm
    ];

    let maxTotal = 0;

    for (const pattern of patterns) {
      const matches = texto.matchAll(pattern);
      for (const match of matches) {
        const numStr = match[1].replace(/,/g, '').replace(/\s/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0 && num < 10000000) {
          if (num > maxTotal) {
            maxTotal = num;
          }
        }
      }
    }

    if (maxTotal > 0) {
      console.log('💰 Total encontrado:', maxTotal);
      return maxTotal;
    }

    return null;
  }

  private static extractSubtotal(texto: string): number | null {
    const patterns = [
      /sub\s*-?\s*total[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
      /subtotal[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
      /importe\s*antes[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{1,2})?)/gi
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        const numStr = match[1].replace(/,/g, '').replace(/\s/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0) {
          console.log('📊 Subtotal encontrado:', num);
          return num;
        }
      }
    }

    return null;
  }

  private static extractIVA(texto: string, total: number | null, subtotal: number | null): number | null {
    const patterns = [
      /i\.?v\.?a\.?\s*(?:\d+%)?[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
      /impuesto[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
      /tax[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{1,2})?)/gi
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        const numStr = match[1].replace(/,/g, '').replace(/\s/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0) {
          console.log('📈 IVA encontrado:', num);
          return num;
        }
      }
    }

    // Si tenemos total y subtotal, calcular IVA
    if (total && subtotal && total > subtotal) {
      const ivaCalculado = Math.round((total - subtotal) * 100) / 100;
      console.log('📈 IVA calculado:', ivaCalculado);
      return ivaCalculado;
    }

    return null;
  }

  private static extractFormaPago(textoLower: string): string | null {
    if (textoLower.match(/efectivo|cash|dinero\s+en\s+efectivo/)) return 'Efectivo';
    if (textoLower.match(/tarjeta\s*(de\s*)?(credito|crédito)|visa|mastercard|american\s*express/)) return 'Tarjeta de crédito';
    if (textoLower.match(/tarjeta\s*(de\s*)?(debito|débito)/)) return 'Tarjeta de débito';
    if (textoLower.match(/tarjeta|card/)) return 'Tarjeta';
    if (textoLower.match(/transferencia|spei|transfer/)) return 'Transferencia';
    if (textoLower.match(/cheque/)) return 'Cheque';
    if (textoLower.match(/vales?\s*(de\s*)?despensa|sodexo|edenred/)) return 'Vales';
    return null;
  }

  private static extractDireccion(texto: string): string | null {
    const patterns = [
      /(?:direcci[oó]n|domicilio|sucursal)[:\s]*([^\n]{10,100})/gi,
      /(?:av\.|avenida|calle|blvd|boulevard)\s+[^\n]{10,80}/gi
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  }

  private static extractTelefono(texto: string): string | null {
    const patterns = [
      /(?:tel[éefo\.\s:]*|phone)[:\s]*(\(?\d{2,3}\)?[\s\-]?\d{3,4}[\s\-]?\d{4})/gi,
      /\b(\d{10})\b/
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  }

  private static extractNumeroTransaccion(texto: string): string | null {
    const patterns = [
      /(?:ticket|folio|transacci[oó]n|referencia|operaci[oó]n|aut(?:orizaci[oó]n)?)[:\s#]*([A-Z0-9\-]{4,30})/gi
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  private static extractProductos(lineas: string[]): Array<{ nombre: string; precio_total: number; cantidad?: number }> {
    const productos: Array<{ nombre: string; precio_total: number; cantidad?: number }> = [];

    const excludePatterns = /^(total|subtotal|iva|i\.v\.a|fecha|hora|folio|ticket|cambio|recibido|gracias|atendi[oó]|cajero|vendedor|sucursal|cliente|nombre|direcci[oó]n|rfc|tel[eéfono]*|tarjeta|efectivo|cr[eé]dito|d[eé]bito|transfer|aut|ref)/i;

    for (const linea of lineas) {
      // Saltar líneas de encabezado/pie
      if (linea.length < 5 || excludePatterns.test(linea)) continue;

      // Patrones para productos con precio
      const patrones = [
        // "Producto $123.45" o "Producto $ 123.45"
        /^(.{3,40}?)\s+\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*$/,
        // "2 x Producto $123.45"
        /^(\d+)\s*[xX]\s*(.{3,35}?)\s+\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*$/,
        // "Producto    123.45" (sin $)
        /^([A-Za-záéíóúñüÁÉÍÓÚÑÜ\s]{3,40}?)\s{2,}(\d{1,3}(?:,\d{3})*\.\d{2})\s*$/
      ];

      for (let i = 0; i < patrones.length; i++) {
        const match = linea.match(patrones[i]);
        if (match) {
          let nombre: string;
          let precio: number;
          let cantidad = 1;

          if (i === 1) {
            // Patrón con cantidad
            cantidad = parseInt(match[1]) || 1;
            nombre = match[2].trim();
            precio = parseFloat(match[3].replace(/,/g, ''));
          } else {
            nombre = match[1].trim();
            precio = parseFloat(match[2].replace(/,/g, ''));
          }

          if (nombre.length >= 2 && precio > 0 && precio < 50000 && !excludePatterns.test(nombre)) {
            productos.push({ nombre, precio_total: precio, cantidad });
          }
          break;
        }
      }
    }

    console.log('📦 Productos extraídos:', productos.length);
    return productos;
  }

  // =====================================================
  // EXTRACTORES DE FACTURAS CFDI
  // =====================================================

  private static extractUUID(texto: string): string | null {
    // UUID/Folio Fiscal formato: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
    const pattern = /\b([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})\b/gi;
    const match = texto.match(pattern);

    if (match) {
      console.log('📋 UUID encontrado:', match[0]);
      return match[0].toUpperCase();
    }

    return null;
  }

  private static extractRFCsFactura(texto: string): { emisor: string | null; receptor: string | null } {
    const rfcPattern = /\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/gi;
    const matches = [...texto.matchAll(rfcPattern)];

    let emisor: string | null = null;
    let receptor: string | null = null;

    // Buscar RFC del emisor (cerca de "emisor", "razon social", "proveedor")
    const textoLower = texto.toLowerCase();
    const emisorContext = textoLower.match(/(?:emisor|raz[oó]n\s*social|proveedor|vendedor)[^\n]{0,100}?([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
    if (emisorContext) {
      emisor = emisorContext[1]?.toUpperCase() || null;
    }

    // Buscar RFC del receptor (cerca de "receptor", "cliente")
    const receptorContext = texto.match(/(?:receptor|cliente|comprador)[^\n]{0,100}?([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
    if (receptorContext) {
      receptor = receptorContext[1]?.toUpperCase() || null;
    }

    // Si no se encontró en contexto, usar los primeros dos RFCs
    if (!emisor && matches.length > 0) {
      emisor = matches[0][0].toUpperCase();
    }
    if (!receptor && matches.length > 1) {
      receptor = matches[1][0].toUpperCase();
    }

    console.log('🆔 RFCs encontrados - Emisor:', emisor, '| Receptor:', receptor);
    return { emisor, receptor };
  }

  private static extractNombresFactura(texto: string): { emisor: string | null; receptor: string | null } {
    let emisor: string | null = null;
    let receptor: string | null = null;

    // Buscar nombre del emisor
    const emisorPatterns = [
      /(?:raz[oó]n\s*social|nombre\s*(?:del\s*)?emisor|proveedor)[:\s]*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñü\s&\.,\-]{5,80})/i,
      /emisor[^\n]*nombre[:\s]*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñü\s&\.,\-]{5,80})/i
    ];

    for (const pattern of emisorPatterns) {
      const match = texto.match(pattern);
      if (match) {
        emisor = match[1].trim();
        break;
      }
    }

    // Buscar nombre del receptor
    const receptorPatterns = [
      /(?:receptor|cliente|comprador)[:\s]*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñü\s&\.,\-]{5,80})/i,
      /nombre\s*(?:del\s*)?receptor[:\s]*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñü\s&\.,\-]{5,80})/i
    ];

    for (const pattern of receptorPatterns) {
      const match = texto.match(pattern);
      if (match) {
        receptor = match[1].trim();
        break;
      }
    }

    console.log('👤 Nombres - Emisor:', emisor, '| Receptor:', receptor);
    return { emisor, receptor };
  }

  private static extractSerie(texto: string): string | null {
    const patterns = [
      /serie[:\s]*([A-Z0-9]{1,10})/i,
      /\bser\.?[:\s]*([A-Z0-9]{1,10})/i
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }

    return null;
  }

  private static extractFolio(texto: string): string | null {
    const patterns = [
      /folio(?:\s*(?:fiscal|interno))?[:\s]*(\d{1,20})/i,
      /\bfol\.?[:\s]*(\d{1,20})/i
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  private static extractFechaEmision(texto: string): string | null {
    const patterns = [
      /fecha\s*(?:de\s*)?emisi[oó]n[:\s]*(\d{4}-\d{2}-\d{2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /fecha\s*(?:de\s*)?expedici[oó]n[:\s]*(\d{4}-\d{2}-\d{2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /emisi[oó]n[:\s]*(\d{4}-\d{2}-\d{2})/i
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        return this.normalizarFecha(match[1]);
      }
    }

    // Fallback: usar extractFecha genérico
    return this.extractFecha(texto);
  }

  private static extractFechaTimbrado(texto: string): string | null {
    const pattern = /fecha\s*(?:de\s*)?timbrado[:\s]*(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?)/i;
    const match = texto.match(pattern);

    if (match) {
      return match[1].split('T')[0];
    }

    return null;
  }

  private static extractTotalFactura(texto: string): number | null {
    const patterns = [
      /total[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{2})?)/gi,
      /monto\s*total[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{2})?)/gi,
      /importe\s*total[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{2})?)/gi
    ];

    let maxTotal = 0;

    for (const pattern of patterns) {
      const matches = texto.matchAll(pattern);
      for (const match of matches) {
        const numStr = match[1].replace(/,/g, '').replace(/\s/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > maxTotal) {
          maxTotal = num;
        }
      }
    }

    if (maxTotal > 0) {
      console.log('💰 Total factura:', maxTotal);
      return maxTotal;
    }

    return null;
  }

  private static extractSubtotalFactura(texto: string): number | null {
    const patterns = [
      /sub\s*-?\s*total[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{2})?)/gi,
      /importe\s*antes[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{2})?)/gi
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        const numStr = match[1].replace(/,/g, '').replace(/\s/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0) {
          console.log('📊 Subtotal factura:', num);
          return num;
        }
      }
    }

    return null;
  }

  private static extractIVAFactura(texto: string, total: number | null, subtotal: number | null): number | null {
    const patterns = [
      /(?:iva|i\.v\.a\.?)\s*(?:trasladado)?(?:\s*16\s*%)?[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{2})?)/gi,
      /impuesto\s*trasladado[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{2})?)/gi
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        const numStr = match[1].replace(/,/g, '').replace(/\s/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0) {
          console.log('📈 IVA factura:', num);
          return num;
        }
      }
    }

    // Si tenemos total y subtotal, calcular
    if (total && subtotal && total > subtotal) {
      const iva = Math.round((total - subtotal) * 100) / 100;
      console.log('📈 IVA calculado:', iva);
      return iva;
    }

    return null;
  }

  private static extractIEPS(texto: string): number | null {
    const pattern = /ieps[:\s$]*\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*(?:\.[0-9]{2})?)/gi;
    const match = texto.match(pattern);

    if (match) {
      const numStr = match[1]?.replace(/,/g, '').replace(/\s/g, '');
      const num = parseFloat(numStr || '0');
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }

    return null;
  }

  private static extractMetodoPago(textoLower: string): string | null {
    if (textoLower.match(/pue|pago\s*en\s*una\s*sola\s*exhibici/)) return 'PUE';
    if (textoLower.match(/ppd|pago\s*en\s*parcialidades/)) return 'PPD';
    return null;
  }

  private static extractFormaPagoFactura(textoLower: string): string | null {
    // Claves SAT de forma de pago
    if (textoLower.match(/\b01\b.*efectivo|efectivo.*\b01\b/)) return '01 - Efectivo';
    if (textoLower.match(/\b02\b.*cheque|cheque.*\b02\b/)) return '02 - Cheque';
    if (textoLower.match(/\b03\b.*transferencia|transferencia.*\b03\b/)) return '03 - Transferencia';
    if (textoLower.match(/\b04\b.*tarjeta|tarjeta.*\b04\b/)) return '04 - Tarjeta';
    if (textoLower.match(/\b28\b.*tarjeta\s*d[ée]bito|d[ée]bito.*\b28\b/)) return '28 - Tarjeta de débito';

    // Sin clave
    if (textoLower.match(/efectivo|cash/)) return 'Efectivo';
    if (textoLower.match(/cheque/)) return 'Cheque';
    if (textoLower.match(/transferencia|spei/)) return 'Transferencia';
    if (textoLower.match(/tarjeta/)) return 'Tarjeta';

    return null;
  }

  private static extractUsoCFDI(texto: string): string | null {
    const patterns = [
      /uso\s*(?:de\s*)?cfdi[:\s]*([A-Z]\d{2})/i,
      /\b(G01|G02|G03|I01|I02|I03|I04|I05|I06|I07|I08|D01|D02|D03|D04|D05|D06|D07|D08|D09|D10|P01|S01|CP01)\b/
    ];

    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }

    return null;
  }

  private static extractLugarExpedicion(texto: string): string | null {
    const pattern = /lugar\s*(?:de\s*)?expedici[oó]n[:\s]*(\d{5})/i;
    const match = texto.match(pattern);

    if (match) {
      return match[1];
    }

    return null;
  }

  private static extractConceptos(texto: string): Array<{ descripcion: string; cantidad: number; precioUnitario: number; importe: number }> {
    // Los conceptos de factura suelen estar en formato tabular
    // Este es un extractor básico - las facturas reales pueden necesitar parsing XML
    const conceptos: Array<{ descripcion: string; cantidad: number; precioUnitario: number; importe: number }> = [];

    // Buscar sección de conceptos
    const conceptoSection = texto.match(/conceptos?[:\s]*([\s\S]*?)(?:subtotal|total|impuestos)/i);
    if (!conceptoSection) return conceptos;

    const lineas = conceptoSection[1].split('\n').filter(l => l.trim().length > 5);

    for (const linea of lineas) {
      // Patrón: descripción cantidad precio_unitario importe
      const match = linea.match(/([A-Za-záéíóúñüÁÉÍÓÚÑÜ\s]{5,50})\s+(\d+(?:\.\d+)?)\s+\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s+\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);

      if (match) {
        conceptos.push({
          descripcion: match[1].trim(),
          cantidad: parseFloat(match[2]),
          precioUnitario: parseFloat(match[3].replace(/,/g, '')),
          importe: parseFloat(match[4].replace(/,/g, ''))
        });
      }
    }

    return conceptos;
  }

  // =====================================================
  // MÉTODOS DE CONVERSIÓN PARA COMPATIBILIDAD
  // =====================================================

  /**
   * Convierte ExtractedTicketData al formato TicketData del sistema
   */
  static toTicketData(data: ExtractedTicketData): TicketData {
    // Convertir productos al formato ProductoTicket
    const productos = data.productos.map(p => ({
      nombre: p.nombre,
      cantidad: p.cantidad || 1,
      precio_unitario: p.precio_total / (p.cantidad || 1),
      precio_total: p.precio_total
    }));

    return {
      establecimiento: data.establecimiento || undefined,
      direccion: data.direccion || undefined,
      telefono: data.telefono || undefined,
      rfc: data.rfc || undefined,
      fecha: data.fecha || undefined,
      hora: data.hora || undefined,
      total: data.total ?? undefined,
      subtotal: data.subtotal ?? undefined,
      iva: data.iva ?? undefined,
      forma_pago: data.forma_pago || undefined,
      numero_transaccion: data.numero_transaccion || undefined,
      productos: productos.length > 0 ? productos : undefined
    };
  }

  /**
   * Convierte ExtractedFacturaData al formato FacturaData del sistema
   */
  static toFacturaData(data: ExtractedFacturaData): FacturaData {
    // Convertir conceptos al formato ConceptoFactura
    const conceptos = data.conceptos.map(c => ({
      descripcion: c.descripcion,
      cantidad: c.cantidad,
      precio_unitario: c.precioUnitario,
      importe: c.importe
    }));

    return {
      uuid: data.uuid || undefined,
      rfc_emisor: data.rfc_emisor || undefined,
      rfc_receptor: data.rfc_receptor || undefined,
      nombre_emisor: data.nombre_emisor || undefined,
      nombre_receptor: data.nombre_receptor || undefined,
      serie: data.serie || undefined,
      folio: data.folio || undefined,
      fecha_emision: data.fecha_emision || undefined,
      fecha_certificacion: data.fecha_timbrado || undefined,
      metodo_pago: data.metodo_pago || undefined,
      forma_pago: data.forma_pago || undefined,
      uso_cfdi: data.uso_cfdi || undefined,
      subtotal: data.subtotal ?? undefined,
      iva: data.iva ?? undefined,
      ieps: data.ieps ?? undefined,
      total: data.total ?? undefined,
      conceptos: conceptos.length > 0 ? conceptos : undefined
    };
  }
}

export default TextDataExtractor;
