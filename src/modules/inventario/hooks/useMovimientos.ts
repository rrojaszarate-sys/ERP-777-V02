/**
 * Hook para gestión de movimientos de inventario
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movimientosService } from '../services';
import type {
  Movimiento,
  MovimientoCompleto,
  MovimientoCompletoInsert,
  MovimientoFiltros
} from '../types';
import toast from 'react-hot-toast';

export const useMovimientos = (filtros?: MovimientoFiltros) => {
  const queryClient = useQueryClient();

  const {
    data: movimientos = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['movimientos', filtros],
    queryFn: () => movimientosService.getAll(filtros),
    staleTime: 2 * 60 * 1000 // 2 minutos
  });

  const createMutation = useMutation({
    mutationFn: (movimiento: MovimientoCompletoInsert) => movimientosService.create(movimiento),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['productos-con-existencias'] });
      toast.success(`Movimiento ${data.folio} creado exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear el movimiento');
    }
  });

  const procesarMutation = useMutation({
    mutationFn: (id: string) => movimientosService.procesar(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['movimiento', data.id] });
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['productos-con-existencias'] });
      queryClient.invalidateQueries({ queryKey: ['productos-estadisticas'] });
      toast.success(`Movimiento ${data.folio} procesado exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al procesar el movimiento');
    }
  });

  const cancelarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      movimientosService.cancelar(id, motivo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['movimiento', data.id] });
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['productos-con-existencias'] });
      toast.success(`Movimiento ${data.folio} cancelado`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cancelar el movimiento');
    }
  });

  return {
    movimientos,
    isLoading,
    error,
    isCreating: createMutation.isPending,
    isProcesando: procesarMutation.isPending,
    isCancelando: cancelarMutation.isPending,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    procesar: procesarMutation.mutate,
    procesarAsync: procesarMutation.mutateAsync,
    cancelar: cancelarMutation.mutate,
    cancelarAsync: cancelarMutation.mutateAsync
  };
};

export const useMovimiento = (id: string | undefined) => {
  const {
    data: movimiento,
    isLoading,
    error
  } = useQuery({
    queryKey: ['movimiento', id],
    queryFn: () => movimientosService.getById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000
  });

  return {
    movimiento,
    isLoading,
    error
  };
};
