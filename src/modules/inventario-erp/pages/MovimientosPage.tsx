import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Plus, Search, ArrowUpCircle, ArrowDownCircle,
  RefreshCw, Calendar, FileText, TrendingUp, TrendingDown
} from 'lucide-react';
import { useMovimientos, useCreateMovimiento } from '../hooks/useInventario';
import { useProductos } from '../hooks/useProductos';
import { useAlmacenes } from '../hooks/useInventario';

interface Movimiento {
  id?: number;
  company_id?: string;
  tipo: 'entrada' | 'salida' | 'ajuste';
  producto_id: number;
  almacen_id: number;
  cantidad: number;
  costo_unitario: number;
  referencia: string;
  notas: string;
  fecha: string;
}

export const MovimientosPage: React.FC = () => {
  const { data: movimientos = [], isLoading } = useMovimientos();
  const { productos = [] } = useProductos();
  const { data: almacenes = [] } = useAlmacenes();
  const createMutation = useCreateMovimiento();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Movimiento>({
    tipo: 'entrada',
    producto_id: 0,
    almacen_id: 0,
    cantidad: 0,
    costo_unitario: 0,
    referencia: '',
    notas: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  // Filtrar movimientos
  const filteredMovimientos = movimientos.filter((mov: any) => {
    const matchSearch =
      mov.producto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.almacen?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.referencia?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTipo = filterTipo === 'todos' || mov.tipo === filterTipo;

    return matchSearch && matchTipo;
  });

  // Estadísticas
  const stats = {
    total: movimientos.length,
    entradas: movimientos.filter((m: any) => m.tipo === 'entrada').length,
    salidas: movimientos.filter((m: any) => m.tipo === 'salida').length,
    ajustes: movimientos.filter((m: any) => m.tipo === 'ajuste').length
  };

  const openModal = () => {
    setFormData({
      tipo: 'entrada',
      producto_id: 0,
      almacen_id: 0,
      cantidad: 0,
      costo_unitario: 0,
      referencia: '',
      notas: '',
      fecha: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.producto_id === 0) {
      alert('Por favor selecciona un producto');
      return;
    }

    if (formData.almacen_id === 0) {
      alert('Por favor selecciona un almacén');
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      closeModal();
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'bg-green-100 text-green-800';
      case 'salida':
        return 'bg-red-100 text-red-800';
      case 'ajuste':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <ArrowUpCircle className="w-4 h-4" />;
      case 'salida':
        return <ArrowDownCircle className="w-4 h-4" />;
      case 'ajuste':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Movimientos de Inventario</h1>
            <p className="text-gray-500">Registro de entradas, salidas y ajustes</p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Movimiento</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Movimientos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Entradas</p>
              <p className="text-2xl font-bold text-green-600">{stats.entradas}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Salidas</p>
              <p className="text-2xl font-bold text-red-600">{stats.salidas}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-red-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ajustes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.ajustes}</p>
            </div>
            <RefreshCw className="w-10 h-10 text-yellow-500" />
          </div>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center space-x-2 text-gray-400">
          <Search className="w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por producto, almacén o referencia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-700"
          />
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setFilterTipo('todos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterTipo === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterTipo('entrada')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterTipo === 'entrada'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Entradas
          </button>
          <button
            onClick={() => setFilterTipo('salida')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterTipo === 'salida'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Salidas
          </button>
          <button
            onClick={() => setFilterTipo('ajuste')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterTipo === 'ajuste'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ajustes
          </button>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando movimientos...</div>
        ) : filteredMovimientos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No se encontraron movimientos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Almacén</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unit.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMovimientos.map((movimiento: any) => (
                  <motion.tr
                    key={movimiento.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(movimiento.created_at || movimiento.fecha).toLocaleDateString('es-MX')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(movimiento.tipo)}`}>
                        {getTipoIcon(movimiento.tipo)}
                        <span>{movimiento.tipo.charAt(0).toUpperCase() + movimiento.tipo.slice(1)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{movimiento.producto?.nombre || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{movimiento.producto?.codigo || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{movimiento.almacen?.nombre || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`font-mono font-semibold ${
                        movimiento.tipo === 'entrada' ? 'text-green-600' :
                        movimiento.tipo === 'salida' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {movimiento.tipo === 'entrada' ? '+' : movimiento.tipo === 'salida' ? '-' : '±'}
                        {movimiento.cantidad}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {movimiento.costo_unitario > 0 ? `$${movimiento.costo_unitario.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{movimiento.referencia || '-'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Formulario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Registrar Movimiento de Inventario</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Tipo de Movimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Movimiento *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'entrada' })}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      formData.tipo === 'entrada'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <ArrowUpCircle className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold">Entrada</div>
                    <div className="text-xs">Compras, devoluciones</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'salida' })}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      formData.tipo === 'salida'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <ArrowDownCircle className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold">Salida</div>
                    <div className="text-xs">Ventas, consumo</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'ajuste' })}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      formData.tipo === 'ajuste'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 hover:border-yellow-300'
                    }`}
                  >
                    <RefreshCw className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold">Ajuste</div>
                    <div className="text-xs">Correcciones</div>
                  </button>
                </div>
              </div>

              {/* Producto y Almacén */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto *
                  </label>
                  <select
                    required
                    value={formData.producto_id}
                    onChange={(e) => setFormData({ ...formData, producto_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Seleccionar producto...</option>
                    {productos.map((prod: any) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.codigo} - {prod.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Almacén *
                  </label>
                  <select
                    required
                    value={formData.almacen_id}
                    onChange={(e) => setFormData({ ...formData, almacen_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Seleccionar almacén...</option>
                    {almacenes.map((alm: any) => (
                      <option key={alm.id} value={alm.id}>
                        {alm.codigo} - {alm.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cantidad y Costo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                {formData.tipo === 'entrada' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo Unitario
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.costo_unitario}
                        onChange={(e) => setFormData({ ...formData, costo_unitario: Number(e.target.value) })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fecha y Referencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia / No. Documento
                  </label>
                  <input
                    type="text"
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: OC-001, FC-123"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  rows={3}
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Notas adicionales sobre el movimiento..."
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  <FileText className="w-5 h-5" />
                  <span>Registrar Movimiento</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
