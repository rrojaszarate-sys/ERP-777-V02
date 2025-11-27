/**
 * INTEGRADOR OCR INTELIGENTE → GASTOS
 *
 * Este servicio conecta el clasificador inteligente de OCR
 * con el módulo de gastos, asegurando que TODOS los campos
 * de la base de datos se llenen correctamente.
 */

import { IntelligentExpenseClassifier, ExpenseClassificationResult, ExpenseCategory } from './intelligentOCRClassifier';
import { tesseractOCRService } from './tesseractOCRService_OPTIMIZED';
import { processWithBestOCR } from '../../eventos-erp/components/finances/bestOCR';
import { processWithRealGoogleVision } from '../../eventos-erp/components/finances/realGoogleVision';
import { Expense } from '../../eventos/types/Finance';
import { FinancesService } from '../../eventos/services/financesService';

/**
 * MAPEO DE CATEGORÍAS: OCR → Base de Datos
 *
 * El clasificador OCR devuelve categorías como 'compras', 'transporte', etc.
 * Pero la BD usa evt_categorias_gastos con IDs específicos.
 * Este mapeo se debe hacer dinámicamente consultando las categorías existentes.
 *
 * CATEGORÍAS REALES EN BD (según migración 20250929015143_calm_plain.sql):
 * - Servicios Profesionales
 * - Recursos Humanos
 * - Materiales
 * - Combustible/Casetas
 * - Otros
 */
const CATEGORY_NAME_MAP: Record<ExpenseCategory, string> = {
  [ExpenseCategory.COMPRAS]: 'Materiales', // Compras → Materiales
  [ExpenseCategory.TRANSPORTE]: 'Combustible/Casetas', // Transporte → Combustible/Casetas
  [ExpenseCategory.ALIMENTACION]: 'Otros', // Alimentación → Otros
  [ExpenseCategory.HOSPEDAJE]: 'Otros', // Hospedaje → Otros
  [ExpenseCategory.MATERIAL]: 'Materiales', // Material → Materiales
  [ExpenseCategory.EQUIPAMIENTO]: 'Materiales', // Equipamiento → Materiales
  [ExpenseCategory.SERVICIOS]: 'Servicios Profesionales', // Servicios → Servicios Profesionales
  [ExpenseCategory.CONSTRUCCION]: 'Materiales', // Construcción → Materiales
  [ExpenseCategory.OTROS]: 'Otros' // Otros → Otros
};

export interface ExpenseOCRIntegrationResult {
  success: boolean;
  expense?: Partial<Expense>;
  classification: ExpenseClassificationResult;
  warnings: string[];
  errors: string[];
}

/**
 * SERVICIO INTEGRADOR OCR → GASTOS
 */
export class ExpenseOCRIntegrationService {
  private financesService: FinancesService;

  constructor() {
    this.financesService = FinancesService.getInstance();
  }

