/**
 * Hook para consultas de existencias
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { existenciasService } from '../services';
import type { Existencia, Lote, Serie } from '../types';
import toast from 'react-hot-toast';

export const useExistencias = () => {
  const {
    data: existencias = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['existencias'],
    queryFn: () => existenciasService.getAll(),
    staleTime: 2 * 60 * 1000
  });

  return {
    existencias,
    isLoading,
    error
  };
};

export const useExistenciasPorAlmacen = (almacenId: string | undefined) => {
  const {
    data: existencias,
    isLoading,
    error
  } = useQuery({
    queryKey: ['existencias-almacen', almacenId],
    queryFn: () => existenciasService.getPorAlmacen(almacenId!),
    enabled: !!almacenId,
    staleTime: 2 * 60 * 1000
  });

  return {
    existencias,
    isLoading,
    error
  };
};

export const useExistenciasPorProducto = (productoId: string | undefined) => {
  const {
    data: existencias,
    isLoading,
    error
  } = useQuery({
    queryKey: ['existencias-producto', productoId],
    queryFn: () => existenciasService.getPorProducto(productoId!),
    enabled: !!productoId,
    staleTime: 2 * 60 * 1000
  });

  return {
    existencias,
    isLoading,
    error
  };
};

export const useExistencia = (productoId: string | undefined, almacenId: string | undefined) => {
  const {
    data: existencia,
    isLoading,
    error
  } = useQuery({
    queryKey: ['existencia', productoId, almacenId],
    queryFn: () => existenciasService.getExistencia(productoId!, almacenId!),
    enabled: !!productoId && !!almacenId,
    staleTime: 1 * 60 * 1000
  });

  return {
    existencia,
    isLoading,
    error
  };
};

export const useReservaExistencias = () => {
  const queryClient = useQueryClient();

  const reservarMutation = useMutation({
    mutationFn: ({ productoId, almacenId, cantidad }: {
      productoId: string;
      almacenId: string;
      cantidad: number;
    }) => existenciasService.reservar(productoId, almacenId, cantidad),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['existencia'] });
      toast.success('Existencias reservadas exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al reservar existencias');
    }
  });

  const liberarMutation = useMutation({
    mutationFn: ({ productoId, almacenId, cantidad }: {
      productoId: string;
      almacenId: string;
      cantidad: number;
    }) => existenciasService.liberarReserva(productoId, almacenId, cantidad),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['existencia'] });
      toast.success('Reserva liberada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al liberar reserva');
    }
  });

  return {
    reservar: reservarMutation.mutate,
    reservarAsync: reservarMutation.mutateAsync,
    liberar: liberarMutation.mutate,
    liberarAsync: liberarMutation.mutateAsync,
    isReservando: reservarMutation.isPending,
    isLiberando: liberarMutation.isPending
  };
};

export const useLotes = (productoId: string | undefined, almacenId?: string) => {
  const {
    data: lotes = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['lotes', productoId, almacenId],
    queryFn: () => existenciasService.getLotes(productoId!, almacenId),
    enabled: !!productoId,
    staleTime: 5 * 60 * 1000
  });

  return {
    lotes,
    isLoading,
    error
  };
};

export const useLotesProximosVencer = (diasAntes: number = 30) => {
  const {
    data: lotes = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['lotes-proximos-vencer', diasAntes],
    queryFn: () => existenciasService.getLotesProximosVencer(diasAntes),
    staleTime: 10 * 60 * 1000
  });

  return {
    lotes,
    isLoading,
    error
  };
};

export const useSeries = (productoId: string | undefined, estatus?: string) => {
  const {
    data: series = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['series', productoId, estatus],
    queryFn: () => existenciasService.getSeries(productoId!, estatus),
    enabled: !!productoId,
    staleTime: 5 * 60 * 1000
  });

  return {
    series,
    isLoading,
    error
  };
};

export const useSeriesDisponibles = (productoId: string | undefined, almacenId: string | undefined) => {
  const {
    data: series = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['series-disponibles', productoId, almacenId],
    queryFn: () => existenciasService.getSeriesDisponibles(productoId!, almacenId!),
    enabled: !!productoId && !!almacenId,
    staleTime: 2 * 60 * 1000
  });

  return {
    series,
    isLoading,
    error
  };
};
