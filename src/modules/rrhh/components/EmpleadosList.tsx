import React, { useState } from 'react';
import { useEmpleados } from '../hooks';
import { Users, Plus, Edit, UserX, Search, Briefcase } from 'lucide-react';
import { EmpleadoFormModal } from './EmpleadoFormModal';
import type { Empleado } from '../types';

export const EmpleadosList: React.FC = () => {
  const { empleados, isLoading, darBajaEmpleado } = useEmpleados();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | undefined>();

  const filteredEmpleados = empleados.filter(e =>
    e.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.numero_empleado.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getEstatusColor = (estatus: string) => {
    switch (estatus) {
      case 'ACTIVO': return 'bg-green-100 text-green-800';
      case 'BAJA': return 'bg-red-100 text-red-800';
      case 'SUSPENDIDO': return 'bg-yellow-100 text-yellow-800';
      case 'VACACIONES': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Empleados</h2>
          <p className="text-gray-600 mt-1">Gestión de recursos humanos</p>
        </div>
        <button
          onClick={() => {
            setSelectedEmpleado(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Empleado</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, número de empleado o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Empleados</div>
          <div className="text-2xl font-bold text-indigo-600">{empleados.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Activos</div>
          <div className="text-2xl font-bold text-green-600">
            {empleados.filter(e => e.estatus === 'ACTIVO').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">De Baja</div>
          <div className="text-2xl font-bold text-red-600">
            {empleados.filter(e => e.estatus === 'BAJA').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Nómina Mensual</div>
          <div className="text-2xl font-bold text-blue-600">
            ${empleados
              .filter(e => e.estatus === 'ACTIVO')
              .reduce((sum, e) => sum + e.salario_base, 0)
              .toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puesto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salario</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fecha Ingreso</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estatus</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmpleados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No hay empleados registrados</p>
                </td>
              </tr>
            ) : (
              filteredEmpleados.map((empleado) => (
                <tr key={empleado.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {empleado.numero_empleado}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{empleado.nombre_completo}</div>
                    {empleado.email && (
                      <div className="text-sm text-gray-500">{empleado.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Briefcase className="w-4 h-4 mr-1 text-gray-400" />
                      {empleado.puesto?.nombre || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {empleado.departamento?.nombre || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ${empleado.salario_base.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {new Date(empleado.fecha_ingreso).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstatusColor(empleado.estatus)}`}>
                      {empleado.estatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedEmpleado(empleado);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {empleado.estatus === 'ACTIVO' && (
                        <button
                          onClick={() => {
                            const motivo = prompt('Motivo de baja:');
                            if (motivo) {
                              darBajaEmpleado({ id: empleado.id, motivo });
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Dar de baja"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EmpleadoFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEmpleado(undefined);
        }}
        empleado={selectedEmpleado}
      />
    </div>
  );
};
