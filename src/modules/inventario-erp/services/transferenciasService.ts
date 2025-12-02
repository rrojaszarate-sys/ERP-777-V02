/**
 * Servicio de Transferencias entre Almacenes
 * Gestiona el movimiento de stock de un almacén a otro
 */

import { supabase } from '../../../core/config/supabase';

// Tipos
export interface Transferencia {
  id: string;
  numero: string;
  fecha: string;
  almacen_origen_id: string;
  almacen_destino_id: string;
  estado: EstadoTransferencia;
  notas?: string;
  usuario_solicita_id?: string;
  usuario_aprueba_id?: string;
  usuario_recibe_id?: string;
  fecha_aprobacion?: string;
  fecha_envio?: string;
  fecha_recepcion?: string;
  created_at: string;
  updated_at: string;
  // Joins
  almacen_origen?: { id: string; nombre: string };
  almacen_destino?: { id: string; nombre: string };
  usuario_solicita?: { id: string; nombre: string };
  detalles?: TransferenciaDetalle[];
}

export interface TransferenciaDetalle {
  id: string;
  transferencia_id: string;
  producto_id: string;
  cantidad_solicitada: number;
  cantidad_enviada?: number;
  cantidad_recibida?: number;
  lote_id?: string;
  notas?: string;
  // Joins
  producto?: { id: string; nombre: string; sku: string; unidad_medida: string };
  lote?: { id: string; codigo: string; fecha_vencimiento?: string };
}

export type EstadoTransferencia = 
  | 'borrador' 
  | 'pendiente_aprobacion' 
  | 'aprobada' 
  | 'en_transito' 
  | 'recibida_parcial'
  | 'recibida' 
  | 'cancelada';

export interface FiltrosTransferencia {
  estado?: EstadoTransferencia;
  almacen_origen_id?: string;
  almacen_destino_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  busqueda?: string;
}

export interface CrearTransferenciaInput {
  almacen_origen_id: string;
  almacen_destino_id: string;
  notas?: string;
  detalles: {
    producto_id: string;
    cantidad_solicitada: number;
    lote_id?: string;
    notas?: string;
  }[];
}

// Funciones del servicio

/**
 * Genera número de transferencia único
 */
async function generarNumeroTransferencia(): Promise<string> {
  const fecha = new Date();
  const año = fecha.getFullYear().toString().slice(-2);
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  
  // Buscar último número del mes
  const { data } = await supabase
    .from('transferencias_almacen')
    .select('numero')
    .ilike('numero', `TR${año}${mes}%`)
    .order('numero', { ascending: false })
    .limit(1);
  
  let siguiente = 1;
  if (data && data.length > 0) {
    const ultimo = data[0].numero;
    const numActual = parseInt(ultimo.slice(-4)) || 0;
    siguiente = numActual + 1;
  }
  
  return `TR${año}${mes}${siguiente.toString().padStart(4, '0')}`;
}

/**
 * Obtener lista de transferencias con filtros
 */
