import React, { useState, useMemo } from 'react';
import { Card, CardBody, Button, Input, Select, SelectItem, Chip, Progress, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea, Spinner } from '@nextui-org/react';
import { Plus, Calendar, CheckCircle, Clock, Target, Edit2, Trash2, Flag } from 'lucide-react';
import { useMilestones, useProyectos, useCreateMilestone, useUpdateMilestone, useDeleteMilestone, useCompleteMilestone } from '../hooks/useProyectos';
import toast from 'react-hot-toast';
import { format, isPast, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const MilestonesPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [formData, setFormData] = useState({
    proyecto_id: '', nombre: '', descripcion: '', fecha_objetivo: '', responsable_id: ''
  });

  const { data: proyectos } = useProyectos();
  const { data: milestonesData, isLoading } = useMilestones(filtroProyecto ? Number(filtroProyecto) : undefined);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const completeMilestone = useCompleteMilestone();

  const milestones = milestonesData || [];

  const milestonesFiltrados = useMemo(() => {
    let filtered = milestones;
    if (filtroEstado === 'completado') filtered = filtered.filter(m => m.completado);
    else if (filtroEstado === 'pendiente') filtered = filtered.filter(m => !m.completado);
    else if (filtroEstado === 'retrasado') {
      filtered = filtered.filter(m => !m.completado && isPast(new Date(m.fecha_objetivo)));
    }
    return filtered.sort((a, b) => new Date(a.fecha_objetivo).getTime() - new Date(b.fecha_objetivo).getTime());
  }, [milestones, filtroEstado]);

  const stats = useMemo(() => {
    const total = milestones.length;
    const completados = milestones.filter(m => m.completado).length;
    const retrasados = milestones.filter(m => !m.completado && isPast(new Date(m.fecha_objetivo))).length;
    const progresoPromedio = total > 0 ? Math.round(milestones.reduce((sum, m) => sum + m.progreso, 0) / total) : 0;
    return { total, completados, pendientes: total - completados, retrasados, progresoPromedio };
  }, [milestones]);

  const handleCreate = () => {
    setSelectedMilestone(null);
    setFormData({ proyecto_id: '', nombre: '', descripcion: '', fecha_objetivo: '', responsable_id: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (milestone: any) => {
    setSelectedMilestone(milestone);
    setFormData({
      proyecto_id: milestone.proyecto_id.toString(),
      nombre: milestone.nombre,
      descripcion: milestone.descripcion || '',
      fecha_objetivo: milestone.fecha_objetivo,
      responsable_id: milestone.responsable_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar este hito?')) {
      try {
        await deleteMilestone.mutateAsync(id);
        toast.success('Hito eliminado');
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await completeMilestone.mutateAsync(id);
      toast.success('Hito completado');
    } catch (error) {
      toast.error('Error al completar');
    }
  };

  const handleSave = async () => {
    if (!formData.proyecto_id || !formData.nombre || !formData.fecha_objetivo) {
      toast.error('Complete los campos requeridos');
      return;
    }
    try {
      const data = {
        proyecto_id: Number(formData.proyecto_id),
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        fecha_objetivo: formData.fecha_objetivo,
        responsable_id: formData.responsable_id || null
      };
      if (selectedMilestone) {
        await updateMilestone.mutateAsync({ id: selectedMilestone.id, data });
        toast.success('Hito actualizado');
      } else {
        await createMilestone.mutateAsync(data);
        toast.success('Hito creado');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const getStatusChip = (milestone: any) => {
    if (milestone.completado) return <Chip color="success" size="sm" startContent={<CheckCircle className="w-3 h-3" />}>Completado</Chip>;
    const daysUntil = differenceInDays(new Date(milestone.fecha_objetivo), new Date());
    if (daysUntil < 0) return <Chip color="danger" size="sm">Retrasado {Math.abs(daysUntil)}d</Chip>;
    if (daysUntil <= 7) return <Chip color="warning" size="sm">Próximo ({daysUntil}d)</Chip>;
    return <Chip color="primary" size="sm">En {daysUntil} días</Chip>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Milestones / Hitos</h1>
          <p className="text-gray-500 mt-1">Gestión de hitos del proyecto</p>
        </div>
        <Button color="primary" onPress={handleCreate} startContent={<Plus className="w-4 h-4" />}>Nuevo Hito</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-100"><Target className="w-6 h-6 text-blue-600" /></div>
          <div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
        </CardBody></Card>
        <Card><CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-lg bg-green-100"><CheckCircle className="w-6 h-6 text-green-600" /></div>
          <div><p className="text-sm text-gray-500">Completados</p><p className="text-2xl font-bold">{stats.completados}</p></div>
        </CardBody></Card>
        <Card><CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-lg bg-yellow-100"><Clock className="w-6 h-6 text-yellow-600" /></div>
          <div><p className="text-sm text-gray-500">Pendientes</p><p className="text-2xl font-bold">{stats.pendientes}</p></div>
        </CardBody></Card>
        <Card><CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-lg bg-red-100"><Flag className="w-6 h-6 text-red-600" /></div>
          <div><p className="text-sm text-gray-500">Retrasados</p><p className="text-2xl font-bold">{stats.retrasados}</p></div>
        </CardBody></Card>
        <Card><CardBody className="flex flex-row items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-100"><Target className="w-6 h-6 text-purple-600" /></div>
          <div><p className="text-sm text-gray-500">Progreso Prom.</p><p className="text-2xl font-bold">{stats.progresoPromedio}%</p></div>
        </CardBody></Card>
      </div>

      {/* Filters */}
      <Card><CardBody>
        <div className="flex flex-col md:flex-row gap-4">
          <Select label="Proyecto" selectedKeys={filtroProyecto ? [filtroProyecto] : []} onSelectionChange={(keys) => setFiltroProyecto(Array.from(keys)[0] as string || '')} className="md:w-48">
            {(proyectos || []).map(p => <SelectItem key={p.id.toString()} value={p.id.toString()}>{p.nombre}</SelectItem>)}
          </Select>
          <Select label="Estado" selectedKeys={filtroEstado ? [filtroEstado] : []} onSelectionChange={(keys) => setFiltroEstado(Array.from(keys)[0] as string || '')} className="md:w-40">
            <SelectItem key="pendiente" value="pendiente">Pendientes</SelectItem>
            <SelectItem key="completado" value="completado">Completados</SelectItem>
            <SelectItem key="retrasado" value="retrasado">Retrasados</SelectItem>
          </Select>
        </div>
      </CardBody></Card>

      {/* Timeline */}
      <div className="space-y-4">
        {milestonesFiltrados.map((milestone, index) => (
          <Card key={milestone.id} className="relative">
            <CardBody>
              <div className="flex items-start gap-4">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full ${milestone.completado ? 'bg-green-500' : isPast(new Date(milestone.fecha_objetivo)) ? 'bg-red-500' : 'bg-blue-500'}`} />
                  {index < milestonesFiltrados.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-2" />}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{milestone.nombre}</h3>
                      <p className="text-sm text-gray-500">{proyectos?.find(p => p.id === milestone.proyecto_id)?.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusChip(milestone)}
                      {!milestone.completado && (
                        <Button size="sm" color="success" variant="flat" onPress={() => handleComplete(milestone.id)}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="flat" isIconOnly onPress={() => handleEdit(milestone)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" color="danger" variant="flat" isIconOnly onPress={() => handleDelete(milestone.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  
                  {milestone.descripcion && <p className="text-gray-600 mt-2">{milestone.descripcion}</p>}
                  
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(milestone.fecha_objetivo), 'dd MMM yyyy', { locale: es })}
                    </div>
                  </div>
                  
                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Progreso</span>
                      <span className="font-medium">{milestone.progreso}%</span>
                    </div>
                    <Progress value={milestone.progreso} color={milestone.completado ? 'success' : 'primary'} size="sm" />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
        
        {milestonesFiltrados.length === 0 && (
          <Card><CardBody className="text-center py-12 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay hitos para mostrar</p>
            <Button color="primary" variant="flat" className="mt-4" onPress={handleCreate}>Crear primer hito</Button>
          </CardBody></Card>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
        <ModalContent>
          <ModalHeader>{selectedMilestone ? 'Editar Hito' : 'Nuevo Hito'}</ModalHeader>
          <ModalBody>
            <Select label="Proyecto *" selectedKeys={formData.proyecto_id ? [formData.proyecto_id] : []} onSelectionChange={(keys) => setFormData(prev => ({ ...prev, proyecto_id: Array.from(keys)[0] as string || '' }))}>
              {(proyectos || []).map(p => <SelectItem key={p.id.toString()} value={p.id.toString()}>{p.nombre}</SelectItem>)}
            </Select>
            <Input label="Nombre *" value={formData.nombre} onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))} />
            <Textarea label="Descripción" value={formData.descripcion} onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))} />
            <Input type="date" label="Fecha Objetivo *" value={formData.fecha_objetivo} onChange={(e) => setFormData(prev => ({ ...prev, fecha_objetivo: e.target.value }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button color="primary" onPress={handleSave} isLoading={createMilestone.isPending || updateMilestone.isPending}>Guardar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
