// ============================================
// TIPOS DEL MÓDULO DE FACTURACIÓN CFDI 4.0
// ============================================

export interface ConfiguracionFacturacion {
  id: number;
  company_id: string;
  regimen_fiscal: string;
  certificado_cer: Uint8Array | null;
  certificado_key: Uint8Array | null;
  password_key: string | null;
  pac_proveedor: string | null; // 'finkok', 'sw', 'diverza', etc.
  pac_usuario: string | null;
  pac_password: string | null;
  serie_facturas: string | null;
  serie_notas_credito: string | null;
  serie_notas_debito: string | null;
  folio_actual_facturas: number;
  folio_actual_nc: number;
  folio_actual_nd: number;
  modo_pruebas: boolean;
  created_at: string;
  updated_at: string;
}

export interface Factura {
  id: number;
  company_id: string;
  uuid: string | null; // UUID del SAT después de timbrado
  serie: string;
  folio: string;
  tipo_comprobante: 'I' | 'E' | 'T' | 'N' | 'P'; // Ingreso, Egreso, Traslado, Nómina, Pago
  cliente_id: number;
  fecha_emision: string;
  forma_pago: string; // c_FormaPago del SAT
  metodo_pago: string; // PUE, PPD
  moneda: string;
  tipo_cambio: number;
  lugar_expedicion: string; // Código postal
  subtotal: number;
  descuento: number;
  total: number;
  total_impuestos_trasladados: number;
  total_impuestos_retenidos: number;
  observaciones: string | null;
  uso_cfdi: string; // c_UsoCFDI del SAT
  xml_url: string | null;
  pdf_url: string | null;
  xml_original: string | null; // XML generado antes de timbrar
  xml_timbrado: string | null; // XML con el timbre fiscal
  cadena_original: string | null;
  sello_digital: string | null;
  sello_sat: string | null;
  certificado_sat: string | null;
  fecha_timbrado: string | null;
  status: 'borrador' | 'pendiente' | 'timbrada' | 'cancelada' | 'error';
  motivo_cancelacion: string | null;
  uuid_sustitucion: string | null; // Para cancelaciones con sustitución
  error_mensaje: string | null;
  relacionadas: FacturaRelacion[] | null; // Relación con otras facturas
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  conceptos?: ConceptoFactura[];
  impuestos?: ImpuestoFactura[];
}

export interface ConceptoFactura {
  id: number;
  factura_id: number;
  clave_prod_serv: string; // c_ClaveProdServ del SAT
  clave_unidad: string; // c_ClaveUnidad del SAT
  cantidad: number;
  unidad: string;
  descripcion: string;
  valor_unitario: number;
  importe: number;
  descuento: number;
  objeto_imp: string; // '01', '02', '03' - Objeto de impuesto
  // Impuestos del concepto
  impuestos_trasladados?: ImpuestoConcepto[];
  impuestos_retenidos?: ImpuestoConcepto[];
  created_at: string;
}

export interface ImpuestoConcepto {
  id: number;
  concepto_id: number;
  tipo: 'traslado' | 'retencion';
  impuesto: string; // '001' ISR, '002' IVA, '003' IEPS
  tipo_factor: 'Tasa' | 'Cuota' | 'Exento';
  tasa_o_cuota: number;
  base: number;
  importe: number;
  created_at: string;
}

export interface ImpuestoFactura {
  id: number;
  factura_id: number;
  tipo: 'traslado' | 'retencion';
  impuesto: string; // '001' ISR, '002' IVA, '003' IEPS
  tipo_factor: 'Tasa' | 'Cuota' | 'Exento';
  tasa_o_cuota: number;
  base_total: number;
  importe_total: number;
  created_at: string;
}

export interface FacturaRelacion {
  tipo_relacion: string; // c_TipoRelacion del SAT
  uuid: string;
}

export interface Cliente {
  id: number;
  rfc: string;
  razon_social: string;
  regimen_fiscal: string;
  codigo_postal: string;
  email: string | null;
  uso_cfdi_default: string | null;
}

export interface NotaCredito extends Factura {
  factura_relacionada_id: number;
  motivo: string;
}

export interface ComplementoPago {
  id: number;
  company_id: string;
  uuid: string | null;
  serie: string;
  folio: string;
  cliente_id: number;
  fecha_pago: string;
  forma_pago: string;
  moneda: string;
  monto: number;
  num_operacion: string | null;
  rfc_emisor_cuenta_ordenante: string | null;
  nombre_banco_ordenante: string | null;
  cuenta_ordenante: string | null;
  rfc_emisor_cuenta_beneficiario: string | null;
  cuenta_beneficiario: string | null;
  xml_url: string | null;
  pdf_url: string | null;
  xml_timbrado: string | null;
  fecha_timbrado: string | null;
  status: 'borrador' | 'pendiente' | 'timbrado' | 'cancelado';
  created_at: string;
  updated_at: string;
  documentos_relacionados?: DocumentoRelacionadoPago[];
}

export interface DocumentoRelacionadoPago {
  id: number;
  complemento_pago_id: number;
  factura_id: number;
  uuid_documento: string;
  serie: string;
  folio: string;
  moneda: string;
  metodo_pago: string;
  num_parcialidad: number;
  importe_saldo_anterior: number;
  importe_pagado: number;
  importe_saldo_insoluto: number;
  created_at: string;
}

// Catálogos del SAT
export interface CatalogoSAT {
  codigo: string;
  descripcion: string;
  fecha_inicio_vigencia?: string;
  fecha_fin_vigencia?: string;
}

export interface FormaPago extends CatalogoSAT {}
export interface MetodoPago extends CatalogoSAT {}
export interface UsoCFDI extends CatalogoSAT {}
export interface RegimenFiscal extends CatalogoSAT {}
export interface ClaveProdServ extends CatalogoSAT {}
export interface ClaveUnidad extends CatalogoSAT {}
export interface TipoRelacion extends CatalogoSAT {}

// Tipos para formularios
export interface FacturaFormData extends Partial<Factura> {
  conceptos?: Partial<ConceptoFactura>[];
}

export interface ConfiguracionFormData extends Partial<ConfiguracionFacturacion> {}

// Respuesta del PAC
export interface TimbradoResponse {
  success: boolean;
  uuid?: string;
  xml_timbrado?: string;
  fecha_timbrado?: string;
  cadena_original?: string;
  sello_digital?: string;
  sello_sat?: string;
  certificado_sat?: string;
  error?: string;
}

export interface CancelacionResponse {
  success: boolean;
  acuse?: string;
  fecha_cancelacion?: string;
  error?: string;
}
