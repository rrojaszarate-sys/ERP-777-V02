/**
 * SERVICIO INTEGRADOR OCR → GASTOS V2
 *
 * Conecta el OCR V2 (Google Vision/Tesseract) con el módulo de gastos
 * Asegura calidad de datos y mapeo correcto a base de datos
 */

import { ocrServiceV2, OCRResult } from './ocrService.v2';
import { Expense } from '../../eventos-erp/types/Finance';
import { FinancesService } from '../../eventos-erp/services/financesService';

export interface ExpenseFromOCRResult {
  success: boolean;
  expense: Partial<Expense>;
  ocr_result: OCRResult;
  warnings: string[];
  calidad: 'excelente' | 'buena' | 'regular' | 'baja';
}

/**
 * MAPEO DE CATEGORÍAS
 * Mapea categorías detectadas a categorías reales de BD
 */
const CATEGORY_MAP: Record<string, string> = {
  // Materiales
  'materiales': 'Materiales',
  'compras': 'Materiales',
  'suministros': 'Materiales',
  'papeleria': 'Materiales',
  'equipo': 'Materiales',

  // Combustible/Casetas
  'combustible': 'Combustible/Casetas',
  'gasolina': 'Combustible/Casetas',
  'diesel': 'Combustible/Casetas',
  'casetas': 'Combustible/Casetas',
  'transporte': 'Combustible/Casetas',

  // Servicios Profesionales
  'servicios': 'Servicios Profesionales',
  'consultoria': 'Servicios Profesionales',
  'asesoria': 'Servicios Profesionales',
  'profesional': 'Servicios Profesionales',

  // Recursos Humanos
  'nomina': 'Recursos Humanos',
  'personal': 'Recursos Humanos',
  'sueldos': 'Recursos Humanos',
  'salarios': 'Recursos Humanos',

  // Otros (fallback)
  'otros': 'Otros',
  'varios': 'Otros',
  'miscelaneos': 'Otros'
};

class ExpenseOCRServiceV2 {
  private financesService: FinancesService;

  constructor() {
    this.financesService = FinancesService.getInstance();
  }

  /**
   * Procesa un archivo y devuelve datos listos para crear un gasto
   */
  async processFileToExpense(
    file: File,
    eventoId: string,
    userId: string
  ): Promise<ExpenseFromOCRResult> {
    const warnings: string[] = [];

    console.log('🚀 [ExpenseOCRV2] Iniciando procesamiento...');

    // Paso 1: Procesar con OCR
    const ocrResult = await ocrServiceV2.processDocument(file);

    if (!ocrResult.success) {
      throw new Error('Error en procesamiento OCR');
    }

    console.log('✅ OCR completado con', ocrResult.procesador);
    console.log('📊 Confianza:', ocrResult.confianza_general + '%');

    if (ocrResult.warning) {
      warnings.push(ocrResult.warning);
    }

    // Paso 2: Validar calidad de datos
    const { calidad, advertencias } = this.evaluarCalidadDatos(ocrResult);
    warnings.push(...advertencias);

    console.log('📈 Calidad de datos:', calidad);

    // Paso 3: Mapear a estructura de Expense
    const expense = await this.mapearAGasto(ocrResult, eventoId, userId, file.name);

    console.log('✅ Gasto mapeado:', {
      concepto: expense.concepto,
      total: expense.total,
      proveedor: expense.proveedor,
      categoria: expense.categoria_id
    });

    return {
      success: true,
      expense,
      ocr_result: ocrResult,
      warnings,
      calidad
    };
  }

  /**
   * Evalúa la calidad de los datos extraídos
   */
  private evaluarCalidadDatos(ocrResult: OCRResult): {
    calidad: 'excelente' | 'buena' | 'regular' | 'baja';
    advertencias: string[];
  } {
    const advertencias: string[] = [];
    let puntos = 0;
    const max = 100;

    const datos = ocrResult.datos_extraidos;

    // Confianza OCR (40 puntos)
    puntos += (ocrResult.confianza_general / 100) * 40;

    // Total detectado (30 puntos)
    if (datos.total && datos.total > 0) {
      puntos += 30;
    } else {
      advertencias.push('⚠️ No se detectó el total. Ingrese manualmente.');
    }

    // Proveedor detectado (15 puntos)
    if (datos.establecimiento) {
      puntos += 15;
    } else {
      advertencias.push('⚠️ No se detectó el proveedor.');
    }

    // Fecha detectada (10 puntos)
    if (datos.fecha) {
      puntos += 10;
    } else {
      advertencias.push('⚠️ No se detectó la fecha. Se usará la actual.');
    }

    // RFC detectado (5 puntos bonus)
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
    ocrResult: OCRResult,
    eventoId: string,
    userId: string,
    nombreArchivo: string
  ): Promise<Partial<Expense>> {
    const datos = ocrResult.datos_extraidos;

    // Obtener categoría ID
    const categoriaId = await this.obtenerCategoriaId(datos.establecimiento);

    // Calcular totales
    const total = datos.total || 0;
    let subtotal = datos.subtotal || 0;
    let iva = datos.iva || 0;

    // Si falta subtotal o IVA, calcular
    if (total > 0) {
      if (!subtotal && !iva) {
        // Calcular asumiendo IVA 16%
        subtotal = total / 1.16;
        iva = total - subtotal;
      } else if (!subtotal && iva) {
        subtotal = total - iva;
      } else if (subtotal && !iva) {
        iva = total - subtotal;
      }
    }

    // Generar concepto descriptivo
    const concepto = this.generarConcepto(datos, nombreArchivo);

    // Generar descripción
    const descripcion = this.generarDescripcion(datos, ocrResult);

    // Generar notas con productos
    const notas = this.generarNotas(datos, ocrResult);

    return {
      evento_id: eventoId,
      categoria_id: categoriaId,
      concepto,
      descripcion,
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
      referencia: `OCR-${ocrResult.procesador}-${Date.now()}`,
      archivo_nombre: nombreArchivo,
      notas,
      status_aprobacion: ocrResult.confianza_general >= 85 ? 'aprobado' : 'pendiente',
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: userId
    };
  }

