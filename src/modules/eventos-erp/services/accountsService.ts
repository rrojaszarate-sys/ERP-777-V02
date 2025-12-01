import { supabase } from '../../../core/config/supabase';
import { CuentaContable, ExpenseExtended } from '../types/Finance';

/**
 * Servicio para gestión de cuentas contables
 */
export class AccountsService {
  /**
   * Obtener todas las cuentas contables activas
   */
  static async getCuentas(filtros?: {
    tipo?: 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto';
    soloActivas?: boolean;
  }): Promise<CuentaContable[]> {
    let query = supabase
      .from('cuentas_contables_erp')
      .select('*')
      .order('codigo');

    if (filtros?.tipo) {
      query = query.eq('tipo', filtros.tipo);
    }

    if (filtros?.soloActivas !== false) {
      query = query.eq('activa', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Obtener cuentas de tipo GASTO específicamente
   */
  static async getCuentasGasto(): Promise<CuentaContable[]> {
    return this.getCuentas({ tipo: 'gasto', soloActivas: true });
  }

  /**
   * Obtener cuenta por ID
   */
  static async getCuentaById(id: number): Promise<CuentaContable | null> {
    const { data, error } = await supabase
      .from('cuentas_contables_erp')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error al obtener cuenta:', error);
      return null;
    }
    return data;
  }

  /**
   * Crear nueva cuenta contable
   */
  static async createCuenta(cuenta: Omit<CuentaContable, 'id' | 'created_at' | 'updated_at'>): Promise<CuentaContable> {
    const { data, error } = await supabase
      .from('cuentas_contables_erp')
      .insert([{
        ...cuenta,
        activa: cuenta.activa !== false // Default true
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Actualizar cuenta contable
   */
  static async updateCuenta(id: number, updates: Partial<CuentaContable>): Promise<CuentaContable> {
    const { data, error } = await supabase
      .from('cuentas_contables_erp')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Desactivar cuenta (soft delete)
   */
  static async deactivateCuenta(id: number): Promise<CuentaContable> {
    return this.updateCuenta(id, { activa: false });
  }

  /**
   * Activar cuenta
   */
  static async activateCuenta(id: number): Promise<CuentaContable> {
    return this.updateCuenta(id, { activa: true });
  }

  /**
   * Eliminar cuenta (solo si no tiene gastos asociados)
   */
  static async deleteCuenta(id: number): Promise<void> {
    // Verificar si tiene gastos asociados
    const gastosAsociados = await this.getGastosPorCuenta(id);

    if (gastosAsociados.length > 0) {
      throw new Error(
        `No se puede eliminar la cuenta. Tiene ${gastosAsociados.length} gasto(s) asociado(s). ` +
        'Considere desactivarla en su lugar.'
      );
    }

    const { error } = await supabase
      .from('cuentas_contables_erp')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Obtener gastos asociados a una cuenta
   */
  static async getGastosPorCuenta(cuentaId: number): Promise<ExpenseExtended[]> {
    const { data, error } = await supabase
      .from('evt_gastos_erp')
      .select(`
        *,
        evento:eventos_erp(nombre_proyecto, clave_evento),
        proveedor:proveedores_erp(nombre),
        cuenta:cuentas_contables_erp(id, codigo, nombre, tipo)
      `)
      .eq('cuenta_id', cuentaId)
      .eq('activo', true)
      .order('fecha_gasto', { ascending: false });

    if (error) throw error;

    // Mapear los datos anidados
    return (data || []).map(gasto => ({
      ...gasto,
      evento_nombre: gasto.evento?.nombre_proyecto,
      clave_evento: gasto.evento?.clave_evento,
      proveedor_nombre: gasto.proveedor?.nombre,
      cuenta_nombre: gasto.cuenta?.nombre,
      cuenta_codigo: gasto.cuenta?.codigo
    }));
  }

  /**
   * Obtener resumen de gastos por cuenta
   */
  static async getResumenGastosPorCuenta(cuentaId: number, filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
  }): Promise<{
    cuenta: CuentaContable | null;
    totalGastos: number;
    cantidadGastos: number;
    gastoPromedio: number;
    gastosPorMes: Array<{ mes: string; total: number; cantidad: number }>;
  }> {
    const cuenta = await this.getCuentaById(cuentaId);

    let query = supabase
      .from('evt_gastos_erp')
      .select('total, fecha_gasto')
      .eq('cuenta_id', cuentaId)
      .eq('activo', true);

    if (filtros?.fechaInicio) {
      query = query.gte('fecha_gasto', filtros.fechaInicio);
    }
    if (filtros?.fechaFin) {
      query = query.lte('fecha_gasto', filtros.fechaFin);
    }

    const { data, error } = await query;

    if (error) throw error;

    const gastos = data || [];
    const totalGastos = gastos.reduce((sum, g) => sum + (g.total || 0), 0);
    const cantidadGastos = gastos.length;
    const gastoPromedio = cantidadGastos > 0 ? totalGastos / cantidadGastos : 0;

    // Agrupar por mes
    const gastosPorMes = gastos.reduce((acc, gasto) => {
      const fecha = new Date(gasto.fecha_gasto);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[mes]) {
        acc[mes] = { mes, total: 0, cantidad: 0 };
      }

      acc[mes].total += gasto.total || 0;
      acc[mes].cantidad += 1;

      return acc;
    }, {} as Record<string, { mes: string; total: number; cantidad: number }>);

    return {
      cuenta,
      totalGastos,
      cantidadGastos,
      gastoPromedio,
      gastosPorMes: Object.values(gastosPorMes).sort((a, b) => b.mes.localeCompare(a.mes))
    };
  }

  /**
   * Obtener resumen general de todas las cuentas
   */
  static async getResumenGeneral(): Promise<Array<{
    cuenta: CuentaContable;
    totalGastos: number;
    cantidadGastos: number;
    ultimoGasto?: string;
  }>> {
    const cuentas = await this.getCuentas({ soloActivas: true });

    const resumenes = await Promise.all(
      cuentas.map(async (cuenta) => {
        const { data, error } = await supabase
          .from('evt_gastos_erp')
          .select('total, fecha_gasto')
          .eq('cuenta_id', cuenta.id)
          .eq('activo', true)
          .order('fecha_gasto', { ascending: false });

        if (error) {
          console.error(`Error al obtener gastos de cuenta ${cuenta.codigo}:`, error);
          return {
            cuenta,
            totalGastos: 0,
            cantidadGastos: 0
          };
        }

        const gastos = data || [];
        const totalGastos = gastos.reduce((sum, g) => sum + (g.total || 0), 0);

        return {
          cuenta,
          totalGastos,
          cantidadGastos: gastos.length,
          ultimoGasto: gastos.length > 0 ? gastos[0].fecha_gasto : undefined
        };
      })
    );

    return resumenes.sort((a, b) => b.totalGastos - a.totalGastos);
  }

  /**
   * Validar código de cuenta (debe ser único)
   */
  static async validarCodigo(codigo: string, excludeId?: number): Promise<boolean> {
    let query = supabase
      .from('cuentas_contables_erp')
      .select('id')
      .eq('codigo', codigo);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).length === 0;
  }
}

export const accountsService = new AccountsService();
