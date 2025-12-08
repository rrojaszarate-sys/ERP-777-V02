/**
 * ReservasPage - Gestión de reservas de stock para eventos
 * 
 * Permite reservar productos para eventos futuros,
 * controlar entregas y devoluciones.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CalendarCheck,
  Plus,
  Search,
  Calendar,
  Package,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  Eye,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  fetchReservas,
  createReserva,
  registrarEntregaReserva,
  registrarDevolucionReserva,
  cancelarReserva,
  verificarStockDisponible,
  getEstadisticasReservas,
  fetchReservasProximas,
} from '../services/reservasService';
import { fetchProductos, fetchAlmacenes, fetchEventos } from '../services/inventarioService';
import type { ReservaStock, EstadoReserva } from '../types';

const ESTADOS_RESERVA: Record<EstadoReserva, { label: string; color: string; icon: React.ElementType }> = {
  activa: { label: 'Activa', color: '#3B82F6', icon: Clock },
  parcial: { label: 'Parcial', color: '#F59E0B', icon: AlertTriangle },
  entregada: { label: 'Entregada', color: '#8B5CF6', icon: ArrowRight },
  devuelta: { label: 'Devuelta', color: '#10B981', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: '#EF4444', icon: XCircle },
};

export const ReservasPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoReserva | ''>('');
  const [eventoFiltro, setEventoFiltro] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAccionModal, setShowAccionModal] = useState<'entrega' | 'devolucion' | null>(null);
  const [selectedReserva, setSelectedReserva] = useState<ReservaStock | null>(null);
  const [cantidadAccion, setCantidadAccion] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    evento_id: '',
    producto_id: '',
    almacen_id: '',
    cantidad_reservada: '',
    fecha_necesidad: '',
    fecha_devolucion_esperada: '',
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
  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos', companyId],
    queryFn: () => fetchEventos(companyId),
    enabled: !!companyId,
  });

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

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['reservas', companyId, estadoFiltro, eventoFiltro],
    queryFn: () => fetchReservas(companyId, {
      estado: estadoFiltro || undefined,
      eventoId: eventoFiltro || undefined,
    }),
    enabled: !!companyId,
  });

  const { data: reservasProximas = [] } = useQuery({
    queryKey: ['reservas-proximas', companyId],
    queryFn: () => fetchReservasProximas(companyId, 7),
    enabled: !!companyId,
  });

  const { data: estadisticas } = useQuery({
    queryKey: ['reservas-stats', companyId],
    queryFn: () => getEstadisticasReservas(companyId),
    enabled: !!companyId,
  });

  const { data: stockDisponible } = useQuery({
    queryKey: ['stock-disponible', formData.producto_id, formData.almacen_id],
    queryFn: () => verificarStockDisponible(
      parseInt(formData.producto_id),
      parseInt(formData.almacen_id),
      companyId
    ),
    enabled: !!formData.producto_id && !!formData.almacen_id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => createReserva(
      {
        evento_id: parseInt(data.evento_id),
        producto_id: parseInt(data.producto_id),
        almacen_id: parseInt(data.almacen_id),
        cantidad_reservada: parseInt(data.cantidad_reservada),
        fecha_necesidad: data.fecha_necesidad,
        fecha_devolucion_esperada: data.fecha_devolucion_esperada || undefined,
        notas: data.notas || undefined,
      },
      companyId,
      user?.id
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      toast.success('Reserva creada correctamente');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear reserva');
    },
  });

  const entregaMutation = useMutation({
    mutationFn: ({ reservaId, cantidad }: { reservaId: number; cantidad: number }) =>
      registrarEntregaReserva(reservaId, cantidad),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      toast.success('Entrega registrada');
      setShowAccionModal(null);
      setSelectedReserva(null);
      setCantidadAccion('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al registrar entrega');
    },
  });

  const devolucionMutation = useMutation({
    mutationFn: ({ reservaId, cantidad }: { reservaId: number; cantidad: number }) =>
      registrarDevolucionReserva(reservaId, cantidad),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      toast.success('Devolución registrada');
      setShowAccionModal(null);
      setSelectedReserva(null);
      setCantidadAccion('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al registrar devolución');
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: (reservaId: number) => cancelarReserva(reservaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      toast.success('Reserva cancelada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cancelar');
    },
  });

  // Filtrar reservas
  const reservasFiltradas = useMemo(() => {
    return reservas.filter((r) => {
      return !busqueda ||
        (r.producto as any)?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        (r.evento as any)?.nombre_proyecto?.toLowerCase().includes(busqueda.toLowerCase());
    });
  }, [reservas, busqueda]);

  // Handlers
  const resetForm = () => {
    setFormData({
      evento_id: '',
      producto_id: '',
      almacen_id: '',
      cantidad_reservada: '',
      fecha_necesidad: '',
      fecha_devolucion_esperada: '',
      notas: '',
    });
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.evento_id || !formData.producto_id || !formData.almacen_id) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    if (!formData.cantidad_reservada || parseInt(formData.cantidad_reservada) <= 0) {
      toast.error('Cantidad debe ser mayor a 0');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleAccion = () => {
    if (!selectedReserva || !cantidadAccion) return;
    const cantidad = parseInt(cantidadAccion);
    if (cantidad <= 0) {
      toast.error('Cantidad debe ser mayor a 0');
      return;
    }

    if (showAccionModal === 'entrega') {
      entregaMutation.mutate({ reservaId: selectedReserva.id, cantidad });
    } else if (showAccionModal === 'devolucion') {
      devolucionMutation.mutate({ reservaId: selectedReserva.id, cantidad });
    }
  };

  const abrirAccionModal = (reserva: ReservaStock, tipo: 'entrega' | 'devolucion') => {
    setSelectedReserva(reserva);
    setShowAccionModal(tipo);
    setCantidadAccion('');
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
              <CalendarCheck size={28} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
                Reservas de Stock
              </h1>
              <p style={{ color: colors.textMuted }}>
                Reserva materiales para eventos y controla entregas/devoluciones
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={20} />
            Nueva Reserva
          </button>
        </div>

        {/* Alerta de próximas */}
        {reservasProximas.length > 0 && (
          <div
            className="p-4 rounded-lg mb-4 flex items-center gap-3"
            style={{ backgroundColor: '#F59E0B20', border: '1px solid #F59E0B' }}
          >
            <AlertTriangle style={{ color: '#F59E0B' }} />
            <div>
              <p className="font-medium" style={{ color: colors.text }}>
                {reservasProximas.length} reservas para los próximos 7 días
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                {reservasProximas.slice(0, 3).map(r => 
                  (r.evento as any)?.nombre_proyecto
                ).join(', ')}
                {reservasProximas.length > 3 && ` y ${reservasProximas.length - 3} más...`}
              </p>
            </div>
          </div>
        )}

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
              placeholder="Buscar por producto o evento..."
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
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoReserva | '')}
            className="px-4 py-2 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_RESERVA).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>

          <select
            value={eventoFiltro || ''}
            onChange={(e) => setEventoFiltro(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todos los eventos</option>
            {eventos.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.nombre_proyecto}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(ESTADOS_RESERVA).map(([key, value]) => {
          const count = key === 'activa' ? estadisticas?.activas :
            key === 'parcial' ? estadisticas?.parciales :
            key === 'entregada' ? estadisticas?.entregadas :
            key === 'devuelta' ? estadisticas?.devueltas :
            estadisticas?.canceladas || 0;
          const Icon = value.icon;
          return (
            <div
              key={key}
              className="p-4 rounded-xl cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${estadoFiltro === key ? value.color : colors.border}`,
              }}
              onClick={() => setEstadoFiltro(estadoFiltro === key ? '' : key as EstadoReserva)}
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

      {/* Lista de reservas */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : reservasFiltradas.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <CalendarCheck size={48} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No hay reservas registradas</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Crear primera reserva
          </button>
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
                  <th className="text-left px-2 py-1.5 text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>
                    Producto
                  </th>
                  <th className="text-left px-2 py-1.5 text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>
                    Evento
                  </th>
                  <th className="text-center px-2 py-1.5 text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>
                    Reservado
                  </th>
                  <th className="text-center px-2 py-1.5 text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>
                    Entregado
                  </th>
                  <th className="text-center px-2 py-1.5 text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>
                    Devuelto
                  </th>
                  <th className="text-center px-2 py-1.5 text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>
                    Fecha
                  </th>
                  <th className="text-center px-2 py-1.5 text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>
                    Estado
                  </th>
                  <th className="text-center px-2 py-1.5 text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {reservasFiltradas.map((reserva, idx) => {
                  const estadoConfig = ESTADOS_RESERVA[reserva.estado];
                  const IconEstado = estadoConfig.icon;
                  const pendienteEntrega = reserva.cantidad_reservada - reserva.cantidad_entregada;
                  const pendienteDevolucion = reserva.cantidad_entregada - reserva.cantidad_devuelta;

                  return (
                    <tr
                      key={reserva.id}
                      className="border-t transition-colors hover:bg-[#E0F2F1]"
                      style={{ borderColor: colors.border, backgroundColor: isDark ? (idx % 2 === 0 ? '#1E293B' : '#263244') : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC') }}
                    >
                      <td className="px-2 py-1">
                        <p className="font-medium text-xs truncate max-w-[120px]" style={{ color: colors.text }} title={(reserva.producto as any)?.nombre}>
                          {(reserva.producto as any)?.nombre || `ID: ${reserva.producto_id}`}
                        </p>
                        <p className="text-[10px]" style={{ color: colors.textMuted }}>
                          {(reserva.producto as any)?.clave} • {(reserva.almacen as any)?.nombre}
                        </p>
                      </td>
                      <td className="px-2 py-1">
                        <p className="text-xs truncate max-w-[120px]" style={{ color: colors.text }} title={(reserva.evento as any)?.nombre_proyecto}>
                          {(reserva.evento as any)?.nombre_proyecto || `ID: ${reserva.evento_id}`}
                        </p>
                        <p className="text-[10px]" style={{ color: colors.textMuted }}>
                          📅 {new Date((reserva.evento as any)?.fecha_evento || '').toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className="font-bold text-xs" style={{ color: colors.text }}>
                          {reserva.cantidad_reservada}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span
                          className="font-bold text-xs"
                          style={{ color: reserva.cantidad_entregada > 0 ? '#8B5CF6' : colors.textMuted }}
                        >
                          {reserva.cantidad_entregada}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span
                          className="font-bold text-xs"
                          style={{ color: reserva.cantidad_devuelta > 0 ? '#10B981' : colors.textMuted }}
                        >
                          {reserva.cantidad_devuelta}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <p className="text-[10px]" style={{ color: colors.text }}>
                          {new Date(reserva.fecha_necesidad).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: `${estadoConfig.color}20`,
                            color: estadoConfig.color,
                          }}
                        >
                          <IconEstado size={10} />
                          {estadoConfig.label}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex justify-center gap-0.5">
                          {reserva.estado === 'activa' && pendienteEntrega > 0 && (
                            <button
                              onClick={() => abrirAccionModal(reserva, 'entrega')}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ backgroundColor: '#8B5CF620', color: '#8B5CF6' }}
                              title={`Entregar ${pendienteEntrega} pendientes`}
                            >
                              <ArrowRight size={12} />
                              Entregar
                            </button>
                          )}
                          {(reserva.estado === 'entregada' || reserva.estado === 'parcial') && pendienteDevolucion > 0 && (
                            <button
                              onClick={() => abrirAccionModal(reserva, 'devolucion')}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ backgroundColor: '#10B98120', color: '#10B981' }}
                              title={`Devolver ${pendienteDevolucion} pendientes`}
                            >
                              <ArrowLeft size={12} />
                              Devolver
                            </button>
                          )}
                          {reserva.estado === 'activa' && (
                            <button
                              onClick={() => {
                                if (confirm('¿Cancelar esta reserva?')) {
                                  cancelarMutation.mutate(reserva.id);
                                }
                              }}
                              className="p-0.5 rounded hover:opacity-80"
                              style={{ color: '#EF4444' }}
                            >
                              <XCircle size={14} />
                            </button>
                          )}
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

      {/* Modal de nueva reserva */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              Nueva Reserva
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Evento *
                </label>
                <select
                  value={formData.evento_id}
                  onChange={(e) => setFormData({ ...formData, evento_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  required
                >
                  <option value="">Seleccionar evento</option>
                  {eventos.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre_proyecto} - {new Date(e.fecha_evento).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Producto *
                </label>
                <select
                  value={formData.producto_id}
                  onChange={(e) => setFormData({ ...formData, producto_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  required
                >
                  <option value="">Seleccionar producto</option>
                  {productos.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.codigo || p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Almacén *
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
                  required
                >
                  <option value="">Seleccionar almacén</option>
                  {almacenes.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock disponible */}
              {stockDisponible !== undefined && (
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: stockDisponible > 0 ? '#10B98120' : '#EF444420',
                    border: `1px solid ${stockDisponible > 0 ? '#10B981' : '#EF4444'}`,
                  }}
                >
                  <p className="text-sm font-medium" style={{ color: stockDisponible > 0 ? '#10B981' : '#EF4444' }}>
                    Stock disponible: {stockDisponible} unidades
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Cantidad a reservar *
                </label>
                <input
                  type="number"
                  value={formData.cantidad_reservada}
                  onChange={(e) => setFormData({ ...formData, cantidad_reservada: e.target.value })}
                  min="1"
                  max={stockDisponible || 999999}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Fecha necesidad *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_necesidad}
                    onChange={(e) => setFormData({ ...formData, fecha_necesidad: e.target.value })}
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
                    Fecha devolución
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_devolucion_esperada}
                    onChange={(e) => setFormData({ ...formData, fecha_devolucion_esperada: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Notas
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
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
                  {createMutation.isPending ? 'Creando...' : 'Crear Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de entrega/devolución */}
      {showAccionModal && selectedReserva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-sm rounded-xl p-6"
            style={{ backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              {showAccionModal === 'entrega' ? 'Registrar Entrega' : 'Registrar Devolución'}
            </h2>

            <div className="space-y-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: colors.bg }}
              >
                <p className="font-medium" style={{ color: colors.text }}>
                  {(selectedReserva.producto as any)?.nombre}
                </p>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  {showAccionModal === 'entrega'
                    ? `Pendiente entregar: ${selectedReserva.cantidad_reservada - selectedReserva.cantidad_entregada}`
                    : `Pendiente devolver: ${selectedReserva.cantidad_entregada - selectedReserva.cantidad_devuelta}`
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Cantidad
                </label>
                <input
                  type="number"
                  value={cantidadAccion}
                  onChange={(e) => setCantidadAccion(e.target.value)}
                  min="1"
                  max={showAccionModal === 'entrega'
                    ? selectedReserva.cantidad_reservada - selectedReserva.cantidad_entregada
                    : selectedReserva.cantidad_entregada - selectedReserva.cantidad_devuelta
                  }
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAccionModal(null);
                    setSelectedReserva(null);
                    setCantidadAccion('');
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAccion}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium"
                  style={{
                    backgroundColor: showAccionModal === 'entrega' ? '#8B5CF6' : '#10B981',
                  }}
                  disabled={entregaMutation.isPending || devolucionMutation.isPending}
                >
                  {entregaMutation.isPending || devolucionMutation.isPending
                    ? 'Guardando...'
                    : showAccionModal === 'entrega' ? 'Entregar' : 'Devolver'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservasPage;
