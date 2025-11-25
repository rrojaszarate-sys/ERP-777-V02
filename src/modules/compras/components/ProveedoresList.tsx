import React, { useState } from 'react';
import { useProveedores } from '../hooks';
import { Users, Plus, Edit, Trash2, Search, Star } from 'lucide-react';
import { ProveedorFormModal } from './ProveedorFormModal';
import type { Proveedor } from '../types';

export const ProveedoresList: React.FC = () => {
  const { proveedores, isLoading, delete: deleteProveedor } = useProveedores();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | undefined>();

  const filteredProveedores = proveedores.filter(p =>
    p.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.rfc && p.rfc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const renderStars = (rating?: number) => {
    if (!rating) return '-';
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proveedores</h2>
          <p className="text-gray-600 mt-1">Catálogo de proveedores</p>
        </div>
        <button
          onClick={() => {
            setSelectedProveedor(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por razón social, código o RFC..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Proveedores</div>
          <div className="text-2xl font-bold text-orange-600">{proveedores.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Activos</div>
          <div className="text-2xl font-bold text-green-600">
            {proveedores.filter(p => p.activo).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Con Crédito</div>
          <div className="text-2xl font-bold text-blue-600">
            {proveedores.filter(p => p.dias_credito > 0).length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razón Social</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFC</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Calificación</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédito (días)</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estatus</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProveedores.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No hay proveedores registrados</p>
                </td>
              </tr>
            ) : (
              filteredProveedores.map((proveedor) => (
                <tr key={proveedor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {proveedor.codigo}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{proveedor.razon_social}</div>
                    {proveedor.nombre_comercial && (
                      <div className="text-sm text-gray-500">{proveedor.nombre_comercial}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {proveedor.rfc || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {renderStars(proveedor.calificacion)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {proveedor.dias_credito}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {proveedor.activo ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProveedor(proveedor);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este proveedor?')) {
                            deleteProveedor(proveedor.id);
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

      <ProveedorFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProveedor(undefined);
        }}
        proveedor={selectedProveedor}
      />
    </div>
  );
};
