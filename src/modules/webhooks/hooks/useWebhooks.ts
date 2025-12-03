/**
 * Hooks de React Query para Webhooks - FASE 5.3
 * Facilita la integración de webhooks en otros módulos
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import { webhookService } from '../services/webhookService';
import { pushNotificationService } from '../services/pushNotificationService';
import toast from 'react-hot-toast';
import type { WebhookFormData, WebhookEventType, NotificationPayload } from '../types';

// ============================================
// HOOKS PARA WEBHOOKS
// ============================================

export const useWebhooks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['webhooks', user?.company_id],
    queryFn: () => webhookService.fetchWebhooks(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useWebhook = (id: number) => {
  return useQuery({
    queryKey: ['webhook', id],
    queryFn: () => webhookService.fetchWebhookById(id),
    enabled: !!id
  });
};

export const useCreateWebhook = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: WebhookFormData) =>
      webhookService.createWebhook(data, user!.company_id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear webhook');
    }
  });
};

export const useUpdateWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WebhookFormData> }) =>
      webhookService.updateWebhook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar webhook');
    }
  });
};

export const useDeleteWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => webhookService.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar webhook');
    }
  });
};

export const useTestWebhook = () => {
  return useMutation({
    mutationFn: (id: number) => webhookService.testWebhook(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Webhook enviado correctamente');
      } else {
        toast.error(`Error: ${result.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al probar webhook');
    }
  });
};

export const useWebhookLogs = (webhookId: number, options?: { limit?: number; onlyErrors?: boolean }) => {
  return useQuery({
    queryKey: ['webhook-logs', webhookId, options],
    queryFn: () => webhookService.fetchWebhookLogs(webhookId, options),
    enabled: !!webhookId
  });
};

export const useWebhookStats = (webhookId: number, days: number = 7) => {
  return useQuery({
    queryKey: ['webhook-stats', webhookId, days],
    queryFn: () => webhookService.fetchWebhookStats(webhookId, days),
    enabled: !!webhookId
  });
};

// ============================================
// HOOK PARA DISPARAR WEBHOOKS
// ============================================

/**
 * Hook para disparar webhooks desde cualquier módulo
 */
export const useTriggerWebhook = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      event,
      data,
      metadata
    }: {
      event: WebhookEventType;
      data: Record<string, any>;
      metadata?: Record<string, any>;
    }) => {
      if (!user?.company_id) throw new Error('No company ID');
      return webhookService.triggerWebhooks(user.company_id, event, data, {
        ...metadata,
        user_id: user.id
      });
    }
  });
};

// ============================================
// HOOKS PARA NOTIFICACIONES PUSH
// ============================================

export const usePushPermission = () => {
  return useQuery({
    queryKey: ['push-permission'],
    queryFn: () => pushNotificationService.getNotificationPermission(),
    staleTime: Infinity
  });
};

export const usePushSubscription = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['push-subscription', user?.id],
    queryFn: () => pushNotificationService.isSubscribed(user!.id!),
    enabled: !!user?.id
  });
};

export const useSubscribeToPush = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const permission = await pushNotificationService.requestNotificationPermission();
      if (permission !== 'granted') {
        throw new Error('Permiso denegado para notificaciones');
      }
      return pushNotificationService.subscribeToPush(user!.id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast.success('Notificaciones push activadas');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al activar notificaciones');
    }
  });
};

export const useUnsubscribeFromPush = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: () => pushNotificationService.unsubscribeFromPush(user!.id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast.success('Notificaciones push desactivadas');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al desactivar notificaciones');
    }
  });
};

export const usePushNotifications = (options?: { soloNoLeidas?: boolean; limit?: number }) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['push-notifications', user?.id, options],
    queryFn: () => pushNotificationService.fetchNotifications(user!.id!, options),
    enabled: !!user?.id
  });
};

export const useUnreadNotificationsCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-notifications-count', user?.id],
    queryFn: () => pushNotificationService.getUnreadCount(user!.id!),
    enabled: !!user?.id,
    refetchInterval: 30000 // Refrescar cada 30 segundos
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => pushNotificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    }
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: () => pushNotificationService.markAllAsRead(user!.id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('Todas las notificaciones marcadas como leídas');
    }
  });
};

export const useSendPushNotification = () => {
  return useMutation({
    mutationFn: ({ userId, notification }: { userId: string; notification: NotificationPayload }) =>
      pushNotificationService.sendPushNotification(userId, notification),
    onSuccess: () => {
      toast.success('Notificación enviada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al enviar notificación');
    }
  });
};

export const useShowLocalNotification = () => {
  return useMutation({
    mutationFn: (notification: NotificationPayload) =>
      pushNotificationService.showLocalNotification(notification)
  });
};
