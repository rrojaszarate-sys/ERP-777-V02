import { supabase } from '../../../core/config/supabase';
import type {
  ReservaStock,
  EstadoReserva,
} from '../types';

// ============================================================================
// RESERVAS DE STOCK PARA EVENTOS
// ============================================================================

/**
 * Obtener todas las reservas
 */
export const fetchReservas = async (
  companyId: string,
  options?: {
    eventoId?: number;
    productoId?: number;
    almacenId?: number;
    estado?: EstadoReserva;
    fechaDesde?: string;
    fechaHasta?: string;
  }
): Promise<ReservaStock[]> => {
  let query = supabase
    .from('reservas_stock_erp')
    .select(`
      *,
      evento:eventos_erp(id, nombre_proyecto, fecha_evento),
      producto:productos_erp(id, nombre, clave, unidad),
      almacen:almacenes_erp(id, nombre, codigo),
      lote:lotes_inventario_erp(id, numero_lote)
    `)
    .eq('company_id', companyId)
    .order('fecha_necesidad', { ascending: true });

  if (options?.eventoId) {
    query = query.eq('evento_id', options.eventoId);
  }
  if (options?.productoId) {
    query = query.eq('producto_id', options.productoId);
  }
  if (options?.almacenId) {
    query = query.eq('almacen_id', options.almacenId);
  }
  if (options?.estado) {
    query = query.eq('estado', options.estado);
  }
  if (options?.fechaDesde) {
    query = query.gte('fecha_necesidad', options.fechaDesde);
  }
  if (options?.fechaHasta) {
    query = query.lte('fecha_necesidad', options.fechaHasta);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Obtener una reserva por ID
 */
export const fetchReservaById = async (id: number): Promise<ReservaStock | null> => {
  const { data, error } = await supabase
    .from('reservas_stock_erp')
    .select(`
      *,
      evento:eventos_erp(id, nombre_proyecto, fecha_evento),
      producto:productos_erp(id, nombre, clave, unidad, costo),
      almacen:almacenes_erp(id, nombre, codigo),
      lote:lotes_inventario_erp(id, numero_lote)
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
 * Crear nueva reserva
 */
export const createReserva = async (
  reserva: {
    evento_id: number;
    producto_id: number;
    almacen_id: number;
    lote_id?: number;
    cantidad_reservada: number;
    fecha_necesidad: string;
    fecha_devolucion_esperada?: string;
    notas?: string;
  },
  companyId: string,
  userId?: string
): Promise<ReservaStock> => {
  // Verificar stock disponible
  const stockDisponible = await verificarStockDisponible(
    reserva.producto_id,
    reserva.almacen_id,
    companyId
  );

  if (stockDisponible < reserva.cantidad_reservada) {
    throw new Error(`Stock insuficiente. Disponible: ${stockDisponible}, Solicitado: ${reserva.cantidad_reservada}`);
  }

  const { data, error } = await supabase
    .from('reservas_stock_erp')
    .insert([{
      ...reserva,
      cantidad_entregada: 0,
      cantidad_devuelta: 0,
      estado: 'activa',
      company_id: companyId,
      created_by: userId,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Verificar stock disponible (descontando reservas)
 */
export const verificarStockDisponible = async (
  productoId: number,
  almacenId: number,
  companyId: string
): Promise<number> => {
  // Obtener stock actual
  const { data: movimientos } = await supabase
    .from('movimientos_inventario_erp')
    .select('tipo, cantidad')
    .eq('producto_id', productoId)
    .eq('almacen_id', almacenId);

  let stockActual = 0;
  (movimientos || []).forEach(m => {
    if (m.tipo === 'entrada' || m.tipo === 'ajuste') {
      stockActual += m.cantidad;
    } else if (m.tipo === 'salida') {
      stockActual -= m.cantidad;
    }
  });

  // Obtener reservas activas
  const { data: reservas } = await supabase
    .from('reservas_stock_erp')
    .select('cantidad_reservada, cantidad_entregada')
    .eq('producto_id', productoId)
    .eq('almacen_id', almacenId)
    .in('estado', ['activa', 'parcial']);

  const cantidadReservada = (reservas || []).reduce(
    (sum, r) => sum + (r.cantidad_reservada - r.cantidad_entregada),
    0
  );

  return stockActual - cantidadReservada;
};

/**
 * Registrar entrega de reserva
 */
export const registrarEntregaReserva = async (
  reservaId: number,
  cantidadEntregada: number,
  documentoSalidaId?: number
): Promise<ReservaStock> => {
  const reserva = await fetchReservaById(reservaId);
  if (!reserva) throw new Error('Reserva no encontrada');

  const pendiente = reserva.cantidad_reservada - reserva.cantidad_entregada;
  if (cantidadEntregada > pendiente) {
    throw new Error(`Cantidad excede lo pendiente. Pendiente: ${pendiente}`);
  }

  const nuevaCantidadEntregada = reserva.cantidad_entregada + cantidadEntregada;
  const nuevoEstado: EstadoReserva = 
    nuevaCantidadEntregada >= reserva.cantidad_reservada ? 'entregada' : 'parcial';

  const { data, error } = await supabase
    .from('reservas_stock_erp')
    .update({
      cantidad_entregada: nuevaCantidadEntregada,
      estado: nuevoEstado,
      documento_salida_id: documentoSalidaId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservaId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Registrar devolución de reserva
 */
export const registrarDevolucionReserva = async (
  reservaId: number,
  cantidadDevuelta: number,
  documentoEntradaId?: number
): Promise<ReservaStock> => {
  const reserva = await fetchReservaById(reservaId);
  if (!reserva) throw new Error('Reserva no encontrada');

  const entregadoSinDevolver = reserva.cantidad_entregada - reserva.cantidad_devuelta;
  if (cantidadDevuelta > entregadoSinDevolver) {
    throw new Error(`Cantidad excede lo entregado sin devolver. Pendiente: ${entregadoSinDevolver}`);
  }

  const nuevaCantidadDevuelta = reserva.cantidad_devuelta + cantidadDevuelta;
  const nuevoEstado: EstadoReserva = 
    nuevaCantidadDevuelta >= reserva.cantidad_entregada ? 'devuelta' : 'parcial';

  const { data, error } = await supabase
    .from('reservas_stock_erp')
    .update({
      cantidad_devuelta: nuevaCantidadDevuelta,
      estado: nuevoEstado,
      documento_entrada_id: documentoEntradaId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservaId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Cancelar reserva
 */
export const cancelarReserva = async (
  reservaId: number,
  motivo?: string
): Promise<ReservaStock> => {
  const reserva = await fetchReservaById(reservaId);
  if (!reserva) throw new Error('Reserva no encontrada');

  if (reserva.cantidad_entregada > 0) {
    throw new Error('No se puede cancelar una reserva con entregas registradas');
  }

  const { data, error } = await supabase
    .from('reservas_stock_erp')
    .update({
      estado: 'cancelada',
      notas: motivo ? `[CANCELADA] ${motivo}` : '[CANCELADA]',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservaId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Crear reservas masivas para un evento
 */
export const crearReservasMasivas = async (
  eventoId: number,
  productos: Array<{
    producto_id: number;
    almacen_id: number;
    cantidad: number;
    lote_id?: number;
  }>,
  fechaNecesidad: string,
  fechaDevolucion: string | null,
  companyId: string,
  userId?: string
): Promise<{ creadas: number; errores: string[] }> => {
  let creadas = 0;
  const errores: string[] = [];

  for (const item of productos) {
    try {
      await createReserva(
        {
          evento_id: eventoId,
          producto_id: item.producto_id,
          almacen_id: item.almacen_id,
          lote_id: item.lote_id,
          cantidad_reservada: item.cantidad,
          fecha_necesidad: fechaNecesidad,
          fecha_devolucion_esperada: fechaDevolucion || undefined,
        },
        companyId,
        userId
      );
      creadas++;
    } catch (e: any) {
      errores.push(`Producto ${item.producto_id}: ${e.message}`);
    }
  }

  return { creadas, errores };
};

/**
 * Obtener resumen de reservas por evento
 */
export const getResumenReservasEvento = async (eventoId: number) => {
  const { data: reservas, error } = await supabase
    .from('reservas_stock_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave, costo)
    `)
    .eq('evento_id', eventoId)
    .neq('estado', 'cancelada');

  if (error) throw error;

  const totalReservado = (reservas || []).reduce((sum, r) => sum + r.cantidad_reservada, 0);
  const totalEntregado = (reservas || []).reduce((sum, r) => sum + r.cantidad_entregada, 0);
  const totalDevuelto = (reservas || []).reduce((sum, r) => sum + r.cantidad_devuelta, 0);
  const valorTotal = (reservas || []).reduce(
    (sum, r) => sum + (r.cantidad_reservada * (r.producto?.costo || 0)),
    0
  );

  return {
    total_productos: reservas?.length || 0,
    total_unidades_reservadas: totalReservado,
    total_unidades_entregadas: totalEntregado,
    total_unidades_devueltas: totalDevuelto,
    porcentaje_entregado: totalReservado > 0 ? (totalEntregado / totalReservado) * 100 : 0,
    porcentaje_devuelto: totalEntregado > 0 ? (totalDevuelto / totalEntregado) * 100 : 0,
    valor_total_reservado: valorTotal,
    reservas: reservas || [],
  };
};

/**
 * Obtener reservas próximas (siguientes 7 días)
 */
export const fetchReservasProximas = async (
  companyId: string,
  dias: number = 7
): Promise<ReservaStock[]> => {
  const hoy = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);

  const { data, error } = await supabase
    .from('reservas_stock_erp')
    .select(`
      *,
      evento:eventos_erp(id, nombre_proyecto, fecha_evento),
      producto:productos_erp(id, nombre, clave)
    `)
    .eq('company_id', companyId)
    .in('estado', ['activa'])
    .gte('fecha_necesidad', hoy.toISOString().split('T')[0])
    .lte('fecha_necesidad', limite.toISOString().split('T')[0])
    .order('fecha_necesidad', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Estadísticas de reservas
 */
export const getEstadisticasReservas = async (companyId: string) => {
  const { data, error } = await supabase
    .from('reservas_stock_erp')
    .select('estado, cantidad_reservada, cantidad_entregada, cantidad_devuelta')
    .eq('company_id', companyId);

  if (error) throw error;

  return {
    total: data?.length || 0,
    activas: data?.filter(r => r.estado === 'activa').length || 0,
    parciales: data?.filter(r => r.estado === 'parcial').length || 0,
    entregadas: data?.filter(r => r.estado === 'entregada').length || 0,
    devueltas: data?.filter(r => r.estado === 'devuelta').length || 0,
    canceladas: data?.filter(r => r.estado === 'cancelada').length || 0,
    unidades_reservadas: data?.reduce((sum, r) => sum + r.cantidad_reservada, 0) || 0,
    unidades_en_uso: data?.reduce(
      (sum, r) => sum + (r.cantidad_entregada - r.cantidad_devuelta),
      0
    ) || 0,
  };
};
