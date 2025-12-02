import { supabase } from '../../../core/config/supabase';
import { isSupabaseConfiguredForRealData } from '../../../core/config/supabase';
import { Event, EventoCompleto, Cliente, DashboardMetrics, AnalisisTemporal } from '../types/Event';

export class EventsService {
  private static instance: EventsService;

  private constructor() {}

  public static getInstance(): EventsService {
    if (!EventsService.instance) {
      EventsService.instance = new EventsService();
    }
    return EventsService.instance;
  }

  // Events CRUD
  async getEvents(filters?: {
    year?: number;
    month?: number;
    status?: string[];
    cliente?: string;
    responsable?: string;
  }): Promise<EventoCompleto[]> {
    try {
      console.log('🔍 Intentando cargar eventos desde vw_eventos_completos_erp...');
      
      let query = supabase
        .from('vw_eventos_completos_erp')
        .select('*')
        .eq('activo', true);

      // Apply filters
      if (filters?.year) {
        query = query.gte('fecha_evento', `${filters.year}-01-01`)
                    .lt('fecha_evento', `${filters.year + 1}-01-01`);
      }

      if (filters?.month) {
        const monthStr = filters.month.toString().padStart(2, '0');
        query = query.gte('fecha_evento', `${filters.year || new Date().getFullYear()}-${monthStr}-01`)
                    .lt('fecha_evento', `${filters.year || new Date().getFullYear()}-${monthStr === '12' ? '01' : (parseInt(monthStr) + 1).toString().padStart(2, '0')}-01`);
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status_pago', filters.status);
      }

      if (filters?.cliente) {
        query = query.or(`cliente_nombre.ilike.%${filters.cliente}%,cliente_comercial.ilike.%${filters.cliente}%`);
      }

      if (filters?.responsable) {
        query = query.ilike('responsable_nombre', `%${filters.responsable}%`);
      }

      const { data, error } = await query.order('fecha_evento', { ascending: false });

      if (error) {
        console.error('❌ Error en vw_eventos_completos_erp:', error);
        console.log('🔄 Intentando cargar desde eventos_erp directamente...');
        
        // Fallback: intentar cargar directamente de eventos_erp si la vista falla
        const { data: eventosData, error: eventosError } = await supabase
          .from('evt_eventos_erp')
          .select('*')
          .eq('activo', true)
          .order('fecha_evento', { ascending: false });
        
        if (eventosError) {
          console.error('❌ Error también en eventos_erp:', eventosError);
          throw eventosError;
        }
        
        console.log('✅ Eventos cargados desde eventos_erp:', eventosData?.length || 0);
        return eventosData || [];
      }
      
      console.log('✅ Eventos cargados desde vw_eventos_completos_erp:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Error crítico al cargar eventos:', error);
      return [];
    }
  }

