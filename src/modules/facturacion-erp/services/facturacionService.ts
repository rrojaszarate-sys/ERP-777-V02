// ============================================
// SERVICIOS DEL MÓDULO DE FACTURACIÓN CFDI 4.0
// ============================================

import { supabase } from '../../../core/config/supabase';
import type {
  Factura,
  ConceptoFactura,
  ConfiguracionFacturacion,
  TimbradoResponse,
  CancelacionResponse,
  ComplementoPago
} from '../types';

// ============================================
// CONFIGURACIÓN DE FACTURACIÓN
// ============================================

export const fetchConfiguracion = async (companyId: string) => {
  const { data, error } = await supabase
    .from('fact_configuracion')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = No rows found
  return data as ConfiguracionFacturacion | null;
};

export const createConfiguracion = async (config: Partial<ConfiguracionFacturacion>) => {
  const { data, error } = await supabase
    .from('fact_configuracion')
    .insert([config])
    .select()
    .single();

  if (error) throw error;
  return data as ConfiguracionFacturacion;
};

export const updateConfiguracion = async (id: number, config: Partial<ConfiguracionFacturacion>) => {
  const { data, error } = await supabase
    .from('fact_configuracion')
    .update(config)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ConfiguracionFacturacion;
};

// ============================================
// FACTURAS
// ============================================

