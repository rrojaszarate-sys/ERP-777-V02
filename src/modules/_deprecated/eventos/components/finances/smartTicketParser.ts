/**
 * Smart Mexican Ticket Parser
 * Extracción inteligente de datos de tickets/facturas mexicanas
 * Con corrección automática de errores comunes del OCR
 *
 * @author Sistema OCR Mejorado
 * @date 2025-10-12
 */

export interface ProductoDetallado {
  codigo?: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_producto: number;
  descuento?: number;
  linea_original: string;
}

export interface ExtendedOCRData {
  // Datos del establecimiento
  establecimiento: string | null;
  rfc: string | null;
  telefono: string | null;
  direccion: string | null;

  // Datos temporales
  fecha: string | null;
  hora: string | null;
  folio: string | null;

  // Datos monetarios
  total: number | null;
  subtotal: number | null;
  iva: number | null;
  iva_porcentaje: number | null;
  descuento: number | null;
  propina: number | null;
  moneda: string;

  // Pago
  forma_pago: string | null;
  metodo_pago_detalle: string | null;
  ultimos_digitos_tarjeta: string | null;

  // Productos
  productos: ProductoDetallado[];

  // Metadata
  tipo_comprobante: 'I' | 'E' | 'T' | 'N' | 'P';
  confianza_total: number;
  campos_detectados: string[];
  campos_fallidos: string[];
  categoria_sugerida: {
    nombre: string;
    confianza: number;
  };
}

/**
 * Parser principal - Extrae todos los datos posibles del ticket
 */
export function parseSmartMexicanTicket(
  text: string,
  confidence: number
): ExtendedOCRData {

  // 1. Pre-procesar y corregir errores comunes
  const textCorregido = corregirErroresOCR(text);
  const lines = textCorregido.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // 2. Inicializar estructura de datos
  const data: ExtendedOCRData = {
    establecimiento: null,
    rfc: null,
    telefono: null,
    direccion: null,
    fecha: null,
    hora: null,
    folio: null,
    total: null,
    subtotal: null,
    iva: null,
    iva_porcentaje: null,
    descuento: null,
    propina: null,
    moneda: 'MXN',
    forma_pago: null,
    metodo_pago_detalle: null,
    ultimos_digitos_tarjeta: null,
    productos: [],
    tipo_comprobante: 'I', // Por defecto Ingreso (venta)
    confianza_total: confidence,
    campos_detectados: [],
    campos_fallidos: [],
    categoria_sugerida: { nombre: 'sin_clasificar', confianza: 0 }
  };

  // 3. Extraer cada campo
  data.establecimiento = extraerEstablecimiento(lines);
  data.rfc = extraerRFC(textCorregido);
  data.telefono = extraerTelefono(textCorregido);
  data.direccion = extraerDireccion(lines);
  data.fecha = extraerFecha(textCorregido);
  data.hora = extraerHora(textCorregido);
  data.folio = extraerFolio(textCorregido);

  // Datos monetarios
  const datosMonetarios = extraerDatosMonetarios(textCorregido);
  Object.assign(data, datosMonetarios);

  // Forma de pago
  const datosPago = extraerDatosPago(textCorregido);
  Object.assign(data, datosPago);

  // Productos
  data.productos = extraerProductos(lines, data.total || 0);

  // Determinar tipo de comprobante
  data.tipo_comprobante = determinarTipoComprobante(textCorregido);

  // Categoría sugerida
  if (data.establecimiento) {
    data.categoria_sugerida = determinarCategoriaAutomatica(data.establecimiento);
  }

  // 4. Validar campos detectados
  const allKeys = Object.keys(data) as Array<keyof ExtendedOCRData>;

  data.campos_detectados = allKeys.filter(key => {
    const value = data[key];
    return value !== null &&
      value !== undefined &&
      !['campos_detectados', 'campos_fallidos', 'confianza_total', 'productos', 'categoria_sugerida'].includes(key);
  });

  data.campos_fallidos = allKeys.filter(key => {
    const value = data[key];
    return value === null &&
      !['campos_detectados', 'campos_fallidos', 'confianza_total', 'productos', 'categoria_sugerida'].includes(key);
  });

  return data;
}

