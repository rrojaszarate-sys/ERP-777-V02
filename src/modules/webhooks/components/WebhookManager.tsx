/**
 * Administrador de Webhooks - FASE 5.3
 * Configuración y monitoreo de webhooks
 */
import { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Switch,
  Chip,
  Tabs,
  Tab,
  Checkbox,
  CheckboxGroup,
  Spinner,
  Divider,
  Progress
} from '@nextui-org/react';
import {
  Webhook,
  Plus,
  Edit,
  Trash2,
  Play,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { webhookService } from '../services/webhookService';
import type { Webhook as WebhookType, WebhookLog, WebhookEventType, WebhookFormData } from '../types';
import { WEBHOOK_EVENTS } from '../types';

export function WebhookManager() {
  const { user } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isLogsOpen, onOpen: onLogsOpen, onClose: onLogsClose } = useDisclosure();

  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookType | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [stats, setStats] = useState<{ total: number; success: number; failed: number; avgDuration: number } | null>(null);

  // Formulario
  const [formData, setFormData] = useState<WebhookFormData>({
    nombre: '',
    descripcion: '',
    url: '',
    eventos: [],
    activo: true,
    reintentos_max: 3,
    timeout_ms: 30000
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);

  useEffect(() => {
    if (user?.company_id) {
      loadWebhooks();
    }
  }, [user?.company_id]);

  const loadWebhooks = async () => {
    if (!user?.company_id) return;

    setLoading(true);
    try {
      const data = await webhookService.fetchWebhooks(user.company_id);
      setWebhooks(data);
    } catch (err) {
      console.error('Error loading webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedWebhook(null);
    setFormData({
      nombre: '',
      descripcion: '',
      url: '',
      eventos: [],
      activo: true,
      reintentos_max: 3,
      timeout_ms: 30000
    });
    onOpen();
  };

  const handleOpenEdit = (webhook: WebhookType) => {
    setIsEditing(true);
    setSelectedWebhook(webhook);
    setFormData({
      nombre: webhook.nombre,
      descripcion: webhook.descripcion,
      url: webhook.url,
      eventos: webhook.eventos,
      activo: webhook.activo,
      reintentos_max: webhook.reintentos_max,
      timeout_ms: webhook.timeout_ms
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!user?.company_id) return;

    setSaving(true);
    try {
      if (isEditing && selectedWebhook) {
        await webhookService.updateWebhook(selectedWebhook.id, formData);
      } else {
        await webhookService.createWebhook(formData, user.company_id);
      }
      await loadWebhooks();
      onClose();
    } catch (err) {
      console.error('Error saving webhook:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (webhook: WebhookType) => {
    if (!confirm(`¿Está seguro de eliminar el webhook "${webhook.nombre}"?`)) return;

    try {
      await webhookService.deleteWebhook(webhook.id);
      await loadWebhooks();
    } catch (err) {
      console.error('Error deleting webhook:', err);
    }
  };

  const handleToggleActivo = async (webhook: WebhookType) => {
    try {
      await webhookService.toggleWebhookActivo(webhook.id, !webhook.activo);
      await loadWebhooks();
    } catch (err) {
      console.error('Error toggling webhook:', err);
    }
  };

  const handleTest = async (webhook: WebhookType) => {
    setTesting(webhook.id);
    try {
      const result = await webhookService.testWebhook(webhook.id);
      if (result.success) {
        alert('Webhook enviado correctamente');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      console.error('Error testing webhook:', err);
    } finally {
      setTesting(null);
    }
  };

  const handleViewLogs = async (webhook: WebhookType) => {
    setSelectedWebhook(webhook);
    setLogsLoading(true);
    onLogsOpen();

    try {
      const [logsData, statsData] = await Promise.all([
        webhookService.fetchWebhookLogs(webhook.id, { limit: 50 }),
        webhookService.fetchWebhookStats(webhook.id)
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Agrupar eventos por módulo
  const eventosAgrupados = Object.entries(WEBHOOK_EVENTS).reduce((acc, [key, value]) => {
    if (!acc[value.modulo]) {
      acc[value.modulo] = [];
    }
    acc[value.modulo].push({ key: key as WebhookEventType, ...value });
    return acc;
  }, {} as Record<string, { key: WebhookEventType; label: string; descripcion: string }[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="w-6 h-6" />
            Webhooks
          </h1>
          <p className="text-gray-500 mt-1">Configure integraciones con sistemas externos</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={handleOpenCreate}
        >
          Nuevo Webhook
        </Button>
      </div>

      {/* Lista de webhooks */}
      <Card>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12">
              <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No hay webhooks configurados</h3>
              <p className="text-gray-500 mt-1">Cree su primer webhook para recibir notificaciones</p>
              <Button
                color="primary"
                className="mt-4"
                startContent={<Plus className="w-4 h-4" />}
                onPress={handleOpenCreate}
              >
                Crear Webhook
              </Button>
            </div>
          ) : (
            <Table aria-label="Webhooks configurados">
              <TableHeader>
                <TableColumn>NOMBRE</TableColumn>
                <TableColumn>URL</TableColumn>
                <TableColumn>EVENTOS</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{webhook.nombre}</p>
                        {webhook.descripcion && (
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {webhook.descripcion}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <LinkIcon className="w-3 h-3 text-gray-400" />
                        <span className="font-mono text-xs truncate max-w-[200px]">
                          {webhook.url}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.eventos.slice(0, 2).map((evento) => (
                          <Chip key={evento} size="sm" variant="flat">
                            {WEBHOOK_EVENTS[evento]?.label || evento}
                          </Chip>
                        ))}
                        {webhook.eventos.length > 2 && (
                          <Chip size="sm" variant="flat" color="primary">
                            +{webhook.eventos.length - 2}
                          </Chip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="sm"
                        isSelected={webhook.activo}
                        onValueChange={() => handleToggleActivo(webhook)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleTest(webhook)}
                          isLoading={testing === webhook.id}
                          title="Probar"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleViewLogs(webhook)}
                          title="Ver logs"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleOpenEdit(webhook)}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleDelete(webhook)}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Modal de crear/editar */}
      <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            {isEditing ? 'Editar Webhook' : 'Nuevo Webhook'}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              {/* Datos básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  placeholder="Mi webhook"
                  value={formData.nombre}
                  onValueChange={(v) => setFormData({ ...formData, nombre: v })}
                  isRequired
                />
                <Input
                  label="URL"
                  placeholder="https://api.ejemplo.com/webhook"
                  value={formData.url}
                  onValueChange={(v) => setFormData({ ...formData, url: v })}
                  startContent={<LinkIcon className="w-4 h-4 text-gray-400" />}
                  isRequired
                />
              </div>

              <Textarea
                label="Descripción"
                placeholder="Descripción opcional del webhook"
                value={formData.descripcion || ''}
                onValueChange={(v) => setFormData({ ...formData, descripcion: v })}
              />

              {/* Configuración */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Reintentos máximos"
                  value={formData.reintentos_max?.toString() || '3'}
                  onValueChange={(v) => setFormData({ ...formData, reintentos_max: parseInt(v) || 3 })}
                  min={1}
                  max={10}
                />
                <Input
                  type="number"
                  label="Timeout (ms)"
                  value={formData.timeout_ms?.toString() || '30000'}
                  onValueChange={(v) => setFormData({ ...formData, timeout_ms: parseInt(v) || 30000 })}
                  min={1000}
                  max={60000}
                />
              </div>

              <Divider />

              {/* Eventos */}
              <div>
                <h4 className="text-md font-semibold mb-4">Eventos a escuchar</h4>
                <Tabs variant="bordered">
                  {Object.entries(eventosAgrupados).map(([modulo, eventos]) => (
                    <Tab key={modulo} title={modulo}>
                      <div className="py-4">
                        <CheckboxGroup
                          value={formData.eventos}
                          onValueChange={(v) => setFormData({ ...formData, eventos: v as WebhookEventType[] })}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {eventos.map((evento) => (
                              <Checkbox key={evento.key} value={evento.key}>
                                <div>
                                  <p className="font-medium">{evento.label}</p>
                                  <p className="text-xs text-gray-500">{evento.descripcion}</p>
                                </div>
                              </Checkbox>
                            ))}
                          </div>
                        </CheckboxGroup>
                      </div>
                    </Tab>
                  ))}
                </Tabs>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={saving}
              isDisabled={!formData.nombre || !formData.url || formData.eventos.length === 0}
            >
              {isEditing ? 'Guardar Cambios' : 'Crear Webhook'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de logs */}
      <Modal isOpen={isLogsOpen} onClose={onLogsClose} size="4xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            Logs de {selectedWebhook?.nombre}
          </ModalHeader>
          <ModalBody>
            {logsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Estadísticas */}
                {stats && (
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardBody className="text-center">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-sm text-gray-500">Total envíos</p>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody className="text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                        <p className="text-sm text-gray-500">Exitosos</p>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody className="text-center">
                        <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                        <p className="text-sm text-gray-500">Fallidos</p>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody className="text-center">
                        <p className="text-2xl font-bold">{Math.round(stats.avgDuration)}ms</p>
                        <p className="text-sm text-gray-500">Tiempo promedio</p>
                      </CardBody>
                    </Card>
                  </div>
                )}

                {/* Tasa de éxito */}
                {stats && stats.total > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tasa de éxito</span>
                      <span>{Math.round((stats.success / stats.total) * 100)}%</span>
                    </div>
                    <Progress
                      value={(stats.success / stats.total) * 100}
                      color={stats.success / stats.total >= 0.9 ? 'success' : 'warning'}
                    />
                  </div>
                )}

                <Divider />

                {/* Lista de logs */}
                <Table aria-label="Logs del webhook">
                  <TableHeader>
                    <TableColumn>FECHA</TableColumn>
                    <TableColumn>EVENTO</TableColumn>
                    <TableColumn>ESTADO</TableColumn>
                    <TableColumn>DURACIÓN</TableColumn>
                    <TableColumn>INTENTOS</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No hay registros">
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(log.created_at).toLocaleString('es-MX')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Chip size="sm" variant="flat">
                            {WEBHOOK_EVENTS[log.evento]?.label || log.evento}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <Chip size="sm" color="success" startContent={<CheckCircle className="w-3 h-3" />}>
                              Éxito
                            </Chip>
                          ) : (
                            <Chip size="sm" color="danger" startContent={<XCircle className="w-3 h-3" />}>
                              Error
                            </Chip>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{log.duracion_ms}ms</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{log.intentos}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={onLogsClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default WebhookManager;
