import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ventasPOSService } from '../services';
import type { VentaPOS, VentaPOSInsert } from '../types';
import { toast } from 'react-hot-toast';

export const useVentasPOS = () => {
  const queryClient = useQueryClient();

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas-pos'],
    queryFn: () => ventasPOSService.getAll(),
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: VentaPOSInsert) => ventasPOSService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas-pos'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-caja'] });
      queryClient.invalidateQueries({ queryKey: ['turno-actual'] });
      toast.success('Venta registrada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar venta: ${error.message}`);
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      ventasPOSService.cancelar(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas-pos'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-caja'] });
      toast.success('Venta cancelada');
    },
    onError: (error: Error) => {
      toast.error(`Error al cancelar venta: ${error.message}`);
    },
  });

  return {
    ventas,
    isLoading,
    createVenta: createMutation.mutate,
    isCreating: createMutation.isPending,
    cancelarVenta: cancelarMutation.mutate,
    isCancelando: cancelarMutation.isPending,
  };
};

export const useVentasPOSTurno = (turnoId: string) => {
  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas-pos', 'turno', turnoId],
    queryFn: () => ventasPOSService.getByTurno(turnoId),
    enabled: !!turnoId,
    staleTime: 1 * 60 * 1000,
  });

  return { ventas, isLoading };
};

export const useVentaPOS = (id: string) => {
  const { data: venta, isLoading, error } = useQuery({
    queryKey: ['venta-pos', id],
    queryFn: () => ventasPOSService.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    venta,
    isLoading,
    error,
  };
};
