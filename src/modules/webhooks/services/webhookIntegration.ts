/**
 * Integración de Webhooks con Módulos del ERP - FASE 5.3
 * Funciones helper para disparar webhooks desde otros módulos
 */
import { webhookService } from './webhookService';
import { pushNotificationService } from './pushNotificationService';
import type { WebhookEventType, NotificationPayload } from '../types';

// ============================================
// EVENTOS
// ============================================

export const webhookEventos = {
  /**
   * Dispara webhook cuando se crea un evento
   */
  async onCreated(companyId: string, evento: Record<string, any>, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'evento.created', evento, {
      company_id: companyId,
      user_id: userId,
      action: 'create'
    });
  },

  /**
   * Dispara webhook cuando se actualiza un evento
   */
  async onUpdated(companyId: string, evento: Record<string, any>, cambios: Record<string, any>, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'evento.updated', {
      evento,
      cambios
    }, {
      company_id: companyId,
      user_id: userId,
      action: 'update'
    });
  },

  /**
   * Dispara webhook cuando cambia el estado de un evento
   */
  async onStatusChanged(
    companyId: string,
    evento: Record<string, any>,
    estadoAnterior: string,
    estadoNuevo: string,
    userId?: string
  ) {
    return webhookService.triggerWebhooks(companyId, 'evento.status_changed', {
      evento,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoNuevo
    }, {
      company_id: companyId,
      user_id: userId,
      action: 'status_change'
    });
  },

  /**
   * Dispara webhook cuando se elimina un evento
   */
  async onDeleted(companyId: string, eventoId: number, claveEvento: string, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'evento.deleted', {
      id: eventoId,
      clave_evento: claveEvento
    }, {
      company_id: companyId,
      user_id: userId,
      action: 'delete'
    });
  }
};

// ============================================
// FACTURACIÓN
// ============================================

export const webhookFacturas = {
  /**
   * Dispara webhook cuando se crea una factura
   */
  async onCreated(companyId: string, factura: Record<string, any>, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'factura.created', factura, {
      company_id: companyId,
      user_id: userId,
      action: 'create'
    });
  },

  /**
   * Dispara webhook cuando se timbra una factura
   */
  async onTimbrada(companyId: string, factura: Record<string, any>, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'factura.timbrada', {
      id: factura.id,
      uuid: factura.uuid,
      serie: factura.serie,
      folio: factura.folio,
      total: factura.total,
      cliente_id: factura.cliente_id,
      fecha_timbrado: factura.fecha_timbrado
    }, {
      company_id: companyId,
      user_id: userId,
      action: 'timbrado'
    });
  },

  /**
   * Dispara webhook cuando se cancela una factura
   */
  async onCancelada(companyId: string, factura: Record<string, any>, motivo: string, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'factura.cancelada', {
      id: factura.id,
      uuid: factura.uuid,
      serie: factura.serie,
      folio: factura.folio,
      motivo
    }, {
      company_id: companyId,
      user_id: userId,
      action: 'cancel'
    });
  },

  /**
   * Dispara webhook cuando se marca una factura como pagada
   */
  async onPagada(companyId: string, factura: Record<string, any>, pago: Record<string, any>, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'factura.pagada', {
      factura: {
        id: factura.id,
        uuid: factura.uuid,
        serie: factura.serie,
        folio: factura.folio,
        total: factura.total
      },
      pago
    }, {
      company_id: companyId,
      user_id: userId,
      action: 'payment'
    });
  }
};

// ============================================
// CLIENTES
// ============================================

export const webhookClientes = {
  /**
   * Dispara webhook cuando se crea un cliente
   */
  async onCreated(companyId: string, cliente: Record<string, any>, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'cliente.created', {
      id: cliente.id,
      rfc: cliente.rfc,
      razon_social: cliente.razon_social,
      email: cliente.email
    }, {
      company_id: companyId,
      user_id: userId,
      action: 'create'
    });
  },

  /**
   * Dispara webhook cuando se actualiza un cliente
   */
  async onUpdated(companyId: string, cliente: Record<string, any>, cambios: Record<string, any>, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'cliente.updated', {
      cliente: {
        id: cliente.id,
        rfc: cliente.rfc,
        razon_social: cliente.razon_social
      },
      cambios
    }, {
      company_id: companyId,
      user_id: userId,
      action: 'update'
    });
  }
};

// ============================================
// INVENTARIO
// ============================================

