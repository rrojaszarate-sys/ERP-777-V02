/**
 * Página del Centro de Mensajes
 * Comunicación y seguimiento de solicitudes
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortalHeader } from '../components/PortalHeader';
import { usePortalAuth } from '../context/PortalAuthContext';
import { mensajesService } from '../services/mensajesService';
import { MensajePortal, NotificacionPortal } from '../types';
import toast from 'react-hot-toast';
import {
  Bell,
  MessageSquare,
  Mail,
  MailOpen,
  Star,
  Archive,
  Trash2,
  Send,
  Reply,
  ChevronRight,
  Clock,
  User,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Inbox,
  Filter
} from 'lucide-react';

type TabActiva = 'notificaciones' | 'mensajes' | 'enviados';

export const CentroMensajesPage: React.FC = () => {
  const { usuario } = usePortalAuth();
  const queryClient = useQueryClient();
  const [tabActiva, setTabActiva] = useState<TabActiva>('notificaciones');
  const [filtroMensajes, setFiltroMensajes] = useState<'todos' | 'noLeidos' | 'importantes'>('todos');
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState<MensajePortal | null>(null);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);

  // Queries
  const { data: notificaciones = [], isLoading: loadingNotificaciones } = useQuery({
    queryKey: ['notificaciones', usuario?.id],
    queryFn: () => mensajesService.fetchNotificaciones(usuario!.id),
    enabled: !!usuario?.id,
  });

  const { data: mensajes = [], isLoading: loadingMensajes } = useQuery({
    queryKey: ['mensajes', usuario?.id, filtroMensajes],
    queryFn: () => mensajesService.fetchMensajes(usuario!.id, {
      soloNoLeidos: filtroMensajes === 'noLeidos',
      soloImportantes: filtroMensajes === 'importantes',
    }),
    enabled: !!usuario?.id,
  });

  const { data: contadorNoLeidos = 0 } = useQuery({
    queryKey: ['mensajes-no-leidos', usuario?.id],
    queryFn: () => mensajesService.contarMensajesNoLeidos(usuario!.id),
    enabled: !!usuario?.id,
  });

  const { data: contadorNotificaciones = 0 } = useQuery({
    queryKey: ['notificaciones-no-leidas', usuario?.id],
    queryFn: () => mensajesService.contarNotificacionesNoLeidas(usuario!.id),
    enabled: !!usuario?.id,
  });

  // Mutations
  const marcarNotificacionLeidaMutation = useMutation({
    mutationFn: (id: number) => mensajesService.marcarNotificacionLeida(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-no-leidas'] });
    },
  });

  const marcarTodasLeidasMutation = useMutation({
    mutationFn: () => mensajesService.marcarTodasLeidas(usuario!.id),
    onSuccess: () => {
      toast.success('Todas las notificaciones marcadas como leídas');
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-no-leidas'] });
    },
  });

  const marcarMensajeLeidoMutation = useMutation({
    mutationFn: (id: number) => mensajesService.marcarMensajeLeido(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensajes'] });
      queryClient.invalidateQueries({ queryKey: ['mensajes-no-leidos'] });
    },
  });

  const toggleImportanteMutation = useMutation({
    mutationFn: (id: number) => mensajesService.toggleImportante(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensajes'] });
    },
  });

  const archivarMensajeMutation = useMutation({
    mutationFn: (id: number) => mensajesService.archivarMensaje(id),
    onSuccess: () => {
      toast.success('Mensaje archivado');
      setMensajeSeleccionado(null);
      queryClient.invalidateQueries({ queryKey: ['mensajes'] });
    },
  });

  const responderMensajeMutation = useMutation({
    mutationFn: ({ hiloId, mensaje }: { hiloId: number; mensaje: string }) =>
      mensajesService.responderMensaje(hiloId, usuario!.id, mensaje),
    onSuccess: () => {
      toast.success('Respuesta enviada');
      setRespuestaTexto('');
      queryClient.invalidateQueries({ queryKey: ['mensajes'] });
    },
    onError: () => {
      toast.error('Error al enviar respuesta');
    },
  });

  const handleSeleccionarMensaje = async (mensaje: MensajePortal) => {
    setMensajeSeleccionado(mensaje);
    if (!mensaje.leido) {
      marcarMensajeLeidoMutation.mutate(mensaje.id);
    }
  };

  const handleResponder = () => {
    if (!mensajeSeleccionado || !respuestaTexto.trim()) return;
    responderMensajeMutation.mutate({
      hiloId: mensajeSeleccionado.id,
      mensaje: respuestaTexto.trim(),
    });
  };

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;

  // Render de notificación
  const renderNotificacion = (notif: NotificacionPortal) => {
    const iconos: Record<string, React.ReactNode> = {
      aprobacion: <CheckCircle className="w-5 h-5 text-green-500" />,
      rechazo: <AlertCircle className="w-5 h-5 text-red-500" />,
      pendiente_aprobacion: <Clock className="w-5 h-5 text-orange-500" />,
      info: <Bell className="w-5 h-5 text-blue-500" />,
      exito: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    };

    return (
      <div
        key={notif.id}
        onClick={() => marcarNotificacionLeidaMutation.mutate(notif.id)}
        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
          !notif.leida ? 'bg-blue-50/50' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {iconos[notif.tipo] || <Bell className="w-5 h-5 text-gray-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${!notif.leida ? 'font-semibold' : 'font-medium'} text-gray-900`}>
              {notif.titulo}
            </p>
            {notif.mensaje && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notif.mensaje}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              {new Date(notif.created_at).toLocaleString('es-MX')}
            </p>
          </div>
          {!notif.leida && (
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
          )}
        </div>
      </div>
    );
  };

  // Render de mensaje en lista
  const renderMensajeLista = (mensaje: MensajePortal) => (
    <div
      key={mensaje.id}
      onClick={() => handleSeleccionarMensaje(mensaje)}
      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
        mensajeSeleccionado?.id === mensaje.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      } ${!mensaje.leido ? 'bg-yellow-50/30' : ''}`}
    >
      <div className="flex items-start gap-3">
        {mensaje.remitente?.avatar_url ? (
          <img
            src={mensaje.remitente.avatar_url}
            alt=""
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-blue-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${!mensaje.leido ? 'font-semibold' : 'font-medium'} text-gray-900`}>
              {mensaje.remitente?.nombre_completo}
            </span>
            {mensaje.importante && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
            {mensaje.solicitud && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {mensaje.solicitud.numero_solicitud}
              </span>
            )}
          </div>
          {mensaje.asunto && (
            <p className="text-sm font-medium text-gray-700 mt-0.5">{mensaje.asunto}</p>
          )}
          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{mensaje.mensaje}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(mensaje.created_at).toLocaleString('es-MX')}
          </p>
        </div>
        {!mensaje.leido && (
          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Centro de Mensajes</h1>
            <p className="text-gray-500">Notificaciones y comunicación sobre tus solicitudes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel izquierdo - Lista */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setTabActiva('notificaciones')}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                  tabActiva === 'notificaciones'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bell className="w-4 h-4" />
                Notificaciones
                {contadorNotificaciones > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {contadorNotificaciones}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTabActiva('mensajes')}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                  tabActiva === 'mensajes'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Mensajes
                {contadorNoLeidos > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {contadorNoLeidos}
                  </span>
                )}
              </button>
            </div>

            {/* Filtros para mensajes */}
            {tabActiva === 'mensajes' && (
              <div className="p-3 border-b border-gray-100 flex gap-2">
                <button
                  onClick={() => setFiltroMensajes('todos')}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filtroMensajes === 'todos'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroMensajes('noLeidos')}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filtroMensajes === 'noLeidos'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  No leídos
                </button>
                <button
                  onClick={() => setFiltroMensajes('importantes')}
                  className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                    filtroMensajes === 'importantes'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Star className="w-3 h-3" />
                  Importantes
                </button>
              </div>
            )}

            {/* Acciones para notificaciones */}
            {tabActiva === 'notificaciones' && notificacionesNoLeidas > 0 && (
              <div className="p-3 border-b border-gray-100">
                <button
                  onClick={() => marcarTodasLeidasMutation.mutate()}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Marcar todas como leídas
                </button>
              </div>
            )}

            {/* Lista */}
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
              {tabActiva === 'notificaciones' && (
                loadingNotificaciones ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : notificaciones.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No tienes notificaciones</p>
                  </div>
                ) : (
                  notificaciones.map(renderNotificacion)
                )
              )}

              {tabActiva === 'mensajes' && (
                loadingMensajes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay mensajes</p>
                  </div>
                ) : (
                  mensajes.map(renderMensajeLista)
                )
              )}
            </div>
          </div>

          {/* Panel derecho - Detalle */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {mensajeSeleccionado ? (
              <div className="flex flex-col h-full">
                {/* Header del mensaje */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {mensajeSeleccionado.remitente?.avatar_url ? (
                        <img
                          src={mensajeSeleccionado.remitente.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {mensajeSeleccionado.remitente?.nombre_completo}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {mensajeSeleccionado.remitente?.email}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(mensajeSeleccionado.created_at).toLocaleString('es-MX')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleImportanteMutation.mutate(mensajeSeleccionado.id)}
                        className={`p-2 rounded-lg hover:bg-gray-100 ${
                          mensajeSeleccionado.importante ? 'text-yellow-500' : 'text-gray-400'
                        }`}
                        title={mensajeSeleccionado.importante ? 'Quitar de importantes' : 'Marcar como importante'}
                      >
                        <Star className={`w-5 h-5 ${mensajeSeleccionado.importante ? 'fill-yellow-500' : ''}`} />
                      </button>
                      <button
                        onClick={() => archivarMensajeMutation.mutate(mensajeSeleccionado.id)}
                        className="p-2 text-gray-400 rounded-lg hover:bg-gray-100 hover:text-gray-600"
                        title="Archivar"
                      >
                        <Archive className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setMensajeSeleccionado(null)}
                        className="p-2 text-gray-400 rounded-lg hover:bg-gray-100 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {mensajeSeleccionado.solicitud && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Solicitud: <strong>{mensajeSeleccionado.solicitud.numero_solicitud}</strong>
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Contenido del mensaje */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {mensajeSeleccionado.asunto && (
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      {mensajeSeleccionado.asunto}
                    </h4>
                  )}
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {mensajeSeleccionado.mensaje}
                  </p>

                  {/* Respuestas */}
                  {mensajeSeleccionado.respuestas && mensajeSeleccionado.respuestas.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h5 className="text-sm font-medium text-gray-500 border-t pt-4">
                        Respuestas ({mensajeSeleccionado.respuestas.length})
                      </h5>
                      {mensajeSeleccionado.respuestas.map((resp: any) => (
                        <div key={resp.id} className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                          {resp.remitente?.avatar_url ? (
                            <img src={resp.remitente.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {resp.remitente?.nombre_completo}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(resp.created_at).toLocaleString('es-MX')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{resp.mensaje}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formulario de respuesta */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex gap-3">
                    <textarea
                      value={respuestaTexto}
                      onChange={(e) => setRespuestaTexto(e.target.value)}
                      placeholder="Escribe una respuesta..."
                      rows={2}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleResponder}
                      disabled={!respuestaTexto.trim() || responderMensajeMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {responderMensajeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Responder
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                <Mail className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-lg">Selecciona un mensaje para ver el detalle</p>
                <p className="text-sm text-gray-400 mt-2">
                  O revisa tus notificaciones en el panel izquierdo
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CentroMensajesPage;
