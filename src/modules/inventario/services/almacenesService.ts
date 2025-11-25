/**
 * Servicio para gestión de almacenes y ubicaciones
 */

import { supabase } from '@/core/config/supabase';
import type {
  Almacen,
  AlmacenCompleto,
  AlmacenInsert,
  AlmacenUpdate,
  AlmacenFiltros,
  Ubicacion,
  UbicacionInsert,
  UbicacionUpdate,
  UbicacionFiltros,
  AlmacenEstadisticas
} from '../types';

export const almacenesService = {
  // ===================================
  // ALMACENES
  // ===================================

  /**
   * Obtiene todos los almacenes
   */
  async getAll(filtros?: AlmacenFiltros): Promise<Almacen[]> {
    let query = supabase
      .from('inv_almacenes')
      .select(`
        *,
        responsable:core_users(id, nombre, email)
      `)
      .order('nombre', { ascending: true });

    // Aplicar filtros
    if (filtros?.search) {
      query = query.or(`nombre.ilike.%${filtros.search}%,codigo.ilike.%${filtros.search}%`);
    }

    if (filtros?.tipo) {
      query = query.eq('tipo', filtros.tipo);
    }

    if (filtros?.activo !== undefined) {
      query = query.eq('activo', filtros.activo);
    }

    if (filtros?.responsable_id) {
      query = query.eq('responsable_id', filtros.responsable_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener almacenes:', error);
      throw error;
    }

    return data as Almacen[];
  },

  /**
   * Obtiene almacenes con información completa
   */
  async getAllCompleto(): Promise<AlmacenCompleto[]> {
    const { data, error } = await supabase
      .from('inv_almacenes')
      .select(`
        *,
        responsable:core_users(id, nombre, email),
        ubicaciones:inv_ubicaciones(*)
      `)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener almacenes completos:', error);
      throw error;
    }

    // Obtener estadísticas de cada almacén
    const almacenesCompletos = await Promise.all(
      data.map(async (almacen: any) => {
        // Contar productos
        const { count: totalProductos } = await supabase
          .from('inv_existencias')
          .select('producto_id', { count: 'exact', head: true })
          .eq('almacen_id', almacen.id)
          .gt('cantidad', 0);

        // Calcular valor del inventario
        const { data: existencias } = await supabase
          .from('inv_existencias')
          .select('cantidad, costo_promedio')
          .eq('almacen_id', almacen.id);

        const valorInventario = existencias?.reduce((sum, e) =>
          sum + (e.cantidad * e.costo_promedio), 0
        ) || 0;

        return {
          ...almacen,
          total_productos: totalProductos || 0,
          valor_inventario: valorInventario
        };
      })
    );

    return almacenesCompletos as AlmacenCompleto[];
  },

  /**
   * Obtiene un almacén por ID
   */
  async getById(id: string): Promise<Almacen> {
    const { data, error } = await supabase
      .from('inv_almacenes')
      .select(`
        *,
        responsable:core_users(id, nombre, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error al obtener almacén:', error);
      throw error;
    }

    return data as Almacen;
  },

  /**
   * Obtiene el almacén principal
   */
  async getPrincipal(): Promise<Almacen | null> {
    const { data, error } = await supabase
      .from('inv_almacenes')
      .select(`
        *,
        responsable:core_users(id, nombre, email)
      `)
      .eq('es_principal', true)
      .eq('activo', true)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener almacén principal:', error);
      throw error;
    }

    return data as Almacen | null;
  },

  /**
   * Crea un nuevo almacén
   */
  async create(almacen: AlmacenInsert): Promise<Almacen> {
    // Si se marca como principal, desmarcar los demás
    if (almacen.es_principal) {
      await supabase
        .from('inv_almacenes')
        .update({ es_principal: false })
        .eq('es_principal', true);
    }

    const { data, error } = await supabase
      .from('inv_almacenes')
      .insert({
        ...almacen,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        responsable:core_users(id, nombre, email)
      `)
      .single();

    if (error) {
      console.error('Error al crear almacén:', error);
      throw error;
    }

    return data as Almacen;
  },

  /**
   * Actualiza un almacén
   */
  async update(id: string, almacen: AlmacenUpdate): Promise<Almacen> {
    // Si se marca como principal, desmarcar los demás
    if (almacen.es_principal) {
      await supabase
        .from('inv_almacenes')
        .update({ es_principal: false })
        .eq('es_principal', true)
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('inv_almacenes')
      .update({
        ...almacen,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        responsable:core_users(id, nombre, email)
      `)
      .single();

    if (error) {
      console.error('Error al actualizar almacén:', error);
      throw error;
    }

    return data as Almacen;
  },

  /**
   * Elimina un almacén (solo si no tiene existencias)
   */
  async delete(id: string): Promise<void> {
    // Verificar que no tenga existencias
    const { count } = await supabase
      .from('inv_existencias')
      .select('id', { count: 'exact', head: true })
      .eq('almacen_id', id)
      .gt('cantidad', 0);

    if (count && count > 0) {
      throw new Error('No se puede eliminar el almacén porque tiene existencias');
    }

    const { error } = await supabase
      .from('inv_almacenes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar almacén:', error);
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de almacenes
   */
  async getEstadisticas(): Promise<AlmacenEstadisticas> {
    const { count: total } = await supabase
      .from('inv_almacenes')
      .select('*', { count: 'exact', head: true });

    const { count: activos } = await supabase
      .from('inv_almacenes')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    // Total de productos almacenados (únicos)
    const { data: productos } = await supabase
      .from('inv_existencias')
      .select('producto_id')
      .gt('cantidad', 0);

    const productosUnicos = new Set(productos?.map(p => p.producto_id));

    // Valor total
    const { data: existencias } = await supabase
      .from('inv_existencias')
      .select('cantidad, costo_promedio');

    const valorTotal = existencias?.reduce((sum, e) =>
      sum + (e.cantidad * e.costo_promedio), 0
    ) || 0;

    // Almacén principal
    const principal = await this.getPrincipal();

    return {
      total_almacenes: total || 0,
      almacenes_activos: activos || 0,
      total_productos_almacenados: productosUnicos.size,
      valor_total: valorTotal,
      almacen_principal: principal?.nombre
    };
  },

  // ===================================
  // UBICACIONES
  // ===================================

  /**
   * Obtiene todas las ubicaciones de un almacén
   */
  async getUbicaciones(almacenId: string, filtros?: UbicacionFiltros): Promise<Ubicacion[]> {
    let query = supabase
      .from('inv_ubicaciones')
      .select('*, almacen:inv_almacenes(*)')
      .eq('almacen_id', almacenId)
      .order('codigo', { ascending: true });

    if (filtros?.search) {
      query = query.or(`nombre.ilike.%${filtros.search}%,codigo.ilike.%${filtros.search}%`);
    }

    if (filtros?.activo !== undefined) {
      query = query.eq('activo', filtros.activo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener ubicaciones:', error);
      throw error;
    }

    return data as Ubicacion[];
  },

  /**
   * Obtiene todas las ubicaciones
   */
  async getAllUbicaciones(filtros?: UbicacionFiltros): Promise<Ubicacion[]> {
    let query = supabase
      .from('inv_ubicaciones')
      .select('*, almacen:inv_almacenes(*)')
      .order('codigo', { ascending: true });

    if (filtros?.almacen_id) {
      query = query.eq('almacen_id', filtros.almacen_id);
    }

    if (filtros?.search) {
      query = query.or(`nombre.ilike.%${filtros.search}%,codigo.ilike.%${filtros.search}%`);
    }

    if (filtros?.activo !== undefined) {
      query = query.eq('activo', filtros.activo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener ubicaciones:', error);
      throw error;
    }

    return data as Ubicacion[];
  },

  /**
   * Crea una nueva ubicación
   */
  async createUbicacion(ubicacion: UbicacionInsert): Promise<Ubicacion> {
    const { data, error } = await supabase
      .from('inv_ubicaciones')
      .insert({
        ...ubicacion,
        created_at: new Date().toISOString()
      })
      .select('*, almacen:inv_almacenes(*)')
      .single();

    if (error) {
      console.error('Error al crear ubicación:', error);
      throw error;
    }

    return data as Ubicacion;
  },

  /**
   * Actualiza una ubicación
   */
  async updateUbicacion(id: string, ubicacion: UbicacionUpdate): Promise<Ubicacion> {
    const { data, error } = await supabase
      .from('inv_ubicaciones')
      .update(ubicacion)
      .eq('id', id)
      .select('*, almacen:inv_almacenes(*)')
      .single();

    if (error) {
      console.error('Error al actualizar ubicación:', error);
      throw error;
    }

    return data as Ubicacion;
  },

  /**
   * Elimina una ubicación
   */
  async deleteUbicacion(id: string): Promise<void> {
    // Verificar que no tenga existencias
    const { count } = await supabase
      .from('inv_existencias')
      .select('id', { count: 'exact', head: true })
      .eq('ubicacion_id', id);

    if (count && count > 0) {
      throw new Error('No se puede eliminar la ubicación porque tiene existencias asignadas');
    }

    const { error } = await supabase
      .from('inv_ubicaciones')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar ubicación:', error);
      throw error;
    }
  }
};
