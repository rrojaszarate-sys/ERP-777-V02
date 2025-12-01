/**
 * SERVICIO INTEGRADOR OCR SUPABASE → GASTOS
 *
 * Conecta OCR de Supabase Edge Functions con módulo de gastos
 * Incluye guardado automático y versionado
 */

import { ocrSupabaseService, OCRSupabaseResult } from './ocrService.supabase';
import { Expense } from '../../eventos-erp/types/Finance';
import { FinancesService } from '../../eventos-erp/services/financesService';

export interface ExpenseFromOCRSupabaseResult {
  success: boolean;
  expense: Partial<Expense>;
  ocr_result: OCRSupabaseResult;
  ocr_document_id?: string;
  warnings: string[];
  calidad: 'excelente' | 'buena' | 'regular' | 'baja';
}

class ExpenseOCRSupabaseService {
  private financesService: FinancesService;

  constructor() {
    this.financesService = FinancesService.getInstance();
  }

  /**
   * Procesa archivo y crea estructura de gasto
   * El archivo YA se guardó en bucket con versionado por la Edge Function
   */
  async processFileToExpense(
    file: File,
    eventoId: string,
    userId: string
  ): Promise<ExpenseFromOCRSupabaseResult> {
    const warnings: string[] = [];

    console.log('🚀 [ExpenseOCRSupabase] Procesando archivo...');

    try {
      // PASO 1: Procesar con OCR (automáticamente guarda en bucket)
      const ocrResult = await ocrSupabaseService.processDocument(file, eventoId, userId);

      if (!ocrResult.success) {
        throw new Error(ocrResult.error || 'Error en procesamiento OCR');
      }

      console.log('✅ OCR completado');
      console.log('📁 Archivo guardado:', ocrResult.archivo.path);
      console.log('🔢 Versión:', ocrResult.archivo.version);
      console.log('📊 Confianza:', ocrResult.confianza_general + '%');

      // PASO 2: Evaluar calidad
      const { calidad, advertencias } = this.evaluarCalidadDatos(ocrResult);
      warnings.push(...advertencias);

      console.log('📈 Calidad:', calidad);

      // PASO 3: Mapear a estructura de Expense
      const expense = await this.mapearAGasto(ocrResult, eventoId, userId);

      console.log('✅ Gasto mapeado');

      return {
        success: true,
        expense,
        ocr_result: ocrResult,
        warnings,
        calidad
      };

    } catch (error) {
      console.error('❌ [ExpenseOCRSupabase] Error:', error);
      throw error;
    }
  }

  /**
   * Evalúa calidad de datos extraídos
   */
  private evaluarCalidadDatos(ocrResult: OCRSupabaseResult): {
    calidad: 'excelente' | 'buena' | 'regular' | 'baja';
    advertencias: string[];
  } {
    const advertencias: string[] = [];
    let puntos = 0;

    const datos = ocrResult.datos_extraidos;

    // Confianza OCR (40 pts)
    puntos += (ocrResult.confianza_general / 100) * 40;

    // Total detectado (30 pts)
    if (datos.total && datos.total > 0) {
      puntos += 30;
    } else {
      advertencias.push('⚠️ No se detectó el total. Ingrese manualmente.');
    }

    // Proveedor detectado (15 pts)
    if (datos.establecimiento) {
      puntos += 15;
    } else {
      advertencias.push('⚠️ No se detectó el proveedor.');
    }

    // Fecha detectada (10 pts)
    if (datos.fecha) {
      puntos += 10;
    } else {
      advertencias.push('⚠️ No se detectó la fecha. Se usará la actual.');
    }

    // RFC detectado (5 pts bonus)
    if (datos.rfc) {
      puntos += 5;
    }

    // Determinar calidad
    let calidad: 'excelente' | 'buena' | 'regular' | 'baja';
    if (puntos >= 85) {
      calidad = 'excelente';
    } else if (puntos >= 70) {
      calidad = 'buena';
    } else if (puntos >= 50) {
      calidad = 'regular';
      advertencias.push('⚠️ Calidad regular. Revise todos los campos.');
    } else {
      calidad = 'baja';
      advertencias.push('❌ Calidad baja. Revise y complete todos los campos.');
    }

    return { calidad, advertencias };
  }

