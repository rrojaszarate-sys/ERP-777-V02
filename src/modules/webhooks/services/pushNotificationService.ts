/**
 * Servicio de Notificaciones Push - FASE 5.3
 * Web Push API para notificaciones en tiempo real
 */
import { supabase } from '../../../core/config/supabase';
import type { PushSubscription, PushNotification, NotificationPayload } from '../types';

// Clave pública VAPID (en producción, configurar en .env)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

// ============================================
// SUSCRIPCIONES PUSH
// ============================================

/**
 * Verifica si el navegador soporta notificaciones push
 */
export const isPushSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Solicita permiso para notificaciones
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) {
    throw new Error('Las notificaciones push no son soportadas en este navegador');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Obtiene el estado actual del permiso
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
};

/**
 * Suscribe al usuario a notificaciones push
 */
export const subscribeToPush = async (userId: string): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    console.warn('Push no soportado');
    return null;
  }

  try {
    // Obtener service worker
    const registration = await navigator.serviceWorker.ready;

    // Convertir la clave VAPID de base64 a Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    // Suscribirse
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // Guardar en la base de datos
    const subscriptionJson = subscription.toJSON();

    const { data, error } = await supabase
      .from('push_subscriptions_erp')
      .upsert({
        user_id: userId,
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth
        },
        activo: true
      }, {
        onConflict: 'user_id,endpoint'
      })
      .select()
      .single();

    if (error) throw error;
    return data as PushSubscription;
  } catch (err) {
    console.error('Error subscribing to push:', err);
    return null;
  }
};

/**
 * Desuscribe al usuario de notificaciones push
 */
export const unsubscribeFromPush = async (userId: string): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    // Desactivar en la base de datos
    await supabase
      .from('push_subscriptions_erp')
      .update({ activo: false })
      .eq('user_id', userId);

    return true;
  } catch (err) {
    console.error('Error unsubscribing from push:', err);
    return false;
  }
};

/**
 * Verifica si el usuario está suscrito
 */
export const isSubscribed = async (userId: string): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) return false;

    // Verificar en la base de datos
    const { data, error } = await supabase
      .from('push_subscriptions_erp')
      .select('activo')
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
      .single();

    if (error) return false;
    return data?.activo || false;
  } catch (err) {
    return false;
  }
};

// ============================================
// ENVÍO DE NOTIFICACIONES
// ============================================

/**
 * Envía una notificación push a un usuario específico
 * Nota: En producción, esto debería hacerse desde el backend
 */
export const sendPushNotification = async (
  userId: string,
  notification: NotificationPayload
): Promise<boolean> => {
  try {
    // Guardar notificación en la base de datos
    const { data: notifData, error: notifError } = await supabase
      .from('push_notifications_erp')
      .insert({
        user_id: userId,
        titulo: notification.title,
        mensaje: notification.body,
        icono: notification.icon,
        url: notification.data?.url,
        data: notification.data,
        enviada: false,
        leida: false
      })
      .select()
      .single();

    if (notifError) throw notifError;

    // Llamar a la función edge para enviar la notificación
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        notification,
        notification_id: notifData.id
      }
    });

    if (error) {
      console.error('Error sending push:', error);
      return false;
    }

    return data?.success || false;
  } catch (err) {
    console.error('Error in sendPushNotification:', err);
    return false;
  }
};

/**
 * Envía notificación a múltiples usuarios
 */
export const sendPushToUsers = async (
  userIds: string[],
  notification: NotificationPayload
): Promise<{ sent: number; failed: number }> => {
  let sent = 0;
  let failed = 0;

  await Promise.all(
    userIds.map(async (userId) => {
      const success = await sendPushNotification(userId, notification);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    })
  );

  return { sent, failed };
};

/**
 * Envía notificación a todos los usuarios de una empresa
 */
export const sendPushToCompany = async (
  companyId: string,
  notification: NotificationPayload
): Promise<{ sent: number; failed: number }> => {
  // Obtener usuarios de la empresa con suscripción activa
  const { data: users, error } = await supabase
    .from('push_subscriptions_erp')
    .select('user_id')
    .eq('activo', true)
    .in('user_id',
      supabase
        .from('core_users')
        .select('id')
        .eq('company_id', companyId)
        .eq('activo', true)
    );

  if (error || !users) {
    return { sent: 0, failed: 0 };
  }

  const userIds = [...new Set(users.map(u => u.user_id))];
  return sendPushToUsers(userIds, notification);
};

// ============================================
// NOTIFICACIONES LOCALES (sin push server)
// ============================================

/**
 * Muestra una notificación local del navegador
 */
export const showLocalNotification = async (
  notification: NotificationPayload
): Promise<boolean> => {
  if (!isPushSupported()) return false;

  if (Notification.permission !== 'granted') {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: notification.badge || '/icons/badge-72x72.png',
      tag: notification.tag,
      data: notification.data,
      actions: notification.actions,
      requireInteraction: notification.requireInteraction
    });
    return true;
  } catch (err) {
    console.error('Error showing notification:', err);
    return false;
  }
};

// ============================================
// HISTORIAL DE NOTIFICACIONES
// ============================================

/**
 * Obtiene las notificaciones del usuario
 */
export const fetchNotifications = async (
  userId: string,
  options?: {
    soloNoLeidas?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<PushNotification[]> => {
  let query = supabase
    .from('push_notifications_erp')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.soloNoLeidas) {
    query = query.eq('leida', false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as PushNotification[];
};

/**
 * Marca una notificación como leída
 */
export const markAsRead = async (notificationId: number): Promise<void> => {
  await supabase
    .from('push_notifications_erp')
    .update({ leida: true })
    .eq('id', notificationId);
};

/**
 * Marca todas las notificaciones como leídas
 */
export const markAllAsRead = async (userId: string): Promise<void> => {
  await supabase
    .from('push_notifications_erp')
    .update({ leida: true })
    .eq('user_id', userId)
    .eq('leida', false);
};

/**
 * Obtiene el conteo de notificaciones no leídas
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('push_notifications_erp')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('leida', false);

  if (error) return 0;
  return count || 0;
};

// ============================================
// UTILIDADES
// ============================================

/**
 * Convierte base64 URL-safe a Uint8Array (para VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Exportar servicio completo
export const pushNotificationService = {
  // Soporte
  isPushSupported,
  requestNotificationPermission,
  getNotificationPermission,
  // Suscripciones
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  // Envío
  sendPushNotification,
  sendPushToUsers,
  sendPushToCompany,
  showLocalNotification,
  // Historial
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};
