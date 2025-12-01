import { supabase } from '../core/config/supabase';
import { auditService } from './auditService';
import { Database } from '../core/types/database';
import { dbLogger } from '../core/utils/logger';

type Db = Database['public']['Tables'];
type Evento = Db['evt_eventos']['Row'] & { evt_estados_erp: Db['evt_estados_erp']['Row'] | null };

export interface AccountingStateResult {
  eventId: string;
  oldState: string;
  newState: string;
  totalIngresos: number;
  ingresosFacturados: number;
  ingresosPagados: number;
  ingresosVencidos: number;
  processedAt: string;
}

export interface IncomeValidation {
  eventId: string;
  canChangeToState: boolean;
  missingRequirements: string[];
  paymentStatus: {
    total: number;
    invoiced: number;
    paid: number;
    overdue: number;
  };
}

export class AccountingStateService {
  private static instance: AccountingStateService;

  private constructor() {}

  public static getInstance(): AccountingStateService {
    if (!AccountingStateService.instance) {
      AccountingStateService.instance = new AccountingStateService();
    }
    return AccountingStateService.instance;
  }

  /**
   * Manually trigger accounting state calculation for a specific event
   */
  async calculateEventAccountingState(eventId: string): Promise<AccountingStateResult | null> {
    try {
      dbLogger.info(`Calculating accounting state for event ${eventId}`);

      // Call the database function
      const { error } = await supabase.rpc('calculate_event_accounting_state', {
        event_id_param: parseInt(eventId)
      });

      if (error) {
        dbLogger.error('Error calculating accounting state', error);
        throw error;
      }

      // Get the updated event state
      const { data: eventData, error: eventError } = await supabase
        .from('evt_eventos_erp')
        .select(`
          id,
          estado_id,
          estado:estado_id ( nombre )
        `)
        .eq('id', eventId)
        .returns<Evento[]>()
        .single();

      if (eventError) throw eventError;
      if (!eventData || !eventData.estado) return null;


      // Get income statistics
      const incomeStats = await this.getIncomeStatistics(eventId);

      const result: AccountingStateResult = {
        eventId,
        oldState: 'Cerrado', // Assuming it was closed before
        newState: eventData.estado.nombre ?? 'Desconocido',
        totalIngresos: incomeStats.total,
        ingresosFacturados: incomeStats.invoiced,
        ingresosPagados: incomeStats.paid,
        ingresosVencidos: incomeStats.overdue,
        processedAt: new Date().toISOString()
      };

      dbLogger.info(`Event ${eventId} state calculated`, result);
      return result;
    } catch (error) {
      dbLogger.error('Error in calculateEventAccountingState', error);
      return null;
    }
  }

  /**
   * Recalculate all closed events (maintenance function)
   */
  async recalculateAllClosedEvents(): Promise<AccountingStateResult[]> {
    try {
      console.log('🔄 Recalculating all closed events...');

      const { data, error } = await supabase.rpc('recalculate_all_closed_events');

      if (error) {
        console.error('Error recalculating closed events:', error);
        throw error;
      }

      const results: AccountingStateResult[] = (data || []).map((row: any) => ({
        eventId: row.event_id.toString(),
        oldState: row.old_state,
        newState: row.new_state,
        totalIngresos: 0, // Would need additional query to get these
        ingresosFacturados: 0,
        ingresosPagados: 0,
        ingresosVencidos: 0,
        processedAt: row.processed_at
      }));

      console.log(`✅ Processed ${results.length} closed events`);
      return results;
    } catch (error) {
      console.error('Error in recalculateAllClosedEvents:', error);
      return [];
    }
  }

