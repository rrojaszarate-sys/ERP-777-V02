/**
 * OrdenesCompraPage - Gestión de órdenes de compra
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Copy,
  Package,
  Calendar,
  DollarSign,
  Clock,
  MoreVertical,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  fetchOrdenesCompra,
  aprobarOrdenCompra,
  enviarOrdenAProveedor,
  cancelarOrdenCompra,
  deleteOrdenCompra,
  duplicarOrdenCompra,
} from '../services/ordenesCompraService';
import type { OrdenCompra, EstadoOrdenCompra } from '../types';

const ESTADOS: Record<EstadoOrdenCompra, { label: string; color: string; bgColor: string }> = {
  borrador: { label: 'Borrador', color: '#6B7280', bgColor: '#6B728020' },
  pendiente_aprobacion: { label: 'Pend. Aprobación', color: '#F59E0B', bgColor: '#F59E0B20' },
  aprobada: { label: 'Aprobada', color: '#10B981', bgColor: '#10B98120' },
  enviada_proveedor: { label: 'Enviada', color: '#3B82F6', bgColor: '#3B82F620' },
  parcialmente_recibida: { label: 'Parcial', color: '#8B5CF6', bgColor: '#8B5CF620' },
  recibida: { label: 'Recibida', color: '#059669', bgColor: '#05966920' },
  cancelada: { label: 'Cancelada', color: '#EF4444', bgColor: '#EF444420' },
  cerrada: { label: 'Cerrada', color: '#374151', bgColor: '#37415120' },
};

export const OrdenesCompraPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoOrdenCompra | ''>('');
  const [menuAbierto, setMenuAbierto] = useState<number | null>(null);

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
  const { data: ordenes = [], isLoading } = useQuery({
    queryKey: ['ordenes-compra', companyId, estadoFiltro],
    queryFn: () => fetchOrdenesCompra(companyId, {
      estado: estadoFiltro || undefined,
    }),
    enabled: !!companyId,
  });

  // Mutations
  const aprobarMutation = useMutation({
    mutationFn: (ordenId: number) => aprobarOrdenCompra(ordenId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      toast.success('Orden aprobada');
    },
    onError: () => toast.error('Error al aprobar'),
  });

  const enviarMutation = useMutation({
    mutationFn: enviarOrdenAProveedor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      toast.success('Orden enviada al proveedor');
    },
    onError: () => toast.error('Error al enviar'),
  });

  const cancelarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      cancelarOrdenCompra(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      toast.success('Orden cancelada');
    },
    onError: () => toast.error('Error al cancelar'),
  });

  const eliminarMutation = useMutation({
    mutationFn: deleteOrdenCompra,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      toast.success('Orden eliminada');
    },
    onError: (error: any) => toast.error(error.message || 'Error al eliminar'),
  });

  const duplicarMutation = useMutation({
    mutationFn: duplicarOrdenCompra,
    onSuccess: (nuevaOrden) => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      toast.success('Orden duplicada');
      navigate(`/compras/ordenes/${nuevaOrden.id}`);
    },
    onError: () => toast.error('Error al duplicar'),
  });

  // Filtrar
  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((o) => {
      if (busqueda) {
        const search = busqueda.toLowerCase();
        return (
          o.numero_orden.toLowerCase().includes(search) ||
          (o.proveedor as any)?.nombre?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [ordenes, busqueda]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    return {
      total: ordenes.length,
      borradores: ordenes.filter(o => o.estado === 'borrador').length,
      pendientes: ordenes.filter(o => o.estado === 'pendiente_aprobacion').length,
      enviadas: ordenes.filter(o => o.estado === 'enviada_proveedor').length,
      montoTotal: ordenes.reduce((sum, o) => sum + (o.total || 0), 0),
    };
  }, [ordenes]);

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
              <FileText size={28} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
                Órdenes de Compra
              </h1>
              <p style={{ color: colors.textMuted }}>
                {stats.total} órdenes • ${stats.montoTotal.toLocaleString()} total
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/compras/ordenes/nueva')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={20} />
            Nueva Orden
          </button>
        </div>

        {/* Filtros rápidos por estado */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setEstadoFiltro('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              !estadoFiltro ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              backgroundColor: !estadoFiltro ? colors.primary : colors.card,
              color: !estadoFiltro ? 'white' : colors.text,
              borderColor: colors.border,
              ringColor: colors.primary,
            }}
          >
            Todas ({stats.total})
          </button>
          {Object.entries(ESTADOS).map(([key, value]) => {
            const count = ordenes.filter(o => o.estado === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setEstadoFiltro(estadoFiltro === key ? '' : key as EstadoOrdenCompra)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  estadoFiltro === key ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  backgroundColor: estadoFiltro === key ? value.color : value.bgColor,
                  color: estadoFiltro === key ? 'white' : value.color,
                }}
              >
                {value.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Búsqueda */}
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: colors.textMuted }}
          />
          <input
            type="text"
            placeholder="Buscar por número o proveedor..."
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
      </div>

      {/* Lista de órdenes */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : ordenesFiltradas.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <FileText size={48} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No hay órdenes de compra</p>
          <button
            onClick={() => navigate('/compras/ordenes/nueva')}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Crear primera orden
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
                  <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Orden
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Proveedor
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Fecha
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Entrega
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium" style={{ color: colors.textMuted }}>
                    Total
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
                {ordenesFiltradas.map((orden) => {
                  const estadoConfig = ESTADOS[orden.estado];
                  return (
                    <tr
                      key={orden.id}
                      className="border-t hover:opacity-90 transition-colors cursor-pointer"
                      style={{ borderColor: colors.border }}
                      onClick={() => navigate(`/compras/ordenes/${orden.id}`)}
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium" style={{ color: colors.text }}>
                          {orden.numero_orden}
                        </p>
                        {orden.referencia_interna && (
                          <p className="text-xs" style={{ color: colors.textMuted }}>
                            Ref: {orden.referencia_interna}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p style={{ color: colors.text }}>
                          {(orden.proveedor as any)?.nombre || `ID: ${orden.proveedor_id}`}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <p className="text-sm" style={{ color: colors.text }}>
                          {new Date(orden.fecha_orden).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {orden.fecha_entrega_esperada ? (
                          <p className="text-sm" style={{ color: colors.text }}>
                            {new Date(orden.fecha_entrega_esperada).toLocaleDateString()}
                          </p>
                        ) : (
                          <span style={{ color: colors.textMuted }}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-bold" style={{ color: colors.text }}>
                          ${orden.total.toLocaleString()}
                        </p>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          {orden.moneda}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: estadoConfig.bgColor,
                            color: estadoConfig.color,
                          }}
                        >
                          {estadoConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setMenuAbierto(menuAbierto === orden.id ? null : orden.id)}
                            className="p-2 rounded-lg hover:opacity-80"
                            style={{ backgroundColor: colors.bg }}
                          >
                            <MoreVertical size={18} style={{ color: colors.textMuted }} />
                          </button>

                          {menuAbierto === orden.id && (
                            <div
                              className="absolute right-0 top-10 z-10 w-48 rounded-lg shadow-lg py-1"
                              style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                            >
                              <button
                                onClick={() => navigate(`/compras/ordenes/${orden.id}`)}
                                className="w-full px-4 py-2 text-left flex items-center gap-2 hover:opacity-80"
                                style={{ color: colors.text }}
                              >
                                <Eye size={16} />
                                Ver detalle
                              </button>

                              {orden.estado === 'borrador' && (
                                <button
                                  onClick={() => navigate(`/compras/ordenes/${orden.id}/editar`)}
                                  className="w-full px-4 py-2 text-left flex items-center gap-2 hover:opacity-80"
                                  style={{ color: colors.text }}
                                >
                                  <Edit3 size={16} />
                                  Editar
                                </button>
                              )}

                              {orden.estado === 'pendiente_aprobacion' && (
                                <button
                                  onClick={() => aprobarMutation.mutate(orden.id)}
                                  className="w-full px-4 py-2 text-left flex items-center gap-2 hover:opacity-80"
                                  style={{ color: '#10B981' }}
                                >
                                  <CheckCircle size={16} />
                                  Aprobar
                                </button>
                              )}

                              {orden.estado === 'aprobada' && (
                                <button
                                  onClick={() => enviarMutation.mutate(orden.id)}
                                  className="w-full px-4 py-2 text-left flex items-center gap-2 hover:opacity-80"
                                  style={{ color: '#3B82F6' }}
                                >
                                  <Send size={16} />
                                  Enviar a proveedor
                                </button>
                              )}

                              {(orden.estado === 'enviada_proveedor' || orden.estado === 'parcialmente_recibida') && (
                                <button
                                  onClick={() => navigate(`/compras/recepciones/nueva?orden=${orden.id}`)}
                                  className="w-full px-4 py-2 text-left flex items-center gap-2 hover:opacity-80"
                                  style={{ color: '#8B5CF6' }}
                                >
                                  <Package size={16} />
                                  Registrar recepción
                                </button>
                              )}

                              <button
                                onClick={() => duplicarMutation.mutate(orden.id)}
                                className="w-full px-4 py-2 text-left flex items-center gap-2 hover:opacity-80"
                                style={{ color: colors.text }}
                              >
                                <Copy size={16} />
                                Duplicar
                              </button>

                              {orden.estado === 'borrador' && (
                                <>
                                  <hr style={{ borderColor: colors.border }} />
                                  <button
                                    onClick={() => {
                                      if (confirm('¿Eliminar esta orden?')) {
                                        eliminarMutation.mutate(orden.id);
                                      }
                                    }}
                                    className="w-full px-4 py-2 text-left flex items-center gap-2 hover:opacity-80"
                                    style={{ color: '#EF4444' }}
                                  >
                                    <Trash2 size={16} />
                                    Eliminar
                                  </button>
                                </>
                              )}

                              {!['cancelada', 'cerrada', 'recibida', 'borrador'].includes(orden.estado) && (
                                <>
                                  <hr style={{ borderColor: colors.border }} />
                                  <button
                                    onClick={() => {
                                      const motivo = prompt('Motivo de cancelación:');
                                      if (motivo) {
                                        cancelarMutation.mutate({ id: orden.id, motivo });
                                      }
                                    }}
                                    className="w-full px-4 py-2 text-left flex items-center gap-2 hover:opacity-80"
                                    style={{ color: '#EF4444' }}
                                  >
                                    <XCircle size={16} />
                                    Cancelar
                                  </button>
                                </>
                              )}
                            </div>
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

      {/* Click outside para cerrar menú */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setMenuAbierto(null)}
        />
      )}
    </div>
  );
};

export default OrdenesCompraPage;
