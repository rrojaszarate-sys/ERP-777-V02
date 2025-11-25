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
  Input,
  Select,
  SelectItem
} from '@nextui-org/react';
import { Plus, Search, Edit2, Trash2, UserPlus } from 'lucide-react';
import { useEmpleados, useDepartamentos, useDeleteEmpleado } from '../hooks/useRRHH';

export const EmpleadosPage: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [statusFilter, setStatusFilter] = useState('activo');
  const [departamentoFilter, setDepartamentoFilter] = useState<number | undefined>();

  const { data: empleados, isLoading } = useEmpleados({
    busqueda,
    status: statusFilter,
    departamento: departamentoFilter
  });

  const { data: departamentos } = useDepartamentos();
  const deleteEmpleado = useDeleteEmpleado();

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este empleado?')) {
      await deleteEmpleado.mutateAsync(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo':
        return 'success';
      case 'baja':
        return 'danger';
      case 'suspendido':
        return 'warning';
      case 'vacaciones':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Empleados</h1>
        <Button color="primary" startContent={<UserPlus className="w-4 h-4" />}>
          Nuevo Empleado
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Buscar empleado..."
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
              <SelectItem key="activo" value="activo">
                Activos
              </SelectItem>
              <SelectItem key="baja" value="baja">
                Bajas
              </SelectItem>
              <SelectItem key="suspendido" value="suspendido">
                Suspendidos
              </SelectItem>
              <SelectItem key="vacaciones" value="vacaciones">
                Vacaciones
              </SelectItem>
            </Select>

            <Select
              label="Departamento"
              selectedKeys={departamentoFilter ? [departamentoFilter.toString()] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setDepartamentoFilter(value ? parseInt(value) : undefined);
              }}
              className="md:w-64"
            >
              <SelectItem key="" value="">
                Todos
              </SelectItem>
              {(departamentos || []).map((dept) => (
                <SelectItem key={dept.id.toString()} value={dept.id.toString()}>
                  {dept.nombre}
                </SelectItem>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Tabla de Empleados */}
      <Card>
        <CardBody>
          <Table aria-label="Empleados">
            <TableHeader>
              <TableColumn>NÚMERO</TableColumn>
              <TableColumn>NOMBRE</TableColumn>
              <TableColumn>DEPARTAMENTO</TableColumn>
              <TableColumn>PUESTO</TableColumn>
              <TableColumn>FECHA INGRESO</TableColumn>
              <TableColumn>SALARIO</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} emptyContent="No hay empleados registrados">
              {(empleados || []).map((empleado: any) => (
                <TableRow key={empleado.id}>
                  <TableCell className="font-mono">{empleado.numero_empleado}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-semibold">
                        {empleado.nombre} {empleado.apellido_paterno} {empleado.apellido_materno}
                      </div>
                      <div className="text-xs text-gray-500">{empleado.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{empleado.departamento?.nombre || '-'}</TableCell>
                  <TableCell>{empleado.puesto?.nombre || '-'}</TableCell>
                  <TableCell>
                    {new Date(empleado.fecha_ingreso).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell className="font-mono">
                    ${empleado.salario_base.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={getStatusColor(empleado.status)}>
                      {empleado.status.toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => console.log('Editar', empleado.id)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleDelete(empleado.id)}
                      >
                        <Trash2 className="w-4 h-4" />
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
