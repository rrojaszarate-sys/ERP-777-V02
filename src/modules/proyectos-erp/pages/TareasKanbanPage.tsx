import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Calendar, Clock,
  ChevronDown, ChevronUp, MoreVertical, Edit2
} from 'lucide-react';
import { Button, Input, Select, SelectItem, Spinner } from '@nextui-org/react';
import { useTareas, useEtapasTarea, useUpdateTareaEtapa, useProyectos } from '../hooks/useProyectos';
import { TareaModal } from '../components/TareaModal';
import type { Tarea, EtapaTarea } from '../types';

// Etapas por defecto si no hay en BD
const etapasDefault: EtapaTarea[] = [
  { id: 1, company_id: '', nombre: 'Por Hacer', descripcion: 'Tareas pendientes', color: '#6B7280', secuencia: 1, es_cerrado: false, fold: false, activo: true, created_at: '' },
  { id: 2, company_id: '', nombre: 'En Progreso', descripcion: 'Tareas en desarrollo', color: '#3B82F6', secuencia: 2, es_cerrado: false, fold: false, activo: true, created_at: '' },
  { id: 3, company_id: '', nombre: 'En Revisión', descripcion: 'Tareas en código review', color: '#F59E0B', secuencia: 3, es_cerrado: false, fold: false, activo: true, created_at: '' },
  { id: 4, company_id: '', nombre: 'Pruebas', descripcion: 'Tareas en testing/QA', color: '#8B5CF6', secuencia: 4, es_cerrado: false, fold: false, activo: true, created_at: '' },
  { id: 5, company_id: '', nombre: 'Completado', descripcion: 'Tareas finalizadas', color: '#10B981', secuencia: 5, es_cerrado: true, fold: true, activo: true, created_at: '' }
];

interface KanbanColumn {
  etapa: EtapaTarea;
  tareas: Tarea[];
  isCollapsed: boolean;
}

