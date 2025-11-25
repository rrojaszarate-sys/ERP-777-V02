import { supabase } from '../../../core/config/supabase';
import type { Proveedor, OrdenCompra, ProveedorProducto } from '../types';

// ============================================================================
// PROVEEDORES
// ============================================================================

export const fetchProveedores = async (companyId: string) => {
  const { data, error } = await supabase
    .from('proveedores_erp')
    .select('*')
    .eq('company_id', companyId)
    .order('razon_social', { ascending: true });
  if (error) throw error;
  return data;
};

export const createProveedor = async (proveedor: any) => {
  const { data, error } = await supabase
    .from('proveedores_erp')
    .insert([proveedor])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateProveedor = async (id: number, proveedor: any) => {
  const { data, error } = await supabase
    .from('proveedores_erp')
    .update(proveedor)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteProveedor = async (id: number) => {
  const { error } = await supabase
    .from('proveedores_erp')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ============================================================================
// ÓRDENES DE COMPRA
// ============================================================================

export const fetchOrdenesCompra = async (companyId: string) => {
  const { data, error } = await supabase
    .from('comp_ordenes_compra')
    .select('*, proveedor:prov_proveedores(*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createOrdenCompra = async (orden: Partial<OrdenCompra>, partidas: any[]) => {
  const { data: ordenData, error: ordenError } = await supabase
    .from('comp_ordenes_compra')
    .insert([orden])
    .select()
    .single();
  if (ordenError) throw ordenError;

  const partidasData = partidas.map(p => ({ ...p, orden_compra_id: ordenData.id }));
  const { error: partidasError } = await supabase
    .from('comp_partidas_oc')
    .insert(partidasData);
  if (partidasError) throw partidasError;

  return ordenData;
};

// ============================================================================
// RELACIÓN PROVEEDOR-PRODUCTO (Catálogo de productos por proveedor)
// ============================================================================

const PROVEEDOR_PRODUCTO_TABLE = 'proveedor_producto';

// Obtener productos de un proveedor específico
export const fetchProductosByProveedor = async (proveedorId: number, companyId: string) => {
  const { data, error } = await supabase
    .from(PROVEEDOR_PRODUCTO_TABLE)
    .select(`
      *,
      producto:productos_erp(id, codigo, nombre, categoria, unidad_medida, precio_venta)
    `)
    .eq('proveedor_id', proveedorId)
    .eq('company_id', companyId)
    .order('es_preferido', { ascending: false })
    .order('precio_proveedor', { ascending: true });

  if (error) {
    // Si la tabla no existe, retornar array vacío
    if (error.code === '42P01') return [];
    throw error;
  }
  return data || [];
};

// Obtener proveedores de un producto específico
export const fetchProveedoresByProducto = async (productoId: number, companyId: string) => {
  const { data, error } = await supabase
    .from(PROVEEDOR_PRODUCTO_TABLE)
    .select(`
      *,
      proveedor:proveedores_erp(id, razon_social, nombre_comercial, rfc, email, telefono)
    `)
    .eq('producto_id', productoId)
    .eq('company_id', companyId)
    .order('es_preferido', { ascending: false })
    .order('precio_proveedor', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return data || [];
};

// Crear relación proveedor-producto
export const createProveedorProducto = async (data: Partial<ProveedorProducto>) => {
  const { data: result, error } = await supabase
    .from(PROVEEDOR_PRODUCTO_TABLE)
    .insert([{
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return result;
};

// Actualizar relación proveedor-producto
export const updateProveedorProducto = async (id: number, data: Partial<ProveedorProducto>) => {
  const { data: result, error } = await supabase
    .from(PROVEEDOR_PRODUCTO_TABLE)
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result;
};

// Eliminar relación proveedor-producto
export const deleteProveedorProducto = async (id: number) => {
  const { error } = await supabase
    .from(PROVEEDOR_PRODUCTO_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Establecer proveedor preferido para un producto
export const setProveedorPreferido = async (productoId: number, proveedorProductoId: number, companyId: string) => {
  // Primero quitar el preferido de todos
  await supabase
    .from(PROVEEDOR_PRODUCTO_TABLE)
    .update({ es_preferido: false, updated_at: new Date().toISOString() })
    .eq('producto_id', productoId)
    .eq('company_id', companyId);

  // Luego establecer el nuevo preferido
  const { data, error } = await supabase
    .from(PROVEEDOR_PRODUCTO_TABLE)
    .update({ es_preferido: true, updated_at: new Date().toISOString() })
    .eq('id', proveedorProductoId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Obtener el mejor precio de un producto entre todos los proveedores
export const getMejorPrecioProducto = async (productoId: number, companyId: string) => {
  const { data, error } = await supabase
    .from(PROVEEDOR_PRODUCTO_TABLE)
    .select(`
      *,
      proveedor:proveedores_erp(razon_social, nombre_comercial)
    `)
    .eq('producto_id', productoId)
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('precio_proveedor', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// Buscar productos con precios de proveedores
export const searchProductosConProveedores = async (searchTerm: string, companyId: string) => {
  const { data, error } = await supabase
    .from('productos_erp')
    .select(`
      *,
      proveedores:${PROVEEDOR_PRODUCTO_TABLE}(
        id,
        proveedor_id,
        precio_proveedor,
        es_preferido,
        proveedor:proveedores_erp(razon_social)
      )
    `)
    .eq('company_id', companyId)
    .ilike('nombre', `%${searchTerm}%`)
    .limit(20);

  if (error) throw error;
  return data || [];
};
