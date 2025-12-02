/**
 * Servicio para gestión de Órdenes de Compra
 */

import { supabase } from '../../../core/config/supabase';
import type { 
  OrdenCompra, 
  OrdenCompraDetalle, 
  OrdenCompraCreate,
  OrdenCompraDetalleCreate,
  EstadoOrdenCompra 
} from '../types';

/**
 * Obtener órdenes de compra
 */
export async function fetchOrdenesCompra(
  empresaId: string,
  filtros?: {
    estado?: EstadoOrdenCompra;
    proveedorId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    eventoId?: number;
  }
): Promise<OrdenCompra[]> {
  let query = supabase
    .from('ordenes_compra_erp')
    .select(`
      *,
      proveedor:proveedores_erp(id, nombre, rfc),
      almacen_destino:almacenes_erp(id, nombre),
      evento:eventos(id, nombre_proyecto)
    `)
    .eq('empresa_id', empresaId)
    .order('fecha_orden', { ascending: false });

  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado);
  }
  if (filtros?.proveedorId) {
    query = query.eq('proveedor_id', filtros.proveedorId);
  }
  if (filtros?.fechaDesde) {
    query = query.gte('fecha_orden', filtros.fechaDesde);
  }
  if (filtros?.fechaHasta) {
    query = query.lte('fecha_orden', filtros.fechaHasta);
  }
  if (filtros?.eventoId) {
    query = query.eq('evento_id', filtros.eventoId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Obtener una orden de compra con detalles
 */
export async function fetchOrdenCompraConDetalles(ordenId: number): Promise<OrdenCompra | null> {
  const { data: orden, error } = await supabase
    .from('ordenes_compra_erp')
    .select(`
      *,
      proveedor:proveedores_erp(id, nombre, rfc, email, telefono),
      almacen_destino:almacenes_erp(id, nombre),
      evento:eventos(id, nombre_proyecto, fecha_evento)
    `)
    .eq('id', ordenId)
    .single();

  if (error) throw error;
  if (!orden) return null;

  // Obtener detalles
  const { data: detalles, error: errorDetalles } = await supabase
    .from('ordenes_compra_detalle_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, codigo, unidad_medida)
    `)
    .eq('orden_id', ordenId)
    .order('id');

  if (errorDetalles) throw errorDetalles;

  return { ...orden, detalles: detalles || [] };
}

/**
 * Crear orden de compra
 */
export async function createOrdenCompra(
  orden: Omit<OrdenCompraCreate, 'numero_orden'>,
  detalles: Omit<OrdenCompraDetalleCreate, 'orden_id'>[]
): Promise<OrdenCompra> {
  // Generar número de orden
  const { data: numeroData } = await supabase
    .rpc('generar_numero_orden_compra', { p_empresa_id: orden.empresa_id });
  
  const numero_orden = numeroData || `OC-${Date.now()}`;

  // Calcular totales
  let subtotal = 0;
  detalles.forEach(d => {
    const lineaSubtotal = (d.cantidad * d.precio_unitario) - (d.descuento_monto || 0);
    subtotal += lineaSubtotal;
  });

  const descuentoMonto = orden.descuento_monto || (subtotal * (orden.descuento_porcentaje || 0) / 100);
  const baseIva = subtotal - descuentoMonto;
  const iva = baseIva * 0.16; // 16% IVA México
  const total = baseIva + iva + (orden.otros_impuestos || 0) + (orden.costo_envio || 0);

  // Insertar orden
  const { data: ordenCreada, error: errorOrden } = await supabase
    .from('ordenes_compra_erp')
    .insert({
      ...orden,
      numero_orden,
      subtotal,
      descuento_monto: descuentoMonto,
      iva,
      total,
    })
    .select()
    .single();

  if (errorOrden) throw errorOrden;

  // Insertar detalles
  const detallesConOrden = detalles.map(d => ({
    ...d,
    orden_id: ordenCreada.id,
    iva_monto: ((d.cantidad * d.precio_unitario) - (d.descuento_monto || 0)) * (d.iva_porcentaje || 16) / 100,
  }));

  const { error: errorDetalles } = await supabase
    .from('ordenes_compra_detalle_erp')
    .insert(detallesConOrden);

  if (errorDetalles) throw errorDetalles;

  return ordenCreada;
}

/**
 * Actualizar orden de compra
 */
export async function updateOrdenCompra(
  ordenId: number,
  updates: Partial<OrdenCompra>
): Promise<OrdenCompra> {
  const { data, error } = await supabase
    .from('ordenes_compra_erp')
    .update(updates)
    .eq('id', ordenId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cambiar estado de orden
 */
export async function cambiarEstadoOrden(
  ordenId: number,
  nuevoEstado: EstadoOrdenCompra,
  datos?: { aprobado_por?: string; motivo_rechazo?: string }
): Promise<OrdenCompra> {
  const updates: any = { estado: nuevoEstado };

  if (nuevoEstado === 'aprobada' && datos?.aprobado_por) {
    updates.aprobado_por = datos.aprobado_por;
    updates.fecha_aprobacion = new Date().toISOString();
  }

  if (nuevoEstado === 'cancelada' && datos?.motivo_rechazo) {
    updates.motivo_rechazo = datos.motivo_rechazo;
  }

  return updateOrdenCompra(ordenId, updates);
}

/**
 * Aprobar orden de compra
 */
export async function aprobarOrdenCompra(ordenId: number, aprobadoPor: string): Promise<OrdenCompra> {
  return cambiarEstadoOrden(ordenId, 'aprobada', { aprobado_por: aprobadoPor });
}

/**
 * Enviar orden a proveedor
 */
export async function enviarOrdenAProveedor(ordenId: number): Promise<OrdenCompra> {
  return cambiarEstadoOrden(ordenId, 'enviada_proveedor');
}

/**
 * Cancelar orden de compra
 */
export async function cancelarOrdenCompra(ordenId: number, motivo: string): Promise<OrdenCompra> {
  return cambiarEstadoOrden(ordenId, 'cancelada', { motivo_rechazo: motivo });
}

/**
 * Cerrar orden de compra
 */
export async function cerrarOrdenCompra(ordenId: number): Promise<OrdenCompra> {
  return cambiarEstadoOrden(ordenId, 'cerrada');
}

/**
 * Eliminar orden de compra (solo borradores)
 */
export async function deleteOrdenCompra(ordenId: number): Promise<void> {
  // Verificar que esté en borrador
  const { data: orden } = await supabase
    .from('ordenes_compra_erp')
    .select('estado')
    .eq('id', ordenId)
    .single();

  if (orden?.estado !== 'borrador') {
    throw new Error('Solo se pueden eliminar órdenes en estado borrador');
  }

  // Eliminar detalles primero
  await supabase
    .from('ordenes_compra_detalle_erp')
    .delete()
    .eq('orden_id', ordenId);

  // Eliminar orden
  const { error } = await supabase
    .from('ordenes_compra_erp')
    .delete()
    .eq('id', ordenId);

  if (error) throw error;
}

/**
 * Agregar detalle a orden
 */
export async function agregarDetalleOrden(
  ordenId: number,
  detalle: Omit<OrdenCompraDetalleCreate, 'orden_id'>
): Promise<OrdenCompraDetalle> {
  const { data, error } = await supabase
    .from('ordenes_compra_detalle_erp')
    .insert({
      ...detalle,
      orden_id: ordenId,
      iva_monto: ((detalle.cantidad * detalle.precio_unitario) - (detalle.descuento_monto || 0)) * (detalle.iva_porcentaje || 16) / 100,
    })
    .select()
    .single();

  if (error) throw error;

  // Recalcular totales de la orden
  await recalcularTotalesOrden(ordenId);

  return data;
}

/**
 * Actualizar detalle de orden
 */
export async function actualizarDetalleOrden(
  detalleId: number,
  updates: Partial<OrdenCompraDetalle>
): Promise<OrdenCompraDetalle> {
  const { data, error } = await supabase
    .from('ordenes_compra_detalle_erp')
    .update(updates)
    .eq('id', detalleId)
    .select()
    .single();

  if (error) throw error;

  // Recalcular totales
  await recalcularTotalesOrden(data.orden_id);

  return data;
}

/**
 * Eliminar detalle de orden
 */
export async function eliminarDetalleOrden(detalleId: number): Promise<void> {
  // Obtener orden_id antes de eliminar
  const { data: detalle } = await supabase
    .from('ordenes_compra_detalle_erp')
    .select('orden_id')
    .eq('id', detalleId)
    .single();

  const { error } = await supabase
    .from('ordenes_compra_detalle_erp')
    .delete()
    .eq('id', detalleId);

  if (error) throw error;

  // Recalcular totales
  if (detalle?.orden_id) {
    await recalcularTotalesOrden(detalle.orden_id);
  }
}

/**
 * Recalcular totales de una orden
 */
async function recalcularTotalesOrden(ordenId: number): Promise<void> {
  // Obtener orden y sus detalles
  const { data: orden } = await supabase
    .from('ordenes_compra_erp')
    .select('descuento_porcentaje, otros_impuestos, costo_envio')
    .eq('id', ordenId)
    .single();

  const { data: detalles } = await supabase
    .from('ordenes_compra_detalle_erp')
    .select('cantidad, precio_unitario, descuento_monto')
    .eq('orden_id', ordenId);

  if (!orden || !detalles) return;

  let subtotal = 0;
  detalles.forEach(d => {
    subtotal += (d.cantidad * d.precio_unitario) - (d.descuento_monto || 0);
  });

  const descuentoMonto = subtotal * (orden.descuento_porcentaje || 0) / 100;
  const baseIva = subtotal - descuentoMonto;
  const iva = baseIva * 0.16;
  const total = baseIva + iva + (orden.otros_impuestos || 0) + (orden.costo_envio || 0);

  await supabase
    .from('ordenes_compra_erp')
    .update({ subtotal, descuento_monto: descuentoMonto, iva, total })
    .eq('id', ordenId);
}

/**
 * Obtener estadísticas de órdenes de compra
 */
export async function getEstadisticasOrdenes(empresaId: string): Promise<{
  total: number;
  borradores: number;
  pendientesAprobacion: number;
  enviadas: number;
  parcialmenteRecibidas: number;
  recibidas: number;
  montoTotal: number;
  montoMes: number;
}> {
  const { data, error } = await supabase
    .from('ordenes_compra_erp')
    .select('estado, total, fecha_orden')
    .eq('empresa_id', empresaId);

  if (error) throw error;

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const stats = {
    total: data?.length || 0,
    borradores: 0,
    pendientesAprobacion: 0,
    enviadas: 0,
    parcialmenteRecibidas: 0,
    recibidas: 0,
    montoTotal: 0,
    montoMes: 0,
  };

  data?.forEach(orden => {
    if (orden.estado === 'borrador') stats.borradores++;
    if (orden.estado === 'pendiente_aprobacion') stats.pendientesAprobacion++;
    if (orden.estado === 'enviada_proveedor') stats.enviadas++;
    if (orden.estado === 'parcialmente_recibida') stats.parcialmenteRecibidas++;
    if (orden.estado === 'recibida') stats.recibidas++;
    
    stats.montoTotal += orden.total || 0;
    
    if (new Date(orden.fecha_orden) >= inicioMes) {
      stats.montoMes += orden.total || 0;
    }
  });

  return stats;
}

/**
 * Duplicar orden de compra
 */
export async function duplicarOrdenCompra(ordenId: number): Promise<OrdenCompra> {
  const ordenOriginal = await fetchOrdenCompraConDetalles(ordenId);
  if (!ordenOriginal) throw new Error('Orden no encontrada');

  const { detalles, id, numero_orden, estado, created_at, updated_at, ...datosOrden } = ordenOriginal;

  const nuevaOrden = await createOrdenCompra(
    {
      ...datosOrden,
      estado: 'borrador',
      fecha_orden: new Date().toISOString().split('T')[0],
      fecha_entrega_esperada: undefined,
      fecha_entrega_real: undefined,
      aprobado_por: undefined,
      fecha_aprobacion: undefined,
    } as any,
    (detalles || []).map(d => ({
      producto_id: d.producto_id,
      descripcion_adicional: d.descripcion_adicional,
      cantidad: d.cantidad,
      cantidad_recibida: 0,
      unidad_medida: d.unidad_medida,
      precio_unitario: d.precio_unitario,
      descuento_porcentaje: d.descuento_porcentaje,
      descuento_monto: d.descuento_monto,
      iva_porcentaje: d.iva_porcentaje,
      iva_monto: d.iva_monto,
      notas: d.notas,
      completada: false,
    }))
  );

  return nuevaOrden;
}