/**
 * Corrige errores típicos del OCR
 */
function corregirErroresOCR(text: string): string {
  let corrected = text;

  // Errores O/0 en RFCs y números
  corrected = corrected.replace(/([A-Z]{3,4})O(\d{6})/g, '$10$2');
  corrected = corrected.replace(/\$(\d+)O(\d+)/g, '$$$10$2');

  // Errores I/1 en números
  corrected = corrected.replace(/\$(\d+)I(\d+)/g, '$$$11$2');
  corrected = corrected.replace(/([A-Z]{3,4}\d{6}[A-Z0-9]{2})I(\d)/g, '$11$2');

  // Normalizar fechas
  corrected = corrected.replace(/(\d{2})-(\d{2})-(\d{4})/g, '$1/$2/$3');

  // Espacios en RFC
  corrected = corrected.replace(/([A-Z]{3,4})\s+(\d{6})/g, '$1$2');

  return corrected;
}

/**
 * Extrae el nombre del establecimiento
 */
function extraerEstablecimiento(lines: string[]): string | null {
  // Buscar en las primeras 5 líneas
  for (const line of lines.slice(0, 5)) {
    // Debe tener más de 3 caracteres
    if (line.length < 3) continue;

    // Excluir líneas con patrones comunes de no-establecimiento
    if (
      /^\d+$/.test(line) ||
      /RFC|TEL|FECHA|HORA|TOTAL|SUBTOTAL|IVA|TICKET|FOLIO/i.test(line) ||
      /^\$/.test(line) ||
      /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(line)
    ) {
      continue;
    }

    return line.toUpperCase().trim();
  }

  return null;
}

/**
 * Extrae RFC con formato correcto (incluyendo /)
 */
function extraerRFC(text: string): string | null {
  const patterns = [
    /RFC[:\s]*([A-Z]{3,4}\d{6}[A-Z0-9]{3})/i,
    /\b([A-Z]{3,4}\d{6}[A-Z0-9]{3})\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let rfc = match[1].toUpperCase();

      // Insertar / antes de los últimos 3 caracteres si no existe
      if (!rfc.includes('/') && rfc.length === 13) {
        rfc = rfc.slice(0, 10) + '/' + rfc.slice(10);
      }

      return rfc;
    }
  }

  return null;
}

/**
 * Extrae teléfono
 */
