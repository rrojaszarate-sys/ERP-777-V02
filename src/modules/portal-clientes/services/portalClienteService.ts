/**
 * Servicios del Portal de Clientes - FASE 5.2
 * Consultas de facturas, eventos y documentos para clientes externos
 */
import { supabase } from '../../../core/config/supabase';
import type {
  FacturaCliente,
  EventoCliente,
  CotizacionCliente,
  PagoCliente,
  DocumentoCliente,
  ResumenCliente,
  NotificacionCliente
} from '../types';

// ============================================
// RESUMEN DEL CLIENTE
// ============================================

export const fetchResumenCliente = async (clienteId: number): Promise<ResumenCliente> => {
  // Obtener facturas
  const { data: facturas } = await supabase
    .from('fact_facturas')
    .select('id, total, status, fecha_emision, serie, folio')
    .eq('cliente_id', clienteId)
    .order('fecha_emision', { ascending: false });

  const facturasTimbradas = (facturas || []).filter(f => f.status === 'timbrada');
  const totalFacturado = facturasTimbradas.reduce((sum, f) => sum + f.total, 0);

  // Obtener pagos para calcular saldo
  const { data: pagos } = await supabase
    .from('fact_pagos')
    .select('monto')
    .eq('cliente_id', clienteId);

  const totalPagado = (pagos || []).reduce((sum, p) => sum + p.monto, 0);

  // Obtener eventos activos
  const { data: eventos } = await supabase
    .from('evt_eventos_erp')
    .select('id, clave_evento, nombre_proyecto, fecha_evento, estado_id')
    .eq('cliente_id', clienteId)
    .eq('activo', true)
    .in('estado_id', [1, 2, 3]); // Estados activos

  // Obtener cotizaciones pendientes
  const { data: cotizaciones } = await supabase
    .from('crm_cotizaciones')
    .select('id')
    .eq('cliente_id', clienteId)
    .eq('estado', 'pendiente');

  // Última factura
  const ultimaFactura = facturasTimbradas[0] || null;

  // Próximo evento
  const eventosOrdenados = (eventos || [])
    .filter(e => e.fecha_evento && new Date(e.fecha_evento) >= new Date())
    .sort((a, b) => new Date(a.fecha_evento!).getTime() - new Date(b.fecha_evento!).getTime());
  const proximoEvento = eventosOrdenados[0] || null;

  return {
    total_facturas: (facturas || []).length,
    facturas_pendientes: (facturas || []).filter(f => f.status === 'pendiente').length,
    total_facturado: totalFacturado,
    saldo_pendiente: totalFacturado - totalPagado,
    eventos_activos: (eventos || []).length,
    cotizaciones_pendientes: (cotizaciones || []).length,
    ultima_factura: ultimaFactura ? {
      id: ultimaFactura.id,
      serie: ultimaFactura.serie,
      folio: ultimaFactura.folio,
      fecha_emision: ultimaFactura.fecha_emision,
      total: ultimaFactura.total,
      status: ultimaFactura.status
    } as FacturaCliente : undefined,
    proximo_evento: proximoEvento ? {
      id: proximoEvento.id,
      clave_evento: proximoEvento.clave_evento,
      nombre_proyecto: proximoEvento.nombre_proyecto,
      fecha_evento: proximoEvento.fecha_evento,
      estado: 'activo'
    } as EventoCliente : undefined
  };
};

// ============================================
// FACTURAS
// ============================================

