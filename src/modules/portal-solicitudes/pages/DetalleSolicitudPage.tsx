/**
 * Página de detalle de solicitud
 * Muestra información completa y permite seguimiento
 */

import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortalHeader } from '../components/PortalHeader';
import { usePortalAuth } from '../context/PortalAuthContext';
import { solicitudesService } from '../services/solicitudesService';
import { EstadoSolicitud, HistorialSolicitud } from '../types';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Edit,
  Trash2,
  MessageSquare,
  Package,
  Building,
  Target,
  Loader2,
  ExternalLink
} from 'lucide-react';

// Configuración de estados
const estadoConfig: Record<EstadoSolicitud, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ElementType;
}> = {
  borrador: { label: 'Borrador', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: FileText },
  enviada: { label: 'Enviada', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Send },
  en_revision: { label: 'En Revisión', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Clock },
  aprobada: { label: 'Aprobada', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  rechazada: { label: 'Rechazada', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
  en_cotizacion: { label: 'En Cotización', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: DollarSign },
  orden_generada: { label: 'Orden Generada', color: 'text-indigo-600', bgColor: 'bg-indigo-100', icon: FileText },
  recibida: { label: 'Recibida', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: Package },
  cerrada: { label: 'Cerrada', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: CheckCircle },
};

// Badge de estado
const EstadoBadge: React.FC<{ estado: EstadoSolicitud }> = ({ estado }) => {
  const config = estadoConfig[estado];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
};

export const DetalleSolicitudPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { usuario } = usePortalAuth();
  const [nuevoComentario, setNuevoComentario] = useState('');

  // Query para la solicitud
  const { data: solicitud, isLoading, error } = useQuery({
    queryKey: ['solicitud', id],
    queryFn: () => solicitudesService.fetchSolicitud(id!),
    enabled: !!id,
  });

  // Query para el historial
  const { data: historial = [] } = useQuery({
    queryKey: ['historial-solicitud', id],
    queryFn: () => solicitudesService.getHistorial(id!),
    enabled: !!id,
  });

  // Mutation para enviar solicitud
  const enviarMutation = useMutation({
    mutationFn: () => solicitudesService.enviarSolicitud(id!),
    onSuccess: () => {
      toast.success('Solicitud enviada correctamente');
      queryClient.invalidateQueries({ queryKey: ['solicitud', id] });
      queryClient.invalidateQueries({ queryKey: ['historial-solicitud', id] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al enviar solicitud');
    },
  });

  // Mutation para cancelar
  const cancelarMutation = useMutation({
    mutationFn: () => solicitudesService.cancelarSolicitud(id!),
    onSuccess: () => {
      toast.success('Solicitud cancelada');
      navigate('/portal/solicitudes');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al cancelar');
    },
  });

  // Mutation para agregar comentario
  const comentarioMutation = useMutation({
    mutationFn: (comentario: string) => 
      solicitudesService.agregarComentario(id!, usuario!.id, comentario),
    onSuccess: () => {
      toast.success('Comentario agregado');
      setNuevoComentario('');
      queryClient.invalidateQueries({ queryKey: ['historial-solicitud', id] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al agregar comentario');
    },
  });

  const handleEnviar = () => {
    if (confirm('¿Está seguro de enviar esta solicitud? Una vez enviada, pasará al proceso de aprobación.')) {
      enviarMutation.mutate();
    }
  };

  const handleCancelar = () => {
    if (confirm('¿Está seguro de cancelar esta solicitud? Esta acción no se puede deshacer.')) {
      cancelarMutation.mutate();
    }
  };

  const handleAgregarComentario = (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoComentario.trim()) {
      comentarioMutation.mutate(nuevoComentario.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error || !solicitud) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-red-900">Solicitud no encontrada</h2>
            <p className="text-red-600 mt-2">La solicitud que buscas no existe o no tienes acceso.</p>
            <Link
              to="/portal/solicitudes"
              className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a mis solicitudes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const puedeEditar = solicitud.estado === 'borrador';
  const puedeEnviar = solicitud.estado === 'borrador' && solicitud.items && solicitud.items.length > 0;
  const puedeCancelar = ['borrador', 'enviada', 'en_revision'].includes(solicitud.estado);

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb y acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {solicitud.numero_solicitud}
              </h1>
              <p className="text-sm text-gray-500">
                Creada el {new Date(solicitud.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <EstadoBadge estado={solicitud.estado} />
            
            {puedeEditar && (
              <Link
                to={`/portal/solicitudes/${id}/editar`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                Editar
              </Link>
            )}
            
            {puedeEnviar && (
              <button
                onClick={handleEnviar}
                disabled={enviarMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {enviarMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Enviar
              </button>
            )}
            
            {puedeCancelar && (
              <button
                onClick={handleCancelar}
                disabled={cancelarMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información general */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Destino</p>
                    <p className="font-medium text-gray-900 capitalize">{solicitud.tipo_destino}</p>
                    {solicitud.proyecto && (
                      <p className="text-sm text-blue-600">{solicitud.proyecto.nombre}</p>
                    )}
                    {solicitud.evento && (
                      <p className="text-sm text-purple-600">{solicitud.evento.nombre}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Monto Estimado</p>
                    <p className="font-medium text-gray-900">
                      ${solicitud.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400">Nivel de aprobación: {solicitud.nivel_aprobacion_requerido}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha Requerida</p>
                    <p className="font-medium text-gray-900">
                      {new Date(solicitud.fecha_requerida).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    solicitud.prioridad === 'critica' ? 'bg-red-50' :
                    solicitud.prioridad === 'urgente' ? 'bg-orange-50' : 'bg-gray-50'
                  }`}>
                    <AlertCircle className={`w-5 h-5 ${
                      solicitud.prioridad === 'critica' ? 'text-red-600' :
                      solicitud.prioridad === 'urgente' ? 'text-orange-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prioridad</p>
                    <p className={`font-medium capitalize ${
                      solicitud.prioridad === 'critica' ? 'text-red-600' :
                      solicitud.prioridad === 'urgente' ? 'text-orange-600' : 'text-gray-900'
                    }`}>
                      {solicitud.prioridad}
                    </p>
                  </div>
                </div>
              </div>

              {/* Justificación */}
              {solicitud.justificacion && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Justificación</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{solicitud.justificacion}</p>
                </div>
              )}

              {solicitud.impacto_no_compra && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Impacto de no realizar la compra</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{solicitud.impacto_no_compra}</p>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Items Solicitados ({solicitud.items?.length || 0})
              </h2>

              {solicitud.items && solicitud.items.length > 0 ? (
                <div className="space-y-4">
                  {solicitud.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-gray-900">{item.descripcion}</h4>
                          </div>
                          
                          {item.especificaciones && (
                            <p className="mt-2 text-sm text-gray-600">{item.especificaciones}</p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-4 text-sm">
                            <span className="text-gray-500">
                              Cantidad: <strong className="text-gray-700">{item.cantidad} {item.unidad_medida}</strong>
                            </span>
                            {item.precio_referencia && (
                              <span className="text-gray-500">
                                Precio ref: <strong className="text-gray-700">${item.precio_referencia.toLocaleString('es-MX')}</strong>
                              </span>
                            )}
                            {item.proveedor_sugerido && (
                              <span className="text-gray-500">
                                Proveedor: <strong className="text-gray-700">{item.proveedor_sugerido}</strong>
                              </span>
                            )}
                          </div>

                          {item.url_referencia && (
                            <a
                              href={item.url_referencia}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ver referencia
                            </a>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            ${((item.precio_referencia || 0) * item.cantidad).toLocaleString('es-MX')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Estimado</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${solicitud.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay items en esta solicitud</p>
                </div>
              )}
            </div>

            {/* Comentarios */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <MessageSquare className="w-5 h-5 inline-block mr-2 text-gray-400" />
                Comentarios
              </h2>

              {/* Formulario de comentario */}
              <form onSubmit={handleAgregarComentario} className="mb-6">
                <textarea
                  value={nuevoComentario}
                  onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder="Agregar un comentario..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!nuevoComentario.trim() || comentarioMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {comentarioMutation.isPending ? 'Enviando...' : 'Comentar'}
                  </button>
                </div>
              </form>

              {/* Lista de comentarios del historial */}
              {historial.filter(h => h.comentarios).length > 0 ? (
                <div className="space-y-4">
                  {historial
                    .filter(h => h.comentarios)
                    .map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">
                              {item.usuario?.nombre_completo || 'Usuario'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(item.created_at).toLocaleString('es-MX')}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-1">{item.comentarios}</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No hay comentarios aún</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Flujo de aprobación */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Flujo de Aprobación</h2>

              {solicitud.aprobaciones && solicitud.aprobaciones.length > 0 ? (
                <div className="space-y-4">
                  {solicitud.aprobaciones.map((aprobacion, index) => (
                    <div key={aprobacion.id} className="relative">
                      {index < (solicitud.aprobaciones?.length || 0) - 1 && (
                        <div className="absolute left-4 top-10 w-0.5 h-full bg-gray-200" />
                      )}
                      
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          aprobacion.estado === 'aprobado' ? 'bg-green-100' :
                          aprobacion.estado === 'rechazado' ? 'bg-red-100' :
                          'bg-gray-100'
                        }`}>
                          {aprobacion.estado === 'aprobado' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : aprobacion.estado === 'rechazado' ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        
                        <div>
                          <p className="font-medium text-gray-900">Nivel {aprobacion.nivel}</p>
                          <p className="text-sm text-gray-500">{aprobacion.rol_requerido}</p>
                          
                          {aprobacion.aprobador && (
                            <p className="text-sm text-gray-600 mt-1">
                              {aprobacion.aprobador.nombre_completo}
                            </p>
                          )}
                          
                          {aprobacion.fecha_decision && (
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(aprobacion.fecha_decision).toLocaleString('es-MX')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Pendiente de envío</p>
                </div>
              )}
            </div>

            {/* Historial */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial</h2>

              {historial.length > 0 ? (
                <div className="space-y-4">
                  {historial.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 mt-2 bg-blue-400 rounded-full flex-shrink-0" />
                      <div>
                        <p className="text-gray-900">
                          <span className="capitalize">{item.accion.replace('_', ' ')}</span>
                          {item.estado_anterior && item.estado_nuevo && (
                            <span className="text-gray-500">
                              : {item.estado_anterior} → {item.estado_nuevo}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleString('es-MX')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4 text-sm">Sin historial</p>
              )}
            </div>

            {/* Solicitante */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Solicitante</h2>
              
              <div className="flex items-center gap-3">
                {solicitud.solicitante?.avatar_url ? (
                  <img
                    src={solicitud.solicitante.avatar_url}
                    alt={solicitud.solicitante.nombre_completo}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {solicitud.solicitante?.nombre_completo}
                  </p>
                  <p className="text-sm text-gray-500">
                    {solicitud.solicitante?.departamento}
                  </p>
                  <p className="text-xs text-gray-400">
                    {solicitud.solicitante?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DetalleSolicitudPage;
