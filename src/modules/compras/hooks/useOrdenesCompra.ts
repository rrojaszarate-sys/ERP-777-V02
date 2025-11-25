/**
 * Hooks para gestión de órdenes de compra
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordenesCompraService } from '../services';
import type { OrdenCompra, OrdenCompraCompleta, OrdenCompraInsert } from '../types';
import toast from 'react-hot-toast';

export const useOrdenesCompra = () => {
  const queryClient = useQueryClient();

  const {
    data: ordenes = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['ordenes-compra'],
    queryFn: () => ordenesCompraService.getAll(),
    staleTime: 2 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (orden: OrdenCompraInsert) => ordenesCompraService.create(orden),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      toast.success(`Orden de Compra ${data.folio} creada exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear la orden de compra');
    }
  });

  return {
    ordenes,
    isLoading,
    error,
    isCreating: createMutation.isPending,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync
  };
};

export const useOrdenCompra = (id: string | undefined) => {
  const {
    data: orden,
    isLoading,
    error
  } = useQuery({
    queryKey: ['orden-compra', id],
    queryFn: () => ordenesCompraService.getById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000
  });

  return { orden, isLoading, error };
};
