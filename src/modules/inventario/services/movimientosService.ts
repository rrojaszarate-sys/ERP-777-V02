/**
 * Servicio para gestión de movimientos de inventario
 */

import { supabase } from '@/core/config/supabase';
import type {
  Movimiento,
  MovimientoCompleto,
  MovimientoCompletoInsert,
  MovimientoUpdate,
  MovimientoFiltros,
  TipoMovimiento,
  Existencia
} from '../types';

export const movimientosService = {
  /**
   * Obtiene todos los movimientos con filtros
   */
  async getAll(filtros?: MovimientoFiltros): Promise<Movimiento[]> {
    let query = supabase
      .from('inv_movimientos')
      .select(`
        *,
        almacen_origen:inv_almacenes!almacen_origen_id(*),
        almacen_destino:inv_almacenes!almacen_destino_id(*),
        usuario:core_users(id, nombre)
      `)
      .order('fecha', { ascending: false })
      .order('folio', { ascending: false });

    // Aplicar filtros
    if (filtros?.search) {
      query = query.or(`folio.ilike.%${filtros.search}%,concepto.ilike.%${filtros.search}%,referencia.ilike.%${filtros.search}%`);
    }

    if (filtros?.tipo_movimiento) {
      query = query.eq('tipo_movimiento', filtros.tipo_movimiento);
    }

    if (filtros?.estatus) {
      query = query.eq('estatus', filtros.estatus);
    }

    if (filtros?.fecha_inicio) {
      query = query.gte('fecha', filtros.fecha_inicio);
    }

    if (filtros?.fecha_fin) {
      query = query.lte('fecha', filtros.fecha_fin);
    }

    if (filtros?.almacen_origen_id) {
      query = query.eq('almacen_origen_id', filtros.almacen_origen_id);
    }

    if (filtros?.almacen_destino_id) {
      query = query.eq('almacen_destino_id', filtros.almacen_destino_id);
    }

    if (filtros?.tipo_referencia) {
      query = query.eq('tipo_referencia', filtros.tipo_referencia);
    }

    if (filtros?.usuario_id) {
      query = query.eq('usuario_id', filtros.usuario_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener movimientos:', error);
      throw error;
    }

    return data as Movimiento[];
  },

  /**
   * Obtiene un movimiento completo por ID
   */
  async getById(id: string): Promise<MovimientoCompleto> {
    const { data: movimiento, error: errorMov } = await supabase
      .from('inv_movimientos')
      .select(`
        *,
        almacen_origen:inv_almacenes!almacen_origen_id(*),
        almacen_destino:inv_almacenes!almacen_destino_id(*),
        usuario:core_users(id, nombre)
      `)
      .eq('id', id)
      .single();

    if (errorMov) {
      console.error('Error al obtener movimiento:', errorMov);
      throw errorMov;
    }

    // Obtener detalles
    const { data: detalles, error: errorDet } = await supabase
      .from('inv_movimientos_detalle')
      .select(`
        *,
        producto:inv_productos(*),
        ubicacion_origen:inv_ubicaciones!ubicacion_origen_id(*),
        ubicacion_destino:inv_ubicaciones!ubicacion_destino_id(*)
      `)
      .eq('movimiento_id', id);

    if (errorDet) {
      console.error('Error al obtener detalles del movimiento:', errorDet);
      throw errorDet;
    }

    // Calcular totales
    const totalProductos = detalles.length;
    const totalCantidad = detalles.reduce((sum, d) => sum + d.cantidad, 0);
    const costoTotal = detalles.reduce((sum, d) => sum + (d.cantidad * d.costo_unitario), 0);

    return {
      ...movimiento,
      detalles,
      total_productos: totalProductos,
      total_cantidad: totalCantidad,
      costo_total: costoTotal
    } as MovimientoCompleto;
  },

  /**
   * Crea un nuevo movimiento completo
   */
  async create(movimiento: MovimientoCompletoInsert): Promise<MovimientoCompleto> {
    // Generar folio
    const folio = await this.generarFolio(movimiento.tipo_movimiento);

    // Iniciar transacción creando el movimiento
    const { data: movimientoCreado, error: errorMov } = await supabase
      .from('inv_movimientos')
      .insert({
        ...movimiento,
        folio,
        estatus: 'BORRADOR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (errorMov) {
      console.error('Error al crear movimiento:', errorMov);
      throw errorMov;
    }

    // Crear detalles
    const detallesConMovimiento = movimiento.detalles.map(detalle => ({
      ...detalle,
      movimiento_id: movimientoCreado.id,
      created_at: new Date().toISOString()
    }));

    const { error: errorDet } = await supabase
      .from('inv_movimientos_detalle')
      .insert(detallesConMovimiento);

    if (errorDet) {
      // Rollback: eliminar el movimiento creado
      await supabase.from('inv_movimientos').delete().eq('id', movimientoCreado.id);
      console.error('Error al crear detalles del movimiento:', errorDet);
      throw errorDet;
    }

    // Retornar movimiento completo
    return this.getById(movimientoCreado.id);
  },

  /**
   * Procesa un movimiento (aplica al inventario)
   */
  async procesar(id: string): Promise<MovimientoCompleto> {
    const movimiento = await this.getById(id);

    if (movimiento.estatus !== 'BORRADOR') {
      throw new Error('Solo se pueden procesar movimientos en estado BORRADOR');
    }

    // Aplicar movimiento al inventario según el tipo
    switch (movimiento.tipo_movimiento) {
      case 'ENTRADA':
        await this.procesarEntrada(movimiento);
        break;
      case 'SALIDA':
        await this.procesarSalida(movimiento);
        break;
      case 'TRASPASO':
        await this.procesarTraspaso(movimiento);
        break;
      case 'AJUSTE':
        await this.procesarAjuste(movimiento);
        break;
      default:
        throw new Error(`Tipo de movimiento no soportado: ${movimiento.tipo_movimiento}`);
    }

    // Actualizar estatus del movimiento
    const { data, error } = await supabase
      .from('inv_movimientos')
      .update({
        estatus: 'PROCESADO',
        procesado_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar estatus del movimiento:', error);
      throw error;
    }

    return this.getById(id);
  },

  /**
   * Cancela un movimiento
   */
  async cancelar(id: string, motivo: string): Promise<MovimientoCompleto> {
    const movimiento = await this.getById(id);

    if (movimiento.estatus === 'CANCELADO') {
      throw new Error('El movimiento ya está cancelado');
    }

    // Si ya fue procesado, revertir cambios en inventario
    if (movimiento.estatus === 'PROCESADO') {
      await this.revertirMovimiento(movimiento);
    }

    // Actualizar estatus
    const { error } = await supabase
      .from('inv_movimientos')
      .update({
        estatus: 'CANCELADO',
        cancelado_at: new Date().toISOString(),
        motivo_cancelacion: motivo,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error al cancelar movimiento:', error);
      throw error;
    }

    return this.getById(id);
  },

  // ===================================
  // FUNCIONES AUXILIARES PRIVADAS
  // ===================================

  /**
   * Genera el folio para un movimiento
   */
  async generarFolio(tipo: TipoMovimiento): Promise<string> {
    const prefijos = {
      'ENTRADA': 'ENT',
      'SALIDA': 'SAL',
      'TRASPASO': 'TRA',
      'AJUSTE': 'AJU'
    };

    const prefijo = prefijos[tipo];
    const year = new Date().getFullYear();

    // Obtener último folio del tipo
    const { data } = await supabase
      .from('inv_movimientos')
      .select('folio')
      .eq('tipo_movimiento', tipo)
      .like('folio', `${prefijo}-${year}-%`)
      .order('folio', { ascending: false })
      .limit(1);

    let numero = 1;
    if (data && data.length > 0) {
      const ultimoFolio = data[0].folio;
      const partes = ultimoFolio.split('-');
      numero = parseInt(partes[2]) + 1;
    }

    return `${prefijo}-${year}-${numero.toString().padStart(6, '0')}`;
  },

  /**
   * Procesa una entrada de inventario
   */
  async procesarEntrada(movimiento: MovimientoCompleto): Promise<void> {
    for (const detalle of movimiento.detalles) {
      await this.actualizarExistencia({
        producto_id: detalle.producto_id,
        almacen_id: movimiento.almacen_destino_id!,
        ubicacion_id: detalle.ubicacion_destino_id,
        cantidad: detalle.cantidad,
        costo_unitario: detalle.costo_unitario,
        tipo: 'ENTRADA'
      });

      // Si maneja lotes, crear o actualizar lote
      if (detalle.lote) {
        await this.actualizarLote({
          producto_id: detalle.producto_id,
          almacen_id: movimiento.almacen_destino_id!,
          lote: detalle.lote,
          cantidad: detalle.cantidad,
          fecha_caducidad: detalle.fecha_caducidad,
          tipo: 'ENTRADA'
        });
      }

      // Si maneja series, crear serie
      if (detalle.serie) {
        await this.crearSerie({
          producto_id: detalle.producto_id,
          almacen_id: movimiento.almacen_destino_id!,
          serie: detalle.serie,
          documento_entrada_id: movimiento.id
        });
      }
    }
  },

  /**
   * Procesa una salida de inventario
   */
  async procesarSalida(movimiento: MovimientoCompleto): Promise<void> {
    for (const detalle of movimiento.detalles) {
      // Verificar existencia suficiente
      const existencia = await this.obtenerExistencia(
        detalle.producto_id,
        movimiento.almacen_origen_id!,
        detalle.ubicacion_origen_id
      );

      if (!existencia || existencia.cantidad_disponible < detalle.cantidad) {
        throw new Error(`Existencia insuficiente para el producto ${detalle.producto?.nombre}`);
      }

      await this.actualizarExistencia({
        producto_id: detalle.producto_id,
        almacen_id: movimiento.almacen_origen_id!,
        ubicacion_id: detalle.ubicacion_origen_id,
        cantidad: -detalle.cantidad,
        costo_unitario: existencia.costo_promedio,
        tipo: 'SALIDA'
      });

      // Si maneja lotes, actualizar lote
      if (detalle.lote) {
        await this.actualizarLote({
          producto_id: detalle.producto_id,
          almacen_id: movimiento.almacen_origen_id!,
          lote: detalle.lote,
          cantidad: -detalle.cantidad,
          tipo: 'SALIDA'
        });
      }

      // Si maneja series, actualizar serie
      if (detalle.serie) {
        await this.actualizarSerie({
          serie: detalle.serie,
          estatus: 'VENDIDO',
          documento_salida_id: movimiento.id
        });
      }
    }
  },

  /**
   * Procesa un traspaso entre almacenes
   */
  async procesarTraspaso(movimiento: MovimientoCompleto): Promise<void> {
    for (const detalle of movimiento.detalles) {
      // Verificar existencia en origen
      const existencia = await this.obtenerExistencia(
        detalle.producto_id,
        movimiento.almacen_origen_id!,
        detalle.ubicacion_origen_id
      );

      if (!existencia || existencia.cantidad_disponible < detalle.cantidad) {
        throw new Error(`Existencia insuficiente en almacén origen para ${detalle.producto?.nombre}`);
      }

      // Salida del almacén origen
      await this.actualizarExistencia({
        producto_id: detalle.producto_id,
        almacen_id: movimiento.almacen_origen_id!,
        ubicacion_id: detalle.ubicacion_origen_id,
        cantidad: -detalle.cantidad,
        costo_unitario: existencia.costo_promedio,
        tipo: 'SALIDA'
      });

      // Entrada al almacén destino
      await this.actualizarExistencia({
        producto_id: detalle.producto_id,
        almacen_id: movimiento.almacen_destino_id!,
        ubicacion_id: detalle.ubicacion_destino_id,
        cantidad: detalle.cantidad,
        costo_unitario: existencia.costo_promedio,
        tipo: 'ENTRADA'
      });
    }
  },

  /**
   * Procesa un ajuste de inventario
   */
  async procesarAjuste(movimiento: MovimientoCompleto): Promise<void> {
    for (const detalle of movimiento.detalles) {
      const existenciaActual = await this.obtenerExistencia(
        detalle.producto_id,
        movimiento.almacen_origen_id || movimiento.almacen_destino_id!,
        detalle.ubicacion_origen_id || detalle.ubicacion_destino_id
      );

      const cantidadActual = existenciaActual?.cantidad || 0;
      const diferencia = detalle.cantidad - cantidadActual;

      if (diferencia !== 0) {
        await this.actualizarExistencia({
          producto_id: detalle.producto_id,
          almacen_id: movimiento.almacen_origen_id || movimiento.almacen_destino_id!,
          ubicacion_id: detalle.ubicacion_origen_id || detalle.ubicacion_destino_id,
          cantidad: diferencia,
          costo_unitario: detalle.costo_unitario,
          tipo: diferencia > 0 ? 'ENTRADA' : 'SALIDA'
        });
      }
    }
  },

  /**
   * Revierte un movimiento procesado
   */
  async revertirMovimiento(movimiento: MovimientoCompleto): Promise<void> {
    // Invertir la lógica según el tipo
    for (const detalle of movimiento.detalles) {
      switch (movimiento.tipo_movimiento) {
        case 'ENTRADA':
          // Restar la entrada
          await this.actualizarExistencia({
            producto_id: detalle.producto_id,
            almacen_id: movimiento.almacen_destino_id!,
            ubicacion_id: detalle.ubicacion_destino_id,
            cantidad: -detalle.cantidad,
            costo_unitario: detalle.costo_unitario,
            tipo: 'SALIDA'
          });
          break;

        case 'SALIDA':
          // Regresar la salida
          await this.actualizarExistencia({
            producto_id: detalle.producto_id,
            almacen_id: movimiento.almacen_origen_id!,
            ubicacion_id: detalle.ubicacion_origen_id,
            cantidad: detalle.cantidad,
            costo_unitario: detalle.costo_unitario,
            tipo: 'ENTRADA'
          });
          break;

        case 'TRASPASO':
          // Revertir traspaso
          await this.actualizarExistencia({
            producto_id: detalle.producto_id,
            almacen_id: movimiento.almacen_destino_id!,
            ubicacion_id: detalle.ubicacion_destino_id,
            cantidad: -detalle.cantidad,
            costo_unitario: detalle.costo_unitario,
            tipo: 'SALIDA'
          });
          await this.actualizarExistencia({
            producto_id: detalle.producto_id,
            almacen_id: movimiento.almacen_origen_id!,
            ubicacion_id: detalle.ubicacion_origen_id,
            cantidad: detalle.cantidad,
            costo_unitario: detalle.costo_unitario,
            tipo: 'ENTRADA'
          });
          break;
      }
    }
  },

  /**
   * Obtiene la existencia de un producto
   */
  async obtenerExistencia(
    productoId: string,
    almacenId: string,
    ubicacionId?: string
  ): Promise<Existencia | null> {
    let query = supabase
      .from('inv_existencias')
      .select('*')
      .eq('producto_id', productoId)
      .eq('almacen_id', almacenId);

    if (ubicacionId) {
      query = query.eq('ubicacion_id', ubicacionId);
    } else {
      query = query.is('ubicacion_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error al obtener existencia:', error);
      throw error;
    }

    return data as Existencia | null;
  },

  /**
   * Actualiza o crea una existencia
   */
  async actualizarExistencia(params: {
    producto_id: string;
    almacen_id: string;
    ubicacion_id?: string;
    cantidad: number;
    costo_unitario: number;
    tipo: 'ENTRADA' | 'SALIDA';
  }): Promise<void> {
    const existenciaActual = await this.obtenerExistencia(
      params.producto_id,
      params.almacen_id,
      params.ubicacion_id
    );

    if (existenciaActual) {
      // Actualizar existencia
      const nuevaCantidad = existenciaActual.cantidad + params.cantidad;

      // Calcular nuevo costo promedio (solo en entradas)
      let nuevoCostoPromedio = existenciaActual.costo_promedio;
      if (params.tipo === 'ENTRADA' && params.cantidad > 0) {
        const costoTotal = (existenciaActual.cantidad * existenciaActual.costo_promedio) +
                          (params.cantidad * params.costo_unitario);
        nuevoCostoPromedio = costoTotal / nuevaCantidad;
      }

      const { error } = await supabase
        .from('inv_existencias')
        .update({
          cantidad: nuevaCantidad,
          costo_promedio: nuevoCostoPromedio,
          ultima_entrada: params.tipo === 'ENTRADA' ? new Date().toISOString() : existenciaActual.ultima_entrada,
          ultima_salida: params.tipo === 'SALIDA' ? new Date().toISOString() : existenciaActual.ultima_salida,
          updated_at: new Date().toISOString()
        })
        .eq('id', existenciaActual.id);

      if (error) throw error;
    } else {
      // Crear nueva existencia
      const { error } = await supabase
        .from('inv_existencias')
        .insert({
          producto_id: params.producto_id,
          almacen_id: params.almacen_id,
          ubicacion_id: params.ubicacion_id,
          cantidad: params.cantidad,
          costo_promedio: params.costo_unitario,
          ultima_entrada: params.tipo === 'ENTRADA' ? new Date().toISOString() : null,
          ultima_salida: params.tipo === 'SALIDA' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    }
  },

  /**
   * Actualiza o crea un lote
   */
  async actualizarLote(params: {
    producto_id: string;
    almacen_id: string;
    lote: string;
    cantidad: number;
    fecha_caducidad?: string;
    tipo: 'ENTRADA' | 'SALIDA';
  }): Promise<void> {
    const { data: loteActual } = await supabase
      .from('inv_lotes')
      .select('*')
      .eq('producto_id', params.producto_id)
      .eq('almacen_id', params.almacen_id)
      .eq('lote', params.lote)
      .maybeSingle();

    if (loteActual) {
      const nuevaCantidad = loteActual.cantidad_actual + params.cantidad;
      await supabase
        .from('inv_lotes')
        .update({
          cantidad_actual: nuevaCantidad,
          activo: nuevaCantidad > 0
        })
        .eq('id', loteActual.id);
    } else if (params.tipo === 'ENTRADA') {
      await supabase
        .from('inv_lotes')
        .insert({
          producto_id: params.producto_id,
          almacen_id: params.almacen_id,
          lote: params.lote,
          fecha_caducidad: params.fecha_caducidad,
          cantidad_original: params.cantidad,
          cantidad_actual: params.cantidad,
          activo: true
        });
    }
  },

  /**
   * Crea una serie
   */
  async crearSerie(params: {
    producto_id: string;
    almacen_id: string;
    serie: string;
    documento_entrada_id: string;
  }): Promise<void> {
    await supabase
      .from('inv_series')
      .insert({
        producto_id: params.producto_id,
        almacen_id: params.almacen_id,
        serie: params.serie,
        estatus: 'DISPONIBLE',
        fecha_entrada: new Date().toISOString(),
        documento_entrada_id: params.documento_entrada_id
      });
  },

  /**
   * Actualiza una serie
   */
  async actualizarSerie(params: {
    serie: string;
    estatus: 'DISPONIBLE' | 'VENDIDO' | 'EN_REPARACION' | 'DADO_DE_BAJA';
    documento_salida_id?: string;
  }): Promise<void> {
    await supabase
      .from('inv_series')
      .update({
        estatus: params.estatus,
        fecha_salida: params.estatus === 'VENDIDO' ? new Date().toISOString() : null,
        documento_salida_id: params.documento_salida_id,
        updated_at: new Date().toISOString()
      })
      .eq('serie', params.serie);
  }
};
