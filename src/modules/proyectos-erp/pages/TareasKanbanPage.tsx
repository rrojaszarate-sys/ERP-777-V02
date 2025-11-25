import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, User, Calendar, Clock, Tag,
  ChevronDown, ChevronUp, MoreVertical, Edit2, Trash2
} from 'lucide-react';
import type { Tarea, EtapaTarea, Proyecto } from '../types';

interface KanbanColumn {
  etapa: EtapaTarea;
  tareas: Tarea[];
  isCollapsed: boolean;
}

interface TareasKanbanPageProps {
  proyectoId?: number;
  onEditTarea: (tarea: Tarea) => void;
  onDeleteTarea: (id: number) => void;
  onCreateTarea: () => void;
  onUpdateTareaEtapa: (tareaId: number, nuevaEtapaId: number) => Promise<void>;
}

export const TareasKanbanPage: React.FC<TareasKanbanPageProps> = ({
  proyectoId,
  onEditTarea,
  onDeleteTarea,
  onCreateTarea,
  onUpdateTareaEtapa
}) => {
  // Mock data - en producción vendría de hooks
  const [etapas] = useState<EtapaTarea[]>([
    { id: 1, company_id: '1', nombre: 'Por Hacer', descripcion: 'Tareas pendientes', color: '#6B7280', secuencia: 1, es_cerrado: false, fold: false, activo: true, created_at: '' },
    { id: 2, company_id: '1', nombre: 'En Progreso', descripcion: 'Tareas en desarrollo', color: '#3B82F6', secuencia: 2, es_cerrado: false, fold: false, activo: true, created_at: '' },
    { id: 3, company_id: '1', nombre: 'En Revisión', descripcion: 'Tareas en código review', color: '#F59E0B', secuencia: 3, es_cerrado: false, fold: false, activo: true, created_at: '' },
    { id: 4, company_id: '1', nombre: 'Pruebas', descripcion: 'Tareas en testing/QA', color: '#8B5CF6', secuencia: 4, es_cerrado: false, fold: false, activo: true, created_at: '' },
    { id: 5, company_id: '1', nombre: 'Completado', descripcion: 'Tareas finalizadas', color: '#10B981', secuencia: 5, es_cerrado: true, fold: true, activo: true, created_at: '' }
  ]);

  const [tareas] = useState<Tarea[]>([
    {
      id: 1,
      proyecto_id: 1,
      tarea_padre_id: null,
      nombre: 'Implementar autenticación',
      descripcion: 'Implementar sistema de autenticación con JWT',
      fecha_inicio: '2025-01-15',
      fecha_fin: '2025-01-20',
      fecha_inicio_real: null,
      fecha_fin_real: null,
      horas_estimadas: 8,
      horas_reales: 0,
      horas_facturables: 8,
      progreso: 0,
      asignado_a: 'user-1',
      watchers: [],
      dependencias: [],
      etapa_id: 1,
      status: 'pendiente',
      prioridad: 'alta',
      etiquetas: ['backend', 'seguridad'],
      color: null,
      checklist: [
        { id: '1', texto: 'Diseñar esquema de base de datos', completado: true, asignado_a: null },
        { id: '2', texto: 'Implementar endpoints de login', completado: false, asignado_a: null },
        { id: '3', texto: 'Agregar validación de tokens', completado: false, asignado_a: null }
      ],
      milestone_id: null,
      facturable: true,
      facturado: false,
      costo_estimado: 800,
      costo_real: 0,
      secuencia: 1,
      created_at: '',
      updated_at: ''
    },
    {
      id: 2,
      proyecto_id: 1,
      tarea_padre_id: null,
      nombre: 'Diseñar interfaz de usuario',
      descripcion: 'Crear mockups y diseño en Figma',
      fecha_inicio: '2025-01-16',
      fecha_fin: '2025-01-22',
      fecha_inicio_real: '2025-01-16',
      fecha_fin_real: null,
      horas_estimadas: 12,
      horas_reales: 6,
      horas_facturables: 12,
      progreso: 50,
      asignado_a: 'user-2',
      watchers: ['user-1'],
      dependencias: [],
      etapa_id: 2,
      status: 'en_progreso',
      prioridad: 'media',
      etiquetas: ['frontend', 'diseño'],
      color: '#8B5CF6',
      checklist: [],
      milestone_id: null,
      facturable: true,
      facturado: false,
      costo_estimado: 1200,
      costo_real: 600,
      secuencia: 1,
      created_at: '',
      updated_at: ''
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroAsignado, setFiltroAsignado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<number>>(new Set());
  const [draggedTask, setDraggedTask] = useState<Tarea | null>(null);

  // Organizar tareas por etapa
  const columnas: KanbanColumn[] = useMemo(() => {
    let tareasFiltradas = tareas;

    // Aplicar filtros
    if (searchTerm) {
      tareasFiltradas = tareasFiltradas.filter(t =>
        t.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filtroAsignado) {
      tareasFiltradas = tareasFiltradas.filter(t => t.asignado_a === filtroAsignado);
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
          .sort((a, b) => a.secuencia - b.secuencia),
        isCollapsed: collapsedColumns.has(etapa.id)
      }));
  }, [etapas, tareas, searchTerm, filtroAsignado, filtroPrioridad, collapsedColumns]);

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
      await onUpdateTareaEtapa(draggedTask.id, nuevaEtapaId);
    } catch (error) {
      console.error('Error al actualizar etapa de tarea:', error);
    } finally {
      setDraggedTask(null);
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'baja':
        return 'bg-gray-100 text-gray-700';
      case 'media':
        return 'bg-blue-100 text-blue-700';
      case 'alta':
        return 'bg-orange-100 text-orange-700';
      case 'urgente':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const renderTareaCard = (tarea: Tarea) => {
    const checklistCompleted = tarea.checklist.filter(item => item.completado).length;
    const checklistTotal = tarea.checklist.length;
    const checklistProgress = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;

    return (
      <motion.div
        key={tarea.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        draggable
        onDragStart={(e: any) => handleDragStart(e, tarea)}
        className={`bg-white rounded-lg border-2 p-4 cursor-move hover:shadow-md transition-all ${
          draggedTask?.id === tarea.id ? 'opacity-50 border-blue-500' : 'border-gray-200'
        }`}
        style={tarea.color ? { borderLeftWidth: '4px', borderLeftColor: tarea.color } : {}}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-gray-900 text-sm flex-1 pr-2">
            {tarea.nombre}
          </h4>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditTarea(tarea)}
              className="text-gray-400 hover:text-blue-600 p-1"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button className="text-gray-400 hover:text-gray-600 p-1">
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Descripción */}
        {tarea.descripcion && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {tarea.descripcion}
          </p>
        )}

        {/* Etiquetas */}
        {tarea.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tarea.etiquetas.slice(0, 3).map(etiqueta => (
              <span
                key={etiqueta}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
              >
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

        {/* Checklist progress */}
        {checklistTotal > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Checklist</span>
              <span className="font-medium text-gray-900">
                {checklistCompleted}/{checklistTotal}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Progreso */}
        {tarea.progreso > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Progreso</span>
              <span className="font-medium text-gray-900">{tarea.progreso}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-green-600 h-1.5 rounded-full transition-all"
                style={{ width: `${tarea.progreso}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Prioridad */}
          <span className={`px-2 py-0.5 rounded-full ${getPrioridadColor(tarea.prioridad)}`}>
            {tarea.prioridad}
          </span>

          {/* Fechas */}
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(tarea.fecha_fin).toLocaleDateString('es-MX', {
              month: 'short',
              day: 'numeric'
            })}
          </div>

          {/* Horas */}
          {tarea.horas_estimadas > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tarea.horas_estimadas}h
            </div>
          )}
        </div>

        {/* Asignado */}
        {tarea.asignado_a && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
                {tarea.asignado_a.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs text-gray-600">
                Asignado a {tarea.asignado_a}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tablero Kanban</h1>
          <p className="text-gray-500 mt-1">Vista de tareas por etapa</p>
        </div>
        <button
          onClick={onCreateTarea}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro Asignado */}
          <select
            value={filtroAsignado}
            onChange={(e) => setFiltroAsignado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los asignados</option>
            <option value="user-1">Usuario 1</option>
            <option value="user-2">Usuario 2</option>
          </select>

          {/* Filtro Prioridad */}
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas las prioridades</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {columnas.map(({ etapa, tareas, isCollapsed }) => (
            <div
              key={etapa.id}
              className={`flex-shrink-0 ${isCollapsed ? 'w-16' : 'w-80'} bg-gray-50 rounded-lg transition-all`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, etapa.id)}
            >
              {/* Column Header */}
              <div
                className="sticky top-0 z-10 bg-gray-100 rounded-t-lg p-4 border-b border-gray-200"
                style={{ borderTopColor: etapa.color, borderTopWidth: '3px' }}
              >
                <div className="flex items-center justify-between">
                  {!isCollapsed && (
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {etapa.nombre}
                        <span className="px-2 py-0.5 bg-white rounded-full text-xs text-gray-600">
                          {tareas.length}
                        </span>
                      </h3>
                      {etapa.descripcion && (
                        <p className="text-xs text-gray-500 mt-1">{etapa.descripcion}</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => toggleColumnCollapse(etapa.id)}
                    className="text-gray-500 hover:text-gray-700 p-1"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 transform -rotate-90" />
                    ) : (
                      <ChevronUp className="w-4 h-4 transform rotate-90" />
                    )}
                  </button>
                </div>
              </div>

              {/* Column Body */}
              {!isCollapsed && (
                <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {tareas.map(tarea => renderTareaCard(tarea))}

                  {tareas.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">Sin tareas</p>
                    </div>
                  )}

                  {/* Quick Add */}
                  <button
                    onClick={onCreateTarea}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Agregar tarea</span>
                  </button>
                </div>
              )}

              {/* Collapsed view */}
              {isCollapsed && (
                <div className="p-2">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: etapa.color }}
                    >
                      {tareas.length}
                    </span>
                    <div className="writing-mode-vertical text-xs text-gray-600 font-medium whitespace-nowrap">
                      {etapa.nombre}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
