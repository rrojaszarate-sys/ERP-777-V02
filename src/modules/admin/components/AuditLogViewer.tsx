/**
 * Visor de Logs de Auditoría - FASE 4.3
 * Consulta y visualización de actividad del sistema
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
  Input,
  Select,
  SelectItem,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Pagination,
  Spinner,
  Divider,
  useDisclosure
} from '@nextui-org/react';
import {
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { auditService, AuditLog, AuditAction, AuditModule } from '../../../core/services/auditService';

interface AuditLogViewerProps {
  companyId?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
}

export function AuditLogViewer({ companyId, entityType, entityId, userId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Filtros
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterModule, setFilterModule] = useState<string>('');
  const [filterFechaDesde, setFilterFechaDesde] = useState<string>('');
  const [filterFechaHasta, setFilterFechaHasta] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de detalle
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page, filterAction, filterModule, filterFechaDesde, filterFechaHasta]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getLogs({
        user_id: userId,
        action: filterAction as AuditAction || undefined,
        module: filterModule as AuditModule || undefined,
        entity_type: entityType,
        entity_id: entityId,
        fecha_desde: filterFechaDesde || undefined,
        fecha_hasta: filterFechaHasta || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize
      });

      setLogs(data);
      // Estimar total de páginas (simplificado)
      setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    onOpen();
  };

  const handleExport = () => {
    // Exportar a CSV
    const headers = ['Fecha', 'Usuario', 'Acción', 'Módulo', 'Entidad', 'ID'];
    const rows = logs.map(log => [
      log.created_at ? new Date(log.created_at).toLocaleString('es-MX') : '',
      log.user_email || log.user_id || '',
      log.action,
      log.module,
      log.entity_type,
      log.entity_id || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getActionChip = (action: string) => {
    const config: Record<string, { color: 'default' | 'primary' | 'success' | 'warning' | 'danger'; label: string }> = {
      CREATE: { color: 'success', label: 'Crear' },
      UPDATE: { color: 'primary', label: 'Actualizar' },
      DELETE: { color: 'danger', label: 'Eliminar' },
      VIEW: { color: 'default', label: 'Ver' },
      EXPORT: { color: 'warning', label: 'Exportar' },
      LOGIN: { color: 'success', label: 'Inicio Sesión' },
      LOGOUT: { color: 'default', label: 'Cierre Sesión' },
      APPROVE: { color: 'success', label: 'Aprobar' },
      REJECT: { color: 'danger', label: 'Rechazar' },
      CANCEL: { color: 'warning', label: 'Cancelar' }
    };

    const cfg = config[action] || { color: 'default', label: action };
    return <Chip color={cfg.color} size="sm" variant="flat">{cfg.label}</Chip>;
  };

  const getModuleChip = (module: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
      eventos: 'primary',
      clientes: 'success',
      inventario: 'warning',
      contabilidad: 'secondary',
      sistema: 'danger'
    };

    return (
      <Chip color={colors[module] || 'default'} size="sm" variant="dot">
        {module}
      </Chip>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">Log de Auditoría</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="bordered"
              startContent={<RefreshCw className="w-4 h-4" />}
              onPress={loadLogs}
            >
              Actualizar
            </Button>
            <Button
              color="primary"
              startContent={<Download className="w-4 h-4" />}
              onPress={handleExport}
            >
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 w-full">
          <Select
            label="Acción"
            placeholder="Todas"
            className="max-w-[150px]"
            selectedKeys={filterAction ? [filterAction] : []}
            onSelectionChange={(keys) => setFilterAction(Array.from(keys)[0] as string || '')}
          >
            <SelectItem key="">Todas</SelectItem>
            <SelectItem key="CREATE">Crear</SelectItem>
            <SelectItem key="UPDATE">Actualizar</SelectItem>
            <SelectItem key="DELETE">Eliminar</SelectItem>
            <SelectItem key="VIEW">Ver</SelectItem>
            <SelectItem key="EXPORT">Exportar</SelectItem>
            <SelectItem key="LOGIN">Login</SelectItem>
            <SelectItem key="LOGOUT">Logout</SelectItem>
          </Select>

          <Select
            label="Módulo"
            placeholder="Todos"
            className="max-w-[150px]"
            selectedKeys={filterModule ? [filterModule] : []}
            onSelectionChange={(keys) => setFilterModule(Array.from(keys)[0] as string || '')}
          >
            <SelectItem key="">Todos</SelectItem>
            <SelectItem key="eventos">Eventos</SelectItem>
            <SelectItem key="clientes">Clientes</SelectItem>
            <SelectItem key="inventario">Inventario</SelectItem>
            <SelectItem key="contabilidad">Contabilidad</SelectItem>
            <SelectItem key="sistema">Sistema</SelectItem>
          </Select>

          <Input
            type="date"
            label="Desde"
            className="max-w-[150px]"
            value={filterFechaDesde}
            onValueChange={setFilterFechaDesde}
          />

          <Input
            type="date"
            label="Hasta"
            className="max-w-[150px]"
            value={filterFechaHasta}
            onValueChange={setFilterFechaHasta}
          />
        </div>
      </CardHeader>

      <Divider />

      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <Table aria-label="Logs de auditoría">
              <TableHeader>
                <TableColumn>FECHA</TableColumn>
                <TableColumn>USUARIO</TableColumn>
                <TableColumn>ACCIÓN</TableColumn>
                <TableColumn>MÓDULO</TableColumn>
                <TableColumn>ENTIDAD</TableColumn>
                <TableColumn>ID</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay registros de auditoría">
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="text-sm">{formatDate(log.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{log.user_email || log.user_name || 'Sistema'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getActionChip(log.action)}</TableCell>
                    <TableCell>{getModuleChip(log.module)}</TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{log.entity_type}</span>
                      {log.entity_name && (
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">
                          {log.entity_name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-gray-500">
                        {log.entity_id?.substring(0, 8) || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleViewDetails(log)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-center mt-4">
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </CardBody>

      {/* Modal de detalle */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>Detalle del Log</ModalHeader>
          <ModalBody>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Fecha y Hora</p>
                    <p className="font-medium">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Usuario</p>
                    <p className="font-medium">{selectedLog.user_email || selectedLog.user_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Acción</p>
                    {getActionChip(selectedLog.action)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Módulo</p>
                    {getModuleChip(selectedLog.module)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo de Entidad</p>
                    <p className="font-mono">{selectedLog.entity_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ID de Entidad</p>
                    <p className="font-mono text-sm">{selectedLog.entity_id || '-'}</p>
                  </div>
                </div>

                {selectedLog.ip_address && (
                  <div>
                    <p className="text-sm text-gray-500">IP</p>
                    <p className="font-mono text-sm">{selectedLog.ip_address}</p>
                  </div>
                )}

                {selectedLog.old_values && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Valores Anteriores</p>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_values && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Valores Nuevos</p>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Metadata</p>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onPress={onClose}>Cerrar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}

export default AuditLogViewer;
