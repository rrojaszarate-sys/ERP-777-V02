/**
 * Hook para gestión de productos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosService } from '../services';
import type {
  Producto,
  ProductoCompleto,
  ProductoInsert,
  ProductoUpdate,
  ProductoFiltros,
  CategoriaProducto,
  UnidadMedida
} from '../types';
import toast from 'react-hot-toast';

export const useProductos = (filtros?: ProductoFiltros) => {
  const queryClient = useQueryClient();

  // Queries
  const {
    data: productos = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['productos', filtros],
    queryFn: () => productosService.getAll(filtros),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000 // 30 minutos
  });

  const {
    data: productosConExistencias = [],
    isLoading: isLoadingConExistencias
  } = useQuery({
    queryKey: ['productos-con-existencias', filtros],
    queryFn: () => productosService.getAllConExistencias(filtros),
    staleTime: 2 * 60 * 1000,
    enabled: false // Solo cuando se necesite
  });

  const {
    data: estadisticas,
    isLoading: isLoadingEstadisticas
  } = useQuery({
    queryKey: ['productos-estadisticas'],
    queryFn: () => productosService.getEstadisticas(),
    staleTime: 5 * 60 * 1000
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (producto: ProductoInsert) => productosService.create(producto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['productos-estadisticas'] });
      toast.success(`Producto "${data.nombre}" creado exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear el producto');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: ProductoUpdate) => productosService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['producto', data.id] });
      toast.success(`Producto "${data.nombre}" actualizado exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar el producto');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      productosService.delete(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['productos-estadisticas'] });
      toast.success('Producto eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar el producto');
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => productosService.restore(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success(`Producto "${data.nombre}" restaurado exitosamente`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al restaurar el producto');
    }
  });

  return {
    // Data
    productos,
    productosConExistencias,
    estadisticas,

    // Loading states
    isLoading,
    isLoadingConExistencias,
    isLoadingEstadisticas,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Error
    error,

    // Mutations
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    restore: restoreMutation.mutate,
    restoreAsync: restoreMutation.mutateAsync
  };
};

export const useProducto = (id: string | undefined) => {
  const queryClient = useQueryClient();

  const {
    data: producto,
    isLoading,
    error
  } = useQuery({
    queryKey: ['producto', id],
    queryFn: () => productosService.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  });

  return {
    producto,
    isLoading,
    error
  };
};

export const useCategorias = () => {
  const queryClient = useQueryClient();

  const {
    data: categorias = [],
    isLoading
  } = useQuery({
    queryKey: ['categorias-productos'],
    queryFn: () => productosService.getCategorias(),
    staleTime: 10 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (categoria: Omit<CategoriaProducto, 'id' | 'created_at' | 'updated_at'>) =>
      productosService.createCategoria(categoria),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-productos'] });
      toast.success('Categoría creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear la categoría');
    }
  });

  return {
    categorias,
    isLoading,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending
  };
};

export const useUnidadesMedida = () => {
  const {
    data: unidades = [],
    isLoading
  } = useQuery({
    queryKey: ['unidades-medida'],
    queryFn: () => productosService.getUnidadesMedida(),
    staleTime: 30 * 60 * 1000 // 30 minutos
  });

  return {
    unidades,
    isLoading
  };
};
