/**
 * Servicio para gestión de Requisiciones de Compra
 */

import { supabase } from '../../../core/config/supabase';
import type { 
  RequisicionCompra, 
  RequisicionCompraDetalle,
  RequisicionCompraCreate,
  EstadoRequisicion,
  PrioridadRequisicion 
} from '../types';

/**
 * Obtener requisiciones
 */
export async function fetchRequisiciones(
  empresaId: string,
  filtros?: {
    estado?: EstadoRequisicion;
    solicitanteId?: string;
    prioridad?: PrioridadRequisicion;
    eventoId?: number;
  }
): Promise<RequisicionCompra[]> {
  let query = supabase
    .from('requisiciones_compra_erp')
    .select(`
      *,
      evento:eventos(id, nombre_proyecto)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });

  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado);
  }
  if (filtros?.solicitanteId) {
    query = query.eq('solicitante_id', filtros.solicitanteId);
  }
  if (filtros?.prioridad) {
    query = query.eq('prioridad', filtros.prioridad);
  }
  if (filtros?.eventoId) {
    query = query.eq('evento_id', filtros.eventoId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Obtener requisición con detalles
 */
export async function fetchRequisicionConDetalles(requisicionId: number): Promise<RequisicionCompra | null> {
  const { data: requisicion, error } = await supabase
    .from('requisiciones_compra_erp')
    .select(`
      *,
      evento:eventos(id, nombre_proyecto, fecha_evento),
      orden_compra:ordenes_compra_erp(id, numero_orden, estado)
    `)
    .eq('id', requisicionId)
    .single();

  if (error) throw error;
  if (!requisicion) return null;

  const { data: detalles, error: errorDetalles } = await supabase
    .from('requisiciones_compra_detalle_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, codigo, unidad_medida),
      proveedor_sugerido:proveedores_erp(id, nombre)
    `)
    .eq('requisicion_id', requisicionId);

  if (errorDetalles) throw errorDetalles;

  return { ...requisicion, detalles: detalles || [] };
}

/**
 * Crear requisición
 */
export async function createRequisicion(
  requisicion: Omit<RequisicionCompraCreate, 'numero_requisicion'>,
  detalles: Omit<RequisicionCompraDetalle, 'id' | 'requisicion_id' | 'created_at'>[]
): Promise<RequisicionCompra> {
  // Generar número
  const { data: numeroData } = await supabase
    .rpc('generar_numero_requisicion', { p_empresa_id: requisicion.empresa_id });
  
  const numero_requisicion = numeroData || `REQ-${Date.now()}`;

  // Insertar requisición
  const { data: requisicionCreada, error } = await supabase
    .from('requisiciones_compra_erp')
    .insert({
      ...requisicion,
      numero_requisicion,
    })
    .select()
    .single();

  if (error) throw error;

  // Insertar detalles
  if (detalles.length > 0) {
    const detallesConRequisicion = detalles.map(d => ({
      ...d,
      requisicion_id: requisicionCreada.id,
    }));

    const { error: errorDetalles } = await supabase
      .from('requisiciones_compra_detalle_erp')
      .insert(detallesConRequisicion);

    if (errorDetalles) throw errorDetalles;
  }

  return requisicionCreada;
}

/**
 * Actualizar requisición
 */
