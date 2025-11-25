/**
 * SERVICIO DE COTIZACIONES
 * Funciones para gestión de cotizaciones y partidas
 */

import { supabase } from '../../../core/config/supabase';
import type { Cotizacion, PartidaCotizacion, CotizacionConPartidas } from '../types';

// ============================================================================
// COTIZACIONES
// ============================================================================

export const fetchCotizaciones = async (
  companyId: string,
  filters?: {
    status?: string;
    cliente_id?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
  }
) => {
  let query = supabase
    .from('cot_cotizaciones')
    .select(`
      *,
      cliente:crm_clientes(*),
      contacto:crm_contactos(*)
    `)
    .eq('company_id', companyId)
    .order('fecha', { ascending: false })
    .order('folio', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.cliente_id) {
    query = query.eq('cliente_id', filters.cliente_id);
  }

  if (filters?.fecha_inicio) {
    query = query.gte('fecha', filters.fecha_inicio);
  }

  if (filters?.fecha_fin) {
    query = query.lte('fecha', filters.fecha_fin);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as any[];
};

export const fetchCotizacionById = async (id: number) => {
  const { data: cotizacion, error: cotizacionError } = await supabase
    .from('cot_cotizaciones')
    .select(`
      *,
      cliente:crm_clientes(*),
      contacto:crm_contactos(*)
    `)
    .eq('id', id)
    .single();

  if (cotizacionError) throw cotizacionError;

  const { data: partidas, error: partidasError } = await supabase
    .from('cot_partidas')
    .select('*')
    .eq('cotizacion_id', id)
    .order('orden');

  if (partidasError) throw partidasError;

  return {
    ...cotizacion,
    partidas
  } as CotizacionConPartidas;
};

export const generarFolio = async (companyId: string) => {
  // Obtener el último folio
  const { data, error } = await supabase
    .from('cot_cotizaciones')
    .select('folio')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  const year = new Date().getFullYear();
  const prefix = `COT-${year}-`;

  if (!data || data.length === 0) {
    return `${prefix}0001`;
  }

  // Extraer el número del último folio
  const ultimoFolio = data[0].folio;
  const match = ultimoFolio.match(/COT-\d{4}-(\d+)/);

  if (match) {
    const numero = parseInt(match[1]) + 1;
    return `${prefix}${numero.toString().padStart(4, '0')}`;
  }

  return `${prefix}0001`;
};

export const createCotizacion = async (
  cotizacionData: Partial<Cotizacion>,
  partidas: Partial<PartidaCotizacion>[]
) => {
  // Validar que haya al menos una partida
  if (!partidas || partidas.length === 0) {
    throw new Error('La cotización debe tener al menos una partida');
  }

  // Calcular totales
  const subtotal = partidas.reduce((sum, p) => sum + (p.subtotal || 0), 0);
  const impuestos = partidas.reduce((sum, p) => sum + (p.monto_iva || 0), 0);
  const total = subtotal + impuestos - (cotizacionData.descuento_monto || 0);

  // Crear cotización
  const { data: cotizacion, error: cotizacionError } = await supabase
    .from('cot_cotizaciones')
    .insert([{
      ...cotizacionData,
      subtotal,
      impuestos,
      total
    }])
    .select()
    .single();

  if (cotizacionError) throw cotizacionError;

  // Crear partidas
  const partidasConCotizacion = partidas.map((p, index) => ({
    ...p,
    cotizacion_id: cotizacion.id,
    orden: index + 1
  }));

  const { data: partidasCreadas, error: partidasError } = await supabase
    .from('cot_partidas')
    .insert(partidasConCotizacion)
    .select();

  if (partidasError) throw partidasError;

  return {
    ...cotizacion,
    partidas: partidasCreadas
  } as CotizacionConPartidas;
};

export const updateCotizacion = async (
  id: number,
  updates: Partial<Cotizacion>
) => {
  const { data, error } = await supabase
    .from('cot_cotizaciones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Cotizacion;
};

export const updatePartidas = async (
  cotizacionId: number,
  partidas: Partial<PartidaCotizacion>[]
) => {
  // Eliminar partidas existentes
  await supabase
    .from('cot_partidas')
    .delete()
    .eq('cotizacion_id', cotizacionId);

  // Insertar nuevas partidas
  const partidasConOrden = partidas.map((p, index) => ({
    ...p,
    cotizacion_id: cotizacionId,
    orden: index + 1
  }));

  const { data, error } = await supabase
    .from('cot_partidas')
    .insert(partidasConOrden)
    .select();

  if (error) throw error;
  return data as PartidaCotizacion[];
};

export const cambiarStatusCotizacion = async (
  id: number,
  nuevoStatus: string,
  userId?: string
) => {
  const updates: any = {
    status: nuevoStatus,
    updated_at: new Date().toISOString()
  };

  // Si se aprueba, registrar quién y cuándo
  if (nuevoStatus === 'aprobada') {
    updates.aprobado_por = userId;
    updates.fecha_aprobacion = new Date().toISOString();
  }

  return updateCotizacion(id, updates);
};

export const enviarCotizacion = async (id: number) => {
  return cambiarStatusCotizacion(id, 'enviada');
};

export const aprobarCotizacion = async (id: number, userId: string) => {
  return cambiarStatusCotizacion(id, 'aprobada', userId);
};

export const rechazarCotizacion = async (id: number) => {
  return cambiarStatusCotizacion(id, 'rechazada');
};

export const convertirCotizacionAEvento = async (
  cotizacionId: number,
  eventoId: number
) => {
  const updates: any = {
    status: 'convertida',
    convertida_a_evento: eventoId,
    fecha_conversion: new Date().toISOString()
  };

  return updateCotizacion(cotizacionId, updates);
};

export const duplicarCotizacion = async (id: number, userId: string, companyId: string) => {
  // Obtener cotización original con partidas
  const cotizacionOriginal = await fetchCotizacionById(id);

  // Generar nuevo folio
  const nuevoFolio = await generarFolio(companyId);

  // Crear nueva cotización sin id y con nuevo folio
  const { partidas, ...cotizacionData } = cotizacionOriginal;

  const nuevaCotizacion: Partial<Cotizacion> = {
    ...cotizacionData,
    folio: nuevoFolio,
    status: 'borrador',
    fecha: new Date().toISOString().split('T')[0],
    elaborado_por: userId,
    aprobado_por: null,
    fecha_aprobacion: null,
    convertida_a_evento: null,
    fecha_conversion: null
  };

  // Crear nueva cotización con partidas
  const nuevasPartidas = partidas.map(({ id, cotizacion_id, created_at, ...partida }) => partida);

  return createCotizacion(nuevaCotizacion, nuevasPartidas);
};

// ============================================================================
// CÁLCULOS Y UTILIDADES
// ============================================================================

export const calcularTotalesPartida = (
  cantidad: number,
  precioUnitario: number,
  descuentoPorcentaje: number = 0,
  aplicaIva: boolean = true,
  tasaIva: number = 16
) => {
  const descuentoMonto = (precioUnitario * cantidad * descuentoPorcentaje) / 100;
  const subtotal = (precioUnitario * cantidad) - descuentoMonto;
  const montoIva = aplicaIva ? (subtotal * tasaIva) / 100 : 0;
  const total = subtotal + montoIva;

  return {
    descuento_monto: descuentoMonto,
    subtotal,
    monto_iva: montoIva,
    total
  };
};

export const calcularTotalesCotizacion = (partidas: PartidaCotizacion[]) => {
  const subtotal = partidas.reduce((sum, p) => sum + (p.subtotal || 0), 0);
  const impuestos = partidas.reduce((sum, p) => sum + (p.monto_iva || 0), 0);
  const total = subtotal + impuestos;

  return { subtotal, impuestos, total };
};
