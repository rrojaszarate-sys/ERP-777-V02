/**
 * KitsEventoPage - Gestión de kits de materiales para eventos
 * 
 * Define plantillas de kits (boda, XV años, etc.) con productos
 * y cantidades por persona para calcular automáticamente necesidades.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  Calculator,
  Users,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import {
  fetchKits,
  fetchKitConDetalle,
  createKit,
  updateKit,
  deleteKit,
  agregarProductoAKit,
  actualizarProductoKit,
  eliminarProductoDeKit,
  calcularNecesidadesKit,
  crearReservasDesdeKit,
} from '../services/kitsService';
import { fetchProductos } from '../services/inventarioService';
import type { KitEvento, KitEventoDetalle, TipoEvento } from '../types';

const TIPOS_EVENTO: Record<TipoEvento, { label: string; emoji: string; color: string }> = {
  boda: { label: 'Boda', emoji: '💒', color: '#EC4899' },
  xv_años: { label: 'XV Años', emoji: '👗', color: '#A855F7' },
  bautizo: { label: 'Bautizo', emoji: '👶', color: '#38BDF8' },
  comunion: { label: 'Comunión', emoji: '⛪', color: '#F59E0B' },
  graduacion: { label: 'Graduación', emoji: '🎓', color: '#10B981' },
  corporativo: { label: 'Corporativo', emoji: '🏢', color: '#6366F1' },
  cumpleaños: { label: 'Cumpleaños', emoji: '🎂', color: '#F43F5E' },
  otro: { label: 'Otro', emoji: '🎉', color: '#64748B' },
};

export const KitsEventoPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoEvento | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingKit, setEditingKit] = useState<KitEvento | null>(null);
  const [expandedKit, setExpandedKit] = useState<number | null>(null);
  const [showCalculadora, setShowCalculadora] = useState<number | null>(null);
  const [numPersonas, setNumPersonas] = useState('100');
  const [showAddProducto, setShowAddProducto] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_evento: '' as TipoEvento | '',
    capacidad_personas: '',
    descripcion: '',
    activo: true,
  });

  // Nuevo producto form
  const [nuevoProducto, setNuevoProducto] = useState({
    producto_id: '',
    cantidad_por_persona: '',
    cantidad_minima: '',
    notas: '',
  });

  // Colores dinámicos
  const colors = {
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    bg: isDark ? '#1a1a2e' : '#f8fafc',
    card: isDark ? '#16213e' : '#ffffff',
    text: isDark ? '#e2e8f0' : '#1e293b',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
  };

  // Queries
  const { data: productos = [] } = useQuery({
    queryKey: ['productos', companyId],
    queryFn: () => fetchProductos(companyId),
    enabled: !!companyId,
  });

  const { data: kits = [], isLoading } = useQuery({
    queryKey: ['kits', companyId, tipoFiltro],
    queryFn: () => fetchKits(companyId, { tipoEvento: tipoFiltro || undefined }),
    enabled: !!companyId,
  });

  const { data: kitDetalle } = useQuery({
    queryKey: ['kit-detalle', expandedKit],
    queryFn: () => fetchKitConDetalle(expandedKit!),
    enabled: !!expandedKit,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Omit<KitEvento, 'id' | 'created_at' | 'updated_at'>) =>
      createKit({ ...data, empresa_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast.success('Kit creado correctamente');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear kit');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<KitEvento> }) =>
      updateKit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast.success('Kit actualizado');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast.success('Kit eliminado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar');
    },
  });

  const addProductoMutation = useMutation({
    mutationFn: ({ kitId, detalle }: { kitId: number; detalle: Omit<KitEventoDetalle, 'id'> }) =>
      agregarProductoAKit(kitId, detalle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kit-detalle'] });
      toast.success('Producto agregado al kit');
      setShowAddProducto(null);
      setNuevoProducto({ producto_id: '', cantidad_por_persona: '', cantidad_minima: '', notas: '' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al agregar producto');
    },
  });

  const removeProductoMutation = useMutation({
    mutationFn: eliminarProductoDeKit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kit-detalle'] });
      toast.success('Producto eliminado del kit');
    },
  });

  // Filtrar kits
  const kitsFiltrados = useMemo(() => {
    return kits.filter((k) => {
      return !busqueda || k.nombre.toLowerCase().includes(busqueda.toLowerCase());
    });
  }, [kits, busqueda]);

  // Handlers
  const resetForm = () => {
    setFormData({
      nombre: '',
      tipo_evento: '',
      capacidad_personas: '',
      descripcion: '',
      activo: true,
    });
    setEditingKit(null);
    setShowForm(false);
  };

  const handleEdit = (kit: KitEvento) => {
    setEditingKit(kit);
    setFormData({
      nombre: kit.nombre,
      tipo_evento: kit.tipo_evento,
      capacidad_personas: kit.capacidad_personas?.toString() || '',
      descripcion: kit.descripcion || '',
      activo: kit.activo,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.tipo_evento) {
      toast.error('Nombre y tipo de evento son requeridos');
      return;
    }

    const data = {
      nombre: formData.nombre,
      tipo_evento: formData.tipo_evento as TipoEvento,
      capacidad_personas: formData.capacidad_personas ? parseInt(formData.capacidad_personas) : undefined,
      descripcion: formData.descripcion || undefined,
      activo: formData.activo,
      empresa_id: companyId,
    };

    if (editingKit) {
      updateMutation.mutate({ id: editingKit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddProducto = (kitId: number) => {
    if (!nuevoProducto.producto_id || !nuevoProducto.cantidad_por_persona) {
      toast.error('Producto y cantidad son requeridos');
      return;
    }
    addProductoMutation.mutate({
      kitId,
      detalle: {
        kit_id: kitId,
        producto_id: parseInt(nuevoProducto.producto_id),
        cantidad_por_persona: parseFloat(nuevoProducto.cantidad_por_persona),
        cantidad_minima: nuevoProducto.cantidad_minima ? parseInt(nuevoProducto.cantidad_minima) : undefined,
        notas: nuevoProducto.notas || undefined,
      },
    });
  };

  const calcularNecesidades = (detalle: KitEventoDetalle[]) => {
    const personas = parseInt(numPersonas) || 100;
    return detalle.map(d => ({
      ...d,
      cantidad_calculada: Math.ceil(d.cantidad_por_persona * personas),
      cantidad_final: Math.max(
        Math.ceil(d.cantidad_por_persona * personas),
        d.cantidad_minima || 0
      ),
    }));
  };

  return (
    <div className="p-6" style={{ backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <Package size={28} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
                Kits para Eventos
              </h1>
              <p style={{ color: colors.textMuted }}>
                Plantillas de materiales por tipo de evento
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={20} />
            Nuevo Kit
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: colors.textMuted }}
            />
            <input
              type="text"
              placeholder="Buscar kit..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {Object.entries(TIPOS_EVENTO).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setTipoFiltro(tipoFiltro === key ? '' : key as TipoEvento)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: tipoFiltro === key ? value.color : colors.card,
                  color: tipoFiltro === key ? 'white' : colors.text,
                  border: `1px solid ${tipoFiltro === key ? value.color : colors.border}`,
                }}
              >
                {value.emoji} {value.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de kits */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : kitsFiltrados.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <Package size={48} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No hay kits creados</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Crear primer kit
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {kitsFiltrados.map((kit) => {
            const tipoConfig = TIPOS_EVENTO[kit.tipo_evento];
            const isExpanded = expandedKit === kit.id;
            const detalles = isExpanded ? kitDetalle?.detalle || [] : [];

            return (
              <div
                key={kit.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${isExpanded ? tipoConfig.color : colors.border}`,
                }}
              >
                {/* Header del kit */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedKit(isExpanded ? null : kit.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${tipoConfig.color}20` }}
                    >
                      {tipoConfig.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg" style={{ color: colors.text }}>
                          {kit.nombre}
                        </h3>
                        {!kit.activo && (
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: '#EF444420', color: '#EF4444' }}
                          >
                            Inactivo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${tipoConfig.color}20`, color: tipoConfig.color }}
                        >
                          {tipoConfig.label}
                        </span>
                        {kit.capacidad_personas && (
                          <span className="flex items-center gap-1 text-sm" style={{ color: colors.textMuted }}>
                            <Users size={14} />
                            {kit.capacidad_personas} personas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCalculadora(showCalculadora === kit.id ? null : kit.id);
                      }}
                      className="p-2 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                      title="Calculadora de necesidades"
                    >
                      <Calculator size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(kit);
                      }}
                      className="p-2 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <Edit3 size={18} style={{ color: colors.textMuted }} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('¿Eliminar este kit?')) {
                          deleteMutation.mutate(kit.id);
                        }
                      }}
                      className="p-2 rounded-lg transition-colors hover:opacity-80"
                      style={{ color: '#EF4444' }}
                    >
                      <Trash2 size={18} />
                    </button>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Calculadora de necesidades */}
                {showCalculadora === kit.id && (
                  <div
                    className="mx-4 mb-4 p-4 rounded-lg"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <label className="font-medium" style={{ color: colors.text }}>
                        Calcular para:
                      </label>
                      <input
                        type="number"
                        value={numPersonas}
                        onChange={(e) => setNumPersonas(e.target.value)}
                        className="w-24 px-3 py-1 rounded-lg border focus:outline-none text-center"
                        style={{
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          color: colors.text,
                        }}
                      />
                      <span style={{ color: colors.textMuted }}>personas</span>
                    </div>

                    {detalles.length > 0 && (
                      <div className="space-y-2">
                        {calcularNecesidades(detalles).map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between p-2 rounded-lg"
                            style={{ backgroundColor: colors.card }}
                          >
                            <span style={{ color: colors.text }}>
                              {(d.producto as any)?.nombre}
                            </span>
                            <span className="font-bold" style={{ color: colors.primary }}>
                              {d.cantidad_final} unidades
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="border-t" style={{ borderColor: colors.border }}>
                    {kit.descripcion && (
                      <p className="px-4 py-3 text-sm" style={{ color: colors.textMuted }}>
                        {kit.descripcion}
                      </p>
                    )}

                    {/* Lista de productos */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium" style={{ color: colors.text }}>
                          Productos del kit
                        </h4>
                        <button
                          onClick={() => setShowAddProducto(showAddProducto === kit.id ? null : kit.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm"
                          style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                        >
                          <Plus size={16} />
                          Agregar producto
                        </button>
                      </div>

                      {/* Form para agregar producto */}
                      {showAddProducto === kit.id && (
                        <div
                          className="p-4 rounded-lg mb-4"
                          style={{ backgroundColor: colors.bg }}
                        >
                          <div className="grid grid-cols-4 gap-4">
                            <select
                              value={nuevoProducto.producto_id}
                              onChange={(e) => setNuevoProducto({ ...nuevoProducto, producto_id: e.target.value })}
                              className="px-3 py-2 rounded-lg border focus:outline-none"
                              style={{
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                color: colors.text,
                              }}
                            >
                              <option value="">Seleccionar producto</option>
                              {productos.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              placeholder="Cant. por persona"
                              value={nuevoProducto.cantidad_por_persona}
                              onChange={(e) => setNuevoProducto({ ...nuevoProducto, cantidad_por_persona: e.target.value })}
                              step="0.01"
                              className="px-3 py-2 rounded-lg border focus:outline-none"
                              style={{
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                color: colors.text,
                              }}
                            />
                            <input
                              type="number"
                              placeholder="Cantidad mínima"
                              value={nuevoProducto.cantidad_minima}
                              onChange={(e) => setNuevoProducto({ ...nuevoProducto, cantidad_minima: e.target.value })}
                              className="px-3 py-2 rounded-lg border focus:outline-none"
                              style={{
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                color: colors.text,
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddProducto(kit.id)}
                                className="flex-1 px-3 py-2 rounded-lg text-white"
                                style={{ backgroundColor: colors.primary }}
                                disabled={addProductoMutation.isPending}
                              >
                                {addProductoMutation.isPending ? '...' : 'Agregar'}
                              </button>
                              <button
                                onClick={() => setShowAddProducto(null)}
                                className="px-3 py-2 rounded-lg"
                                style={{ backgroundColor: colors.card, color: colors.textMuted }}
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tabla de productos */}
                      {detalles.length === 0 ? (
                        <p className="text-center py-4" style={{ color: colors.textMuted }}>
                          No hay productos en este kit
                        </p>
                      ) : (
                        <div
                          className="rounded-lg overflow-hidden"
                          style={{ border: `1px solid ${colors.border}` }}
                        >
                          <table className="w-full">
                            <thead>
                              <tr style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
                                <th className="text-left px-4 py-2 text-sm" style={{ color: colors.textMuted }}>
                                  Producto
                                </th>
                                <th className="text-center px-4 py-2 text-sm" style={{ color: colors.textMuted }}>
                                  Por persona
                                </th>
                                <th className="text-center px-4 py-2 text-sm" style={{ color: colors.textMuted }}>
                                  Mínimo
                                </th>
                                <th className="text-center px-4 py-2 text-sm" style={{ color: colors.textMuted }}>
                                  Para {numPersonas}
                                </th>
                                <th className="text-center px-4 py-2 text-sm" style={{ color: colors.textMuted }}>
                                  Acciones
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {calcularNecesidades(detalles).map((d) => (
                                <tr
                                  key={d.id}
                                  className="border-t"
                                  style={{ borderColor: colors.border }}
                                >
                                  <td className="px-4 py-3">
                                    <p className="font-medium" style={{ color: colors.text }}>
                                      {(d.producto as any)?.nombre}
                                    </p>
                                    {d.notas && (
                                      <p className="text-xs" style={{ color: colors.textMuted }}>
                                        {d.notas}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center" style={{ color: colors.text }}>
                                    {d.cantidad_por_persona}
                                  </td>
                                  <td className="px-4 py-3 text-center" style={{ color: colors.textMuted }}>
                                    {d.cantidad_minima || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="font-bold" style={{ color: colors.primary }}>
                                      {d.cantidad_final}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => {
                                        if (confirm('¿Eliminar producto del kit?')) {
                                          removeProductoMutation.mutate(d.id);
                                        }
                                      }}
                                      className="p-1 rounded hover:opacity-80"
                                      style={{ color: '#EF4444' }}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              {editingKit ? 'Editar Kit' : 'Nuevo Kit'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Nombre del kit *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Kit Boda Premium"
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Tipo de evento *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(TIPOS_EVENTO).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo_evento: key as TipoEvento })}
                      className="p-2 rounded-lg text-center transition-all"
                      style={{
                        backgroundColor: formData.tipo_evento === key ? value.color : colors.bg,
                        color: formData.tipo_evento === key ? 'white' : colors.text,
                        border: `1px solid ${formData.tipo_evento === key ? value.color : colors.border}`,
                      }}
                    >
                      <span className="text-xl">{value.emoji}</span>
                      <p className="text-xs mt-1">{value.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Capacidad sugerida (personas)
                </label>
                <input
                  type="number"
                  value={formData.capacidad_personas}
                  onChange={(e) => setFormData({ ...formData, capacidad_personas: e.target.value })}
                  placeholder="Ej: 150"
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none resize-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="activo" style={{ color: colors.text }}>
                  Kit activo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 rounded-lg border"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: colors.primary }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Guardando...'
                    : editingKit ? 'Actualizar' : 'Crear Kit'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitsEventoPage;
