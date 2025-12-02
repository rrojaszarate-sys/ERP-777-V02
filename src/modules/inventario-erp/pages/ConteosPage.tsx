/**
 * ConteosPage - Gestión de inventarios físicos (conteos)
 * 
 * Permite crear, ejecutar y aplicar ajustes de conteos físicos
 * para verificar el stock del sistema contra el stock real.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Calendar,
  AlertTriangle,
  BarChart3,
  FileText,
  Check,
  X,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  fetchConteos,
  fetchConteoById,
  createConteo,
  generarLineasConteo,
  iniciarConteo,
  registrarConteoLinea,
  finalizarConteo,
  aplicarAjustesConteo,
  cancelarConteo,
  getResumenDiferenciasConteo,
  getEstadisticasConteos,
} from '../services/conteosService';
import { fetchAlmacenes } from '../services/inventarioService';
import type { ConteoInventario, ConteoInventarioDetalle, TipoConteo, EstadoConteo } from '../types';

const TIPOS_CONTEO: Record<TipoConteo, { label: string; descripcion: string }> = {
  completo: { label: 'Completo', descripcion: 'Todos los productos del almacén' },
  parcial: { label: 'Parcial', descripcion: 'Productos seleccionados' },
  ciclico: { label: 'Cíclico', descripcion: 'Rotación periódica de productos' },
  aleatorio: { label: 'Aleatorio', descripcion: 'Muestra aleatoria de productos' },
};

const ESTADOS_CONTEO: Record<EstadoConteo, { label: string; color: string; icon: React.ElementType }> = {
  programado: { label: 'Programado', color: '#3B82F6', icon: Clock },
  en_proceso: { label: 'En Proceso', color: '#F59E0B', icon: Play },
  completado: { label: 'Completado', color: '#10B981', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: '#EF4444', icon: XCircle },
};

export const ConteosPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoConteo | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [selectedConteo, setSelectedConteo] = useState<ConteoInventario | null>(null);
  const [showConteoModal, setShowConteoModal] = useState(false);
  const [showResumenModal, setShowResumenModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_conteo: 'completo' as TipoConteo,
    almacen_id: '',
    fecha_programada: new Date().toISOString().split('T')[0],
    observaciones: '',
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
  const { data: almacenes = [] } = useQuery({
    queryKey: ['almacenes', companyId],
    queryFn: () => fetchAlmacenes(companyId),
    enabled: !!companyId,
  });

  const { data: conteos = [], isLoading } = useQuery({
    queryKey: ['conteos', companyId, estadoFiltro],
    queryFn: () => fetchConteos(companyId, {
      estado: estadoFiltro || undefined,
    }),
    enabled: !!companyId,
  });

  const { data: estadisticas } = useQuery({
    queryKey: ['conteos-stats', companyId],
    queryFn: () => getEstadisticasConteos(companyId),
    enabled: !!companyId,
  });

  const { data: conteoDetalle, isLoading: loadingDetalle } = useQuery({
    queryKey: ['conteo-detalle', selectedConteo?.id],
    queryFn: () => selectedConteo ? fetchConteoById(selectedConteo.id) : null,
    enabled: !!selectedConteo && showConteoModal,
  });

  const { data: resumenDiferencias } = useQuery({
    queryKey: ['conteo-resumen', selectedConteo?.id],
    queryFn: () => selectedConteo ? getResumenDiferenciasConteo(selectedConteo.id) : null,
    enabled: !!selectedConteo && showResumenModal,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const conteo = await createConteo(
        {
          nombre: data.nombre,
          tipo_conteo: data.tipo_conteo,
          almacen_id: data.almacen_id ? parseInt(data.almacen_id) : null,
          fecha_programada: data.fecha_programada,
          observaciones: data.observaciones,
        },
        companyId,
        user?.id
      );
      // Generar líneas automáticamente
      const lineas = await generarLineasConteo(
        conteo.id,
        companyId,
        data.almacen_id ? parseInt(data.almacen_id) : undefined
      );
      return { conteo, lineas };
    },
    onSuccess: ({ conteo, lineas }) => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] });
      toast.success(`Conteo creado con ${lineas} productos`);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear conteo');
    },
  });

  const iniciarMutation = useMutation({
    mutationFn: iniciarConteo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] });
      queryClient.invalidateQueries({ queryKey: ['conteo-detalle'] });
      toast.success('Conteo iniciado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al iniciar');
    },
  });

  const registrarMutation = useMutation({
    mutationFn: ({ detalleId, cantidad }: { detalleId: number; cantidad: number }) =>
      registrarConteoLinea(detalleId, cantidad, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteo-detalle'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al registrar');
    },
  });

  const finalizarMutation = useMutation({
    mutationFn: finalizarConteo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] });
      toast.success('Conteo finalizado');
      setShowConteoModal(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al finalizar');
    },
  });

  const aplicarAjustesMutation = useMutation({
    mutationFn: (conteoId: number) => aplicarAjustesConteo(conteoId, user?.id),
    onSuccess: ({ ajustes, errores }) => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] });
      if (errores.length > 0) {
        toast.error(`${ajustes} ajustes aplicados, ${errores.length} errores`);
      } else {
        toast.success(`${ajustes} ajustes aplicados correctamente`);
      }
      setShowResumenModal(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al aplicar ajustes');
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: (conteoId: number) => cancelarConteo(conteoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] });
      toast.success('Conteo cancelado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cancelar');
    },
  });

  // Filtrar conteos
  const conteosFiltrados = useMemo(() => {
    return conteos.filter((c) => {
      return !busqueda ||
        c.numero_conteo.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    });
  }, [conteos, busqueda]);

  // Handlers
  const resetForm = () => {
    setFormData({
      nombre: '',
      tipo_conteo: 'completo',
      almacen_id: '',
      fecha_programada: new Date().toISOString().split('T')[0],
      observaciones: '',
    });
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre) {
      toast.error('Ingresa un nombre para el conteo');
      return;
    }
    createMutation.mutate(formData);
  };

  const abrirConteo = (conteo: ConteoInventario) => {
    setSelectedConteo(conteo);
    if (conteo.estado === 'completado') {
      setShowResumenModal(true);
    } else {
      setShowConteoModal(true);
    }
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
              <ClipboardList size={28} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
                Inventario Físico
              </h1>
              <p style={{ color: colors.textMuted }}>
                Conteos físicos y ajustes de inventario
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={20} />
            Nuevo Conteo
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
              placeholder="Buscar conteos..."
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

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoConteo | '')}
            className="px-4 py-2 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_CONTEO).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(ESTADOS_CONTEO).map(([key, value]) => {
          const count = key === 'programado' ? estadisticas?.programados :
            key === 'en_proceso' ? estadisticas?.en_proceso :
            key === 'completado' ? estadisticas?.completados :
            estadisticas?.cancelados || 0;
          const Icon = value.icon;
          return (
            <div
              key={key}
              className="p-4 rounded-xl cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${estadoFiltro === key ? value.color : colors.border}`,
              }}
              onClick={() => setEstadoFiltro(estadoFiltro === key ? '' : key as EstadoConteo)}
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
      </div>

      {/* Lista de conteos */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : conteosFiltrados.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <ClipboardList size={48} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No hay conteos registrados</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Crear primer conteo
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {conteosFiltrados.map((conteo) => {
            const estadoConfig = ESTADOS_CONTEO[conteo.estado];
            const IconEstado = estadoConfig.icon;
            const progreso = conteo.total_productos > 0
              ? Math.round((conteo.productos_contados / conteo.total_productos) * 100)
              : 0;

            return (
              <div
                key={conteo.id}
                className="p-4 rounded-xl transition-all hover:shadow-lg cursor-pointer"
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                }}
                onClick={() => abrirConteo(conteo)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${estadoConfig.color}20` }}
                    >
                      <IconEstado size={24} style={{ color: estadoConfig.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold" style={{ color: colors.text }}>
                          {conteo.numero_conteo}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${estadoConfig.color}20`,
                            color: estadoConfig.color,
                          }}
                        >
                          {estadoConfig.label}
                        </span>
                      </div>
                      <p style={{ color: colors.text }}>{conteo.nombre}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: colors.textMuted }}>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(conteo.fecha_programada).toLocaleDateString()}
                        </span>
                        <span>
                          {TIPOS_CONTEO[conteo.tipo_conteo]?.label}
                        </span>
                        {conteo.almacen_id && (
                          <span>
                            🏭 {(conteo.almacen as any)?.nombre}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: colors.text }}>
                      {conteo.productos_contados}/{conteo.total_productos}
                    </p>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      productos contados
                    </p>
                    {conteo.estado === 'en_proceso' && (
                      <div className="mt-2 w-32 h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progreso}%`,
                            backgroundColor: colors.primary,
                          }}
                        />
                      </div>
                    )}
                    {conteo.productos_con_diferencia > 0 && (
                      <p className="text-sm mt-1" style={{ color: '#F59E0B' }}>
                        ⚠️ {conteo.productos_con_diferencia} con diferencia
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
                  {conteo.estado === 'programado' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        iniciarMutation.mutate(conteo.id);
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: '#10B981' }}
                      disabled={iniciarMutation.isPending}
                    >
                      <Play size={14} />
                      Iniciar
                    </button>
                  )}
                  {conteo.estado === 'programado' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('¿Cancelar este conteo?')) {
                          cancelarMutation.mutate(conteo.id);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm border"
                      style={{ borderColor: colors.border, color: colors.textMuted }}
                    >
                      <X size={14} />
                      Cancelar
                    </button>
                  )}
                  {conteo.estado === 'en_proceso' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConteo(conteo);
                        setShowConteoModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <ArrowRight size={14} />
                      Continuar
                    </button>
                  )}
                  {conteo.estado === 'completado' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConteo(conteo);
                        setShowResumenModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                    >
                      <BarChart3 size={14} />
                      Ver Resumen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de nuevo conteo */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              Nuevo Conteo de Inventario
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Nombre del conteo *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Conteo Mensual Diciembre"
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
                  Tipo de conteo
                </label>
                <select
                  value={formData.tipo_conteo}
                  onChange={(e) => setFormData({ ...formData, tipo_conteo: e.target.value as TipoConteo })}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  {Object.entries(TIPOS_CONTEO).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label} - {value.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Almacén
                </label>
                <select
                  value={formData.almacen_id}
                  onChange={(e) => setFormData({ ...formData, almacen_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
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
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Fecha programada
                </label>
                <input
                  type="date"
                  value={formData.fecha_programada}
                  onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
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
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none resize-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
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
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear Conteo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de ejecución de conteo */}
      {showConteoModal && selectedConteo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl flex flex-col"
            style={{ backgroundColor: colors.card }}
          >
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: colors.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                    {selectedConteo.numero_conteo}
                  </h2>
                  <p style={{ color: colors.textMuted }}>{selectedConteo.nombre}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                      {conteoDetalle?.productos_contados || 0}/{conteoDetalle?.total_productos || 0}
                    </p>
                    <p className="text-sm" style={{ color: colors.textMuted }}>contados</p>
                  </div>
                  <button
                    onClick={() => setShowConteoModal(false)}
                    className="p-2 rounded-lg hover:opacity-80"
                    style={{ color: colors.textMuted }}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingDetalle ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="animate-spin" size={32} style={{ color: colors.primary }} />
                </div>
              ) : (
                <div className="space-y-2">
                  {conteoDetalle?.detalles?.map((detalle) => (
                    <ConteoLineaItem
                      key={detalle.id}
                      detalle={detalle}
                      colors={colors}
                      onRegistrar={(cantidad) => {
                        registrarMutation.mutate({ detalleId: detalle.id, cantidad });
                      }}
                      isLoading={registrarMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t" style={{ borderColor: colors.border }}>
              <div className="flex justify-between items-center">
                <p style={{ color: colors.textMuted }}>
                  {conteoDetalle?.productos_con_diferencia || 0} productos con diferencia
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConteoModal(false)}
                    className="px-4 py-2 rounded-lg border"
                    style={{ borderColor: colors.border, color: colors.text }}
                  >
                    Cerrar
                  </button>
                  {selectedConteo.estado === 'en_proceso' && (
                    <button
                      onClick={() => finalizarMutation.mutate(selectedConteo.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: '#10B981' }}
                      disabled={finalizarMutation.isPending}
                    >
                      <CheckCircle size={18} />
                      {finalizarMutation.isPending ? 'Finalizando...' : 'Finalizar Conteo'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de resumen */}
      {showResumenModal && selectedConteo && resumenDiferencias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              Resumen: {selectedConteo.numero_conteo}
            </h2>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: colors.bg }}>
                <p className="text-2xl font-bold" style={{ color: colors.text }}>
                  {resumenDiferencias.total_lineas}
                </p>
                <p className="text-sm" style={{ color: colors.textMuted }}>Total productos</p>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#10B98120' }}>
                <p className="text-2xl font-bold" style={{ color: '#10B981' }}>
                  {resumenDiferencias.sin_diferencia}
                </p>
                <p className="text-sm" style={{ color: colors.textMuted }}>Sin diferencia</p>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#F59E0B20' }}>
                <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
                  {resumenDiferencias.con_diferencia}
                </p>
                <p className="text-sm" style={{ color: colors.textMuted }}>Con diferencia</p>
              </div>
            </div>

            {/* Valor diferencias */}
            <div
              className="p-4 rounded-lg mb-6"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
            >
              <div className="flex justify-between items-center">
                <span style={{ color: colors.textMuted }}>Diferencias positivas:</span>
                <span className="font-bold" style={{ color: '#10B981' }}>
                  +${resumenDiferencias.valor_diferencias_positivas.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span style={{ color: colors.textMuted }}>Diferencias negativas:</span>
                <span className="font-bold" style={{ color: '#EF4444' }}>
                  -${resumenDiferencias.valor_diferencias_negativas.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                <span className="font-medium" style={{ color: colors.text }}>Impacto neto:</span>
                <span
                  className="text-xl font-bold"
                  style={{ color: resumenDiferencias.valor_neto >= 0 ? '#10B981' : '#EF4444' }}
                >
                  {resumenDiferencias.valor_neto >= 0 ? '+' : ''}${resumenDiferencias.valor_neto.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Lista de diferencias */}
            {resumenDiferencias.detalle_diferencias.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium mb-2" style={{ color: colors.text }}>
                  Detalle de diferencias
                </h3>
                <div className="max-h-60 overflow-y-auto rounded-lg border" style={{ borderColor: colors.border }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: colors.bg }}>
                        <th className="text-left px-3 py-2 text-sm" style={{ color: colors.textMuted }}>Producto</th>
                        <th className="text-center px-3 py-2 text-sm" style={{ color: colors.textMuted }}>Sistema</th>
                        <th className="text-center px-3 py-2 text-sm" style={{ color: colors.textMuted }}>Contado</th>
                        <th className="text-center px-3 py-2 text-sm" style={{ color: colors.textMuted }}>Dif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenDiferencias.detalle_diferencias.map((d, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: colors.border }}>
                          <td className="px-3 py-2">
                            <p className="text-sm" style={{ color: colors.text }}>{d.producto_nombre}</p>
                            <p className="text-xs" style={{ color: colors.textMuted }}>{d.producto_clave}</p>
                          </td>
                          <td className="px-3 py-2 text-center" style={{ color: colors.text }}>
                            {d.cantidad_sistema}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ color: colors.text }}>
                            {d.cantidad_contada}
                          </td>
                          <td
                            className="px-3 py-2 text-center font-bold"
                            style={{ color: d.diferencia > 0 ? '#10B981' : '#EF4444' }}
                          >
                            {d.diferencia > 0 ? '+' : ''}{d.diferencia}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowResumenModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Cerrar
              </button>
              {resumenDiferencias.con_diferencia > 0 && (
                <button
                  onClick={() => aplicarAjustesMutation.mutate(selectedConteo.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: '#F59E0B' }}
                  disabled={aplicarAjustesMutation.isPending}
                >
                  <RefreshCw size={18} className={aplicarAjustesMutation.isPending ? 'animate-spin' : ''} />
                  {aplicarAjustesMutation.isPending ? 'Aplicando...' : 'Aplicar Ajustes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para cada línea de conteo
interface ConteoLineaItemProps {
  detalle: ConteoInventarioDetalle;
  colors: any;
  onRegistrar: (cantidad: number) => void;
  isLoading: boolean;
}

const ConteoLineaItem: React.FC<ConteoLineaItemProps> = ({ detalle, colors, onRegistrar, isLoading }) => {
  const [cantidad, setCantidad] = useState(detalle.cantidad_contada?.toString() || '');
  const [editando, setEditando] = useState(false);

  const handleGuardar = () => {
    const cantidadNum = parseInt(cantidad) || 0;
    onRegistrar(cantidadNum);
    setEditando(false);
  };

  const diferencia = detalle.cantidad_contada !== null
    ? detalle.cantidad_contada - detalle.cantidad_sistema
    : null;

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg border"
      style={{
        borderColor: detalle.estado === 'pendiente' ? colors.border :
          diferencia === 0 ? '#10B981' :
          '#F59E0B',
        backgroundColor: detalle.estado === 'pendiente' ? 'transparent' : `${diferencia === 0 ? '#10B981' : '#F59E0B'}10`,
      }}
    >
      {/* Info producto */}
      <div className="flex-1">
        <p className="font-medium" style={{ color: colors.text }}>
          {(detalle.producto as any)?.nombre || `Producto ${detalle.producto_id}`}
        </p>
        <p className="text-sm" style={{ color: colors.textMuted }}>
          {(detalle.producto as any)?.clave} • Sistema: {detalle.cantidad_sistema}
        </p>
      </div>

      {/* Input de cantidad */}
      <div className="flex items-center gap-2">
        {editando || detalle.estado === 'pendiente' ? (
          <>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-20 px-3 py-2 rounded-lg border text-center font-bold"
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.primary,
                color: colors.text,
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGuardar();
              }}
            />
            <button
              onClick={handleGuardar}
              className="p-2 rounded-lg text-white"
              style={{ backgroundColor: '#10B981' }}
              disabled={isLoading}
            >
              <Check size={18} />
            </button>
          </>
        ) : (
          <>
            <div
              className="w-20 px-3 py-2 rounded-lg text-center font-bold cursor-pointer"
              style={{ backgroundColor: colors.bg, color: colors.text }}
              onClick={() => setEditando(true)}
            >
              {detalle.cantidad_contada}
            </div>
            {diferencia !== null && diferencia !== 0 && (
              <span
                className="text-sm font-bold"
                style={{ color: diferencia > 0 ? '#10B981' : '#EF4444' }}
              >
                {diferencia > 0 ? '+' : ''}{diferencia}
              </span>
            )}
            {diferencia === 0 && (
              <CheckCircle size={20} style={{ color: '#10B981' }} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConteosPage;
