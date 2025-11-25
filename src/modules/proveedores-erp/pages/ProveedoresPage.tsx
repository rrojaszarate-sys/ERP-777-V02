import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Truck, Plus, Search, Edit, Trash2, X, Save,
  Phone, Mail, MapPin, FileText, Star, Users
} from 'lucide-react';
import { useProveedores, useCreateProveedor, useUpdateProveedor, useDeleteProveedor } from '../hooks/useProveedores';

interface Proveedor {
  id?: number;
  company_id?: string;
  razon_social: string;
  nombre_comercial: string;
  rfc: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  contacto_nombre: string;
  contacto_telefono: string;
  contacto_email: string;
  categoria: string;
  calificacion_calidad: number;
  tiempo_entrega_promedio: number;
  notas: string;
  activo: boolean;
}

export const ProveedoresPage: React.FC = () => {
  const { data: proveedores = [], isLoading } = useProveedores();
  const createMutation = useCreateProveedor();
  const updateMutation = useUpdateProveedor();
  const deleteMutation = useDeleteProveedor();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState<Proveedor>({
    razon_social: '',
    nombre_comercial: '',
    rfc: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    estado: '',
    codigo_postal: '',
    contacto_nombre: '',
    contacto_telefono: '',
    contacto_email: '',
    categoria: 'Alimentos y Bebidas',
    calificacion_calidad: 5,
    tiempo_entrega_promedio: 0,
    notas: '',
    activo: true
  });

  const categorias = [
    'Alimentos y Bebidas',
    'Decoración',
    'Equipo Audiovisual',
    'Mobiliario',
    'Servicios de Catering',
    'Transporte y Logística',
    'Material de Limpieza',
    'Servicios Profesionales',
    'Otros'
  ];

  const estados = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato',
    'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit',
    'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  // Filtrar proveedores
  const filteredProveedores = proveedores.filter((prov: Proveedor) =>
    prov.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prov.nombre_comercial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prov.rfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prov.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas
  const stats = {
    total: proveedores.length,
    activos: proveedores.filter((p: Proveedor) => p.activo).length,
    categorias: new Set(proveedores.map((p: Proveedor) => p.categoria)).size,
    promedioCalificacion: proveedores.length > 0
      ? (proveedores.reduce((sum: number, p: Proveedor) => sum + (p.calificacion_calidad || 0), 0) / proveedores.length).toFixed(1)
      : '0.0'
  };

  const openModal = (proveedor?: Proveedor) => {
    if (proveedor) {
      setEditingProveedor(proveedor);
      setFormData(proveedor);
    } else {
      setEditingProveedor(null);
      setFormData({
        razon_social: '',
        nombre_comercial: '',
        rfc: '',
        email: '',
        telefono: '',
        direccion: '',
        ciudad: '',
        estado: '',
        codigo_postal: '',
        contacto_nombre: '',
        contacto_telefono: '',
        contacto_email: '',
        categoria: 'Alimentos y Bebidas',
        calificacion_calidad: 5,
        tiempo_entrega_promedio: 0,
        notas: '',
        activo: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProveedor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProveedor?.id) {
        await updateMutation.mutateAsync({
          id: editingProveedor.id,
          proveedor: formData
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      closeModal();
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este proveedor?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error al eliminar proveedor:', error);
      }
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Truck className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Catálogo de Proveedores</h1>
            <p className="text-gray-500">Gestión completa de proveedores</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Proveedor</span>
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
              <p className="text-sm text-gray-500">Total Proveedores</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="w-10 h-10 text-orange-500" />
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
              <p className="text-sm text-gray-500">Proveedores Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.activos}</p>
            </div>
            <Truck className="w-10 h-10 text-green-500" />
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
              <p className="text-sm text-gray-500">Categorías</p>
              <p className="text-2xl font-bold text-blue-600">{stats.categorias}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-500" />
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
              <p className="text-sm text-gray-500">Calificación Promedio</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.promedioCalificacion} ⭐</p>
            </div>
            <Star className="w-10 h-10 text-yellow-500" />
          </div>
        </motion.div>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-2 text-gray-400">
          <Search className="w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por razón social, RFC, categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-700"
          />
        </div>
      </div>

      {/* Tabla de proveedores */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando proveedores...</div>
        ) : filteredProveedores.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No se encontraron proveedores</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RFC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calificación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProveedores.map((proveedor: Proveedor) => (
                  <motion.tr
                    key={proveedor.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-900">{proveedor.razon_social}</div>
                        {proveedor.nombre_comercial && (
                          <div className="text-sm text-gray-500">{proveedor.nombre_comercial}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{proveedor.rfc || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {proveedor.email && (
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span>{proveedor.email}</span>
                          </div>
                        )}
                        {proveedor.telefono && (
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{proveedor.telefono}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {proveedor.ciudad && proveedor.estado ? (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{proveedor.ciudad}, {proveedor.estado}</span>
                          </div>
                        ) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        {proveedor.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        {renderStars(proveedor.calificacion_calidad || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        proveedor.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {proveedor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal(proveedor)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(proveedor.id!)}
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
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
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
                      Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.razon_social}
                      onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Comercial
                    </label>
                    <input
                      type="text"
                      value={formData.nombre_comercial}
                      onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RFC *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={13}
                      value={formData.rfc}
                      onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría *
                    </label>
                    <select
                      required
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      {categorias.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Contacto
                    </label>
                    <input
                      type="text"
                      value={formData.contacto_nombre}
                      onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono del Contacto
                    </label>
                    <input
                      type="tel"
                      value={formData.contacto_telefono}
                      onChange={(e) => setFormData({ ...formData, contacto_telefono: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email del Contacto
                    </label>
                    <input
                      type="email"
                      value={formData.contacto_email}
                      onChange={(e) => setFormData({ ...formData, contacto_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Dirección */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dirección</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección Completa
                    </label>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        value={formData.ciudad}
                        onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <select
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar...</option>
                        {estados.map((estado) => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Código Postal
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={formData.codigo_postal}
                        onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Calificación y Métricas */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Calificación y Métricas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calificación de Calidad (1-5 estrellas)
                    </label>
                    <select
                      value={formData.calificacion_calidad}
                      onChange={(e) => setFormData({ ...formData, calificacion_calidad: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value={1}>⭐ (1 estrella)</option>
                      <option value={2}>⭐⭐ (2 estrellas)</option>
                      <option value={3}>⭐⭐⭐ (3 estrellas)</option>
                      <option value={4}>⭐⭐⭐⭐ (4 estrellas)</option>
                      <option value={5}>⭐⭐⭐⭐⭐ (5 estrellas)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tiempo de Entrega Promedio (días)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.tiempo_entrega_promedio}
                      onChange={(e) => setFormData({ ...formData, tiempo_entrega_promedio: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Notas adicionales sobre el proveedor..."
                />
              </div>

              {/* Estado Activo */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                  Proveedor Activo
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
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
                >
                  <Save className="w-5 h-5" />
                  <span>{editingProveedor ? 'Actualizar' : 'Crear'} Proveedor</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
