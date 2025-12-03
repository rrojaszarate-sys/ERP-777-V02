/**
 * Configuración de Notificaciones Push - FASE 5.3
 * Permite al usuario activar/desactivar notificaciones push
 */
import { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Switch,
  Button,
  Chip,
  Divider,
  Spinner
} from '@nextui-org/react';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle, Smartphone } from 'lucide-react';
import { pushNotificationService } from '../services/pushNotificationService';
import {
  usePushSubscription,
  useSubscribeToPush,
  useUnsubscribeFromPush,
  useShowLocalNotification
} from '../hooks/useWebhooks';
import { useAuth } from '../../../core/auth/AuthProvider';

export function PushNotificationSettings() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const { data: isSubscribed, isLoading: loadingSubscription } = usePushSubscription();
  const subscribeMutation = useSubscribeToPush();
  const unsubscribeMutation = useUnsubscribeFromPush();
  const showNotification = useShowLocalNotification();

  useEffect(() => {
    setIsSupported(pushNotificationService.isPushSupported());
    setPermission(pushNotificationService.getNotificationPermission());
  }, []);

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribeMutation.mutateAsync();
      setPermission(pushNotificationService.getNotificationPermission());
    } else {
      await unsubscribeMutation.mutateAsync();
    }
  };

  const handleTestNotification = async () => {
    await showNotification.mutateAsync({
      title: 'Notificación de Prueba',
      body: 'Las notificaciones push están funcionando correctamente.',
      icon: '/icons/icon-192x192.png',
      data: { test: true }
    });
  };

  if (!isSupported) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center gap-3 text-warning">
            <AlertCircle className="w-5 h-5" />
            <p>Tu navegador no soporta notificaciones push.</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return (
          <Chip color="success" startContent={<CheckCircle className="w-3 h-3" />}>
            Permitido
          </Chip>
        );
      case 'denied':
        return (
          <Chip color="danger" startContent={<XCircle className="w-3 h-3" />}>
            Bloqueado
          </Chip>
        );
      default:
        return (
          <Chip color="default" startContent={<AlertCircle className="w-3 h-3" />}>
            Sin configurar
          </Chip>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">Notificaciones Push</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Estado del permiso */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium">Permiso del navegador</p>
              <p className="text-sm text-gray-500">Estado del permiso de notificaciones</p>
            </div>
          </div>
          {getPermissionStatus()}
        </div>

        {permission === 'denied' && (
          <div className="p-3 bg-danger-50 rounded-lg">
            <p className="text-sm text-danger-700">
              Las notificaciones están bloqueadas. Para habilitarlas, haz clic en el icono del candado en la barra de direcciones y permite las notificaciones.
            </p>
          </div>
        )}

        <Divider />

        {/* Toggle de suscripción */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <Bell className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium">Recibir notificaciones</p>
              <p className="text-sm text-gray-500">
                Recibe alertas sobre eventos, facturas y más
              </p>
            </div>
          </div>

          {loadingSubscription ? (
            <Spinner size="sm" />
          ) : (
            <Switch
              isSelected={isSubscribed || false}
              onValueChange={handleToggle}
              isDisabled={
                permission === 'denied' ||
                subscribeMutation.isPending ||
                unsubscribeMutation.isPending
              }
            />
          )}
        </div>

        {/* Tipos de notificaciones */}
        {isSubscribed && (
          <>
            <Divider />
            <div>
              <p className="font-medium mb-3">Recibirás notificaciones de:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Cambios en eventos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Facturas timbradas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Solicitudes pendientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Alertas de inventario</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Pagos recibidos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Mensajes urgentes</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Botón de prueba */}
        {isSubscribed && (
          <>
            <Divider />
            <Button
              variant="bordered"
              startContent={<Bell className="w-4 h-4" />}
              onPress={handleTestNotification}
              isLoading={showNotification.isPending}
            >
              Enviar notificación de prueba
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  );
}

export default PushNotificationSettings;
