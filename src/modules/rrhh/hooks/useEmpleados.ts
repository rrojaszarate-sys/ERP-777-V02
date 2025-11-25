import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { empleadosService } from '../services';
import type { Empleado, EmpleadoInsert } from '../types';
import { toast } from 'react-hot-toast';

export const useEmpleados = () => {
  const queryClient = useQueryClient();

  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => empleadosService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: EmpleadoInsert) => empleadosService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      toast.success('Empleado creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear empleado: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Empleado> }) =>
      empleadosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      toast.success('Empleado actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar empleado: ${error.message}`);
    },
  });

  const darBajaMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      empleadosService.darBaja(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      toast.success('Empleado dado de baja');
    },
    onError: (error: Error) => {
      toast.error(`Error al dar de baja: ${error.message}`);
    },
  });

  return {
    empleados,
    isLoading,
    createEmpleado: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateEmpleado: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    darBajaEmpleado: darBajaMutation.mutate,
    isDandoBaja: darBajaMutation.isPending,
  };
};

export const useEmpleadosActivos = () => {
  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['empleados', 'activos'],
    queryFn: () => empleadosService.getActivos(),
    staleTime: 5 * 60 * 1000,
  });

  return { empleados, isLoading };
};

export const useEmpleado = (id: string) => {
  const { data: empleado, isLoading, error } = useQuery({
    queryKey: ['empleado', id],
    queryFn: () => empleadosService.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    empleado,
    isLoading,
    error,
  };
};

export const useDepartamentos = () => {
  const { data: departamentos = [], isLoading } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => empleadosService.getDepartamentos(),
    staleTime: 10 * 60 * 1000,
  });

  return { departamentos, isLoading };
};

export const usePuestos = () => {
  const { data: puestos = [], isLoading } = useQuery({
    queryKey: ['puestos'],
    queryFn: () => empleadosService.getPuestos(),
    staleTime: 10 * 60 * 1000,
  });

  return { puestos, isLoading };
};
