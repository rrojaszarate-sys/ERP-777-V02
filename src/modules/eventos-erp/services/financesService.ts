import { supabase } from '../../../core/config/supabase';
import { Income, Expense, ExpenseCategory, FinancialSummary } from '../types/Finance';
import { MEXICAN_CONFIG } from '../../../core/config/constants';
import type { OCRDocument } from '../../ocr/types/OCRTypes';

export class FinancesService {
  private static instance: FinancesService;

  private constructor() {}

  public static getInstance(): FinancesService {
    if (!FinancesService.instance) {
      FinancesService.instance = new FinancesService();
    }
    return FinancesService.instance;
  }

  // Income operations
  async getIncomes(eventId: string): Promise<Income[]> {
    try {
      const { data, error } = await supabase
        .from('evt_ingresos_erp')
        .select('*')
        .eq('evento_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching incomes:', error);
      return [];
    }
  }

  async createIncome(incomeData: Partial<Income>): Promise<Income> {
    try {
      console.log('📥 [createIncome] Datos recibidos:', incomeData);
      
      // ✅ Los cálculos ya vienen del formulario o se hacen desde el total
      // El trigger de BD también recalcula si es necesario
      
            // ✅ DESPUÉS DE EJECUTAR LA MIGRACIÓN SQL:
      // Ya no es necesario filtrar campos, ingresos_erp tiene los mismos campos que gastos_erp
      
      // Solo remover campos obsoletos que ya no se usan
      const {
        cantidad, // ❌ Campo obsoleto
        precio_unitario, // ❌ Campo obsoleto
        fecha_gasto, // ❌ Para ingresos se usa fecha_ingreso
        ...cleanIncomeData
      } = incomeData as any;

      // 🔧 FIX CRÍTICO: Convertir strings vacíos a null para campos DATE
      // PostgreSQL no acepta '' en campos DATE, debe ser null o una fecha válida
      const dateFields = ['fecha_facturacion', 'fecha_cobro', 'fecha_compromiso_pago', 'fecha_ingreso'];
      dateFields.forEach(field => {
        if (cleanIncomeData[field] === '' || cleanIncomeData[field] === undefined) {
          cleanIncomeData[field] = null;
        }
      });

      console.log('📥 [createIncome] Datos a insertar:', cleanIncomeData);
      console.log('🗑️ [createIncome] Campos obsoletos removidos:', { cantidad, precio_unitario, fecha_gasto });
      console.log('📅 [createIncome] Fechas validadas:', {
        fecha_facturacion: cleanIncomeData.fecha_facturacion,
        fecha_cobro: cleanIncomeData.fecha_cobro,
        fecha_compromiso_pago: cleanIncomeData.fecha_compromiso_pago,
        fecha_ingreso: cleanIncomeData.fecha_ingreso
      });

      const { data, error } = await supabase
        .from('evt_ingresos_erp')
        .insert([{
          ...cleanIncomeData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [createIncome] Error de Supabase:', error);
        throw error;
      }
      
      console.log('✅ [createIncome] Ingreso creado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ [createIncome] Error general:', error);
      throw error;
    }
  }

  async updateIncome(id: string, incomeData: Partial<Income>, lastUpdatedAt?: string): Promise<Income> {
    try {
      // Recalculate totals if amounts changed
      let calculatedData = { ...incomeData };

      // 🔧 FIX CRÍTICO: Convertir strings vacíos a null para campos DATE
      // PostgreSQL no acepta '' en campos DATE, debe ser null o una fecha válida
      const dateFields = ['fecha_facturacion', 'fecha_cobro', 'fecha_compromiso_pago', 'fecha_ingreso'];
      dateFields.forEach(field => {
        if ((calculatedData as any)[field] === '' || (calculatedData as any)[field] === undefined) {
          (calculatedData as any)[field] = null;
        }
      });

      if (incomeData.cantidad !== undefined || incomeData.precio_unitario !== undefined) {
        const currentIncome = await this.getIncomeById(id);
        const cantidad = incomeData.cantidad ?? currentIncome?.cantidad ?? 1;
        const precio = incomeData.precio_unitario ?? currentIncome?.precio_unitario ?? 0;
        const ivaRate = incomeData.iva_porcentaje ?? currentIncome?.iva_porcentaje ?? MEXICAN_CONFIG.ivaRate;

        const subtotal = cantidad * precio;
        const iva = subtotal * (ivaRate / 100);
        const total = subtotal + iva;

        calculatedData = {
          ...calculatedData,
          subtotal,
          iva,
          total
        };
      }

      // 🔧 FIX: Bloqueo optimista para evitar race conditions
      let query = supabase
        .from('evt_ingresos_erp')
        .update({
          ...calculatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      // Si se proporciona lastUpdatedAt, verificar que no haya cambiado
      if (lastUpdatedAt) {
        query = query.eq('updated_at', lastUpdatedAt);
      }

      const { data, error } = await query.select().single();

      if (error) {
        // Si no se actualizó ningún registro, puede ser race condition
        if (error.code === 'PGRST116') {
          throw new Error('El ingreso fue modificado por otro usuario. Por favor, recarga los datos e intenta de nuevo.');
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error updating income:', error);
      throw error;
    }
  }

  async deleteIncome(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('evt_ingresos_erp')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting income:', error);
      throw error;
    }
  }

  private async getIncomeById(id: string): Promise<Income | null> {
    try {
      const { data, error } = await supabase
        .from('evt_ingresos_erp')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  }

  // Expense operations
  async getExpenses(eventId: string): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('evt_gastos_erp')
        .select(`
          *,
          categoria:evt_categorias_gastos_erp(id, nombre, color)
        `)
        .eq('evento_id', eventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
  }

  async createExpense(expenseData: Partial<Expense>): Promise<Expense> {
    try {
      console.log('🚀 [financesService.createExpense] Iniciando creación de gasto');
      console.log('📋 [financesService] Datos recibidos:', expenseData);
      console.log('🛒 [financesService] detalle_compra:', expenseData.detalle_compra);
      
      // Validar y parsear detalle_compra si viene como string
      let detalleCompraFinal = expenseData.detalle_compra;
      if (typeof detalleCompraFinal === 'string' && detalleCompraFinal) {
        try {
          const parsed = JSON.parse(detalleCompraFinal);
          console.log('  ✅ detalle_compra parseado correctamente:', parsed);
          console.log('  📊 Número de items:', Array.isArray(parsed) ? parsed.length : 0);
          detalleCompraFinal = parsed; // Usar el objeto parseado
        } catch {
          console.warn('  ⚠️ detalle_compra no es JSON válido, guardando como está');
        }
      }
      
      // Calculate totals ONLY if not provided (preserve OCR values)
      const hasProvidedTotal = expenseData.total && expenseData.total > 0;
      
      let cantidad: number, precio_unitario: number, subtotal: number, iva: number, total: number;
      
      if (hasProvidedTotal) {
        // Preserve OCR-provided total
        console.log('  ✅ Usando total del OCR:', expenseData.total);
        total = expenseData.total!;
        subtotal = expenseData.subtotal || (total / (1 + (expenseData.iva_porcentaje || MEXICAN_CONFIG.ivaRate) / 100));
        iva = total - subtotal;
        
        // 🔧 CORRECCIÓN: Calcular cantidad y precio_unitario desde el total si no vienen
        if (!expenseData.cantidad || !expenseData.precio_unitario) {
          cantidad = expenseData.cantidad || 1;
          precio_unitario = total; // El precio unitario es el total cuando hay 1 item
          console.log('  📊 Calculados automáticamente: cantidad=', cantidad, 'precio_unitario=', precio_unitario);
        } else {
          cantidad = expenseData.cantidad;
          precio_unitario = expenseData.precio_unitario;
        }
      } else {
        // Calculate from cantidad and precio_unitario
        console.log('  🧮 Calculando total desde cantidad/precio_unitario');
        cantidad = expenseData.cantidad || 1;
        precio_unitario = expenseData.precio_unitario || 0;
        subtotal = cantidad * precio_unitario;
        iva = subtotal * ((expenseData.iva_porcentaje || MEXICAN_CONFIG.ivaRate) / 100);
        total = subtotal + iva;
      }

      const dataToInsert: any = {
        ...expenseData,
        detalle_compra: detalleCompraFinal, // Usar el detalle validado
        cantidad,           // ✅ Usar valores calculados/preservados
        precio_unitario,    // ✅ Usar valores calculados/preservados
        subtotal,           // ✅ Usar valores calculados/preservados
        iva,                // ✅ Usar valores calculados/preservados
        total,              // ✅ Usar valores calculados/preservados
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 🛠️ LIMPIEZA: Eliminar propiedades obsoletas que causan error en Supabase
      const camposEliminados: string[] = [];
      const camposAEliminar = [
        '_detalle_compra_json',
        'direccion_proveedor',
        'email_proveedor',
        'uso_cfdi',
        'regimen_fiscal_receptor',
        'regimen_fiscal_emisor', // ❌ No existe en gastos_erp
        'establecimiento_info',
        'folio', // Solo existe folio_fiscal y folio_interno
        'regimen_fiscal' // Campo diferente a regimen_fiscal_receptor
      ];

      camposAEliminar.forEach(campo => {
        if (dataToInsert[campo] !== undefined) {
          camposEliminados.push(campo);
          delete dataToInsert[campo];
        }
      });

      if (camposEliminados.length > 0) {
        console.log('🧹 [financesService] Campos eliminados (no existen en BD):', camposEliminados.join(', '));
      }

      // 🔧 CORRECCIÓN CRÍTICA: Convertir cadenas vacías a null para campos numéricos
      const camposNumericos = ['categoria_id', 'cantidad', 'precio_unitario', 'subtotal', 'iva', 'total', 'tipo_cambio'];
      camposNumericos.forEach(campo => {
        if (dataToInsert[campo] === '' || dataToInsert[campo] === null || dataToInsert[campo] === undefined) {
          if (campo === 'cantidad') {
            dataToInsert[campo] = 1;
          } else if (campo === 'precio_unitario') {
            dataToInsert[campo] = 0;
          } else if (campo === 'tipo_cambio') {
            // 🔧 FIX: tipo_cambio solo aplica para moneda extranjera
            // Si moneda es MXN o no se especifica, tipo_cambio debe ser null
            const esMonedaExtranjera = dataToInsert.moneda && dataToInsert.moneda !== 'MXN';
            dataToInsert[campo] = esMonedaExtranjera ? 1 : null;
          } else {
            // categoria_id y otros pueden ser null
            dataToInsert[campo] = null;
          }
          console.log(`  🔧 Campo ${campo} convertido de "" a ${dataToInsert[campo]}`);
        }
      });
      
      console.log('📤 [financesService] Datos a insertar en BD:', dataToInsert);
      console.log('🛒 [financesService] detalle_compra final:', dataToInsert.detalle_compra);

      const { data, error } = await supabase
        .from('evt_gastos_erp')
        .insert([dataToInsert])
        .select(`
          *,
          categoria:evt_categorias_gastos_erp(id, nombre, color)
        `)
        .single();

      if (error) {
        console.error('❌ [financesService] Error de Supabase:', error);
        throw error;
      }
      
      console.log('✅ [financesService] Gasto creado exitosamente:', data);
      console.log('🛒 [financesService] detalle_compra guardado:', data.detalle_compra);
      
      return data;
    } catch (error) {
      console.error('❌ [financesService] Error creating expense:', error);
      throw error;
    }
  }

  async updateExpense(id: string, expenseData: Partial<Expense>, lastUpdatedAt?: string): Promise<Expense> {
    try {
      console.log('🔄 updateExpense - datos recibidos:', expenseData);

      // Obtener datos actuales del gasto
      const currentExpense = await this.getExpenseById(id);
      console.log('📄 Gasto actual en BD:', currentExpense);

      // 🎯 LÓGICA SIMPLIFICADA: Solo actualizar lo que viene en expenseData
      // Si vienen valores calculados del formulario, usarlos directamente
      let calculatedData = { ...expenseData };

      // 🔧 FIX CRÍTICO: Convertir strings vacíos a null para campos DATE
      const dateFields = ['fecha_gasto', 'fecha_pago', 'fecha_factura'];
      dateFields.forEach(field => {
        if ((calculatedData as any)[field] === '' || (calculatedData as any)[field] === undefined) {
          (calculatedData as any)[field] = null;
        }
      });

      // 🔧 FIX: tipo_cambio solo aplica para moneda extranjera
      if (calculatedData.tipo_cambio === '' || calculatedData.tipo_cambio === undefined || calculatedData.tipo_cambio === null) {
        const moneda = calculatedData.moneda || currentExpense?.moneda || 'MXN';
        (calculatedData as any).tipo_cambio = moneda !== 'MXN' ? 1 : null;
      }
      
      // ✅ REGLA: Si NO vienen campos monetarios, preservar los actuales
      // Esto evita que se recalculen incorrectamente
      if (calculatedData.total === undefined) {
        calculatedData.total = currentExpense?.total ?? 0;
      }
      if (calculatedData.subtotal === undefined) {
        calculatedData.subtotal = currentExpense?.subtotal ?? 0;
      }
      if (calculatedData.iva === undefined) {
        calculatedData.iva = currentExpense?.iva ?? 0;
      }
      if (calculatedData.cantidad === undefined) {
        calculatedData.cantidad = currentExpense?.cantidad ?? 1;
      }
      if (calculatedData.precio_unitario === undefined) {
        calculatedData.precio_unitario = currentExpense?.precio_unitario ?? 0;
      }
      
      console.log('📊 Valores finales para actualizar:', {
        cantidad: calculatedData.cantidad,
        precio_unitario: calculatedData.precio_unitario,
        subtotal: calculatedData.subtotal,
        iva: calculatedData.iva,
        total: calculatedData.total
      });

      // 🛠️ LIMPIEZA: Eliminar campos que no existen en BD
      const camposAEliminar = [
        '_detalle_compra_json',
        'direccion_proveedor',
        'email_proveedor',
        'uso_cfdi',
        'regimen_fiscal_receptor',
        'establecimiento_info',
        'folio',
        'regimen_fiscal',
        'categoria' // No actualizar categoria directamente, solo categoria_id
      ];

      camposAEliminar.forEach(campo => {
        if (calculatedData[campo as keyof typeof calculatedData] !== undefined) {
          delete calculatedData[campo as keyof typeof calculatedData];
        }
      });

      // 📎 PRESERVAR archivo adjunto si no se proporciona uno nuevo
      if (!calculatedData.archivo_adjunto && currentExpense?.archivo_adjunto) {
        console.log('📎 Preservando archivo adjunto existente:', currentExpense.archivo_adjunto);
        calculatedData.archivo_adjunto = currentExpense.archivo_adjunto;
      }

      // 🔧 FIX: Bloqueo optimista para evitar race conditions
      let query = supabase
        .from('evt_gastos_erp')
        .update({
          ...calculatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      // Si se proporciona lastUpdatedAt, verificar que no haya cambiado
      if (lastUpdatedAt) {
        query = query.eq('updated_at', lastUpdatedAt);
      }

      const { data, error} = await query
        .select(`
          *,
          categoria:evt_categorias_gastos_erp(id, nombre, color)
        `)
        .single();

      if (error) {
        // Si no se actualizó ningún registro, puede ser race condition
        if (error.code === 'PGRST116') {
          throw new Error('El gasto fue modificado por otro usuario. Por favor, recarga los datos e intenta de nuevo.');
        }
        console.error('❌ Error actualizando gasto:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  async deleteExpense(id: string, reason?: string, userId?: string): Promise<void> {
    try {
      // Handle mock development user - set to null to avoid foreign key constraint
      const deletedBy = userId === '00000000-0000-0000-0000-000000000001' ? null : userId;
      
      // Soft delete
      const { error } = await supabase
        .from('evt_gastos_erp')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
          delete_reason: reason,
          activo: false
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  private async getExpenseById(id: string): Promise<Expense | null> {
    try {
      const { data, error } = await supabase
        .from('evt_gastos_erp')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  }

  // Categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    try {
      const { data, error } = await supabase
        .from('evt_categorias_gastos_erp')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      return [];
    }
  }

  // Financial summary
  async getFinancialSummary(eventId: string): Promise<FinancialSummary> {
    try {
      const [ingresos, gastos] = await Promise.all([
        this.getIncomes(eventId),
        this.getExpenses(eventId)
      ]);

      const total_ingresos = ingresos.reduce((sum, ing) => sum + ing.total, 0);
      const total_gastos = gastos.reduce((sum, gasto) => sum + gasto.total, 0);
      const utilidad = total_ingresos - total_gastos;
      const margen_porcentaje = total_ingresos > 0 ? (utilidad / total_ingresos) * 100 : 0;

      // Group incomes by status
      const ingresos_por_estado = ingresos.reduce((acc, ing) => {
        const status = ing.cobrado ? 'cobrado' : ing.facturado ? 'facturado' : 'pendiente';
        acc[status] = (acc[status] || 0) + ing.total;
        return acc;
      }, {} as Record<string, number>);

      // Group expenses by category
      const gastos_por_categoria = gastos.reduce((acc, gasto) => {
        const categoria = gasto.categoria?.nombre || 'Sin categoría';
        acc[categoria] = (acc[categoria] || 0) + gasto.total;
        return acc;
      }, {} as Record<string, number>);

      return {
        total_ingresos,
        total_gastos,
        utilidad,
        margen_porcentaje,
        ingresos_por_estado,
        gastos_por_categoria,
        archivos_adjuntos: {
          total_archivos: 0,
          archivos_ingresos: 0,
          archivos_gastos: 0,
          tamaño_total_mb: 0
        }
      };
    } catch (error) {
      console.error('Error calculating financial summary:', error);
      return {
        total_ingresos: 0,
        total_gastos: 0,
        utilidad: 0,
        margen_porcentaje: 0,
        ingresos_por_estado: {},
        gastos_por_categoria: {},
        archivos_adjuntos: {
          total_archivos: 0,
          archivos_ingresos: 0,
          archivos_gastos: 0,
          tamaño_total_mb: 0
        }
      };
    }
  }



  // Bulk operations

  // Validation helpers
  validateIncomeData(data: Partial<Income>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.concepto?.trim()) {
      errors.push('El concepto es requerido');
    }

    if (!data.precio_unitario || data.precio_unitario <= 0) {
      errors.push('El precio unitario debe ser mayor a 0');
    }

    if (!data.fecha_ingreso) {
      errors.push('La fecha de ingreso es requerida');
    }

    // Validate file size if document is attached
    if (data.documento_url && data.documento_url.includes('large-file')) {
      errors.push('El archivo adjunto es demasiado grande');
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateExpenseData(data: Partial<Expense>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.concepto?.trim()) {
      errors.push('El concepto es requerido');
    }

    if (!data.precio_unitario || data.precio_unitario <= 0) {
      errors.push('El precio unitario debe ser mayor a 0');
    }

    if (!data.fecha_gasto) {
      errors.push('La fecha del gasto es requerida');
    }

    if (data.rfc_proveedor && !this.validateRFC(data.rfc_proveedor)) {
      errors.push('El RFC del proveedor no es válido');
    }

    // Validate file size and type if document is attached
    if (data.documento_url) {
      const fileExtension = data.documento_url.split('.').pop()?.toLowerCase();
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'];
      
      if (fileExtension && !allowedTypes.includes(fileExtension)) {
        errors.push('Tipo de archivo no permitido');
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateRFC(rfc: string): boolean {
    const rfcClean = rfc.toUpperCase().trim();
    const rfcMoral = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/;
    const rfcFisica = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
    
    return rfcMoral.test(rfcClean) || rfcFisica.test(rfcClean);
  }

  // Analytics
  async getExpenseAnalytics(eventId?: string): Promise<any> {
    try {
      let query = supabase
        .from('vw_gastos_por_categoria_erp')
        .select('*');

      if (eventId) {
        // Filter by event if specified
        query = query.eq('evento_id', eventId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching expense analytics:', error);
      return [];
    }
  }

  async getIncomeAnalytics(eventId?: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('evt_ingresos_erp')
        .select('facturado, cobrado, total, created_at')
        .eq('evento_id', eventId || 0);

      if (error) throw error;

      // Group by status
      const analytics = (data || []).reduce((acc, income) => {
        let status = 'pendiente';
        if (income.cobrado) status = 'cobrado';
        else if (income.facturado) status = 'facturado';

        acc[status] = (acc[status] || 0) + income.total;
        return acc;
      }, {} as Record<string, number>);

      return analytics;
    } catch (error) {
      console.error('Error fetching income analytics:', error);
      return {};
    }
  }

  // Utility methods
  calculateIVA(subtotal: number, rate: number = MEXICAN_CONFIG.ivaRate): number {
    return Math.round((subtotal * (rate / 100)) * 100) / 100;
  }

  calculateTotal(subtotal: number, iva?: number): number {
    const ivaAmount = iva !== undefined ? iva : this.calculateIVA(subtotal);
    return Math.round((subtotal + ivaAmount) * 100) / 100;
  }

  calculateMargin(income: number, expenses: number): number {
    if (income === 0) return 0;
    return Math.round(((income - expenses) / income * 100) * 100) / 100;
  }

  // OCR Integration Methods
  /**
   * Crea un gasto automáticamente desde datos OCR de un ticket
   */
  async createExpenseFromOCR(eventId: string, ocrData: OCRDocument, userId: string): Promise<Expense> {
    try {
      const ticketData = ocrData.datos_ticket || {};
      
      // Validar que es un ticket válido
      if (!ticketData || !ocrData.confianza_general) {
        throw new Error('Datos de ticket OCR inválidos o confianza muy baja');
      }

      // Determinar confianza y si necesita validación
      const confidence = ocrData.confianza_general;
      const needsValidation = confidence < 70;

      // Preparar datos del gasto
      const expenseData = {
        evento_id: parseInt(eventId),
        concepto: ticketData.establecimiento || 'Gasto desde OCR',
        descripcion: `Extraído automáticamente de ${ocrData.nombre_archivo}${needsValidation ? ' - REQUIERE VALIDACIÓN' : ''}`,
        cantidad: 1,
        precio_unitario: ticketData.total || 0,
        total: ticketData.total || 0,
        subtotal: ticketData.subtotal || (ticketData.total ? ticketData.total / 1.16 : 0),
        iva: ticketData.iva || (ticketData.total ? ticketData.total - (ticketData.total / 1.16) : 0),
        iva_porcentaje: MEXICAN_CONFIG.ivaRate,
        proveedor: ticketData.establecimiento || null,
        fecha_gasto: ticketData.fecha ? new Date(ticketData.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        forma_pago: ticketData.forma_pago || 'No especificado',
        notas: this.formatOCRProducts(ticketData.productos),
        archivo_adjunto: ocrData.archivo_url || null,
        
        // Campos específicos OCR
        documento_ocr_id: ocrData.id,
        ocr_confianza: confidence,
        ocr_validado: !needsValidation,
        ocr_datos_originales: JSON.stringify(ticketData),
        
        // Metadata
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🎫 Creando gasto desde OCR:', {
        confidence,
        needsValidation,
        total: expenseData.total,
        concepto: expenseData.concepto
      });

      const { data, error } = await supabase
        .from('evt_gastos_erp')
        .insert([expenseData])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Gasto creado exitosamente desde OCR');
      return data;
      
    } catch (error) {
      console.error('❌ Error creando gasto desde OCR:', error);
      throw new Error(`Error al crear gasto desde OCR: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Crea un ingreso automáticamente desde datos OCR de una factura
   */
  async createIncomeFromOCR(eventId: string, ocrData: OCRDocument, userId: string): Promise<Income> {
    try {
      const facturaData = ocrData.datos_factura || {};
      
      // Validar que es una factura válida
      if (!facturaData || !ocrData.confianza_general) {
        throw new Error('Datos de factura OCR inválidos o confianza muy baja');
      }

      // Determinar confianza y si necesita validación
      const confidence = ocrData.confianza_general;
      const needsValidation = confidence < 70;

      // Preparar datos del ingreso
      const incomeData = {
        evento_id: parseInt(eventId),
        concepto: facturaData.nombre_emisor || 'Ingreso desde OCR',
        descripcion: `Factura ${facturaData.serie || 'N/A'}-${facturaData.folio || 'N/A'}${needsValidation ? ' - REQUIERE VALIDACIÓN' : ''}`,
        cantidad: 1,
        precio_unitario: facturaData.total || 0,
        total: facturaData.total || 0,
        subtotal: facturaData.subtotal || (facturaData.total ? facturaData.total / 1.16 : 0),
        iva: facturaData.iva || (facturaData.total ? facturaData.total - (facturaData.total / 1.16) : 0),
        iva_porcentaje: MEXICAN_CONFIG.ivaRate,
        fecha_ingreso: facturaData.fecha_emision ? new Date(facturaData.fecha_emision).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        referencia: facturaData.uuid || `${facturaData.serie || 'N/A'}-${facturaData.folio || 'N/A'}`,
        rfc_cliente: facturaData.rfc_receptor || null,
        archivo_adjunto: ocrData.archivo_url || null,
        
        // Campos específicos OCR
        documento_ocr_id: ocrData.id,
        ocr_confianza: confidence,
        ocr_validado: !needsValidation,
        ocr_datos_originales: JSON.stringify(facturaData),
        
        // Estados por defecto
        facturado: true, // Si viene de OCR de factura, ya está facturado
        cobrado: false,  // Por defecto no cobrado
        
        // Metadata
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🧾 Creando ingreso desde OCR:', {
        confidence,
        needsValidation,
        total: incomeData.total,
        concepto: incomeData.concepto,
        uuid: facturaData.uuid
      });

      const { data, error } = await supabase
        .from('evt_ingresos_erp')
        .insert([incomeData])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Ingreso creado exitosamente desde OCR');
      return data;
      
    } catch (error) {
      console.error('❌ Error creando ingreso desde OCR:', error);
      throw new Error(`Error al crear ingreso desde OCR: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Formatea la lista de productos OCR para notas
   */
  private formatOCRProducts(productos?: any[]): string {
    if (!productos || productos.length === 0) {
      return 'Productos extraídos automáticamente por OCR';
    }

    const productList = productos
      .filter(p => p.nombre && p.precio_total)
      .map(p => `• ${p.nombre}: $${p.precio_total}`)
      .join('\n');

    return productList || 'Productos detectados por OCR';
  }

  /**
   * Obtiene estadísticas OCR para un evento
   */
  async getOCRStatsForEvent(eventId: string): Promise<{
    total_ocr_documents: number;
    expenses_from_ocr: number;
    incomes_from_ocr: number;
    average_confidence: number;
    pending_validation: number;
  }> {
    try {
      const [expensesResult, incomesResult] = await Promise.all([
        supabase
          .from('evt_gastos_erp')
          .select('documento_ocr_id, ocr_confianza, ocr_validado')
          .eq('evento_id', eventId)
          .not('documento_ocr_id', 'is', null),
        supabase
          .from('evt_ingresos_erp')
          .select('documento_ocr_id, ocr_confianza, ocr_validado')
          .eq('evento_id', eventId)
          .not('documento_ocr_id', 'is', null)
      ]);

      const expenses = expensesResult.data || [];
      const incomes = incomesResult.data || [];
      const allOCRRecords = [...expenses, ...incomes];

      const stats = {
        total_ocr_documents: allOCRRecords.length,
        expenses_from_ocr: expenses.length,
        incomes_from_ocr: incomes.length,
        average_confidence: allOCRRecords.length > 0 
          ? Math.round(allOCRRecords.reduce((sum, record) => sum + (record.ocr_confianza || 0), 0) / allOCRRecords.length)
          : 0,
        pending_validation: allOCRRecords.filter(record => !record.ocr_validado).length
      };

      return stats;
    } catch (error) {
      console.error('Error fetching OCR stats:', error);
      return {
        total_ocr_documents: 0,
        expenses_from_ocr: 0,
        incomes_from_ocr: 0,
        average_confidence: 0,
        pending_validation: 0
      };
    }
  }
}

export const financesService = FinancesService.getInstance();