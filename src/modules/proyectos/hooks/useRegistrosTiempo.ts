import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { registrosTiempoService } from '../services';
import type { RegistroTiempo, RegistroTiempoInsert } from '../types';
import { toast } from 'react-hot-toast';

export const useRegistrosTiempo = () => {
  const queryClient = useQueryClient();

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['registros-tiempo'],
    queryFn: () => registrosTiempoService.getAll(),
    staleTime: 3 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: RegistroTiempoInsert) => registrosTiempoService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-tiempo'] });
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Registro de tiempo creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear registro: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RegistroTiempo> }) =>
      registrosTiempoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-tiempo'] });
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      toast.success('Registro actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar registro: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => registrosTiempoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-tiempo'] });
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      toast.success('Registro eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar registro: ${error.message}`);
    },
  });

  return {
    registros,
    isLoading,
    createRegistro: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateRegistro: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteRegistro: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};

export const useRegistrosTiempoProyecto = (proyectoId: string) => {
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['registros-tiempo', 'proyecto', proyectoId],
    queryFn: () => registrosTiempoService.getByProyecto(proyectoId),
    enabled: !!proyectoId,
    staleTime: 2 * 60 * 1000,
  });

  return { registros, isLoading };
};

export const useRegistrosTiempoTarea = (tareaId: string) => {
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['registros-tiempo', 'tarea', tareaId],
    queryFn: () => registrosTiempoService.getByTarea(tareaId),
    enabled: !!tareaId,
    staleTime: 2 * 60 * 1000,
  });

  return { registros, isLoading };
};

export const useRegistrosTiempoUsuario = (usuarioId: string, fechaInicio?: string, fechaFin?: string) => {
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['registros-tiempo', 'usuario', usuarioId, fechaInicio, fechaFin],
    queryFn: () => registrosTiempoService.getByUsuario(usuarioId, fechaInicio, fechaFin),
    enabled: !!usuarioId,
    staleTime: 2 * 60 * 1000,
  });

  return { registros, isLoading };
};
