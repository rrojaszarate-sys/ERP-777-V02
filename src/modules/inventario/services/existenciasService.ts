/**
 * Servicio para consultas de existencias
 */

import { supabase } from '@/core/config/supabase';
import type {
  Existencia,
  ExistenciasPorAlmacen,
  ExistenciasPorProducto,
  Lote,
  Serie
} from '../types';

export const existenciasService = {
  /**
   * Obtiene todas las existencias
   */
  async getAll(): Promise<Existencia[]> {
    const { data, error } = await supabase
      .from('inv_existencias')
      .select(`
        *,
        producto:inv_productos(*),
        almacen:inv_almacenes(*),
        ubicacion:inv_ubicaciones(*)
      `)
      .order('producto_id')
      .order('almacen_id');

    if (error) {
      console.error('Error al obtener existencias:', error);
      throw error;
    }

    return data as Existencia[];
  },

  /**
   * Obtiene existencias por almacén
   */
  async getPorAlmacen(almacenId: string): Promise<ExistenciasPorAlmacen> {
    const { data: almacen } = await supabase
      .from('inv_almacenes')
      .select('id, nombre')
      .eq('id', almacenId)
      .single();

    const { data, error } = await supabase
      .from('inv_existencias')
      .select(`
        *,
        producto:inv_productos(*),
        ubicacion:inv_ubicaciones(*)
      `)
      .eq('almacen_id', almacenId)
      .gt('cantidad', 0)
      .order('producto_id');

    if (error) {
      console.error('Error al obtener existencias por almacén:', error);
      throw error;
    }

    const existencias = data as Existencia[];
    const totalProductos = new Set(existencias.map(e => e.producto_id)).size;
    const valorTotal = existencias.reduce((sum, e) => sum + e.costo_total, 0);

    return {
      almacen_id: almacenId,
      almacen_nombre: almacen?.nombre || '',
      existencias,
      total_productos: totalProductos,
      valor_total: valorTotal
    };
  },

  /**
   * Obtiene existencias por producto
   */
  async getPorProducto(productoId: string): Promise<ExistenciasPorProducto> {
    const { data: producto } = await supabase
      .from('inv_productos')
      .select('*')
      .eq('id', productoId)
      .single();

    const { data, error } = await supabase
      .from('inv_existencias')
      .select(`
        *,
        almacen:inv_almacenes(*)
      `)
      .eq('producto_id', productoId)
      .gt('cantidad', 0);

    if (error) {
      console.error('Error al obtener existencias por producto:', error);
      throw error;
    }

    const existenciasPorAlmacen = (data || []).map((e: any) => ({
      almacen_id: e.almacen_id,
      almacen_nombre: e.almacen?.nombre || '',
      cantidad: e.cantidad,
      cantidad_disponible: e.cantidad_disponible,
      cantidad_reservada: e.cantidad_reservada,
      costo_promedio: e.costo_promedio
    }));

    const totalExistencia = existenciasPorAlmacen.reduce((sum, e) => sum + e.cantidad, 0);
    const totalDisponible = existenciasPorAlmacen.reduce((sum, e) => sum + e.cantidad_disponible, 0);
    const totalReservado = existenciasPorAlmacen.reduce((sum, e) => sum + e.cantidad_reservada, 0);

    return {
      producto_id: productoId,
      producto: producto!,
      existencias_por_almacen: existenciasPorAlmacen,
      total_existencia: totalExistencia,
      total_disponible: totalDisponible,
      total_reservado: totalReservado
    };
  },

  /**
   * Obtiene la existencia de un producto en un almacén específico
   */
  async getExistencia(productoId: string, almacenId: string): Promise<Existencia | null> {
    const { data, error } = await supabase
      .from('inv_existencias')
      .select(`
        *,
        producto:inv_productos(*),
        almacen:inv_almacenes(*),
        ubicacion:inv_ubicaciones(*)
      `)
      .eq('producto_id', productoId)
      .eq('almacen_id', almacenId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error al obtener existencia:', error);
      throw error;
    }

    return data as Existencia | null;
  },

  /**
   * Reserva existencias para una venta
   */
  async reservar(productoId: string, almacenId: string, cantidad: number): Promise<void> {
    const existencia = await this.getExistencia(productoId, almacenId);

    if (!existencia) {
      throw new Error('No hay existencias del producto en este almacén');
    }

    if (existencia.cantidad_disponible < cantidad) {
      throw new Error('No hay suficiente existencia disponible');
    }

    const { error } = await supabase
      .from('inv_existencias')
      .update({
        cantidad_reservada: existencia.cantidad_reservada + cantidad,
        updated_at: new Date().toISOString()
      })
      .eq('producto_id', productoId)
      .eq('almacen_id', almacenId);

    if (error) {
      console.error('Error al reservar existencias:', error);
      throw error;
    }
  },

  /**
   * Libera existencias reservadas
   */
  async liberarReserva(productoId: string, almacenId: string, cantidad: number): Promise<void> {
    const existencia = await this.getExistencia(productoId, almacenId);

    if (!existencia) {
      throw new Error('No hay existencias del producto en este almacén');
    }

    const nuevaCantidadReservada = Math.max(0, existencia.cantidad_reservada - cantidad);

    const { error } = await supabase
      .from('inv_existencias')
      .update({
        cantidad_reservada: nuevaCantidadReservada,
        updated_at: new Date().toISOString()
      })
      .eq('producto_id', productoId)
      .eq('almacen_id', almacenId);

    if (error) {
      console.error('Error al liberar reserva:', error);
      throw error;
    }
  },

  // ===================================
  // LOTES
  // ===================================

  /**
   * Obtiene lotes de un producto
   */
  async getLotes(productoId: string, almacenId?: string): Promise<Lote[]> {
    let query = supabase
      .from('inv_lotes')
      .select(`
        *,
        producto:inv_productos(*),
        almacen:inv_almacenes(*)
      `)
      .eq('producto_id', productoId)
      .eq('activo', true)
      .order('fecha_caducidad', { ascending: true });

    if (almacenId) {
      query = query.eq('almacen_id', almacenId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener lotes:', error);
      throw error;
    }

    return data as Lote[];
  },

  /**
   * Obtiene lotes próximos a vencer
   */
  async getLotesProximosVencer(diasAntes: number = 30): Promise<Lote[]> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAntes);

    const { data, error } = await supabase
      .from('inv_lotes')
      .select(`
        *,
        producto:inv_productos(*),
        almacen:inv_almacenes(*)
      `)
      .eq('activo', true)
      .gt('cantidad_actual', 0)
      .not('fecha_caducidad', 'is', null)
      .lte('fecha_caducidad', fechaLimite.toISOString().split('T')[0])
      .order('fecha_caducidad', { ascending: true });

    if (error) {
      console.error('Error al obtener lotes próximos a vencer:', error);
      throw error;
    }

    return data as Lote[];
  },

  // ===================================
  // SERIES
  // ===================================

  /**
   * Obtiene series de un producto
   */
  async getSeries(productoId: string, estatus?: string): Promise<Serie[]> {
    let query = supabase
      .from('inv_series')
      .select(`
        *,
        producto:inv_productos(*),
        almacen:inv_almacenes(*)
      `)
      .eq('producto_id', productoId)
      .order('serie', { ascending: true });

    if (estatus) {
      query = query.eq('estatus', estatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener series:', error);
      throw error;
    }

    return data as Serie[];
  },

  /**
   * Obtiene una serie por su número
   */
  async getSeriePorNumero(numeroSerie: string): Promise<Serie | null> {
    const { data, error } = await supabase
      .from('inv_series')
      .select(`
        *,
        producto:inv_productos(*),
        almacen:inv_almacenes(*)
      `)
      .eq('serie', numeroSerie)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error al obtener serie:', error);
      throw error;
    }

    return data as Serie | null;
  },

  /**
   * Obtiene series disponibles de un producto en un almacén
   */
  async getSeriesDisponibles(productoId: string, almacenId: string): Promise<Serie[]> {
    const { data, error } = await supabase
      .from('inv_series')
      .select('*')
      .eq('producto_id', productoId)
      .eq('almacen_id', almacenId)
      .eq('estatus', 'DISPONIBLE')
      .order('fecha_entrada', { ascending: true });

    if (error) {
      console.error('Error al obtener series disponibles:', error);
      throw error;
    }

    return data as Serie[];
  }
};
