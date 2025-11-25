import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nominasService } from '../services';
import type { Nomina, NominaInsert } from '../types';
import { toast } from 'react-hot-toast';

export const useNominas = () => {
  const queryClient = useQueryClient();

  const { data: nominas = [], isLoading } = useQuery({
    queryKey: ['nominas'],
    queryFn: () => nominasService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: NominaInsert) => nominasService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nominas'] });
      toast.success('Nómina creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear nómina: ${error.message}`);
    },
  });

  const calcularMutation = useMutation({
    mutationFn: (id: string) => nominasService.calcular(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nominas'] });
      toast.success('Nómina calculada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al calcular nómina: ${error.message}`);
    },
  });

  const timbrarMutation = useMutation({
    mutationFn: (id: string) => nominasService.timbrar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nominas'] });
      toast.success('Nómina timbrada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al timbrar nómina: ${error.message}`);
    },
  });

  const marcarPagadaMutation = useMutation({
    mutationFn: (id: string) => nominasService.marcarPagada(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nominas'] });
      toast.success('Nómina marcada como pagada');
    },
    onError: (error: Error) => {
      toast.error(`Error al marcar nómina como pagada: ${error.message}`);
    },
  });

  return {
    nominas,
    isLoading,
    createNomina: createMutation.mutate,
    isCreating: createMutation.isPending,
    calcularNomina: calcularMutation.mutate,
    isCalculando: calcularMutation.isPending,
    timbrarNomina: timbrarMutation.mutate,
    isTimbrando: timbrarMutation.isPending,
    marcarPagada: marcarPagadaMutation.mutate,
    isMarcandoPagada: marcarPagadaMutation.isPending,
  };
};

export const useNomina = (id: string) => {
  const { data: nomina, isLoading, error } = useQuery({
    queryKey: ['nomina', id],
    queryFn: () => nominasService.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    nomina,
    isLoading,
    error,
  };
};

export const useConceptosNomina = () => {
  const { data: conceptos = [], isLoading } = useQuery({
    queryKey: ['conceptos-nomina'],
    queryFn: () => nominasService.getConceptos(),
    staleTime: 10 * 60 * 1000,
  });

  return { conceptos, isLoading };
};