export async function obtenerTransferencias(filtros?: FiltrosTransferencia): Promise<Transferencia[]> {
  let query = supabase
    .from('transferencias_almacen')
    .select(`
      *,
      almacen_origen:almacenes!transferencias_almacen_almacen_origen_id_fkey(id, nombre),
      almacen_destino:almacenes!transferencias_almacen_almacen_destino_id_fkey(id, nombre),
      usuario_solicita:usuarios!transferencias_almacen_usuario_solicita_id_fkey(id, nombre),
      detalles:transferencias_almacen_detalle(
        *,
        producto:productos(id, nombre, sku, unidad_medida),
        lote:lotes(id, codigo, fecha_vencimiento)
      )
    `)
    .order('created_at', { ascending: false });

  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado);
  }
  if (filtros?.almacen_origen_id) {
    query = query.eq('almacen_origen_id', filtros.almacen_origen_id);
  }
  if (filtros?.almacen_destino_id) {
    query = query.eq('almacen_destino_id', filtros.almacen_destino_id);
  }
  if (filtros?.fecha_desde) {
    query = query.gte('fecha', filtros.fecha_desde);
  }
  if (filtros?.fecha_hasta) {
    query = query.lte('fecha', filtros.fecha_hasta);
  }
  if (filtros?.busqueda) {
    query = query.ilike('numero', `%${filtros.busqueda}%`);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

/**
 * Obtener transferencia por ID
 */
export async function obtenerTransferenciaPorId(id: string): Promise<Transferencia | null> {
  const { data, error } = await supabase
    .from('transferencias_almacen')
    .select(`
      *,
      almacen_origen:almacenes!transferencias_almacen_almacen_origen_id_fkey(id, nombre),
      almacen_destino:almacenes!transferencias_almacen_almacen_destino_id_fkey(id, nombre),
      usuario_solicita:usuarios!transferencias_almacen_usuario_solicita_id_fkey(id, nombre),
      usuario_aprueba:usuarios!transferencias_almacen_usuario_aprueba_id_fkey(id, nombre),
      usuario_recibe:usuarios!transferencias_almacen_usuario_recibe_id_fkey(id, nombre),
      detalles:transferencias_almacen_detalle(
        *,
        producto:productos(id, nombre, sku, unidad_medida),
        lote:lotes(id, codigo, fecha_vencimiento)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Crear nueva transferencia
 */
export async function crearTransferencia(input: CrearTransferenciaInput, usuario_id: string): Promise<Transferencia> {
  const numero = await generarNumeroTransferencia();
  
  // Validar que origen y destino sean diferentes
  if (input.almacen_origen_id === input.almacen_destino_id) {
    throw new Error('El almacén de origen y destino deben ser diferentes');
  }

  // Validar stock disponible en origen
  for (const detalle of input.detalles) {
    const stockDisponible = await verificarStockDisponible(
      detalle.producto_id, 
      input.almacen_origen_id, 
      detalle.lote_id
    );
    
    if (stockDisponible < detalle.cantidad_solicitada) {
      const { data: prod } = await supabase
        .from('productos')
        .select('nombre')
        .eq('id', detalle.producto_id)
        .single();
      throw new Error(`Stock insuficiente para ${prod?.nombre || 'producto'}. Disponible: ${stockDisponible}`);
    }
  }

  // Crear transferencia
  const { data: transferencia, error: errorTrans } = await supabase
    .from('transferencias_almacen')
    .insert({
      numero,
      fecha: new Date().toISOString().split('T')[0],
      almacen_origen_id: input.almacen_origen_id,
      almacen_destino_id: input.almacen_destino_id,
      estado: 'borrador',
      notas: input.notas,
      usuario_solicita_id: usuario_id
    })
    .select()
    .single();

  if (errorTrans) throw errorTrans;

  // Crear detalles
  const detalles = input.detalles.map(d => ({
    transferencia_id: transferencia.id,
    producto_id: d.producto_id,
    cantidad_solicitada: d.cantidad_solicitada,
    lote_id: d.lote_id,
    notas: d.notas
  }));

  const { error: errorDet } = await supabase
    .from('transferencias_almacen_detalle')
    .insert(detalles);

  if (errorDet) throw errorDet;

  return obtenerTransferenciaPorId(transferencia.id) as Promise<Transferencia>;
}

/**
 * Verificar stock disponible
 */
async function verificarStockDisponible(
  producto_id: string, 
  almacen_id: string, 
  lote_id?: string
): Promise<number> {
  let query = supabase
    .from('movimientos_inventario')
    .select('tipo, cantidad')
    .eq('producto_id', producto_id)
    .eq('almacen_id', almacen_id);
  
  if (lote_id) {
    query = query.eq('lote_id', lote_id);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  let stock = 0;
  for (const mov of data || []) {
    if (mov.tipo === 'entrada' || mov.tipo === 'ajuste_positivo') {
      stock += mov.cantidad;
    } else if (mov.tipo === 'salida' || mov.tipo === 'ajuste_negativo') {
      stock -= mov.cantidad;
    }
  }
  
  return stock;
}

/**
 * Cambiar estado de transferencia
 */
export async function cambiarEstadoTransferencia(
  id: string, 
  nuevoEstado: EstadoTransferencia,
  usuario_id: string,
  datosAdicionales?: Partial<Transferencia>
): Promise<Transferencia> {
  const transferencia = await obtenerTransferenciaPorId(id);
  if (!transferencia) throw new Error('Transferencia no encontrada');

  // Validar transiciones de estado permitidas
  const transicionesPermitidas: Record<EstadoTransferencia, EstadoTransferencia[]> = {
    'borrador': ['pendiente_aprobacion', 'cancelada'],
    'pendiente_aprobacion': ['aprobada', 'borrador', 'cancelada'],
    'aprobada': ['en_transito', 'cancelada'],
    'en_transito': ['recibida_parcial', 'recibida', 'cancelada'],
    'recibida_parcial': ['recibida'],
    'recibida': [],
    'cancelada': []
  };

  if (!transicionesPermitidas[transferencia.estado].includes(nuevoEstado)) {
    throw new Error(`No se puede cambiar de ${transferencia.estado} a ${nuevoEstado}`);
  }

  const actualizacion: Record<string, unknown> = {
    estado: nuevoEstado,
    ...datosAdicionales
  };

  // Agregar fechas y usuarios según el estado
  if (nuevoEstado === 'aprobada') {
    actualizacion.usuario_aprueba_id = usuario_id;
    actualizacion.fecha_aprobacion = new Date().toISOString();
  }
  if (nuevoEstado === 'en_transito') {
    actualizacion.fecha_envio = new Date().toISOString();
    // Crear movimientos de salida del almacén origen
    await crearMovimientosSalida(transferencia);
  }
  if (nuevoEstado === 'recibida' || nuevoEstado === 'recibida_parcial') {
    actualizacion.usuario_recibe_id = usuario_id;
    actualizacion.fecha_recepcion = new Date().toISOString();
    // Crear movimientos de entrada al almacén destino
    await crearMovimientosEntrada(transferencia, nuevoEstado === 'recibida_parcial');
  }

  const { error } = await supabase
    .from('transferencias_almacen')
    .update(actualizacion)
    .eq('id', id);

  if (error) throw error;
  
  return obtenerTransferenciaPorId(id) as Promise<Transferencia>;
}

/**
 * Crear movimientos de salida (al enviar)
 */
async function crearMovimientosSalida(transferencia: Transferencia): Promise<void> {
  if (!transferencia.detalles) return;

  const movimientos = transferencia.detalles.map(det => ({
    producto_id: det.producto_id,
    almacen_id: transferencia.almacen_origen_id,
    tipo: 'salida',
    cantidad: det.cantidad_solicitada,
    lote_id: det.lote_id,
    documento_tipo: 'transferencia',
    documento_id: transferencia.id,
    notas: `Transferencia ${transferencia.numero} a ${transferencia.almacen_destino?.nombre || 'otro almacén'}`
  }));

  const { error } = await supabase
    .from('movimientos_inventario')
    .insert(movimientos);

  if (error) throw error;
}

/**
 * Crear movimientos de entrada (al recibir)
 */
async function crearMovimientosEntrada(transferencia: Transferencia, parcial: boolean): Promise<void> {
  if (!transferencia.detalles) return;

  const movimientos = transferencia.detalles.map(det => ({
    producto_id: det.producto_id,
    almacen_id: transferencia.almacen_destino_id,
    tipo: 'entrada',
    cantidad: parcial ? (det.cantidad_recibida || det.cantidad_enviada || det.cantidad_solicitada) : det.cantidad_solicitada,
    lote_id: det.lote_id,
    documento_tipo: 'transferencia',
    documento_id: transferencia.id,
    notas: `Transferencia ${transferencia.numero} desde ${transferencia.almacen_origen?.nombre || 'otro almacén'}`
  }));

  const { error } = await supabase
    .from('movimientos_inventario')
    .insert(movimientos);

  if (error) throw error;
}

/**
 * Actualizar cantidades recibidas
 */
export async function actualizarCantidadesRecibidas(
  transferencia_id: string,
  detalles: { detalle_id: string; cantidad_recibida: number }[]
): Promise<void> {
  for (const det of detalles) {
    const { error } = await supabase
      .from('transferencias_almacen_detalle')
      .update({ cantidad_recibida: det.cantidad_recibida })
      .eq('id', det.detalle_id);
    
    if (error) throw error;
  }
}

/**
 * Eliminar transferencia (solo en borrador)
 */
export async function eliminarTransferencia(id: string): Promise<void> {
  const transferencia = await obtenerTransferenciaPorId(id);
  if (!transferencia) throw new Error('Transferencia no encontrada');
  if (transferencia.estado !== 'borrador') {
    throw new Error('Solo se pueden eliminar transferencias en borrador');
  }

  // Eliminar detalles primero
  await supabase
    .from('transferencias_almacen_detalle')
    .delete()
    .eq('transferencia_id', id);

  // Eliminar transferencia
  const { error } = await supabase
    .from('transferencias_almacen')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Obtener resumen de transferencias para dashboard
 */
export async function obtenerResumenTransferencias(): Promise<{
  pendientes: number;
  en_transito: number;
  recibidas_hoy: number;
  total_mes: number;
}> {
  const hoy = new Date().toISOString().split('T')[0];
  const inicioMes = new Date();
  inicioMes.setDate(1);
  
  const [pendientes, enTransito, recibidasHoy, totalMes] = await Promise.all([
    supabase
      .from('transferencias_almacen')
      .select('id', { count: 'exact', head: true })
      .in('estado', ['pendiente_aprobacion', 'aprobada']),
    supabase
      .from('transferencias_almacen')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'en_transito'),
    supabase
      .from('transferencias_almacen')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'recibida')
      .eq('fecha_recepcion', hoy),
    supabase
      .from('transferencias_almacen')
      .select('id', { count: 'exact', head: true })
      .gte('fecha', inicioMes.toISOString().split('T')[0])
  ]);

  return {
    pendientes: pendientes.count || 0,
    en_transito: enTransito.count || 0,
    recibidas_hoy: recibidasHoy.count || 0,
    total_mes: totalMes.count || 0
  };
}

export default {
  obtenerTransferencias,
  obtenerTransferenciaPorId,
  crearTransferencia,
  cambiarEstadoTransferencia,
  actualizarCantidadesRecibidas,
  eliminarTransferencia,
  obtenerResumenTransferencias
};
