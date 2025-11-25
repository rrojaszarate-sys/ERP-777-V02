import { useState, useEffect } from 'react';
import { supabase } from '../../../core/config/supabase';
import {
  fetchProductos,
  createProducto as createProductoService,
  updateProducto as updateProductoService,
  deleteProducto as deleteProductoService
} from '../services/inventarioService';

interface Producto {
  id?: number;
  company_id?: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  unidad_medida: string;
  precio_compra: number;
  precio_venta: number;
  stock_minimo: number;
  stock_maximo: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useProductos = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadProductos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: userData } = await supabase
        .from('users_erp')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) throw new Error('No se encontró company_id');

      const data = await fetchProductos(userData.company_id);
      setProductos(data || []);
    } catch (err: any) {
      console.error('Error al cargar productos:', err);
      setError(err.message || 'Error al cargar productos');
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductos();
  }, []);

  const createProducto = async (producto: Omit<Producto, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: userData } = await supabase
        .from('users_erp')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) throw new Error('No se encontró company_id');

      const nuevoProducto = {
        ...producto,
        company_id: userData.company_id
      };

      const created = await createProductoService(nuevoProducto);
      await loadProductos();
      return created;
    } catch (err: any) {
      console.error('Error al crear producto:', err);
      setError(err.message || 'Error al crear producto');
      throw err;
    }
  };

  const updateProducto = async (id: number, producto: Partial<Producto>) => {
    try {
      setError(null);
      const updated = await updateProductoService(id, producto);
      await loadProductos();
      return updated;
    } catch (err: any) {
      console.error('Error al actualizar producto:', err);
      setError(err.message || 'Error al actualizar producto');
      throw err;
    }
  };

  const deleteProducto = async (id: number) => {
    try {
      setError(null);
      await deleteProductoService(id);
      await loadProductos();
    } catch (err: any) {
      console.error('Error al eliminar producto:', err);
      setError(err.message || 'Error al eliminar producto');
      throw err;
    }
  };

  return {
    productos,
    loading,
    error,
    createProducto,
    updateProducto,
    deleteProducto,
    refreshProductos: loadProductos
  };
};
