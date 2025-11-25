import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsService } from '../services';
import type { Lead, LeadInsert } from '../types';
import { toast } from 'react-hot-toast';

export const useLeads = () => {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: LeadInsert) => leadsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear lead: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      leadsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar lead: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar lead: ${error.message}`);
    },
  });

  const calificarMutation = useMutation({
    mutationFn: ({ id, calificacion }: { id: string; calificacion: 'FRIO' | 'TIBIO' | 'CALIENTE' }) =>
      leadsService.calificar(id, calificacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead calificado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al calificar lead: ${error.message}`);
    },
  });

  const convertirMutation = useMutation({
    mutationFn: ({ id, clienteId }: { id: string; clienteId: string }) =>
      leadsService.convertir(id, clienteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead convertido a cliente exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al convertir lead: ${error.message}`);
    },
  });

  return {
    leads,
    isLoading,
    createLead: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateLead: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteLead: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    calificarLead: calificarMutation.mutate,
    isCalificando: calificarMutation.isPending,
    convertirLead: convertirMutation.mutate,
    isConvirtiendo: convertirMutation.isPending,
  };
};

export const useLead = (id: string) => {
  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsService.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    lead,
    isLoading,
    error,
  };
};
