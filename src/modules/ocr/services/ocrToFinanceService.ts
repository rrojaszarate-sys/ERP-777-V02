import type { TicketData, FacturaData } from '../types/OCRTypes';

/**
 * Servicio para convertir datos extraídos por OCR a formatos de gastos/ingresos
 *
 * PROPÓSITO: Automatizar el registro financiero desde documentos escaneados
 *
 * FLUJO:
 * 1. Usuario sube ticket/factura → OCR extrae datos
 * 2. Sistema pregunta si quiere crear gasto/ingreso
 * 3. Formulario se auto-llena con datos del OCR
 * 4. Usuario revisa y confirma
 */

export interface ExpenseCreate {
  evento_id: string;
  categoria: string;
  monto: number;
  descripcion: string;
  fecha: string;
  proveedor?: string;
  forma_pago?: string;
  notas?: string;
  documento_ocr_id?: string; // Referencia al documento OCR
}

export interface IncomeCreate {
  evento_id: string;
  monto: number;
  descripcion: string;
  fecha: string;
  cliente_rfc?: string;
  uuid_factura?: string;
  metodo_pago?: string;
  notas?: string;
  documento_ocr_id?: string;
}

export class OCRToFinanceService {

  /**
   * Convierte datos de ticket OCR a formato de gasto
   *
   * @param ticketData - Datos extraídos del ticket por OCR
   * @param eventoId - ID del evento al que pertenece el gasto
   * @param documentoOcrId - ID del documento OCR (opcional, para referencia)
   * @returns Objeto con datos listos para crear gasto
   */
  static ticketToExpense(
    ticketData: TicketData,
    eventoId: string,
    documentoOcrId?: string
  ): ExpenseCreate {
    // Detectar categoría automáticamente basada en establecimiento
    const categoria = this.detectExpenseCategory(ticketData.establecimiento || '');

    // Construir descripción descriptiva
    const descripcion = this.buildExpenseDescription(ticketData);

    // Construir notas con detalles de productos
    const notas = this.buildProductNotes(ticketData.productos || []);

    return {
      evento_id: eventoId,
      categoria: categoria,
      monto: ticketData.total || 0,
      descripcion: descripcion,
      fecha: ticketData.fecha || new Date().toISOString().split('T')[0],
      proveedor: ticketData.establecimiento || 'No especificado',
      forma_pago: this.normalizePaymentMethod(ticketData.forma_pago),
      notas: notas,
      documento_ocr_id: documentoOcrId
    };
  }

  /**
   * Convierte datos de factura OCR a formato de ingreso
   *
   * @param facturaData - Datos extraídos de la factura por OCR
   * @param eventoId - ID del evento al que pertenece el ingreso
   * @param documentoOcrId - ID del documento OCR (opcional)
   * @returns Objeto con datos listos para crear ingreso
   */
  static facturaToIncome(
    facturaData: FacturaData,
    eventoId: string,
    documentoOcrId?: string
  ): IncomeCreate {
    // Construir descripción con serie y folio si existen
    const descripcion = facturaData.serie && facturaData.folio
      ? `Factura ${facturaData.serie}-${facturaData.folio}`
      : facturaData.uuid
      ? `Factura ${facturaData.uuid.substring(0, 8)}...`
      : 'Factura electrónica';

    // Construir notas con detalles fiscales
    const notas = this.buildFacturaNotas(facturaData);

    return {
      evento_id: eventoId,
      monto: facturaData.total || 0,
      descripcion: descripcion,
      fecha: facturaData.fecha_emision || new Date().toISOString().split('T')[0],
      cliente_rfc: facturaData.rfc_receptor,
      uuid_factura: facturaData.uuid,
      metodo_pago: facturaData.metodo_pago || 'PUE',
      notas: notas,
      documento_ocr_id: documentoOcrId
    };
  }

