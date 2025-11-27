import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Plus, Search, Edit, Trash2, AlertCircle, X,
  Save, DollarSign, Tag, BarChart3, Upload, Download
} from 'lucide-react';
import { useProductos, Producto } from '../hooks/useProductos';
import { ImportProductosModal } from '../components/ImportProductosModal';
import { useAuth } from '../../../core/auth/AuthProvider';

// Interfaz del formulario (campos editables)
interface ProductoFormData {
  clave: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  precio_base: number;
  precio_venta: number;
  costo: number;
  margen: number;
  iva: boolean;
  tipo: string;
  activo: boolean;
}

export const ProductosPage: React.FC = () => {
  const { productos, loading, createProducto, updateProducto, deleteProducto, refreshProductos } = useProductos();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [formData, setFormData] = useState<ProductoFormData>({
    clave: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    unidad: 'PZA',
    precio_base: 0,
    precio_venta: 0,
    costo: 0,
    margen: 30,
    iva: true,
    tipo: 'producto',
    activo: true
  });

  const categorias = [
    'Materiales',
    'Alimentos y Bebidas',
    'Decoración',
    'Equipo Audiovisual',
    'Mobiliario',
    'Servicios',
    'Iluminación',
    'Estructuras',
    'Carpas',
    'Textiles',
    'Pirotecnia',
    'Papelería',
    'Limpieza',
    'Herramientas',
    'Electrónica',
    'Seguridad',
    'General',
    'Otros'
  ];

  const unidades = [
    { value: 'PZA', label: 'Pieza' },
    { value: 'KG', label: 'Kilogramo' },
    { value: 'LT', label: 'Litro' },
    { value: 'MT', label: 'Metro' },
    { value: 'SRV', label: 'Servicio' },
    { value: 'HR', label: 'Hora' },
    { value: 'DÍA', label: 'Día' }
  ];

  const filteredProductos = productos?.filter(p =>
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clave?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProducto?.id) {
        await updateProducto(editingProducto.id, formData);
      } else {
        await createProducto(formData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar producto:', error);
    }
  };

  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto);
    setFormData({
      clave: producto.clave || '',
      nombre: producto.nombre || '',
      descripcion: producto.descripcion || '',
      categoria: producto.categoria || '',
      unidad: producto.unidad || 'PZA',
      precio_base: producto.precio_base || 0,
      precio_venta: producto.precio_venta || 0,
      costo: producto.costo || 0,
      margen: producto.margen || 30,
      iva: producto.iva !== false,
      tipo: producto.tipo || 'producto',
      activo: producto.activo !== false
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await deleteProducto(id);
      } catch (error) {
        console.error('Error al eliminar producto:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProducto(null);
    setFormData({
      clave: '',
      nombre: '',
      descripcion: '',
      categoria: '',
      unidad: 'PZA',
      precio_base: 0,
      precio_venta: 0,
      costo: 0,
      margen: 30,
      iva: true,
      tipo: 'producto',
      activo: true
    });
  };

  const calcularMargen = () => {
    if (formData.precio_venta > 0 && formData.precio_base > 0) {
      const margen = ((formData.precio_venta - formData.precio_base) / formData.precio_venta) * 100;
      return margen.toFixed(2);
    }
    return '0.00';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              Catálogo de Productos
            </h1>
            <p className="text-gray-600 mt-1">
              Gestiona tu inventario de productos y servicios
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Importar CSV
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo Producto
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Productos</p>
              <p className="text-2xl font-bold text-gray-900">{productos?.length || 0}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600">
                {productos?.filter(p => p.activo).length || 0}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categorías</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(productos?.map(p => p.categoria)).size || 0}
              </p>
            </div>
            <Tag className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valor Promedio</p>
              <p className="text-2xl font-bold text-orange-600">
                ${((productos?.reduce((sum, p) => sum + (p.precio_venta || 0), 0) || 0) / (productos?.length || 1)).toFixed(0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P. Compra
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P. Venta
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margen
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No hay productos registrados</p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Crear primer producto
                    </button>
                  </td>
                </tr>
              ) : (
                filteredProductos.map((producto) => {
                  const margen = producto.precio_venta > 0 && producto.precio_base > 0
                    ? ((producto.precio_venta - producto.precio_base) / producto.precio_venta) * 100
                    : producto.margen || 0;

                  return (
                    <tr key={producto.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {producto.clave}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                          {producto.descripcion && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {producto.descripcion}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          {producto.categoria || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {producto.unidad}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        ${(producto.precio_base || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        ${(producto.precio_venta || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          margen >= 30 ? 'bg-green-100 text-green-800' :
                          margen >= 15 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {margen.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          producto.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {producto.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(producto)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(producto.id!)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Clave y Nombre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clave <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clave}
                    onChange={(e) => setFormData({ ...formData, clave: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="PROD-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre del producto"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descripción detallada del producto"
                />
              </div>

              {/* Categoría y Unidad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad de Medida <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {unidades.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Precios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Base <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.precio_base}
                      onChange={(e) => setFormData({ ...formData, precio_base: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de Venta <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.precio_venta}
                      onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Costo y Margen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.costo}
                      onChange={(e) => setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Margen (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.margen}
                    onChange={(e) => setFormData({ ...formData, margen: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="30"
                  />
                </div>
              </div>

              {/* Margen calculado */}
              {formData.precio_venta > 0 && formData.precio_base > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      Margen de Utilidad Calculado
                    </span>
                    <span className="text-lg font-bold text-blue-700">
                      {calcularMargen()}%
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Ganancia: ${(formData.precio_venta - formData.precio_base).toFixed(2)} MXN
                  </div>
                </div>
              )}

              {/* IVA y Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="iva"
                    checked={formData.iva}
                    onChange={(e) => setFormData({ ...formData, iva: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="iva" className="text-sm font-medium text-gray-700">
                    Aplica IVA
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="producto">Producto</option>
                    <option value="servicio">Servicio</option>
                    <option value="materia_prima">Materia Prima</option>
                  </select>
                </div>
              </div>

              {/* Activo */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                  Producto activo
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingProducto ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Import Modal */}
      <ImportProductosModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => refreshProductos()}
        companyId={user?.company_id || ''}
      />
    </div>
  );
};