export const webhookInventario = {
  /**
   * Dispara webhook cuando hay bajo stock
   */
  async onBajoStock(
    companyId: string,
    producto: Record<string, any>,
    stockActual: number,
    stockMinimo: number
  ) {
    return webhookService.triggerWebhooks(companyId, 'inventario.bajo_stock', {
      producto: {
        id: producto.id,
        clave: producto.clave,
        nombre: producto.nombre,
        unidad: producto.unidad
      },
      stock_actual: stockActual,
      stock_minimo: stockMinimo,
      deficit: stockMinimo - stockActual
    }, {
      company_id: companyId,
      action: 'low_stock_alert'
    });
  },

  /**
   * Dispara webhook cuando hay movimiento de inventario
   */
  async onMovimiento(
    companyId: string,
    movimiento: Record<string, any>,
    producto: Record<string, any>,
    userId?: string
  ) {
    return webhookService.triggerWebhooks(companyId, 'inventario.movimiento', {
      movimiento: {
        id: movimiento.id,
        tipo: movimiento.tipo,
        cantidad: movimiento.cantidad,
        referencia: movimiento.referencia
      },
      producto: {
        id: producto.id,
        clave: producto.clave,
        nombre: producto.nombre
      }
    }, {
      company_id: companyId,
      user_id: userId,
      action: movimiento.tipo
    });
  }
};

// ============================================
// SOLICITUDES
// ============================================

export const webhookSolicitudes = {
  /**
   * Dispara webhook cuando se crea una solicitud
   */
  async onCreated(companyId: string, solicitud: Record<string, any>, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'solicitud.created', solicitud, {
      company_id: companyId,
      user_id: userId,
      action: 'create'
    });
  },

  /**
   * Dispara webhook cuando se aprueba una solicitud
   */
  async onAprobada(companyId: string, solicitud: Record<string, any>, aprobadorId: string) {
    return webhookService.triggerWebhooks(companyId, 'solicitud.aprobada', {
      solicitud,
      aprobador_id: aprobadorId
    }, {
      company_id: companyId,
      user_id: aprobadorId,
      action: 'approve'
    });
  },

  /**
   * Dispara webhook cuando se rechaza una solicitud
   */
  async onRechazada(companyId: string, solicitud: Record<string, any>, motivo: string, rechazadorId: string) {
    return webhookService.triggerWebhooks(companyId, 'solicitud.rechazada', {
      solicitud,
      motivo,
      rechazador_id: rechazadorId
    }, {
      company_id: companyId,
      user_id: rechazadorId,
      action: 'reject'
    });
  }
};

// ============================================
// COTIZACIONES
// ============================================

export const webhookCotizaciones = {
  /**
   * Dispara webhook cuando se aprueba una cotización
   */
  async onAprobada(companyId: string, cotizacion: Record<string, any>, clienteId: number) {
    return webhookService.triggerWebhooks(companyId, 'cotizacion.aprobada', {
      cotizacion,
      cliente_id: clienteId
    }, {
      company_id: companyId,
      action: 'approve'
    });
  },

  /**
   * Dispara webhook cuando se rechaza una cotización
   */
  async onRechazada(companyId: string, cotizacion: Record<string, any>, motivo: string, clienteId: number) {
    return webhookService.triggerWebhooks(companyId, 'cotizacion.rechazada', {
      cotizacion,
      motivo,
      cliente_id: clienteId
    }, {
      company_id: companyId,
      action: 'reject'
    });
  }
};

// ============================================
// PAGOS
// ============================================

export const webhookPagos = {
  /**
   * Dispara webhook cuando se recibe un pago
   */
  async onRecibido(companyId: string, pago: Record<string, any>, userId?: string) {
    return webhookService.triggerWebhooks(companyId, 'pago.recibido', pago, {
      company_id: companyId,
      user_id: userId,
      action: 'payment_received'
    });
  }
};

// ============================================
// NOTIFICACIONES URGENTES
// ============================================

export const webhookNotificaciones = {
  /**
   * Dispara notificación urgente a webhook y push
   */
  async enviarUrgente(
    companyId: string,
    titulo: string,
    mensaje: string,
    data?: Record<string, any>,
    userIds?: string[]
  ) {
    // Disparar webhook
    const webhookResult = await webhookService.triggerWebhooks(companyId, 'notificacion.urgente', {
      titulo,
      mensaje,
      data,
      urgente: true
    }, {
      company_id: companyId,
      action: 'urgent_notification'
    });

    // Enviar push notifications si hay userIds
    if (userIds && userIds.length > 0) {
      const pushPayload: NotificationPayload = {
        title: titulo,
        body: mensaje,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'urgente',
        data,
        requireInteraction: true
      };

      await pushNotificationService.sendPushToUsers(userIds, pushPayload);
    }

    return webhookResult;
  }
};

// ============================================
// EXPORTAR TODO
// ============================================

export const webhookIntegration = {
  eventos: webhookEventos,
  facturas: webhookFacturas,
  clientes: webhookClientes,
  inventario: webhookInventario,
  solicitudes: webhookSolicitudes,
  cotizaciones: webhookCotizaciones,
  pagos: webhookPagos,
  notificaciones: webhookNotificaciones
};

export default webhookIntegration;