  /**
   * Detecta la categoría de gasto basada en el establecimiento
   */
  private static detectExpenseCategory(establecimiento: string): string {
    const estabLower = establecimiento.toLowerCase();

    // Categorías comunes en eventos
    if (estabLower.match(/oxxo|7-eleven|walmart|soriana|chedraui|bodega|super|market/)) {
      return 'compras'; // Compras de supermercado
    }

    if (estabLower.match(/office depot|office max|papelería|papeleria|staples/)) {
      return 'material'; // Material de oficina
    }

    if (estabLower.match(/gasolinera|pemex|shell|mobil|bp/)) {
      return 'transporte'; // Combustible
    }

    if (estabLower.match(/restaurant|comida|taco|pizza|café|cafe|food/)) {
      return 'alimentacion'; // Alimentos
    }

    if (estabLower.match(/hotel|hospedaje|motel|hostal/)) {
      return 'hospedaje'; // Alojamiento
    }

    if (estabLower.match(/home depot|tlapalería|ferretería|construcción|materiales/)) {
      return 'construccion'; // Materiales de construcción
    }

    if (estabLower.match(/liverpool|palacio|coppel|elektra|tienda departamental/)) {
      return 'equipamiento'; // Equipo y mobiliario
    }

    // Categoría por defecto
    return 'otros';
  }

  /**
   * Construye una descripción legible para el gasto
   */
  private static buildExpenseDescription(ticketData: TicketData): string {
    const parts: string[] = [];

    if (ticketData.establecimiento) {
      parts.push(ticketData.establecimiento);
    }

    if (ticketData.fecha) {
      parts.push(`- ${ticketData.fecha}`);
    }

    // Si hay productos, mencionar los más importantes
    if (ticketData.productos && ticketData.productos.length > 0) {
      const topProducts = ticketData.productos.slice(0, 2); // Primeros 2 productos
      const productNames = topProducts.map(p => p.nombre).join(', ');
      parts.push(`(${productNames}${ticketData.productos.length > 2 ? '...' : ''})`);
    }

    return parts.join(' ') || 'Gasto registrado desde OCR';
  }

  /**
   * Construye las notas del gasto con lista de productos
   */
  private static buildProductNotes(productos: any[]): string {
    if (!productos || productos.length === 0) {
      return 'Sin detalles de productos';
    }

    const lines = ['PRODUCTOS DETECTADOS POR OCR:', ''];

    productos.forEach((producto, index) => {
      const cantidad = producto.cantidad || 1;
      const nombre = producto.nombre || 'Producto sin nombre';
      const precioUnitario = producto.precio_unitario || 0;
      const precioTotal = producto.precio_total || 0;

      if (precioUnitario > 0 && precioUnitario !== precioTotal) {
        lines.push(`${index + 1}. ${cantidad}x ${nombre} - $${precioUnitario.toFixed(2)} c/u = $${precioTotal.toFixed(2)}`);
      } else {
        lines.push(`${index + 1}. ${nombre} - $${precioTotal.toFixed(2)}`);
      }
    });

    lines.push('');
    lines.push(`TOTAL DE PRODUCTOS: ${productos.length}`);

    return lines.join('\n');
  }

  /**
   * Construye las notas de la factura con datos fiscales
   */
  private static buildFacturaNotas(facturaData: FacturaData): string {
    const lines = ['DATOS FISCALES (EXTRAÍDOS POR OCR):', ''];

    if (facturaData.rfc_emisor) {
      lines.push(`RFC Emisor: ${facturaData.rfc_emisor}`);
    }

    if (facturaData.nombre_emisor) {
      lines.push(`Razón Social: ${facturaData.nombre_emisor}`);
    }

    if (facturaData.uuid) {
      lines.push(`UUID: ${facturaData.uuid}`);
    }

    if (facturaData.serie && facturaData.folio) {
      lines.push(`Serie-Folio: ${facturaData.serie}-${facturaData.folio}`);
    }

    if (facturaData.subtotal && facturaData.iva) {
      lines.push('');
      lines.push(`Subtotal: $${facturaData.subtotal.toFixed(2)}`);
      lines.push(`IVA (16%): $${facturaData.iva.toFixed(2)}`);
      if (facturaData.total) {
        lines.push(`Total: $${facturaData.total.toFixed(2)}`);
      }
    }

    if (facturaData.estado) {
      lines.push('');
      lines.push(`Estado SAT: ${facturaData.estado}`);
    }

    if (facturaData.validado_sat !== undefined) {
      lines.push(`Validado SAT: ${facturaData.validado_sat ? 'Sí' : 'No'}`);
    }

    return lines.join('\n');
  }