  /**
   * Validate if an event can transition to a specific accounting state
   */
  async validateEventStateTransition(eventId: string, targetStateName: string): Promise<IncomeValidation> {
    try {
      const incomeStats = await this.getIncomeStatistics(eventId);
      const missingRequirements: string[] = [];
      let canChangeToState = true;

      switch (targetStateName.toLowerCase()) {
        case 'pagos pendiente':
          if (incomeStats.invoiced < incomeStats.total) {
            missingRequirements.push('Todos los ingresos deben estar facturados');
            canChangeToState = false;
          }
          if (incomeStats.paid === incomeStats.total) {
            missingRequirements.push('No debe haber ingresos completamente pagados para este estado');
            canChangeToState = false;
          }
          break;

        case 'pagados':
          if (incomeStats.invoiced < incomeStats.total) {
            missingRequirements.push('Todos los ingresos deben estar facturados');
            canChangeToState = false;
          }
          if (incomeStats.paid < incomeStats.total) {
            missingRequirements.push('Todos los ingresos deben estar pagados');
            canChangeToState = false;
          }
          break;

        case 'pagos vencidos':
          if (incomeStats.invoiced < incomeStats.total) {
            missingRequirements.push('Todos los ingresos deben estar facturados');
            canChangeToState = false;
          }
          if (incomeStats.overdue === 0) {
            missingRequirements.push('Debe haber al menos un pago vencido');
            canChangeToState = false;
          }
          break;

        case 'cerrado':
          // Always can go back to closed
          break;

        default:
          missingRequirements.push('Estado objetivo no reconocido');
          canChangeToState = false;
          break;
      }

      return {
        eventId,
        canChangeToState,
        missingRequirements,
        paymentStatus: {
          total: incomeStats.total,
          invoiced: incomeStats.invoiced,
          paid: incomeStats.paid,
          overdue: incomeStats.overdue
        }
      };
    } catch (error) {
      console.error('Error validating state transition:', error);
      return {
        eventId,
        canChangeToState: false,
        missingRequirements: ['Error al validar transición de estado'],
        paymentStatus: { total: 0, invoiced: 0, paid: 0, overdue: 0 }
      };
    }
  }

  /**
   * Get income statistics for an event
   */
  private async getIncomeStatistics(eventId: string): Promise<{
    total: number;
    invoiced: number;
    paid: number;
    overdue: number;
  }> {
    try {
      const { data: incomes, error } = await supabase
        .from('evt_ingresos_erp')
        .select('facturado, pagado, fecha_compromiso_pago')
        .eq('evento_id', eventId);

      if (error) throw error;

      const total = incomes?.length || 0;
      const invoiced = incomes?.filter(ing => ing.facturado).length || 0;
      const paid = incomes?.filter(ing => ing.facturado && ing.cobrado).length || 0; // Corregido: cobrado
      const overdue = incomes?.filter(ing => 
        ing.facturado && 
        !ing.cobrado &&  // Corregido: cobrado
        ing.fecha_compromiso_pago && 
        new Date(ing.fecha_compromiso_pago) < new Date()
      ).length || 0;

      return { total, invoiced, paid, overdue };
    } catch (error) {
      console.error('Error getting income statistics:', error);
      return { total: 0, invoiced: 0, paid: 0, overdue: 0 };
    }
  }

