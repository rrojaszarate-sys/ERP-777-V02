/**
 * Centro de Notificaciones - FASE 2.2
 * Sistema de notificaciones in-app con bell icon y dropdown
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  Chip,
  ScrollShadow
} from '@nextui-org/react';
import {
  Bell,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Settings,
  Trash2
} from 'lucide-react';
import { supabase } from '../config/supabase';

// Tipos de notificación
export type NotificationType =
  | 'evento_proximo'
  | 'pago_vencido'
  | 'gasto_pendiente'
  | 'stock_bajo'
  | 'tarea_asignada'
  | 'cambio_estado'
  | 'sistema'
  | 'alerta';

export interface Notification {
  id: string;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  link?: string;
  leida: boolean;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  created_at: string;
  metadata?: Record<string, any>;
}

// Iconos por tipo de notificación
const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  evento_proximo: <Calendar className="w-4 h-4" />,
  pago_vencido: <DollarSign className="w-4 h-4" />,
  gasto_pendiente: <Clock className="w-4 h-4" />,
  stock_bajo: <Package className="w-4 h-4" />,
  tarea_asignada: <CheckCircle className="w-4 h-4" />,
  cambio_estado: <AlertTriangle className="w-4 h-4" />,
  sistema: <Settings className="w-4 h-4" />,
  alerta: <AlertTriangle className="w-4 h-4" />,
};

// Colores por prioridad
const PRIORITY_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'danger'> = {
  baja: 'default',
  media: 'primary',
  alta: 'warning',
  critica: 'danger',
};

interface NotificationCenterProps {
  userId?: string;
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationCenter({ userId, onNotificationClick }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('core_notificaciones')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        // Si la tabla no existe, usar datos de demo
        setNotifications(getDemoNotifications());
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setNotifications(getDemoNotifications());
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Actualizar contador de no leídas
  useEffect(() => {
    const count = notifications.filter(n => !n.leida).length;
    setUnreadCount(count);
  }, [notifications]);

  // Cargar al montar
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'core_notificaciones',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Marcar como leída
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('core_notificaciones')
        .update({ leida: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, leida: true } : n)
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      if (userId) {
        await supabase
          .from('core_notificaciones')
          .update({ leida: true })
          .eq('user_id', userId)
          .eq('leida', false);
      }

      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Eliminar notificación
  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('core_notificaciones')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Click en notificación
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  // Formatear tiempo relativo
  const formatTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX');
  };

  return (
    <Dropdown placement="bottom-end" closeOnSelect={false}>
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="light"
          aria-label="Notificaciones"
          className="relative"
        >
          <Badge
            content={unreadCount > 0 ? unreadCount : ''}
            color="danger"
            size="sm"
            isInvisible={unreadCount === 0}
          >
            <Bell className="w-5 h-5" />
          </Badge>
        </Button>
      </DropdownTrigger>

      <DropdownMenu
        aria-label="Notificaciones"
        className="w-80 max-h-96"
        emptyContent="No hay notificaciones"
      >
        <DropdownSection title="Notificaciones" showDivider>
          <DropdownItem
            key="header"
            isReadOnly
            className="opacity-100"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
              </span>
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="light"
                  onPress={markAllAsRead}
                >
                  Marcar todas leídas
                </Button>
              )}
            </div>
          </DropdownItem>
        </DropdownSection>

        <DropdownSection>
          <DropdownItem key="notifications-list" isReadOnly className="p-0">
            <ScrollShadow className="max-h-72">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Cargando...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay notificaciones</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.slice(0, 10).map((notification) => (
                    <Card
                      key={notification.id}
                      isPressable
                      onPress={() => handleNotificationClick(notification)}
                      className={`m-1 ${!notification.leida ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                    >
                      <CardBody className="p-3">
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-full bg-${PRIORITY_COLORS[notification.prioridad]}-100`}>
                            {NOTIFICATION_ICONS[notification.tipo]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="font-medium text-sm truncate">
                                {notification.titulo}
                              </p>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="min-w-6 w-6 h-6"
                                onPress={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {notification.mensaje}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-gray-400">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              <Chip
                                size="sm"
                                color={PRIORITY_COLORS[notification.prioridad]}
                                variant="flat"
                              >
                                {notification.prioridad}
                              </Chip>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollShadow>
          </DropdownItem>
        </DropdownSection>

        {notifications.length > 10 && (
          <DropdownSection>
            <DropdownItem key="view-all" className="text-center text-primary">
              Ver todas las notificaciones
            </DropdownItem>
          </DropdownSection>
        )}
      </DropdownMenu>
    </Dropdown>
  );
}

// Datos de demo cuando no hay BD
function getDemoNotifications(): Notification[] {
  return [
    {
      id: '1',
      tipo: 'evento_proximo',
      titulo: 'Evento mañana',
      mensaje: 'El evento EVT-2025-001 está programado para mañana',
      leida: false,
      prioridad: 'alta',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      tipo: 'pago_vencido',
      titulo: 'Pago vencido',
      mensaje: 'Tienes un pago vencido de $15,000 MXN',
      leida: false,
      prioridad: 'critica',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      tipo: 'stock_bajo',
      titulo: 'Stock bajo',
      mensaje: '5 productos están por debajo del mínimo',
      leida: true,
      prioridad: 'media',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

export default NotificationCenter;
