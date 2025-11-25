// ============================================
// HOOKS DE REACT QUERY PARA RRHH Y NÓMINA
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import { rrhhService } from '../services/rrhhService';
import toast from 'react-hot-toast';
import type {
  Empleado,
  Departamento,
  Puesto,
  PeriodoNomina,
  ReciboNomina,
  Incidencia
} from '../types';

// ============================================
// HOOKS DE EMPLEADOS
// ============================================

export const useEmpleados = (filters?: {
  status?: string;
  departamento?: number;
  busqueda?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['empleados', user?.company_id, filters],
    queryFn: () => rrhhService.fetchEmpleados(user!.company_id!, filters),
    enabled: !!user?.company_id
  });
};

export const useEmpleado = (id: number) => {
  return useQuery({
    queryKey: ['empleado', id],
    queryFn: () => rrhhService.fetchEmpleadoById(id),
    enabled: !!id
  });
};

export const useGenerarNumeroEmpleado = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['numero-empleado', user?.company_id],
    queryFn: () => rrhhService.generarNumeroEmpleado(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateEmpleado = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (empleado: Partial<Empleado>) =>
      rrhhService.createEmpleado({ ...empleado, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      toast.success('Empleado creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear empleado');
    }
  });
};

export const useUpdateEmpleado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, empleado }: { id: number; empleado: Partial<Empleado> }) =>
      rrhhService.updateEmpleado(id, empleado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      toast.success('Empleado actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar empleado');
    }
  });
};

export const useDeleteEmpleado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => rrhhService.deleteEmpleado(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      toast.success('Empleado eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar empleado');
    }
  });
};

// ============================================
// HOOKS DE CATÁLOGOS
// ============================================

export const useDepartamentos = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['departamentos', user?.company_id],
    queryFn: () => rrhhService.fetchDepartamentos(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const usePuestos = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['puestos', user?.company_id],
    queryFn: () => rrhhService.fetchPuestos(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateDepartamento = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (departamento: Partial<Departamento>) =>
      rrhhService.createDepartamento({ ...departamento, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      toast.success('Departamento creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear departamento');
    }
  });
};

export const useCreatePuesto = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (puesto: Partial<Puesto>) =>
      rrhhService.createPuesto({ ...puesto, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puestos'] });
      toast.success('Puesto creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear puesto');
    }
  });
};

// ============================================
// HOOKS DE NÓMINA
// ============================================

export const usePeriodosNomina = (filters?: {
  año?: number;
  tipo?: string;
  status?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['periodos-nomina', user?.company_id, filters],
    queryFn: () => rrhhService.fetchPeriodosNomina(user!.company_id!, filters),
    enabled: !!user?.company_id
  });
};

export const usePeriodoNomina = (id: number) => {
  return useQuery({
    queryKey: ['periodo-nomina', id],
    queryFn: () => rrhhService.fetchPeriodoNominaById(id),
    enabled: !!id
  });
};

export const useCreatePeriodoNomina = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (periodo: Partial<PeriodoNomina>) =>
      rrhhService.createPeriodoNomina({ ...periodo, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-nomina'] });
      toast.success('Período de nómina creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear período de nómina');
    }
  });
};

export const useUpdatePeriodoNomina = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, periodo }: { id: number; periodo: Partial<PeriodoNomina> }) =>
      rrhhService.updatePeriodoNomina(id, periodo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-nomina'] });
      toast.success('Período de nómina actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar período de nómina');
    }
  });
};

export const useRecibosNomina = (periodoId: number) => {
  return useQuery({
    queryKey: ['recibos-nomina', periodoId],
    queryFn: () => rrhhService.fetchRecibosNomina(periodoId),
    enabled: !!periodoId
  });
};

export const useReciboNomina = (id: number) => {
  return useQuery({
    queryKey: ['recibo-nomina', id],
    queryFn: () => rrhhService.fetchReciboNominaById(id),
    enabled: !!id
  });
};

export const useCreateReciboNomina = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (recibo: Partial<ReciboNomina>) =>
      rrhhService.createReciboNomina({ ...recibo, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recibos-nomina'] });
      toast.success('Recibo de nómina creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear recibo de nómina');
    }
  });
};

export const useCalcularNomina = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (periodoId: number) => rrhhService.calcularNomina(periodoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-nomina'] });
      queryClient.invalidateQueries({ queryKey: ['recibos-nomina'] });
      toast.success('Nómina calculada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al calcular nómina');
    }
  });
};

// ============================================
// HOOKS DE INCIDENCIAS
// ============================================

export const useIncidencias = (filters?: {
  empleado_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['incidencias', user?.company_id, filters],
    queryFn: () => rrhhService.fetchIncidencias(user!.company_id!, filters),
    enabled: !!user?.company_id
  });
};

export const useCreateIncidencia = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (incidencia: Partial<Incidencia>) =>
      rrhhService.createIncidencia({ ...incidencia, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidencias'] });
      toast.success('Incidencia registrada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al registrar incidencia');
    }
  });
};

// ============================================
// HOOKS DE VACACIONES
// ============================================

export const useVacacionesEmpleado = (empleadoId: number, año?: number) => {
  return useQuery({
    queryKey: ['vacaciones-empleado', empleadoId, año],
    queryFn: () => rrhhService.fetchVacacionesEmpleado(empleadoId, año),
    enabled: !!empleadoId
  });
};