export async function updateRequisicion(
  requisicionId: number,
  updates: Partial<RequisicionCompra>
): Promise<RequisicionCompra> {
  const { data, error } = await supabase
    .from('requisiciones_compra_erp')
    .update(updates)
    .eq('id', requisicionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Aprobar requisición
 */
export async function aprobarRequisicion(
  requisicionId: number,
  aprobadoPor: string
): Promise<RequisicionCompra> {
  return updateRequisicion(requisicionId, {
    estado: 'aprobada',
    aprobada_por: aprobadoPor,
    fecha_aprobacion: new Date().toISOString(),
  } as any);
}

/**
 * Rechazar requisición
 */
export async function rechazarRequisicion(
  requisicionId: number,
  motivo: string
): Promise<RequisicionCompra> {
  return updateRequisicion(requisicionId, {
    estado: 'rechazada',
    motivo_rechazo: motivo,
  } as any);
}

/**
 * Convertir requisición a orden de compra
 */
export async function convertirAOrdenCompra(
  requisicionId: number,
  proveedorId: number,
  almacenDestinoId: number,
  empresaId: string,
  createdBy?: string
): Promise<number> {
  const requisicion = await fetchRequisicionConDetalles(requisicionId);
  if (!requisicion) throw new Error('Requisición no encontrada');
  if (requisicion.estado !== 'aprobada') {
    throw new Error('La requisición debe estar aprobada');
  }

  // Crear orden de compra
  const { data: numeroOrden } = await supabase
    .rpc('generar_numero_orden_compra', { p_empresa_id: empresaId });

  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_compra_erp')
    .insert({
      empresa_id: empresaId,
      numero_orden: numeroOrden || `OC-${Date.now()}`,
      proveedor_id: proveedorId,
      fecha_orden: new Date().toISOString().split('T')[0],
      fecha_entrega_esperada: requisicion.fecha_requerida,
      almacen_destino_id: almacenDestinoId,
      evento_id: requisicion.evento_id,
      proyecto_id: requisicion.proyecto_id,
      estado: 'borrador',
      notas_internas: `Generado desde requisición ${requisicion.numero_requisicion}`,
      created_by: createdBy,
    })
    .select()
    .single();

  if (errorOrden) throw errorOrden;

  // Crear detalles de orden
  const detallesOrden = (requisicion.detalles || [])
    .filter(d => d.producto_id)
    .map(d => ({
      orden_id: orden.id,
      producto_id: d.producto_id!,
      cantidad: d.cantidad,
      unidad_medida: d.unidad_medida,
      precio_unitario: d.precio_estimado || 0,
      notas: d.notas,
    }));

  if (detallesOrden.length > 0) {
    const { error: errorDetalles } = await supabase
      .from('ordenes_compra_detalle_erp')
      .insert(detallesOrden);

    if (errorDetalles) throw errorDetalles;
  }

  // Actualizar requisición
  await updateRequisicion(requisicionId, {
    estado: 'en_compra',
    orden_compra_id: orden.id,
  } as any);

  return orden.id;
}

/**
 * Agregar detalle a requisición
 */
export async function agregarDetalleRequisicion(
  requisicionId: number,
  detalle: Omit<RequisicionCompraDetalle, 'id' | 'requisicion_id' | 'created_at'>
): Promise<RequisicionCompraDetalle> {
  const { data, error } = await supabase
    .from('requisiciones_compra_detalle_erp')
    .insert({
      ...detalle,
      requisicion_id: requisicionId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Eliminar detalle de requisición
 */
export async function eliminarDetalleRequisicion(detalleId: number): Promise<void> {
  const { error } = await supabase
    .from('requisiciones_compra_detalle_erp')
    .delete()
    .eq('id', detalleId);

  if (error) throw error;
}

/**
 * Eliminar requisición (solo pendientes)
 */
export async function deleteRequisicion(requisicionId: number): Promise<void> {
  const { data: req } = await supabase
    .from('requisiciones_compra_erp')
    .select('estado')
    .eq('id', requisicionId)
    .single();

  if (req?.estado !== 'pendiente') {
    throw new Error('Solo se pueden eliminar requisiciones pendientes');
  }

  // Eliminar detalles
  await supabase
    .from('requisiciones_compra_detalle_erp')
    .delete()
    .eq('requisicion_id', requisicionId);

  // Eliminar requisición
  const { error } = await supabase
    .from('requisiciones_compra_erp')
    .delete()
    .eq('id', requisicionId);

  if (error) throw error;
}

/**
 * Obtener estadísticas de requisiciones
 */
export async function getEstadisticasRequisiciones(empresaId: string): Promise<{
  total: number;
  pendientes: number;
  aprobadas: number;
  enCompra: number;
  urgentes: number;
}> {
  const { data, error } = await supabase
    .from('requisiciones_compra_erp')
    .select('estado, prioridad')
    .eq('empresa_id', empresaId);

  if (error) throw error;

  const stats = {
    total: data?.length || 0,
    pendientes: 0,
    aprobadas: 0,
    enCompra: 0,
    urgentes: 0,
  };

  data?.forEach(r => {
    if (r.estado === 'pendiente') stats.pendientes++;
    if (r.estado === 'aprobada') stats.aprobadas++;
    if (r.estado === 'en_compra') stats.enCompra++;
    if (r.prioridad === 'urgente' || r.prioridad === 'alta') stats.urgentes++;
  });

  return stats;
}

/**
 * Obtener requisiciones por evento
 */
export async function getRequisicionesPorEvento(eventoId: number): Promise<RequisicionCompra[]> {
  const { data, error } = await supabase
    .from('requisiciones_compra_erp')
    .select('*')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
