/**
 * Tipos del Sistema de Webhooks - FASE 5.3
 */

// Eventos que disparan webhooks
export type WebhookEventType =
  | 'evento.created'
  | 'evento.updated'
  | 'evento.status_changed'
  | 'evento.deleted'
  | 'factura.created'
  | 'factura.timbrada'
  | 'factura.cancelada'
  | 'factura.pagada'
  | 'cliente.created'
  | 'cliente.updated'
  | 'inventario.bajo_stock'
  | 'inventario.movimiento'
  | 'solicitud.created'
  | 'solicitud.aprobada'
  | 'solicitud.rechazada'
  | 'pago.recibido'
  | 'cotizacion.aprobada'
  | 'cotizacion.rechazada'
  | 'notificacion.urgente';

export interface Webhook {
  id: number;
  company_id: string;
  nombre: string;
  descripcion?: string;
  url: string;
  eventos: WebhookEventType[];
  secret?: string;
  headers?: Record<string, string>;
  activo: boolean;
  reintentos_max: number;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: number;
  webhook_id: number;
  evento: WebhookEventType;
  payload: Record<string, any>;
  response_status?: number;
  response_body?: string;
  error?: string;
  intentos: number;
  success: boolean;
  duracion_ms?: number;
  created_at: string;
}

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
  metadata?: {
    company_id: string;
    user_id?: string;
    ip_address?: string;
    [key: string]: any;
  };
}

export interface WebhookFormData {
  nombre: string;
  descripcion?: string;
  url: string;
  eventos: WebhookEventType[];
  secret?: string;
  headers?: Record<string, string>;
  activo?: boolean;
  reintentos_max?: number;
  timeout_ms?: number;
}

// Notificaciones Push
export interface PushSubscription {
  id: number;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  activo: boolean;
  created_at: string;
}

export interface PushNotification {
  id: number;
  user_id: string;
  titulo: string;
  mensaje: string;
  icono?: string;
  url?: string;
  data?: Record<string, any>;
  enviada: boolean;
  leida: boolean;
  created_at: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: {
    action: string;
    title: string;
    icon?: string;
  }[];
  requireInteraction?: boolean;
}

// Catálogo de eventos
export const WEBHOOK_EVENTS: Record<WebhookEventType, { label: string; descripcion: string; modulo: string }> = {
  'evento.created': {
    label: 'Evento Creado',
    descripcion: 'Se dispara cuando se crea un nuevo evento',
    modulo: 'Eventos'
  },
  'evento.updated': {
    label: 'Evento Actualizado',
    descripcion: 'Se dispara cuando se actualiza un evento',
    modulo: 'Eventos'
  },
  'evento.status_changed': {
    label: 'Estado de Evento Cambiado',
    descripcion: 'Se dispara cuando cambia el estado de un evento',
    modulo: 'Eventos'
  },
  'evento.deleted': {
    label: 'Evento Eliminado',
    descripcion: 'Se dispara cuando se elimina un evento',
    modulo: 'Eventos'
  },
  'factura.created': {
    label: 'Factura Creada',
    descripcion: 'Se dispara cuando se crea una nueva factura',
    modulo: 'Facturación'
  },
  'factura.timbrada': {
    label: 'Factura Timbrada',
    descripcion: 'Se dispara cuando se timbra una factura exitosamente',
    modulo: 'Facturación'
  },
  'factura.cancelada': {
    label: 'Factura Cancelada',
    descripcion: 'Se dispara cuando se cancela una factura',
    modulo: 'Facturación'
  },
  'factura.pagada': {
    label: 'Factura Pagada',
    descripcion: 'Se dispara cuando una factura se marca como pagada',
    modulo: 'Facturación'
  },
  'cliente.created': {
    label: 'Cliente Creado',
    descripcion: 'Se dispara cuando se registra un nuevo cliente',
    modulo: 'CRM'
  },
  'cliente.updated': {
    label: 'Cliente Actualizado',
    descripcion: 'Se dispara cuando se actualiza un cliente',
    modulo: 'CRM'
  },
  'inventario.bajo_stock': {
    label: 'Bajo Stock',
    descripcion: 'Se dispara cuando un producto alcanza el stock mínimo',
    modulo: 'Inventario'
  },
  'inventario.movimiento': {
    label: 'Movimiento de Inventario',
    descripcion: 'Se dispara cuando hay entrada o salida de inventario',
    modulo: 'Inventario'
  },
  'solicitud.created': {
    label: 'Solicitud Creada',
    descripcion: 'Se dispara cuando se crea una nueva solicitud',
    modulo: 'Solicitudes'
  },
  'solicitud.aprobada': {
    label: 'Solicitud Aprobada',
    descripcion: 'Se dispara cuando se aprueba una solicitud',
    modulo: 'Solicitudes'
  },
  'solicitud.rechazada': {
    label: 'Solicitud Rechazada',
    descripcion: 'Se dispara cuando se rechaza una solicitud',
    modulo: 'Solicitudes'
  },
  'pago.recibido': {
    label: 'Pago Recibido',
    descripcion: 'Se dispara cuando se registra un pago',
    modulo: 'Pagos'
  },
  'cotizacion.aprobada': {
    label: 'Cotización Aprobada',
    descripcion: 'Se dispara cuando un cliente aprueba una cotización',
    modulo: 'Cotizaciones'
  },
  'cotizacion.rechazada': {
    label: 'Cotización Rechazada',
    descripcion: 'Se dispara cuando un cliente rechaza una cotización',
    modulo: 'Cotizaciones'
  },
  'notificacion.urgente': {
    label: 'Notificación Urgente',
    descripcion: 'Se dispara para notificaciones urgentes del sistema',
    modulo: 'Sistema'
  }
};
