import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { turnosCajaService } from '../services';
import type { TurnoCaja, TurnoCajaInsert } from '../types';
import { toast } from 'react-hot-toast';

export const useTurnosCaja = () => {
  const queryClient = useQueryClient();

  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ['turnos-caja'],
    queryFn: () => turnosCajaService.getAll(),
    staleTime: 2 * 60 * 1000,
  });

  const abrirMutation = useMutation({
    mutationFn: (data: TurnoCajaInsert) => turnosCajaService.abrir(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-caja'] });
      toast.success('Turno abierto exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al abrir turno: ${error.message}`);
    },
  });

  const cerrarMutation = useMutation({
    mutationFn: ({ id, montoFinal, observaciones }: { id: string; montoFinal: number; observaciones?: string }) =>
      turnosCajaService.cerrar(id, montoFinal, observaciones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-caja'] });
      toast.success('Turno cerrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al cerrar turno: ${error.message}`);
    },
  });

  return {
    turnos,
    isLoading,
    abrirTurno: abrirMutation.mutate,
    isAbriendo: abrirMutation.isPending,
    cerrarTurno: cerrarMutation.mutate,
    isCerrando: cerrarMutation.isPending,
  };
};

export const useTurnoActual = (cajaId: string) => {
  const { data: turno, isLoading, error } = useQuery({
    queryKey: ['turno-actual', cajaId],
    queryFn: () => turnosCajaService.getTurnoActual(cajaId),
    enabled: !!cajaId,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 60 * 1000, // Refetch cada minuto
  });

  return {
    turno,
    isLoading,
    error,
  };
};

export const useCajasPOS = () => {
  const { data: cajas = [], isLoading } = useQuery({
    queryKey: ['cajas-pos'],
    queryFn: () => turnosCajaService.getCajas(),
    staleTime: 10 * 60 * 1000,
  });

  return { cajas, isLoading };
};
