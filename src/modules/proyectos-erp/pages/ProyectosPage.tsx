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
  Progress,
  Select,
  SelectItem,
  Input
} from '@nextui-org/react';
import { Plus, Search, Edit2, Trash2, Calendar, BarChart3, Eye } from 'lucide-react';
import { useProyectos, useDeleteProyecto, useCreateProyecto, useUpdateProyecto } from '../hooks/useProyectos';
import { ProyectoModal } from '../components/ProyectoModal';
import type { Proyecto, EtapaProyecto, Cliente, Usuario } from '../types';
import toast from 'react-hot-toast';

export const ProyectosPage: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState<Proyecto | null>(null);

  const { data: proyectos, isLoading } = useProyectos({
    status: statusFilter,
    busqueda
  });

  const deleteProyecto = useDeleteProyecto();
  const createProyecto = useCreateProyecto();
  const updateProyecto = useUpdateProyecto();

  // Mock data - en producción estos vendrían de hooks
  const etapas: EtapaProyecto[] = [
    { id: 1, company_id: '1', nombre: 'Nuevo', descripcion: 'Proyecto recién creado', color: '#6B7280', secuencia: 1, es_final: false, activo: true, created_at: '' },
    { id: 2, company_id: '1', nombre: 'En Análisis', descripcion: 'En fase de análisis', color: '#3B82F6', secuencia: 2, es_final: false, activo: true, created_at: '' },
    { id: 3, company_id: '1', nombre: 'En Desarrollo', descripcion: 'Desarrollo en curso', color: '#8B5CF6', secuencia: 3, es_final: false, activo: true, created_at: '' },
    { id: 4, company_id: '1', nombre: 'Entregado', descripcion: 'Proyecto entregado', color: '#10B981', secuencia: 4, es_final: true, activo: true, created_at: '' }
  ];

  const clientes: Cliente[] = [
    { id: 1, razon_social: 'Empresa Demo S.A.', rfc: 'EDM123456XXX', email: 'contacto@demo.com', telefono: '5551234567' }
  ];

  const usuarios: Usuario[] = [
    { id: 'user-1', nombre: 'Admin Usuario', email: 'admin@example.com', avatar_url: null }
  ];

  const handleCreate = () => {
    setSelectedProyecto(null);
    setIsModalOpen(true);
  };

  const handleEdit = (proyecto: Proyecto) => {
    setSelectedProyecto(proyecto);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este proyecto?')) {
      try {
        await deleteProyecto.mutateAsync(id);
        toast.success('Proyecto eliminado correctamente');
      } catch (error) {
        toast.error('Error al eliminar proyecto');
        console.error(error);
      }
    }
  };

  const handleSaveProyecto = async (data: Partial<Proyecto>) => {
    try {
      if (selectedProyecto) {
        await updateProyecto.mutateAsync({ id: selectedProyecto.id, data });
        toast.success('Proyecto actualizado correctamente');
      } else {
        await createProyecto.mutateAsync(data);
        toast.success('Proyecto creado correctamente');
      }
      setIsModalOpen(false);
      setSelectedProyecto(null);
    } catch (error) {
      toast.error(selectedProyecto ? 'Error al actualizar proyecto' : 'Error al crear proyecto');
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planificacion':
        return 'default';
      case 'en_progreso':
        return 'primary';
      case 'pausado':
        return 'warning';
      case 'completado':
        return 'success';
      case 'cancelado':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'baja':
        return 'default';
      case 'media':
        return 'primary';
      case 'alta':
        return 'warning';
      case 'urgente':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proyectos</h1>
          <p className="text-gray-500 mt-1">Gestión completa de proyectos</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={handleCreate}
        >
          Nuevo Proyecto
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Buscar proyecto..."
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
              <SelectItem key="planificacion" value="planificacion">
                Planificación
              </SelectItem>
              <SelectItem key="en_progreso" value="en_progreso">
                En Progreso
              </SelectItem>
              <SelectItem key="pausado" value="pausado">
                Pausado
              </SelectItem>
              <SelectItem key="completado" value="completado">
                Completado
              </SelectItem>
              <SelectItem key="cancelado" value="cancelado">
                Cancelado
              </SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Tabla de Proyectos */}
      <Card>
        <CardBody>
          <Table aria-label="Proyectos">
            <TableHeader>
              <TableColumn>NOMBRE</TableColumn>
              <TableColumn>CLIENTE</TableColumn>
              <TableColumn>FECHAS</TableColumn>
              <TableColumn>PROGRESO</TableColumn>
              <TableColumn>PRESUPUESTO</TableColumn>
              <TableColumn>PRIORIDAD</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} emptyContent="No hay proyectos registrados">
              {(proyectos || []).map((proyecto: any) => (
                <TableRow key={proyecto.id}>
                  <TableCell>
                    <div>
                      <div className="font-semibold">{proyecto.nombre}</div>
                      {proyecto.descripcion && (
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {proyecto.descripcion}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {proyecto.cliente?.razon_social || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(proyecto.fecha_inicio).toLocaleDateString('es-MX')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(proyecto.fecha_fin_estimada).toLocaleDateString('es-MX')}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 w-32">
                      <div className="flex items-center justify-between text-xs">
                        <span>{proyecto.progreso}%</span>
                      </div>
                      <Progress
                        value={proyecto.progreso}
                        color="primary"
                        size="sm"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    ${proyecto.presupuesto.toLocaleString('es-MX', {
                      minimumFractionDigits: 0
                    })}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={getPrioridadColor(proyecto.prioridad)}>
                      {proyecto.prioridad.toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={getStatusColor(proyecto.status)}>
                      {proyecto.status.replace('_', ' ').toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleEdit(proyecto)}
                        title="Editar proyecto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleDelete(proyecto.id)}
                        title="Eliminar proyecto"
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

      {/* Modal de Proyecto */}
      <ProyectoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProyecto(null);
        }}
        onSave={handleSaveProyecto}
        proyecto={selectedProyecto}
        etapas={etapas}
        clientes={clientes}
        usuarios={usuarios}
      />
    </div>
  );
};