  /**
   * Obtiene ID de categoría basado en establecimiento detectado
   */
  private async obtenerCategoriaId(establecimiento: string | null): Promise<string | undefined> {
    if (!establecimiento) {
      return undefined;
    }

    const estabLower = establecimiento.toLowerCase();

    // Detectar tipo de establecimiento
    let nombreCategoria = 'Otros';

    if (estabLower.match(/pemex|shell|mobil|bp|gasolina|diesel|combustible/)) {
      nombreCategoria = 'Combustible/Casetas';
    } else if (estabLower.match(/oxxo|walmart|soriana|chedraui|costco|sams|7-eleven|liverpool|palacio/)) {
      nombreCategoria = 'Materiales';
    } else if (estabLower.match(/consultor|asesor|abogado|contador|notario|profesional/)) {
      nombreCategoria = 'Servicios Profesionales';
    }

    // Buscar en BD
    try {
      const categories = await this.financesService.getExpenseCategories();
      const found = categories.find(cat =>
        cat.nombre.toLowerCase() === nombreCategoria.toLowerCase() ||
        cat.nombre.toLowerCase().includes(nombreCategoria.toLowerCase())
      );

      if (found) {
        console.log(`✅ Categoría detectada: ${nombreCategoria} → ${found.nombre}`);
        return found.id;
      }

      // Fallback a "Otros"
      const otros = categories.find(cat => cat.nombre.toLowerCase().includes('otro'));
      return otros?.id;
    } catch (error) {
      console.error('❌ Error obteniendo categorías:', error);
      return undefined;
    }
  }

  /**
   * Genera concepto descriptivo
   */
  private generarConcepto(datos: OCRResult['datos_extraidos'], archivo: string): string {
    if (datos.establecimiento) {
      return `Compra en ${datos.establecimiento}`;
    }

    if (datos.productos.length > 0) {
      return `Compra de ${datos.productos.length} producto(s)`;
    }

    return `Gasto - ${archivo.replace(/\.[^/.]+$/, '')}`;
  }

  /**
   * Genera descripción detallada
   */
  private generarDescripcion(
    datos: OCRResult['datos_extraidos'],
    ocrResult: OCRResult
  ): string {
    const parts: string[] = [];

    if (datos.establecimiento) {
      parts.push(`Proveedor: ${datos.establecimiento}`);
    }

    if (datos.direccion) {
      parts.push(`Dirección: ${datos.direccion}`);
    }

    if (datos.rfc) {
      parts.push(`RFC: ${datos.rfc}`);
    }

    if (datos.telefono) {
      parts.push(`Tel: ${datos.telefono}`);
    }

    parts.push(`\n[OCR: ${ocrResult.procesador} - Confianza: ${ocrResult.confianza_general}%]`);

    return parts.join(' | ');
  }

  /**
   * Genera notas con productos
   */
  private generarNotas(
    datos: OCRResult['datos_extraidos'],
    ocrResult: OCRResult
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

    return lines.join('\n');
  }

  /**
   * Normaliza fecha al formato YYYY-MM-DD
   */
  private normalizarFecha(fecha: string | null): string {
    if (!fecha) {
      return new Date().toISOString().split('T')[0];
    }

    try {
      // Intentar parsear DD/MM/YYYY o DD-MM-YYYY
      const match = fecha.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (match) {
        let [_, day, month, year] = match;

        // Convertir año de 2 dígitos a 4
        if (year.length === 2) {
          year = '20' + year;
        }

        // Formato YYYY-MM-DD
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (error) {
      console.warn('⚠️ Error parseando fecha:', fecha);
    }

    return new Date().toISOString().split('T')[0];
  }
}

// Singleton
export const expenseOCRServiceV2 = new ExpenseOCRServiceV2();
