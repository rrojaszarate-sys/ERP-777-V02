// ============================================
// HOOKS DE REACT QUERY PARA TESORERÍA
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import { tesoreriaService } from '../services/tesoreriaService';
import toast from 'react-hot-toast';
import type { CuentaBancaria, MovimientoBancario } from '../types';

export const useCuentasBancarias = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cuentas-bancarias', user?.company_id],
    queryFn: () => tesoreriaService.fetchCuentasBancarias(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCuentaBancaria = (id: number) => {
  return useQuery({
    queryKey: ['cuenta-bancaria', id],
    queryFn: () => tesoreriaService.fetchCuentaBancariaById(id),
    enabled: !!id
  });
};

export const useCreateCuentaBancaria = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (cuenta: Partial<CuentaBancaria>) =>
      tesoreriaService.createCuentaBancaria({ ...cuenta, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-bancarias'] });
      toast.success('Cuenta bancaria creada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear cuenta');
    }
  });
};

export const useUpdateCuentaBancaria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cuenta }: { id: number; cuenta: Partial<CuentaBancaria> }) =>
      tesoreriaService.updateCuentaBancaria(id, cuenta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-bancarias'] });
      toast.success('Cuenta actualizada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar cuenta');
    }
  });
};

export const useMovimientosBancarios = (filters?: {
  cuenta_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  conciliado?: boolean;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['movimientos-bancarios', user?.company_id, filters],
    queryFn: () => tesoreriaService.fetchMovimientosBancarios(user!.company_id!, filters),
    enabled: !!user?.company_id
  });
};

export const useCreateMovimientoBancario = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (movimiento: Partial<MovimientoBancario>) =>
      tesoreriaService.createMovimientoBancario({ ...movimiento, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos-bancarios'] });
      queryClient.invalidateQueries({ queryKey: ['cuentas-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['metricas-tesoreria'] });
      toast.success('Movimiento registrado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al registrar movimiento');
    }
  });
};

export const useConciliarMovimiento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => tesoreriaService.conciliarMovimiento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos-bancarios'] });
      toast.success('Movimiento conciliado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al conciliar');
    }
  });
};

export const useMetricasTesoreria = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['metricas-tesoreria', user?.company_id],
    queryFn: () => tesoreriaService.fetchMetricasTesoreria(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useFlujoCaja = (meses: number = 12) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['flujo-caja', user?.company_id, meses],
    queryFn: () => tesoreriaService.fetchFlujoCaja(user!.company_id!, meses),
    enabled: !!user?.company_id
  });
};
