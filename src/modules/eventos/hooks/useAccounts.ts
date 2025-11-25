import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountsService } from '../services/accountsService';
import { CuentaContable } from '../types/Finance';
import toast from 'react-hot-toast';

/**
 * Hook para obtener todas las cuentas contables
 */
export const useAccounts = (filtros?: {
  tipo?: 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto';
  soloActivas?: boolean;
}) => {
  return useQuery({
    queryKey: ['cuentas-contables', filtros],
    queryFn: () => AccountsService.getCuentas(filtros),
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
};

/**
 * Hook para obtener solo cuentas de tipo GASTO
 */
export const useAccountsGasto = () => {
  return useQuery({
    queryKey: ['cuentas-contables', 'gasto'],
    queryFn: () => AccountsService.getCuentasGasto(),
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
};

/**
 * Hook para obtener una cuenta específica
 */
export const useAccount = (id: number | undefined) => {
  return useQuery({
    queryKey: ['cuenta-contable', id],
    queryFn: () => (id ? AccountsService.getCuentaById(id) : null),
    enabled: !!id,
    staleTime: 1000 * 60 * 30,
  });
};

/**
 * Hook para crear cuenta contable
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cuenta: Omit<CuentaContable, 'id' | 'created_at' | 'updated_at'>) =>
      AccountsService.createCuenta(cuenta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
      toast.success('Cuenta creada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error al crear cuenta:', error);
      toast.error(error.message || 'Error al crear cuenta');
    },
  });
};

/**
 * Hook para actualizar cuenta contable
 */
export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<CuentaContable> }) =>
      AccountsService.updateCuenta(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
      queryClient.invalidateQueries({ queryKey: ['cuenta-contable', data.id] });
      toast.success('Cuenta actualizada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error al actualizar cuenta:', error);
      toast.error(error.message || 'Error al actualizar cuenta');
    },
  });
};

/**
 * Hook para desactivar cuenta
 */
export const useDeactivateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => AccountsService.deactivateCuenta(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
      toast.success('Cuenta desactivada');
    },
    onError: (error: any) => {
      console.error('Error al desactivar cuenta:', error);
      toast.error(error.message || 'Error al desactivar cuenta');
    },
  });
};

/**
 * Hook para activar cuenta
 */
export const useActivateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => AccountsService.activateCuenta(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
      toast.success('Cuenta activada');
    },
    onError: (error: any) => {
      console.error('Error al activar cuenta:', error);
      toast.error(error.message || 'Error al activar cuenta');
    },
  });
};

/**
 * Hook para eliminar cuenta
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => AccountsService.deleteCuenta(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
      toast.success('Cuenta eliminada');
    },
    onError: (error: any) => {
      console.error('Error al eliminar cuenta:', error);
      toast.error(error.message || 'Error al eliminar cuenta');
    },
  });
};

/**
 * Hook para obtener gastos asociados a una cuenta
 */
export const useGastosPorCuenta = (cuentaId: number | undefined) => {
  return useQuery({
    queryKey: ['gastos-por-cuenta', cuentaId],
    queryFn: () => (cuentaId ? AccountsService.getGastosPorCuenta(cuentaId) : []),
    enabled: !!cuentaId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

/**
 * Hook para obtener resumen de gastos por cuenta
 */
export const useResumenGastosPorCuenta = (
  cuentaId: number | undefined,
  filtros?: { fechaInicio?: string; fechaFin?: string }
) => {
  return useQuery({
    queryKey: ['resumen-gastos-cuenta', cuentaId, filtros],
    queryFn: () =>
      cuentaId ? AccountsService.getResumenGastosPorCuenta(cuentaId, filtros) : null,
    enabled: !!cuentaId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook para obtener resumen general de todas las cuentas
 */
export const useResumenGeneralCuentas = () => {
  return useQuery({
    queryKey: ['resumen-general-cuentas'],
    queryFn: () => AccountsService.getResumenGeneral(),
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook para validar código de cuenta
 */
export const useValidarCodigoCuenta = () => {
  return useMutation({
    mutationFn: ({ codigo, excludeId }: { codigo: string; excludeId?: number }) =>
      AccountsService.validarCodigo(codigo, excludeId),
  });
};
