import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Warehouse, Plus, Search, Edit, Trash2, X, Save,
  MapPin, Building2, Package
} from 'lucide-react';
import { useAlmacenes, useCreateAlmacen, useUpdateAlmacen, useDeleteAlmacen } from '../hooks/useInventario';

interface Almacen {
  id?: number;
  company_id?: string;
  codigo: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  direccion: string;
  ciudad: string;
  estado: string;
  responsable: string;
  telefono: string;
  capacidad_m3: number;
  activo: boolean;
}

export const AlmacenesPage: React.FC = () => {
  const { data: almacenes = [], isLoading } = useAlmacenes();
  const createMutation = useCreateAlmacen();
  const updateMutation = useUpdateAlmacen();
  const deleteMutation = useDeleteAlmacen();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAlmacen, setEditingAlmacen] = useState<Almacen | null>(null);
  const [formData, setFormData] = useState<Almacen>({
    codigo: '',
    nombre: '',
    tipo: 'general',
    descripcion: '',
    direccion: '',
    ciudad: '',
    estado: '',
    responsable: '',
    telefono: '',
    capacidad_m3: 0,
    activo: true
  });

  const tipos = [
    'general',
    'materias_primas',
    'productos_terminados',
    'herramientas',
    'refacciones',
    'transito',
    'cuarentena'
  ];

  const tiposLabels: Record<string, string> = {
    general: 'General',
    materias_primas: 'Materias Primas',
    productos_terminados: 'Productos Terminados',
    herramientas: 'Herramientas',
    refacciones: 'Refacciones',
    transito: 'En Tránsito',
    cuarentena: 'Cuarentena'
  };

  const estados = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato',
    'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit',
    'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  // Filtrar almacenes
  const filteredAlmacenes = almacenes.filter((alm: Almacen) =>
    alm.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alm.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alm.tipo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas
  const stats = {
    total: almacenes.length,
    activos: almacenes.filter((a: Almacen) => a.activo).length,
    capacidadTotal: almacenes.reduce((sum: number, a: Almacen) => sum + (a.capacidad_m3 || 0), 0),
    tipos: new Set(almacenes.map((a: Almacen) => a.tipo)).size
  };

  const openModal = (almacen?: Almacen) => {
    if (almacen) {
      setEditingAlmacen(almacen);
      setFormData(almacen);
    } else {
      setEditingAlmacen(null);
      setFormData({
        codigo: '',
        nombre: '',
        tipo: 'general',
        descripcion: '',
        direccion: '',
        ciudad: '',
        estado: '',
        responsable: '',
        telefono: '',
        capacidad_m3: 0,
        activo: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAlmacen(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAlmacen?.id) {
        await updateMutation.mutateAsync({
          id: editingAlmacen.id,
          almacen: formData
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      closeModal();
    } catch (error) {
      console.error('Error al guardar almacén:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este almacén?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error al eliminar almacén:', error);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-100 rounded-lg">
            <Warehouse className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Almacenes</h1>
            <p className="text-gray-500">Gestión de almacenes y bodegas</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Almacén</span>
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
              <p className="text-sm text-gray-500">Total Almacenes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Building2 className="w-10 h-10 text-teal-500" />
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
              <p className="text-sm text-gray-500">Almacenes Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.activos}</p>
            </div>
            <Warehouse className="w-10 h-10 text-green-500" />
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
              <p className="text-sm text-gray-500">Capacidad Total</p>
              <p className="text-2xl font-bold text-blue-600">{stats.capacidadTotal.toLocaleString()} m³</p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
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
              <p className="text-sm text-gray-500">Tipos de Almacén</p>
              <p className="text-2xl font-bold text-purple-600">{stats.tipos}</p>
            </div>
            <MapPin className="w-10 h-10 text-purple-500" />
          </div>
        </motion.div>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-2 text-gray-400">
          <Search className="w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-700"
          />
        </div>
      </div>

      {/* Tabla de almacenes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando almacenes...</div>
        ) : filteredAlmacenes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No se encontraron almacenes</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAlmacenes.map((almacen: Almacen) => (
                  <motion.tr
                    key={almacen.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">{almacen.codigo}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{almacen.nombre}</div>
                      {almacen.descripcion && (
                        <div className="text-sm text-gray-500">{almacen.descripcion}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800">
                        {tiposLabels[almacen.tipo] || almacen.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {almacen.ciudad && almacen.estado ? (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{almacen.ciudad}, {almacen.estado}</span>
                          </div>
                        ) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{almacen.responsable || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {almacen.capacidad_m3 > 0 ? `${almacen.capacidad_m3.toLocaleString()} m³` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        almacen.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {almacen.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal(almacen)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(almacen.id!)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
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
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingAlmacen ? 'Editar Almacén' : 'Nuevo Almacén'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información General */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent uppercase"
                      placeholder="ALM-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Almacén Principal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo *
                    </label>
                    <select
                      required
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {tipos.map((tipo) => (
                        <option key={tipo} value={tipo}>{tiposLabels[tipo]}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacidad (m³)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.capacidad_m3}
                      onChange={(e) => setFormData({ ...formData, capacidad_m3: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      rows={2}
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Descripción del almacén..."
                    />
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        value={formData.ciudad}
                        onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <select
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar...</option>
                        {estados.map((estado) => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsable */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Responsable</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Responsable
                    </label>
                    <input
                      type="text"
                      value={formData.responsable}
                      onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Estado Activo */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                  Almacén Activo
                </label>
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400"
                >
                  <Save className="w-5 h-5" />
                  <span>{editingAlmacen ? 'Actualizar' : 'Crear'} Almacén</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
