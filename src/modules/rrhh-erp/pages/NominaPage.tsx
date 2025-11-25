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
  SelectItem
} from '@nextui-org/react';
import { Plus, FileText, Download, Send } from 'lucide-react';
import { usePeriodosNomina } from '../hooks/useRRHH';

export const NominaPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [añoFilter, setAñoFilter] = useState(currentYear);
  const [tipoFilter, setTipoFilter] = useState('');

  const { data: periodos, isLoading } = usePeriodosNomina({
    año: añoFilter,
    tipo: tipoFilter
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'abierto':
        return 'default';
      case 'procesado':
        return 'primary';
      case 'timbrado':
        return 'success';
      case 'pagado':
        return 'success';
      case 'cancelado':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'semanal':
        return 'primary';
      case 'quincenal':
        return 'secondary';
      case 'mensual':
        return 'success';
      case 'extraordinaria':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Períodos de Nómina</h1>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
          Nuevo Período
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <Select
              label="Año"
              selectedKeys={[añoFilter.toString()]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setAñoFilter(parseInt(value));
              }}
              className="md:w-48"
            >
              <SelectItem key={(currentYear - 1).toString()} value={(currentYear - 1).toString()}>
                {currentYear - 1}
              </SelectItem>
              <SelectItem key={currentYear.toString()} value={currentYear.toString()}>
                {currentYear}
              </SelectItem>
              <SelectItem key={(currentYear + 1).toString()} value={(currentYear + 1).toString()}>
                {currentYear + 1}
              </SelectItem>
            </Select>

            <Select
              label="Tipo de Nómina"
              selectedKeys={tipoFilter ? [tipoFilter] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setTipoFilter(value);
              }}
              className="md:w-64"
            >
              <SelectItem key="" value="">
                Todos
              </SelectItem>
              <SelectItem key="semanal" value="semanal">
                Semanal
              </SelectItem>
              <SelectItem key="quincenal" value="quincenal">
                Quincenal
              </SelectItem>
              <SelectItem key="mensual" value="mensual">
                Mensual
              </SelectItem>
              <SelectItem key="extraordinaria" value="extraordinaria">
                Extraordinaria
              </SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Tabla de Períodos */}
      <Card>
        <CardBody>
          <Table aria-label="Períodos de Nómina">
            <TableHeader>
              <TableColumn>PERÍODO</TableColumn>
              <TableColumn>TIPO</TableColumn>
              <TableColumn>FECHA INICIO</TableColumn>
              <TableColumn>FECHA FIN</TableColumn>
              <TableColumn>FECHA PAGO</TableColumn>
              <TableColumn>PERCEPCIONES</TableColumn>
              <TableColumn>DEDUCCIONES</TableColumn>
              <TableColumn>NETO</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} emptyContent="No hay períodos de nómina">
              {(periodos || []).map((periodo: any) => (
                <TableRow key={periodo.id}>
                  <TableCell className="font-mono">
                    {periodo.numero_periodo.toString().padStart(2, '0')}/{periodo.año}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={getTipoColor(periodo.tipo_nomina)}>
                      {periodo.tipo_nomina.toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {new Date(periodo.fecha_inicio).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>
                    {new Date(periodo.fecha_fin).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>
                    {new Date(periodo.fecha_pago).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell className="font-mono text-green-600">
                    ${periodo.total_percepciones.toLocaleString('es-MX', {
                      minimumFractionDigits: 2
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-red-600">
                    ${periodo.total_deducciones.toLocaleString('es-MX', {
                      minimumFractionDigits: 2
                    })}
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    ${periodo.total_neto.toLocaleString('es-MX', {
                      minimumFractionDigits: 2
                    })}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={getStatusColor(periodo.status)}>
                      {periodo.status.toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        title="Ver recibos"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="success"
                        title="Timbrar"
                        isDisabled={periodo.status !== 'procesado'}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="primary"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
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
