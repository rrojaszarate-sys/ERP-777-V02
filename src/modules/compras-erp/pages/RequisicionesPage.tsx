/**
 * RequisicionesPage - Gestión de requisiciones de compra
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Calendar,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  fetchRequisiciones,
  aprobarRequisicion,
  rechazarRequisicion,
  deleteRequisicion,
  convertirAOrdenCompra,
} from '../services/requisicionesService';
import type { RequisicionCompra, EstadoRequisicion, PrioridadRequisicion } from '../types';

const ESTADOS: Record<EstadoRequisicion, { label: string; color: string; bgColor: string }> = {
  pendiente: { label: 'Pendiente', color: '#F59E0B', bgColor: '#F59E0B20' },
  aprobada: { label: 'Aprobada', color: '#10B981', bgColor: '#10B98120' },
  rechazada: { label: 'Rechazada', color: '#EF4444', bgColor: '#EF444420' },
  en_compra: { label: 'En Compra', color: '#3B82F6', bgColor: '#3B82F620' },
  completada: { label: 'Completada', color: '#059669', bgColor: '#05966920' },
};

const PRIORIDADES: Record<PrioridadRequisicion, { label: string; color: string; bgColor: string }> = {
  baja: { label: 'Baja', color: '#6B7280', bgColor: '#6B728020' },
  media: { label: 'Media', color: '#3B82F6', bgColor: '#3B82F620' },
  alta: { label: 'Alta', color: '#F59E0B', bgColor: '#F59E0B20' },
  urgente: { label: 'Urgente', color: '#EF4444', bgColor: '#EF444420' },
};

export const RequisicionesPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoRequisicion | ''>('');
  const [prioridadFiltro, setPrioridadFiltro] = useState<PrioridadRequisicion | ''>('');

  // Colores dinámicos
  const colors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    bg: isDark ? '#1a1a2e' : '#f8fafc',
    card: isDark ? '#16213e' : '#ffffff',
    text: isDark ? '#e2e8f0' : '#1e293b',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
  }), [paletteConfig, isDark]);

  // Query
  const { data: requisiciones = [], isLoading } = useQuery({
    queryKey: ['requisiciones', companyId, estadoFiltro, prioridadFiltro],
    queryFn: () => fetchRequisiciones(companyId, {
      estado: estadoFiltro || undefined,
      prioridad: prioridadFiltro || undefined,
    }),
    enabled: !!companyId,
  });

  // Mutations
  const aprobarMutation = useMutation({
    mutationFn: (id: number) => aprobarRequisicion(id, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisiciones'] });
      toast.success('Requisición aprobada');
    },
    onError: () => toast.error('Error al aprobar'),
  });

  const rechazarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      rechazarRequisicion(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisiciones'] });
      toast.success('Requisición rechazada');
    },
    onError: () => toast.error('Error al rechazar'),
  });

  const eliminarMutation = useMutation({
    mutationFn: deleteRequisicion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisiciones'] });
      toast.success('Requisición eliminada');
    },
    onError: (error: any) => toast.error(error.message || 'Error al eliminar'),
  });

  // Filtrar
  const requisicionesFiltradas = useMemo(() => {
    return requisiciones.filter((r) => {
      if (busqueda) {
        const search = busqueda.toLowerCase();
        return (
          r.numero_requisicion.toLowerCase().includes(search) ||
          r.justificacion?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [requisiciones, busqueda]);

  // Estadísticas
  const stats = useMemo(() => ({
    total: requisiciones.length,
    pendientes: requisiciones.filter(r => r.estado === 'pendiente').length,
    aprobadas: requisiciones.filter(r => r.estado === 'aprobada').length,
    urgentes: requisiciones.filter(r => r.prioridad === 'urgente' && r.estado === 'pendiente').length,
  }), [requisiciones]);

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: colors.bg }}>
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
                Requisiciones de Compra
              </h1>
              <p style={{ color: colors.textMuted }}>
                Solicitudes internas de materiales
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/compras/requisiciones/nueva')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={20} />
            Nueva Requisición
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          >
            <p className="text-sm" style={{ color: colors.textMuted }}>Total</p>
            <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.total}</p>
          </div>
          <div
            className="p-4 rounded-xl cursor-pointer hover:scale-102 transition-transform"
            style={{ backgroundColor: '#F59E0B20', border: '1px solid #F59E0B' }}
            onClick={() => setEstadoFiltro('pendiente')}
          >
            <p className="text-sm text-yellow-600">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
          </div>
          <div
            className="p-4 rounded-xl cursor-pointer hover:scale-102 transition-transform"
            style={{ backgroundColor: '#10B98120', border: '1px solid #10B981' }}
            onClick={() => setEstadoFiltro('aprobada')}
          >
            <p className="text-sm text-green-600">Aprobadas</p>
            <p className="text-2xl font-bold text-green-600">{stats.aprobadas}</p>
          </div>
          <div
            className="p-4 rounded-xl cursor-pointer hover:scale-102 transition-transform"
            style={{ backgroundColor: '#EF444420', border: '1px solid #EF4444' }}
            onClick={() => setPrioridadFiltro('urgente')}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              <p className="text-sm text-red-600">Urgentes</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.urgentes}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: colors.textMuted }}
            />
            <input
              type="text"
              placeholder="Buscar requisiciones..."
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
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoRequisicion | '')}
            className="px-3 py-2 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>

          <select
            value={prioridadFiltro}
            onChange={(e) => setPrioridadFiltro(e.target.value as PrioridadRequisicion | '')}
            className="px-3 py-2 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todas las prioridades</option>
            {Object.entries(PRIORIDADES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : requisicionesFiltradas.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <ClipboardList size={48} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No hay requisiciones</p>
          <button
            onClick={() => navigate('/compras/requisiciones/nueva')}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Crear primera requisición
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requisicionesFiltradas.map((req) => {
            const estadoConfig = ESTADOS[req.estado];
            const prioridadConfig = PRIORIDADES[req.prioridad];

            return (
              <div
                key={req.id}
                className="p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all"
                style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                onClick={() => navigate(`/compras/requisiciones/${req.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Número y badges */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg" style={{ color: colors.text }}>
                        {req.numero_requisicion}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: estadoConfig.bgColor,
                          color: estadoConfig.color,
                        }}
                      >
                        {estadoConfig.label}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: prioridadConfig.bgColor,
                          color: prioridadConfig.color,
                        }}
                      >
                        {prioridadConfig.label}
                      </span>
                    </div>

                    {/* Justificación */}
                    {req.justificacion && (
                      <p className="mb-2" style={{ color: colors.text }}>
                        {req.justificacion}
                      </p>
                    )}

                    {/* Metadatos */}
                    <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: colors.textMuted }}>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(req.fecha_requisicion).toLocaleDateString()}
                      </span>
                      {req.fecha_requerida && (
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Requerido: {new Date(req.fecha_requerida).toLocaleDateString()}
                        </span>
                      )}
                      {req.departamento && (
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {req.departamento}
                        </span>
                      )}
                      {req.evento && (
                        <span className="flex items-center gap-1">
                          📅 {(req.evento as any)?.nombre_proyecto}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {req.estado === 'pendiente' && (
                      <>
                        <button
                          onClick={() => aprobarMutation.mutate(req.id)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ backgroundColor: '#10B98120', color: '#10B981' }}
                          title="Aprobar"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const motivo = prompt('Motivo del rechazo:');
                            if (motivo) {
                              rechazarMutation.mutate({ id: req.id, motivo });
                            }
                          }}
                          className="p-2 rounded-lg transition-colors"
                          style={{ backgroundColor: '#EF444420', color: '#EF4444' }}
                          title="Rechazar"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}

                    {req.estado === 'aprobada' && (
                      <button
                        onClick={() => navigate(`/compras/ordenes/nueva?requisicion=${req.id}`)}
                        className="p-2 rounded-lg transition-colors flex items-center gap-1"
                        style={{ backgroundColor: '#3B82F620', color: '#3B82F6' }}
                        title="Convertir a Orden"
                      >
                        <ShoppingCart size={18} />
                        <span className="text-sm">Crear OC</span>
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/compras/requisiciones/${req.id}`)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ backgroundColor: colors.bg }}
                      title="Ver detalle"
                    >
                      <Eye size={18} style={{ color: colors.textMuted }} />
                    </button>

                    {req.estado === 'pendiente' && (
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar esta requisición?')) {
                            eliminarMutation.mutate(req.id);
                          }
                        }}
                        className="p-2 rounded-lg transition-colors"
                        style={{ backgroundColor: '#EF444410', color: '#EF4444' }}
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RequisicionesPage;
