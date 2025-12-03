/**
 * Dashboard del Portal de Clientes - FASE 5.2
 * Vista principal con resumen de facturas, eventos y notificaciones
 */
import { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Divider,
  Progress
} from '@nextui-org/react';
import {
  FileText,
  Calendar,
  DollarSign,
  Bell,
  Download,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClienteAuth } from '../context/ClienteAuthContext';
import { portalClienteService } from '../services/portalClienteService';
import type { ResumenCliente, FacturaCliente, EventoCliente, NotificacionCliente } from '../types';

export function ClienteDashboard() {
  const navigate = useNavigate();
  const { cliente } = useClienteAuth();
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<ResumenCliente | null>(null);
  const [ultimasFacturas, setUltimasFacturas] = useState<FacturaCliente[]>([]);
  const [proximosEventos, setProximosEventos] = useState<EventoCliente[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionCliente[]>([]);

  useEffect(() => {
    if (cliente?.id) {
      loadDashboardData();
    }
  }, [cliente?.id]);

  const loadDashboardData = async () => {
    if (!cliente?.id) return;

    setLoading(true);
    try {
      const [resumenData, facturasData, eventosData, notificacionesData] = await Promise.all([
        portalClienteService.fetchResumenCliente(cliente.id),
        portalClienteService.fetchFacturasCliente(cliente.id, { limit: 5 }),
        portalClienteService.fetchEventosCliente(cliente.id, { activos: true, limit: 3 }),
        portalClienteService.fetchNotificacionesCliente(cliente.id, { soloNoLeidas: true, limit: 5 })
      ]);

      setResumen(resumenData);
      setUltimasFacturas(facturasData);
      setProximosEventos(eventosData);
      setNotificaciones(notificacionesData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'timbrada':
      case 'pagada':
        return 'success';
      case 'pendiente':
        return 'warning';
      case 'cancelada':
        return 'danger';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de bienvenida */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Bienvenido, {cliente?.razon_social || cliente?.nombre_comercial}
        </h1>
        <p className="mt-1 opacity-90">
          Portal de cliente - Acceda a sus facturas, eventos y documentos
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card isPressable onPress={() => navigate('/portal-cliente/facturas')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Facturas</p>
              <p className="text-2xl font-bold">{resumen?.total_facturas || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Facturado</p>
              <p className="text-xl font-bold">{formatCurrency(resumen?.total_facturado || 0)}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-100">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Saldo Pendiente</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(resumen?.saldo_pendiente || 0)}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/portal-cliente/eventos')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Eventos Activos</p>
              <p className="text-2xl font-bold">{resumen?.eventos_activos || 0}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas Facturas */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Últimas Facturas</h2>
              <Button
                size="sm"
                variant="light"
                endContent={<ChevronRight className="w-4 h-4" />}
                onPress={() => navigate('/portal-cliente/facturas')}
              >
                Ver todas
              </Button>
            </CardHeader>
            <CardBody>
              {ultimasFacturas.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No hay facturas registradas</p>
              ) : (
                <div className="space-y-3">
                  {ultimasFacturas.map((factura) => (
                    <div
                      key={factura.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      onClick={() => navigate(`/portal-cliente/facturas/${factura.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded shadow-sm">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold font-mono">
                            {factura.serie}{factura.folio}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(factura.fecha_emision)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-mono font-semibold">
                            {formatCurrency(factura.total)}
                          </p>
                          <Chip size="sm" color={getStatusColor(factura.status)}>
                            {factura.status}
                          </Chip>
                        </div>
                        {factura.status === 'timbrada' && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            color="primary"
                            onPress={(e) => {
                              e.stopPropagation();
                              portalClienteService.descargarFacturaPDF(factura.id, cliente!.id);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Notificaciones */}
        <div>
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Notificaciones</h2>
              </div>
              {notificaciones.length > 0 && (
                <Chip size="sm" color="danger">{notificaciones.length}</Chip>
              )}
            </CardHeader>
            <CardBody>
              {notificaciones.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">Sin notificaciones nuevas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notificaciones.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        portalClienteService.marcarNotificacionLeida(notif.id);
                        if (notif.link) navigate(notif.link);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {notif.tipo === 'success' && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                        {notif.tipo === 'warning' && <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />}
                        {notif.tipo === 'error' && <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                        {notif.tipo === 'info' && <Bell className="w-4 h-4 text-blue-500 mt-0.5" />}
                        <div>
                          <p className="font-medium text-sm">{notif.titulo}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{notif.mensaje}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Próximos Eventos */}
      {proximosEventos.length > 0 && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Próximos Eventos</h2>
            <Button
              size="sm"
              variant="light"
              endContent={<ChevronRight className="w-4 h-4" />}
              onPress={() => navigate('/portal-cliente/eventos')}
            >
              Ver todos
            </Button>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {proximosEventos.map((evento) => (
                <div
                  key={evento.id}
                  className="p-4 border rounded-lg hover:border-primary cursor-pointer"
                  onClick={() => navigate(`/portal-cliente/eventos/${evento.id}`)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{evento.clave_evento}</p>
                      <p className="text-sm text-gray-500 truncate">{evento.nombre_proyecto}</p>
                    </div>
                  </div>

                  {evento.fecha_evento && (
                    <p className="text-sm text-gray-600 mb-2">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatDate(evento.fecha_evento)}
                    </p>
                  )}

                  {evento.lugar && (
                    <p className="text-sm text-gray-500 truncate">{evento.lugar}</p>
                  )}

                  <div className="mt-3">
                    <Chip size="sm" color="secondary" variant="flat">
                      {evento.estado}
                    </Chip>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card isPressable onPress={() => navigate('/portal-cliente/facturas')}>
          <CardBody className="text-center py-6">
            <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="font-medium">Mis Facturas</p>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/portal-cliente/eventos')}>
          <CardBody className="text-center py-6">
            <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="font-medium">Mis Eventos</p>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/portal-cliente/pagos')}>
          <CardBody className="text-center py-6">
            <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium">Estado de Cuenta</p>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/portal-cliente/documentos')}>
          <CardBody className="text-center py-6">
            <Download className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="font-medium">Documentos</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default ClienteDashboard;
