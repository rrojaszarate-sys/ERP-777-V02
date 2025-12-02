/**
 * Servicio para gestión de Recepciones de Compra
 */

import { supabase } from '../../../core/config/supabase';
import type { RecepcionCompra, RecepcionCompraDetalle, RecepcionCompraCreate, EstadoRecepcion } from '../types';

/**
 * Obtener recepciones de compra
 */
export async function fetchRecepciones(
  empresaId: string,
  filtros?: {
    ordenId?: number;
    almacenId?: number;
    estado?: EstadoRecepcion;
    fechaDesde?: string;
    fechaHasta?: string;
  }
): Promise<RecepcionCompra[]> {
  let query = supabase
    .from('recepciones_compra_erp')
    .select(`
      *,
      orden_compra:ordenes_compra_erp(id, numero_orden, proveedor:proveedores_erp(nombre, razon_social)),
      almacen:almacenes_erp(id, nombre)
    `)
    .eq('empresa_id', empresaId)
    .order('fecha_recepcion', { ascending: false });

  if (filtros?.ordenId) {
    query = query.eq('orden_id', filtros.ordenId);
  }
  if (filtros?.almacenId) {
    query = query.eq('almacen_id', filtros.almacenId);
  }
  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado);
  }
  if (filtros?.fechaDesde) {
    query = query.gte('fecha_recepcion', filtros.fechaDesde);
  }
  if (filtros?.fechaHasta) {
    query = query.lte('fecha_recepcion', filtros.fechaHasta);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Obtener recepción con detalles
 */
export async function fetchRecepcionConDetalles(recepcionId: number): Promise<RecepcionCompra | null> {
  const { data: recepcion, error } = await supabase
    .from('recepciones_compra_erp')
    .select(`
      *,
      orden:ordenes_compra_erp(
        id, 
        numero_orden, 
        proveedor:proveedores_erp(id, nombre)
      ),
      almacen:almacenes_erp(id, nombre)
    `)
    .eq('id', recepcionId)
    .single();

  if (error) throw error;
  if (!recepcion) return null;

  const { data: detalles, error: errorDetalles } = await supabase
    .from('recepciones_compra_detalle_erp')
    .select(`
      *,
      orden_detalle:ordenes_compra_detalle_erp(
        producto:productos_erp(id, nombre, codigo),
        cantidad,
        precio_unitario
      ),
      ubicacion:ubicaciones_almacen_erp(id, codigo_ubicacion)
    `)
    .eq('recepcion_id', recepcionId);

  if (errorDetalles) throw errorDetalles;

  return { ...recepcion, detalles: detalles || [] };
}

/**
 * Crear recepción de compra
 */
export async function createRecepcion(
  recepcion: Omit<RecepcionCompraCreate, 'numero_recepcion'>,
  detalles: Omit<RecepcionCompraDetalle, 'id' | 'recepcion_id' | 'created_at'>[]
): Promise<RecepcionCompra> {
  // Generar número de recepción
  const { data: numeroData } = await supabase
    .rpc('generar_numero_recepcion', { p_empresa_id: recepcion.empresa_id });
  
  const numero_recepcion = numeroData || `REC-${Date.now()}`;

  // Determinar estado
  const todasCompletas = detalles.every(d => d.cantidad_recibida >= d.cantidad_esperada);
  const algunaRecibida = detalles.some(d => d.cantidad_recibida > 0);
  let estado: 'pendiente' | 'parcial' | 'completa' = 'pendiente';
  if (todasCompletas) estado = 'completa';
  else if (algunaRecibida) estado = 'parcial';

  // Insertar recepción
  const { data: recepcionCreada, error } = await supabase
    .from('recepciones_compra_erp')
    .insert({
      ...recepcion,
      numero_recepcion,
      estado,
    })
    .select()
    .single();

  if (error) throw error;

  // Insertar detalles
  const detallesConRecepcion = detalles.map(d => ({
    ...d,
    recepcion_id: recepcionCreada.id,
  }));

  const { error: errorDetalles } = await supabase
    .from('recepciones_compra_detalle_erp')
    .insert(detallesConRecepcion);

  if (errorDetalles) throw errorDetalles;

  // El trigger actualizará automáticamente las cantidades en la orden

  return recepcionCreada;
}

/**
 * Crear recepción rápida (recibe todo lo pendiente)
 */
export async function crearRecepcionRapida(
  ordenId: number,
  almacenId: number,
  empresaId: string,
  recibidoPor?: string
): Promise<RecepcionCompra> {
  // Obtener detalles pendientes de la orden
  const { data: detallesOrden, error } = await supabase
    .from('ordenes_compra_detalle_erp')
    .select('id, cantidad, cantidad_recibida')
    .eq('orden_id', ordenId)
    .gt('cantidad_pendiente', 0);

  if (error) throw error;
  if (!detallesOrden || detallesOrden.length === 0) {
    throw new Error('No hay productos pendientes de recibir');
  }

  const detalles = detallesOrden.map(d => ({
    orden_detalle_id: d.id,
    cantidad_esperada: d.cantidad - d.cantidad_recibida,
    cantidad_recibida: d.cantidad - d.cantidad_recibida,
    cantidad_rechazada: 0,
    estado_calidad: 'aceptado' as const,
  }));

  return createRecepcion(
    {
      empresa_id: empresaId,
      orden_id: ordenId,
      almacen_id: almacenId,
      recibido_por: recibidoPor,
      fecha_recepcion: new Date().toISOString(),
      estado: 'completa',
    },
    detalles
  );
}

/**
 * Actualizar recepción
 */
export async function updateRecepcion(
  recepcionId: number,
  updates: Partial<RecepcionCompra>
): Promise<RecepcionCompra> {
  const { data, error } = await supabase
    .from('recepciones_compra_erp')
    .update(updates)
    .eq('id', recepcionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Obtener productos pendientes de recibir de una orden
 */
export async function getProductosPendientesRecibir(ordenId: number): Promise<any[]> {
  const { data, error } = await supabase
    .from('ordenes_compra_detalle_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, codigo, unidad_medida)
    `)
    .eq('orden_id', ordenId)
    .gt('cantidad_pendiente', 0);

  if (error) throw error;
  return data || [];
}

/**
 * Registrar problema de calidad
 */
export async function registrarProblemaCalidad(
  detalleId: number,
  cantidadRechazada: number,
  motivo: string
): Promise<void> {
  const { error } = await supabase
    .from('recepciones_compra_detalle_erp')
    .update({
      cantidad_rechazada: cantidadRechazada,
      estado_calidad: 'rechazado',
      motivo_rechazo: motivo,
    })
    .eq('id', detalleId);

  if (error) throw error;
}

/**
 * Obtener estadísticas de recepciones
 */
export async function getEstadisticasRecepciones(empresaId: string): Promise<{
  total: number;
  esteMes: number;
  conProblemas: number;
  pendientes: number;
}> {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const { data, error } = await supabase
    .from('recepciones_compra_erp')
    .select('id, fecha_recepcion, estado')
    .eq('empresa_id', empresaId);

  if (error) throw error;

  const stats = {
    total: data?.length || 0,
    esteMes: 0,
    conProblemas: 0,
    pendientes: 0,
  };

  data?.forEach(r => {
    if (new Date(r.fecha_recepcion) >= inicioMes) stats.esteMes++;
    if (r.estado === 'con_diferencias') stats.conProblemas++;
    if (r.estado === 'pendiente' || r.estado === 'en_proceso') stats.pendientes++;
  });

  return stats;
}

/**
 * Obtener recepción por ID
 */
export async function fetchRecepcion(recepcionId: number): Promise<RecepcionCompra | null> {
  return fetchRecepcionConDetalles(recepcionId);
}

/**
 * Verificar recepción y actualizar inventario
 */
export async function verificarRecepcion(recepcionId: number): Promise<void> {
  // Obtener la recepción con detalles
  const recepcion = await fetchRecepcionConDetalles(recepcionId);
  if (!recepcion) throw new Error('Recepción no encontrada');
  
  // Cambiar estado a verificada
  const { error } = await supabase
    .from('recepciones_compra_erp')
    .update({
      estado: 'verificada',
      updated_at: new Date().toISOString(),
    })
    .eq('id', recepcionId);

  if (error) throw error;

  // El trigger se encargará de actualizar el stock automáticamente
}

/**
 * Registrar diferencias en la recepción
 */
export async function registrarDiferencias(
  recepcionId: number,
  observaciones: string
): Promise<void> {
  const { error } = await supabase
    .from('recepciones_compra_erp')
    .update({
      estado: 'con_diferencias',
      observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recepcionId);

  if (error) throw error;
}

/**
 * Finalizar recepción
 */
export async function finalizarRecepcion(recepcionId: number): Promise<void> {
  const { error } = await supabase
    .from('recepciones_compra_erp')
    .update({
      estado: 'finalizada',
      updated_at: new Date().toISOString(),
    })
    .eq('id', recepcionId);

  if (error) throw error;
}