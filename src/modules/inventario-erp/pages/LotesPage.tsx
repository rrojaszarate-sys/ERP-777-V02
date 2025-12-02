/**
 * LotesPage - Gestión de lotes de inventario
 * 
 * Permite gestionar lotes con fechas de fabricación, caducidad,
 * trazabilidad y control FIFO/FEFO.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  Eye,
  Truck,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import {
  fetchLotes,
  createLote,
  updateLote,
  fetchLotesProximosAVencer,
  marcarLotesVencidos,
  getEstadisticasLotes,
  generarNumeroLote,
} from '../services/lotesService';
import { fetchProductos, fetchAlmacenes } from '../services/inventarioService';
import { fetchUbicaciones } from '../services/ubicacionesService';
import type { LoteInventario, EstadoLote, Producto } from '../types';

const ESTADOS_LOTE: Record<EstadoLote, { label: string; color: string; icon: React.ElementType }> = {
  activo: { label: 'Activo', color: '#10B981', icon: CheckCircle },
  agotado: { label: 'Agotado', color: '#6B7280', icon: Package },
  vencido: { label: 'Vencido', color: '#EF4444', icon: XCircle },
  bloqueado: { label: 'Bloqueado', color: '#F59E0B', icon: AlertTriangle },
};

export const LotesPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoLote | ''>('');
  const [almacenFiltro, setAlmacenFiltro] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLote, setEditingLote] = useState<LoteInventario | null>(null);
  const [viewMode, setViewMode] = useState<'lista' | 'por-vencer'>('lista');

  // Form state
  const [formData, setFormData] = useState({
    producto_id: 0,
    almacen_id: 0,
    ubicacion_id: '',
    numero_lote: '',
    fecha_fabricacion: '',
    fecha_caducidad: '',
    cantidad_inicial: '',
    costo_unitario: '',
    documento_compra: '',
  });

  // Colores dinámicos
  const colors = {
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    accent: paletteConfig.accent,
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

  const { data: almacenes = [] } = useQuery({
    queryKey: ['almacenes', companyId],
    queryFn: () => fetchAlmacenes(companyId),
    enabled: !!companyId,
  });

  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones', companyId, formData.almacen_id],
    queryFn: () => fetchUbicaciones(companyId, formData.almacen_id || undefined),
    enabled: !!companyId && !!formData.almacen_id,
  });

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ['lotes', companyId, estadoFiltro, almacenFiltro],
    queryFn: () => fetchLotes(companyId, {
      estado: estadoFiltro || undefined,
      almacenId: almacenFiltro || undefined,
    }),
    enabled: !!companyId,
  });

  const { data: lotesProximosVencer = [] } = useQuery({
    queryKey: ['lotes-vencer', companyId],
    queryFn: () => fetchLotesProximosAVencer(companyId, 30),
    enabled: !!companyId && viewMode === 'por-vencer',
  });

  const { data: estadisticas } = useQuery({
    queryKey: ['lotes-stats', companyId],
    queryFn: () => getEstadisticasLotes(companyId),
    enabled: !!companyId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<LoteInventario>) => createLote(data, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] });
      toast.success('Lote creado correctamente');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear lote');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LoteInventario> }) =>
      updateLote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] });
      toast.success('Lote actualizado');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar');
    },
  });

  const marcarVencidosMutation = useMutation({
    mutationFn: () => marcarLotesVencidos(companyId),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] });
      toast.success(`${count} lotes marcados como vencidos`);
    },
  });

  // Filtrar lotes
  const lotesFiltrados = useMemo(() => {
    const lotesBase = viewMode === 'por-vencer' ? lotesProximosVencer : lotes;
    return lotesBase.filter((l) => {
      return !busqueda ||
        l.numero_lote.toLowerCase().includes(busqueda.toLowerCase()) ||
        (l.producto as any)?.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    });
  }, [lotes, lotesProximosVencer, busqueda, viewMode]);

  // Handlers
  const resetForm = () => {
    setFormData({
      producto_id: 0,
      almacen_id: 0,
      ubicacion_id: '',
      numero_lote: '',
      fecha_fabricacion: '',
      fecha_caducidad: '',
      cantidad_inicial: '',
      costo_unitario: '',
      documento_compra: '',
    });
    setEditingLote(null);
    setShowForm(false);
  };

  const handleProductoChange = (productoId: number) => {
    const producto = productos.find((p) => p.id === productoId);
    const numeroLote = producto ? generarNumeroLote(producto.codigo || `P${productoId}`) : '';
    setFormData({
      ...formData,
      producto_id: productoId,
      numero_lote: numeroLote,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.producto_id || !formData.almacen_id) {
      toast.error('Selecciona producto y almacén');
      return;
    }
    if (!formData.cantidad_inicial || parseInt(formData.cantidad_inicial) <= 0) {
      toast.error('Cantidad debe ser mayor a 0');
      return;
    }

    const data: Partial<LoteInventario> = {
      producto_id: formData.producto_id,
      almacen_id: formData.almacen_id,
      ubicacion_id: formData.ubicacion_id ? parseInt(formData.ubicacion_id) : null,
      numero_lote: formData.numero_lote,
      fecha_fabricacion: formData.fecha_fabricacion || null,
      fecha_caducidad: formData.fecha_caducidad || null,
      cantidad_inicial: parseInt(formData.cantidad_inicial),
      costo_unitario: formData.costo_unitario ? parseFloat(formData.costo_unitario) : null,
      documento_compra: formData.documento_compra || null,
    };

    if (editingLote) {
      updateMutation.mutate({ id: editingLote.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const calcularDiasParaVencer = (fechaCaducidad: string | null): number | null => {
    if (!fechaCaducidad) return null;
    const hoy = new Date();
    const caducidad = new Date(fechaCaducidad);
    return Math.ceil((caducidad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getColorDiasVencer = (dias: number | null): string => {
    if (dias === null) return colors.textMuted;
    if (dias <= 0) return '#EF4444';
    if (dias <= 7) return '#F59E0B';
    if (dias <= 30) return '#FBBF24';
    return '#10B981';
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
                Gestión de Lotes
              </h1>
              <p style={{ color: colors.textMuted }}>
                Control de lotes, fechas de caducidad y trazabilidad FIFO
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => marcarVencidosMutation.mutate()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border"
              style={{ borderColor: colors.border, color: colors.text }}
              disabled={marcarVencidosMutation.isPending}
            >
              <RefreshCw size={18} className={marcarVencidosMutation.isPending ? 'animate-spin' : ''} />
              Actualizar vencidos
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
              style={{ backgroundColor: colors.primary }}
            >
              <Plus size={20} />
              Nuevo Lote
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('lista')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'lista' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: viewMode === 'lista' ? colors.primary : 'transparent',
              color: viewMode === 'lista' ? 'white' : colors.text,
              border: viewMode !== 'lista' ? `1px solid ${colors.border}` : 'none',
            }}
          >
            Todos los lotes
          </button>
          <button
            onClick={() => setViewMode('por-vencer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'por-vencer' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: viewMode === 'por-vencer' ? '#F59E0B' : 'transparent',
              color: viewMode === 'por-vencer' ? 'white' : colors.text,
              border: viewMode !== 'por-vencer' ? `1px solid ${colors.border}` : 'none',
            }}
          >
            <AlertTriangle size={18} />
            Por vencer ({estadisticas?.porVencerEn30Dias || 0})
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
              placeholder="Buscar por número de lote o producto..."
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

          {viewMode === 'lista' && (
            <>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as EstadoLote | '')}
                className="px-4 py-2 rounded-lg border focus:outline-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              >
                <option value="">Todos los estados</option>
                {Object.entries(ESTADOS_LOTE).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>

              <select
                value={almacenFiltro || ''}
                onChange={(e) => setAlmacenFiltro(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2 rounded-lg border focus:outline-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              >
                <option value="">Todos los almacenes</option>
                {almacenes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(ESTADOS_LOTE).map(([key, value]) => {
          const count = key === 'activo' ? estadisticas?.activos :
            key === 'agotado' ? estadisticas?.agotados :
            key === 'vencido' ? estadisticas?.vencidos :
            estadisticas?.bloqueados || 0;
          const Icon = value.icon;
          return (
            <div
              key={key}
              className="p-4 rounded-xl cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${estadoFiltro === key ? value.color : colors.border}`,
              }}
              onClick={() => setEstadoFiltro(estadoFiltro === key ? '' : key as EstadoLote)}
            >
              <div className="flex items-center gap-3">
                <Icon size={24} style={{ color: value.color }} />
                <div>
                  <p className="text-2xl font-bold" style={{ color: colors.text }}>
                    {count}
                  </p>
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    {value.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <Package size={24} style={{ color: colors.primary }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>
                {estadisticas?.unidadesActivas?.toLocaleString() || 0}
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Unidades en lotes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de lotes */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : lotesFiltrados.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <Package size={48} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No hay lotes registrados</p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
                  <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Lote
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Producto
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Almacén
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Cantidad
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Caducidad
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Estado
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {lotesFiltrados.map((lote) => {
                  const diasVencer = calcularDiasParaVencer(lote.fecha_caducidad);
                  const estadoConfig = ESTADOS_LOTE[lote.estado];
                  const IconEstado = estadoConfig.icon;
                  
                  return (
                    <tr
                      key={lote.id}
                      className="border-t transition-colors hover:opacity-90"
                      style={{ borderColor: colors.border }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold" style={{ color: colors.text }}>
                          {lote.numero_lote}
                        </p>
                        {lote.documento_compra && (
                          <p className="text-xs" style={{ color: colors.textMuted }}>
                            Doc: {lote.documento_compra}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: colors.text }}>
                          {(lote.producto as any)?.nombre || `ID: ${lote.producto_id}`}
                        </p>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          {(lote.producto as any)?.clave}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: colors.text }}>
                          {(lote.almacen as any)?.nombre || `ID: ${lote.almacen_id}`}
                        </p>
                        {lote.ubicacion_id && (
                          <p className="text-xs" style={{ color: colors.textMuted }}>
                            📍 {(lote.ubicacion as any)?.codigo}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="font-bold" style={{ color: colors.text }}>
                          {lote.cantidad_actual}
                        </p>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          de {lote.cantidad_inicial}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {lote.fecha_caducidad ? (
                          <div>
                            <p className="text-sm" style={{ color: colors.text }}>
                              {new Date(lote.fecha_caducidad).toLocaleDateString()}
                            </p>
                            <p
                              className="text-xs font-medium"
                              style={{ color: getColorDiasVencer(diasVencer) }}
                            >
                              {diasVencer !== null && (
                                diasVencer <= 0
                                  ? '⚠️ VENCIDO'
                                  : `${diasVencer} días`
                              )}
                            </p>
                          </div>
                        ) : (
                          <span style={{ color: colors.textMuted }}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${estadoConfig.color}20`,
                            color: estadoConfig.color,
                          }}
                        >
                          <IconEstado size={12} />
                          {estadoConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingLote(lote);
                              setFormData({
                                producto_id: lote.producto_id,
                                almacen_id: lote.almacen_id,
                                ubicacion_id: lote.ubicacion_id?.toString() || '',
                                numero_lote: lote.numero_lote,
                                fecha_fabricacion: lote.fecha_fabricacion || '',
                                fecha_caducidad: lote.fecha_caducidad || '',
                                cantidad_inicial: lote.cantidad_inicial.toString(),
                                costo_unitario: lote.costo_unitario?.toString() || '',
                                documento_compra: lote.documento_compra || '',
                              });
                              setShowForm(true);
                            }}
                            className="p-2 rounded hover:opacity-80"
                            style={{ color: colors.primary }}
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              {editingLote ? 'Editar Lote' : 'Nuevo Lote'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Producto */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Producto *
                </label>
                <select
                  value={formData.producto_id}
                  onChange={(e) => handleProductoChange(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  required
                  disabled={!!editingLote}
                >
                  <option value={0}>Seleccionar producto</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.codigo || p.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Número de lote */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Número de Lote *
                </label>
                <input
                  type="text"
                  value={formData.numero_lote}
                  onChange={(e) => setFormData({ ...formData, numero_lote: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none font-mono"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  required
                />
              </div>

              {/* Almacén y ubicación */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Almacén *
                  </label>
                  <select
                    value={formData.almacen_id}
                    onChange={(e) => setFormData({
                      ...formData,
                      almacen_id: parseInt(e.target.value),
                      ubicacion_id: '',
                    })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                    required
                  >
                    <option value={0}>Seleccionar</option>
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Ubicación
                  </label>
                  <select
                    value={formData.ubicacion_id}
                    onChange={(e) => setFormData({ ...formData, ubicacion_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                    disabled={!formData.almacen_id}
                  >
                    <option value="">Sin ubicación</option>
                    {ubicaciones.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.codigo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Fecha fabricación
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_fabricacion}
                    onChange={(e) => setFormData({ ...formData, fecha_fabricacion: e.target.value })}
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
                    Fecha caducidad
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_caducidad}
                    onChange={(e) => setFormData({ ...formData, fecha_caducidad: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              {/* Cantidad y costo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Cantidad inicial *
                  </label>
                  <input
                    type="number"
                    value={formData.cantidad_inicial}
                    onChange={(e) => setFormData({ ...formData, cantidad_inicial: e.target.value })}
                    min="1"
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
                    Costo unitario
                  </label>
                  <input
                    type="number"
                    value={formData.costo_unitario}
                    onChange={(e) => setFormData({ ...formData, costo_unitario: e.target.value })}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              {/* Documento de compra */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Documento de compra
                </label>
                <input
                  type="text"
                  value={formData.documento_compra}
                  onChange={(e) => setFormData({ ...formData, documento_compra: e.target.value })}
                  placeholder="Ej: FAC-2024-0123"
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>

              {/* Botones */}
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
                    : editingLote
                    ? 'Actualizar'
                    : 'Crear Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotesPage;