  /**
   * MÉTODO PRINCIPAL: Procesa un archivo y devuelve datos listos para crear un gasto
   *
   * @param file - Archivo de imagen (ticket, factura, etc.)
   * @param eventoId - ID del evento
   * @param userId - ID del usuario que sube el documento
   * @returns Datos del gasto listos para guardar + clasificación OCR
   */
  async processFileToExpense(
    file: File,
    eventoId: string,
    userId: string
  ): Promise<ExpenseOCRIntegrationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      console.log('🚀 [ExpenseOCRIntegration] Iniciando procesamiento completo...');
      console.log('📄 Archivo:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);

      // PASO 1: Ejecutar OCR base (Google Vision primero, luego fallback)
      console.log('🔍 Paso 1/4: Ejecutando OCR...');
      console.log('📄 Tipo de archivo:', file.type);

      let ocrResult: { texto_completo: string; datos_ticket?: any; datos_factura?: any };

      // ESTRATEGIA: Google Vision PRIMERO, luego fallback
      // (igual que módulo de Eventos)
      try {
        console.log('🔄 Intentando Google Vision PRIMERO...');
        const visionResult = await processWithRealGoogleVision(file);

        if (visionResult.text && visionResult.text.trim().length > 20) {
          console.log('✅ Google Vision exitoso:', visionResult.text.length, 'caracteres');
          ocrResult = {
            texto_completo: visionResult.text,
            datos_ticket: null,
            datos_factura: null
          };
        } else {
          throw new Error('Google Vision: texto muy corto');
        }
      } catch (visionError) {
        console.warn('⚠️ Google Vision falló, usando fallback...', visionError);

        const isPDF = file.type === 'application/pdf';

        if (isPDF) {
          // Para PDFs: usar bestOCR (Tesseract → OCR.space)
          console.log('📄 PDF - usando bestOCR como fallback...');
          const bestResult = await processWithBestOCR(file);
          ocrResult = {
            texto_completo: bestResult.text,
            datos_ticket: null,
            datos_factura: null
          };
        } else {
          // Para imágenes: usar Tesseract
          console.log('🖼️ Imagen - usando Tesseract como fallback...');
          ocrResult = await tesseractOCRService.processDocument(file);
        }
      }

      if (!ocrResult || !ocrResult.texto_completo) {
        errors.push('No se pudo extraer texto del documento');
        throw new Error('OCR falló: No se extrajo texto');
      }

      console.log('✅ OCR completado. Texto extraído:', ocrResult.texto_completo.length, 'caracteres');

      // PASO 2: Clasificación inteligente
      console.log('🧠 Paso 2/4: Clasificando como gasto...');
      const classification = IntelligentExpenseClassifier.classify(
        ocrResult.texto_completo,
        ocrResult.datos_ticket,
        ocrResult.datos_factura
      );

      console.log('✅ Clasificación:', {
        tipo: classification.tipoDocumento,
        categoria: classification.categoriaGasto,
        confianza: classification.confianzaClasificacion + '%'
      });

      // PASO 3: Validar calidad de datos
      console.log('📊 Paso 3/4: Validando datos extraídos...');
      const validationResult = this.validateClassification(classification);
      warnings.push(...validationResult.warnings);
      errors.push(...validationResult.errors);

      // PASO 4: Mapear a estructura de gasto de BD
      console.log('🗄️ Paso 4/4: Mapeando a estructura de BD...');
      const expenseData = await this.mapToExpenseData(
        classification,
        eventoId,
        userId,
        file.name
      );

      // Agregar warnings si hay campos faltantes
      if (classification.validacion.camposFaltantes.length > 0) {
        warnings.push(`Campos faltantes: ${classification.validacion.camposFaltantes.join(', ')}`);
      }

      if (classification.validacion.advertencias.length > 0) {
        warnings.push(...classification.validacion.advertencias);
      }

      // Advertencia si confianza es baja
      if (classification.confianzaClasificacion < 70) {
        warnings.push(`⚠️ Confianza baja (${classification.confianzaClasificacion}%). Revise los datos antes de guardar.`);
      }

      console.log('✅ Procesamiento OCR → Gasto completado');
      console.log('📋 Datos del gasto:', {
        concepto: expenseData.concepto,
        total: expenseData.total,
        proveedor: expenseData.proveedor,
        categoria: expenseData.categoria_id
      });

      return {
        success: errors.length === 0,
        expense: expenseData,
        classification,
        warnings,
        errors
      };

    } catch (error) {
      console.error('❌ [ExpenseOCRIntegration] Error:', error);
      errors.push(error instanceof Error ? error.message : 'Error desconocido');

      return {
        success: false,
        classification: {} as any, // Para evitar crash
        warnings,
        errors
      };
    }
  }

  /**
   * MAPEA la clasificación OCR a la estructura de Expense de la BD
   * Llena TODOS los campos posibles de evt_gastos
   */
  private async mapToExpenseData(
    classification: ExpenseClassificationResult,
    eventoId: string,
    userId: string,
    nombreArchivo: string
  ): Promise<Partial<Expense>> {
    const { datosExtraidos, categoriaGasto, tipoDocumento, confianzaClasificacion } = classification;

    // Obtener ID de categoría de la BD
    const categoriaId = await this.getCategoryIdByName(categoriaGasto);

    // Calcular totales
    const cantidad = 1; // Por defecto 1 para tickets/facturas completas
    const total = datosExtraidos.monto || 0;
    const subtotal = datosExtraidos.subtotal || (total / 1.16); // Si no hay subtotal, calcularlo
    const iva = datosExtraidos.iva || (total - subtotal);
    const iva_porcentaje = subtotal > 0 ? ((iva / subtotal) * 100) : 16;
    const precio_unitario = total; // Para compatibilidad con BD

    // Generar concepto descriptivo
    const concepto = this.generateConcept(datosExtraidos, tipoDocumento);

    // Generar descripción detallada
    const descripcion = this.generateDescription(datosExtraidos, classification);

    // Generar notas con productos/servicios
    const notas = this.generateNotes(datosExtraidos, classification);

    // Datos del gasto completos
    const expenseData: Partial<Expense> = {
      // IDs y relaciones
      evento_id: eventoId,
      categoria_id: categoriaId,

      // Información básica
      concepto,
      descripcion,
      cantidad,
      precio_unitario,

      // Montos calculados
      subtotal,
      iva_porcentaje,
      iva,
      total,

      // Proveedor
      proveedor: datosExtraidos.proveedor?.nombre || 'No especificado',
      rfc_proveedor: datosExtraidos.proveedor?.rfc || null,

      // Fecha
      fecha_gasto: datosExtraidos.fecha || new Date().toISOString().split('T')[0],

      // Pago
      forma_pago: this.normalizeFormaPago(datosExtraidos.formaPago),
      referencia: this.generateReferencia(datosExtraidos, tipoDocumento),

      // Archivo adjunto (se llenará después del upload)
      archivo_adjunto: null,
      archivo_nombre: nombreArchivo,
      archivo_tamaño: 0,
      archivo_tipo: null,

      // Estado de aprobación (por defecto aprobado si confianza > 80)
      status_aprobacion: confianzaClasificacion >= 80 ? 'aprobado' : 'pendiente',

      // Notas
      notas,

      // Campos OCR (NUEVOS - añadidos en migración)
      // documento_ocr_id: null, // Se llenará después de guardar el documento OCR
      // ocr_confianza: confianzaClasificacion,
      // ocr_validado: confianzaClasificacion >= 80,
      // ocr_datos_originales: JSON.stringify(classification),

      // Estado
      activo: true,

      // Metadata
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: userId
    };

    // Agregar campos OCR como any para evitar errores de tipos
    (expenseData as any).ocr_confianza = confianzaClasificacion;
    (expenseData as any).ocr_validado = confianzaClasificacion >= 80;
    (expenseData as any).ocr_datos_originales = JSON.stringify(classification.datosOriginalesOCR);

    return expenseData;
  }

  /**
   * Obtiene el ID de categoría de la BD por nombre
   */
  private async getCategoryIdByName(categoria: ExpenseCategory): Promise<string | undefined> {
    try {
      const categories = await this.financesService.getExpenseCategories();
      const nombreBuscado = CATEGORY_NAME_MAP[categoria];

      // Buscar por nombre exacto o similar
      const found = categories.find(cat =>
        cat.nombre.toLowerCase() === nombreBuscado.toLowerCase() ||
        cat.nombre.toLowerCase().includes(nombreBuscado.toLowerCase()) ||
        nombreBuscado.toLowerCase().includes(cat.nombre.toLowerCase())
      );

      if (found) {
        console.log(`✅ Categoría mapeada: ${categoria} → ${found.nombre} (${found.id})`);
        return found.id;
      }

      // Si no se encuentra, buscar "Otros"
      const otros = categories.find(cat => cat.nombre.toLowerCase().includes('otro'));
      if (otros) {
        console.log(`⚠️ Categoría no encontrada, usando "Otros": ${categoria} → ${otros.nombre}`);
        return otros.id;
      }

      console.warn(`⚠️ No se encontró categoría para: ${categoria}`);
      return undefined;

    } catch (error) {
      console.error('❌ Error obteniendo categorías:', error);
      return undefined;
    }
  }

  /**
   * Genera concepto corto y descriptivo
   */
  private generateConcept(datos: ExpenseClassificationResult['datosExtraidos'], tipo: string): string {
    // Prioridad: proveedor > concepto OCR > tipo de documento
    if (datos.proveedor?.nombre) {
      return `Compra en ${datos.proveedor.nombre}`;
    }

    if (datos.concepto) {
      return datos.concepto.substring(0, 100); // Limitar longitud
    }

    return `Gasto - ${tipo.replace(/_/g, ' ')}`;
  }

  /**
   * Genera descripción detallada
   */
  private generateDescription(
    datos: ExpenseClassificationResult['datosExtraidos'],
    classification: ExpenseClassificationResult
  ): string {
    const parts: string[] = [];

    // Agregar concepto OCR si existe
    if (datos.concepto) {
      parts.push(datos.concepto);
    }

    // Agregar información del proveedor
    if (datos.proveedor?.nombre) {
      parts.push(`Proveedor: ${datos.proveedor.nombre}`);
    }

    // Agregar datos fiscales si existen
    if (datos.uuid) {
      parts.push(`UUID: ${datos.uuid}`);
    }

    if (datos.serie && datos.folio) {
      parts.push(`Serie-Folio: ${datos.serie}-${datos.folio}`);
    }

    // Agregar nota de OCR
    parts.push(`\n[Extraído automáticamente por OCR - Confianza: ${classification.confianzaClasificacion}%]`);

    if (!classification.validacion.datosCompletos) {
      parts.push('[⚠️ REVISAR: Datos incompletos]');
    }

    return parts.join(' | ');
  }

  /**
   * Genera notas con productos/servicios
   */
  private generateNotes(
    datos: ExpenseClassificationResult['datosExtraidos'],
    classification: ExpenseClassificationResult
  ): string {
    const lines: string[] = ['=== DATOS EXTRAÍDOS POR OCR ===', ''];

    // Productos/servicios
    if (datos.items && datos.items.length > 0) {
      lines.push('PRODUCTOS/SERVICIOS:');
      datos.items.forEach((item, i) => {
        const cant = item.cantidad > 1 ? `${item.cantidad}x ` : '';
        lines.push(`  ${i + 1}. ${cant}${item.descripcion} - $${item.importe.toFixed(2)}`);
      });
      lines.push('');
    }

    // Desglose
    if (datos.subtotal && datos.iva) {
      lines.push('DESGLOSE FISCAL:');
      lines.push(`  Subtotal: $${datos.subtotal.toFixed(2)}`);
      lines.push(`  IVA: $${datos.iva.toFixed(2)}`);
      lines.push(`  Total: $${datos.monto?.toFixed(2) || '0.00'}`);
      lines.push('');
    }

    // Información adicional
    if (datos.proveedor?.direccion) {
      lines.push(`Dirección proveedor: ${datos.proveedor.direccion}`);
    }

    // Razonamiento del clasificador
    lines.push('');
    lines.push('=== CLASIFICACIÓN AUTOMÁTICA ===');
    lines.push(`Tipo: ${classification.tipoDocumento}`);
    lines.push(`Categoría: ${classification.categoriaGasto}`);
    lines.push(`Confianza: ${classification.confianzaClasificacion}%`);
    lines.push(`Razonamiento: ${classification.razonamiento.explicacion}`);

    // Advertencias
    if (classification.validacion.advertencias.length > 0) {
      lines.push('');
      lines.push('ADVERTENCIAS:');
      classification.validacion.advertencias.forEach(adv => {
        lines.push(`  - ${adv}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Genera referencia (folio, UUID, etc.)
   */
  private generateReferencia(datos: ExpenseClassificationResult['datosExtraidos'], tipo: string): string {
    // Prioridad: UUID > Serie-Folio > Folio > Tipo de documento
    if (datos.uuid) {
      return `UUID: ${datos.uuid.substring(0, 20)}...`;
    }

    if (datos.serie && datos.folio) {
      return `${datos.serie}-${datos.folio}`;
    }

    if (datos.folio) {
      return datos.folio;
    }

    return `OCR-${tipo}-${Date.now()}`;
  }

  /**
   * Normaliza forma de pago a valores de la BD
   */
  private normalizeFormaPago(forma?: string | null): string {
    if (!forma) return 'efectivo';

    const formaLower = forma.toLowerCase();

    if (formaLower.includes('efectivo') || formaLower.includes('cash')) return 'efectivo';
    if (formaLower.includes('tarjeta') || formaLower.includes('card')) return 'tarjeta';
    if (formaLower.includes('transferencia') || formaLower.includes('transfer')) return 'transferencia';
    if (formaLower.includes('cheque')) return 'cheque';

    return 'efectivo'; // Default
  }

  /**
   * Valida la clasificación y genera warnings/errors
   */
  private validateClassification(classification: ExpenseClassificationResult): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // CAMBIO: Ya no son errores críticos, solo warnings
    // El usuario puede completar manualmente los campos faltantes
    if (!classification.datosExtraidos.monto || classification.datosExtraidos.monto <= 0) {
      warnings.push('⚠️ No se detectó monto válido. Por favor ingrese el monto manualmente.');
    }

    if (!classification.datosExtraidos.fecha) {
      warnings.push('⚠️ No se detectó fecha del documento. Se usará la fecha actual.');
    }

    // Warnings adicionales
    if (!classification.datosExtraidos.proveedor?.nombre) {
      warnings.push('No se identificó el proveedor. Por favor ingrese el nombre del proveedor.');
    }

    if (!classification.datosExtraidos.proveedor?.rfc) {
      warnings.push('No se detectó RFC del proveedor.');
    }

    if (classification.confianzaClasificacion < 60) {
      warnings.push('⚠️ Confianza muy baja en la clasificación. Revise todos los campos antes de guardar.');
    }

    // Validación fiscal
    if (classification.datosExtraidos.subtotal && classification.datosExtraidos.iva && classification.datosExtraidos.monto) {
      const calculado = classification.datosExtraidos.subtotal + classification.datosExtraidos.iva;
      const diferencia = Math.abs(calculado - classification.datosExtraidos.monto);

      if (diferencia > 1) {
        warnings.push(`Posible error de cálculo: Subtotal + IVA no coincide con Total (dif: $${diferencia.toFixed(2)})`);
      }
    }

    return { warnings, errors };
  }

  /**
   * Helper: Crea el gasto directamente en la BD
   */
  async createExpenseDirectly(
    expenseData: Partial<Expense>
  ): Promise<Expense> {
    return await this.financesService.createExpense(expenseData);
  }
}

// Singleton
export const expenseOCRIntegration = new ExpenseOCRIntegrationService();
