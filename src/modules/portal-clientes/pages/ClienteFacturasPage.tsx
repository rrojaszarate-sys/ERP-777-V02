/**
 * Página de Facturas del Portal de Clientes - FASE 5.2
 * Lista y descarga de facturas del cliente
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
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@nextui-org/react';
import {
  FileText,
  Download,
  Search,
  Filter,
  Eye,
  FileCode,
  FilePlus2,
  Calendar
} from 'lucide-react';
import { useClienteAuth } from '../context/ClienteAuthContext';
import { portalClienteService } from '../services/portalClienteService';
import type { FacturaCliente } from '../types';

export function ClienteFacturasPage() {
  const { cliente } = useClienteAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState<FacturaCliente[]>([]);
  const [selectedFactura, setSelectedFactura] = useState<FacturaCliente | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Paginación
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    if (cliente?.id) {
      loadFacturas();
    }
  }, [cliente?.id, statusFilter, fechaDesde, fechaHasta]);

  const loadFacturas = async () => {
    if (!cliente?.id) return;

    setLoading(true);
    try {
      const data = await portalClienteService.fetchFacturasCliente(cliente.id, {
        status: statusFilter || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined
      });
      setFacturas(data);
    } catch (err) {
      console.error('Error loading facturas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFactura = (factura: FacturaCliente) => {
    setSelectedFactura(factura);
    onOpen();
  };

  const handleDownloadXML = async (factura: FacturaCliente) => {
    if (!cliente?.id) return;
    await portalClienteService.descargarFacturaXML(factura.id, cliente.id);
  };

  const handleDownloadPDF = async (factura: FacturaCliente) => {
    if (!cliente?.id) return;
    await portalClienteService.descargarFacturaPDF(factura.id, cliente.id);
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
        return 'success';
      case 'pendiente':
        return 'warning';
      case 'cancelada':
        return 'danger';
      case 'pagada':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'timbrada':
        return 'Timbrada';
      case 'pendiente':
        return 'Pendiente';
      case 'cancelada':
        return 'Cancelada';
      case 'pagada':
        return 'Pagada';
      case 'borrador':
        return 'Borrador';
      default:
        return status;
    }
  };

  // Filtrar por búsqueda
  const facturasFiltradas = facturas.filter(f => {
    if (busqueda) {
      const search = busqueda.toLowerCase();
      return (
        f.serie?.toLowerCase().includes(search) ||
        f.folio?.toLowerCase().includes(search) ||
        f.uuid?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Paginación
  const pages = Math.ceil(facturasFiltradas.length / rowsPerPage);
  const items = facturasFiltradas.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis Facturas</h1>
          <p className="text-gray-500 mt-1">Consulte y descargue sus comprobantes fiscales</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Buscar por folio o UUID..."
              value={busqueda}
              onValueChange={setBusqueda}
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              className="max-w-xs"
            />

            <Select
              placeholder="Estado"
              selectedKeys={statusFilter ? [statusFilter] : []}
              onSelectionChange={(keys) =>
                setStatusFilter(Array.from(keys)[0] as string || '')
              }
              className="max-w-[150px]"
            >
              <SelectItem key="">Todos</SelectItem>
              <SelectItem key="timbrada">Timbradas</SelectItem>
              <SelectItem key="pendiente">Pendientes</SelectItem>
              <SelectItem key="cancelada">Canceladas</SelectItem>
              <SelectItem key="pagada">Pagadas</SelectItem>
            </Select>

            <Input
              type="date"
              label="Desde"
              placeholder="Fecha desde"
              value={fechaDesde}
              onValueChange={setFechaDesde}
              className="max-w-[160px]"
            />

            <Input
              type="date"
              label="Hasta"
              placeholder="Fecha hasta"
              value={fechaHasta}
              onValueChange={setFechaHasta}
              className="max-w-[160px]"
            />

            <Button
              variant="flat"
              onPress={() => {
                setBusqueda('');
                setStatusFilter('');
                setFechaDesde('');
                setFechaHasta('');
              }}
            >
              Limpiar
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Tabla de facturas */}
      <Card>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <Table aria-label="Facturas del cliente">
                <TableHeader>
                  <TableColumn>FOLIO</TableColumn>
                  <TableColumn>UUID</TableColumn>
                  <TableColumn>FECHA</TableColumn>
                  <TableColumn>SUBTOTAL</TableColumn>
                  <TableColumn>IVA</TableColumn>
                  <TableColumn>TOTAL</TableColumn>
                  <TableColumn>ESTADO</TableColumn>
                  <TableColumn>ACCIONES</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No hay facturas registradas">
                  {items.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell>
                        <span className="font-mono font-semibold">
                          {factura.serie}{factura.folio}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-gray-500">
                          {factura.uuid ? factura.uuid.substring(0, 8) + '...' : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(factura.fecha_emision)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{formatCurrency(factura.subtotal)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{formatCurrency(factura.iva)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold">{formatCurrency(factura.total)}</span>
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" color={getStatusColor(factura.status)}>
                          {getStatusLabel(factura.status)}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => handleViewFactura(factura)}
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {factura.status === 'timbrada' && (
                            <>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="primary"
                                onPress={() => handleDownloadXML(factura)}
                                title="Descargar XML"
                              >
                                <FileCode className="w-4 h-4" />
                              </Button>

                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => handleDownloadPDF(factura)}
                                title="Descargar PDF"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    total={pages}
                    page={page}
                    onChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Facturas</p>
              <p className="text-2xl font-bold">{facturas.length}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FilePlus2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Timbradas</p>
              <p className="text-2xl font-bold">
                {facturas.filter(f => f.status === 'timbrada').length}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Facturado</p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  facturas
                    .filter(f => f.status === 'timbrada')
                    .reduce((sum, f) => sum + f.total, 0)
                )}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Modal de detalle */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>
            Detalle de Factura {selectedFactura?.serie}{selectedFactura?.folio}
          </ModalHeader>
          <ModalBody>
            {selectedFactura && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Folio</p>
                    <p className="font-mono font-semibold">
                      {selectedFactura.serie}{selectedFactura.folio}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">UUID</p>
                    <p className="font-mono text-xs break-all">
                      {selectedFactura.uuid || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Emisión</p>
                    <p>{formatDate(selectedFactura.fecha_emision)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Timbrado</p>
                    <p>
                      {selectedFactura.fecha_timbrado
                        ? formatDate(selectedFactura.fecha_timbrado)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p>{selectedFactura.tipo_comprobante === 'I' ? 'Ingreso' : selectedFactura.tipo_comprobante}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <Chip color={getStatusColor(selectedFactura.status)}>
                      {getStatusLabel(selectedFactura.status)}
                    </Chip>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal:</span>
                      <span className="font-mono">{formatCurrency(selectedFactura.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">IVA:</span>
                      <span className="font-mono">{formatCurrency(selectedFactura.iva)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="font-mono text-primary">
                        {formatCurrency(selectedFactura.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {selectedFactura?.status === 'timbrada' && (
              <>
                <Button
                  color="primary"
                  variant="flat"
                  startContent={<FileCode className="w-4 h-4" />}
                  onPress={() => handleDownloadXML(selectedFactura)}
                >
                  Descargar XML
                </Button>
                <Button
                  color="danger"
                  startContent={<Download className="w-4 h-4" />}
                  onPress={() => handleDownloadPDF(selectedFactura)}
                >
                  Descargar PDF
                </Button>
              </>
            )}
            <Button variant="bordered" onPress={onClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default ClienteFacturasPage;
