import { supabase } from '../../../core/config/supabase';
import { Cliente } from '../types/Event';

export class ClientsService {
  private static instance: ClientsService;

  private constructor() {}

  public static getInstance(): ClientsService {
    if (!ClientsService.instance) {
      ClientsService.instance = new ClientsService();
    }
    return ClientsService.instance;
  }

  // CRUD Operations
  async getClients(filters?: {
    activo?: boolean;
    search?: string;
    regimen_fiscal?: string;
  }): Promise<Cliente[]> {
    try {
      let query = supabase
        .from('evt_clientes_erp')
        .select('*');

      // Apply filters
      if (filters?.activo !== undefined) {
        query = query.eq('activo', filters.activo);
      } else {
        query = query.eq('activo', true); // Default to active clients
      }

      if (filters?.search) {
        query = query.or(`razon_social.ilike.%${filters.search}%,nombre_comercial.ilike.%${filters.search}%,rfc.ilike.%${filters.search}%`);
      }

      if (filters?.regimen_fiscal) {
        query = query.eq('regimen_fiscal', filters.regimen_fiscal);
      }

      const { data, error } = await query.order('razon_social');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  }

  async getClientById(id: string): Promise<Cliente | null> {
    try {
      const { data, error } = await supabase
        .from('evt_clientes_erp') // Ya estaba correcto, pero confirmamos que no use la vista.
        .select('*, company:companies_erp(nombre)')
        .eq('id', id)
        .eq('activo', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching client:', error);
      return null;
    }
  }

  async createClient(clientData: Partial<Cliente>, userId?: string): Promise<Cliente> {
    try {
      // Get company_id from current user if not provided
      let company_id = clientData.company_id;
      if (!company_id && userId) {
        const { data: userData } = await supabase
          .from('core_users')
          .select('company_id')
          .eq('id', userId)
          .single();
        company_id = userData?.company_id;
      }

      const { data, error } = await supabase
        .from('evt_clientes_erp')
        .insert([{
          ...clientData,
          company_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: userId
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

  async updateClient(id: string, clientData: Partial<Cliente>): Promise<Cliente> {
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

  async deleteClient(id: string): Promise<void> {
    try {
      // Soft delete - mark as inactive
      const { error } = await supabase
        .from('evt_clientes_erp')
        .update({ 
          activo: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  // Client Events
  async getClientEvents(clientId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('evt_eventos_erp')
        .select(`
          id,
          clave_evento,
          nombre_proyecto,
          fecha_evento,
          fecha_fin,
          status_pago,
          status_facturacion,
          total,
          utilidad,
          created_at
        `)
        .eq('cliente_id', clientId)
        .eq('activo', true)
        .order('fecha_evento', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching client events:', error);
      return [];
    }
  }

  // Statistics
  async getClientStats(): Promise<{
    totalClients: number;
    clientsWithEmail: number;
    clientsWithPhone: number;
    totalEvents: number;
    averageEventsPerClient: number;
  }> {
    try {
      const [clientsResult, eventsResult] = await Promise.all([
        supabase
          .from('evt_clientes_erp')
          .select('id, email, telefono')
          .eq('activo', true),
        supabase
          .from('evt_eventos_erp')
          .select('*', { count: 'exact', head: true })
          .eq('activo', true)
      ]);

      const clients = clientsResult.data || [];
      const totalEvents = eventsResult.count || 0;

      return {
        totalClients: clients.length,
        clientsWithEmail: clients.filter(c => c.email).length,
        clientsWithPhone: clients.filter(c => c.telefono).length,
        totalEvents,
        averageEventsPerClient: clients.length > 0 ? totalEvents / clients.length : 0
      };
    } catch (error) {
      console.error('Error fetching client stats:', error);
      return {
        totalClients: 0,
        clientsWithEmail: 0,
        clientsWithPhone: 0,
        totalEvents: 0,
        averageEventsPerClient: 0
      };
    }
  }

  // Validation
  validateClientData(data: Partial<Cliente>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.razon_social?.trim()) {
      errors.push('La razón social es requerida');
    }

    if (!data.rfc?.trim()) {
      errors.push('El RFC es requerido');
    } else {
      const rfcPattern = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
      if (!rfcPattern.test(data.rfc)) {
        errors.push('Formato de RFC inválido');
      }
    }

    if (!data.sufijo?.trim()) {
      errors.push('El sufijo es requerido');
    } else if (data.sufijo.length > 3) {
      errors.push('El sufijo no puede exceder 3 caracteres');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Formato de email inválido');
    }

    if (data.email_contacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_contacto)) {
      errors.push('Formato de email de contacto inválido');
    }

    if (data.telefono && !/^[\d\s\-\(\)]+$/.test(data.telefono)) {
      errors.push('Formato de teléfono inválido');
    }

    if (data.telefono_contacto && !/^[\d\s\-\(\)]+$/.test(data.telefono_contacto)) {
      errors.push('Formato de teléfono de contacto inválido');
    }

    if (data.dias_credito !== undefined && (data.dias_credito < 0 || data.dias_credito > 365)) {
      errors.push('Los días de crédito deben estar entre 0 y 365');
    }

    if (data.limite_credito !== undefined && data.limite_credito < 0) {
      errors.push('El límite de crédito no puede ser negativo');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Utility methods
  async checkRFCExists(rfc: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('evt_clientes_erp')
        .select('id')
        .eq('rfc', rfc.toUpperCase())
        .eq('activo', true);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking RFC:', error);
      return false;
    }
  }

  async getClientsByRFC(rfc: string): Promise<Cliente[]> {
    try {
      const { data, error } = await supabase
        .from('evt_clientes_erp')
        .select('*')
        .eq('rfc', rfc.toUpperCase())
        .eq('activo', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching clients by RFC:', error);
      return [];
    }
  }

  // Export functionality
  async exportClients(format: 'excel' | 'pdf' | 'csv' = 'excel'): Promise<void> {
    try {
      const clients = await this.getClients();
      
      // This would integrate with the export service
      console.log(`Exporting ${clients.length} clients to ${format}`);
      
      // TODO: Implement actual export functionality
      // exportService.exportClientsTo[format.toUpperCase()](clients);
    } catch (error) {
      console.error('Error exporting clients:', error);
      throw error;
    }
  }
}

export const clientsService = ClientsService.getInstance();