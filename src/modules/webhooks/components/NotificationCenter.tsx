/**
 * Centro de Notificaciones - FASE 5.3
 * Dropdown con lista de notificaciones push del usuario
 */
import { useState } from 'react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Button,
  Badge,
  Spinner,
  Divider
} from '@nextui-org/react';
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  Calendar,
  DollarSign,
  AlertTriangle,
  Package,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  usePushNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead
} from '../hooks/useWebhooks';
import type { PushNotification } from '../types';

interface NotificationCenterProps {
  maxItems?: number;
}

export function NotificationCenter({ maxItems = 10 }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications, isLoading } = usePushNotifications({ limit: maxItems });
  const { data: unreadCount } = useUnreadNotificationsCount();
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  const getNotificationIcon = (notification: PushNotification) => {
    const title = notification.titulo.toLowerCase();
    const data = notification.data || {};

    if (title.includes('factura') || data.type === 'factura') {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    if (title.includes('evento') || data.type === 'evento') {
      return <Calendar className="w-4 h-4 text-purple-500" />;
    }
    if (title.includes('pago') || data.type === 'pago') {
      return <DollarSign className="w-4 h-4 text-green-500" />;
    }
    if (title.includes('inventario') || title.includes('stock') || data.type === 'inventario') {
      return <Package className="w-4 h-4 text-orange-500" />;
    }
    if (title.includes('urgente') || title.includes('alerta') || data.urgente) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    if (title.includes('mensaje') || data.type === 'mensaje') {
      return <MessageSquare className="w-4 h-4 text-cyan-500" />;
    }
    return <Bell className="w-4 h-4 text-gray-500" />;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX');
  };

  const handleNotificationClick = (notification: PushNotification) => {
    if (!notification.leida) {
      markAsRead.mutate(notification.id);
    }

    // Navegar si hay URL
    if (notification.url) {
      navigate(notification.url);
    } else if (notification.data?.url) {
      navigate(notification.data.url);
    }

    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="light"
          aria-label="Notificaciones"
        >
          <Badge
            content={unreadCount || 0}
            color="danger"
            size="sm"
            isInvisible={!unreadCount || unreadCount === 0}
          >
            <Bell className="w-5 h-5" />
          </Badge>
        </Button>
      </DropdownTrigger>

      <DropdownMenu
        aria-label="Notificaciones"
        className="w-80 max-h-[500px] overflow-y-auto"
        closeOnSelect={false}
      >
        {/* Header */}
        <DropdownSection showDivider>
          <DropdownItem
            key="header"
            isReadOnly
            className="cursor-default"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">Notificaciones</span>
              {unreadCount && unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="light"
                  startContent={<CheckCheck className="w-3 h-3" />}
                  onPress={handleMarkAllRead}
                  isLoading={markAllAsRead.isPending}
                >
                  Marcar todas
                </Button>
              )}
            </div>
          </DropdownItem>
        </DropdownSection>

        {/* Loading */}
        {isLoading && (
          <DropdownItem key="loading" isReadOnly className="cursor-default">
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          </DropdownItem>
        )}

        {/* Empty state */}
        {!isLoading && (!notifications || notifications.length === 0) && (
          <DropdownItem key="empty" isReadOnly className="cursor-default">
            <div className="text-center py-6 text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No hay notificaciones</p>
            </div>
          </DropdownItem>
        )}

        {/* Notifications list */}
        {notifications && notifications.length > 0 && (
          <DropdownSection>
            {notifications.map((notification) => (
              <DropdownItem
                key={notification.id}
                className={`py-3 ${!notification.leida ? 'bg-primary-50' : ''}`}
                onPress={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notification.leida ? 'font-semibold' : ''} line-clamp-1`}>
                        {notification.titulo}
                      </p>
                      {!notification.leida && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {notification.mensaje}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </DropdownItem>
            ))}
          </DropdownSection>
        )}

        {/* Footer */}
        {notifications && notifications.length > 0 && (
          <DropdownSection>
            <DropdownItem
              key="view-all"
              className="text-center"
              onPress={() => {
                navigate('/notificaciones');
                setIsOpen(false);
              }}
            >
              <div className="flex items-center justify-center gap-1 text-primary text-sm">
                <span>Ver todas las notificaciones</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </DropdownItem>
          </DropdownSection>
        )}
      </DropdownMenu>
    </Dropdown>
  );
}

export default NotificationCenter;
