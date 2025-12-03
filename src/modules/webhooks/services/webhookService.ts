/**
 * Servicio de Webhooks - FASE 5.3
 * Gestión y disparo de webhooks
 */
import { supabase } from '../../../core/config/supabase';
import type {
  Webhook,
  WebhookLog,
  WebhookPayload,
  WebhookEventType,
  WebhookFormData
} from '../types';
import crypto from 'crypto';

// ============================================
// GESTIÓN DE WEBHOOKS
// ============================================

export const fetchWebhooks = async (companyId: string): Promise<Webhook[]> => {
  const { data, error } = await supabase
    .from('webhooks_erp')
    .select('*')
    .eq('company_id', companyId)
    .order('nombre');

  if (error) throw error;
  return data as Webhook[];
};

export const fetchWebhookById = async (id: number): Promise<Webhook | null> => {
  const { data, error } = await supabase
    .from('webhooks_erp')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Webhook;
};

export const createWebhook = async (
  webhook: WebhookFormData,
  companyId: string
): Promise<Webhook> => {
  // Generar secret si no se proporciona
  const secret = webhook.secret || generateSecret();

  const { data, error } = await supabase
    .from('webhooks_erp')
    .insert([{
      ...webhook,
      company_id: companyId,
      secret,
      activo: webhook.activo ?? true,
      reintentos_max: webhook.reintentos_max ?? 3,
      timeout_ms: webhook.timeout_ms ?? 30000
    }])
    .select()
    .single();

  if (error) throw error;
  return data as Webhook;
};

export const updateWebhook = async (
  id: number,
  webhook: Partial<WebhookFormData>
): Promise<Webhook> => {
  const { data, error } = await supabase
    .from('webhooks_erp')
    .update({
      ...webhook,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Webhook;
};

export const deleteWebhook = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('webhooks_erp')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const toggleWebhookActivo = async (
  id: number,
  activo: boolean
): Promise<Webhook> => {
  return updateWebhook(id, { activo });
};

// ============================================
// DISPARO DE WEBHOOKS
// ============================================

/**
 * Genera firma HMAC para el payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Genera un secret aleatorio
 */
function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Dispara todos los webhooks registrados para un evento
 */
export const triggerWebhooks = async (
  companyId: string,
  event: WebhookEventType,
  data: Record<string, any>,
  metadata?: Record<string, any>
): Promise<{ success: number; failed: number }> => {
  // Obtener webhooks activos para este evento
  const { data: webhooks, error } = await supabase
    .from('webhooks_erp')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .contains('eventos', [event]);

  if (error) {
    console.error('Error fetching webhooks:', error);
    return { success: 0, failed: 0 };
  }

  if (!webhooks || webhooks.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  // Disparar cada webhook
  const promises = webhooks.map(async (webhook) => {
    const result = await sendWebhook(webhook as Webhook, event, data, metadata);
    if (result.success) {
      success++;
    } else {
      failed++;
    }
  });

  await Promise.all(promises);

  return { success, failed };
};

/**
 * Envía un webhook individual
 */
export const sendWebhook = async (
  webhook: Webhook,
  event: WebhookEventType,
  data: Record<string, any>,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> => {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    metadata
  };

  const payloadString = JSON.stringify(payload);
  const startTime = Date.now();

  // Preparar headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'MADE-ERP-Webhook/1.0',
    'X-Webhook-Event': event,
    'X-Webhook-Timestamp': payload.timestamp,
    ...webhook.headers
  };

  // Agregar firma si hay secret
  if (webhook.secret) {
    headers['X-Webhook-Signature'] = `sha256=${generateSignature(payloadString, webhook.secret)}`;
  }

  let success = false;
  let responseStatus: number | undefined;
  let responseBody: string | undefined;
  let errorMessage: string | undefined;
  let intentos = 0;

  // Intentar enviar con reintentos
  while (intentos < webhook.reintentos_max && !success) {
    intentos++;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout_ms);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      responseStatus = response.status;
      responseBody = await response.text();

      if (response.ok) {
        success = true;
      } else {
        errorMessage = `HTTP ${response.status}: ${responseBody.substring(0, 500)}`;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        errorMessage = `Timeout después de ${webhook.timeout_ms}ms`;
      } else {
        errorMessage = err.message || 'Error desconocido';
      }
    }

    // Esperar antes de reintentar (backoff exponencial)
    if (!success && intentos < webhook.reintentos_max) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, intentos) * 1000));
    }
  }

  const duracionMs = Date.now() - startTime;

  // Registrar en log
  await supabase
    .from('webhooks_logs_erp')
    .insert([{
      webhook_id: webhook.id,
      evento: event,
      payload,
      response_status: responseStatus,
      response_body: responseBody?.substring(0, 5000),
      error: errorMessage,
      intentos,
      success,
      duracion_ms: duracionMs
    }]);

  return { success, error: errorMessage };
};

