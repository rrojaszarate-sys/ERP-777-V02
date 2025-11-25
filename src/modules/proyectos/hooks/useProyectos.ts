import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proyectosService } from '../services';
import type { Proyecto, ProyectoInsert, EstatusProyecto } from '../types';
import { toast } from 'react-hot-toast';

export const useProyectos = () => {
  const queryClient = useQueryClient();

  const { data: proyectos = [], isLoading } = useQuery({
    queryKey: ['proyectos'],
    queryFn: () => proyectosService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProyectoInsert) => proyectosService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Proyecto creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear proyecto: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Proyecto> }) =>
      proyectosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Proyecto actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar proyecto: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => proyectosService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Proyecto eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar proyecto: ${error.message}`);
    },
  });

  const cambiarEstatusMutation = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: EstatusProyecto }) =>
      proyectosService.cambiarEstatus(id, estatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Estatus actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error al cambiar estatus: ${error.message}`);
    },
  });

  return {
    proyectos,
    isLoading,
    createProyecto: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateProyecto: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteProyecto: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    cambiarEstatus: cambiarEstatusMutation.mutate,
    isCambiandoEstatus: cambiarEstatusMutation.isPending,
  };
};

export const useProyectosActivos = () => {
  const { data: proyectos = [], isLoading } = useQuery({
    queryKey: ['proyectos', 'activos'],
    queryFn: () => proyectosService.getActivos(),
    staleTime: 5 * 60 * 1000,
  });

  return { proyectos, isLoading };
};

export const useProyecto = (id: string) => {
  const { data: proyecto, isLoading, error } = useQuery({
    queryKey: ['proyecto', id],
    queryFn: () => proyectosService.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    proyecto,
    isLoading,
    error,
  };
};

export const useEstadisticasProyecto = (id: string) => {
  const { data: estadisticas, isLoading } = useQuery({
    queryKey: ['proyecto', id, 'estadisticas'],
    queryFn: () => proyectosService.getEstadisticas(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  return { estadisticas, isLoading };
};
