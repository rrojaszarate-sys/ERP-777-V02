import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import * as inventarioService from '../services/inventarioService';
import toast from 'react-hot-toast';

// ============================================================================
// ALMACENES
// ============================================================================

export const useAlmacenes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['almacenes', user?.company_id],
    queryFn: () => inventarioService.fetchAlmacenes(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateAlmacen = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (almacen: any) =>
      inventarioService.createAlmacen({ ...almacen, company_id: user?.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] });
      toast.success('Almacén creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear almacén');
    }
  });
};

export const useUpdateAlmacen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, almacen }: { id: number; almacen: any }) =>
      inventarioService.updateAlmacen(id, almacen),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] });
      toast.success('Almacén actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar almacén');
    }
  });
};

export const useDeleteAlmacen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => inventarioService.deleteAlmacen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] });
      toast.success('Almacén eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar almacén');
    }
  });
};

// ============================================================================
// MOVIMIENTOS
// ============================================================================

export const useMovimientos = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['movimientos-inventario', user?.company_id],
    queryFn: () => inventarioService.fetchMovimientos(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateMovimiento = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (movimiento: any) =>
      inventarioService.createMovimiento({ ...movimiento, company_id: user?.company_id, created_by: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos-inventario'] });
      queryClient.invalidateQueries({ queryKey: ['stock-bajo'] });
      toast.success('Movimiento registrado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al registrar movimiento');
    }
  });
};

// ============================================================================
// STOCK Y ANÁLISIS
// ============================================================================

export const useProductosBajoStock = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['stock-bajo', user?.company_id],
    queryFn: () => inventarioService.getProductosBajoStock(user!.company_id!),
    enabled: !!user?.company_id
  });
};
