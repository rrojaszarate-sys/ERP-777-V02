import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oportunidadesService } from '../services';
import type { Oportunidad, OportunidadInsert } from '../types';
import { toast } from 'react-hot-toast';

export const useOportunidades = () => {
  const queryClient = useQueryClient();

  const { data: oportunidades = [], isLoading } = useQuery({
    queryKey: ['oportunidades'],
    queryFn: () => oportunidadesService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: OportunidadInsert) => oportunidadesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      toast.success('Oportunidad creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear oportunidad: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Oportunidad> }) =>
      oportunidadesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      toast.success('Oportunidad actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar oportunidad: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => oportunidadesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      toast.success('Oportunidad eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar oportunidad: ${error.message}`);
    },
  });

  const moverEtapaMutation = useMutation({
    mutationFn: ({ id, etapaId }: { id: string; etapaId: string }) =>
      oportunidadesService.moverEtapa(id, etapaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      toast.success('Oportunidad movida de etapa');
    },
    onError: (error: Error) => {
      toast.error(`Error al mover oportunidad: ${error.message}`);
    },
  });

  const ganarMutation = useMutation({
    mutationFn: ({ id, eventoId }: { id: string; eventoId?: string }) =>
      oportunidadesService.ganar(id, eventoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      toast.success('¡Oportunidad ganada!');
    },
    onError: (error: Error) => {
      toast.error(`Error al marcar oportunidad como ganada: ${error.message}`);
    },
  });

  const perderMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      oportunidadesService.perder(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      toast.success('Oportunidad marcada como perdida');
    },
    onError: (error: Error) => {
      toast.error(`Error al marcar oportunidad como perdida: ${error.message}`);
    },
  });

  return {
    oportunidades,
    isLoading,
    createOportunidad: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateOportunidad: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteOportunidad: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    moverEtapa: moverEtapaMutation.mutate,
    isMoviendoEtapa: moverEtapaMutation.isPending,
    ganarOportunidad: ganarMutation.mutate,
    isGanando: ganarMutation.isPending,
    perderOportunidad: perderMutation.mutate,
    isPerdiendo: perderMutation.isPending,
  };
};

export const useOportunidad = (id: string) => {
  const { data: oportunidad, isLoading, error } = useQuery({
    queryKey: ['oportunidad', id],
    queryFn: () => oportunidadesService.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    oportunidad,
    isLoading,
    error,
  };
};
