/**
 * Página de aprobaciones
 * Para usuarios con permisos de aprobar solicitudes
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortalHeader } from '../components/PortalHeader';
import { usePortalAuth } from '../context/PortalAuthContext';
import { solicitudesService } from '../services/solicitudesService';
import { SolicitudCompra, EstadoSolicitud, PrioridadSolicitud } from '../types';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  User,
  Package,
  AlertTriangle,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  MessageSquare,
  Building,
  Target
} from 'lucide-react';

// Configuración de prioridades
const prioridadConfig: Record<PrioridadSolicitud, { 
  label: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
}> = {
  normal: { label: 'Normal', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' },
  urgente: { label: 'Urgente', color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' },
  critica: { label: 'Crítica', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-300' },
};

// Componente de tarjeta de solicitud para aprobar
const SolicitudAprobacionCard: React.FC<{
  solicitud: SolicitudCompra;
  onAprobar: (id: string, comentario?: string) => void;
  onRechazar: (id: string, motivo: string) => void;
  isProcessing: boolean;
}> = ({ solicitud, onAprobar, onRechazar, isProcessing }) => {
  const [expanded, setExpanded] = useState(false);
  const [showRechazoForm, setShowRechazoForm] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [comentarioAprobacion, setComentarioAprobacion] = useState('');

  const prioridadConf = prioridadConfig[solicitud.prioridad];
  const diasRestantes = Math.ceil(
    (new Date(solicitud.fecha_requerida).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const handleAprobar = () => {
    onAprobar(solicitud.id, comentarioAprobacion || undefined);
  };

  const handleRechazar = () => {
    if (!motivoRechazo.trim()) {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }
    onRechazar(solicitud.id, motivoRechazo);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 ${prioridadConf.borderColor} overflow-hidden`}>
      {/* Header de la tarjeta */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          {/* Info principal */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono font-semibold text-gray-900">
                {solicitud.numero_solicitud}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${prioridadConf.bgColor} ${prioridadConf.color}`}>
                {prioridadConf.label}
              </span>
              {diasRestantes <= 3 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                  <AlertTriangle className="w-3 h-3" />
                  {diasRestantes <= 0 ? 'Vencida' : `${diasRestantes} días`}
                </span>
              )}
            </div>

            {/* Solicitante */}
            <div className="flex items-center gap-2 mb-3">
              {solicitud.solicitante?.avatar_url ? (
                <img
                  src={solicitud.solicitante.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-blue-600" />
                </div>
              )}
              <span className="text-sm text-gray-600">
                {solicitud.solicitante?.nombre_completo}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">
                {solicitud.solicitante?.departamento}
              </span>
            </div>

            {/* Destino */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Target className="w-4 h-4 text-gray-400" />
              {solicitud.tipo_destino === 'proyecto' && solicitud.proyecto && (
                <span>Proyecto: <strong>{solicitud.proyecto.nombre}</strong></span>
              )}
              {solicitud.tipo_destino === 'evento' && solicitud.evento && (
                <span>Evento: <strong>{solicitud.evento.nombre}</strong></span>
              )}
              {solicitud.tipo_destino === 'operativo' && (
                <span>Gastos operativos</span>
              )}
              {solicitud.tipo_destino === 'stock' && (
                <span>Reposición de stock</span>
              )}
            </div>

            {/* Justificación */}
            {solicitud.justificacion && (
              <p className={`text-sm text-gray-600 ${expanded ? '' : 'line-clamp-2'}`}>
                {solicitud.justificacion}
              </p>
            )}
          </div>

          {/* Monto y fechas */}
          <div className="flex lg:flex-col items-center lg:items-end gap-4 lg:gap-2">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                ${solicitud.monto_estimado.toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-gray-500">
                Nivel {solicitud.nivel_aprobacion_requerido} requerido
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>
                Requerido: {new Date(solicitud.fecha_requerida).toLocaleDateString('es-MX')}
              </span>
            </div>
          </div>
        </div>

        {/* Botón expandir */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver detalles ({solicitud.items?.length || 0} items)
            </>
          )}
        </button>
      </div>

      {/* Contenido expandido */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          {/* Items */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Items Solicitados</h4>
            <div className="space-y-2">
              {solicitud.items?.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between bg-white p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{item.descripcion}</span>
                    </div>
                    {item.especificaciones && (
                      <p className="text-sm text-gray-500 mt-1 ml-7">{item.especificaciones}</p>
                    )}
                    <div className="flex gap-4 mt-2 ml-7 text-xs text-gray-500">
                      <span>Cantidad: {item.cantidad} {item.unidad_medida}</span>
                      {item.proveedor_sugerido && (
                        <span>Proveedor: {item.proveedor_sugerido}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${((item.precio_referencia || 0) * item.cantidad).toLocaleString('es-MX')}
                    </p>
                    {item.precio_referencia && (
                      <p className="text-xs text-gray-500">
                        ${item.precio_referencia.toLocaleString('es-MX')} c/u
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impacto */}
          {solicitud.impacto_no_compra && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Impacto de no realizar la compra
              </h4>
              <p className="text-sm text-orange-700">{solicitud.impacto_no_compra}</p>
            </div>
          )}

          {/* Ver detalle completo */}
          <Link
            to={`/portal/solicitudes/${solicitud.id}`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <Eye className="w-4 h-4" />
            Ver solicitud completa
          </Link>
        </div>
      )}

      {/* Acciones */}
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        {showRechazoForm ? (
          <div className="space-y-3">
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Indique el motivo del rechazo..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRechazoForm(false);
                  setMotivoRechazo('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={!motivoRechazo.trim() || isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Confirmar Rechazo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Comentario opcional para aprobación */}
            <div className="flex-1">
              <input
                type="text"
                value={comentarioAprobacion}
                onChange={(e) => setComentarioAprobacion(e.target.value)}
                placeholder="Comentario de aprobación (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRechazoForm(true)}
                disabled={isProcessing}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Rechazar
              </button>

              <button
                onClick={handleAprobar}
                disabled={isProcessing}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Aprobar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AprobacionesPage: React.FC = () => {
  const { usuario } = usePortalAuth();
  const queryClient = useQueryClient();
  const [filtroPrioridad, setFiltroPrioridad] = useState<PrioridadSolicitud | ''>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Query para solicitudes pendientes de aprobación
  const { data: solicitudes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['aprobaciones-pendientes', usuario?.id],
    queryFn: async () => {
      // Obtener solicitudes en estado enviada o en_revision
      const { data, error } = await (await import('../../../core/config/supabase')).supabase
        .from('solicitudes_compra_erp')
        .select(`
          *,
          solicitante:usuarios_portal_solicitudes!solicitudes_compra_erp_solicitante_id_fkey(*),
          proyecto:proyectos(*),
          evento:eventos(*),
          items:solicitudes_compra_items_erp(*),
          aprobaciones:solicitudes_compra_aprobaciones_erp(*)
        `)
        .in('estado', ['enviada', 'en_revision'])
        .lte('nivel_aprobacion_requerido', usuario?.nivel_autorizacion || 1)
        .order('prioridad', { ascending: false })
        .order('fecha_requerida', { ascending: true });

      if (error) throw error;
      return data as SolicitudCompra[];
    },
    enabled: !!usuario?.id && usuario?.puede_aprobar,
  });

  // Mutation para aprobar
  const aprobarMutation = useMutation({
    mutationFn: ({ id, comentario }: { id: string; comentario?: string }) =>
      solicitudesService.aprobarSolicitud(id, usuario!.id, comentario),
    onSuccess: () => {
      toast.success('Solicitud aprobada correctamente');
      queryClient.invalidateQueries({ queryKey: ['aprobaciones-pendientes'] });
      setProcessingId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al aprobar');
      setProcessingId(null);
    },
  });

  // Mutation para rechazar
  const rechazarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      solicitudesService.rechazarSolicitud(id, usuario!.id, motivo),
    onSuccess: () => {
      toast.success('Solicitud rechazada');
      queryClient.invalidateQueries({ queryKey: ['aprobaciones-pendientes'] });
      setProcessingId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al rechazar');
      setProcessingId(null);
    },
  });

  const handleAprobar = (id: string, comentario?: string) => {
    setProcessingId(id);
    aprobarMutation.mutate({ id, comentario });
  };

  const handleRechazar = (id: string, motivo: string) => {
    setProcessingId(id);
    rechazarMutation.mutate({ id, motivo });
  };

  // Filtrar por prioridad
  const solicitudesFiltradas = solicitudes.filter(
    sol => !filtroPrioridad || sol.prioridad === filtroPrioridad
  );

  // Estadísticas
  const stats = {
    total: solicitudes.length,
    criticas: solicitudes.filter(s => s.prioridad === 'critica').length,
    urgentes: solicitudes.filter(s => s.prioridad === 'urgente').length,
    montoTotal: solicitudes.reduce((sum, s) => sum + s.monto_estimado, 0),
  };

  if (!usuario?.puede_aprobar) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-yellow-900">Acceso Restringido</h2>
            <p className="text-yellow-700 mt-2">
              No tienes permisos para aprobar solicitudes de compra.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Aprobaciones Pendientes</h1>
          <p className="text-gray-500">
            Solicitudes que requieren tu aprobación
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Pendientes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.criticas}</p>
                <p className="text-xs text-gray-500">Críticas</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.urgentes}</p>
                <p className="text-xs text-gray-500">Urgentes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${(stats.montoTotal / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-500">Monto Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtro de prioridad */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-2">
            <button
              onClick={() => setFiltroPrioridad('')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                !filtroPrioridad
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {Object.entries(prioridadConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setFiltroPrioridad(key as PrioridadSolicitud)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filtroPrioridad === key
                    ? 'bg-blue-600 text-white'
                    : `${config.bgColor} ${config.color} hover:opacity-80`
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de solicitudes */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-red-900">Error al cargar</h2>
            <p className="text-red-600 mt-2">Por favor, intenta nuevamente.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              ¡Todo al día!
            </h2>
            <p className="text-gray-500">
              No hay solicitudes pendientes de tu aprobación
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {solicitudesFiltradas.map((solicitud) => (
              <SolicitudAprobacionCard
                key={solicitud.id}
                solicitud={solicitud}
                onAprobar={handleAprobar}
                onRechazar={handleRechazar}
                isProcessing={processingId === solicitud.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AprobacionesPage;
