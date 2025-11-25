/**
 * Servicio para gestión de productos
 */

import { supabase } from '@/core/config/supabase';
import type {
  Producto,
  ProductoCompleto,
  ProductoInsert,
  ProductoUpdate,
  ProductoFiltros,
  ProductosResponse,
  ProductoEstadisticas,
  CategoriaProducto,
  UnidadMedida
} from '../types';

export const productosService = {
  /**
   * Obtiene todos los productos con filtros opcionales
   */
  async getAll(filtros?: ProductoFiltros): Promise<Producto[]> {
    let query = supabase
      .from('inv_productos')
      .select(`
        *,
        categoria:inv_categorias(*),
        unidad_medida:inv_unidades_medida(*)
      `)
      .is('deleted_at', null)
      .order('nombre', { ascending: true });

    // Aplicar filtros
    if (filtros?.search) {
      query = query.or(`nombre.ilike.%${filtros.search}%,codigo.ilike.%${filtros.search}%,codigo_barras.ilike.%${filtros.search}%`);
    }

    if (filtros?.categoria_id) {
      query = query.eq('categoria_id', filtros.categoria_id);
    }

    if (filtros?.es_servicio !== undefined) {
      query = query.eq('es_servicio', filtros.es_servicio);
    }

    if (filtros?.es_compra !== undefined) {
      query = query.eq('es_compra', filtros.es_compra);
    }

    if (filtros?.es_venta !== undefined) {
      query = query.eq('es_venta', filtros.es_venta);
    }

    if (filtros?.activo !== undefined) {
      query = query.eq('activo', filtros.activo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }

    return data as Producto[];
  },

  /**
   * Obtiene productos con existencias
   */
  async getAllConExistencias(filtros?: ProductoFiltros): Promise<ProductoCompleto[]> {
    let query = supabase
      .from('inv_productos')
      .select(`
        *,
        categoria:inv_categorias(*),
        unidad_medida:inv_unidades_medida(*),
        existencias:inv_existencias(
          cantidad,
          cantidad_reservada,
          cantidad_disponible,
          costo_promedio,
          almacen:inv_almacenes(id, nombre)
        )
      `)
      .is('deleted_at', null)
      .order('nombre', { ascending: true });

    // Aplicar filtros
    if (filtros?.search) {
      query = query.or(`nombre.ilike.%${filtros.search}%,codigo.ilike.%${filtros.search}%`);
    }

    if (filtros?.categoria_id) {
      query = query.eq('categoria_id', filtros.categoria_id);
    }

    if (filtros?.activo !== undefined) {
      query = query.eq('activo', filtros.activo);
    }

    if (filtros?.almacen_id) {
      query = query.eq('existencias.almacen_id', filtros.almacen_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener productos con existencias:', error);
      throw error;
    }

    // Calcular totales
    const productos = data.map((producto: any) => {
      const existencias = producto.existencias || [];
      const existencia_total = existencias.reduce((sum: number, e: any) => sum + (e.cantidad || 0), 0);
      const existencia_disponible = existencias.reduce((sum: number, e: any) => sum + (e.cantidad_disponible || 0), 0);
      const existencia_reservada = existencias.reduce((sum: number, e: any) => sum + (e.cantidad_reservada || 0), 0);

      return {
        ...producto,
        existencia_total,
        existencia_disponible,
        existencia_reservada,
        valor_inventario: existencias.reduce((sum: number, e: any) =>
          sum + ((e.cantidad || 0) * (e.costo_promedio || 0)), 0
        )
      };
    });

    // Filtrar según opciones de existencias
    let productosFiltrados = productos;

    if (filtros?.con_existencias) {
      productosFiltrados = productosFiltrados.filter(p => p.existencia_total > 0);
    }

    if (filtros?.sin_existencias) {
      productosFiltrados = productosFiltrados.filter(p => p.existencia_total === 0);
    }

    if (filtros?.bajo_minimo) {
      productosFiltrados = productosFiltrados.filter(p =>
        p.existencia_total < p.existencia_minima && !p.es_servicio
      );
    }

    return productosFiltrados as ProductoCompleto[];
  },

  /**
   * Obtiene un producto por ID
   */
  async getById(id: string): Promise<Producto> {
    const { data, error } = await supabase
      .from('inv_productos')
      .select(`
        *,
        categoria:inv_categorias(*),
        unidad_medida:inv_unidades_medida(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Error al obtener producto:', error);
      throw error;
    }

    return data as Producto;
  },

  /**
   * Obtiene un producto por código
   */
  async getByCodigo(codigo: string): Promise<Producto | null> {
    const { data, error } = await supabase
      .from('inv_productos')
      .select(`
        *,
        categoria:inv_categorias(*),
        unidad_medida:inv_unidades_medida(*)
      `)
      .eq('codigo', codigo)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener producto por código:', error);
      throw error;
    }

    return data as Producto | null;
  },

  /**
   * Crea un nuevo producto
   */
  async create(producto: ProductoInsert): Promise<Producto> {
    // Verificar que el código no exista
    const existente = await this.getByCodigo(producto.codigo);
    if (existente) {
      throw new Error(`Ya existe un producto con el código: ${producto.codigo}`);
    }

    const { data, error } = await supabase
      .from('inv_productos')
      .insert({
        ...producto,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        categoria:inv_categorias(*),
        unidad_medida:inv_unidades_medida(*)
      `)
      .single();

    if (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }

    return data as Producto;
  },

  /**
   * Actualiza un producto
   */
  async update(id: string, producto: ProductoUpdate): Promise<Producto> {
    const { data, error } = await supabase
      .from('inv_productos')
      .update({
        ...producto,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        categoria:inv_categorias(*),
        unidad_medida:inv_unidades_medida(*)
      `)
      .single();

    if (error) {
      console.error('Error al actualizar producto:', error);
      throw error;
    }

    return data as Producto;
  },

  /**
   * Elimina (soft delete) un producto
   */
  async delete(id: string, motivo?: string): Promise<void> {
    const { error } = await supabase
      .from('inv_productos')
      .update({
        deleted_at: new Date().toISOString(),
        delete_reason: motivo,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar producto:', error);
      throw error;
    }
  },

  /**
   * Reactiva un producto eliminado
   */
  async restore(id: string): Promise<Producto> {
    const { data, error } = await supabase
      .from('inv_productos')
      .update({
        deleted_at: null,
        delete_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al restaurar producto:', error);
      throw error;
    }

    return data as Producto;
  },

  /**
   * Obtiene estadísticas de productos
   */
  async getEstadisticas(): Promise<ProductoEstadisticas> {
    // Total de productos
    const { count: total } = await supabase
      .from('inv_productos')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Productos activos
    const { count: activos } = await supabase
      .from('inv_productos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
      .is('deleted_at', null);

    // Productos inactivos
    const { count: inactivos } = await supabase
      .from('inv_productos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', false)
      .is('deleted_at', null);

    // Productos servicios
    const { count: servicios } = await supabase
      .from('inv_productos')
      .select('*', { count: 'exact', head: true })
      .eq('es_servicio', true)
      .is('deleted_at', null);

    // Productos físicos
    const { count: fisicos } = await supabase
      .from('inv_productos')
      .select('*', { count: 'exact', head: true })
      .eq('es_servicio', false)
      .is('deleted_at', null);

    // Productos sin existencias
    const { data: existencias } = await supabase
      .from('inv_existencias')
      .select('producto_id, cantidad');

    const productosSinExistencias = new Set();
    const productosBajoMinimo = new Set();

    // Calcular existencias por producto
    const existenciasPorProducto = new Map<string, number>();
    existencias?.forEach((e: any) => {
      const actual = existenciasPorProducto.get(e.producto_id) || 0;
      existenciasPorProducto.set(e.producto_id, actual + e.cantidad);
    });

    // Obtener productos físicos para comparar con mínimos
    const { data: productosFisicos } = await supabase
      .from('inv_productos')
      .select('id, existencia_minima')
      .eq('es_servicio', false)
      .is('deleted_at', null);

    productosFisicos?.forEach((p: any) => {
      const existencia = existenciasPorProducto.get(p.id) || 0;
      if (existencia === 0) {
        productosSinExistencias.add(p.id);
      }
      if (existencia < p.existencia_minima) {
        productosBajoMinimo.add(p.id);
      }
    });

    // Valor total del inventario
    const { data: valores } = await supabase
      .from('inv_existencias')
      .select('cantidad, costo_promedio');

    const valorTotal = valores?.reduce((sum, e) =>
      sum + (e.cantidad * e.costo_promedio), 0
    ) || 0;

    return {
      total_productos: total || 0,
      productos_activos: activos || 0,
      productos_inactivos: inactivos || 0,
      productos_sin_existencias: productosSinExistencias.size,
      productos_bajo_minimo: productosBajoMinimo.size,
      valor_total_inventario: valorTotal,
      productos_servicios: servicios || 0,
      productos_fisicos: fisicos || 0
    };
  },

  // ===================================
  // CATEGORÍAS
  // ===================================

  /**
   * Obtiene todas las categorías
   */
  async getCategorias(): Promise<CategoriaProducto[]> {
    const { data, error } = await supabase
      .from('inv_categorias')
      .select('*, categoria_padre:inv_categorias(*)')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener categorías:', error);
      throw error;
    }

    return data as CategoriaProducto[];
  },

  /**
   * Crea una categoría
   */
  async createCategoria(categoria: Omit<CategoriaProducto, 'id' | 'created_at' | 'updated_at'>): Promise<CategoriaProducto> {
    const { data, error } = await supabase
      .from('inv_categorias')
      .insert(categoria)
      .select()
      .single();

    if (error) {
      console.error('Error al crear categoría:', error);
      throw error;
    }

    return data as CategoriaProducto;
  },

  // ===================================
  // UNIDADES DE MEDIDA
  // ===================================

  /**
   * Obtiene todas las unidades de medida
   */
  async getUnidadesMedida(): Promise<UnidadMedida[]> {
    const { data, error } = await supabase
      .from('inv_unidades_medida')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener unidades de medida:', error);
      throw error;
    }

    return data as UnidadMedida[];
  }
};
