/**
 * AlertasInventarioPage - Dashboard de alertas de inventario
 * 
 * Centraliza todas las alertas: stock bajo, lotes venciendo,
 * conteos pendientes, reservas próximas.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Bell,
  AlertTriangle,
  Package,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  Filter,
  TrendingDown,
  RefreshCw,
  Eye,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import {
  fetchAlertas,
  marcarAlertaComoLeida,
  marcarAlertaResuelta,
  descartarAlerta,
  getEstadisticasAlertas,
  generarAlertasAutomaticas,
} from '../services/alertasService';
import type { AlertaInventario, TipoAlerta, PrioridadAlerta, EstadoAlerta } from '../types';

const TIPOS_ALERTA: Record<TipoAlerta, { label: string; icon: React.ElementType; color: string }> = {
  stock_bajo: { label: 'Stock Bajo', icon: TrendingDown, color: '#EF4444' },
  stock_critico: { label: 'Stock Crítico', icon: AlertTriangle, color: '#DC2626' },
  lote_por_vencer: { label: 'Lote por Vencer', icon: Calendar, color: '#F59E0B' },
  lote_vencido: { label: 'Lote Vencido', icon: XCircle, color: '#DC2626' },
  conteo_pendiente: { label: 'Conteo Pendiente', icon: Clock, color: '#3B82F6' },
  reserva_proxima: { label: 'Reserva Próxima', icon: Package, color: '#8B5CF6' },
  sin_movimiento: { label: 'Sin Movimiento', icon: Archive, color: '#6B7280' },
};

const PRIORIDADES: Record<PrioridadAlerta, { label: string; color: string; bgColor: string }> = {
  baja: { label: 'Baja', color: '#10B981', bgColor: '#10B98120' },
  media: { label: 'Media', color: '#F59E0B', bgColor: '#F59E0B20' },
  alta: { label: 'Alta', color: '#EF4444', bgColor: '#EF444420' },
  critica: { label: 'Crítica', color: '#DC2626', bgColor: '#DC262620' },
};

const ESTADOS: Record<EstadoAlerta, { label: string; color: string }> = {
  activa: { label: 'Activa', color: '#EF4444' },
  leida: { label: 'Leída', color: '#F59E0B' },
  resuelta: { label: 'Resuelta', color: '#10B981' },
  descartada: { label: 'Descartada', color: '#6B7280' },
};

export const AlertasInventarioPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [tipoFiltro, setTipoFiltro] = useState<TipoAlerta | ''>('');
  const [prioridadFiltro, setPrioridadFiltro] = useState<PrioridadAlerta | ''>('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoAlerta | ''>('activa');
  const [selectedAlertas, setSelectedAlertas] = useState<number[]>([]);

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
  const { data: alertas = [], isLoading, refetch } = useQuery({
    queryKey: ['alertas', companyId, tipoFiltro, prioridadFiltro, estadoFiltro],
    queryFn: () => fetchAlertas(companyId, {
      tipo: tipoFiltro || undefined,
      prioridad: prioridadFiltro || undefined,
      estado: estadoFiltro || undefined,
    }),
    enabled: !!companyId,
    refetchInterval: 60000, // Refrescar cada minuto
  });

  const { data: estadisticas } = useQuery({
    queryKey: ['alertas-stats', companyId],
    queryFn: () => getEstadisticasAlertas(companyId),
    enabled: !!companyId,
  });

  // Mutations
  const marcarLeidaMutation = useMutation({
    mutationFn: marcarAlertaComoLeida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
    },
  });

  const resolverMutation = useMutation({
    mutationFn: marcarAlertaResuelta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success('Alerta marcada como resuelta');
    },
  });

  const descartarMutation = useMutation({
    mutationFn: descartarAlerta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success('Alerta descartada');
    },
  });

  const generarAlertasMutation = useMutation({
    mutationFn: () => generarAlertasAutomaticas(companyId),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success(`${count} alertas generadas`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al generar alertas');
    },
  });

  // Agrupar alertas por tipo
  const alertasAgrupadas = useMemo(() => {
    const grupos: Record<string, AlertaInventario[]> = {};
    alertas.forEach((a) => {
      if (!grupos[a.tipo_alerta]) {
        grupos[a.tipo_alerta] = [];
      }
      grupos[a.tipo_alerta].push(a);
    });
    return grupos;
  }, [alertas]);

  // Handlers
  const handleMarcarLeidas = () => {
    selectedAlertas.forEach((id) => {
      marcarLeidaMutation.mutate(id);
    });
    setSelectedAlertas([]);
  };

  const handleResolverSeleccionadas = () => {
    selectedAlertas.forEach((id) => {
      resolverMutation.mutate(id);
    });
    setSelectedAlertas([]);
  };

  const toggleSelectAlerta = (id: number) => {
    setSelectedAlertas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedAlertas.length === alertas.length) {
      setSelectedAlertas([]);
    } else {
      setSelectedAlertas(alertas.map((a) => a.id));
    }
  };

  return (
    <div className="p-6" style={{ backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl relative"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <Bell size={28} style={{ color: colors.primary }} />
              {estadisticas?.activas > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  {estadisticas.activas > 99 ? '99+' : estadisticas.activas}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
                Centro de Alertas
              </h1>
              <p style={{ color: colors.textMuted }}>
                Monitorea stock, vencimientos, conteos y reservas
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => generarAlertasMutation.mutate()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
              disabled={generarAlertasMutation.isPending}
            >
              <RefreshCw size={18} className={generarAlertasMutation.isPending ? 'animate-spin' : ''} />
              Actualizar Alertas
            </button>
          </div>
        </div>

        {/* Stats por prioridad */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(PRIORIDADES).map(([key, value]) => {
            const count = alertas.filter((a) => a.prioridad === key && a.estado === 'activa').length;
            return (
              <div
                key={key}
                className="p-4 rounded-xl cursor-pointer transition-all hover:scale-105"
                style={{
                  backgroundColor: colors.card,
                  border: `2px solid ${prioridadFiltro === key ? value.color : colors.border}`,
                }}
                onClick={() => setPrioridadFiltro(prioridadFiltro === key ? '' : key as PrioridadAlerta)}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: value.color }}
                  />
                  <p className="text-2xl font-bold" style={{ color: value.color }}>
                    {count}
                  </p>
                </div>
                <p className="text-sm mt-2" style={{ color: colors.textMuted }}>
                  Prioridad {value.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} style={{ color: colors.textMuted }} />
            <span style={{ color: colors.textMuted }}>Filtrar:</span>
          </div>

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as TipoAlerta | '')}
            className="px-3 py-2 rounded-lg border focus:outline-none text-sm"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_ALERTA).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoAlerta | '')}
            className="px-3 py-2 rounded-lg border focus:outline-none text-sm"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>

          {/* Acciones masivas */}
          {selectedAlertas.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm" style={{ color: colors.textMuted }}>
                {selectedAlertas.length} seleccionadas
              </span>
              <button
                onClick={handleMarcarLeidas}
                className="px-3 py-1 rounded text-sm font-medium"
                style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}
              >
                Marcar leídas
              </button>
              <button
                onClick={handleResolverSeleccionadas}
                className="px-3 py-1 rounded text-sm font-medium"
                style={{ backgroundColor: '#10B98120', color: '#10B981' }}
              >
                Resolver
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resumen por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {Object.entries(TIPOS_ALERTA).map(([key, value]) => {
          const count = alertas.filter((a) => a.tipo_alerta === key).length;
          const Icon = value.icon;
          return (
            <button
              key={key}
              onClick={() => setTipoFiltro(tipoFiltro === key ? '' : key as TipoAlerta)}
              className="p-3 rounded-lg text-center transition-all"
              style={{
                backgroundColor: tipoFiltro === key ? `${value.color}20` : colors.card,
                border: `1px solid ${tipoFiltro === key ? value.color : colors.border}`,
              }}
            >
              <Icon
                size={20}
                className="mx-auto mb-1"
                style={{ color: value.color }}
              />
              <p className="text-lg font-bold" style={{ color: colors.text }}>
                {count}
              </p>
              <p className="text-xs truncate" style={{ color: colors.textMuted }}>
                {value.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Lista de alertas */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : alertas.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#10B981' }} />
          <p className="text-xl font-medium" style={{ color: colors.text }}>
            ¡Todo bajo control!
          </p>
          <p style={{ color: colors.textMuted }}>
            No hay alertas {estadoFiltro ? ESTADOS[estadoFiltro].label.toLowerCase() + 's' : ''} en este momento
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          {/* Header de tabla */}
          <div
            className="px-4 py-3 flex items-center gap-4"
            style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}
          >
            <input
              type="checkbox"
              checked={selectedAlertas.length === alertas.length && alertas.length > 0}
              onChange={selectAll}
              className="rounded"
            />
            <span className="text-sm font-medium" style={{ color: colors.textMuted }}>
              {alertas.length} alertas
            </span>
          </div>

          {/* Lista */}
          <div className="divide-y" style={{ borderColor: colors.border }}>
            {alertas.map((alerta) => {
              const tipoConfig = TIPOS_ALERTA[alerta.tipo_alerta];
              const prioridadConfig = PRIORIDADES[alerta.prioridad];
              const estadoConfig = ESTADOS[alerta.estado];
              const TipoIcon = tipoConfig.icon;
              const isSelected = selectedAlertas.includes(alerta.id);

              return (
                <div
                  key={alerta.id}
                  className={`p-4 flex items-start gap-4 transition-colors ${
                    alerta.estado === 'activa' ? 'cursor-pointer hover:opacity-90' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${colors.primary}10` : 'transparent',
                  }}
                  onClick={() => {
                    if (alerta.estado === 'activa') {
                      marcarLeidaMutation.mutate(alerta.id);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectAlerta(alerta.id);
                    }}
                    className="rounded mt-1"
                  />

                  {/* Icono tipo */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${tipoConfig.color}20` }}
                  >
                    <TipoIcon size={20} style={{ color: tipoConfig.color }} />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: prioridadConfig.bgColor, color: prioridadConfig.color }}
                      >
                        {prioridadConfig.label}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: `${tipoConfig.color}20`, color: tipoConfig.color }}
                      >
                        {tipoConfig.label}
                      </span>
                      {alerta.estado !== 'activa' && (
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: `${estadoConfig.color}20`, color: estadoConfig.color }}
                        >
                          {estadoConfig.label}
                        </span>
                      )}
                    </div>

                    <p
                      className={`font-medium ${alerta.estado === 'activa' ? '' : 'opacity-70'}`}
                      style={{ color: colors.text }}
                    >
                      {alerta.mensaje}
                    </p>

                    {alerta.detalles && (
                      <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                        {alerta.detalles}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2">
                      {alerta.producto && (
                        <span className="text-xs flex items-center gap-1" style={{ color: colors.textMuted }}>
                          <Package size={12} />
                          {(alerta.producto as any)?.nombre}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        {new Date(alerta.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    {alerta.estado !== 'resuelta' && alerta.estado !== 'descartada' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolverMutation.mutate(alerta.id);
                          }}
                          className="p-2 rounded-lg transition-colors hover:opacity-80"
                          style={{ color: '#10B981' }}
                          title="Marcar como resuelta"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('¿Descartar esta alerta?')) {
                              descartarMutation.mutate(alerta.id);
                            }
                          }}
                          className="p-2 rounded-lg transition-colors hover:opacity-80"
                          style={{ color: '#6B7280' }}
                          title="Descartar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    {alerta.url_accion && (
                      <a
                        href={alerta.url_accion}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg transition-colors hover:opacity-80"
                        style={{ color: colors.primary }}
                        title="Ver detalle"
                      >
                        <ChevronRight size={18} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertasInventarioPage;