function extraerTelefono(text: string): string | null {
  const patterns = [
    /(?:TEL|TELEFONO|PHONE)[:\s]*([0-9\-\s\(\)]+)/i,
    /(\d{3}[-\s]?\d{3}[-\s]?\d{4})/,
    /(\(\d{3}\)\s*\d{3}[-\s]?\d{4})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extrae dirección
 */
function extraerDireccion(lines: string[]): string | null {
  for (const line of lines.slice(1, 8)) {
    if (
      /(?:CALLE|AVENIDA|AV\.|BOULEVARD|BLVD|COL\.|COLONIA)/i.test(line) ||
      /\d{5}/.test(line)
    ) {
      return line.trim();
    }
  }

  return null;
}

/**
 * Extrae fecha
 */
function extraerFecha(text: string): string | null {
  const patterns = [
    /(?:FECHA[:\s]*)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let fecha = match[1];
      const parts = fecha.split(/[\/\-]/);

      if (parts[0].length === 4) {
        // Formato yyyy-mm-dd
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        // Formato dd/mm/yyyy
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  return null;
}

/**
 * Extrae hora
 */
function extraerHora(text: string): string | null {
  const patterns = [
    /(?:HORA[:\s]*)?(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extrae folio/ticket number
 */
function extraerFolio(text: string): string | null {
  const patterns = [
    /(?:FOLIO|TICKET|NO\.?\s*TICKET)[:\s#]*(\w+)/i,
    /(?:FACTURA|INVOICE)[:\s#]*([A-Z0-9\-]+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extrae datos monetarios (total, subtotal, IVA, etc.)
 */
function extraerDatosMonetarios(text: string): Partial<ExtendedOCRData> {
  const resultado: Partial<ExtendedOCRData> = {
    total: null,
    subtotal: null,
    iva: null,
    iva_porcentaje: null,
    descuento: null,
    propina: null
  };

  // Total
  const totalPatterns = [
    /TOTAL[:\s]*\$?\s*([0-9,]+\.?\d*)/i,
    /IMPORTE[:\s]*\$?\s*([0-9,]+\.?\d*)/i
  ];

  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      resultado.total = parseMontoSeguro(match[1]);
      break;
    }
  }

  // Subtotal
  const subtotalMatch = text.match(/(?:SUBTOTAL|SUB-TOTAL)[:\s]*\$?\s*([0-9,]+\.?\d*)/i);
  if (subtotalMatch) {
    resultado.subtotal = parseMontoSeguro(subtotalMatch[1]);
  }

  // IVA
  const ivaMatch = text.match(/IVA[:\s]*\$?\s*([0-9,]+\.?\d*)/i);
  if (ivaMatch) {
    resultado.iva = parseMontoSeguro(ivaMatch[1]);

    // Calcular porcentaje de IVA si tenemos subtotal
    if (resultado.subtotal && resultado.iva) {
      resultado.iva_porcentaje = (resultado.iva / resultado.subtotal) * 100;
    }
  }

  // Descuento
  const descuentoMatch = text.match(/DESCUENTO[:\s]*\$?\s*([0-9,]+\.?\d*)/i);
  if (descuentoMatch) {
    resultado.descuento = parseMontoSeguro(descuentoMatch[1]);
  }

  // Propina
  const propinaMatch = text.match(/PROPINA[:\s]*\$?\s*([0-9,]+\.?\d*)/i);
  if (propinaMatch) {
    resultado.propina = parseMontoSeguro(propinaMatch[1]);
  }

  return resultado;
}

/**
 * Parsea monto de manera segura manejando comas y puntos
 */
function parseMontoSeguro(montoStr: string): number | null {
  try {
    let cleaned = montoStr.trim();

    // Si tiene comas Y puntos, las comas son separadores de miles
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/,/g, '');
    }
    // Si solo tiene comas
    else if (cleaned.includes(',')) {
      // Si formato ###,## (2 dígitos después), es decimal
      if (/,\d{2}$/.test(cleaned)) {
        cleaned = cleaned.replace(',', '.');
      } else {
        // Son separadores de miles
        cleaned = cleaned.replace(/,/g, '');
      }
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Extrae datos de pago
 */
function extraerDatosPago(text: string): Partial<ExtendedOCRData> {
  const resultado: Partial<ExtendedOCRData> = {
    forma_pago: null,
    metodo_pago_detalle: null,
    ultimos_digitos_tarjeta: null
  };

  // Forma de pago
  const pagoPatterns = [
    { pattern: /EFECTIVO/i, valor: 'efectivo' },
    { pattern: /TARJETA\s*(?:DE\s*)?DEBITO/i, valor: 'debito' },
    { pattern: /TARJETA\s*(?:DE\s*)?CREDITO/i, valor: 'credito' },
    { pattern: /TRANSFERENCIA/i, valor: 'transferencia' },
    { pattern: /CHEQUE/i, valor: 'cheque' },
    { pattern: /VALES/i, valor: 'vales' }
  ];

  for (const { pattern, valor } of pagoPatterns) {
    if (pattern.test(text)) {
      resultado.forma_pago = valor;
      break;
    }
  }

  // Últimos dígitos de tarjeta
  const tarjetaMatch = text.match(/(?:TARJETA|CARD).*?(\d{4})/i);
  if (tarjetaMatch) {
    resultado.ultimos_digitos_tarjeta = tarjetaMatch[1];
    resultado.metodo_pago_detalle = `Tarjeta ****${tarjetaMatch[1]}`;
  }

  return resultado;
}

/**
 * Extrae productos del ticket
 */
function extraerProductos(lines: string[], totalTicket: number): ProductoDetallado[] {
  const productos: ProductoDetallado[] = [];

  const patronesProducto = [
    // "COCA COLA 2 $15.00"
    /^(.+?)\s+(\d+)\s+\$?\s*([0-9,]+\.?\d*)$/,
    // "2 COCA COLA $15.00"
    /^(\d+)\s+(.+?)\s+\$?\s*([0-9,]+\.?\d*)$/,
    // "COCA COLA $15.00"
    /^(.+?)\s+\$?\s*([0-9,]+\.?\d*)$/
  ];

  for (const line of lines) {
    // Saltar líneas con palabras clave que no son productos
    if (/TOTAL|SUBTOTAL|IVA|CAMBIO|FECHA|HORA|FOLIO|RFC/i.test(line)) {
      continue;
    }

    for (const patron of patronesProducto) {
      const match = line.match(patron);
      if (match) {
        let producto: ProductoDetallado;

        if (patron === patronesProducto[0]) {
          producto = {
            nombre: match[1].trim(),
            cantidad: parseInt(match[2]),
            precio_unitario: parseMontoSeguro(match[3]) || 0,
            subtotal_producto: 0,
            linea_original: line
          };
        } else if (patron === patronesProducto[1]) {
          producto = {
            nombre: match[2].trim(),
            cantidad: parseInt(match[1]),
            precio_unitario: parseMontoSeguro(match[3]) || 0,
            subtotal_producto: 0,
            linea_original: line
          };
        } else {
          producto = {
            nombre: match[1].trim(),
            cantidad: 1,
            precio_unitario: parseMontoSeguro(match[2]) || 0,
            subtotal_producto: 0,
            linea_original: line
          };
        }

        producto.subtotal_producto = producto.cantidad * producto.precio_unitario;
        productos.push(producto);
        break;
      }
    }
  }

  // Validación: suma de productos debe ser cercana al total
  if (productos.length > 0 && totalTicket > 0) {
    const sumaProductos = productos.reduce((sum, p) => sum + p.subtotal_producto, 0);
    const diferencia = Math.abs(sumaProductos - totalTicket);

    if (diferencia / totalTicket > 0.2) {
      console.warn('⚠️ Suma de productos no coincide con total del ticket');
    }
  }

  return productos;
}

/**
 * Determina tipo de comprobante según código SAT
 * I = Ingreso (factura/ticket de venta)
 * E = Egreso (nota de crédito)
 * T = Traslado
 * N = Nómina
 * P = Pago
 */
function determinarTipoComprobante(text: string): 'I' | 'E' | 'T' | 'N' | 'P' {
  // Si menciona nota de crédito o devolución
  if (/NOTA\s+(DE\s+)?CR[ÉE]DITO/i.test(text) || /DEVOLUCI[ÓO]N/i.test(text)) {
    return 'E'; // Egreso
  }

  // Si menciona traslado
  if (/TRASLADO/i.test(text)) {
    return 'T'; // Traslado
  }

  // Si menciona nómina
  if (/N[ÓO]MINA/i.test(text) || /RECIBO\s+DE\s+PAGO/i.test(text)) {
    return 'N'; // Nómina
  }

  // Si menciona pago o parcialidades
  if (/COMPROBANTE\s+DE\s+PAGO/i.test(text) || /PARCIALIDADES/i.test(text)) {
    return 'P'; // Pago
  }

  // Por defecto, es un ingreso (factura o ticket de venta)
  return 'I';
}

/**
 * Determina categoría automática basada en establecimiento
 */
function determinarCategoriaAutomatica(establecimiento: string): {
  nombre: string;
  confianza: number;
} {
  const establecimientoLower = establecimiento.toLowerCase();

  const patrones: Record<string, RegExp[]> = {
    'alimentacion': [
      /oxxo/i, /7-?eleven/i, /soriana/i, /walmart/i, /superama/i,
      /restaurante/i, /cafe/i, /tortas/i, /tacos/i, /comida/i
    ],
    'combustible': [
      /pemex/i, /shell/i, /bp/i, /mobil/i, /gasolinera/i, /gas/i
    ],
    'papeleria': [
      /office\s*depot/i, /lumen/i, /papeleria/i, /office/i
    ],
    'servicios': [
      /hotel/i, /renta/i, /servicio/i
    ],
    'transporte': [
      /uber/i, /taxi/i, /didi/i, /transporte/i, /caseta/i
    ]
  };

  for (const [categoria, patterns] of Object.entries(patrones)) {
    for (const pattern of patterns) {
      if (pattern.test(establecimientoLower)) {
        return {
          nombre: categoria,
          confianza: 0.9
        };
      }
    }
  }

  return {
    nombre: 'sin_clasificar',
    confianza: 0
  };
}

/**
 * Genera resumen estructurado de productos para campo detalle_compra
 */
export function generarDetalleCompra(productos: Array<{
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_producto?: number;
}>): string {
  if (productos.length === 0) {
    return '';
  }

  let detalle = '=== DETALLE DE COMPRA ===\n\n';
  let totalGeneral = 0;

  productos.forEach((prod, index) => {
    const subtotal = prod.subtotal_producto || (prod.cantidad * prod.precio_unitario);
    totalGeneral += subtotal;

    detalle += `${index + 1}. ${prod.nombre}\n`;
    detalle += `   Cantidad: ${prod.cantidad}\n`;
    detalle += `   Precio unitario: $${prod.precio_unitario.toFixed(2)}\n`;
    detalle += `   Subtotal: $${subtotal.toFixed(2)}\n\n`;
  });

  detalle += `─────────────────────────\n`;
  detalle += `Total productos: ${productos.length}\n`;
  detalle += `Total: $${totalGeneral.toFixed(2)}\n`;

  return detalle;
}

/**
 * Valida y corrige datos extraídos del OCR
 */
export function validarYCorregirDatosOCR(datos: ExtendedOCRData): ExtendedOCRData {
  const validado = { ...datos };

  // 1. Validar RFC
  if (validado.rfc && validado.rfc.length !== 13 && validado.rfc.length !== 14) {
    console.warn('⚠️ RFC con longitud incorrecta:', validado.rfc);
    if (!validado.campos_fallidos.includes('rfc')) {
      validado.campos_fallidos.push('rfc');
    }
  }

  // 2. Validar total vs suma de productos
  if (validado.productos.length > 0 && validado.total) {
    const sumaProductos = validado.productos.reduce(
      (sum, p) => sum + p.subtotal_producto,
      0
    );

    const diferencia = Math.abs(sumaProductos - validado.total);
    if (diferencia > validado.total * 0.1) {
      console.warn('⚠️ Total no coincide con suma de productos');
      console.warn(`Total: ${validado.total}, Suma: ${sumaProductos}`);
    }
  }

  // 3. Validar subtotal + IVA = total
  if (validado.subtotal && validado.iva && validado.total) {
    const calculado = validado.subtotal + validado.iva;
    const diferencia = Math.abs(calculado - validado.total);

    if (diferencia > 1) {
      console.warn('⚠️ Subtotal + IVA no coincide con total, recalculando...');
      validado.subtotal = validado.total / 1.16;
      validado.iva = validado.total - validado.subtotal;
    }
  }

  // 4. Validar fecha
  if (validado.fecha) {
    const fechaDate = new Date(validado.fecha);
    if (isNaN(fechaDate.getTime())) {
      console.warn('⚠️ Fecha inválida:', validado.fecha);
      validado.fecha = null;
      if (!validado.campos_fallidos.includes('fecha')) {
        validado.campos_fallidos.push('fecha');
      }
    }
  }

  return validado;
}