export const TareasKanbanPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState<string>('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<number>>(new Set());
  const [draggedTask, setDraggedTask] = useState<Tarea | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null);

  // Hooks de datos reales
  const { data: etapasData, isLoading: loadingEtapas } = useEtapasTarea();
  const { data: tareasData, isLoading: loadingTareas } = useTareas({ 
    proyecto_id: filtroProyecto ? Number(filtroProyecto) : undefined 
  });
  const { data: proyectos } = useProyectos();
  const updateTareaEtapa = useUpdateTareaEtapa();

  // Usar etapas de BD o defaults
  const etapas = etapasData && etapasData.length > 0 ? etapasData : etapasDefault;
  const tareas = tareasData || [];

  // Organizar tareas por etapa
  const columnas: KanbanColumn[] = useMemo(() => {
    let tareasFiltradas = [...tareas];

    if (searchTerm) {
      tareasFiltradas = tareasFiltradas.filter(t =>
        t.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filtroPrioridad) {
      tareasFiltradas = tareasFiltradas.filter(t => t.prioridad === filtroPrioridad);
    }

    return etapas
      .sort((a, b) => a.secuencia - b.secuencia)
      .map(etapa => ({
        etapa,
        tareas: tareasFiltradas
          .filter(t => t.etapa_id === etapa.id)
          .sort((a, b) => (a.secuencia || 0) - (b.secuencia || 0)),
        isCollapsed: collapsedColumns.has(etapa.id)
      }));
  }, [etapas, tareas, searchTerm, filtroPrioridad, collapsedColumns]);

  const toggleColumnCollapse = (etapaId: number) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(etapaId)) {
        newSet.delete(etapaId);
      } else {
        newSet.add(etapaId);
      }
      return newSet;
    });
  };

  const handleDragStart = (e: React.DragEvent, tarea: Tarea) => {
    setDraggedTask(tarea);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, nuevaEtapaId: number) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.etapa_id === nuevaEtapaId) {
      setDraggedTask(null);
      return;
    }
    try {
      await updateTareaEtapa.mutateAsync({ tareaId: draggedTask.id, etapaId: nuevaEtapaId });
    } catch (error) {
      console.error('Error al actualizar etapa:', error);
    } finally {
      setDraggedTask(null);
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'baja': return 'bg-gray-100 text-gray-700';
      case 'media': return 'bg-blue-100 text-blue-700';
      case 'alta': return 'bg-orange-100 text-orange-700';
      case 'urgente': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleEditTarea = (tarea: Tarea) => {
    setSelectedTarea(tarea);
    setIsModalOpen(true);
  };

  const handleCreateTarea = () => {
    setSelectedTarea(null);
    setIsModalOpen(true);
  };

  const renderTareaCard = (tarea: Tarea) => {
    const checklist = tarea.checklist || [];
    const checklistCompleted = checklist.filter((item: any) => item.completado).length;
    const checklistTotal = checklist.length;
    const checklistProgress = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;

    return (
      <motion.div
        key={tarea.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        draggable
        onDragStart={(e: any) => handleDragStart(e, tarea)}
        className={`bg-white rounded-lg border-2 p-4 cursor-move hover:shadow-md transition-all ${
          draggedTask?.id === tarea.id ? 'opacity-50 border-blue-500' : 'border-gray-200'
        }`}
        style={tarea.color ? { borderLeftWidth: '4px', borderLeftColor: tarea.color } : {}}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-gray-900 text-sm flex-1 pr-2">{tarea.nombre}</h4>
          <div className="flex items-center gap-1">
            <button onClick={() => handleEditTarea(tarea)} className="text-gray-400 hover:text-blue-600 p-1">
              <Edit2 className="w-3 h-3" />
            </button>
            <button className="text-gray-400 hover:text-gray-600 p-1">
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        </div>

        {tarea.descripcion && <p className="text-xs text-gray-600 mb-3 line-clamp-2">{tarea.descripcion}</p>}

        {tarea.etiquetas && tarea.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tarea.etiquetas.slice(0, 3).map(etiqueta => (
              <span key={etiqueta} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                {etiqueta}
              </span>
            ))}
            {tarea.etiquetas.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                +{tarea.etiquetas.length - 3}
              </span>
            )}
          </div>
        )}

        {checklistTotal > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Checklist</span>
              <span className="font-medium text-gray-900">{checklistCompleted}/{checklistTotal}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${checklistProgress}%` }} />
            </div>
          </div>
        )}

        {tarea.progreso > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Progreso</span>
              <span className="font-medium text-gray-900">{tarea.progreso}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-600 h-1.5 rounded-full transition-all" style={{ width: `${tarea.progreso}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className={`px-2 py-0.5 rounded-full ${getPrioridadColor(tarea.prioridad)}`}>{tarea.prioridad}</span>
          {tarea.fecha_fin && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(tarea.fecha_fin).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
            </div>
          )}
          {tarea.horas_estimadas > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tarea.horas_estimadas}h
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (loadingEtapas || loadingTareas) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Cargando tablero...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tablero Kanban</h1>
          <p className="text-gray-500 mt-1">Vista de tareas por etapa</p>
        </div>
        <Button color="primary" onPress={handleCreateTarea} startContent={<Plus className="w-4 h-4" />}>
          Nueva Tarea
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="Buscar tareas..." value={searchTerm} onValueChange={setSearchTerm} startContent={<Search className="w-4 h-4 text-gray-400" />} />
          </div>
          <Select
            label="Proyecto"
            selectedKeys={filtroProyecto ? [filtroProyecto] : []}
            onSelectionChange={(keys) => setFiltroProyecto(Array.from(keys)[0] as string || '')}
            className="md:w-48"
          >
            {(proyectos || []).map((p) => (
              <SelectItem key={p.id.toString()} value={p.id.toString()}>{p.nombre}</SelectItem>
            ))}
          </Select>
          <Select
            label="Prioridad"
            selectedKeys={filtroPrioridad ? [filtroPrioridad] : []}
            onSelectionChange={(keys) => setFiltroPrioridad(Array.from(keys)[0] as string || '')}
            className="md:w-40"
          >
            <SelectItem key="baja" value="baja">Baja</SelectItem>
            <SelectItem key="media" value="media">Media</SelectItem>
            <SelectItem key="alta" value="alta">Alta</SelectItem>
            <SelectItem key="urgente" value="urgente">Urgente</SelectItem>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {columnas.map(({ etapa, tareas, isCollapsed }) => (
            <div
              key={etapa.id}
              className={`flex-shrink-0 ${isCollapsed ? 'w-16' : 'w-80'} bg-gray-50 rounded-lg transition-all`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, etapa.id)}
            >
              <div
                className="sticky top-0 z-10 bg-gray-100 rounded-t-lg p-4 border-b border-gray-200"
                style={{ borderTopColor: etapa.color, borderTopWidth: '3px' }}
              >
                <div className="flex items-center justify-between">
                  {!isCollapsed && (
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {etapa.nombre}
                        <span className="px-2 py-0.5 bg-white rounded-full text-xs text-gray-600">{tareas.length}</span>
                      </h3>
                    </div>
                  )}
                  <button onClick={() => toggleColumnCollapse(etapa.id)} className="text-gray-500 hover:text-gray-700 p-1">
                    {isCollapsed ? <ChevronDown className="w-4 h-4 transform -rotate-90" /> : <ChevronUp className="w-4 h-4 transform rotate-90" />}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {tareas.map(tarea => renderTareaCard(tarea))}
                  {tareas.length === 0 && <div className="text-center py-8 text-gray-400"><p className="text-sm">Sin tareas</p></div>}
                  <button
                    onClick={handleCreateTarea}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /><span className="text-sm">Agregar tarea</span>
                  </button>
                </div>
              )}

              {isCollapsed && (
                <div className="p-2">
                  <div className="flex flex-col items-center gap-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: etapa.color }}>
                      {tareas.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <TareaModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedTarea(null); }}
        tarea={selectedTarea}
        proyectoId={filtroProyecto ? Number(filtroProyecto) : undefined}
      />
    </div>
  );
};
