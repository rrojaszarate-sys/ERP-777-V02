import React, { useState, useMemo } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import {
  ZoomIn,
  ZoomOut,
  Calendar,
  List,
  Filter,
  Download,
  Maximize2
} from 'lucide-react';
import type { Proyecto, Tarea } from '../types';

interface GanttChartPageProps {
  proyectos: Proyecto[];
  onTaskClick?: (task: Task) => void;
  onTaskChange?: (task: Task) => void;
  showProjects?: boolean;
}

export const GanttChartPage: React.FC<GanttChartPageProps> = ({
  proyectos,
  onTaskClick,
  onTaskChange,
  showProjects = true
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filtroProyecto, setFiltroProyecto] = useState<number | null>(null);
  const [mostrarCompletadas, setMostrarCompletadas] = useState(true);
  const [columnWidth, setColumnWidth] = useState(60);

  // Convertir proyectos y tareas a formato Gantt
  const ganttTasks: Task[] = useMemo(() => {
    const tasks: Task[] = [];
    let proyectosFiltrados = proyectos;

    if (filtroProyecto) {
      proyectosFiltrados = proyectos.filter(p => p.id === filtroProyecto);
    }

    proyectosFiltrados.forEach(proyecto => {
      const tareasFiltradas = proyecto.tareas?.filter(t =>
        mostrarCompletadas || t.status !== 'completada'
      ) || [];

      if (tareasFiltradas.length === 0 && !showProjects) return;

      // Agregar proyecto como tarea padre
      if (showProjects) {
        const proyectoTask: Task = {
          id: `proyecto-${proyecto.id}`,
          name: proyecto.nombre,
          start: new Date(proyecto.fecha_inicio),
          end: new Date(proyecto.fecha_fin_estimada),
          progress: proyecto.progreso,
          type: 'project',
          styles: {
            backgroundColor: proyecto.color || '#3B82F6',
            backgroundSelectedColor: proyecto.color || '#2563EB',
            progressColor: '#10B981',
            progressSelectedColor: '#059669'
          },
          isDisabled: true,
          hideChildren: false
        };
        tasks.push(proyectoTask);
      }

      // Agregar tareas
      tareasFiltradas.forEach(tarea => {
        const tareaTask: Task = {
          id: `tarea-${tarea.id}`,
          name: tarea.nombre,
          start: new Date(tarea.fecha_inicio),
          end: new Date(tarea.fecha_fin),
          progress: tarea.progreso,
          type: 'task',
          dependencies: tarea.dependencias?.map(dep => `tarea-${dep}`) || [],
          project: showProjects ? `proyecto-${proyecto.id}` : undefined,
          styles: {
            backgroundColor: getColorByStatus(tarea.status),
            backgroundSelectedColor: getColorByStatus(tarea.status, true),
            progressColor: getProgressColorByPriority(tarea.prioridad),
            progressSelectedColor: getProgressColorByPriority(tarea.prioridad, true)
          }
        };

        // Si la tarea está bloqueada, cambiar color
        if (tarea.status === 'bloqueada') {
          tareaTask.styles!.backgroundColor = '#EF4444';
          tareaTask.styles!.backgroundSelectedColor = '#DC2626';
        }

        tasks.push(tareaTask);
      });
    });

    return tasks;
  }, [proyectos, filtroProyecto, mostrarCompletadas, showProjects]);

  const getColorByStatus = (status: string, selected = false): string => {
    const baseColors: Record<string, string> = {
      pendiente: '#9CA3AF',
      en_progreso: '#3B82F6',
      bloqueada: '#EF4444',
      completada: '#10B981',
      cancelada: '#6B7280'
    };

    const selectedColors: Record<string, string> = {
      pendiente: '#6B7280',
      en_progreso: '#2563EB',
      bloqueada: '#DC2626',
      completada: '#059669',
      cancelada: '#4B5563'
    };

    return selected ? (selectedColors[status] || selectedColors.pendiente) : (baseColors[status] || baseColors.pendiente);
  };

  const getProgressColorByPriority = (prioridad: string, selected = false): string => {
    const baseColors: Record<string, string> = {
      baja: '#10B981',
      media: '#3B82F6',
      alta: '#F59E0B',
      urgente: '#EF4444'
    };

    const selectedColors: Record<string, string> = {
      baja: '#059669',
      media: '#2563EB',
      alta: '#D97706',
      urgente: '#DC2626'
    };

    return selected ? (selectedColors[prioridad] || selectedColors.media) : (baseColors[prioridad] || baseColors.media);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);

    // Ajustar ancho de columna según el modo
    switch (mode) {
      case ViewMode.Hour:
        setColumnWidth(60);
        break;
      case ViewMode.QuarterDay:
        setColumnWidth(60);
        break;
      case ViewMode.HalfDay:
        setColumnWidth(60);
        break;
      case ViewMode.Day:
        setColumnWidth(60);
        break;
      case ViewMode.Week:
        setColumnWidth(100);
        break;
      case ViewMode.Month:
        setColumnWidth(120);
        break;
      case ViewMode.Year:
        setColumnWidth(200);
        break;
    }
  };

  const handleZoomIn = () => {
    const modes = [ViewMode.Year, ViewMode.Month, ViewMode.Week, ViewMode.Day, ViewMode.HalfDay, ViewMode.QuarterDay, ViewMode.Hour];
    const currentIndex = modes.indexOf(viewMode);
    if (currentIndex < modes.length - 1) {
      handleViewModeChange(modes[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const modes = [ViewMode.Year, ViewMode.Month, ViewMode.Week, ViewMode.Day, ViewMode.HalfDay, ViewMode.QuarterDay, ViewMode.Hour];
    const currentIndex = modes.indexOf(viewMode);
    if (currentIndex > 0) {
      handleViewModeChange(modes[currentIndex - 1]);
    }
  };

  const handleTaskClickInternal = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  const handleTaskChangeInternal = (task: Task) => {
    if (onTaskChange) {
      onTaskChange(task);
    }
  };

  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const exportToPNG = () => {
    // Esta funcionalidad requeriría html2canvas o similar
    // Por ahora, mostrar mensaje
    alert('La exportación a PNG se implementará próximamente');
  };

  const getViewModeLabel = (mode: ViewMode): string => {
    const labels: Record<ViewMode, string> = {
      [ViewMode.Hour]: 'Hora',
      [ViewMode.QuarterDay]: '6 Horas',
      [ViewMode.HalfDay]: '12 Horas',
      [ViewMode.Day]: 'Día',
      [ViewMode.Week]: 'Semana',
      [ViewMode.Month]: 'Mes',
      [ViewMode.Year]: 'Año'
    };
    return labels[mode] || 'Día';
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Diagrama de Gantt</h1>
          <p className="text-gray-500 mt-1">Línea de tiempo de proyectos y tareas</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Left side - View controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Zoom controls */}
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Alejar"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 text-sm font-medium text-gray-700 border-x border-gray-200">
                {getViewModeLabel(viewMode)}
              </div>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Acercar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* View mode buttons */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => handleViewModeChange(ViewMode.Day)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  viewMode === ViewMode.Day
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Día
              </button>
              <button
                onClick={() => handleViewModeChange(ViewMode.Week)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  viewMode === ViewMode.Week
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => handleViewModeChange(ViewMode.Month)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  viewMode === ViewMode.Month
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Mes
              </button>
            </div>

            {/* Filter by project */}
            <select
              value={filtroProyecto || ''}
              onChange={(e) => setFiltroProyecto(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">Todos los proyectos</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>

            {/* Show completed toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarCompletadas}
                onChange={(e) => setMostrarCompletadas(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Mostrar completadas</span>
            </label>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportToPNG}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={handleToggleFullscreen}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
            >
              <Maximize2 className="w-4 h-4" />
              {isFullscreen ? 'Salir' : 'Pantalla completa'}
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Leyenda</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Status */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Estado</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9CA3AF' }} />
                <span className="text-xs text-gray-600">Pendiente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }} />
                <span className="text-xs text-gray-600">En Progreso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }} />
                <span className="text-xs text-gray-600">Bloqueada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }} />
                <span className="text-xs text-gray-600">Completada</span>
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Prioridad (barra de progreso)</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }} />
                <span className="text-xs text-gray-600">Baja</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }} />
                <span className="text-xs text-gray-600">Media</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }} />
                <span className="text-xs text-gray-600">Alta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }} />
                <span className="text-xs text-gray-600">Urgente</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-gray-700 mb-2">Información</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p>• Haz clic en una tarea para ver detalles</p>
              <p>• Arrastra para cambiar fechas (si está habilitado)</p>
              <p>• Las líneas muestran dependencias entre tareas</p>
              <p>• El progreso se indica con la barra de color dentro de cada tarea</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-lg shadow flex-1 overflow-hidden">
        {ganttTasks.length > 0 ? (
          <div className="h-full overflow-auto">
            <Gantt
              tasks={ganttTasks}
              viewMode={viewMode}
              onDateChange={handleTaskChangeInternal}
              onClick={handleTaskClickInternal}
              locale="es"
              columnWidth={columnWidth}
              listCellWidth="200px"
              rowHeight={50}
              barCornerRadius={4}
              barProgressColor="#10B981"
              barProgressSelectedColor="#059669"
              barBackgroundColor="#E5E7EB"
              barBackgroundSelectedColor="#D1D5DB"
              projectBackgroundColor="#3B82F6"
              projectBackgroundSelectedColor="#2563EB"
              projectProgressColor="#10B981"
              projectProgressSelectedColor="#059669"
              milestoneBackgroundColor="#F59E0B"
              milestoneBackgroundSelectedColor="#D97706"
              todayColor="rgba(239, 68, 68, 0.3)"
              TooltipContent={({ task }) => (
                <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg max-w-xs">
                  <h4 className="font-semibold mb-2">{task.name}</h4>
                  <div className="space-y-1 text-xs">
                    <p>
                      <span className="text-gray-300">Inicio:</span>{' '}
                      {task.start.toLocaleDateString('es-MX')}
                    </p>
                    <p>
                      <span className="text-gray-300">Fin:</span>{' '}
                      {task.end.toLocaleDateString('es-MX')}
                    </p>
                    <p>
                      <span className="text-gray-300">Progreso:</span>{' '}
                      {task.progress}%
                    </p>
                    {task.dependencies && task.dependencies.length > 0 && (
                      <p>
                        <span className="text-gray-300">Dependencias:</span>{' '}
                        {task.dependencies.length}
                      </p>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No hay tareas para mostrar</p>
              <p className="text-gray-400 text-sm mt-1">
                Agrega proyectos y tareas para ver el diagrama de Gantt
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats footer */}
      {ganttTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {proyectos.length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Proyectos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {ganttTasks.filter(t => t.type === 'task').length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Tareas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {ganttTasks.filter(t => t.type === 'task' && t.progress < 100).length}
              </p>
              <p className="text-xs text-gray-600 mt-1">En Progreso</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {ganttTasks.filter(t => t.type === 'task' && t.progress === 100).length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Completadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {ganttTasks.reduce((sum, t) => sum + (t.dependencies?.length || 0), 0)}
              </p>
              <p className="text-xs text-gray-600 mt-1">Dependencias</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