export const fetchFacturasCliente = async (
  clienteId: number,
  options?: {
    status?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    limit?: number;
  }
): Promise<FacturaCliente[]> => {
  let query = supabase
    .from('fact_facturas')
    .select(`
      id,
      uuid,
      serie,
      folio,
      tipo_comprobante,
      fecha_emision,
      fecha_timbrado,
      subtotal,
      total_impuestos_trasladados,
      total,
      moneda,
      status,
      xml_url,
      pdf_url
    `)
    .eq('cliente_id', clienteId);

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.fechaDesde) {
    query = query.gte('fecha_emision', options.fechaDesde);
  }

  if (options?.fechaHasta) {
    query = query.lte('fecha_emision', options.fechaHasta);
  }

  query = query.order('fecha_emision', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(f => ({
    id: f.id,
    uuid: f.uuid,
    serie: f.serie,
    folio: f.folio,
    tipo_comprobante: f.tipo_comprobante,
    fecha_emision: f.fecha_emision,
    fecha_timbrado: f.fecha_timbrado,
    subtotal: f.subtotal,
    iva: f.total_impuestos_trasladados,
    total: f.total,
    moneda: f.moneda,
    status: f.status,
    xml_url: f.xml_url,
    pdf_url: f.pdf_url
  }));
};

export const fetchFacturaDetalle = async (
  clienteId: number,
  facturaId: number
): Promise<FacturaCliente | null> => {
  const { data, error } = await supabase
    .from('fact_facturas')
    .select(`
      *,
      conceptos:fact_conceptos(*)
    `)
    .eq('id', facturaId)
    .eq('cliente_id', clienteId)
    .single();

  if (error) return null;
  return data as unknown as FacturaCliente;
};

// ============================================
// EVENTOS
// ============================================

