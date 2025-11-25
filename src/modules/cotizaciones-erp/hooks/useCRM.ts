/**
 * HOOKS DE CRM
 * Hooks personalizados para gestión de clientes, contactos y productos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import * as crmService from '../services/crmService';
import type { Cliente, Contacto, Producto, Oportunidad, Actividad } from '../types';
import toast from 'react-hot-toast';

// ============================================================================
// CLIENTES
// ============================================================================

export const useClientes = (filters?: {
  tipo?: string;
  ejecutivo_id?: string;
  busqueda?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crm-clientes', user?.company_id, filters],
    queryFn: () => crmService.fetchClientes(user!.company_id!, filters),
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCliente = (id: number | null) => {
  return useQuery({
    queryKey: ['crm-cliente', id],
    queryFn: () => crmService.fetchClienteById(id!),
    enabled: !!id,
  });
};

export const useCreateCliente = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (cliente: Partial<Cliente>) =>
      crmService.createCliente({
        ...cliente,
        company_id: user?.company_id,
        created_by: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-clientes'] });
      toast.success('Cliente creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear cliente: ${error.message}`);
    },
  });
};

export const useUpdateCliente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Cliente> }) =>
      crmService.updateCliente(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-clientes'] });
      queryClient.invalidateQueries({ queryKey: ['crm-cliente'] });
      toast.success('Cliente actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar cliente: ${error.message}`);
    },
  });
};

export const useDeleteCliente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => crmService.deleteCliente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-clientes'] });
      toast.success('Cliente eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar cliente: ${error.message}`);
    },
  });
};

// ============================================================================
// CONTACTOS
// ============================================================================

export const useContactosByCliente = (clienteId: number | null) => {
  return useQuery({
    queryKey: ['crm-contactos', clienteId],
    queryFn: () => crmService.fetchContactosByCliente(clienteId!),
    enabled: !!clienteId,
  });
};

export const useCreateContacto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contacto: Partial<Contacto>) =>
      crmService.createContacto(contacto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm-contactos', data.cliente_id] });
      toast.success('Contacto creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear contacto: ${error.message}`);
    },
  });
};

export const useUpdateContacto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Contacto> }) =>
      crmService.updateContacto(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contactos'] });
      toast.success('Contacto actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar contacto: ${error.message}`);
    },
  });
};

export const useDeleteContacto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => crmService.deleteContacto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contactos'] });
      toast.success('Contacto eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar contacto: ${error.message}`);
    },
  });
};

// ============================================================================
// PRODUCTOS
// ============================================================================

export const useProductos = (filters?: {
  tipo?: string;
  categoria?: string;
  busqueda?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cat-productos', user?.company_id, filters],
    queryFn: () => crmService.fetchProductos(user!.company_id!, filters),
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useProducto = (id: number | null) => {
  return useQuery({
    queryKey: ['cat-producto', id],
    queryFn: () => crmService.fetchProductoById(id!),
    enabled: !!id,
  });
};

export const useCreateProducto = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (producto: Partial<Producto>) =>
      crmService.createProducto({
        ...producto,
        company_id: user?.company_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cat-productos'] });
      toast.success('Producto creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear producto: ${error.message}`);
    },
  });
};

export const useUpdateProducto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Producto> }) =>
      crmService.updateProducto(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cat-productos'] });
      queryClient.invalidateQueries({ queryKey: ['cat-producto'] });
      toast.success('Producto actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar producto: ${error.message}`);
    },
  });
};

export const useDeleteProducto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => crmService.deleteProducto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cat-productos'] });
      toast.success('Producto eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar producto: ${error.message}`);
    },
  });
};

// ============================================================================
// OPORTUNIDADES
// ============================================================================

export const useOportunidades = (filters?: {
  etapa?: string;
  ejecutivo_id?: string;
  cliente_id?: number;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crm-oportunidades', user?.company_id, filters],
    queryFn: () => crmService.fetchOportunidades(user!.company_id!, filters),
    enabled: !!user?.company_id,
    staleTime: 1000 * 30,
  });
};

export const useOportunidad = (id: number | null) => {
  return useQuery({
    queryKey: ['crm-oportunidad', id],
    queryFn: () => crmService.fetchOportunidadById(id!),
    enabled: !!id,
  });
};

export const useCreateOportunidad = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (oportunidad: Partial<Oportunidad>) =>
      crmService.createOportunidad({
        ...oportunidad,
        company_id: user?.company_id,
        ejecutivo_id: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-oportunidades'] });
      toast.success('Oportunidad creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear oportunidad: ${error.message}`);
    },
  });
};

export const useUpdateOportunidad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Oportunidad> }) =>
      crmService.updateOportunidad(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-oportunidades'] });
      queryClient.invalidateQueries({ queryKey: ['crm-oportunidad'] });
      toast.success('Oportunidad actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar oportunidad: ${error.message}`);
    },
  });
};

export const useMoverOportunidadEtapa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      nuevaEtapa,
      probabilidad
    }: {
      id: number;
      nuevaEtapa: string;
      probabilidad?: number;
    }) => crmService.moverOportunidadEtapa(id, nuevaEtapa, probabilidad),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-oportunidades'] });
      toast.success('Oportunidad movida exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al mover oportunidad: ${error.message}`);
    },
  });
};

// ============================================================================
// ACTIVIDADES
// ============================================================================

export const useActividades = (filters?: {
  cliente_id?: number;
  oportunidad_id?: number;
  asignado_a?: string;
  status?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crm-actividades', user?.company_id, filters],
    queryFn: () => crmService.fetchActividades(user!.company_id!, filters),
    enabled: !!user?.company_id,
  });
};

export const useCreateActividad = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (actividad: Partial<Actividad>) =>
      crmService.createActividad({
        ...actividad,
        company_id: user?.company_id,
        asignado_a: actividad.asignado_a || user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-actividades'] });
      toast.success('Actividad creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear actividad: ${error.message}`);
    },
  });
};

export const useUpdateActividad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Actividad> }) =>
      crmService.updateActividad(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-actividades'] });
      toast.success('Actividad actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar actividad: ${error.message}`);
    },
  });
};

export const useCompletarActividad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, resultado }: { id: number; resultado?: string }) =>
      crmService.completarActividad(id, resultado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-actividades'] });
      toast.success('Actividad completada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al completar actividad: ${error.message}`);
    },
  });
};
