import React, { useState, useMemo } from 'react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Progress,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea
} from '@nextui-org/react';
import {
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Filter,
  Edit2,
  Trash2,
  Flag
} from 'lucide-react';
import type { Hito, Proyecto, Tarea, Usuario } from '../types';
import toast from 'react-hot-toast';
import { format, isPast, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const MilestonesPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Hito | null>(null);
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    proyecto_id: '',
    nombre: '',
    descripcion: '',
    fecha_objetivo: '',
    responsable_id: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock data - en producción vendría de hooks
  const [milestones] = useState<Hito[]>([
    {
      id: 1,
      proyecto_id: 1,
      nombre: 'MVP Completado',
      descripcion: 'Versión mínima viable del producto lista para pruebas',
      fecha_objetivo: '2025-03-31',
      fecha_completado: null,
      completado: false,
      progreso: 65,
      responsable_id: 'user-1',
      created_at: '',
      updated_at: ''
    },
    {
      id: 2,
      proyecto_id: 1,
      nombre: 'Beta Pública',
      descripcion: 'Lanzamiento de versión beta para usuarios externos',
      fecha_objetivo: '2025-06-30',
      fecha_completado: null,
      completado: false,
      progreso: 20,
      responsable_id: 'user-1',
      created_at: '',
      updated_at: ''
    },
    {
      id: 3,
      proyecto_id: 1,
      nombre: 'Diseño Inicial',
      descripcion: 'Diseños de UI/UX aprobados por el cliente',
      fecha_objetivo: '2025-01-15',
      fecha_completado: '2025-01-14',
      completado: true,
      progreso: 100,
      responsable_id: 'user-1',
      created_at: '',
      updated_at: ''
    }
  ]);

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
      tipo_facturacion: 'tiempo_material',
      privado: false,
      favorito: false,
      color: null,
      created_at: '',
      updated_at: ''
    }
  ];

  const usuarios: Usuario[] = [
    { id: 'user-1', nombre: 'Admin Usuario', email: 'admin@example.com', avatar_url: null }
  ];

  // Filtrar milestones
  const milestonesFiltrados = useMemo(() => {
    let filtered = milestones;

    if (filtroProyecto) {
      filtered = filtered.filter(m => m.proyecto_id === Number(filtroProyecto));
    }

    if (filtroEstado === 'completado') {
      filtered = filtered.filter(m => m.completado);
    } else if (filtroEstado === 'pendiente') {
      filtered = filtered.filter(m => !m.completado);
    } else if (filtroEstado === 'retrasado') {
      filtered = filtered.filter(m => {
        if (m.completado) return false;
        const today = new Date();
        const targetDate = new Date(m.fecha_objetivo);
        return isPast(targetDate);
      });
    }

    // Ordenar por fecha objetivo
    return filtered.sort((a, b) => {
      const dateA = new Date(a.fecha_objetivo);
      const dateB = new Date(b.fecha_objetivo);
      return dateA.getTime() - dateB.getTime();
    });
  }, [milestones, filtroProyecto, filtroEstado]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = milestones.length;
    const completados = milestones.filter(m => m.completado).length;
    const pendientes = total - completados;
    const retrasados = milestones.filter(m => {
      if (m.completado) return false;
      const today = new Date();
      const targetDate = new Date(m.fecha_objetivo);
      return isPast(targetDate);
    }).length;
    const progresoPromedio = total > 0
      ? Math.round(milestones.reduce((sum, m) => sum + m.progreso, 0) / total)
      : 0;

    return {
      total,
      completados,
      pendientes,
      retrasados,
      progresoPromedio
    };
  }, [milestones]);

  const handleCreate = () => {
    setSelectedMilestone(null);
    setFormData({
      proyecto_id: '',
      nombre: '',
      descripcion: '',
      fecha_objetivo: '',
      responsable_id: ''
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (milestone: Hito) => {
    setSelectedMilestone(milestone);
    setFormData({
      proyecto_id: milestone.proyecto_id.toString(),
      nombre: milestone.nombre,
      descripcion: milestone.descripcion || '',
      fecha_objetivo: milestone.fecha_objetivo,
      responsable_id: milestone.responsable_id || ''
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este hito?')) {
      try {
        // await deleteMilestone.mutateAsync(id);
        toast.success('Hito eliminado correctamente');
      } catch (error) {
        toast.error('Error al eliminar hito');
        console.error(error);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.proyecto_id) {
      newErrors.proyecto_id = 'Debe seleccionar un proyecto';
    }

    if (!formData.fecha_objetivo) {
      newErrors.fecha_objetivo = 'La fecha objetivo es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const data = {
        proyecto_id: Number(formData.proyecto_id),
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        fecha_objetivo: formData.fecha_objetivo,
        responsable_id: formData.responsable_id || null
      };

      if (selectedMilestone) {
        // await updateMilestone.mutateAsync({ id: selectedMilestone.id, data });
        toast.success('Hito actualizado correctamente');
      } else {
        // await createMilestone.mutateAsync(data);
        toast.success('Hito creado correctamente');
      }

      setIsModalOpen(false);
      setSelectedMilestone(null);
    } catch (error) {
      toast.error('Error al guardar hito');
      console.error(error);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      // await completeMilestone.mutateAsync(id);
      toast.success('Hito marcado como completado');
    } catch (error) {
      toast.error('Error al completar hito');
      console.error(error);
    }
  };

  const getMilestoneStatus = (milestone: Hito) => {
    if (milestone.completado) {
      return {
        color: 'success',
        label: 'Completado',
        icon: CheckCircle
      };
    }

    const today = new Date();
    const targetDate = new Date(milestone.fecha_objetivo);
    const daysUntil = differenceInDays(targetDate, today);

    if (isPast(targetDate)) {
      return {
        color: 'danger',
        label: `Retrasado (${Math.abs(daysUntil)} días)`,
        icon: Clock
      };
    } else if (daysUntil <= 7) {
      return {
        color: 'warning',
        label: `Próximo (${daysUntil} días)`,
        icon: Clock
      };
    } else {
      return {
        color: 'primary',
        label: `En ${daysUntil} días`,
        icon: Target
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hitos (Milestones)</h1>
          <p className="text-gray-500 mt-1">Gestión de hitos y checkpoints del proyecto</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={handleCreate}
        >
          Nuevo Hito
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Flag className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Hitos</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completados</p>
              <p className="text-2xl font-bold">{stats.completados}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-100">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold">{stats.pendientes}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Retrasados</p>
              <p className="text-2xl font-bold">{stats.retrasados}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Progreso</p>
              <p className="text-2xl font-bold">{stats.progresoPromedio}%</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <Select
              label="Proyecto"
              selectedKeys={filtroProyecto ? [filtroProyecto] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setFiltroProyecto(value);
              }}
              className="md:w-64"
              startContent={<Filter className="w-4 h-4 text-gray-400" />}
            >
              <SelectItem key="" value="">Todos los proyectos</SelectItem>
              {proyectos.map(p => (
                <SelectItem key={p.id.toString()} value={p.id.toString()}>
                  {p.nombre}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Estado"
              selectedKeys={filtroEstado ? [filtroEstado] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setFiltroEstado(value);
              }}
              className="md:w-48"
            >
              <SelectItem key="" value="">Todos</SelectItem>
              <SelectItem key="completado" value="completado">Completados</SelectItem>
              <SelectItem key="pendiente" value="pendiente">Pendientes</SelectItem>
              <SelectItem key="retrasado" value="retrasado">Retrasados</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Timeline de Milestones */}
      <div className="space-y-4">
        {milestonesFiltrados.map((milestone, index) => {
          const status = getMilestoneStatus(milestone);
          const StatusIcon = status.icon;
          const proyecto = proyectos.find(p => p.id === milestone.proyecto_id);
          const responsable = usuarios.find(u => u.id === milestone.responsable_id);

          return (
            <Card key={milestone.id} className="hover:shadow-lg transition-shadow">
              <CardBody>
                <div className="flex items-start gap-4">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        milestone.completado
                          ? 'bg-green-100'
                          : isPast(new Date(milestone.fecha_objetivo))
                          ? 'bg-red-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      <StatusIcon
                        className={`w-6 h-6 ${
                          milestone.completado
                            ? 'text-green-600'
                            : isPast(new Date(milestone.fecha_objetivo))
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}
                      />
                    </div>
                    {index < milestonesFiltrados.length - 1 && (
                      <div className="w-0.5 h-16 bg-gray-200 mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold">{milestone.nombre}</h3>
                          <Chip
                            size="sm"
                            color={status.color as any}
                            variant="flat"
                            startContent={<StatusIcon className="w-3 h-3" />}
                          >
                            {status.label}
                          </Chip>
                        </div>

                        {milestone.descripcion && (
                          <p className="text-gray-600 text-sm mb-3">{milestone.descripcion}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Objetivo: {format(new Date(milestone.fecha_objetivo), 'dd MMM yyyy', { locale: es })}
                          </div>

                          {milestone.fecha_completado && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Completado: {format(new Date(milestone.fecha_completado), 'dd MMM yyyy', { locale: es })}
                            </div>
                          )}

                          {proyecto && (
                            <div className="flex items-center gap-1">
                              <Flag className="w-4 h-4" />
                              {proyecto.nombre}
                            </div>
                          )}

                          {responsable && (
                            <div className="flex items-center gap-1">
                              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                                {responsable.nombre.substring(0, 1)}
                              </div>
                              {responsable.nombre}
                            </div>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600">Progreso</span>
                            <span className="font-medium">{milestone.progreso}%</span>
                          </div>
                          <Progress
                            value={milestone.progreso}
                            color={milestone.completado ? 'success' : 'primary'}
                            size="sm"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {!milestone.completado && (
                          <Button
                            size="sm"
                            color="success"
                            variant="flat"
                            startContent={<CheckCircle className="w-4 h-4" />}
                            onPress={() => handleComplete(milestone.id)}
                          >
                            Completar
                          </Button>
                        )}
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleEdit(milestone)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleDelete(milestone.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}

        {milestonesFiltrados.length === 0 && (
          <Card>
            <CardBody className="text-center py-12">
              <Flag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No hay hitos registrados</p>
              <p className="text-gray-400 text-sm mt-1">
                Crea tu primer hito para comenzar a dar seguimiento
              </p>
              <Button
                color="primary"
                startContent={<Plus className="w-4 h-4" />}
                onPress={handleCreate}
                className="mt-4"
              >
                Nuevo Hito
              </Button>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Modal de hito */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
        <ModalContent>
          <ModalHeader>
            {selectedMilestone ? 'Editar Hito' : 'Nuevo Hito'}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Select
                label="Proyecto *"
                selectedKeys={formData.proyecto_id ? [formData.proyecto_id] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string;
                  setFormData(prev => ({ ...prev, proyecto_id: value }));
                }}
                isInvalid={!!errors.proyecto_id}
                errorMessage={errors.proyecto_id}
                isRequired
              >
                {proyectos.map(p => (
                  <SelectItem key={p.id.toString()} value={p.id.toString()}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </Select>

              <Input
                label="Nombre del Hito *"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: MVP Completado"
                isInvalid={!!errors.nombre}
                errorMessage={errors.nombre}
                isRequired
              />

              <Textarea
                label="Descripción"
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Describe este hito del proyecto..."
                rows={3}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Fecha Objetivo *"
                  value={formData.fecha_objetivo}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_objetivo: e.target.value }))}
                  isInvalid={!!errors.fecha_objetivo}
                  errorMessage={errors.fecha_objetivo}
                  isRequired
                />

                <Select
                  label="Responsable"
                  selectedKeys={formData.responsable_id ? [formData.responsable_id] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setFormData(prev => ({ ...prev, responsable_id: value }));
                  }}
                >
                  <SelectItem key="" value="">Sin asignar</SelectItem>
                  {usuarios.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
            >
              {selectedMilestone ? 'Actualizar' : 'Crear Hito'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
