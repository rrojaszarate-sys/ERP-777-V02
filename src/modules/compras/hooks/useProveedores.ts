/**
 * Hooks para gestión de proveedores
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proveedoresService } from '../services';
import type { Proveedor, ProveedorInsert, ProveedorUpdate } from '../types';
import toast from 'react-hot-toast';

export const useProveedores = () => {
  const queryClient = useQueryClient();

  const {
    data: proveedores = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => proveedoresService.getAll(),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (proveedor: ProveedorInsert) => proveedoresService.create(proveedor),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success(`Proveedor "${data.razon_social}" creado exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear el proveedor');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: ProveedorUpdate) => proveedoresService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      queryClient.invalidateQueries({ queryKey: ['proveedor', data.id] });
      toast.success(`Proveedor "${data.razon_social}" actualizado exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar el proveedor');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => proveedoresService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar el proveedor');
    }
  });

  return {
    proveedores,
    isLoading,
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

export const useProveedor = (id: string | undefined) => {
  const {
    data: proveedor,
    isLoading,
    error
  } = useQuery({
    queryKey: ['proveedor', id],
    queryFn: () => proveedoresService.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  });

  return { proveedor, isLoading, error };
};