  /**
   * Mapea resultado OCR a estructura de Expense
   */
  private async mapearAGasto(
    ocrResult: OCRSupabaseResult,
    eventoId: string,
    userId: string
  ): Promise<Partial<Expense>> {
    const datos = ocrResult.datos_extraidos;
    const archivo = ocrResult.archivo;

    // Obtener categoría ID
    const categoriaId = await this.obtenerCategoriaId(datos.establecimiento);

    // Calcular totales
    const total = datos.total || 0;
    let subtotal = datos.subtotal || 0;
    let iva = datos.iva || 0;

    if (total > 0 && (!subtotal || !iva)) {
      subtotal = total / 1.16;
      iva = total - subtotal;
    }

    // Generar datos del gasto
    return {
      evento_id: eventoId,
      categoria_id: categoriaId,
      concepto: this.generarConcepto(datos),
      descripcion: this.generarDescripcion(datos, ocrResult),
      cantidad: 1,
      precio_unitario: total,
      subtotal: Math.round(subtotal * 100) / 100,
      iva_porcentaje: subtotal > 0 ? Math.round((iva / subtotal) * 100 * 100) / 100 : 16,
      iva: Math.round(iva * 100) / 100,
      total: Math.round(total * 100) / 100,
      proveedor: datos.establecimiento || 'No especificado',
      rfc_proveedor: datos.rfc || null,
      fecha_gasto: this.normalizarFecha(datos.fecha),
      forma_pago: datos.forma_pago || 'efectivo',
      referencia: `OCR-v${archivo.version}-${Date.now()}`,

      // Datos del archivo (ya está guardado en bucket)
      archivo_adjunto: archivo.url,
      archivo_nombre: archivo.path.split('/').pop() || '',
      archivo_tipo: 'image/jpeg',

      notas: this.generarNotas(datos, ocrResult),
      status_aprobacion: ocrResult.confianza_general >= 85 ? 'aprobado' : 'pendiente',
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: userId
    };
  }

  /**
   * Obtiene ID de categoría basado en establecimiento
   */
  private async obtenerCategoriaId(establecimiento: string | null): Promise<string | undefined> {
    if (!establecimiento) return undefined;

    const estabLower = establecimiento.toLowerCase();
    let nombreCategoria = 'Otros';

    if (estabLower.match(/pemex|shell|mobil|bp|gasolina|diesel|combustible/)) {
      nombreCategoria = 'Combustible/Casetas';
    } else if (estabLower.match(/oxxo|walmart|soriana|chedraui|costco|sams|7-eleven/)) {
      nombreCategoria = 'Materiales';
    } else if (estabLower.match(/consultor|asesor|abogado|contador|notario|profesional/)) {
      nombreCategoria = 'Servicios Profesionales';
    }

    try {
      const categories = await this.financesService.getExpenseCategories();
      const found = categories.find(cat =>
        cat.nombre.toLowerCase().includes(nombreCategoria.toLowerCase())
      );

      if (found) {
        console.log(`✅ Categoría: ${nombreCategoria} → ${found.nombre}`);
        return found.id;
      }

      const otros = categories.find(cat => cat.nombre.toLowerCase().includes('otro'));
      return otros?.id;
    } catch (error) {
      console.error('❌ Error obteniendo categorías:', error);
      return undefined;
    }
  }

  private generarConcepto(datos: OCRSupabaseResult['datos_extraidos']): string {
    if (datos.establecimiento) {
      return `Compra en ${datos.establecimiento}`;
    }
    if (datos.productos.length > 0) {
      return `Compra de ${datos.productos.length} producto(s)`;
    }
    return 'Gasto procesado con OCR';
  }

  private generarDescripcion(
    datos: OCRSupabaseResult['datos_extraidos'],
    ocrResult: OCRSupabaseResult
  ): string {
    const parts: string[] = [];

    if (datos.establecimiento) parts.push(`Proveedor: ${datos.establecimiento}`);
    if (datos.direccion) parts.push(`Dirección: ${datos.direccion}`);
    if (datos.rfc) parts.push(`RFC: ${datos.rfc}`);
    if (datos.telefono) parts.push(`Tel: ${datos.telefono}`);

    parts.push(`\n[OCR: Google Vision - Confianza: ${ocrResult.confianza_general}%]`);
    parts.push(`[Versión: ${ocrResult.archivo.version}]`);

    return parts.join(' | ');
  }

  private generarNotas(
    datos: OCRSupabaseResult['datos_extraidos'],
    ocrResult: OCRSupabaseResult
  ): string {
    const lines: string[] = ['=== DATOS EXTRAÍDOS POR OCR ===', ''];

    if (datos.productos.length > 0) {
      lines.push('PRODUCTOS:');
      datos.productos.forEach((prod, i) => {
        lines.push(`  ${i + 1}. ${prod.nombre} - $${prod.precio_unitario.toFixed(2)}`);
      });
      lines.push('');
    }

    if (datos.subtotal && datos.iva) {
      lines.push('DESGLOSE:');
      lines.push(`  Subtotal: $${datos.subtotal.toFixed(2)}`);
      lines.push(`  IVA: $${datos.iva.toFixed(2)}`);
      lines.push(`  Total: $${datos.total?.toFixed(2) || '0.00'}`);
      lines.push('');
    }

    lines.push(`Procesador: ${ocrResult.procesador}`);
    lines.push(`Confianza: ${ocrResult.confianza_general}%`);
    lines.push(`Archivo: ${ocrResult.archivo.path}`);
    lines.push(`Versión: ${ocrResult.archivo.version}`);

    return lines.join('\n');
  }

  private normalizarFecha(fecha: string | null): string {
    if (!fecha) return new Date().toISOString().split('T')[0];

    try {
      const match = fecha.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (match) {
        let [_, day, month, year] = match;
        if (year.length === 2) year = '20' + year;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (error) {
      console.warn('⚠️ Error parseando fecha:', fecha);
    }

    return new Date().toISOString().split('T')[0];
  }
}

// Singleton
export const expenseOCRSupabaseService = new ExpenseOCRSupabaseService();
