import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  fetchProductos,
  createProducto as createProductoService,
  updateProducto as updateProductoService,
  deleteProducto as deleteProductoService
} from '../services/inventarioService';

// Interfaz que coincide exactamente con la BD
export interface Producto {
  id?: number;
  company_id?: string;
  clave: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  precio_base: number;
  precio_venta: number;
  costo: number;
  margen: number;
  iva: boolean;
  clave_sat: string | null;
  clave_unidad_sat: string | null;
  tipo: string;
  activo: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export const useProductos = () => {
  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadProductos = useCallback(async () => {
    if (!user?.company_id) {
      setProductos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchProductos(user.company_id);
      setProductos(data || []);
    } catch (err: any) {
      console.error('Error al cargar productos:', err);
      setError(err.message || 'Error al cargar productos');
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  useEffect(() => {
    loadProductos();
  }, [loadProductos]);

  const createProducto = async (producto: Partial<Producto>) => {
    if (!user?.company_id) throw new Error('No se encontró company_id');

    try {
      setError(null);
      const nuevoProducto = {
        ...producto,
        company_id: user.company_id
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
