/**
 * PÁGINA DE PÓLIZAS CONTABLES
 * Lista y gestión de pólizas contables
 */

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  useDisclosure
} from '@nextui-org/react';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { usePolizas, useAplicarPoliza, useCancelarPoliza } from '../hooks/useContabilidad';
import { PolizaForm } from '../components/PolizaForm';
import type { Poliza } from '../types';

export const PolizasPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const { data: polizas, isLoading } = usePolizas({
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    tipo: tipoFilter,
    status: statusFilter
  });

  const aplicarPoliza = useAplicarPoliza();
  const cancelarPoliza = useCancelarPoliza();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedPoliza, setSelectedPoliza] = useState<Poliza | null>(null);

  const handleNuevaPoliza = () => {
    setSelectedPoliza(null);
    onOpen();
  };

  const handleAplicar = async (id: number) => {
    if (confirm('¿Deseas aplicar esta póliza? Una vez aplicada no podrá modificarse.')) {
      await aplicarPoliza.mutateAsync(id);
    }
  };

  const handleCancelar = async (id: number) => {
    const motivo = prompt('Ingresa el motivo de cancelación:');
    if (motivo) {
      await cancelarPoliza.mutateAsync({ id, motivo });
    }
  };

  const filteredPolizas = polizas?.filter(poliza => {
    const matchSearch = poliza.numero_poliza.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       poliza.concepto.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pólizas Contables</h1>
          <p className="text-gray-500 mt-1">
            Gestión de pólizas y movimientos contables
          </p>
        </div>
        <Button
          color="primary"
          size="lg"
          startContent={<Plus className="w-5 h-5" />}
          onPress={handleNuevaPoliza}
        >
          Nueva Póliza
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar póliza..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              isClearable
              onClear={() => setSearchTerm('')}
            />

            <Input
              label="Fecha Inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              startContent={<Calendar className="w-4 h-4" />}
            />

            <Input
              label="Fecha Fin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              startContent={<Calendar className="w-4 h-4" />}
            />

            <Select
              label="Tipo"
              placeholder="Todos"
              selectedKeys={tipoFilter ? [tipoFilter] : []}
              onChange={(e) => setTipoFilter(e.target.value)}
            >
              <SelectItem key="diario" value="diario">Diario</SelectItem>
              <SelectItem key="ingreso" value="ingreso">Ingreso</SelectItem>
              <SelectItem key="egreso" value="egreso">Egreso</SelectItem>
              <SelectItem key="ajuste" value="ajuste">Ajuste</SelectItem>
              <SelectItem key="cierre" value="cierre">Cierre</SelectItem>
            </Select>

            <Select
              label="Status"
              placeholder="Todos"
              selectedKeys={statusFilter ? [statusFilter] : []}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <SelectItem key="borrador" value="borrador">Borrador</SelectItem>
              <SelectItem key="aplicada" value="aplicada">Aplicada</SelectItem>
              <SelectItem key="cancelada" value="cancelada">Cancelada</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Tabla de Pólizas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h3 className="text-lg font-semibold">
              Listado de Pólizas ({filteredPolizas?.length || 0})
            </h3>
            <Button
              size="sm"
              variant="flat"
              startContent={<Filter className="w-4 h-4" />}
            >
              Más Filtros
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <Table aria-label="Pólizas" isStriped>
            <TableHeader>
              <TableColumn>NÚMERO</TableColumn>
              <TableColumn>FECHA</TableColumn>
              <TableColumn>TIPO</TableColumn>
              <TableColumn>CONCEPTO</TableColumn>
              <TableColumn>TOTAL DEBE</TableColumn>
              <TableColumn>TOTAL HABER</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              emptyContent="No se encontraron pólizas"
            >
              {(filteredPolizas || []).map((poliza) => (
                <TableRow key={poliza.id}>
                  <TableCell>
                    <span className="font-mono font-medium">{poliza.numero_poliza}</span>
                  </TableCell>
                  <TableCell>
                    {new Date(poliza.fecha).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color="primary">
                      {poliza.tipo.toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="line-clamp-2">{poliza.concepto}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-green-600">
                      ${poliza.total_debe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-blue-600">
                      ${poliza.total_haber.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      color={
                        poliza.status === 'aplicada' ? 'success' :
                        poliza.status === 'borrador' ? 'warning' :
                        'danger'
                      }
                      variant="flat"
                    >
                      {poliza.status === 'aplicada' ? 'Aplicada' :
                       poliza.status === 'borrador' ? 'Borrador' :
                       'Cancelada'}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Acciones de póliza">
                        <DropdownItem
                          key="view"
                          startContent={<Eye className="w-4 h-4" />}
                        >
                          Ver Detalle
                        </DropdownItem>
                        {poliza.status === 'borrador' && (
                          <>
                            <DropdownItem
                              key="edit"
                              startContent={<Edit className="w-4 h-4" />}
                            >
                              Editar
                            </DropdownItem>
                            <DropdownItem
                              key="apply"
                              startContent={<CheckCircle className="w-4 h-4" />}
                              color="success"
                              onPress={() => handleAplicar(poliza.id)}
                            >
                              Aplicar Póliza
                            </DropdownItem>
                          </>
                        )}
                        {poliza.status === 'aplicada' && (
                          <DropdownItem
                            key="cancel"
                            startContent={<XCircle className="w-4 h-4" />}
                            color="danger"
                            onPress={() => handleCancelar(poliza.id)}
                          >
                            Cancelar Póliza
                          </DropdownItem>
                        )}
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Modal de Formulario */}
      <PolizaForm
        isOpen={isOpen}
        onClose={onClose}
        poliza={selectedPoliza}
      />
    </div>
  );
};