/**
 * Prueba un webhook enviando un evento de prueba
 */
export const testWebhook = async (
  webhookId: number
): Promise<{ success: boolean; error?: string }> => {
  const webhook = await fetchWebhookById(webhookId);
  if (!webhook) {
    return { success: false, error: 'Webhook no encontrado' };
  }

  const testData = {
    test: true,
    message: 'Este es un evento de prueba',
    webhook_id: webhookId,
    webhook_name: webhook.nombre
  };

  return sendWebhook(webhook, 'notificacion.urgente', testData, {
    is_test: true
  });
};

// ============================================
// LOGS
// ============================================

export const fetchWebhookLogs = async (
  webhookId: number,
  options?: {
    limit?: number;
    offset?: number;
    onlyErrors?: boolean;
  }
): Promise<WebhookLog[]> => {
  let query = supabase
    .from('webhooks_logs_erp')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false });

  if (options?.onlyErrors) {
    query = query.eq('success', false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as WebhookLog[];
};

export const fetchWebhookStats = async (
  webhookId: number,
  days: number = 7
): Promise<{
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
}> => {
  const fechaDesde = new Date();
  fechaDesde.setDate(fechaDesde.getDate() - days);

  const { data, error } = await supabase
    .from('webhooks_logs_erp')
    .select('success, duracion_ms')
    .eq('webhook_id', webhookId)
    .gte('created_at', fechaDesde.toISOString());

  if (error) throw error;

  const logs = data || [];
  const total = logs.length;
  const success = logs.filter(l => l.success).length;
  const failed = total - success;
  const avgDuration = total > 0
    ? logs.reduce((sum, l) => sum + (l.duracion_ms || 0), 0) / total
    : 0;

  return { total, success, failed, avgDuration };
};

// ============================================
// HELPERS PARA DIFERENTES MÓDULOS
// ============================================

/**
 * Disparar webhook cuando se crea un evento
 */
export const onEventoCreated = async (
  companyId: string,
  evento: Record<string, any>,
  userId?: string
) => {
  return triggerWebhooks(companyId, 'evento.created', evento, {
    company_id: companyId,
    user_id: userId
  });
};

/**
 * Disparar webhook cuando cambia el estado de un evento
 */
export const onEventoStatusChanged = async (
  companyId: string,
  evento: Record<string, any>,
  estadoAnterior: string,
  estadoNuevo: string,
  userId?: string
) => {
  return triggerWebhooks(companyId, 'evento.status_changed', {
    evento,
    estado_anterior: estadoAnterior,
    estado_nuevo: estadoNuevo
  }, {
    company_id: companyId,
    user_id: userId
  });
};

/**
 * Disparar webhook cuando se timbra una factura
 */
export const onFacturaTimbrada = async (
  companyId: string,
  factura: Record<string, any>,
  userId?: string
) => {
  return triggerWebhooks(companyId, 'factura.timbrada', factura, {
    company_id: companyId,
    user_id: userId
  });
};

/**
 * Disparar webhook cuando hay bajo stock
 */
export const onBajoStock = async (
  companyId: string,
  producto: Record<string, any>,
  stockActual: number,
  stockMinimo: number
) => {
  return triggerWebhooks(companyId, 'inventario.bajo_stock', {
    producto,
    stock_actual: stockActual,
    stock_minimo: stockMinimo
  }, {
    company_id: companyId
  });
};

// Exportar servicio completo
export const webhookService = {
  // CRUD
  fetchWebhooks,
  fetchWebhookById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhookActivo,
  // Disparo
  triggerWebhooks,
  sendWebhook,
  testWebhook,
  // Logs
  fetchWebhookLogs,
  fetchWebhookStats,
  // Helpers
  onEventoCreated,
  onEventoStatusChanged,
  onFacturaTimbrada,
  onBajoStock
};