export const fetchEventosCliente = async (
  clienteId: number,
  options?: {
    activos?: boolean;
    limit?: number;
  }
): Promise<EventoCliente[]> => {
  let query = supabase
    .from('evt_eventos_erp')
    .select(`
      id,
      clave_evento,
      nombre_proyecto,
      fecha_evento,
      lugar_evento,
      estado:evt_estados_erp(nombre),
      ganancia_estimada
    `)
    .eq('cliente_id', clienteId)
    .eq('activo', true);

  if (options?.activos) {
    query = query.in('estado_id', [1, 2, 3]);
  }

  query = query.order('fecha_evento', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(e => ({
    id: e.id,
    clave_evento: e.clave_evento,
    nombre_proyecto: e.nombre_proyecto,
    fecha_evento: e.fecha_evento,
    lugar: e.lugar_evento,
    estado: (e.estado as any)?.nombre || 'Desconocido',
    monto_cotizado: e.ganancia_estimada
  }));
};

export const fetchEventoDetalle = async (
  clienteId: number,
  eventoId: number
): Promise<EventoCliente | null> => {
  const { data, error } = await supabase
    .from('evt_eventos_erp')
    .select(`
      *,
      estado:evt_estados_erp(nombre)
    `)
    .eq('id', eventoId)
    .eq('cliente_id', clienteId)
    .single();

  if (error) return null;

  return {
    id: data.id,
    clave_evento: data.clave_evento,
    nombre_proyecto: data.nombre_proyecto,
    fecha_evento: data.fecha_evento,
    lugar: data.lugar_evento,
    estado: (data.estado as any)?.nombre || 'Desconocido',
    monto_cotizado: data.ganancia_estimada
  };
};

// ============================================
// COTIZACIONES
// ============================================

export const fetchCotizacionesCliente = async (
  clienteId: number,
  options?: {
    estado?: string;
    limit?: number;
  }
): Promise<CotizacionCliente[]> => {
  let query = supabase
    .from('crm_cotizaciones')
    .select('*')
    .eq('cliente_id', clienteId);

  if (options?.estado) {
    query = query.eq('estado', options.estado);
  }

  query = query.order('fecha', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(c => ({
    id: c.id,
    folio: c.folio,
    fecha: c.fecha,
    descripcion: c.descripcion,
    subtotal: c.subtotal,
    iva: c.iva,
    total: c.total,
    estado: c.estado,
    vigencia: c.vigencia
  }));
};

// ============================================
// PAGOS
// ============================================

export const fetchPagosCliente = async (
  clienteId: number,
  options?: {
    limit?: number;
  }
): Promise<PagoCliente[]> => {
  let query = supabase
    .from('fact_pagos')
    .select(`
      id,
      fecha_pago,
      monto,
      forma_pago,
      referencia,
      factura_id,
      factura:fact_facturas(serie, folio)
    `)
    .eq('cliente_id', clienteId)
    .order('fecha_pago', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(p => ({
    id: p.id,
    fecha_pago: p.fecha_pago,
    monto: p.monto,
    forma_pago: p.forma_pago,
    referencia: p.referencia,
    factura_id: p.factura_id,
    factura_folio: p.factura ? `${(p.factura as any).serie}${(p.factura as any).folio}` : undefined
  }));
};

// ============================================
// DOCUMENTOS
// ============================================

export const fetchDocumentosCliente = async (
  clienteId: number,
  options?: {
    eventoId?: number;
    tipo?: string;
  }
): Promise<DocumentoCliente[]> => {
  let query = supabase
    .from('crm_documentos_cliente')
    .select('*')
    .eq('cliente_id', clienteId);

  if (options?.eventoId) {
    query = query.eq('evento_id', options.eventoId);
  }

  if (options?.tipo) {
    query = query.eq('tipo', options.tipo);
  }

  query = query.order('fecha_subida', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(d => ({
    id: d.id,
    nombre: d.nombre,
    tipo: d.tipo,
    url: d.url,
    fecha_subida: d.fecha_subida,
    evento_id: d.evento_id
  }));
};

// ============================================
// NOTIFICACIONES
// ============================================

export const fetchNotificacionesCliente = async (
  clienteId: number,
  options?: {
    soloNoLeidas?: boolean;
    limit?: number;
  }
): Promise<NotificacionCliente[]> => {
  let query = supabase
    .from('notificaciones_cliente')
    .select('*')
    .eq('cliente_id', clienteId);

  if (options?.soloNoLeidas) {
    query = query.eq('leida', false);
  }

  query = query.order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(n => ({
    id: n.id,
    titulo: n.titulo,
    mensaje: n.mensaje,
    tipo: n.tipo,
    leida: n.leida,
    link: n.link,
    created_at: n.created_at
  }));
};

export const marcarNotificacionLeida = async (notificacionId: number): Promise<void> => {
  await supabase
    .from('notificaciones_cliente')
    .update({ leida: true })
    .eq('id', notificacionId);
};

// ============================================
// DESCARGAS
// ============================================

export const descargarFacturaXML = async (facturaId: number, clienteId: number): Promise<string | null> => {
  const { data, error } = await supabase
    .from('fact_facturas')
    .select('xml_timbrado, serie, folio')
    .eq('id', facturaId)
    .eq('cliente_id', clienteId)
    .single();

  if (error || !data?.xml_timbrado) return null;

  // Crear blob y descargar
  const blob = new Blob([data.xml_timbrado], { type: 'application/xml' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.serie}${data.folio}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return `${data.serie}${data.folio}.xml`;
};

export const descargarFacturaPDF = async (facturaId: number, clienteId: number): Promise<string | null> => {
  const { data, error } = await supabase
    .from('fact_facturas')
    .select('pdf_url, serie, folio')
    .eq('id', facturaId)
    .eq('cliente_id', clienteId)
    .single();

  if (error || !data?.pdf_url) return null;

  window.open(data.pdf_url, '_blank');
  return `${data.serie}${data.folio}.pdf`;
};

// Exportar servicio completo
export const portalClienteService = {
  fetchResumenCliente,
  fetchFacturasCliente,
  fetchFacturaDetalle,
  fetchEventosCliente,
  fetchEventoDetalle,
  fetchCotizacionesCliente,
  fetchPagosCliente,
  fetchDocumentosCliente,
  fetchNotificacionesCliente,
  marcarNotificacionLeida,
  descargarFacturaXML,
  descargarFacturaPDF
};
