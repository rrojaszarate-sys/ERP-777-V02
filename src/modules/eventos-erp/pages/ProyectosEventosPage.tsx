import React, { useState } from 'react';
import { Card, CardBody, Button, Chip, Input, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@nextui-org/react';
import { FolderKanban, Plus, Calendar, Users, Target, CheckCircle, Clock, TrendingUp, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProyectosEventos, useMetricasProyectosEventos, useCreateProyectoEvento } from '../hooks/useProyectosEventos';
import type { Proyecto, ProyectoFormData } from '../types/Proyecto';

export const ProyectosEventosPage: React.FC = () => {
  const navigate = useNavigate();
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [modalNuevo, setModalNuevo] = useState(false);
  const [formData, setFormData] = useState<ProyectoFormData>({});

  const { data: proyectos, isLoading } = useProyectosEventos({
    status: filtroStatus || undefined,
    busqueda: busqueda || undefined
  });

  const { data: metricas } = useMetricasProyectosEventos();
  const createProyecto = useCreateProyectoEvento();

  const handleCrearProyecto = () => {
    createProyecto.mutate(formData, {
      onSuccess: () => {
        setModalNuevo(false);
        setFormData({});
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planificacion': return 'default';
      case 'en_progreso': return 'primary';
      case 'pausado': return 'warning';
      case 'completado': return 'success';
      case 'cancelado': return 'danger';
      default: return 'default';
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'baja': return 'default';
      case 'media': return 'primary';
      case 'alta': return 'warning';
      case 'urgente': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proyectos de Eventos</h1>
          <p className="text-gray-500 mt-1">Gestiona proyectos vinculados a eventos con Gantt y tareas</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={() => setModalNuevo(true)}
        >
          Nuevo Proyecto
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <FolderKanban className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Proyectos Activos</p>
              <p className="text-2xl font-bold">{metricas?.proyectos_activos || 0}</p>
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
              <p className="text-2xl font-bold">{metricas?.proyectos_completados || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-100">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Retrasados</p>
              <p className="text-2xl font-bold text-orange-600">{metricas?.proyectos_retrasados || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tareas Totales</p>
              <p className="text-2xl font-bold">
                {(metricas?.tareas_completadas || 0) + (metricas?.tareas_en_progreso || 0) + (metricas?.tareas_pendientes || 0)}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex gap-4">
            <Input
              placeholder="Buscar proyectos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              className="max-w-xs"
            />
            <Select
              placeholder="Filtrar por estado"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="max-w-xs"
              startContent={<Filter className="w-4 h-4 text-gray-400" />}
            >
              <SelectItem key="" value="">Todos</SelectItem>
              <SelectItem key="planificacion" value="planificacion">Planificación</SelectItem>
              <SelectItem key="en_progreso" value="en_progreso">En Progreso</SelectItem>
              <SelectItem key="pausado" value="pausado">Pausado</SelectItem>
              <SelectItem key="completado" value="completado">Completado</SelectItem>
              <SelectItem key="cancelado" value="cancelado">Cancelado</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Lista de Proyectos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {proyectos?.map((proyecto: Proyecto) => (
          <Card key={proyecto.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardBody onClick={() => navigate(`/eventos-erp/proyectos/${proyecto.id}`)}>
              {/* Header del proyecto */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{proyecto.nombre}</h3>
                  {proyecto.descripcion && (
                    <p className="text-sm text-gray-500 line-clamp-2">{proyecto.descripcion}</p>
                  )}
                </div>
                <Chip size="sm" color={getStatusColor(proyecto.status)}>
                  {proyecto.status.replace('_', ' ').toUpperCase()}
                </Chip>
              </div>

              {/* Prioridad y Cliente */}
              <div className="flex gap-2 mb-3">
                <Chip size="sm" color={getPrioridadColor(proyecto.prioridad)}>
                  {proyecto.prioridad.toUpperCase()}
                </Chip>
                {proyecto.cliente && (
                  <Chip size="sm" variant="flat">
                    {proyecto.cliente.razon_social}
                  </Chip>
                )}
              </div>

              {/* Progreso */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Progreso</span>
                  <span className="font-semibold">{proyecto.progreso}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${proyecto.progreso}%` }}
                  />
                </div>
              </div>

              {/* Fechas y Presupuesto */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-gray-500 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>Inicio</span>
                  </div>
                  <p className="font-medium">{new Date(proyecto.fecha_inicio).toLocaleDateString()}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-500 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>Fin Est.</span>
                  </div>
                  <p className="font-medium">{new Date(proyecto.fecha_fin_estimada).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Presupuesto</p>
                  <p className="font-semibold text-green-600">
                    ${proyecto.presupuesto.toLocaleString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Costo Real</p>
                  <p className="font-semibold text-orange-600">
                    ${proyecto.costo_real.toLocaleString('es-MX')}
                  </p>
                </div>
              </div>

              {/* Footer - Tareas */}
              {proyecto.tareas && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t text-sm">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {proyecto.tareas.length} tarea{proyecto.tareas.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!isLoading && (!proyectos || proyectos.length === 0) && (
        <Card>
          <CardBody className="text-center py-12">
            <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No hay proyectos registrados
            </h3>
            <p className="text-gray-500 mb-4">
              Crea tu primer proyecto para empezar a gestionar eventos con tareas y Gantt
            </p>
            <Button color="primary" onPress={() => setModalNuevo(true)}>
              Crear Proyecto
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Modal Nuevo Proyecto */}
      <Modal isOpen={modalNuevo} onClose={() => setModalNuevo(false)} size="2xl">
        <ModalContent>
          <ModalHeader>Nuevo Proyecto</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Nombre del Proyecto"
                placeholder="Ej: Evento Corporativo 2025"
                value={formData.nombre || ''}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                isRequired
              />

              <Input
                label="Descripción"
                placeholder="Descripción breve del proyecto"
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Fecha de Inicio"
                  value={formData.fecha_inicio || ''}
                  onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  isRequired
                />

                <Input
                  type="date"
                  label="Fecha Fin Estimada"
                  value={formData.fecha_fin_estimada || ''}
                  onChange={(e) => setFormData({ ...formData, fecha_fin_estimada: e.target.value })}
                  isRequired
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Presupuesto"
                  placeholder="0.00"
                  value={formData.presupuesto?.toString() || ''}
                  onChange={(e) => setFormData({ ...formData, presupuesto: parseFloat(e.target.value) })}
                  startContent={<span className="text-gray-500">$</span>}
                />

                <Select
                  label="Prioridad"
                  value={formData.prioridad || ''}
                  onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as any })}
                >
                  <SelectItem key="baja" value="baja">Baja</SelectItem>
                  <SelectItem key="media" value="media">Media</SelectItem>
                  <SelectItem key="alta" value="alta">Alta</SelectItem>
                  <SelectItem key="urgente" value="urgente">Urgente</SelectItem>
                </Select>
              </div>

              <Select
                label="Estado"
                value={formData.status || 'planificacion'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <SelectItem key="planificacion" value="planificacion">Planificación</SelectItem>
                <SelectItem key="en_progreso" value="en_progreso">En Progreso</SelectItem>
                <SelectItem key="pausado" value="pausado">Pausado</SelectItem>
                <SelectItem key="completado" value="completado">Completado</SelectItem>
                <SelectItem key="cancelado" value="cancelado">Cancelado</SelectItem>
              </Select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setModalNuevo(false)}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleCrearProyecto}
              isLoading={createProyecto.isPending}
              isDisabled={!formData.nombre || !formData.fecha_inicio || !formData.fecha_fin_estimada}
            >
              Crear Proyecto
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
