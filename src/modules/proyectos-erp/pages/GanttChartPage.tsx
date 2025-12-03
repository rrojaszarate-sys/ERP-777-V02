import React, { useState, useMemo } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { ZoomIn, ZoomOut, Download, Maximize2 } from 'lucide-react';
import { Button, Select, SelectItem, Switch, Spinner } from '@nextui-org/react';
import { useProyectos, useTareas } from '../hooks/useProyectos';

export const GanttChartPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filtroProyecto, setFiltroProyecto] = useState<string>('');
  const [mostrarCompletadas, setMostrarCompletadas] = useState(true);
  const [columnWidth, setColumnWidth] = useState(60);

  const { data: proyectosData, isLoading: loadingProyectos } = useProyectos();
  const { data: tareasData, isLoading: loadingTareas } = useTareas(
    filtroProyecto ? { proyecto_id: Number(filtroProyecto) } : undefined
  );

  const proyectos = proyectosData || [];
  const tareas = tareasData || [];

  // Convertir a formato Gantt
  const ganttTasks: Task[] = useMemo(() => {
    const tasks: Task[] = [];
    let proyectosFiltrados = proyectos;

    if (filtroProyecto) {
      proyectosFiltrados = proyectos.filter(p => p.id === Number(filtroProyecto));
    }

    proyectosFiltrados.forEach(proyecto => {
      const tareasProyecto = tareas.filter(t => 
        t.proyecto_id === proyecto.id && (mostrarCompletadas || t.status !== 'completada')
      );

      // Agregar proyecto como tarea padre
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

      // Agregar tareas
      tareasProyecto.forEach(tarea => {
        if (!tarea.fecha_inicio || !tarea.fecha_fin) return;
        
        const tareaTask: Task = {
          id: `tarea-${tarea.id}`,
          name: tarea.nombre,
          start: new Date(tarea.fecha_inicio),
          end: new Date(tarea.fecha_fin),
          progress: tarea.progreso,
          type: 'task',
          dependencies: tarea.dependencias?.map(dep => `tarea-${dep}`) || [],
          project: `proyecto-${proyecto.id}`,
          styles: {
            backgroundColor: getColorByStatus(tarea.status),
            backgroundSelectedColor: getColorByStatus(tarea.status, true),
            progressColor: getProgressColorByPriority(tarea.prioridad),
            progressSelectedColor: getProgressColorByPriority(tarea.prioridad, true)
          }
        };
        tasks.push(tareaTask);
      });
    });

    return tasks;
  }, [proyectos, tareas, filtroProyecto, mostrarCompletadas]);

  const getColorByStatus = (status: string, selected = false): string => {
    const colors: Record<string, string> = {
      pendiente: selected ? '#6B7280' : '#9CA3AF',
      en_progreso: selected ? '#2563EB' : '#3B82F6',
      bloqueada: selected ? '#DC2626' : '#EF4444',
      completada: selected ? '#059669' : '#10B981',
      cancelada: selected ? '#4B5563' : '#6B7280'
    };
    return colors[status] || colors.pendiente;
  };

  const getProgressColorByPriority = (prioridad: string, selected = false): string => {
    const colors: Record<string, string> = {
      baja: selected ? '#059669' : '#10B981',
      media: selected ? '#2563EB' : '#3B82F6',
      alta: selected ? '#D97706' : '#F59E0B',
      urgente: selected ? '#DC2626' : '#EF4444'
    };
    return colors[prioridad] || colors.media;
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    switch (mode) {
      case ViewMode.Hour: setColumnWidth(60); break;
      case ViewMode.Day: setColumnWidth(60); break;
      case ViewMode.Week: setColumnWidth(100); break;
      case ViewMode.Month: setColumnWidth(120); break;
      case ViewMode.Year: setColumnWidth(200); break;
      default: setColumnWidth(60);
    }
  };

  const handleZoomIn = () => {
    const modes = [ViewMode.Year, ViewMode.Month, ViewMode.Week, ViewMode.Day, ViewMode.HalfDay, ViewMode.QuarterDay, ViewMode.Hour];
    const currentIndex = modes.indexOf(viewMode);
    if (currentIndex < modes.length - 1) handleViewModeChange(modes[currentIndex + 1]);
  };

  const handleZoomOut = () => {
    const modes = [ViewMode.Year, ViewMode.Month, ViewMode.Week, ViewMode.Day, ViewMode.HalfDay, ViewMode.QuarterDay, ViewMode.Hour];
    const currentIndex = modes.indexOf(viewMode);
    if (currentIndex > 0) handleViewModeChange(modes[currentIndex - 1]);
  };

  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
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

  if (loadingProyectos || loadingTareas) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Cargando diagrama...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Diagrama de Gantt</h1>
          <p className="text-gray-500 mt-1">Línea de tiempo de proyectos y tareas</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Zoom controls */}
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
              <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded" title="Alejar">
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 text-sm font-medium text-gray-700 border-x border-gray-200">
                {getViewModeLabel(viewMode)}
              </div>
              <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded" title="Acercar">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* View mode buttons */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              {[ViewMode.Day, ViewMode.Week, ViewMode.Month].map(mode => (
                <button
                  key={mode}
                  onClick={() => handleViewModeChange(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    viewMode === mode ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {getViewModeLabel(mode)}
                </button>
              ))}
            </div>

            {/* Filter by project */}
            <Select
              label="Proyecto"
              selectedKeys={filtroProyecto ? [filtroProyecto] : []}
              onSelectionChange={(keys) => setFiltroProyecto(Array.from(keys)[0] as string || '')}
              className="w-48"
              size="sm"
            >
              {proyectos.map(p => (
                <SelectItem key={p.id.toString()} value={p.id.toString()}>{p.nombre}</SelectItem>
              ))}
            </Select>

            <Switch isSelected={mostrarCompletadas} onValueChange={setMostrarCompletadas} size="sm">
              Mostrar completadas
            </Switch>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="bordered" startContent={<Download className="w-4 h-4" />}>
              Exportar
            </Button>
            <Button size="sm" variant="bordered" onPress={handleToggleFullscreen} startContent={<Maximize2 className="w-4 h-4" />}>
              {isFullscreen ? 'Salir' : 'Pantalla completa'}
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Leyenda</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Estado</p>
            <div className="space-y-1">
              {[
                { color: '#9CA3AF', label: 'Pendiente' },
                { color: '#3B82F6', label: 'En Progreso' },
                { color: '#EF4444', label: 'Bloqueada' },
                { color: '#10B981', label: 'Completada' }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Prioridad (progreso)</p>
            <div className="space-y-1">
              {[
                { color: '#10B981', label: 'Baja' },
                { color: '#3B82F6', label: 'Media' },
                { color: '#F59E0B', label: 'Alta' },
                { color: '#EF4444', label: 'Urgente' }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        {ganttTasks.length > 0 ? (
          <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            columnWidth={columnWidth}
            listCellWidth=""
            barCornerRadius={4}
            barProgressColor="#3B82F6"
            barProgressSelectedColor="#2563EB"
            handleWidth={8}
            todayColor="rgba(59, 130, 246, 0.1)"
            locale="es"
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No hay proyectos o tareas para mostrar. Crea un proyecto primero.</p>
          </div>
        )}
      </div>
    </div>
  );
};
