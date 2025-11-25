import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import * as proveedoresService from '../services/proveedoresService';
import toast from 'react-hot-toast';

export const useProveedores = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['proveedores', user?.company_id],
    queryFn: () => proveedoresService.fetchProveedores(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateProveedor = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (proveedor: any) =>
      proveedoresService.createProveedor({ ...proveedor, company_id: user?.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear proveedor');
    }
  });
};

export const useUpdateProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proveedor }: { id: number; proveedor: any }) =>
      proveedoresService.updateProveedor(id, proveedor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar proveedor');
    }
  });
};

export const useDeleteProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => proveedoresService.deleteProveedor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar proveedor');
    }
  });
};

export const useOrdenesCompra = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ordenes-compra', user?.company_id],
    queryFn: () => proveedoresService.fetchOrdenesCompra(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateOrdenCompra = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ orden, partidas }: any) =>
      proveedoresService.createOrdenCompra({ ...orden, company_id: user?.company_id }, partidas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      toast.success('Orden de compra creada');
    }
  });
};
