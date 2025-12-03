/**
 * Tipos del Portal de Clientes - FASE 5.2
 */

export interface ClientePortal {
  id: number;
  rfc: string;
  razon_social: string;
  nombre_comercial?: string;
  email: string;
  telefono?: string;
  codigo_postal?: string;
  regimen_fiscal?: string;
  contacto_nombre?: string;
  contacto_email?: string;
  avatar_url?: string;
  token_acceso?: string;
  ultimo_acceso?: string;
  activo: boolean;
  created_at: string;
}

export interface FacturaCliente {
  id: number;
  uuid?: string;
  serie: string;
  folio: string;
  tipo_comprobante: string;
  fecha_emision: string;
  fecha_timbrado?: string;
  subtotal: number;
  iva: number;
  total: number;
  moneda: string;
  status: string;
  xml_url?: string;
  pdf_url?: string;
}

export interface EventoCliente {
  id: number;
  clave_evento: string;
  nombre_proyecto: string;
  fecha_evento?: string;
  lugar?: string;
  estado: string;
  monto_cotizado?: number;
  monto_facturado?: number;
  porcentaje_avance?: number;
}

export interface CotizacionCliente {
  id: number;
  folio: string;
  fecha: string;
  descripcion?: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: string;
  vigencia?: string;
}

export interface PagoCliente {
  id: number;
  fecha_pago: string;
  monto: number;
  forma_pago: string;
  referencia?: string;
  factura_id?: number;
  factura_folio?: string;
}

export interface DocumentoCliente {
  id: number;
  nombre: string;
  tipo: string;
  url: string;
  fecha_subida: string;
  evento_id?: number;
}

export interface NotificacionCliente {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  leida: boolean;
  link?: string;
  created_at: string;
}

export interface ResumenCliente {
  total_facturas: number;
  facturas_pendientes: number;
  total_facturado: number;
  saldo_pendiente: number;
  eventos_activos: number;
  cotizaciones_pendientes: number;
  ultima_factura?: FacturaCliente;
  proximo_evento?: EventoCliente;
}
