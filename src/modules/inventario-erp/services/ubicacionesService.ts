import { supabase } from '../../../core/config/supabase';
import type {
  UbicacionAlmacen,
  TipoUbicacion,
} from '../types';

// ============================================================================
// UBICACIONES EN ALMACÉN
// ============================================================================

/**
 * Obtener todas las ubicaciones de un almacén
 */
export const fetchUbicaciones = async (
  companyId: string,
  almacenId?: number
): Promise<UbicacionAlmacen[]> => {
  let query = supabase
    .from('ubicaciones_almacen_erp')
    .select(`
      *,
      almacen:almacenes_erp(id, nombre, codigo)
    `)
    .eq('company_id', companyId)
    .order('codigo', { ascending: true });

  if (almacenId) {
    query = query.eq('almacen_id', almacenId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Obtener una ubicación por ID
 */
export const fetchUbicacionById = async (id: number): Promise<UbicacionAlmacen | null> => {
  const { data, error } = await supabase
    .from('ubicaciones_almacen_erp')
    .select(`
      *,
      almacen:almacenes_erp(id, nombre, codigo)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

/**
 * Crear nueva ubicación
 */
export const createUbicacion = async (
  ubicacion: Partial<UbicacionAlmacen>,
  companyId: string
): Promise<UbicacionAlmacen> => {
  const { data, error } = await supabase
    .from('ubicaciones_almacen_erp')
    .insert([{
      ...ubicacion,
      company_id: companyId,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Actualizar ubicación
 */
export const updateUbicacion = async (
  id: number,
  ubicacion: Partial<UbicacionAlmacen>
): Promise<UbicacionAlmacen> => {
  const { data, error } = await supabase
    .from('ubicaciones_almacen_erp')
    .update(ubicacion)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Eliminar ubicación
 */
export const deleteUbicacion = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('ubicaciones_almacen_erp')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

/**
 * Generar código de ubicación automático
 */
export const generarCodigoUbicacion = (
  pasillo: string,
  rack: string,
  nivel: string,
  posicion?: string
): string => {
  let codigo = `${pasillo}-${rack}-${nivel}`;
  if (posicion) {
    codigo += `-${posicion}`;
  }
  return codigo.toUpperCase();
};

/**
 * Obtener ubicaciones disponibles para un producto
 * (que tengan capacidad y sean del tipo adecuado)
 */
export const fetchUbicacionesDisponibles = async (
  companyId: string,
  almacenId: number,
  tipoRequerido?: TipoUbicacion
): Promise<UbicacionAlmacen[]> => {
  let query = supabase
    .from('ubicaciones_almacen_erp')
    .select('*')
    .eq('company_id', companyId)
    .eq('almacen_id', almacenId)
    .eq('activo', true);

  if (tipoRequerido) {
    query = query.eq('tipo', tipoRequerido);
  }

  const { data, error } = await query.order('codigo');
  if (error) throw error;
  return data || [];
};

/**
 * Buscar ubicación por código
 */
export const buscarUbicacionPorCodigo = async (
  codigo: string,
  almacenId: number,
  companyId: string
): Promise<UbicacionAlmacen | null> => {
  const { data, error } = await supabase
    .from('ubicaciones_almacen_erp')
    .select('*')
    .eq('company_id', companyId)
    .eq('almacen_id', almacenId)
    .eq('codigo', codigo.toUpperCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

/**
 * Obtener mapa de ocupación de ubicaciones
 * Cuenta productos y unidades reales usando inv_existencias
 */
export const fetchOcupacionUbicaciones = async (
  companyId: string,
  almacenId: number
): Promise<{
  ubicacion_id: number;
  codigo: string;
  productos_count: number;
  unidades_total: number;
}[]> => {
  // Obtener ubicaciones del almacén
  const { data: ubicaciones, error: ubicError } = await supabase
    .from('inv_ubicaciones')
    .select('id, codigo')
    .eq('company_id', companyId)
    .eq('almacen_id', almacenId)
    .eq('activo', true);

  if (ubicError) throw ubicError;
  
  if (!ubicaciones || ubicaciones.length === 0) {
    return [];
  }

  // Obtener existencias por ubicación
  const { data: existencias, error: existError } = await supabase
    .from('inv_existencias')
    .select('ubicacion_id, producto_id, cantidad')
    .eq('company_id', companyId)
    .in('ubicacion_id', ubicaciones.map(u => u.id))
    .gt('cantidad', 0);

  if (existError) throw existError;

  // Agregar datos por ubicación
  const ocupacionMap = new Map<number, { productos: Set<number>; unidades: number }>();
  
  (existencias || []).forEach(e => {
    if (!ocupacionMap.has(e.ubicacion_id)) {
      ocupacionMap.set(e.ubicacion_id, { productos: new Set(), unidades: 0 });
    }
    const data = ocupacionMap.get(e.ubicacion_id)!;
    data.productos.add(e.producto_id);
    data.unidades += e.cantidad || 0;
  });

  return ubicaciones.map(u => ({
    ubicacion_id: u.id,
    codigo: u.codigo,
    productos_count: ocupacionMap.get(u.id)?.productos.size || 0,
    unidades_total: ocupacionMap.get(u.id)?.unidades || 0,
  }));
};
