import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
  Package, Plus, Search, Edit, Trash2, X, Save, Star,
  ArrowLeft, DollarSign, Clock, AlertCircle, CheckCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProductosByProveedor,
  fetchProveedores,
  createProveedorProducto,
  updateProveedorProducto,
  deleteProveedorProducto,
  setProveedorPreferido
} from '../services/proveedoresService';
import { fetchProductos } from '../../inventario-erp/services/inventarioService';
import { useAuth } from '../../../core/auth/AuthProvider';
import toast from 'react-hot-toast';

interface ProductoProveedor {
  id?: number;
  proveedor_id: number;
  producto_id: number;
  codigo_proveedor: string;
  precio_proveedor: number;
  tiempo_entrega_dias: number;
  cantidad_minima: number;
  es_preferido: boolean;
  notas: string;
  activo: boolean;
}

export const CatalogoProveedorPage: React.FC = () => {
  const { proveedorId } = useParams<{ proveedorId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = user?.company_id || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<ProductoProveedor>({
    proveedor_id: parseInt(proveedorId || '0'),
    producto_id: 0,
    codigo_proveedor: '',
    precio_proveedor: 0,
    tiempo_entrega_dias: 7,
    cantidad_minima: 1,
    es_preferido: false,
    notas: '',
    activo: true
  });

  // Query: Obtener proveedor info
  const { data: proveedores } = useQuery({
    queryKey: ['proveedores', companyId],
    queryFn: () => fetchProveedores(companyId),
    enabled: !!companyId
  });

  const proveedor = proveedores?.find((p: any) => p.id === parseInt(proveedorId || '0'));

  // Query: Obtener productos del proveedor
  const { data: productosProveedor = [], isLoading } = useQuery({
    queryKey: ['productos-proveedor', proveedorId, companyId],
    queryFn: () => fetchProductosByProveedor(parseInt(proveedorId || '0'), companyId),
    enabled: !!proveedorId && !!companyId
  });

  // Query: Obtener todos los productos para el selector
  const { data: todosProductos = [] } = useQuery({
    queryKey: ['productos', companyId],
    queryFn: () => fetchProductos(companyId),
    enabled: !!companyId
  });

  // Productos que aún no están asociados al proveedor
  const productosDisponibles = todosProductos.filter(
    (p: any) => !productosProveedor.some((pp: any) => pp.producto_id === p.id)
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => createProveedorProducto({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos-proveedor'] });
      toast.success('Producto agregado al catálogo');
      handleCloseModal();
    },
    onError: (error: any) => toast.error(`Error: ${error.message}`)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateProveedorProducto(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos-proveedor'] });
      toast.success('Producto actualizado');
      handleCloseModal();
    },
    onError: (error: any) => toast.error(`Error: ${error.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProveedorProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos-proveedor'] });
      toast.success('Producto eliminado del catálogo');
    },
    onError: (error: any) => toast.error(`Error: ${error.message}`)
  });

  const setPreferidoMutation = useMutation({
    mutationFn: ({ productoId, ppId }: { productoId: number; ppId: number }) =>
      setProveedorPreferido(productoId, ppId, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos-proveedor'] });
      toast.success('Proveedor preferido actualizado');
    },
    onError: (error: any) => toast.error(`Error: ${error.message}`)
  });

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        proveedor_id: item.proveedor_id,
        producto_id: item.producto_id,
        codigo_proveedor: item.codigo_proveedor || '',
        precio_proveedor: item.precio_proveedor || 0,
        tiempo_entrega_dias: item.tiempo_entrega_dias || 7,
        cantidad_minima: item.cantidad_minima || 1,
        es_preferido: item.es_preferido || false,
        notas: item.notas || '',
        activo: item.activo !== false
      });
    } else {
      setEditingItem(null);
      setFormData({
        proveedor_id: parseInt(proveedorId || '0'),
        producto_id: 0,
        codigo_proveedor: '',
        precio_proveedor: 0,
        tiempo_entrega_dias: 7,
        cantidad_minima: 1,
        es_preferido: false,
        notas: '',
        activo: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.producto_id) {
      toast.error('Selecciona un producto');
      return;
    }
    if (formData.precio_proveedor <= 0) {
      toast.error('El precio debe ser mayor a 0');
      return;
    }

    if (editingItem?.id) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Eliminar este producto del catálogo del proveedor?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredProductos = productosProveedor.filter((pp: any) =>
    pp.producto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pp.producto?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pp.codigo_proveedor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/proveedores/catalogo"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Proveedores
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-orange-600" />
              Catálogo de Productos
            </h1>
            <p className="text-gray-600 mt-1">
              {proveedor ? (
                <>
                  <span className="font-medium">{proveedor.razon_social}</span>
                  {proveedor.nombre_comercial && (
                    <span className="text-gray-500"> ({proveedor.nombre_comercial})</span>
                  )}
                </>
              ) : (
                'Cargando proveedor...'
              )}
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            disabled={productosDisponibles.length === 0}
          >
            <Plus className="w-5 h-5" />
            Agregar Producto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Productos en Catálogo</p>
          <p className="text-2xl font-bold text-gray-900">{productosProveedor.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Activos</p>
          <p className="text-2xl font-bold text-green-600">
            {productosProveedor.filter((p: any) => p.activo).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Preferidos</p>
          <p className="text-2xl font-bold text-yellow-600">
            {productosProveedor.filter((p: any) => p.es_preferido).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Tiempo Prom. Entrega</p>
          <p className="text-2xl font-bold text-blue-600">
            {productosProveedor.length > 0
              ? Math.round(productosProveedor.reduce((s: number, p: any) => s + (p.tiempo_entrega_dias || 0), 0) / productosProveedor.length)
              : 0} días
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar producto o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código Prov.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Entrega</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Min.</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No hay productos en el catálogo</p>
                  </td>
                </tr>
              ) : (
                filteredProductos.map((pp: any) => (
                  <tr key={pp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {pp.es_preferido && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {pp.producto?.nombre}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pp.producto?.codigo} • {pp.producto?.categoria}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      {pp.codigo_proveedor || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        ${pp.precio_proveedor?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                      {pp.producto?.precio_venta && (
                        <div className="text-xs text-gray-500">
                          Venta: ${pp.producto.precio_venta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {pp.tiempo_entrega_dias} días
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {pp.cantidad_minima}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        pp.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pp.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!pp.es_preferido && (
                          <button
                            onClick={() => setPreferidoMutation.mutate({
                              productoId: pp.producto_id,
                              ppId: pp.id
                            })}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                            title="Marcar como preferido"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenModal(pp)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pp.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full"
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Editar Producto' : 'Agregar Producto'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto *
                  </label>
                  <select
                    required
                    value={formData.producto_id}
                    onChange={(e) => setFormData({ ...formData, producto_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Selecciona un producto</option>
                    {productosDisponibles.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código del Proveedor
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_proveedor}
                    onChange={(e) => setFormData({ ...formData, codigo_proveedor: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono"
                    placeholder="SKU-PROV"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Proveedor *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.precio_proveedor}
                      onChange={(e) => setFormData({ ...formData, precio_proveedor: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiempo de Entrega (días)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.tiempo_entrega_dias}
                    onChange={(e) => setFormData({ ...formData, tiempo_entrega_dias: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad Mínima
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cantidad_minima}
                    onChange={(e) => setFormData({ ...formData, cantidad_minima: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  rows={2}
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.es_preferido}
                    onChange={(e) => setFormData({ ...formData, es_preferido: e.target.checked })}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Proveedor preferido</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Activo</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editingItem ? 'Actualizar' : 'Agregar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
