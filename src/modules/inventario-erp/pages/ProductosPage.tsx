import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Plus, Search, Edit, Trash2, AlertCircle, X,
  Save, DollarSign, Tag, BarChart3, Upload, Download,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { useProductos, Producto } from '../hooks/useProductos';
import { ImportProductosModal } from '../components/ImportProductosModal';
import { useAuth } from '../../../core/auth/AuthProvider';
import { useTheme } from '../../../shared/components/theme';

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
  const { paletteConfig, isDark } = useTheme();
  
  // Colores dinámicos basados en la paleta
  const colors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    bg: isDark ? '#111827' : '#f9fafb',
    card: isDark ? '#1f2937' : '#ffffff',
    cardHover: isDark ? '#374151' : '#f3f4f6',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#f9fafb' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    textSecondary: isDark ? '#d1d5db' : '#4b5563',
  }), [paletteConfig, isDark]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(25); // 10, 25, 50, 100, 'all'
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

  const filteredProductos = useMemo(() =>
    productos?.filter(p =>
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clave?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []
  , [productos, searchTerm]);

  // Productos paginados
  const { paginatedProductos, totalPages, startIndex, endIndex } = useMemo(() => {
    const total = filteredProductos.length;

    if (itemsPerPage === 'all') {
      return {
        paginatedProductos: filteredProductos,
        totalPages: 1,
        startIndex: 0,
        endIndex: total
      };
    }

    const totalPgs = Math.ceil(total / itemsPerPage);
    const validPage = Math.min(currentPage, totalPgs || 1);
    const start = (validPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, total);

    return {
      paginatedProductos: filteredProductos.slice(start, end),
      totalPages: totalPgs,
      startIndex: start,
      endIndex: end
    };
  }, [filteredProductos, currentPage, itemsPerPage]);

  // Reset page cuando cambia el filtro
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
    <div className="p-6 min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: colors.text }}>
              <Package className="w-8 h-8" style={{ color: colors.primary }} />
              Catálogo de Productos
            </h1>
            <p className="mt-1" style={{ color: colors.textMuted }}>
              Gestiona tu inventario de productos y servicios
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2 hover:opacity-80"
              style={{ borderColor: colors.primary, color: colors.primary }}
            >
              <Upload className="w-5 h-5" />
              Importar CSV
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 text-white rounded-lg font-medium transition-colors flex items-center gap-2 hover:opacity-90"
              style={{ backgroundColor: colors.primary }}
            >
              <Plus className="w-5 h-5" />
              Nuevo Producto
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Total Productos</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{productos?.length || 0}</p>
            </div>
            <Package className="w-8 h-8" style={{ color: colors.primary }} />
          </div>
        </div>

        <div className="rounded-lg p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Activos</p>
              <p className="text-2xl font-bold text-green-600">
                {productos?.filter(p => p.activo).length || 0}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="rounded-lg p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Categorías</p>
              <p className="text-2xl font-bold" style={{ color: colors.secondary }}>
                {new Set(productos?.map(p => p.categoria)).size || 0}
              </p>
            </div>
            <Tag className="w-8 h-8" style={{ color: colors.secondary }} />
          </div>
        </div>

        <div className="rounded-lg p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Valor Promedio</p>
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: colors.textMuted }} />
          <input
            type="text"
            placeholder="Buscar por nombre, código o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:outline-none"
            style={{ 
              backgroundColor: colors.card, 
              borderColor: colors.border, 
              color: colors.text,
              '--tw-ring-color': colors.primary
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg shadow-sm border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b" style={{ backgroundColor: isDark ? '#374151' : '#f9fafb', borderColor: colors.border }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Unidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  P. Compra
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  P. Venta
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Margen
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: colors.border }}>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }}></div>
                    </div>
                  </td>
                </tr>
              ) : filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textMuted }} />
                    <p style={{ color: colors.textMuted }}>No hay productos registrados</p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="mt-3 font-medium hover:opacity-80"
                      style={{ color: colors.primary }}
                    >
                      Crear primer producto
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedProductos.map((producto) => {
                  const margen = producto.precio_venta > 0 && producto.precio_base > 0
                    ? ((producto.precio_venta - producto.precio_base) / producto.precio_venta) * 100
                    : producto.margen || 0;

                  return (
                    <tr key={producto.id} className="transition-colors" style={{ backgroundColor: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.cardHover} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-medium" style={{ color: colors.text }}>
                          {producto.clave}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium" style={{ color: colors.text }}>{producto.nombre}</div>
                          {producto.descripcion && (
                            <div className="text-sm truncate max-w-xs" style={{ color: colors.textMuted }}>
                              {producto.descripcion}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: `${colors.secondary}20`, color: colors.secondary }}>
                          {producto.categoria || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: colors.text }}>
                        {producto.unidad}
                      </td>
                      <td className="px-6 py-4 text-right text-sm" style={{ color: colors.text }}>
                        ${(producto.precio_base || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium" style={{ color: colors.text }}>
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
                            className="p-2 rounded-lg transition-colors hover:opacity-80"
                            style={{ color: colors.primary, backgroundColor: `${colors.primary}10` }}
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

        {/* Paginación */}
        {filteredProductos.length > 0 && (
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: colors.border }}>
            {/* Info de registros */}
            <div className="text-sm" style={{ color: colors.textMuted }}>
              Mostrando {startIndex + 1} - {endIndex} de {filteredProductos.length} productos
            </div>

            {/* Controles de paginación */}
            <div className="flex items-center gap-4">
              {/* Selector de items por página */}
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: colors.textMuted }}>Mostrar:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const value = e.target.value === 'all' ? 'all' : Number(e.target.value);
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                  className="border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:outline-none"
                  style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">Todos</option>
                </select>
              </div>

              {/* Botones de navegación */}
              {itemsPerPage !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-80"
                    style={{ borderColor: colors.border, color: colors.text }}
                    title="Primera página"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-80"
                    style={{ borderColor: colors.border, color: colors.text }}
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium" style={{ color: colors.text }}>{currentPage}</span>
                    <span className="text-sm" style={{ color: colors.textMuted }}>de</span>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>{totalPages}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-80"
                    style={{ borderColor: colors.border, color: colors.text }}
                    title="Página siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-80"
                    style={{ borderColor: colors.border, color: colors.text }}
                    title="Última página"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: colors.card }}
          >
            <div className="sticky top-0 border-b px-6 py-4 flex items-center justify-between" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="transition-colors hover:opacity-70"
                style={{ color: colors.textMuted }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Clave y Nombre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Clave <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clave}
                    onChange={(e) => setFormData({ ...formData, clave: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none font-mono"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    placeholder="PROD-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    placeholder="Nombre del producto"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  placeholder="Descripción detallada del producto"
                />
              </div>

              {/* Categoría y Unidad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  >
                    <option value="">Selecciona una categoría</option>
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Unidad de Medida <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
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
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Precio Base <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }}>$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.precio_base}
                      onChange={(e) => setFormData({ ...formData, precio_base: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Precio de Venta <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }}>$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.precio_venta}
                      onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Costo y Margen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Costo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.costo}
                      onChange={(e) => setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Margen (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.margen}
                    onChange={(e) => setFormData({ ...formData, margen: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    placeholder="30"
                  />
                </div>
              </div>

              {/* Margen calculado */}
              {formData.precio_venta > 0 && formData.precio_base > 0 && (
                <div className="rounded-lg p-4" style={{ backgroundColor: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: colors.text }}>
                      Margen de Utilidad Calculado
                    </span>
                    <span className="text-lg font-bold" style={{ color: colors.primary }}>
                      {calcularMargen()}%
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
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
                    className="w-4 h-4 rounded focus:ring-2"
                    style={{ accentColor: colors.primary }}
                  />
                  <label htmlFor="iva" className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                    Aplica IVA
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Tipo
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
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
                  className="w-4 h-4 rounded focus:ring-2"
                  style={{ accentColor: colors.primary }}
                />
                <label htmlFor="activo" className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Producto activo
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded-lg transition-colors hover:opacity-80"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded-lg font-medium transition-colors flex items-center gap-2 hover:opacity-90"
                  style={{ backgroundColor: colors.primary }}
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
