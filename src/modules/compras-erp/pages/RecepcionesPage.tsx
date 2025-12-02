/**
 * RecepcionesPage - Gestión de recepciones de compra
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PackageCheck,
  Plus,
  Search,
  Eye,
  Calendar,
  Truck,
  CheckCircle,
  XCircle,
  Package,
  User,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import {
  fetchRecepciones,
  verificarRecepcion,
} from '../services/recepcionesService';
import type { RecepcionCompra, EstadoRecepcion } from '../types';

const ESTADOS: Record<EstadoRecepcion, { label: string; color: string; bgColor: string }> = {
  pendiente: { label: 'Pendiente', color: '#F59E0B', bgColor: '#F59E0B20' },
  en_proceso: { label: 'En Proceso', color: '#3B82F6', bgColor: '#3B82F620' },
  verificada: { label: 'Verificada', color: '#10B981', bgColor: '#10B98120' },
  con_diferencias: { label: 'Con Diferencias', color: '#EF4444', bgColor: '#EF444420' },
  finalizada: { label: 'Finalizada', color: '#059669', bgColor: '#05966920' },
};

export const RecepcionesPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoRecepcion | ''>('');

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
  const { data: recepciones = [], isLoading } = useQuery({
    queryKey: ['recepciones', companyId, estadoFiltro],
    queryFn: () => fetchRecepciones(companyId, {
      estado: estadoFiltro || undefined,
    }),
    enabled: !!companyId,
  });

  // Mutations
  const verificarMutation = useMutation({
    mutationFn: (id: number) => verificarRecepcion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recepciones'] });
      toast.success('Recepción verificada y stock actualizado');
    },
    onError: () => toast.error('Error al verificar'),
  });

  // Filtrar
  const recepcionesFiltradas = useMemo(() => {
    return recepciones.filter((r) => {
      if (busqueda) {
        const search = busqueda.toLowerCase();
        return (
          r.numero_recepcion.toLowerCase().includes(search) ||
          r.numero_factura?.toLowerCase().includes(search) ||
          r.numero_remision?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [recepciones, busqueda]);

  // Estadísticas
  const stats = useMemo(() => ({
    total: recepciones.length,
    pendientes: recepciones.filter(r => r.estado === 'pendiente').length,
    enProceso: recepciones.filter(r => r.estado === 'en_proceso').length,
    conDiferencias: recepciones.filter(r => r.estado === 'con_diferencias').length,
    finalizadas: recepciones.filter(r => r.estado === 'finalizada').length,
  }), [recepciones]);

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
              <PackageCheck size={28} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
                Recepciones de Compra
              </h1>
              <p style={{ color: colors.textMuted }}>
                Entrada de materiales al inventario
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/compras/recepciones/nueva')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={20} />
            Nueva Recepción
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4 mb-4">
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
            style={{ backgroundColor: '#3B82F620', border: '1px solid #3B82F6' }}
            onClick={() => setEstadoFiltro('en_proceso')}
          >
            <p className="text-sm text-blue-600">En Proceso</p>
            <p className="text-2xl font-bold text-blue-600">{stats.enProceso}</p>
          </div>
          <div
            className="p-4 rounded-xl cursor-pointer hover:scale-102 transition-transform"
            style={{ backgroundColor: '#EF444420', border: '1px solid #EF4444' }}
            onClick={() => setEstadoFiltro('con_diferencias')}
          >
            <div className="flex items-center gap-1">
              <AlertTriangle className="text-red-500" size={16} />
              <p className="text-sm text-red-600">Con Diferencias</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.conDiferencias}</p>
          </div>
          <div
            className="p-4 rounded-xl cursor-pointer hover:scale-102 transition-transform"
            style={{ backgroundColor: '#05966920', border: '1px solid #059669' }}
            onClick={() => setEstadoFiltro('finalizada')}
          >
            <p className="text-sm text-emerald-600">Finalizadas</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.finalizadas}</p>
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
              placeholder="Buscar por número, factura o remisión..."
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
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoRecepcion | '')}
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

          {estadoFiltro && (
            <button
              onClick={() => setEstadoFiltro('')}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: colors.card, color: colors.textMuted }}
            >
              Limpiar filtros
            </button>
          )}
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
      ) : recepcionesFiltradas.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <PackageCheck size={48} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No hay recepciones</p>
          <button
            onClick={() => navigate('/compras/recepciones/nueva')}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Registrar primera recepción
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {recepcionesFiltradas.map((rec) => {
            const estadoConfig = ESTADOS[rec.estado];
            const ordenCompra = rec.orden_compra as any;
            const proveedor = ordenCompra?.proveedor;

            return (
              <div
                key={rec.id}
                className="p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all"
                style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                onClick={() => navigate(`/compras/recepciones/${rec.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Número y badges */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg" style={{ color: colors.text }}>
                        {rec.numero_recepcion}
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
                      {ordenCompra && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{ backgroundColor: colors.bg, color: colors.textMuted }}
                        >
                          <FileText size={12} />
                          OC: {ordenCompra.numero_orden}
                        </span>
                      )}
                    </div>

                    {/* Proveedor */}
                    {proveedor && (
                      <p className="mb-2 font-medium" style={{ color: colors.text }}>
                        🏢 {proveedor.nombre || proveedor.razon_social}
                      </p>
                    )}

                    {/* Documentos */}
                    <div className="flex flex-wrap gap-3 mb-2 text-sm" style={{ color: colors.textMuted }}>
                      {rec.numero_factura && (
                        <span className="flex items-center gap-1">
                          📄 Factura: {rec.numero_factura}
                        </span>
                      )}
                      {rec.numero_remision && (
                        <span className="flex items-center gap-1">
                          📋 Remisión: {rec.numero_remision}
                        </span>
                      )}
                    </div>

                    {/* Metadatos */}
                    <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: colors.textMuted }}>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(rec.fecha_recepcion).toLocaleDateString()}
                      </span>
                      {rec.recibido_por && (
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          Recibió: {(rec.recibido_por as any)?.nombre || 'Usuario'}
                        </span>
                      )}
                      {rec.almacen && (
                        <span className="flex items-center gap-1">
                          <Package size={14} />
                          {(rec.almacen as any)?.nombre}
                        </span>
                      )}
                    </div>

                    {/* Observaciones */}
                    {rec.observaciones && (
                      <p className="mt-2 text-sm italic" style={{ color: colors.textMuted }}>
                        "{rec.observaciones}"
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {rec.estado === 'en_proceso' && (
                      <button
                        onClick={() => verificarMutation.mutate(rec.id)}
                        className="px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                        style={{ backgroundColor: '#10B98120', color: '#10B981' }}
                        title="Verificar y actualizar stock"
                      >
                        <CheckCircle size={18} />
                        <span className="text-sm">Verificar</span>
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/compras/recepciones/${rec.id}`)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ backgroundColor: colors.bg }}
                      title="Ver detalle"
                    >
                      <Eye size={18} style={{ color: colors.textMuted }} />
                    </button>
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

export default RecepcionesPage;