  /**
   * Normaliza el método de pago a formatos estándar
   */
  private static normalizePaymentMethod(formaPago?: string): string {
    if (!formaPago) return 'efectivo';

    const formaPagoLower = formaPago.toLowerCase();

    if (formaPagoLower.match(/efectivo|cash/)) return 'efectivo';
    if (formaPagoLower.match(/tarjeta|card|credito|debito/)) return 'tarjeta';
    if (formaPagoLower.match(/transferencia|spei|transfer/)) return 'transferencia';
    if (formaPagoLower.match(/cheque/)) return 'cheque';
    if (formaPagoLower.match(/vales/)) return 'vales';

    return formaPago; // Retornar original si no coincide
  }

  /**
   * Valida que los datos sean suficientes para crear un gasto
   */
  static validateExpenseData(expenseData: ExpenseCreate): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!expenseData.evento_id) {
      errors.push('ID de evento requerido');
    }

    if (!expenseData.monto || expenseData.monto <= 0) {
      errors.push('Monto debe ser mayor a 0');
    }

    if (!expenseData.fecha) {
      errors.push('Fecha requerida');
    }

    if (!expenseData.descripcion || expenseData.descripcion.trim().length < 3) {
      errors.push('Descripción muy corta');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida que los datos sean suficientes para crear un ingreso
   */
  static validateIncomeData(incomeData: IncomeCreate): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!incomeData.evento_id) {
      errors.push('ID de evento requerido');
    }

    if (!incomeData.monto || incomeData.monto <= 0) {
      errors.push('Monto debe ser mayor a 0');
    }

    if (!incomeData.fecha) {
      errors.push('Fecha requerida');
    }

    if (!incomeData.uuid_factura) {
      errors.push('UUID de factura recomendado para trazabilidad');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera un resumen visual de los datos a crear
   */
  static generateExpenseSummary(expenseData: ExpenseCreate): string {
    return `
╔══════════════════════════════════════╗
║      CREAR GASTO DESDE OCR          ║
╚══════════════════════════════════════╝

Categoría: ${expenseData.categoria}
Proveedor: ${expenseData.proveedor || 'N/A'}
Monto: $${expenseData.monto.toFixed(2)}
Fecha: ${expenseData.fecha}
Pago: ${expenseData.forma_pago || 'N/A'}

Descripción:
${expenseData.descripcion}

${expenseData.notas ? '--- Detalles ---\n' + expenseData.notas : ''}
    `.trim();
  }

  static generateIncomeSummary(incomeData: IncomeCreate): string {
    return `
╔══════════════════════════════════════╗
║     CREAR INGRESO DESDE OCR         ║
╚══════════════════════════════════════╝

Monto: $${incomeData.monto.toFixed(2)}
Fecha: ${incomeData.fecha}
RFC Cliente: ${incomeData.cliente_rfc || 'N/A'}
UUID: ${incomeData.uuid_factura?.substring(0, 20) || 'N/A'}...
Método: ${incomeData.metodo_pago || 'N/A'}

Descripción:
${incomeData.descripcion}

${incomeData.notas ? '--- Datos Fiscales ---\n' + incomeData.notas : ''}
    `.trim();
  }
}

export default OCRToFinanceService;
