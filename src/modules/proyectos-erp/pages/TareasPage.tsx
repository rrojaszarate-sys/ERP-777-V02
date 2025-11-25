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
import {
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  List,
  Columns,
  Search,
  Edit2,
  Trash2,
  Calendar
} from 'lucide-react';
import {
  useTareas,
  useDeleteTarea,
  useCreateTarea,
  useUpdateTarea,
  useUpdateTareaEtapa
} from '../hooks/useProyectos';
import { TareaModal } from '../components/TareaModal';
import { TareasKanbanPage } from './TareasKanbanPage';
import type { Tarea, Proyecto, EtapaTarea, Usuario, Hito } from '../types';
import toast from 'react-hot-toast';

type ViewMode = 'table' | 'kanban';

export const TareasPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [busqueda, setBusqueda] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [prioridadFilter, setPrioridadFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null);

  const { data: tareas, isLoading } = useTareas({
    status: statusFilter,
    prioridad: prioridadFilter,
    busqueda
  });

  const deleteTarea = useDeleteTarea();
  const createTarea = useCreateTarea();
  const updateTarea = useUpdateTarea();
  const updateTareaEtapa = useUpdateTareaEtapa();

  // Mock data - en producción estos vendrían de hooks
  const proyectos: Proyecto[] = [
    {
      id: 1,
      company_id: '1',
      nombre: 'Proyecto Demo',
      descripcion: 'Proyecto de demostración',
      codigo: 'DEMO-001',
      cliente_id: null,
      fecha_inicio: '2025-01-01',
      fecha_fin_estimada: '2025-12-31',
      fecha_fin_real: null,
      presupuesto: 100000,
      costo_real: 0,
      ingreso_estimado: 150000,
      ingreso_real: 0,
      progreso: 0,
      etapa_id: null,
      status: 'en_progreso',
      prioridad: 'alta',
      responsable_id: null,
      tipo_facturacion: 'precio_fijo',
      privado: false,
      favorito: false,
      color: null,
      created_at: '',
      updated_at: ''
    }
  ];

  const etapas: EtapaTarea[] = [
    { id: 1, company_id: '1', nombre: 'Por Hacer', descripcion: 'Tareas pendientes', color: '#6B7280', secuencia: 1, es_cerrado: false, fold: false, activo: true, created_at: '' },
    { id: 2, company_id: '1', nombre: 'En Progreso', descripcion: 'Tareas en desarrollo', color: '#3B82F6', secuencia: 2, es_cerrado: false, fold: false, activo: true, created_at: '' },
    { id: 3, company_id: '1', nombre: 'En Revisión', descripcion: 'Tareas en código review', color: '#F59E0B', secuencia: 3, es_cerrado: false, fold: false, activo: true, created_at: '' },
    { id: 4, company_id: '1', nombre: 'Pruebas', descripcion: 'Tareas en testing/QA', color: '#8B5CF6', secuencia: 4, es_cerrado: false, fold: false, activo: true, created_at: '' },
    { id: 5, company_id: '1', nombre: 'Completado', descripcion: 'Tareas finalizadas', color: '#10B981', secuencia: 5, es_cerrado: true, fold: false, activo: true, created_at: '' }
  ];

  const usuarios: Usuario[] = [
    { id: 'user-1', nombre: 'Admin Usuario', email: 'admin@example.com', avatar_url: null }
  ];

  const milestones: Hito[] = [];

  const handleCreate = () => {
    setSelectedTarea(null);
    setIsModalOpen(true);
  };

  const handleEdit = (tarea: Tarea) => {
    setSelectedTarea(tarea);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar esta tarea?')) {
      try {
        await deleteTarea.mutateAsync(id);
        toast.success('Tarea eliminada correctamente');
      } catch (error) {
        toast.error('Error al eliminar tarea');
        console.error(error);
      }
    }
  };

  const handleSaveTarea = async (data: Partial<Tarea>) => {
    try {
      if (selectedTarea) {
        await updateTarea.mutateAsync({ id: selectedTarea.id, data });
        toast.success('Tarea actualizada correctamente');
      } else {
        await createTarea.mutateAsync(data);
        toast.success('Tarea creada correctamente');
      }
      setIsModalOpen(false);
      setSelectedTarea(null);
    } catch (error) {
      toast.error(selectedTarea ? 'Error al actualizar tarea' : 'Error al crear tarea');
      console.error(error);
    }
  };

  const handleUpdateTareaEtapa = async (tareaId: number, nuevaEtapaId: number) => {
    try {
      await updateTareaEtapa.mutateAsync({ tareaId, etapaId: nuevaEtapaId });
      toast.success('Tarea movida correctamente');
    } catch (error) {
      toast.error('Error al mover tarea');
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'default';
      case 'en_progreso':
        return 'primary';
      case 'bloqueada':
        return 'warning';
      case 'completada':
        return 'success';
      case 'cancelada':
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

  // Si estamos en modo Kanban, renderizar el componente Kanban
  if (viewMode === 'kanban') {
    return (
      <div className="h-full">
        {/* Header con toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tareas</h1>
            <p className="text-gray-500 mt-1">Vista Kanban</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className="px-3 py-1.5 text-xs font-medium rounded transition-colors text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <List className="w-4 h-4" />
                Tabla
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className="px-3 py-1.5 text-xs font-medium rounded transition-colors bg-blue-600 text-white flex items-center gap-2"
              >
                <Columns className="w-4 h-4" />
                Kanban
              </button>
            </div>
          </div>
        </div>

        {/* Componente Kanban */}
        <TareasKanbanPage
          onEditTarea={handleEdit}
          onDeleteTarea={handleDelete}
          onCreateTarea={handleCreate}
          onUpdateTareaEtapa={handleUpdateTareaEtapa}
        />

        {/* Modal de Tarea */}
        <TareaModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTarea(null);
          }}
          onSave={handleSaveTarea}
          tarea={selectedTarea}
          proyectos={proyectos}
          etapas={etapas}
          usuarios={usuarios}
          milestones={milestones}
          tareasDisponibles={tareas || []}
        />
      </div>
    );
  }

  // Vista de tabla (por defecto)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tareas</h1>
          <p className="text-gray-500 mt-1">Gestión completa de tareas</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className="px-3 py-1.5 text-xs font-medium rounded transition-colors bg-blue-600 text-white flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              Tabla
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className="px-3 py-1.5 text-xs font-medium rounded transition-colors text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Columns className="w-4 h-4" />
              Kanban
            </button>
          </div>

          {/* New task button */}
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={handleCreate}
          >
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Resumen de Tareas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-gray-100">
              <Clock className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold">
                {tareas?.filter(t => t.status === 'pendiente').length || 0}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En Progreso</p>
              <p className="text-2xl font-bold">
                {tareas?.filter(t => t.status === 'en_progreso').length || 0}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completadas</p>
              <p className="text-2xl font-bold">
                {tareas?.filter(t => t.status === 'completada').length || 0}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bloqueadas</p>
              <p className="text-2xl font-bold">
                {tareas?.filter(t => t.status === 'bloqueada').length || 0}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Buscar tarea..."
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
              <SelectItem key="pendiente" value="pendiente">
                Pendiente
              </SelectItem>
              <SelectItem key="en_progreso" value="en_progreso">
                En Progreso
              </SelectItem>
              <SelectItem key="bloqueada" value="bloqueada">
                Bloqueada
              </SelectItem>
              <SelectItem key="completada" value="completada">
                Completada
              </SelectItem>
            </Select>

            <Select
              label="Prioridad"
              selectedKeys={prioridadFilter ? [prioridadFilter] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setPrioridadFilter(value);
              }}
              className="md:w-48"
            >
              <SelectItem key="" value="">
                Todas
              </SelectItem>
              <SelectItem key="baja" value="baja">
                Baja
              </SelectItem>
              <SelectItem key="media" value="media">
                Media
              </SelectItem>
              <SelectItem key="alta" value="alta">
                Alta
              </SelectItem>
              <SelectItem key="urgente" value="urgente">
                Urgente
              </SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Tabla de Tareas */}
      <Card>
        <CardBody>
          <Table aria-label="Tareas">
            <TableHeader>
              <TableColumn>TAREA</TableColumn>
              <TableColumn>PROYECTO</TableColumn>
              <TableColumn>FECHAS</TableColumn>
              <TableColumn>HORAS</TableColumn>
              <TableColumn>PROGRESO</TableColumn>
              <TableColumn>PRIORIDAD</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} emptyContent="No hay tareas registradas">
              {(tareas || []).map((tarea: any) => (
                <TableRow key={tarea.id}>
                  <TableCell>
                    <div>
                      <div className="font-semibold">{tarea.nombre}</div>
                      {tarea.descripcion && (
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {tarea.descripcion}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {tarea.proyecto?.nombre || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(tarea.fecha_inicio).toLocaleDateString('es-MX')}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(tarea.fecha_fin).toLocaleDateString('es-MX')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>
                        <span className="text-gray-500">Est:</span> {tarea.horas_estimadas}h
                      </div>
                      <div>
                        <span className="text-gray-500">Real:</span> {tarea.horas_reales}h
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 w-24">
                      <div className="flex items-center justify-between text-xs">
                        <span>{tarea.progreso}%</span>
                      </div>
                      <Progress
                        value={tarea.progreso}
                        color="primary"
                        size="sm"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={getPrioridadColor(tarea.prioridad)}>
                      {tarea.prioridad.toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={getStatusColor(tarea.status)}>
                      {tarea.status.replace('_', ' ').toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleEdit(tarea)}
                        title="Editar tarea"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleDelete(tarea.id)}
                        title="Eliminar tarea"
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

      {/* Modal de Tarea */}
      <TareaModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTarea(null);
        }}
        onSave={handleSaveTarea}
        tarea={selectedTarea}
        proyectos={proyectos}
        etapas={etapas}
        usuarios={usuarios}
        milestones={milestones}
        tareasDisponibles={tareas || []}
      />
    </div>
  );
};