  async getEventById(id: string): Promise<EventoCompleto | null> {
    try {
      const { data, error } = await supabase
        .from('vw_eventos_completos_erp')
        .select('*, cliente:clientes_erp(*), responsable:users_erp(*), estado:estados_erp(*)')
        .eq('id', id)
        .eq('activo', true) // Asegurarse de que el evento esté activo
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  }

  async createEvent(eventData: Partial<Event>): Promise<Event> {
    try {
      // Validar que se proporcione el cliente_id
      if (!eventData.cliente_id) {
        throw new Error('El cliente_id es requerido para generar la clave del evento');
      }

      // Generate unique event key based on client suffix
      const clave_evento = await this.generateEventKey(eventData.cliente_id);

      // Sanitize date fields: convert empty strings to null
      const sanitizedData = { ...eventData };
      if (sanitizedData.fecha_fin === '') sanitizedData.fecha_fin = null;
      if (sanitizedData.fecha_evento === '') sanitizedData.fecha_evento = null;

      const { data, error } = await supabase
        .from('evt_eventos_erp')
        .insert([{
          ...sanitizedData,
          clave_evento,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(id: string, eventData: Partial<Event>): Promise<Event> {
    try {
      // Limpiar campos UUID vacíos (convertir "" a null)
      const cleanedData = Object.fromEntries(
        Object.entries(eventData).map(([key, value]) => [
          key,
          value === "" ? null : value
        ])
      );

      const { data, error } = await supabase
        .from('evt_eventos_erp')
        .update({
          ...cleanedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('evt_eventos_erp')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Clients CRUD
  async getClients(): Promise<Cliente[]> {
    try {
      const { data, error } = await supabase
        .from('evt_clientes_erp')
        .select('*')
        .eq('activo', true)
        .order('razon_social');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  }

  async createClient(clientData: Partial<Cliente>): Promise<Cliente> {
    try {
      const { data, error } = await supabase
        .from('evt_clientes_erp')
        .insert([{
          ...clientData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  async updateClient(id: number, clientData: Partial<Cliente>): Promise<Cliente> {
    try {
      const { data, error } = await supabase
        .from('evt_clientes_erp')
        .update({
          ...clientData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  // Dashboard data
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Check if Supabase is properly configured
    if (!isSupabaseConfiguredForRealData()) {
      console.warn('⚠️ Supabase not configured for dashboard metrics, using mock data');
      return this.getEmptyMetrics();
    }

    try {
      // Test connectivity first
      const { error: connectError } = await supabase.from('vw_dashboard_metricas_erp').select('*').limit(1);
      if (connectError) {
        console.warn('⚠️ Dashboard view not available, using mock data:', connectError.message);
        return this.getEmptyMetrics();
      }

      const { data, error } = await supabase
        .from('vw_dashboard_metricas_erp')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data || this.getEmptyMetrics();
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  async getTemporalAnalysis(months: number = 6): Promise<AnalisisTemporal[]> {
    // Check if Supabase is properly configured
    if (!isSupabaseConfiguredForRealData()) {
      console.warn('⚠️ Supabase not configured for temporal analysis, using empty data');
      return [];
    }

    try {
      // Test connectivity first
      const { error: connectError } = await supabase.from('vw_analisis_temporal_erp').select('*').limit(1);
      if (connectError) {
        console.warn('⚠️ Temporal analysis view not available, using empty data:', connectError.message);
        return [];
      }

      const { data, error } = await supabase
        .from('vw_analisis_temporal_erp')
        .select('*')
        .order('año', { ascending: false })
        .order('mes', { ascending: false })
        .limit(months);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching temporal analysis:', error);
      return [];
    }
  }

  async getExpensesByCategory(): Promise<any[]> {
    // Check if Supabase is properly configured
    if (!isSupabaseConfiguredForRealData()) {
      console.warn('⚠️ Supabase not configured for expenses by category, using empty data');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('evt_gastos_erp')
        .select(`
          categoria_id,
          total,
          categoria:evt_categorias_gastos_erp(
            nombre,
            color
          )
        `)
        .is('deleted_at', null)
        .not('categoria_id', 'is', null);

      if (error) throw error;

      // Aggregate data by category
      const categoryMap = new Map();

      data?.forEach(expense => {
        const categoryId = expense.categoria_id;
        const categoria = expense.categoria as any;
        if (!categoria) return; // Skip if no category
        const categoryName = categoria.nombre;
        const categoryColor = categoria.color;
        const total = parseFloat(expense.total) || 0;
        
        if (categoryMap.has(categoryId)) {
          const existing = categoryMap.get(categoryId);
          existing.monto_total += total;
          existing.total_gastos += 1;
        } else {
          categoryMap.set(categoryId, {
            categoria_id: categoryId,
            categoria: categoryName,
            categoria_color: categoryColor,
            total_gastos: 1,
            monto_total: total,
            promedio_gasto: total,
            gastos_aprobados: 1, // Assuming active expenses are approved
            gastos_pendientes: 0
          });
        }
      });
      
      // Calculate averages and convert to array
      const result = Array.from(categoryMap.values()).map(category => ({
        ...category,
        promedio_gasto: category.monto_total / category.total_gastos
      }));
      
      // Sort by total amount descending
      result.sort((a, b) => b.monto_total - a.monto_total);
      
      return result;
    } catch (error) {
      console.error('Error fetching expenses by category:', error);
      return [];
    }
  }

  // Utility methods
  private async generateEventKey(clienteId?: string): Promise<string> {
    const year = new Date().getFullYear();

    // Si se proporciona un cliente_id, obtener su sufijo
    if (clienteId) {
      try {
        const { data: cliente, error } = await supabase
          .from('evt_clientes_erp')
          .select('sufijo')
          .eq('id', clienteId)
          .single();

        if (error) {
          console.error('Error obteniendo sufijo del cliente:', error);
          throw new Error('No se pudo obtener el sufijo del cliente');
        }

        if (!cliente?.sufijo) {
          throw new Error('El cliente no tiene un sufijo configurado');
        }

        const sufijo = cliente.sufijo.toUpperCase();

        // Contar eventos con el mismo sufijo y año
        const { count } = await supabase
          .from('evt_eventos_erp')
          .select('*', { count: 'exact', head: true })
          .like('clave_evento', `${sufijo}${year}-%`);

        const nextNumber = (count || 0) + 1;
        return `${sufijo}${year}-${nextNumber.toString().padStart(3, '0')}`;
      } catch (error) {
        console.error('Error generando clave con sufijo:', error);
        throw error;
      }
    }

    // Fallback: generar clave genérica si no hay cliente_id
    const { count } = await supabase
      .from('evt_eventos_erp')
      .select('*', { count: 'exact', head: true })
      .like('clave_evento', `EVT-${year}-%`);

    const nextNumber = (count || 0) + 1;
    return `EVT-${year}-${nextNumber.toString().padStart(3, '0')}`;
  }

  private getEmptyMetrics(): DashboardMetrics {
    return {
      total_eventos: 0,
      eventos_futuros: 0,
      eventos_pasados: 0,
      pagos_pendientes: 0,
      facturas_pendientes: 0,
      pagos_vencidos: 0,
      eventos_cobrados: 0,
      ingresos_totales: 0,
      ingresos_cobrados: 0,
      ingresos_por_cobrar: 0,
      gastos_totales: 0,
      utilidad_total: 0,
      margen_promedio: 0,
      tasa_cobranza: 0,
      ratio_gastos_ingresos: 0
    };
  }

  // Real-time subscriptions
  subscribeToEvents(callback: (payload: any) => void) {
    return supabase
      .channel('events-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'eventos_erp' }, 
        callback
      )
      .subscribe();
  }

  subscribeToFinances(eventId: number, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`finances-${eventId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ingresos_erp', filter: `evento_id=eq.${eventId}` },
        callback
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gastos_erp', filter: `evento_id=eq.${eventId}` },
        callback
      )
      .subscribe();

    return channel;
  }

  // Event states management
  async getEventStates(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('evt_estados_erp')
        .select('id, nombre, descripcion, color, orden, workflow_step')
        .neq('workflow_step', 0)
        .order('orden', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching event states:', error);
      throw error;
    }
  }
}

export const eventsService = EventsService.getInstance();