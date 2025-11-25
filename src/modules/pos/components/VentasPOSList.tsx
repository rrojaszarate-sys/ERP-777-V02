import React, { useState } from 'react';
import { useVentasPOS } from '../hooks';
import { ShoppingCart, Plus, Eye, XCircle, Search, DollarSign } from 'lucide-react';
import { VentaPOSFormModal } from './VentaPOSFormModal';
import type { VentaPOS } from '../types';

export const VentasPOSList: React.FC = () => {
  const { ventas, isLoading, cancelarVenta } = useVentasPOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<VentaPOS | undefined>();

  const filteredVentas = ventas.filter(v =>
    v.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const getEstatusColor = (estatus: string) => {
    switch (estatus) {
      case 'COMPLETADA': return 'bg-green-100 text-green-800';
      case 'CANCELADA': return 'bg-red-100 text-red-800';
      case 'ABIERTA': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoPagoIcon = (tipo: string) => {
    return <DollarSign className="w-4 h-4" />;
  };

  const ventasHoy = ventas.filter(v => {
    const hoy = new Date().toISOString().split('T')[0];
    return v.fecha === hoy && v.estatus === 'COMPLETADA';
  });

  const totalHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ventas POS</h2>
          <p className="text-gray-600 mt-1">Punto de venta - Historial de ventas</p>
        </div>
        <button
          onClick={() => {
            setSelectedVenta(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Venta</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por folio o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Ventas Hoy</div>
          <div className="text-2xl font-bold text-teal-600">{ventasHoy.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Hoy</div>
          <div className="text-2xl font-bold text-green-600">
            ${totalHoy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Ticket Promedio</div>
          <div className="text-2xl font-bold text-blue-600">
            ${ventasHoy.length > 0 ? (totalHoy / ventasHoy.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Ventas</div>
          <div className="text-2xl font-bold text-purple-600">{ventas.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha/Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Pago</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estatus</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVentas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No hay ventas registradas</p>
                </td>
              </tr>
            ) : (
              filteredVentas.map((venta) => (
                <tr key={venta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {venta.folio}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{new Date(venta.fecha).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">{venta.hora}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {venta.cliente_nombre || 'Público General'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {getTipoPagoIcon(venta.tipo_pago)}
                      <span className="ml-1">{venta.tipo_pago.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ${venta.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstatusColor(venta.estatus)}`}>
                      {venta.estatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedVenta(venta);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {venta.estatus === 'COMPLETADA' && (
                        <button
                          onClick={() => {
                            const motivo = prompt('Motivo de cancelación:');
                            if (motivo) {
                              cancelarVenta({ id: venta.id, motivo });
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Cancelar"
                        >
                          <XCircle className="w-4 h-4" />
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

      <VentaPOSFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVenta(undefined);
        }}
        venta={selectedVenta}
      />
    </div>
  );
};
