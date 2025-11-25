import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { actividadesService } from '../services';
import type { Actividad, ActividadInsert } from '../types';
import { toast } from 'react-hot-toast';

export const useActividades = () => {
  const queryClient = useQueryClient();

  const { data: actividades = [], isLoading } = useQuery({
    queryKey: ['actividades'],
    queryFn: () => actividadesService.getAll(),
    staleTime: 3 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: ActividadInsert) => actividadesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actividades'] });
      toast.success('Actividad creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear actividad: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Actividad> }) =>
      actividadesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actividades'] });
      toast.success('Actividad actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar actividad: ${error.message}`);
    },
  });

  const completarMutation = useMutation({
    mutationFn: ({ id, resultado }: { id: string; resultado?: string }) =>
      actividadesService.completar(id, resultado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actividades'] });
      toast.success('Actividad completada');
    },
    onError: (error: Error) => {
      toast.error(`Error al completar actividad: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => actividadesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actividades'] });
      toast.success('Actividad eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar actividad: ${error.message}`);
    },
  });

  return {
    actividades,
    isLoading,
    createActividad: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateActividad: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    completarActividad: completarMutation.mutate,
    isCompletando: completarMutation.isPending,
    deleteActividad: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};

export const useActividadesLead = (leadId: string) => {
  const { data: actividades = [], isLoading } = useQuery({
    queryKey: ['actividades', 'lead', leadId],
    queryFn: () => actividadesService.getByLead(leadId),
    enabled: !!leadId,
    staleTime: 3 * 60 * 1000,
  });

  return { actividades, isLoading };
};

export const useActividadesOportunidad = (oportunidadId: string) => {
  const { data: actividades = [], isLoading } = useQuery({
    queryKey: ['actividades', 'oportunidad', oportunidadId],
    queryFn: () => actividadesService.getByOportunidad(oportunidadId),
    enabled: !!oportunidadId,
    staleTime: 3 * 60 * 1000,
  });

  return { actividades, isLoading };
};
