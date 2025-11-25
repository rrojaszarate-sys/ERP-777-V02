import React from 'react';
import { Card, CardBody, Button, Progress } from '@nextui-org/react';
import { FolderKanban, CheckCircle, AlertCircle, Clock, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProyectos, useMetricasProyectos } from '../hooks/useProyectos';

export const ProyectosDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: proyectos } = useProyectos();
  const { data: metricas } = useMetricasProyectos();

  const proyectosActivos = proyectos?.filter(p => p.status === 'en_progreso') || [];
  const proyectosRetrasados = proyectos?.filter(p =>
    p.status !== 'completado' && new Date(p.fecha_fin_estimada) < new Date()
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proyectos</h1>
          <p className="text-gray-500 mt-1">Gestión de proyectos con diagramas de Gantt</p>
        </div>
        <Button
          color="primary"
          onPress={() => navigate('/proyectos/nuevo')}
          startContent={<Plus className="w-4 h-4" />}
        >
          Nuevo Proyecto
        </Button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card isPressable onPress={() => navigate('/proyectos?status=en_progreso')}>
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

        <Card isPressable onPress={() => navigate('/proyectos?status=completado')}>
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
            <div className="p-3 rounded-lg bg-red-100">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Retrasados</p>
              <p className="text-2xl font-bold">{metricas?.proyectos_retrasados || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Horas Totales</p>
              <p className="text-2xl font-bold">
                {Math.round(metricas?.horas_reales_total || 0)}h
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Estadísticas de Tareas */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">Tareas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">
                {metricas?.tareas_pendientes || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">En Progreso</p>
              <p className="text-2xl font-bold text-blue-600">
                {metricas?.tareas_en_progreso || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Completadas</p>
              <p className="text-2xl font-bold text-green-600">
                {metricas?.tareas_completadas || 0}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Presupuesto vs Costo Real */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500">Presupuesto Total</h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              ${(metricas?.presupuesto_total || 0).toLocaleString('es-MX', {
                minimumFractionDigits: 0
              })}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500">Costo Real</h3>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              ${(metricas?.costo_real_total || 0).toLocaleString('es-MX', {
                minimumFractionDigits: 0
              })}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Proyectos Activos */}
      {proyectosActivos.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Proyectos Activos</h3>
              <Button
                size="sm"
                variant="flat"
                onPress={() => navigate('/proyectos')}
              >
                Ver Todos
              </Button>
            </div>

            <div className="space-y-4">
              {proyectosActivos.slice(0, 5).map((proyecto) => (
                <div
                  key={proyecto.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/proyectos/${proyecto.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{proyecto.nombre}</h4>
                    <span className="text-sm text-gray-500">
                      {new Date(proyecto.fecha_fin_estimada).toLocaleDateString('es-MX')}
                    </span>
                  </div>

                  {proyecto.cliente && (
                    <p className="text-sm text-gray-500 mb-2">
                      {proyecto.cliente.razon_social}
                    </p>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progreso</span>
                      <span className="font-semibold">{proyecto.progreso}%</span>
                    </div>
                    <Progress
                      value={proyecto.progreso}
                      color="primary"
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-gray-500">Presupuesto</span>
                    <span className="font-mono">
                      ${proyecto.presupuesto.toLocaleString('es-MX', {
                        minimumFractionDigits: 0
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Proyectos Retrasados */}
      {proyectosRetrasados.length > 0 && (
        <Card>
          <CardBody className="bg-red-50">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">
                  Proyectos Retrasados ({proyectosRetrasados.length})
                </h3>
                <p className="text-sm text-red-700">
                  Estos proyectos han superado su fecha estimada de finalización
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {proyectosRetrasados.slice(0, 3).map((proyecto) => (
                <div
                  key={proyecto.id}
                  className="p-3 bg-white border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
                  onClick={() => navigate(`/proyectos/${proyecto.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{proyecto.nombre}</span>
                    <span className="text-sm text-red-600">
                      Vencido: {new Date(proyecto.fecha_fin_estimada).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
