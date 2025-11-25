import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tareasService } from '../services';
import type { Tarea, TareaInsert, EstatusTarea } from '../types';
import { toast } from 'react-hot-toast';

export const useTareas = () => {
  const queryClient = useQueryClient();

  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ['tareas'],
    queryFn: () => tareasService.getAll(),
    staleTime: 3 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: TareaInsert) => tareasService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Tarea creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear tarea: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tarea> }) =>
      tareasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      toast.success('Tarea actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar tarea: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tareasService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      toast.success('Tarea eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar tarea: ${error.message}`);
    },
  });

  const cambiarEstatusMutation = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: EstatusTarea }) =>
      tareasService.cambiarEstatus(id, estatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      toast.success('Estatus actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error al cambiar estatus: ${error.message}`);
    },
  });

  return {
    tareas,
    isLoading,
    createTarea: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateTarea: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteTarea: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    cambiarEstatus: cambiarEstatusMutation.mutate,
    isCambiandoEstatus: cambiarEstatusMutation.isPending,
  };
};

export const useTareasProyecto = (proyectoId: string) => {
  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ['tareas', 'proyecto', proyectoId],
    queryFn: () => tareasService.getByProyecto(proyectoId),
    enabled: !!proyectoId,
    staleTime: 2 * 60 * 1000,
  });

  return { tareas, isLoading };
};

export const useTarea = (id: string) => {
  const { data: tarea, isLoading, error } = useQuery({
    queryKey: ['tarea', id],
    queryFn: () => tareasService.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    tarea,
    isLoading,
    error,
  };
};
