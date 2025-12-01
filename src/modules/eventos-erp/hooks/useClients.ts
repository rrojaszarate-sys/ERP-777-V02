import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { useAuth } from '../../../core/auth/AuthProvider';
import { Cliente } from '../types/Event';

export const useClients = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<Cliente[]> => {
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes('your-project') || 
          supabaseUrl.includes('placeholder.supabase.co') ||
          supabaseKey.includes('your-anon-key') ||
          supabaseKey === 'dummy-key') {
        console.warn('⚠️ Supabase not configured for clients, using mock data');
        return [
          {
            id: '1',
            razon_social: 'Tech Innovations SA de CV',
            nombre_comercial: 'TechInno',
            rfc: 'TIN123456ABC',
            email: 'contacto@techinno.com',
            telefono: '55-1234-5678',
            contacto_principal: 'Ana García',
            regimen_fiscal: '601',
            uso_cfdi: 'G03',
            metodo_pago: 'PUE',
            forma_pago: '03',
            dias_credito: 30,
            activo: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '2',
            razon_social: 'Corporativo Global SA',
            nombre_comercial: 'CorpGlobal',
            rfc: 'CGL789012DEF',
            email: 'eventos@corpglobal.com',
            telefono: '55-9876-5432',
            contacto_principal: 'Carlos Rodríguez',
            regimen_fiscal: '612',
            uso_cfdi: 'G01',
            metodo_pago: 'PPD',
            forma_pago: '03',
            dias_credito: 45,
            activo: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ];
      }

      try {
        // Test connectivity first
        const { error: connectError } = await supabase.from('evt_clientes_erp').select('id').limit(1);
        if (connectError) {
          throw new Error(`Connectivity issue: ${connectError.message}`);
        }

        const { data, error } = await supabase
          .from('evt_clientes_erp')
          .select('*')
          .eq('activo', true)
          .order('razon_social');

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.warn('⚠️ Error fetching clients from Supabase, using mock data:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry failed requests
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