export const fetchFacturas = async (companyId: string, filters?: {
  serie?: string;
  status?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  cliente_id?: number;
}) => {
  let query = supabase
    .from('fact_facturas')
    .select(`
      *,
      cliente:crm_clientes(*)
    `)
    .eq('company_id', companyId);

  if (filters?.serie) {
    query = query.eq('serie', filters.serie);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.fecha_inicio) {
    query = query.gte('fecha_emision', filters.fecha_inicio);
  }

  if (filters?.fecha_fin) {
    query = query.lte('fecha_emision', filters.fecha_fin);
  }

  if (filters?.cliente_id) {
    query = query.eq('cliente_id', filters.cliente_id);
  }

  query = query.order('fecha_emision', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data as Factura[];
};

export const fetchFacturaById = async (id: number) => {
  const { data, error } = await supabase
    .from('fact_facturas')
    .select(`
      *,
      cliente:crm_clientes(*),
      conceptos:fact_conceptos(*),
      impuestos:fact_impuestos(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Factura;
};

export const createFactura = async (
  factura: Partial<Factura>,
  conceptos: Partial<ConceptoFactura>[]
) => {
  // Calcular totales
  let subtotal = 0;
  let descuento = 0;
  let total_impuestos_trasladados = 0;
  let total_impuestos_retenidos = 0;

  conceptos.forEach(concepto => {
    const importe = (concepto.cantidad || 0) * (concepto.valor_unitario || 0);
    subtotal += importe;
    descuento += concepto.descuento || 0;

    // Aquí se deberían calcular los impuestos por concepto
    // Por ahora es simplificado
    if (concepto.objeto_imp === '02') { // Sí objeto de impuesto
      const iva = importe * 0.16;
      total_impuestos_trasladados += iva;
    }
  });

  const total = subtotal - descuento + total_impuestos_trasladados - total_impuestos_retenidos;

  const facturaData = {
    ...factura,
    subtotal,
    descuento: descuento || 0,
    total_impuestos_trasladados,
    total_impuestos_retenidos,
    total
  };

  // Crear factura
  const { data: facturaCreada, error: facturaError } = await supabase
    .from('fact_facturas')
    .insert([facturaData])
    .select()
    .single();

  if (facturaError) throw facturaError;

  // Crear conceptos
  const conceptosConFacturaId = conceptos.map(c => ({
    ...c,
    factura_id: facturaCreada.id
  }));

  const { error: conceptosError } = await supabase
    .from('fact_conceptos')
    .insert(conceptosConFacturaId);

  if (conceptosError) throw conceptosError;

  return facturaCreada as Factura;
};

export const updateFactura = async (id: number, factura: Partial<Factura>) => {
  const { data, error } = await supabase
    .from('fact_facturas')
    .update(factura)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Factura;
};

export const deleteFactura = async (id: number) => {
  const { error } = await supabase
    .from('fact_facturas')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const generarFolio = async (companyId: string, serie: string) => {
  const { data: config } = await supabase
    .from('fact_configuracion')
    .select('folio_actual_facturas')
    .eq('company_id', companyId)
    .single();

  const folioActual = config?.folio_actual_facturas || 0;
  const nuevoFolio = folioActual + 1;

  // Actualizar folio en configuración
  await supabase
    .from('fact_configuracion')
    .update({ folio_actual_facturas: nuevoFolio })
    .eq('company_id', companyId);

  return `${serie}${nuevoFolio.toString().padStart(6, '0')}`;
};

// ============================================
// TIMBRADO Y CANCELACIÓN
// ============================================

export const timbrarFactura = async (facturaId: number): Promise<TimbradoResponse> => {
  // Esta función debería llamar a un edge function que se conecte con el PAC
  // Por ahora retornamos una estructura simulada

  try {
    const { data, error } = await supabase.rpc('timbrar_factura', {
      p_factura_id: facturaId
    });

    if (error) throw error;

    return {
      success: true,
      uuid: data.uuid,
      xml_timbrado: data.xml_timbrado,
      fecha_timbrado: data.fecha_timbrado,
      cadena_original: data.cadena_original,
      sello_digital: data.sello_digital,
      sello_sat: data.sello_sat,
      certificado_sat: data.certificado_sat
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al timbrar la factura'
    };
  }
};

export const cancelarFactura = async (
  facturaId: number,
  motivo: string,
  uuidSustitucion?: string
): Promise<CancelacionResponse> => {
  try {
    const { data, error } = await supabase.rpc('cancelar_factura', {
      p_factura_id: facturaId,
      p_motivo: motivo,
      p_uuid_sustitucion: uuidSustitucion
    });

    if (error) throw error;

    return {
      success: true,
      acuse: data.acuse,
      fecha_cancelacion: data.fecha_cancelacion
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al cancelar la factura'
    };
  }
};

// ============================================
// DESCARGAS
// ============================================

export const descargarXML = async (facturaId: number) => {
  const { data } = await supabase
    .from('fact_facturas')
    .select('xml_timbrado, serie, folio')
    .eq('id', facturaId)
    .single();

  if (!data?.xml_timbrado) {
    throw new Error('No hay XML timbrado disponible');
  }

  const blob = new Blob([data.xml_timbrado], { type: 'application/xml' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.serie}${data.folio}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const descargarPDF = async (facturaId: number) => {
  const { data } = await supabase
    .from('fact_facturas')
    .select('pdf_url')
    .eq('id', facturaId)
    .single();

  if (!data?.pdf_url) {
    throw new Error('No hay PDF disponible');
  }

  window.open(data.pdf_url, '_blank');
};

// ============================================
// COMPLEMENTOS DE PAGO
// ============================================

export const fetchComplementosPago = async (companyId: string) => {
  const { data, error } = await supabase
    .from('fact_complementos_pago')
    .select('*')
    .eq('company_id', companyId)
    .order('fecha_pago', { ascending: false });

  if (error) throw error;
  return data as ComplementoPago[];
};

export const createComplementoPago = async (complemento: Partial<ComplementoPago>) => {
  const { data, error } = await supabase
    .from('fact_complementos_pago')
    .insert([complemento])
    .select()
    .single();

  if (error) throw error;
  return data as ComplementoPago;
};

// Exportar todo como objeto
export const facturacionService = {
  // Configuración
  fetchConfiguracion,
  createConfiguracion,
  updateConfiguracion,
  // Facturas
  fetchFacturas,
  fetchFacturaById,
  createFactura,
  updateFactura,
  deleteFactura,
  generarFolio,
  // Timbrado
  timbrarFactura,
  cancelarFactura,
  // Descargas
  descargarXML,
  descargarPDF,
  // Complementos de Pago
  fetchComplementosPago,
  createComplementoPago
};
