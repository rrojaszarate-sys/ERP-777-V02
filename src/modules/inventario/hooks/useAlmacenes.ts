/**
 * Hook para gestión de almacenes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { almacenesService } from '../services';
import type {
  Almacen,
  AlmacenCompleto,
  AlmacenInsert,
  AlmacenUpdate,
  AlmacenFiltros,
  Ubicacion,
  UbicacionInsert,
  UbicacionUpdate
} from '../types';
import toast from 'react-hot-toast';

export const useAlmacenes = (filtros?: AlmacenFiltros) => {
  const queryClient = useQueryClient();

  const {
    data: almacenes = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['almacenes', filtros],
    queryFn: () => almacenesService.getAll(filtros),
    staleTime: 5 * 60 * 1000
  });

  const {
    data: almacenesCompletos = [],
    isLoading: isLoadingCompletos
  } = useQuery({
    queryKey: ['almacenes-completos'],
    queryFn: () => almacenesService.getAllCompleto(),
    staleTime: 5 * 60 * 1000,
    enabled: false // Solo cuando se necesite
  });

  const {
    data: estadisticas,
    isLoading: isLoadingEstadisticas
  } = useQuery({
    queryKey: ['almacenes-estadisticas'],
    queryFn: () => almacenesService.getEstadisticas(),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (almacen: AlmacenInsert) => almacenesService.create(almacen),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] });
      queryClient.invalidateQueries({ queryKey: ['almacenes-estadisticas'] });
      toast.success(`Almacén "${data.nombre}" creado exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear el almacén');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: AlmacenUpdate) => almacenesService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] });
      queryClient.invalidateQueries({ queryKey: ['almacen', data.id] });
      toast.success(`Almacén "${data.nombre}" actualizado exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar el almacén');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => almacenesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] });
      queryClient.invalidateQueries({ queryKey: ['almacenes-estadisticas'] });
      toast.success('Almacén eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar el almacén');
    }
  });

  return {
    almacenes,
    almacenesCompletos,
    estadisticas,
    isLoading,
    isLoadingCompletos,
    isLoadingEstadisticas,
    error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync
  };
};

export const useAlmacen = (id: string | undefined) => {
  const {
    data: almacen,
    isLoading,
    error
  } = useQuery({
    queryKey: ['almacen', id],
    queryFn: () => almacenesService.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  });

  return {
    almacen,
    isLoading,
    error
  };
};

export const useAlmacenPrincipal = () => {
  const {
    data: almacen,
    isLoading
  } = useQuery({
    queryKey: ['almacen-principal'],
    queryFn: () => almacenesService.getPrincipal(),
    staleTime: 10 * 60 * 1000
  });

  return {
    almacen,
    isLoading
  };
};

export const useUbicaciones = (almacenId?: string) => {
  const queryClient = useQueryClient();

  const {
    data: ubicaciones = [],
    isLoading
  } = useQuery({
    queryKey: ['ubicaciones', almacenId],
    queryFn: () => almacenId
      ? almacenesService.getUbicaciones(almacenId)
      : almacenesService.getAllUbicaciones(),
    staleTime: 5 * 60 * 1000,
    enabled: !!almacenId
  });

  const createMutation = useMutation({
    mutationFn: (ubicacion: UbicacionInsert) => almacenesService.createUbicacion(ubicacion),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] });
      toast.success(`Ubicación "${data.nombre}" creada exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear la ubicación');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: UbicacionUpdate) =>
      almacenesService.updateUbicacion(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] });
      toast.success(`Ubicación "${data.nombre}" actualizada exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar la ubicación');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => almacenesService.deleteUbicacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] });
      toast.success('Ubicación eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar la ubicación');
    }
  });

  return {
    ubicaciones,
    isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync
  };
};
