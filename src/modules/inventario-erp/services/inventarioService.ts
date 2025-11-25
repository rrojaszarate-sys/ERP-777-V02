import { supabase } from '../../../core/config/supabase';
import type { Almacen, MovimientoInventario } from '../types';

// ============================================================================
// PRODUCTOS
// ============================================================================

export const fetchProductos = async (companyId: string) => {
  const { data, error } = await supabase
    .from('productos_erp')
    .select('*')
    .eq('company_id', companyId)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
};

export const createProducto = async (producto: any) => {
  const { data, error } = await supabase
    .from('productos_erp')
    .insert([producto])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProducto = async (id: number, producto: any) => {
  const { data, error } = await supabase
    .from('productos_erp')
    .update(producto)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProducto = async (id: number) => {
  const { error } = await supabase
    .from('productos_erp')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============================================================================
// ALMACENES
// ============================================================================

export const fetchAlmacenes = async (companyId: string) => {
  const { data, error } = await supabase
    .from('almacenes_erp')
    .select('*')
    .eq('company_id', companyId)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
};

export const createAlmacen = async (almacen: any) => {
  const { data, error } = await supabase
    .from('almacenes_erp')
    .insert([almacen])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAlmacen = async (id: number, almacen: any) => {
  const { data, error } = await supabase
    .from('almacenes_erp')
    .update(almacen)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAlmacen = async (id: number) => {
  const { error } = await supabase
    .from('almacenes_erp')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============================================================================
// MOVIMIENTOS
// ============================================================================

export const fetchMovimientos = async (companyId: string) => {
  const { data, error } = await supabase
    .from('movimientos_inventario_erp')
    .select(`
      *,
      producto:productos_erp(*),
      almacen:almacenes_erp(*)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
};

export const createMovimiento = async (movimiento: Partial<MovimientoInventario>) => {
  const { data, error } = await supabase
    .from('movimientos_inventario_erp')
    .insert([movimiento])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================================================
// STOCK Y ANÁLISIS
// ============================================================================

export const calcularStockPorProducto = async (companyId: string) => {
  // Obtener todos los movimientos
  const { data: movimientos, error: movError } = await supabase
    .from('movimientos_inventario_erp')
    .select('producto_id, tipo, cantidad')
    .eq('company_id', companyId);

  if (movError) throw movError;

  // Calcular stock por producto
  const stockMap: Record<number, number> = {};

  movimientos?.forEach(mov => {
    if (!stockMap[mov.producto_id]) {
      stockMap[mov.producto_id] = 0;
    }

    if (mov.tipo === 'entrada' || mov.tipo === 'ajuste') {
      stockMap[mov.producto_id] += mov.cantidad;
    } else if (mov.tipo === 'salida') {
      stockMap[mov.producto_id] -= mov.cantidad;
    }
  });

  return stockMap;
};

export const getProductosBajoStock = async (companyId: string) => {
  // Obtener productos
  const productos = await fetchProductos(companyId);

  // Calcular stock actual
  const stockMap = await calcularStockPorProducto(companyId);

  // Filtrar productos con stock bajo
  const productosBajos = productos.filter(p => {
    const stockActual = stockMap[p.id!] || 0;
    return stockActual < p.stock_minimo;
  });

  return productosBajos;
};