  /**
   * Get events that need accounting state review
   */
  async getEventsNeedingReview(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('evt_eventos_erp')
        .select(`
          id,
          estado_id,
          evt_estados_erp!inner ( nombre ),
          evt_ingresos (
            id,
            facturado,
            cobrado,
            fecha_compromiso_pago,
            total
          )
        `)
        .eq('evt_estados_erp.nombre', 'Cerrado')
        .eq('activo', true);

      if (error) throw error;

      return (data || []).filter(event => {
        // Only include events that have incomes
        return event.evt_ingresos && event.evt_ingresos.length > 0;
      });
    } catch (error) {
      console.error('Error getting events needing review:', error);
      return [];
    }
  }

  /**
   * Get overdue payments report
   */
  async getOverduePaymentsReport(): Promise<any[]> {
    try {
      // ✅ CORREGIDO: Usar tabla evt_ingresos directamente en lugar de vista inexistente
      const { data, error } = await supabase
        .from('evt_ingresos_erp')
        .select(`
          id,
          concepto,
          total,
          fecha_compromiso_pago,
          evento_id,
          evt_eventos!inner (
            id,
            clave_evento,
            nombre_proyecto,
            cliente_id,
            evt_clientes_erp ( razon_social, nombre_comercial )
          )
        `)
        .eq('facturado', true)
        .eq('cobrado', false)
        .not('fecha_compromiso_pago', 'is', null)
        .lt('fecha_compromiso_pago', new Date().toISOString().split('T')[0])
        .order('fecha_compromiso_pago', { ascending: true });

      if (error) throw error;

      return (data || []).map((income: any) => ({
        ...income,
        dias_vencido: this.calculateDaysOverdue(income.fecha_compromiso_pago),
        cliente_nombre: income.evt_eventos?.evt_clientes_erp?.nombre_comercial || 
                       income.evt_eventos?.evt_clientes_erp?.razon_social || 'Sin cliente'
      }));
    } catch (error) {
      console.error('Error getting overdue payments report:', error);
      return [];
    }
  }

  /**
   * Update income payment status
   */
  async updateIncomePaymentStatus(
    incomeId: string,
    updates: {
      facturado?: boolean,
      pagado?: boolean,
      fecha_compromiso_pago?: string;
      fecha_facturacion?: string;
      fecha_cobro?: string;
      metodo_cobro?: string;
    },
    userId?: string
  ): Promise<void> {
    try {
      const { data: income, error: fetchError } = await supabase
        .from('evt_ingresos_erp')
        .select('evento_id, concepto, total')
        .eq('id', incomeId)
        .single();

      if (fetchError) throw fetchError;
      if (!income) throw new Error('Income not found');

      const { error: updateError } = await supabase
        .from('evt_ingresos_erp')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', incomeId);

      if (updateError) throw updateError;

      // Log the payment status change
      await auditService.logAction(
        income.evento_id!.toString(),
        userId || 'system',
        'income_payment_updated',
        { income_id: incomeId, concepto: income.concepto },
        updates
      );

      console.log(`✅ Income ${incomeId} payment status updated`);
    } catch (error) {
      console.error('Error updating income payment status:', error);
      throw error;
    }
  }

  /**
   * Bulk update payment status for multiple incomes
   */
  async bulkUpdatePaymentStatus(
    incomeIds: string[],
    updates: {
      facturado?: boolean,
      pagado?: boolean,
      fecha_compromiso_pago?: string;
    },
    userId?: string
  ): Promise<{ success: number; errors: string[] }> {
    let successCount = 0;
    const errors: string[] = [];

    for (const incomeId of incomeIds) {
      try {
        await this.updateIncomePaymentStatus(incomeId, updates, userId);
        successCount++;
      } catch (error) {
        errors.push(`Error updating income ${incomeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success: successCount, errors };
  }

  /**
   * Get accounting state dashboard metrics
   */
  async getAccountingStateDashboard(): Promise<{
    eventosCerrados: number;
    eventosPagosPendientes: number;
    eventosPagados: number;
    eventosPagosVencidos: number;
    totalPorCobrar: number;
    totalVencido: number;
    tasaCobranza: number;
  }> {
    try {
      // Get states statistics
      const { data: stateStats, error: stateError } = await supabase
        .from('evt_eventos_erp')
        .select(`
          id,
          estado_id,
          total,
          evt_estados_erp!inner ( nombre )
        `)
        .eq('activo', true)
        .in('evt_estados_erp.nombre', ['Cerrado', 'Pagos Pendiente', 'Pagados', 'Pagos Vencidos']);

      if (stateError) throw stateError;

      const stats = (stateStats || []).reduce((acc: Record<string, number>, event: any) => {
        const stateName = event.evt_estados_erp?.nombre;
        if (stateName) {
          acc[stateName] = (acc[stateName] || 0) + 1;
        }
        return acc;
      }, {});

      // Get overdue amounts
      const { data: overdueData, error: overdueError } = await supabase
        .from('evt_ingresos_erp')
        .select('total')
        .eq('facturado', true)
        .eq('cobrado', false) // Corregido: usar 'cobrado' en vez de 'pagado'
        .not('fecha_compromiso_pago', 'is', null)
        .lt('fecha_compromiso_pago', new Date().toISOString().split('T')[0]);

      if (overdueError) throw overdueError;

      const totalVencido = (overdueData || []).reduce((sum, income) => sum + (income.total || 0), 0);

      // Get pending amounts
      const { data: pendingData, error: pendingError } = await supabase
        .from('evt_ingresos_erp')
        .select('total')
        .eq('facturado', true)
        .eq('cobrado', false); // Corregido: usar 'cobrado' en vez de 'pagado'

      if (pendingError) throw pendingError;

      const totalPorCobrar = (pendingData || []).reduce((sum, income) => sum + (income.total || 0), 0);

      // Calculate collection rate
      const { data: paidData, error: paidError } = await supabase
        .from('evt_ingresos_erp')
        .select('total')
        .eq('facturado', true)
        .eq('cobrado', true); // Corregido: usar 'cobrado' en vez de 'pagado'

      if (paidError) throw paidError;

      const totalPagado = (paidData || []).reduce((sum, income) => sum + (income.total || 0), 0);
      const totalFacturado = totalPagado + totalPorCobrar;
      const tasaCobranza = totalFacturado > 0 ? (totalPagado / totalFacturado) * 100 : 0;

      return {
        eventosCerrados: stats['Cerrado'] || 0,
        eventosPagosPendientes: stats['Pagos Pendiente'] || 0,
        eventosPagados: stats['Pagados'] || 0,
        eventosPagosVencidos: stats['Pagos Vencidos'] || 0,
        totalPorCobrar,
        totalVencido,
        tasaCobranza
      };
    } catch (error) {
      console.error('Error getting accounting state dashboard:', error);
      return {
        eventosCerrados: 0,
        eventosPagosPendientes: 0,
        eventosPagados: 0,
        eventosPagosVencidos: 0,
        totalPorCobrar: 0,
        totalVencido: 0,
        tasaCobranza: 0
      };
    }
  }

  /**
   * Set payment commitment date for an income
   */
  async setPaymentCommitmentDate(
    incomeId: string,
    commitmentDate: string,
    userId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('evt_ingresos_erp')
        .update({
          fecha_compromiso_pago: commitmentDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', incomeId);

      if (error) throw error;

      // Log the commitment date setting
      await auditService.logAction(
        'income',
        userId || 'system',
        'payment_commitment_set',
        null,
        { income_id: incomeId, fecha_compromiso_pago: commitmentDate }
      );

      console.log(`✅ Payment commitment date set for income ${incomeId}: ${commitmentDate}`);
    } catch (error) {
      console.error('Error setting payment commitment date:', error);
      throw error;
    }
  }

  /**
   * Mark income as paid
   */
  async markIncomeAsPaid(
    incomeId: string,
    paymentData: {
      fecha_cobro: string;
      metodo_cobro: string;
      referencia?: string;
    },
    userId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('evt_ingresos_erp')
        .update({
          cobrado: true, // Corregido: usar 'cobrado' en vez de 'pagado'
          fecha_cobro: paymentData.fecha_cobro,
          metodo_cobro: paymentData.metodo_cobro,
          referencia: paymentData.referencia,
          updated_at: new Date().toISOString()
        })
        .eq('id', incomeId);

      if (error) throw error;

      // Log the payment
      await auditService.logAction(
        'income',
        userId || 'system',
        'income_payment_received',
        null,
        { income_id: incomeId, ...paymentData }
      );

      console.log(`✅ Income ${incomeId} marked as paid`);
    } catch (error) {
      console.error('Error marking income as paid:', error);
      throw error;
    }
  }

  /**
   * Get events by accounting state
   */
  async getEventsByAccountingState(stateName: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('evt_eventos_erp')
        .select(`
          id,
          clave_evento,
          nombre_proyecto,
          fecha_evento,
          estado:estado_id(nombre, color),
          cliente:cliente_id(razon_social, nombre_comercial),
          core_users(nombre)
        `)
        .eq('estado.nombre', stateName)
        .eq('activo', true)
        .order('fecha_evento', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting events by accounting state:', error);
      return [];
    }
  }

  /**
   * Calculate days overdue for a payment
   */
  private calculateDaysOverdue(commitmentDate: string): number {
    const today = new Date();
    const commitment = new Date(commitmentDate);
    const diffTime = today.getTime() - commitment.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Schedule automatic state recalculation (would be called by a cron job)
   */
  async scheduleAutomaticRecalculation(): Promise<void> {
    try {
      console.log('🕐 Starting scheduled accounting state recalculation...');
      
      const results = await this.recalculateAllClosedEvents();
      
      // Log the scheduled operation
      await auditService.logAction(
        'system',
        'system',
        'scheduled_accounting_recalculation',
        null,
        {
          processed_events: results.length,
          timestamp: new Date().toISOString(),
          results: results.slice(0, 10) // Log first 10 results
        }
      );

      console.log(`✅ Scheduled recalculation completed: ${results.length} events processed`);
    } catch (error) {
      console.error('Error in scheduled recalculation:', error);
      
      // Log the error
      await auditService.logAction(
        'system',
        'system',
        'scheduled_accounting_recalculation_error',
        null,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      );
    }
  }

  /**
   * Real-time subscription to income changes for automatic state updates
   */
  subscribeToIncomeChanges(callback: (payload: any) => void) {
    return supabase
      .channel('income-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'evt_ingresos_erp',
          filter: 'facturado=eq.true'
        }, 
        (payload) => {
          console.log('📡 Income change detected:', payload);
          callback(payload);
        }
      )
      .subscribe();
  }
}

export const accountingStateService = AccountingStateService.getInstance();