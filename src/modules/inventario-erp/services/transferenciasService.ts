/**
 * Servicio de Transferencias entre Almacenes
 * Gestiona el movimiento de stock de un almacén a otro
 * 
 * NOTA: Este servicio usa tablas temporales simuladas hasta que se ejecute
 * la migración 026_transferencias_y_mejoras.sql
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
  producto?: { id: string; nombre: string; clave: string; unidad: string };
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

// Almacenamiento temporal en memoria (hasta que existan las tablas)
const transferenciasMemoria: Transferencia[] = [];
const detallesMemoria: TransferenciaDetalle[] = [];
let contadorTransferencias = 0;
let contadorDetalles = 0;

/**
 * Genera número de transferencia único
 */
function generarNumeroTransferencia(): string {
  const fecha = new Date();
  const año = fecha.getFullYear().toString().slice(-2);
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  contadorTransferencias++;
  return `TR${año}${mes}${contadorTransferencias.toString().padStart(4, '0')}`;
}

/**
 * Verificar si las tablas de transferencias existen
 */
async function tablasExisten(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('transferencias_erp')
      .select('id')
      .limit(1);
    
    // Si no hay error o el error no es de tabla inexistente
    return !error || !error.message.includes('does not exist');
  } catch {
    return false;
  }
}

/**
 * Obtener lista de transferencias con filtros
 */
export async function obtenerTransferencias(filtros?: FiltrosTransferencia): Promise<Transferencia[]> {
  const usarTablas = await tablasExisten();
  
  if (usarTablas) {
    let query = supabase
      .from('transferencias_erp')
      .select(`
        *,
        almacen_origen:almacenes_erp!transferencias_erp_almacen_origen_id_fkey(id, nombre),
        almacen_destino:almacenes_erp!transferencias_erp_almacen_destino_id_fkey(id, nombre),
        detalles:transferencia_detalle_erp(
          *,
          producto:productos_erp(id, nombre, clave, unidad)
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

  // Modo simulado - filtrar en memoria
  let resultado = [...transferenciasMemoria];
  
  if (filtros?.estado) {
    resultado = resultado.filter(t => t.estado === filtros.estado);
  }
  if (filtros?.almacen_origen_id) {
    resultado = resultado.filter(t => t.almacen_origen_id === filtros.almacen_origen_id);
  }
  
  // Enriquecer con detalles
  for (const trans of resultado) {
    trans.detalles = detallesMemoria.filter(d => d.transferencia_id === trans.id);
  }
  
  return resultado;
}

/**
 * Obtener transferencia por ID
 */
export async function obtenerTransferenciaPorId(id: string): Promise<Transferencia | null> {
  const usarTablas = await tablasExisten();
  
  if (usarTablas) {
    const { data, error } = await supabase
      .from('transferencias_erp')
      .select(`
        *,
        almacen_origen:almacenes_erp!transferencias_erp_almacen_origen_id_fkey(id, nombre),
        almacen_destino:almacenes_erp!transferencias_erp_almacen_destino_id_fkey(id, nombre),
        detalles:transferencia_detalle_erp(
          *,
          producto:productos_erp(id, nombre, clave, unidad)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
  
  // Modo simulado
  const trans = transferenciasMemoria.find(t => t.id === id);
  if (trans) {
    trans.detalles = detallesMemoria.filter(d => d.transferencia_id === id);
  }
  return trans || null;
}

/**
 * Crear nueva transferencia
 */
export async function crearTransferencia(
  input: CrearTransferenciaInput, 
  usuario_id: string
): Promise<Transferencia> {
  const numero = generarNumeroTransferencia();
  
  // Validar que origen y destino sean diferentes
  if (input.almacen_origen_id === input.almacen_destino_id) {
    throw new Error('El almacén de origen y destino deben ser diferentes');
  }

  // Obtener nombres de almacenes
  const { data: almacenes } = await supabase
    .from('almacenes_erp')
    .select('id, nombre')
    .in('id', [input.almacen_origen_id, input.almacen_destino_id]);

  const almacenOrigen = almacenes?.find(a => a.id === input.almacen_origen_id);
  const almacenDestino = almacenes?.find(a => a.id === input.almacen_destino_id);

  const usarTablas = await tablasExisten();
  
  if (usarTablas) {
    // Crear en base de datos
    const { data: transferencia, error: errorTrans } = await supabase
      .from('transferencias_erp')
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
      .from('transferencia_detalle_erp')
      .insert(detalles);

    if (errorDet) throw errorDet;

    return obtenerTransferenciaPorId(transferencia.id) as Promise<Transferencia>;
  }

  // Modo simulado
  const id = `sim-trans-${Date.now()}`;
  const nuevaTransferencia: Transferencia = {
    id,
    numero,
    fecha: new Date().toISOString().split('T')[0],
    almacen_origen_id: input.almacen_origen_id,
    almacen_destino_id: input.almacen_destino_id,
    estado: 'borrador',
    notas: input.notas,
    usuario_solicita_id: usuario_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    almacen_origen: almacenOrigen,
    almacen_destino: almacenDestino,
    detalles: []
  };

  // Crear detalles simulados
  for (const det of input.detalles) {
    const { data: producto } = await supabase
      .from('productos_erp')
      .select('id, nombre, clave, unidad')
      .eq('id', det.producto_id)
      .single();

    const detalle: TransferenciaDetalle = {
      id: `sim-det-${++contadorDetalles}`,
      transferencia_id: id,
      producto_id: det.producto_id,
      cantidad_solicitada: det.cantidad_solicitada,
      lote_id: det.lote_id,
      notas: det.notas,
      producto: producto || undefined
    };
    detallesMemoria.push(detalle);
    nuevaTransferencia.detalles!.push(detalle);
  }

  transferenciasMemoria.push(nuevaTransferencia);
  
  return nuevaTransferencia;
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
    updated_at: new Date().toISOString(),
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
    await crearMovimientosEntrada(transferencia);
  }

  const usarTablas = await tablasExisten();
  
  if (usarTablas) {
    const { error } = await supabase
      .from('transferencias_erp')
      .update(actualizacion)
      .eq('id', id);

    if (error) throw error;
  } else {
    // Modo simulado - actualizar en memoria
    const idx = transferenciasMemoria.findIndex(t => t.id === id);
    if (idx >= 0) {
      transferenciasMemoria[idx] = {
        ...transferenciasMemoria[idx],
        ...actualizacion
      } as Transferencia;
    }
  }
  
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
    referencia: `Transferencia ${transferencia.numero}`,
    concepto: `Envío a ${transferencia.almacen_destino?.nombre || 'otro almacén'}`
  }));

  const { error } = await supabase
    .from('movimientos_inventario_erp')
    .insert(movimientos);

  if (error) {
    console.error('Error creando movimientos de salida:', error);
    // No lanzar error para permitir modo simulado
  }
}

