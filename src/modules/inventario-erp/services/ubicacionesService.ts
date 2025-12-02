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
  // Esta query requiere una vista o función en la base de datos
  // Por ahora retornamos datos básicos
  const { data, error } = await supabase
    .from('ubicaciones_almacen_erp')
    .select('id, codigo')
    .eq('company_id', companyId)
    .eq('almacen_id', almacenId)
    .eq('activo', true);

  if (error) throw error;
  
  // TODO: Implementar conteo real de productos por ubicación
  return (data || []).map(u => ({
    ubicacion_id: u.id,
    codigo: u.codigo,
    productos_count: 0,
    unidades_total: 0,
  }));
};
