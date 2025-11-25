/**
 * HOOKS DE CONTABILIDAD
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import * as contabilidadService from '../services/contabilidadService';
import type { PlanCuentas, Poliza, PolizaConMovimientos, Movimiento } from '../types';
import toast from 'react-hot-toast';

// ============================================================================
// PLAN DE CUENTAS
// ============================================================================

export const usePlanCuentas = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['plan-cuentas', user?.company_id],
    queryFn: () => contabilidadService.fetchPlanCuentas(user!.company_id!),
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

export const useCuentasOperativas = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cuentas-operativas', user?.company_id],
    queryFn: () => contabilidadService.fetchCuentasQueAceptanMovimientos(user!.company_id!),
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateCuenta = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (cuenta: Partial<PlanCuentas>) =>
      contabilidadService.createCuenta({
        ...cuenta,
        company_id: user?.company_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-cuentas'] });
      toast.success('Cuenta creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear cuenta: ${error.message}`);
    },
  });
};

export const useUpdateCuenta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<PlanCuentas> }) =>
      contabilidadService.updateCuenta(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-cuentas'] });
      toast.success('Cuenta actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar cuenta: ${error.message}`);
    },
  });
};

// ============================================================================
// PÓLIZAS
// ============================================================================

export const usePolizas = (filters?: {
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo?: string;
  status?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['polizas', user?.company_id, filters],
    queryFn: () => contabilidadService.fetchPolizas(user!.company_id!, filters),
    enabled: !!user?.company_id,
    staleTime: 1000 * 30, // 30 segundos
  });
};

export const usePoliza = (id: number | null) => {
  return useQuery({
    queryKey: ['poliza', id],
    queryFn: () => contabilidadService.fetchPolizaById(id!),
    enabled: !!id,
  });
};

export const useCreatePoliza = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      polizaData,
      movimientos,
    }: {
      polizaData: Partial<Poliza>;
      movimientos: Partial<Movimiento>[];
    }) =>
      contabilidadService.createPoliza(
        {
          ...polizaData,
          company_id: user?.company_id,
          created_by: user?.id,
        },
        movimientos
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polizas'] });
      queryClient.invalidateQueries({ queryKey: ['plan-cuentas'] }); // Actualizar saldos
      toast.success('Póliza creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear póliza: ${error.message}`);
    },
  });
};

export const useAplicarPoliza = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => contabilidadService.aplicarPoliza(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polizas'] });
      queryClient.invalidateQueries({ queryKey: ['plan-cuentas'] });
      toast.success('Póliza aplicada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al aplicar póliza: ${error.message}`);
    },
  });
};

export const useCancelarPoliza = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      contabilidadService.cancelarPoliza(id, user!.id!, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polizas'] });
      queryClient.invalidateQueries({ queryKey: ['plan-cuentas'] });
      toast.success('Póliza cancelada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al cancelar póliza: ${error.message}`);
    },
  });
};

// ============================================================================
// REPORTES
// ============================================================================

export const useLibroDiario = (fechaInicio: string, fechaFin: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['libro-diario', user?.company_id, fechaInicio, fechaFin],
    queryFn: () =>
      contabilidadService.fetchLibroDiario(user!.company_id!, fechaInicio, fechaFin),
    enabled: !!user?.company_id && !!fechaInicio && !!fechaFin,
  });
};

export const useMayorGeneral = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mayor-general', user?.company_id],
    queryFn: () => contabilidadService.fetchMayorGeneral(user!.company_id!),
    enabled: !!user?.company_id,
  });
};

export const useBalanceComprobacion = (fechaInicio: string, fechaFin: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['balance-comprobacion', user?.company_id, fechaInicio, fechaFin],
    queryFn: () =>
      contabilidadService.fetchBalanceComprobacion(user!.company_id!, fechaInicio, fechaFin),
    enabled: !!user?.company_id && !!fechaInicio && !!fechaFin,
  });
};

// ============================================================================
// PERIODOS CONTABLES
// ============================================================================

export const usePeriodos = (anio?: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['periodos', user?.company_id, anio],
    queryFn: () => contabilidadService.fetchPeriodos(user!.company_id!, anio),
    enabled: !!user?.company_id,
  });
};

export const useCerrarPeriodo = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (periodoId: number) =>
      contabilidadService.cerrarPeriodo(periodoId, user!.id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
      toast.success('Periodo cerrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al cerrar periodo: ${error.message}`);
    },
  });
};
