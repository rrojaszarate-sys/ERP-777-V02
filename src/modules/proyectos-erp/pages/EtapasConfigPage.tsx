import React, { useState } from 'react';
import { Card, CardBody, Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, Tabs, Tab, Spinner, Tooltip } from '@nextui-org/react';
import { Plus, Edit2, Trash2, GripVertical, Settings, Layers, CheckSquare, Save } from 'lucide-react';
import { useEtapasProyecto, useEtapasTarea, useCreateEtapaProyecto, useUpdateEtapaProyecto, useDeleteEtapaProyecto, useCreateEtapaTarea, useUpdateEtapaTarea, useDeleteEtapaTarea } from '../hooks/useProyectos';
import toast from 'react-hot-toast';

const PRESET_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

export const EtapasConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('proyecto');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<any>(null);
  const [formData, setFormData] = useState({ nombre: '', color: '#3B82F6', orden: 0 });

  const { data: etapasProyecto, isLoading: loadingProyecto } = useEtapasProyecto();
  const { data: etapasTarea, isLoading: loadingTarea } = useEtapasTarea();

  const createEtapaProyecto = useCreateEtapaProyecto();
  const updateEtapaProyecto = useUpdateEtapaProyecto();
  const deleteEtapaProyecto = useDeleteEtapaProyecto();
  const createEtapaTarea = useCreateEtapaTarea();
  const updateEtapaTarea = useUpdateEtapaTarea();
  const deleteEtapaTarea = useDeleteEtapaTarea();

  const etapas = activeTab === 'proyecto' ? etapasProyecto : etapasTarea;
  const isLoading = activeTab === 'proyecto' ? loadingProyecto : loadingTarea;

  const handleCreate = () => {
    const maxOrden = etapas?.reduce((max, e) => Math.max(max, e.orden), 0) || 0;
    setSelectedEtapa(null);
    setFormData({ nombre: '', color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)], orden: maxOrden + 1 });
    setIsModalOpen(true);
  };

  const handleEdit = (etapa: any) => {
    setSelectedEtapa(etapa);
    setFormData({ nombre: etapa.nombre, color: etapa.color, orden: etapa.orden });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta etapa? Las tareas/proyectos asociados podrían verse afectados.')) return;
    try {
      if (activeTab === 'proyecto') await deleteEtapaProyecto.mutateAsync(id);
      else await deleteEtapaTarea.mutateAsync(id);
      toast.success('Etapa eliminada');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    try {
      if (selectedEtapa) {
        if (activeTab === 'proyecto') await updateEtapaProyecto.mutateAsync({ id: selectedEtapa.id, data: formData });
        else await updateEtapaTarea.mutateAsync({ id: selectedEtapa.id, data: formData });
        toast.success('Etapa actualizada');
      } else {
        if (activeTab === 'proyecto') await createEtapaProyecto.mutateAsync(formData);
        else await createEtapaTarea.mutateAsync(formData);
        toast.success('Etapa creada');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Settings className="w-8 h-8" />Configuración de Etapas</h1>
          <p className="text-gray-500 mt-1">Define las etapas para proyectos y tableros Kanban</p>
        </div>
      </div>

      <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)} color="primary" variant="bordered" size="lg">
        <Tab key="proyecto" title={
          <div className="flex items-center gap-2"><Layers className="w-4 h-4" />Etapas de Proyecto</div>
        }>
          <Card className="mt-4"><CardBody>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Etapas de Proyecto</h3>
                <p className="text-sm text-gray-500">Define las fases por las que pasa un proyecto</p>
              </div>
              <Button color="primary" onPress={handleCreate} startContent={<Plus className="w-4 h-4" />}>Nueva Etapa</Button>
            </div>
            
            <div className="space-y-2">
              {(etapasProyecto || []).sort((a, b) => a.orden - b.orden).map((etapa) => (
                <div key={etapa.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="text-gray-400 cursor-move"><GripVertical className="w-5 h-5" /></div>
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: etapa.color }} />
                  <div className="flex-1">
                    <span className="font-medium">{etapa.nombre}</span>
                    <span className="text-sm text-gray-500 ml-2">Orden: {etapa.orden}</span>
                  </div>
                  <Chip size="sm" style={{ backgroundColor: etapa.color + '20', color: etapa.color }}>{etapa.nombre}</Chip>
                  <div className="flex gap-2">
                    <Tooltip content="Editar"><Button size="sm" variant="flat" isIconOnly onPress={() => handleEdit(etapa)}><Edit2 className="w-4 h-4" /></Button></Tooltip>
                    <Tooltip content="Eliminar"><Button size="sm" color="danger" variant="flat" isIconOnly onPress={() => handleDelete(etapa.id)}><Trash2 className="w-4 h-4" /></Button></Tooltip>
                  </div>
                </div>
              ))}
              {(!etapasProyecto || etapasProyecto.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay etapas de proyecto configuradas</p>
                  <Button color="primary" variant="flat" className="mt-4" onPress={handleCreate}>Crear primera etapa</Button>
                </div>
              )}
            </div>
          </CardBody></Card>
        </Tab>
        
        <Tab key="tarea" title={
          <div className="flex items-center gap-2"><CheckSquare className="w-4 h-4" />Columnas Kanban</div>
        }>
          <Card className="mt-4"><CardBody>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Columnas del Tablero Kanban</h3>
                <p className="text-sm text-gray-500">Define las columnas para el tablero de tareas</p>
              </div>
              <Button color="primary" onPress={handleCreate} startContent={<Plus className="w-4 h-4" />}>Nueva Columna</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(etapasTarea || []).sort((a, b) => a.orden - b.orden).map((etapa) => (
                <Card key={etapa.id} className="border-t-4" style={{ borderTopColor: etapa.color }}>
                  <CardBody>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{etapa.nombre}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="light" isIconOnly onPress={() => handleEdit(etapa)}><Edit2 className="w-3 h-3" /></Button>
                        <Button size="sm" color="danger" variant="light" isIconOnly onPress={() => handleDelete(etapa.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">Orden: {etapa.orden}</div>
                    <div className="mt-2 h-2 rounded" style={{ backgroundColor: etapa.color }} />
                  </CardBody>
                </Card>
              ))}
              {(!etapasTarea || etapasTarea.length === 0) && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay columnas Kanban configuradas</p>
                  <Button color="primary" variant="flat" className="mt-4" onPress={handleCreate}>Crear primera columna</Button>
                </div>
              )}
            </div>
          </CardBody></Card>
        </Tab>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-blue-50 border border-blue-200">
        <CardBody>
          <h4 className="font-semibold text-blue-800 mb-2">💡 Información</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Las <strong>Etapas de Proyecto</strong> definen las fases del ciclo de vida (Planificación → Ejecución → Cierre)</li>
            <li>• Las <strong>Columnas Kanban</strong> organizan las tareas en el tablero (Por hacer → En progreso → Completado)</li>
            <li>• Usa el <strong>orden</strong> para controlar la secuencia de las etapas</li>
            <li>• Los <strong>colores</strong> ayudan a identificar visualmente cada etapa</li>
          </ul>
        </CardBody>
      </Card>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalContent>
          <ModalHeader>{selectedEtapa ? 'Editar' : 'Nueva'} {activeTab === 'proyecto' ? 'Etapa' : 'Columna'}</ModalHeader>
          <ModalBody>
            <Input label="Nombre *" value={formData.nombre} onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))} placeholder={activeTab === 'proyecto' ? 'ej: En Ejecución' : 'ej: En Progreso'} />
            
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map(color => (
                  <button key={color} className={`w-8 h-8 rounded-full transition-transform ${formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`} style={{ backgroundColor: color }} onClick={() => setFormData(prev => ({ ...prev, color }))} />
                ))}
              </div>
              <Input type="color" value={formData.color} onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))} className="w-20" />
            </div>
            
            <Input type="number" label="Orden" value={formData.orden.toString()} onChange={(e) => setFormData(prev => ({ ...prev, orden: parseInt(e.target.value) || 0 }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button color="primary" onPress={handleSave} startContent={<Save className="w-4 h-4" />} isLoading={createEtapaProyecto.isPending || updateEtapaProyecto.isPending || createEtapaTarea.isPending || updateEtapaTarea.isPending}>Guardar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
