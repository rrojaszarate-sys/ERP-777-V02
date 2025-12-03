import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { useAuth } from '../../../core/auth/AuthProvider';
import { Cliente } from '../types/Event';

export const useClients = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const clientsQuery = useQuery({
    queryKey: ['clients', user?.company_id],
    queryFn: async (): Promise<Cliente[]> => {
      try {
        // Construir query base
        let query = supabase
          .from('evt_clientes_erp')
          .select('*')
          .eq('activo', true);

        // Filtrar por company_id si el usuario tiene uno
        if (user?.company_id) {
          query = query.eq('company_id', user.company_id);
        }

        const { data, error } = await query.order('razon_social');

        if (error) {
          console.error('Error cargando clientes:', error);
          throw error;
        }

        console.log('✅ Clientes cargados:', data?.length || 0);
        return data || [];
      } catch (error) {
        console.error('⚠️ Error fetching clients:', error);
        return [];
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: Partial<Cliente>): Promise<Cliente> => {
      // Get company_id from current user
      let company_id = null;
      let created_by = null;
      
      if (user?.id) {
        // Check if this is a mock development user
        if (user.id === '00000000-0000-0000-0000-000000000001') {
          // Use mock data for development
          company_id = null; // or use a default company_id if needed
          created_by = null; // Don't set created_by for mock user
        } else {
          try {
            const { data: userData } = await supabase
              .from('core_users')
              .select('company_id')
              .eq('id', user.id)
              .single();
            company_id = userData?.company_id;
            created_by = user.id;
          } catch (error) {
            console.warn('Could not fetch user company_id, using null');
            company_id = null;
            created_by = null;
          }
        }
      }

      const { data, error } = await supabase
        .from('evt_clientes_erp')
        .insert([{
          ...clientData,
          company_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-list'] });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Cliente> }): Promise<Cliente> => {
      const { data: updatedData, error } = await supabase
        .from('evt_clientes_erp')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-list'] });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Soft delete - mark as inactive
      const { error } = await supabase
        .from('evt_clientes_erp')
        .update({ 
          activo: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-list'] });
    },
  });

  const getClientById = async (id: string): Promise<Cliente | null> => {
    try {
      const { data, error } = await supabase
        .from('evt_clientes_erp')
        .select('*')
        .eq('id', id)
        .eq('activo', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching client by id:', error);
      return null;
    }
  };

  const validateClientData = (data: Partial<Cliente>): { valid: boolean; errors: string[] } => {
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

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Formato de email inválido');
    }

    if (data.email_contacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_contacto)) {
      errors.push('Formato de email de contacto inválido');
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
  };

  return {
    clients: clientsQuery.data || [],
    isLoading: clientsQuery.isLoading,
    error: clientsQuery.error,
    refetch: clientsQuery.refetch,
    createClient: createClientMutation.mutate,
    updateClient: updateClientMutation.mutate,
    deleteClient: deleteClientMutation.mutate,
    isCreating: createClientMutation.isPending,
    isUpdating: updateClientMutation.isPending,
    isDeleting: deleteClientMutation.isPending,
    getClientById,
    validateClientData,
  };
};

export const useClientEvents = (clientId: string) => {
  return useQuery({
    queryKey: ['client-events', clientId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('evt_eventos_erp')
          .select(`
            id,
            clave_evento,
            nombre_proyecto,
            fecha_evento,
            status_pago,
            total,
            utilidad
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
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useClientStats = () => {
  return useQuery({
    queryKey: ['client-stats'],
    queryFn: async () => {
      try {
        const { data: clients, error: clientsError } = await supabase
          .from('evt_clientes_erp')
          .select('id, email, telefono')
          .eq('activo', true);

        if (clientsError) throw clientsError;

        const { count: totalEvents, error: eventsError } = await supabase
          .from('evt_eventos_erp')
          .select('*', { count: 'exact', head: true })
          .eq('activo', true);

        if (eventsError) throw eventsError;

        return {
          totalClients: clients?.length || 0,
          clientsWithEmail: clients?.filter(c => c.email).length || 0,
          clientsWithPhone: clients?.filter(c => c.telefono).length || 0,
          totalEvents: totalEvents || 0
        };
      } catch (error) {
        console.error('Error fetching client stats:', error);
        return {
          totalClients: 0,
          clientsWithEmail: 0,
          clientsWithPhone: 0,
          totalEvents: 0
        };
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};