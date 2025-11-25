/**
 * 🧾 Tipos para el Sistema de Gestión de Facturas XML (CFDI)
 */

export interface Invoice {
  id: string;
  evento_id: string;
  company_id?: string;

  // Datos del XML CFDI
  uuid_cfdi: string;
  fecha_emision: string;
  rfc_emisor: string;
  nombre_emisor: string;
  rfc_receptor: string;
  nombre_receptor: string;

  // Montos
  subtotal: number;
  iva: number;
  total: number;
  moneda: string;
  tipo_cambio?: number;

  // Datos fiscales SAT
  forma_pago_sat?: string;
  metodo_pago_sat?: string;
  uso_cfdi?: string;
  tipo_comprobante?: string;
  serie?: string;
  folio?: string;
  lugar_expedicion?: string;
  numero_factura?: string;

  // Gestión de cobro
  dias_credito: number;
  fecha_compromiso: string;
  fecha_vencimiento: string;
  status_cobro: 'pendiente' | 'parcial' | 'cobrado' | 'vencido' | 'cancelado';
  status?: string;
  monto_cobrado: number;
  monto_pendiente: number;

  // Estado de facturación
  status_facturacion: 'facturado' | 'cancelado';

  // Notas y seguimiento
  notas_cobro?: string;

  // Archivo XML
  xml_url?: string;
  xml_nombre?: string;

  // Metadata
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  evento?: {
    id: string;
    clave_evento: string;
    nombre_proyecto: string;
    nombre?: string;
    cliente_nombre?: string;
    cliente_email?: string;
    cliente?: {
      id: string;
      razon_social: string;
      rfc: string;
      email?: string;
      email_contacto?: string;
    };
    responsable?: {
      id: string;
      nombre: string;
      email: string;
    };
  };
}

export interface InvoiceFormData {
  evento_id: string;
  dias_credito: number;
  notas_cobro?: string;
}

export interface InvoiceAlert {
  id: string;
  ingreso_id: string;
  tipo_alerta: 'previa' | 'compromiso' | 'vencida';
  fecha_envio: string;
  destinatarios: string[];
  estado: 'enviada' | 'error' | 'pendiente';
  error_mensaje?: string;
  
  // Relación con factura
  ingreso?: Invoice;
}

export interface AlertConfig {
  id: string;
  company_id: string;
  dias_antes_vencimiento: number;
  dias_antes_alerta: number;
  dias_despues_reenvio: number;
  emails_cc: string[];
  activo: boolean;
  enviar_previa: boolean;
  enviar_compromiso: boolean;
  enviar_vencida: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceStats {
  total_facturas: number;
  total_monto: number;
  pendientes: number;
  monto_pendiente: number;
  vencidas: number;
  monto_vencido: number;
  proximas_vencer: number; // En los próximos 7 días
  cobradas: number;
  monto_cobrado: number;
}

export interface InvoiceFilters {
  year?: number;
  month?: number;
  status_cobro?: string[];
  cliente?: string;
  evento?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  proximas_vencer?: boolean; // Facturas que vencen en 7 días
  vencidas?: boolean;
}

// Estados de cobro con sus colores y labels
export const COBRO_STATES = {
  pendiente: { label: 'Pendiente', color: 'warning', icon: '🟡' },
  parcial: { label: 'Parcial', color: 'info', icon: '🔵' },
  cobrado: { label: 'Cobrado', color: 'success', icon: '🟢' },
  vencido: { label: 'Vencido', color: 'danger', icon: '🔴' },
  cancelado: { label: 'Cancelado', color: 'default', icon: '⚫' }
} as const;

export const ALERT_TYPES = {
  previa: { label: 'Alerta Previa', description: 'X días antes del vencimiento' },
  compromiso: { label: 'Día de Compromiso', description: 'Fecha de vencimiento' },
  vencida: { label: 'Factura Vencida', description: 'Recordatorio periódico' }
} as const;
