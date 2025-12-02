/**
 * Servicio de Solicitudes de Compra
 */

import { supabase } from '../../../core/config/supabase';
import type { 
  SolicitudCompra, 
  SolicitudCompraCreate, 
  ItemSolicitud, 
  ItemSolicitudCreate,
  EstadoSolicitud,
  Aprobacion,
  HistorialSolicitud,
  EstadisticasSolicitudes,
} from '../types';

/**
 * Obtener solicitudes del usuario
 */
export async function fetchMisSolicitudes(
  usuarioId: string,
  filtros?: {
    estado?: EstadoSolicitud;
    desde?: string;
    hasta?: string;
  }
): Promise<SolicitudCompra[]> {
  let query = supabase
    .from('solicitudes_compra_erp')
    .select(`
      *,
      departamento:departamentos_erp(id, nombre, codigo),
      proyecto:proyectos_erp(id, nombre),
      evento:eventos(id, nombre_proyecto),
      items:solicitudes_compra_items_erp(count),
      aprobaciones:solicitudes_aprobaciones_erp(
        id, nivel, estado, aprobador_id, fecha_accion,
        aprobador:usuarios_portal_erp(nombre_completo, avatar_url)
      )
    `)
    .eq('solicitante_id', usuarioId)
    .order('created_at', { ascending: false });

  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado);
  }
  if (filtros?.desde) {
    query = query.gte('created_at', filtros.desde);
  }
  if (filtros?.hasta) {
    query = query.lte('created_at', filtros.hasta);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Obtener solicitud con todos los detalles
 */
export async function fetchSolicitud(solicitudId: number): Promise<SolicitudCompra | null> {
  const { data, error } = await supabase
    .from('solicitudes_compra_erp')
    .select(`
      *,
      solicitante:usuarios_portal_erp!solicitante_id(
        id, nombre_completo, email, avatar_url, puesto,
        departamento:departamentos_erp(nombre)
      ),
      departamento:departamentos_erp(id, nombre, codigo, centro_costos),
      proyecto:proyectos_erp(id, nombre, codigo),
      evento:eventos(id, nombre_proyecto, fecha_evento),
      items:solicitudes_compra_items_erp(*),
      aprobaciones:solicitudes_aprobaciones_erp(
        *,
        aprobador:usuarios_portal_erp(id, nombre_completo, email, avatar_url)
      ),
      historial:solicitudes_historial_erp(
        *,
        usuario:usuarios_portal_erp(id, nombre_completo, avatar_url)
      ),
      adjuntos:solicitudes_adjuntos_erp(*)
    `)
    .eq('id', solicitudId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Crear nueva solicitud
 */
export async function crearSolicitud(
  empresaId: string,
  solicitanteId: string,
  solicitud: SolicitudCompraCreate
): Promise<SolicitudCompra> {
  // Generar número de solicitud
  const { data: numeroData } = await supabase
    .rpc('generar_numero_solicitud', { p_empresa_id: empresaId });
  
  const numero_solicitud = numeroData || `SC-${Date.now()}`;

  // Calcular monto estimado
  const monto_estimado = solicitud.items.reduce((sum, item) => {
    return sum + (item.cantidad * (item.precio_referencia || 0));
  }, 0);

  // Crear solicitud
  const { data: solicitudCreada, error } = await supabase
    .from('solicitudes_compra_erp')
    .insert({
      empresa_id: empresaId,
      numero_solicitud,
      solicitante_id: solicitanteId,
      departamento_id: solicitud.departamento_id,
      tipo_destino: solicitud.tipo_destino,
      proyecto_id: solicitud.proyecto_id,
      evento_id: solicitud.evento_id,
      objetivo_descripcion: solicitud.objetivo_descripcion,
      prioridad: solicitud.prioridad,
      fecha_requerida: solicitud.fecha_requerida,
      justificacion: solicitud.justificacion,
      impacto_sin_compra: solicitud.impacto_sin_compra,
      tiene_presupuesto: solicitud.tiene_presupuesto,
      partida_presupuestal: solicitud.partida_presupuestal,
      monto_estimado,
      estado: 'borrador',
    })
    .select()
    .single();

  if (error) throw error;

  // Insertar items
  if (solicitud.items.length > 0) {
    const items = solicitud.items.map((item, index) => ({
      solicitud_id: solicitudCreada.id,
      descripcion: item.descripcion,
      especificaciones: item.especificaciones,
      cantidad: item.cantidad,
      unidad_medida: item.unidad_medida || 'PZA',
      precio_referencia: item.precio_referencia,
      subtotal_estimado: item.cantidad * (item.precio_referencia || 0),
      proveedor_sugerido_nombre: item.proveedor_sugerido_nombre,
      url_referencia: item.url_referencia,
      imagen_url: item.imagen_url,
      notas: item.notas,
      orden: index,
    }));

    const { error: errorItems } = await supabase
      .from('solicitudes_compra_items_erp')
      .insert(items);

    if (errorItems) throw errorItems;
  }

  // Registrar en historial
  await registrarHistorial(
    solicitudCreada.id,
    solicitanteId,
    'creacion',
    'Solicitud creada',
    null,
    'borrador'
  );

  return solicitudCreada;
}

/**
 * Actualizar solicitud (solo borradores)
 */
export async function actualizarSolicitud(
  solicitudId: number,
  datos: Partial<SolicitudCompraCreate>
): Promise<void> {
  const { error } = await supabase
    .from('solicitudes_compra_erp')
    .update({
      tipo_destino: datos.tipo_destino,
      proyecto_id: datos.proyecto_id,
      evento_id: datos.evento_id,
      objetivo_descripcion: datos.objetivo_descripcion,
      prioridad: datos.prioridad,
      fecha_requerida: datos.fecha_requerida,
      justificacion: datos.justificacion,
      impacto_sin_compra: datos.impacto_sin_compra,
      tiene_presupuesto: datos.tiene_presupuesto,
      partida_presupuestal: datos.partida_presupuestal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', solicitudId)
    .eq('estado', 'borrador');

  if (error) throw error;
}

/**
 * Agregar item a solicitud
 */
export async function agregarItem(
  solicitudId: number,
  item: ItemSolicitudCreate
): Promise<ItemSolicitud> {
  // Obtener el orden máximo actual
  const { data: maxOrden } = await supabase
    .from('solicitudes_compra_items_erp')
    .select('orden')
    .eq('solicitud_id', solicitudId)
    .order('orden', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('solicitudes_compra_items_erp')
    .insert({
      solicitud_id: solicitudId,
      descripcion: item.descripcion,
      especificaciones: item.especificaciones,
      cantidad: item.cantidad,
      unidad_medida: item.unidad_medida || 'PZA',
      precio_referencia: item.precio_referencia,
      subtotal_estimado: item.cantidad * (item.precio_referencia || 0),
      proveedor_sugerido_nombre: item.proveedor_sugerido_nombre,
      url_referencia: item.url_referencia,
      imagen_url: item.imagen_url,
      notas: item.notas,
      orden: (maxOrden?.orden || 0) + 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Eliminar item de solicitud
 */
export async function eliminarItem(itemId: number): Promise<void> {
  const { error } = await supabase
    .from('solicitudes_compra_items_erp')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Enviar solicitud para aprobación
 */
export async function enviarSolicitud(
  solicitudId: number,
  usuarioId: string
): Promise<void> {
  // Obtener la solicitud para verificar nivel de aprobación
  const { data: solicitud, error: errorSolicitud } = await supabase
    .from('solicitudes_compra_erp')
    .select('monto_estimado, nivel_aprobacion_requerido, empresa_id')
    .eq('id', solicitudId)
    .single();

  if (errorSolicitud) throw errorSolicitud;

  // Actualizar estado
  const { error } = await supabase
    .from('solicitudes_compra_erp')
    .update({
      estado: 'enviada',
      enviada_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', solicitudId)
    .eq('estado', 'borrador');

  if (error) throw error;

  // Crear registro de aprobación pendiente
  await supabase
    .from('solicitudes_aprobaciones_erp')
    .insert({
      solicitud_id: solicitudId,
      nivel: solicitud.nivel_aprobacion_requerido,
      estado: 'pendiente',
    });

  // Registrar historial
  await registrarHistorial(
    solicitudId,
    usuarioId,
    'envio',
    'Solicitud enviada para aprobación',
    'borrador',
    'enviada'
  );
}

/**
 * Aprobar solicitud
 */
export async function aprobarSolicitud(
  solicitudId: number,
  aprobadorId: string,
  comentarios?: string
): Promise<void> {
  // Actualizar aprobación
  const { error: errorAprobacion } = await supabase
    .from('solicitudes_aprobaciones_erp')
    .update({
      aprobador_id: aprobadorId,
      estado: 'aprobada',
      fecha_accion: new Date().toISOString(),
      comentarios,
    })
    .eq('solicitud_id', solicitudId)
    .eq('estado', 'pendiente');

  if (errorAprobacion) throw errorAprobacion;

  // Actualizar solicitud
  const { error } = await supabase
    .from('solicitudes_compra_erp')
    .update({
      estado: 'aprobada',
      updated_at: new Date().toISOString(),
    })
    .eq('id', solicitudId);

  if (error) throw error;

  // Registrar historial
  await registrarHistorial(
    solicitudId,
    aprobadorId,
    'aprobacion',
    `Solicitud aprobada${comentarios ? ': ' + comentarios : ''}`,
    'enviada',
    'aprobada'
  );
}

/**
 * Rechazar solicitud
 */
export async function rechazarSolicitud(
  solicitudId: number,
  aprobadorId: string,
  motivo: string
): Promise<void> {
  // Actualizar aprobación
  const { error: errorAprobacion } = await supabase
    .from('solicitudes_aprobaciones_erp')
    .update({
      aprobador_id: aprobadorId,
      estado: 'rechazada',
      fecha_accion: new Date().toISOString(),
      comentarios: motivo,
    })
    .eq('solicitud_id', solicitudId)
    .eq('estado', 'pendiente');

  if (errorAprobacion) throw errorAprobacion;

  // Actualizar solicitud
  const { error } = await supabase
    .from('solicitudes_compra_erp')
    .update({
      estado: 'rechazada',
      motivo_rechazo: motivo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', solicitudId);

  if (error) throw error;

  // Registrar historial
  await registrarHistorial(
    solicitudId,
    aprobadorId,
    'rechazo',
    `Solicitud rechazada: ${motivo}`,
    'enviada',
    'rechazada'
  );
}

/**
 * Cancelar solicitud
 */
export async function cancelarSolicitud(
  solicitudId: number,
  usuarioId: string,
  motivo: string
): Promise<void> {
  const { error } = await supabase
    .from('solicitudes_compra_erp')
    .update({
      estado: 'cancelada',
      motivo_rechazo: motivo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', solicitudId)
    .in('estado', ['borrador', 'enviada']);

  if (error) throw error;

  await registrarHistorial(
    solicitudId,
    usuarioId,
    'cancelacion',
    `Solicitud cancelada: ${motivo}`,
    null,
    'cancelada'
  );
}

/**
 * Registrar en historial
 */
async function registrarHistorial(
  solicitudId: number,
  usuarioId: string,
  tipoAccion: string,
  descripcion: string,
  estadoAnterior: string | null,
  estadoNuevo: string
): Promise<void> {
  await supabase
    .from('solicitudes_historial_erp')
    .insert({
      solicitud_id: solicitudId,
      usuario_id: usuarioId,
      tipo_accion: tipoAccion,
      descripcion,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoNuevo,
    });
}

/**
 * Obtener solicitudes pendientes de aprobar
 */
export async function fetchSolicitudesPendientesAprobacion(
  empresaId: string,
  aprobadorId: string
): Promise<SolicitudCompra[]> {
  const { data, error } = await supabase
    .from('solicitudes_compra_erp')
    .select(`
      *,
      solicitante:usuarios_portal_erp!solicitante_id(
        id, nombre_completo, email, avatar_url, puesto,
        departamento:departamentos_erp(nombre)
      ),
      departamento:departamentos_erp(id, nombre),
      items:solicitudes_compra_items_erp(count)
    `)
    .eq('empresa_id', empresaId)
    .in('estado', ['enviada', 'en_revision'])
    .order('prioridad', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Obtener estadísticas
 */
export async function getEstadisticasSolicitudes(
  usuarioId: string
): Promise<EstadisticasSolicitudes> {
  const { data, error } = await supabase
    .from('solicitudes_compra_erp')
    .select('estado, monto_estimado, monto_aprobado')
    .eq('solicitante_id', usuarioId);

  if (error) throw error;

  const stats: EstadisticasSolicitudes = {
    total: data?.length || 0,
    borradores: 0,
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
    completadas: 0,
    monto_total_pendiente: 0,
    monto_total_aprobado: 0,
  };

  data?.forEach(s => {
    if (s.estado === 'borrador') stats.borradores++;
    else if (['enviada', 'en_revision'].includes(s.estado)) {
      stats.pendientes++;
      stats.monto_total_pendiente += s.monto_estimado || 0;
    }
    else if (s.estado === 'aprobada') stats.aprobadas++;
    else if (s.estado === 'rechazada') stats.rechazadas++;
    else if (['recibida', 'cerrada'].includes(s.estado)) {
      stats.completadas++;
      stats.monto_total_aprobado += s.monto_aprobado || s.monto_estimado || 0;
    }
  });

  return stats;
}

// Exportar como objeto de servicio
export const solicitudesService = {
  fetchMisSolicitudes,
  fetchSolicitud,
  createSolicitud,
  updateSolicitud,
  deleteSolicitud,
  enviarSolicitud,
  cancelarSolicitud,
  aprobarSolicitud,
  rechazarSolicitud,
  addItem,
  updateItem,
  deleteItem,
  agregarComentario,
  getHistorial,
  getEstadisticasUsuario,
};
