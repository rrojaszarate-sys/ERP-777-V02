import React, { useState } from 'react';
import { useProyectos } from '../hooks';
import { Briefcase, Plus, Edit, Trash2, Search, TrendingUp, Calendar } from 'lucide-react';
import { ProyectoFormModal } from './ProyectoFormModal';
import type { Proyecto } from '../types';

export const ProyectosList: React.FC = () => {
  const { proyectos, isLoading, deleteProyecto, cambiarEstatus } = useProyectos();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState<Proyecto | undefined>();

  const filteredProyectos = proyectos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const getEstatusColor = (estatus: string) => {
    switch (estatus) {
      case 'ACTIVO': return 'bg-green-100 text-green-800';
      case 'COMPLETADO': return 'bg-blue-100 text-blue-800';
      case 'EN_PAUSA': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      case 'PLANEACION': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'URGENTE': return 'bg-red-100 text-red-800';
      case 'ALTA': return 'bg-orange-100 text-orange-800';
      case 'MEDIA': return 'bg-yellow-100 text-yellow-800';
      case 'BAJA': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proyectos</h2>
          <p className="text-gray-600 mt-1">Gestión de proyectos y tareas</p>
        </div>
        <button
          onClick={() => {
            setSelectedProyecto(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Proyecto</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por código o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Proyectos</div>
          <div className="text-2xl font-bold text-cyan-600">{proyectos.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Activos</div>
          <div className="text-2xl font-bold text-green-600">
            {proyectos.filter(p => p.estatus === 'ACTIVO').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Completados</div>
          <div className="text-2xl font-bold text-blue-600">
            {proyectos.filter(p => p.estatus === 'COMPLETADO').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Presupuesto Total</div>
          <div className="text-2xl font-bold text-purple-600">
            ${proyectos.reduce((sum, p) => sum + p.presupuesto, 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proyecto</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Prioridad</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Progreso</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Presupuesto</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fecha Entrega</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estatus</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProyectos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No hay proyectos registrados</p>
                </td>
              </tr>
            ) : (
              filteredProyectos.map((proyecto) => (
                <tr key={proyecto.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {proyecto.codigo}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{proyecto.nombre}</div>
                    {proyecto.descripcion && (
                      <div className="text-sm text-gray-500 truncate max-w-md">
                        {proyecto.descripcion}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPrioridadColor(proyecto.prioridad)}`}>
                      {proyecto.prioridad}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-cyan-600 h-2 rounded-full"
                          style={{ width: `${proyecto.progreso}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{proyecto.progreso}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      ${proyecto.presupuesto.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Real: ${proyecto.costo_real.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      {new Date(proyecto.fecha_fin_estimada).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstatusColor(proyecto.estatus)}`}>
                      {proyecto.estatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProyecto(proyecto);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {proyecto.estatus === 'PLANEACION' && (
                        <button
                          onClick={() => cambiarEstatus({ id: proyecto.id, estatus: 'ACTIVO' })}
                          className="text-green-600 hover:text-green-900"
                          title="Activar proyecto"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este proyecto?')) {
                            deleteProyecto(proyecto.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProyectoFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProyecto(undefined);
        }}
        proyecto={selectedProyecto}
      />
    </div>
  );
};
