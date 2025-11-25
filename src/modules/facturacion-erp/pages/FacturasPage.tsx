import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Select,
  SelectItem,
  Input
} from '@nextui-org/react';
import { Plus, Download, Send, XCircle, FileText, Search } from 'lucide-react';
import {
  useFacturas,
  useTimbrarFactura,
  useCancelarFactura,
  useDescargarXML,
  useDescargarPDF
} from '../hooks/useFacturacion';

export const FacturasPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const { data: facturas, isLoading } = useFacturas({
    status: statusFilter
  });

  const timbrarFactura = useTimbrarFactura();
  const cancelarFactura = useCancelarFactura();
  const descargarXML = useDescargarXML();
  const descargarPDF = useDescargarPDF();

  const handleTimbrar = async (facturaId: number) => {
    if (confirm('¿Está seguro de timbrar esta factura?')) {
      await timbrarFactura.mutateAsync(facturaId);
    }
  };

  const handleCancelar = async (facturaId: number) => {
    const motivo = prompt('Motivo de cancelación:');
    if (motivo) {
      await cancelarFactura.mutateAsync({ facturaId, motivo });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'timbrada':
        return 'success';
      case 'pendiente':
        return 'warning';
      case 'cancelada':
        return 'danger';
      case 'borrador':
        return 'default';
      case 'error':
        return 'danger';
      default:
        return 'default';
    }
  };

  const facturasFiltradas = facturas?.filter(f =>
    busqueda === '' ||
    f.serie.toLowerCase().includes(busqueda.toLowerCase()) ||
    f.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
    f.cliente?.razon_social?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Facturas</h1>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
          Nueva Factura
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Buscar factura..."
              value={busqueda}
              onValueChange={setBusqueda}
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              className="md:w-96"
            />

            <Select
              label="Estado"
              selectedKeys={statusFilter ? [statusFilter] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setStatusFilter(value);
              }}
              className="md:w-48"
            >
              <SelectItem key="" value="">
                Todos
              </SelectItem>
              <SelectItem key="borrador" value="borrador">
                Borrador
              </SelectItem>
              <SelectItem key="pendiente" value="pendiente">
                Pendientes
              </SelectItem>
              <SelectItem key="timbrada" value="timbrada">
                Timbradas
              </SelectItem>
              <SelectItem key="cancelada" value="cancelada">
                Canceladas
              </SelectItem>
              <SelectItem key="error" value="error">
                Error
              </SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Tabla de Facturas */}
      <Card>
        <CardBody>
          <Table aria-label="Facturas">
            <TableHeader>
              <TableColumn>FOLIO</TableColumn>
              <TableColumn>UUID</TableColumn>
              <TableColumn>CLIENTE</TableColumn>
              <TableColumn>FECHA</TableColumn>
              <TableColumn>SUBTOTAL</TableColumn>
              <TableColumn>IVA</TableColumn>
              <TableColumn>TOTAL</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} emptyContent="No hay facturas registradas">
              {(facturasFiltradas || []).map((factura: any) => (
                <TableRow key={factura.id}>
                  <TableCell className="font-mono">
                    {factura.serie}{factura.folio}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {factura.uuid ? factura.uuid.substring(0, 8) + '...' : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {factura.cliente?.razon_social || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(factura.fecha_emision).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell className="font-mono">
                    ${factura.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    ${factura.total_impuestos_trasladados.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    ${factura.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={getStatusColor(factura.status)}>
                      {factura.status.toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {factura.status === 'pendiente' && (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="success"
                          title="Timbrar"
                          onPress={() => handleTimbrar(factura.id)}
                          isLoading={timbrarFactura.isPending}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}

                      {factura.status === 'timbrada' && (
                        <>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="primary"
                            title="Descargar XML"
                            onPress={() => descargarXML.mutate(factura.id)}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="primary"
                            title="Descargar PDF"
                            onPress={() => descargarPDF.mutate(factura.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            title="Cancelar"
                            onPress={() => handleCancelar(factura.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
};