/**
 * Crear movimientos de entrada (al recibir)
 */
async function crearMovimientosEntrada(transferencia: Transferencia): Promise<void> {
  if (!transferencia.detalles) return;

  const movimientos = transferencia.detalles.map(det => ({
    producto_id: det.producto_id,
    almacen_id: transferencia.almacen_destino_id,
    tipo: 'entrada',
    cantidad: det.cantidad_recibida || det.cantidad_solicitada,
    referencia: `Transferencia ${transferencia.numero}`,
    concepto: `Recepción de ${transferencia.almacen_origen?.nombre || 'otro almacén'}`
  }));

  const { error } = await supabase
    .from('movimientos_inventario_erp')
    .insert(movimientos);

  if (error) {
    console.error('Error creando movimientos de entrada:', error);
  }
}

/**
 * Eliminar transferencia (solo borradores)
 */
export async function eliminarTransferencia(id: string): Promise<void> {
  const transferencia = await obtenerTransferenciaPorId(id);
  if (!transferencia) throw new Error('Transferencia no encontrada');
  
  if (transferencia.estado !== 'borrador') {
    throw new Error('Solo se pueden eliminar transferencias en estado borrador');
  }

  const usarTablas = await tablasExisten();
  
  if (usarTablas) {
    // Eliminar detalles primero
    await supabase
      .from('transferencia_detalle_erp')
      .delete()
      .eq('transferencia_id', id);
    
    // Eliminar transferencia
    const { error } = await supabase
      .from('transferencias_erp')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } else {
    // Modo simulado
    const idx = transferenciasMemoria.findIndex(t => t.id === id);
    if (idx >= 0) {
      transferenciasMemoria.splice(idx, 1);
    }
    // Eliminar detalles
    for (let i = detallesMemoria.length - 1; i >= 0; i--) {
      if (detallesMemoria[i].transferencia_id === id) {
        detallesMemoria.splice(i, 1);
      }
    }
  }
}

/**
 * Obtener resumen de transferencias
 */
export async function obtenerResumenTransferencias(): Promise<{
  total: number;
  pendientes: number;
  en_transito: number;
  completadas: number;
}> {
  const usarTablas = await tablasExisten();
  
  if (usarTablas) {
    const { data, error } = await supabase
      .from('transferencias_erp')
      .select('estado');

    if (error) throw error;
    
    const transferencias = data || [];
    return {
      total: transferencias.length,
      pendientes: transferencias.filter(t => ['borrador', 'pendiente_aprobacion', 'aprobada'].includes(t.estado)).length,
      en_transito: transferencias.filter(t => t.estado === 'en_transito').length,
      completadas: transferencias.filter(t => ['recibida', 'recibida_parcial'].includes(t.estado)).length
    };
  }
  
  // Modo simulado
  return {
    total: transferenciasMemoria.length,
    pendientes: transferenciasMemoria.filter(t => ['borrador', 'pendiente_aprobacion', 'aprobada'].includes(t.estado)).length,
    en_transito: transferenciasMemoria.filter(t => t.estado === 'en_transito').length,
    completadas: transferenciasMemoria.filter(t => ['recibida', 'recibida_parcial'].includes(t.estado)).length
  };
}

export default {
  obtenerTransferencias,
  obtenerTransferenciaPorId,
  crearTransferencia,
  cambiarEstadoTransferencia,
  eliminarTransferencia,
  obtenerResumenTransferencias
};
