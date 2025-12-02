/**
 * ChecklistEventoPage - Gestión de checklists pre/post evento
 * 
 * Permite crear checklists de verificación de materiales
 * antes y después de cada evento, con fotos y estados.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ClipboardCheck,
  Plus,
  Search,
  Calendar,
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Image,
  Upload,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  fetchChecklists,
  fetchChecklistConDetalle,
  crearChecklistDesdeReservas,
  actualizarEstadoChecklist,
  actualizarItemChecklist,
  agregarFotoChecklist,
  finalizarChecklist,
  getChecklistsPendientes,
} from '../services/checklistService';
import { fetchReservas } from '../services/reservasService';
import { fetchEventos } from '../services/inventarioService';
import type { ChecklistEventoInventario, ChecklistEventoDetalle, TipoChecklist, EstadoChecklist, EstadoItemChecklist } from '../types';

const TIPOS_CHECKLIST: Record<TipoChecklist, { label: string; icon: React.ElementType; color: string }> = {
  pre_evento: { label: 'Pre-Evento', icon: ArrowRight, color: '#3B82F6' },
  post_evento: { label: 'Post-Evento', icon: ClipboardCheck, color: '#10B981' },
};

const ESTADOS_CHECKLIST: Record<EstadoChecklist, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: '#F59E0B' },
  en_proceso: { label: 'En Proceso', color: '#3B82F6' },
  completado: { label: 'Completado', color: '#10B981' },
  con_problemas: { label: 'Con Problemas', color: '#EF4444' },
};

const ESTADOS_ITEM: Record<EstadoItemChecklist, { label: string; color: string; icon: React.ElementType }> = {
  pendiente: { label: 'Pendiente', color: '#F59E0B', icon: Clock },
  verificado: { label: 'Verificado', color: '#10B981', icon: CheckCircle },
  faltante: { label: 'Faltante', color: '#EF4444', icon: XCircle },
  dañado: { label: 'Dañado', color: '#8B5CF6', icon: AlertTriangle },
  devuelto: { label: 'Devuelto', color: '#06B6D4', icon: CheckCircle },
};

export const ChecklistEventoPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoChecklist | ''>('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoChecklist | ''>('');
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [expandedChecklist, setExpandedChecklist] = useState<number | null>(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState('');
  const [tipoChecklistNuevo, setTipoChecklistNuevo] = useState<TipoChecklist>('pre_evento');
  const [showFotoModal, setShowFotoModal] = useState<{ checklistDetalleId: number; tipo: 'antes' | 'despues' } | null>(null);
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoDescripcion, setFotoDescripcion] = useState('');

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

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['checklists', companyId, tipoFiltro, estadoFiltro],
    queryFn: () => fetchChecklists(companyId, {
      tipo: tipoFiltro || undefined,
      estado: estadoFiltro || undefined,
    }),
    enabled: !!companyId,
  });

  const { data: checklistsPendientes = [] } = useQuery({
    queryKey: ['checklists-pendientes', companyId],
    queryFn: () => getChecklistsPendientes(companyId),
    enabled: !!companyId,
  });

  const { data: checklistDetalle } = useQuery({
    queryKey: ['checklist-detalle', expandedChecklist],
    queryFn: () => fetchChecklistConDetalle(expandedChecklist!),
    enabled: !!expandedChecklist,
  });

  const { data: reservasEvento = [] } = useQuery({
    queryKey: ['reservas-evento', eventoSeleccionado],
    queryFn: () => fetchReservas(companyId, { eventoId: parseInt(eventoSeleccionado) }),
    enabled: !!eventoSeleccionado,
  });

  // Mutations
  const crearChecklistMutation = useMutation({
    mutationFn: () => crearChecklistDesdeReservas(
      parseInt(eventoSeleccionado),
      tipoChecklistNuevo,
      companyId,
      user?.id
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist creado correctamente');
      setShowCrearModal(false);
      setEventoSeleccionado('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear checklist');
    },
  });

  const actualizarItemMutation = useMutation({
    mutationFn: ({ detalleId, data }: { detalleId: number; data: Partial<ChecklistEventoDetalle> }) =>
      actualizarItemChecklist(detalleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-detalle'] });
      toast.success('Item actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar');
    },
  });

  const agregarFotoMutation = useMutation({
    mutationFn: ({ checklistDetalleId, tipo, urlFoto, descripcion }: {
      checklistDetalleId: number;
      tipo: 'antes' | 'despues';
      urlFoto: string;
      descripcion?: string;
    }) => agregarFotoChecklist(checklistDetalleId, tipo, urlFoto, descripcion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-detalle'] });
      toast.success('Foto agregada');
      setShowFotoModal(null);
      setFotoUrl('');
      setFotoDescripcion('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al agregar foto');
    },
  });

  const finalizarMutation = useMutation({
    mutationFn: (checklistId: number) => finalizarChecklist(checklistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-detalle'] });
      toast.success('Checklist finalizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al finalizar');
    },
  });

  // Filtrar checklists
  const checklistsFiltrados = useMemo(() => {
    return checklists.filter((c) => {
      return !busqueda ||
        (c.evento as any)?.nombre_proyecto?.toLowerCase().includes(busqueda.toLowerCase());
    });
  }, [checklists, busqueda]);

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    return {
      total: checklists.length,
      pendientes: checklists.filter(c => c.estado === 'pendiente').length,
      enProceso: checklists.filter(c => c.estado === 'en_proceso').length,
      completados: checklists.filter(c => c.estado === 'completado').length,
      conProblemas: checklists.filter(c => c.estado === 'con_problemas').length,
    };
  }, [checklists]);

  // Handlers
  const handleCrearChecklist = () => {
    if (!eventoSeleccionado) {
      toast.error('Selecciona un evento');
      return;
    }
    crearChecklistMutation.mutate();
  };

  const handleCambiarEstadoItem = (detalleId: number, estado: EstadoItemChecklist) => {
    actualizarItemMutation.mutate({
      detalleId,
      data: { estado_producto: estado },
    });
  };

  const handleActualizarCantidades = (detalleId: number, enviada: number, devuelta?: number) => {
    actualizarItemMutation.mutate({
      detalleId,
      data: {
        cantidad_enviada: enviada,
        cantidad_devuelta: devuelta,
      },
    });
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
              <ClipboardCheck size={28} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
                Checklists de Evento
              </h1>
              <p style={{ color: colors.textMuted }}>
                Verificación de materiales pre y post evento
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCrearModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={20} />
            Nuevo Checklist
          </button>
        </div>

        {/* Alerta de pendientes */}
        {checklistsPendientes.length > 0 && (
          <div
            className="p-4 rounded-lg mb-4 flex items-center gap-3"
            style={{ backgroundColor: '#F59E0B20', border: '1px solid #F59E0B' }}
          >
            <AlertTriangle style={{ color: '#F59E0B' }} />
            <div>
              <p className="font-medium" style={{ color: colors.text }}>
                {checklistsPendientes.length} checklists pendientes de completar
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                {checklistsPendientes.slice(0, 2).map(c => 
                  `${TIPOS_CHECKLIST[c.tipo].label}: ${(c.evento as any)?.nombre_proyecto}`
                ).join(' • ')}
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
              placeholder="Buscar por evento..."
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
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as TipoChecklist | '')}
            className="px-4 py-2 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_CHECKLIST).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoChecklist | '')}
            className="px-4 py-2 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_CHECKLIST).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(ESTADOS_CHECKLIST).map(([key, value]) => {
          const count = key === 'pendiente' ? estadisticas.pendientes :
            key === 'en_proceso' ? estadisticas.enProceso :
            key === 'completado' ? estadisticas.completados :
            estadisticas.conProblemas;
          return (
            <div
              key={key}
              className="p-4 rounded-xl cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${estadoFiltro === key ? value.color : colors.border}`,
              }}
              onClick={() => setEstadoFiltro(estadoFiltro === key ? '' : key as EstadoChecklist)}
            >
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold" style={{ color: colors.text }}>
                  {count}
                </p>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: value.color }}
                />
              </div>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                {value.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Lista de checklists */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : checklistsFiltrados.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <ClipboardCheck size={48} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No hay checklists registrados</p>
          <button
            onClick={() => setShowCrearModal(true)}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Crear primer checklist
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {checklistsFiltrados.map((checklist) => {
            const tipoConfig = TIPOS_CHECKLIST[checklist.tipo];
            const estadoConfig = ESTADOS_CHECKLIST[checklist.estado];
            const TipoIcon = tipoConfig.icon;
            const isExpanded = expandedChecklist === checklist.id;
            const detalles = isExpanded ? checklistDetalle?.detalle || [] : [];

            return (
              <div
                key={checklist.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${isExpanded ? tipoConfig.color : colors.border}`,
                }}
              >
                {/* Header del checklist */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedChecklist(isExpanded ? null : checklist.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${tipoConfig.color}20` }}
                    >
                      <TipoIcon size={24} style={{ color: tipoConfig.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg" style={{ color: colors.text }}>
                          {(checklist.evento as any)?.nombre_proyecto || `Evento #${checklist.evento_id}`}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${tipoConfig.color}20`, color: tipoConfig.color }}
                        >
                          {tipoConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1 text-sm" style={{ color: colors.textMuted }}>
                          <Calendar size={14} />
                          {new Date(checklist.fecha_checklist).toLocaleDateString()}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: `${estadoConfig.color}20`, color: estadoConfig.color }}
                        >
                          {estadoConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {checklist.estado !== 'completado' && checklist.estado !== 'con_problemas' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('¿Finalizar este checklist?')) {
                            finalizarMutation.mutate(checklist.id);
                          }
                        }}
                        className="px-3 py-1 rounded-lg text-sm font-medium text-white"
                        style={{ backgroundColor: '#10B981' }}
                      >
                        Finalizar
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="border-t" style={{ borderColor: colors.border }}>
                    {checklist.notas && (
                      <p className="px-4 py-3 text-sm" style={{ color: colors.textMuted }}>
                        📝 {checklist.notas}
                      </p>
                    )}

                    {/* Lista de items */}
                    <div className="p-4">
                      <h4 className="font-medium mb-3" style={{ color: colors.text }}>
                        Items a verificar ({detalles.length})
                      </h4>

                      {detalles.length === 0 ? (
                        <p className="text-center py-4" style={{ color: colors.textMuted }}>
                          No hay items en este checklist
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {detalles.map((item) => {
                            const estadoItem = ESTADOS_ITEM[item.estado_producto];
                            const EstadoIcon = estadoItem.icon;

                            return (
                              <div
                                key={item.id}
                                className="p-4 rounded-lg"
                                style={{
                                  backgroundColor: colors.bg,
                                  border: `1px solid ${estadoItem.color}40`,
                                }}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <EstadoIcon size={18} style={{ color: estadoItem.color }} />
                                      <span className="font-medium" style={{ color: colors.text }}>
                                        {(item.producto as any)?.nombre || `Producto #${item.producto_id}`}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mt-3">
                                      <div>
                                        <p className="text-xs" style={{ color: colors.textMuted }}>
                                          Enviado
                                        </p>
                                        <input
                                          type="number"
                                          value={item.cantidad_enviada}
                                          onChange={(e) => handleActualizarCantidades(
                                            item.id,
                                            parseInt(e.target.value) || 0,
                                            item.cantidad_devuelta
                                          )}
                                          className="w-full px-2 py-1 rounded border text-center mt-1"
                                          style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.text,
                                          }}
                                          disabled={checklist.estado === 'completado'}
                                        />
                                      </div>
                                      {checklist.tipo === 'post_evento' && (
                                        <div>
                                          <p className="text-xs" style={{ color: colors.textMuted }}>
                                            Devuelto
                                          </p>
                                          <input
                                            type="number"
                                            value={item.cantidad_devuelta || 0}
                                            onChange={(e) => handleActualizarCantidades(
                                              item.id,
                                              item.cantidad_enviada,
                                              parseInt(e.target.value) || 0
                                            )}
                                            className="w-full px-2 py-1 rounded border text-center mt-1"
                                            style={{
                                              backgroundColor: colors.card,
                                              borderColor: colors.border,
                                              color: colors.text,
                                            }}
                                            disabled={checklist.estado === 'completado'}
                                          />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-xs" style={{ color: colors.textMuted }}>
                                          Diferencia
                                        </p>
                                        <p
                                          className="text-center font-bold mt-2"
                                          style={{
                                            color: (item.cantidad_enviada - (item.cantidad_devuelta || 0)) > 0
                                              ? '#EF4444'
                                              : '#10B981',
                                          }}
                                        >
                                          {checklist.tipo === 'post_evento'
                                            ? item.cantidad_enviada - (item.cantidad_devuelta || 0)
                                            : '-'
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Acciones del item */}
                                  <div className="flex flex-col gap-2">
                                    {/* Botones de estado */}
                                    {checklist.estado !== 'completado' && (
                                      <div className="flex gap-1">
                                        {Object.entries(ESTADOS_ITEM).map(([key, config]) => {
                                          const Icon = config.icon;
                                          return (
                                            <button
                                              key={key}
                                              onClick={() => handleCambiarEstadoItem(item.id, key as EstadoItemChecklist)}
                                              className="p-1.5 rounded transition-all"
                                              style={{
                                                backgroundColor: item.estado_producto === key
                                                  ? `${config.color}30`
                                                  : 'transparent',
                                                color: config.color,
                                                border: `1px solid ${item.estado_producto === key ? config.color : 'transparent'}`,
                                              }}
                                              title={config.label}
                                            >
                                              <Icon size={16} />
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Botón de foto */}
                                    <button
                                      onClick={() => setShowFotoModal({
                                        checklistDetalleId: item.id,
                                        tipo: checklist.tipo === 'pre_evento' ? 'antes' : 'despues',
                                      })}
                                      className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                                      style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                                    >
                                      <Camera size={14} />
                                      Foto
                                    </button>
                                  </div>
                                </div>

                                {/* Notas del item */}
                                {item.notas && (
                                  <p className="text-xs mt-2 italic" style={{ color: colors.textMuted }}>
                                    {item.notas}
                                  </p>
                                )}

                                {/* Fotos del item */}
                                {(item.fotos as any[])?.length > 0 && (
                                  <div className="flex gap-2 mt-3">
                                    {(item.fotos as any[]).map((foto, idx) => (
                                      <div
                                        key={idx}
                                        className="relative group w-16 h-16 rounded-lg overflow-hidden"
                                        style={{ border: `1px solid ${colors.border}` }}
                                      >
                                        <img
                                          src={foto.url_foto}
                                          alt={foto.descripcion || 'Foto'}
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                          <Eye size={16} className="text-white" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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

      {/* Modal crear checklist */}
      {showCrearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              Nuevo Checklist
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Evento
                </label>
                <select
                  value={eventoSeleccionado}
                  onChange={(e) => setEventoSeleccionado(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
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
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Tipo de checklist
                </label>
                <div className="flex gap-4">
                  {Object.entries(TIPOS_CHECKLIST).map(([key, value]) => {
                    const Icon = value.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTipoChecklistNuevo(key as TipoChecklist)}
                        className="flex-1 p-4 rounded-lg text-center transition-all"
                        style={{
                          backgroundColor: tipoChecklistNuevo === key ? `${value.color}20` : colors.bg,
                          border: `2px solid ${tipoChecklistNuevo === key ? value.color : colors.border}`,
                        }}
                      >
                        <Icon
                          size={24}
                          className="mx-auto mb-2"
                          style={{ color: tipoChecklistNuevo === key ? value.color : colors.textMuted }}
                        />
                        <p
                          className="font-medium"
                          style={{ color: tipoChecklistNuevo === key ? value.color : colors.text }}
                        >
                          {value.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {eventoSeleccionado && reservasEvento.length > 0 && (
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: colors.bg }}
                >
                  <p className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Se incluirán {reservasEvento.length} productos de las reservas:
                  </p>
                  <div className="space-y-1">
                    {reservasEvento.slice(0, 3).map((r: any) => (
                      <p key={r.id} className="text-xs" style={{ color: colors.textMuted }}>
                        • {r.producto?.nombre || `Producto ${r.producto_id}`} ({r.cantidad_reservada} uds)
                      </p>
                    ))}
                    {reservasEvento.length > 3 && (
                      <p className="text-xs" style={{ color: colors.textMuted }}>
                        ...y {reservasEvento.length - 3} más
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCrearModal(false);
                    setEventoSeleccionado('');
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearChecklist}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: colors.primary }}
                  disabled={crearChecklistMutation.isPending || !eventoSeleccionado}
                >
                  {crearChecklistMutation.isPending ? 'Creando...' : 'Crear Checklist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar foto */}
      {showFotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-sm rounded-xl p-6"
            style={{ backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              Agregar Foto
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  URL de la imagen
                </label>
                <input
                  type="url"
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  placeholder="https://..."
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
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={fotoDescripcion}
                  onChange={(e) => setFotoDescripcion(e.target.value)}
                  placeholder="Descripción de la foto"
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>

              {fotoUrl && (
                <div className="relative w-full h-40 rounded-lg overflow-hidden">
                  <img
                    src={fotoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Error';
                    }}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFotoModal(null);
                    setFotoUrl('');
                    setFotoDescripcion('');
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!fotoUrl) {
                      toast.error('Ingresa una URL válida');
                      return;
                    }
                    agregarFotoMutation.mutate({
                      checklistDetalleId: showFotoModal.checklistDetalleId,
                      tipo: showFotoModal.tipo,
                      urlFoto: fotoUrl,
                      descripcion: fotoDescripcion,
                    });
                  }}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: colors.primary }}
                  disabled={agregarFotoMutation.isPending || !fotoUrl}
                >
                  {agregarFotoMutation.isPending ? 'Guardando...' : 'Guardar Foto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistEventoPage;
