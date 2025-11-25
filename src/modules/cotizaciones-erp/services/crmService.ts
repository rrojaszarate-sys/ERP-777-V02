/**
 * SERVICIO DE CRM
 * Funciones para gestión de clientes, contactos y productos
 */

import { supabase } from '../../../core/config/supabase';
import type { Cliente, Contacto, Producto, Oportunidad, Actividad } from '../types';

// ============================================================================
// CLIENTES
// ============================================================================

export const fetchClientes = async (
  companyId: string,
  filters?: {
    tipo?: string;
    ejecutivo_id?: string;
    busqueda?: string;
  }
) => {
  let query = supabase
    .from('crm_clientes')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('razon_social');

  if (filters?.tipo) {
    query = query.eq('tipo', filters.tipo);
  }

  if (filters?.ejecutivo_id) {
    query = query.eq('ejecutivo_id', filters.ejecutivo_id);
  }

  if (filters?.busqueda) {
    query = query.or(`razon_social.ilike.%${filters.busqueda}%,nombre_comercial.ilike.%${filters.busqueda}%,rfc.ilike.%${filters.busqueda}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Cliente[];
};

export const fetchClienteById = async (id: number) => {
  const { data, error } = await supabase
    .from('crm_clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Cliente;
};

export const createCliente = async (cliente: Partial<Cliente>) => {
  const { data, error } = await supabase
    .from('crm_clientes')
    .insert([cliente])
    .select()
    .single();

  if (error) throw error;
  return data as Cliente;
};

export const updateCliente = async (id: number, updates: Partial<Cliente>) => {
  const { data, error } = await supabase
    .from('crm_clientes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Cliente;
};

export const deleteCliente = async (id: number) => {
  const { error } = await supabase
    .from('crm_clientes')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw error;
};

// ============================================================================
// CONTACTOS
// ============================================================================

export const fetchContactosByCliente = async (clienteId: number) => {
  const { data, error } = await supabase
    .from('crm_contactos')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('activo', true)
    .order('es_principal', { ascending: false })
    .order('nombre');

  if (error) throw error;
  return data as Contacto[];
};

export const createContacto = async (contacto: Partial<Contacto>) => {
  // Si es principal, quitar el flag de los demás contactos del cliente
  if (contacto.es_principal) {
    await supabase
      .from('crm_contactos')
      .update({ es_principal: false })
      .eq('cliente_id', contacto.cliente_id);
  }

  const { data, error } = await supabase
    .from('crm_contactos')
    .insert([contacto])
    .select()
    .single();

  if (error) throw error;
  return data as Contacto;
};

export const updateContacto = async (id: number, updates: Partial<Contacto>) => {
  // Si se marca como principal, quitar el flag de los demás
  if (updates.es_principal) {
    const { data: contacto } = await supabase
      .from('crm_contactos')
      .select('cliente_id')
      .eq('id', id)
      .single();

    if (contacto) {
      await supabase
        .from('crm_contactos')
        .update({ es_principal: false })
        .eq('cliente_id', contacto.cliente_id)
        .neq('id', id);
    }
  }

  const { data, error } = await supabase
    .from('crm_contactos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Contacto;
};

export const deleteContacto = async (id: number) => {
  const { error } = await supabase
    .from('crm_contactos')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw error;
};

// ============================================================================
// PRODUCTOS
// ============================================================================

export const fetchProductos = async (
  companyId: string,
  filters?: {
    tipo?: string;
    categoria?: string;
    busqueda?: string;
  }
) => {
  let query = supabase
    .from('cat_productos')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('nombre');

  if (filters?.tipo) {
    query = query.eq('tipo', filters.tipo);
  }

  if (filters?.categoria) {
    query = query.eq('categoria', filters.categoria);
  }

  if (filters?.busqueda) {
    query = query.or(`nombre.ilike.%${filters.busqueda}%,sku.ilike.%${filters.busqueda}%,descripcion.ilike.%${filters.busqueda}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Producto[];
};

export const fetchProductoById = async (id: number) => {
  const { data, error } = await supabase
    .from('cat_productos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Producto;
};

export const createProducto = async (producto: Partial<Producto>) => {
  const { data, error } = await supabase
    .from('cat_productos')
    .insert([producto])
    .select()
    .single();

  if (error) throw error;
  return data as Producto;
};

export const updateProducto = async (id: number, updates: Partial<Producto>) => {
  const { data, error } = await supabase
    .from('cat_productos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Producto;
};

export const deleteProducto = async (id: number) => {
  const { error } = await supabase
    .from('cat_productos')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw error;
};

// ============================================================================
// OPORTUNIDADES
// ============================================================================

export const fetchOportunidades = async (
  companyId: string,
  filters?: {
    etapa?: string;
    ejecutivo_id?: string;
    cliente_id?: number;
  }
) => {
  let query = supabase
    .from('crm_oportunidades')
    .select(`
      *,
      cliente:crm_clientes(*),
      contacto:crm_contactos(*)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (filters?.etapa) {
    query = query.eq('etapa', filters.etapa);
  }

  if (filters?.ejecutivo_id) {
    query = query.eq('ejecutivo_id', filters.ejecutivo_id);
  }

  if (filters?.cliente_id) {
    query = query.eq('cliente_id', filters.cliente_id);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as any[];
};

export const fetchOportunidadById = async (id: number) => {
  const { data, error } = await supabase
    .from('crm_oportunidades')
    .select(`
      *,
      cliente:crm_clientes(*),
      contacto:crm_contactos(*),
      cotizacion:cot_cotizaciones(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
};

export const createOportunidad = async (oportunidad: Partial<Oportunidad>) => {
  const { data, error } = await supabase
    .from('crm_oportunidades')
    .insert([oportunidad])
    .select()
    .single();

  if (error) throw error;
  return data as Oportunidad;
};

export const updateOportunidad = async (id: number, updates: Partial<Oportunidad>) => {
  const { data, error } = await supabase
    .from('crm_oportunidades')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Oportunidad;
};

export const moverOportunidadEtapa = async (
  id: number,
  nuevaEtapa: string,
  probabilidad?: number
) => {
  const updates: any = {
    etapa: nuevaEtapa,
    updated_at: new Date().toISOString()
  };

  if (probabilidad !== undefined) {
    updates.probabilidad = probabilidad;
  }

  // Si se marca como ganada o perdida, actualizar fecha de cierre real
  if (nuevaEtapa === 'ganada' || nuevaEtapa === 'perdida') {
    updates.fecha_cierre_real = new Date().toISOString();
  }

  return updateOportunidad(id, updates);
};

// ============================================================================
// ACTIVIDADES
// ============================================================================

export const fetchActividades = async (
  companyId: string,
  filters?: {
    cliente_id?: number;
    oportunidad_id?: number;
    asignado_a?: string;
    status?: string;
  }
) => {
  let query = supabase
    .from('crm_actividades')
    .select('*')
    .eq('company_id', companyId)
    .order('fecha_programada', { ascending: false });

  if (filters?.cliente_id) {
    query = query.eq('cliente_id', filters.cliente_id);
  }

  if (filters?.oportunidad_id) {
    query = query.eq('oportunidad_id', filters.oportunidad_id);
  }

  if (filters?.asignado_a) {
    query = query.eq('asignado_a', filters.asignado_a);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Actividad[];
};

export const createActividad = async (actividad: Partial<Actividad>) => {
  const { data, error } = await supabase
    .from('crm_actividades')
    .insert([actividad])
    .select()
    .single();

  if (error) throw error;
  return data as Actividad;
};

export const updateActividad = async (id: number, updates: Partial<Actividad>) => {
  const { data, error } = await supabase
    .from('crm_actividades')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Actividad;
};

export const completarActividad = async (id: number, resultado?: string) => {
  const updates: any = {
    status: 'completada',
    fecha_realizada: new Date().toISOString()
  };

  if (resultado) {
    updates.resultado = resultado;
  }

  return updateActividad(id, updates);
};
