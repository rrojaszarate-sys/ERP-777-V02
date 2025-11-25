import { supabase } from '@/core/config/supabase';
import type { Proveedor, ProveedorInsert, ProveedorUpdate } from '../types';

export const proveedoresService = {
  async getAll(): Promise<Proveedor[]> {
    const { data, error } = await supabase
      .from('cmp_proveedores')
      .select('*')
      .is('deleted_at', null)
      .order('razon_social');

    if (error) throw error;
    return data as Proveedor[];
  },

  async getById(id: string): Promise<Proveedor> {
    const { data, error } = await supabase
      .from('cmp_proveedores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Proveedor;
  },

  async create(proveedor: ProveedorInsert): Promise<Proveedor> {
    const { data, error } = await supabase
      .from('cmp_proveedores')
      .insert(proveedor)
      .select()
      .single();

    if (error) throw error;
    return data as Proveedor;
  },

  async update(id: string, proveedor: ProveedorUpdate): Promise<Proveedor> {
    const { data, error } = await supabase
      .from('cmp_proveedores')
      .update(proveedor)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Proveedor;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('cmp_proveedores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
};
