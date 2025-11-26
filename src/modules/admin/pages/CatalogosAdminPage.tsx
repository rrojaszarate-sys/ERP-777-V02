import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Plus, Edit, Trash2, X, Save, FolderOpen,
  Tag, Workflow, DollarSign, Building2, Check, Search,
  AlertCircle, RefreshCw, GripVertical, ChevronDown, ChevronRight,
  Package, Users, Briefcase, FileText, Layers, CreditCard,
  BookOpen, ClipboardList, Target, Clock, Star, Calculator
} from 'lucide-react';
import {
  catalogosService,
  CatalogoTipo,
  ItemCatalogo,
  catalogosInfo,
  catalogosPorModulo
} from '../services/catalogosService';
import toast from 'react-hot-toast';

export const CatalogosAdminPage: React.FC = () => {
  const [catalogoActivo, setCatalogoActivo] = useState<CatalogoTipo>('estados_workflow');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemCatalogo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  const [expandedModules, setExpandedModules] = useState<string[]>(['eventos']);

  const coloresDisponibles = [
    { value: '#3B82F6', label: 'Azul' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Amarillo' },
    { value: '#EF4444', label: 'Rojo' },
    { value: '#8B5CF6', label: 'Violeta' },
    { value: '#EC4899', label: 'Rosa' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#6B7280', label: 'Gris' },
    { value: '#14B8A6', label: 'Teal' },
    { value: '#F97316', label: 'Naranja' },
    { value: '#84CC16', label: 'Lima' },
    { value: '#A855F7', label: 'Púrpura' }
  ];

  // Información de módulos para la navegación
  const modulosInfo: Record<string, { nombre: string; icono: React.ReactNode; color: string }> = {
    eventos: { nombre: 'Eventos', icono: <Tag className="w-5 h-5" />, color: 'blue' },
    general: { nombre: 'General', icono: <Building2 className="w-5 h-5" />, color: 'purple' },
    proyectos: { nombre: 'Proyectos', icono: <Briefcase className="w-5 h-5" />, color: 'orange' },
    nomina: { nombre: 'Nómina', icono: <Users className="w-5 h-5" />, color: 'green' },
    inventario: { nombre: 'Inventario', icono: <Package className="w-5 h-5" />, color: 'yellow' },
    proveedores: { nombre: 'Proveedores', icono: <Layers className="w-5 h-5" />, color: 'cyan' },
    contabilidad: { nombre: 'Contabilidad', icono: <Calculator className="w-5 h-5" />, color: 'emerald' }
  };

  const toggleModule = (modulo: string) => {
    setExpandedModules(prev =>
      prev.includes(modulo)
        ? prev.filter(m => m !== modulo)
        : [...prev, modulo]
    );
  };

  // Query para obtener items del catálogo activo
  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-catalogo', catalogoActivo],
    queryFn: () => catalogosService.getAll(catalogoActivo),
    staleTime: 30000, // 30 segundos
  });

  // Query para obtener conteos de todos los catálogos
  const { data: counts = {} } = useQuery({
    queryKey: ['admin-catalogos-counts'],
    queryFn: () => catalogosService.getAllCounts(),
    staleTime: 60000, // 1 minuto
  });

  // Mutation para crear
  const createMutation = useMutation({
    mutationFn: (item: Omit<ItemCatalogo, 'id' | 'created_at' | 'updated_at'>) =>
      catalogosService.create(catalogoActivo, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-catalogo', catalogoActivo] });
      queryClient.invalidateQueries({ queryKey: ['admin-catalogos-counts'] });
      toast.success('Elemento creado correctamente');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(`Error al crear: ${error.message}`);
    }
  });

  // Mutation para actualizar
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ItemCatalogo> }) =>
      catalogosService.update(catalogoActivo, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-catalogo', catalogoActivo] });
      toast.success('Elemento actualizado correctamente');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar: ${error.message}`);
    }
  });

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalogosService.delete(catalogoActivo, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-catalogo', catalogoActivo] });
      queryClient.invalidateQueries({ queryKey: ['admin-catalogos-counts'] });
      toast.success('Elemento eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(`Error al eliminar: ${error.message}`);
    }
  });

  // Mutation para alternar activo
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      catalogosService.toggleActive(catalogoActivo, id, activo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-catalogo', catalogoActivo] });
      toast.success('Estado actualizado');
    },
    onError: (error: any) => {
      toast.error(`Error al cambiar estado: ${error.message}`);
    }
  });

  const openModal = (item?: ItemCatalogo) => {
    if (item) {
      setEditingItem(item);
    } else {
      setEditingItem(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleSubmit = (formData: Omit<ItemCatalogo, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingItem?.id) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.')) {
      deleteMutation.mutate(id);
    }
  };

  // Obtener información del catálogo activo
  const catalogoActivoInfo = catalogosInfo[catalogoActivo];

  // Filtrar items por búsqueda
  const filteredItems = items.filter((item: ItemCatalogo) =>
    item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Settings className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Administración de Catálogos</h1>
            <p className="text-gray-500">Gestión centralizada de catálogos del sistema</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Selector de Catálogos por Módulo */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel lateral de navegación */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Módulos del Sistema
          </h3>
          {Object.entries(catalogosPorModulo).map(([modulo, catalogosTipos]) => {
            const moduloData = modulosInfo[modulo];
            const isExpanded = expandedModules.includes(modulo);
            const tieneActivo = catalogosTipos.includes(catalogoActivo);

            return (
              <div key={modulo} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleModule(modulo)}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    tieneActivo ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg bg-${moduloData.color}-100`}>
                      {moduloData.icono}
                    </div>
                    <span className="font-medium text-gray-900">{moduloData.nombre}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {catalogosTipos.length}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100"
                  >
                    {catalogosTipos.map((tipo) => {
                      const info = catalogosInfo[tipo];
                      const isActive = catalogoActivo === tipo;
                      const count = counts[tipo] || 0;

                      return (
                        <button
                          key={tipo}
                          onClick={() => setCatalogoActivo(tipo)}
                          className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                            isActive
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{info.icono}</span>
                            <span className="text-sm">{info.nombre}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Panel principal de contenido */}
        <div className="lg:col-span-3">

      {/* Contenido del Catálogo */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{catalogoActivoInfo?.icono}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {catalogoActivoInfo?.nombre}
              </h2>
              <p className="text-sm text-gray-500">
                {catalogoActivoInfo?.descripcion}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
              />
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Cargando...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <p className="text-red-600">Error al cargar los datos</p>
              <button
                onClick={() => refetch()}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Reintentar
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>{searchTerm ? 'No se encontraron resultados' : 'No hay elementos en este catálogo'}</p>
              {!searchTerm && (
                <button
                  onClick={() => openModal()}
                  className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Crear el primero
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item: ItemCatalogo) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {item.icono && <span className="text-2xl">{item.icono}</span>}
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color || '#6B7280' }}
                      />
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => openModal(item)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => item.id && handleDelete(item.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.nombre}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.descripcion || 'Sin descripción'}</p>
                  <div className="flex items-center justify-between">
                    {item.orden !== undefined && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <GripVertical className="w-3 h-3 mr-1" />
                        Orden: {item.orden}
                      </span>
                    )}
                    <button
                      onClick={() => item.id && toggleActiveMutation.mutate({ id: item.id, activo: item.activo })}
                      className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                        item.activo
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {item.activo ? (
                        <span className="flex items-center">
                          <Check className="w-3 h-3 mr-1" />
                          Activo
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <X className="w-3 h-3 mr-1" />
                          Inactivo
                        </span>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
        </div> {/* Cierre del panel principal lg:col-span-3 */}
      </div> {/* Cierre del grid */}

      {/* Modal de Formulario */}
      {showModal && (
        <CatalogoFormModal
          catalogoTipo={catalogoActivo}
          item={editingItem}
          colores={coloresDisponibles}
          onClose={closeModal}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
};

// Componente Modal separado
const CatalogoFormModal: React.FC<{
  catalogoTipo: CatalogoTipo;
  item: ItemCatalogo | null;
  colores: { value: string; label: string }[];
  onClose: () => void;
  onSubmit: (data: Omit<ItemCatalogo, 'id' | 'created_at' | 'updated_at'>) => void;
  isLoading: boolean;
}> = ({ catalogoTipo, item, colores, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<Omit<ItemCatalogo, 'id' | 'created_at' | 'updated_at'>>({
    nombre: item?.nombre || '',
    descripcion: item?.descripcion || '',
    color: item?.color || '#3B82F6',
    icono: item?.icono || '',
    orden: item?.orden || 0,
    activo: item?.activo ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    onSubmit(formData);
  };

  // Obtener información del catálogo actual
  const catalogoInfo = catalogosInfo[catalogoTipo];
  const catalogoLabel = catalogoInfo?.nombre || catalogoTipo;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
      >
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{catalogoInfo?.icono}</span>
            <h2 className="text-xl font-bold text-gray-900">
              {item ? 'Editar' : 'Nuevo'} {catalogoLabel}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ingresa el nombre"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Descripción opcional"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {colores.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-indigo-500 scale-110 ring-2 ring-indigo-300'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icono (emoji)
              </label>
              <input
                type="text"
                maxLength={2}
                value={formData.icono}
                onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-2xl text-center"
                placeholder="🎉"
              />
              <p className="text-xs text-gray-500 mt-1">Puedes usar cualquier emoji</p>
            </div>
          </div>

          {/* Campo de orden para catálogos que lo requieren */}
          {catalogoInfo?.campos.includes('orden') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Orden
              </label>
              <input
                type="number"
                min="0"
                value={formData.orden}
                onChange={(e) => setFormData({ ...formData, orden: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Define el orden de aparición (0 = primero)</p>
            </div>
          )}

          {/* Campo de código para catálogos que lo requieren */}
          {catalogoInfo?.campos.includes('codigo') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                type="text"
                required
                value={formData.codigo || ''}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                placeholder="CODIGO"
              />
            </div>
          )}

          {/* Campo de banco para cuentas bancarias */}
          {catalogoInfo?.campos.includes('banco') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banco *
                </label>
                <input
                  type="text"
                  required
                  value={formData.banco || ''}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Nombre del banco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Cuenta
                </label>
                <input
                  type="text"
                  value={formData.numero_cuenta || ''}
                  onChange={(e) => setFormData({ ...formData, numero_cuenta: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                  placeholder="0000000000"
                />
              </div>
            </div>
          )}

          {/* Campo CLABE para cuentas bancarias */}
          {catalogoInfo?.campos.includes('clabe') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CLABE Interbancaria
              </label>
              <input
                type="text"
                maxLength={18}
                value={formData.clabe || ''}
                onChange={(e) => setFormData({ ...formData, clabe: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                placeholder="18 dígitos"
              />
            </div>
          )}

          {/* Campo de naturaleza para cuentas contables */}
          {catalogoInfo?.campos.includes('naturaleza') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Naturaleza
              </label>
              <select
                value={formData.naturaleza || 'deudora'}
                onChange={(e) => setFormData({ ...formData, naturaleza: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="deudora">Deudora</option>
                <option value="acreedora">Acreedora</option>
              </select>
            </div>
          )}

          {/* Campo de es_deduccion para conceptos de nómina */}
          {catalogoInfo?.campos.includes('es_deduccion') && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="es_deduccion"
                checked={formData.es_deduccion || false}
                onChange={(e) => setFormData({ ...formData, es_deduccion: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="es_deduccion" className="text-sm font-medium text-gray-700">
                Es deducción (resta del salario)
              </label>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="activo" className="text-sm font-medium text-gray-700">
              Activo
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{item ? 'Actualizar' : 'Crear'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
