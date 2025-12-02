/**
 * Servicio de Centro de Mensajes del Portal
 */

import { supabase } from '../../../core/config/supabase';
import type { MensajePortal, NotificacionPortal, TipoMensaje } from '../types';

// ==========================================
// NOTIFICACIONES
// ==========================================

/**
 * Obtener notificaciones del usuario
 */
export async function fetchNotificaciones(
  usuarioId: string,
  soloNoLeidas = false
): Promise<NotificacionPortal[]> {
  let query = supabase
    .from('notificaciones_portal_erp')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (soloNoLeidas) {
    query = query.eq('leida', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Contar notificaciones no leídas
 */
export async function contarNotificacionesNoLeidas(usuarioId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notificaciones_portal_erp')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
    .eq('leida', false);

  if (error) throw error;
  return count || 0;
}

/**
 * Marcar notificación como leída
 */
export async function marcarNotificacionLeida(notificacionId: number): Promise<void> {
  const { error } = await supabase
    .from('notificaciones_portal_erp')
    .update({
      leida: true,
      fecha_leida: new Date().toISOString(),
    })
    .eq('id', notificacionId);

  if (error) throw error;
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function marcarTodasLeidas(usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from('notificaciones_portal_erp')
    .update({
      leida: true,
      fecha_leida: new Date().toISOString(),
    })
    .eq('usuario_id', usuarioId)
    .eq('leida', false);

  if (error) throw error;
}

/**
 * Eliminar notificación
 */
export async function eliminarNotificacion(notificacionId: number): Promise<void> {
  const { error } = await supabase
    .from('notificaciones_portal_erp')
    .delete()
    .eq('id', notificacionId);

  if (error) throw error;
}

// ==========================================
// CENTRO DE MENSAJES
// ==========================================

/**
 * Obtener mensajes del usuario (bandeja de entrada)
 */
export async function fetchMensajes(
  usuarioId: string,
  filtros?: {
    solicitudId?: number;
    soloNoLeidos?: boolean;
    soloImportantes?: boolean;
    archivados?: boolean;
  }
): Promise<MensajePortal[]> {
  let query = supabase
    .from('mensajes_portal_erp')
    .select(`
      *,
      remitente:usuarios_portal_erp!remitente_id(id, nombre_completo, email, avatar_url),
      destinatario:usuarios_portal_erp!destinatario_id(id, nombre_completo, email),
      destinatario_departamento:departamentos_erp(id, codigo, nombre),
      solicitud:solicitudes_compra_erp(id, numero_solicitud, estado)
    `)
    .or(`destinatario_id.eq.${usuarioId},remitente_id.eq.${usuarioId}`)
    .is('hilo_id', null) // Solo mensajes padre (no respuestas)
    .order('created_at', { ascending: false });

  if (filtros?.solicitudId) {
    query = query.eq('solicitud_id', filtros.solicitudId);
  }
  if (filtros?.soloNoLeidos) {
    query = query.eq('leido', false);
  }
  if (filtros?.soloImportantes) {
    query = query.eq('importante', true);
  }
  if (filtros?.archivados !== undefined) {
    query = query.eq('archivado', filtros.archivados);
  } else {
    query = query.eq('archivado', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Obtener mensajes de una solicitud específica
 */
export async function fetchMensajesSolicitud(solicitudId: number): Promise<MensajePortal[]> {
  const { data, error } = await supabase
    .from('mensajes_portal_erp')
    .select(`
      *,
      remitente:usuarios_portal_erp!remitente_id(id, nombre_completo, email, avatar_url, puesto),
      destinatario:usuarios_portal_erp!destinatario_id(id, nombre_completo, email),
      respuestas:mensajes_portal_erp!hilo_id(
        *,
        remitente:usuarios_portal_erp!remitente_id(id, nombre_completo, email, avatar_url)
      )
    `)
    .eq('solicitud_id', solicitudId)
    .is('hilo_id', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Obtener un mensaje con sus respuestas
 */
export async function fetchMensaje(mensajeId: number): Promise<MensajePortal | null> {
  const { data, error } = await supabase
    .from('mensajes_portal_erp')
    .select(`
      *,
      remitente:usuarios_portal_erp!remitente_id(*),
      destinatario:usuarios_portal_erp!destinatario_id(*),
      destinatario_departamento:departamentos_erp(*),
      solicitud:solicitudes_compra_erp(*, solicitante:usuarios_portal_erp!solicitante_id(*)),
      respuestas:mensajes_portal_erp!hilo_id(
        *,
        remitente:usuarios_portal_erp!remitente_id(id, nombre_completo, email, avatar_url)
      )
    `)
    .eq('id', mensajeId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Enviar nuevo mensaje
 */
export async function enviarMensaje(mensaje: {
  empresa_id: string;
  remitente_id: string;
  destinatario_id?: string;
  destinatario_departamento_id?: number;
  solicitud_id?: number;
  hilo_id?: number;
  asunto?: string;
  mensaje: string;
  tipo_mensaje?: TipoMensaje;
  importante?: boolean;
}): Promise<MensajePortal> {
  const { data, error } = await supabase
    .from('mensajes_portal_erp')
    .insert({
      empresa_id: mensaje.empresa_id,
      remitente_id: mensaje.remitente_id,
      destinatario_id: mensaje.destinatario_id,
      destinatario_departamento_id: mensaje.destinatario_departamento_id,
      solicitud_id: mensaje.solicitud_id,
      hilo_id: mensaje.hilo_id,
      asunto: mensaje.asunto,
      mensaje: mensaje.mensaje,
      tipo_mensaje: mensaje.tipo_mensaje || 'comentario',
      importante: mensaje.importante || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Responder a un mensaje
 */
export async function responderMensaje(
  hiloId: number,
  remitenteId: string,
  mensaje: string
): Promise<MensajePortal> {
  // Obtener info del mensaje padre
  const { data: mensajePadre, error: errorPadre } = await supabase
    .from('mensajes_portal_erp')
    .select('empresa_id, solicitud_id, destinatario_id, remitente_id')
    .eq('id', hiloId)
    .single();

  if (errorPadre || !mensajePadre) {
    throw new Error('Mensaje padre no encontrado');
  }

  // El destinatario de la respuesta es el remitente del mensaje padre
  const destinatarioId = mensajePadre.remitente_id === remitenteId 
    ? mensajePadre.destinatario_id 
    : mensajePadre.remitente_id;

  const { data, error } = await supabase
    .from('mensajes_portal_erp')
    .insert({
      empresa_id: mensajePadre.empresa_id,
      solicitud_id: mensajePadre.solicitud_id,
      hilo_id: hiloId,
      remitente_id: remitenteId,
      destinatario_id: destinatarioId,
      mensaje: mensaje,
      tipo_mensaje: 'respuesta',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Marcar mensaje como leído
 */
export async function marcarMensajeLeido(mensajeId: number): Promise<void> {
  const { error } = await supabase
    .from('mensajes_portal_erp')
    .update({
      leido: true,
      fecha_leido: new Date().toISOString(),
    })
    .eq('id', mensajeId);

  if (error) throw error;
}

/**
 * Marcar mensaje como importante
 */
export async function toggleImportante(mensajeId: number): Promise<void> {
  const { data: mensaje, error: errorGet } = await supabase
    .from('mensajes_portal_erp')
    .select('importante')
    .eq('id', mensajeId)
    .single();

  if (errorGet) throw errorGet;

  const { error } = await supabase
    .from('mensajes_portal_erp')
    .update({ importante: !mensaje.importante })
    .eq('id', mensajeId);

  if (error) throw error;
}

/**
 * Archivar mensaje
 */
export async function archivarMensaje(mensajeId: number): Promise<void> {
  const { error } = await supabase
    .from('mensajes_portal_erp')
    .update({ archivado: true })
    .eq('id', mensajeId);

  if (error) throw error;
}

/**
 * Desarchivar mensaje
 */
export async function desarchivarMensaje(mensajeId: number): Promise<void> {
  const { error } = await supabase
    .from('mensajes_portal_erp')
    .update({ archivado: false })
    .eq('id', mensajeId);

  if (error) throw error;
}

/**
 * Contar mensajes no leídos
 */
export async function contarMensajesNoLeidos(usuarioId: string): Promise<number> {
  const { count, error } = await supabase
    .from('mensajes_portal_erp')
    .select('*', { count: 'exact', head: true })
    .eq('destinatario_id', usuarioId)
    .eq('leido', false)
    .eq('archivado', false);

  if (error) throw error;
  return count || 0;
}

// Exportar como servicio
export const mensajesService = {
  // Notificaciones
  fetchNotificaciones,
  contarNotificacionesNoLeidas,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  eliminarNotificacion,
  
  // Mensajes
  fetchMensajes,
  fetchMensajesSolicitud,
  fetchMensaje,
  enviarMensaje,
  responderMensaje,
  marcarMensajeLeido,
  toggleImportante,
  archivarMensaje,
  desarchivarMensaje,
  contarMensajesNoLeidos,
};
