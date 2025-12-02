/**
 * Dashboard del Portal de Solicitudes
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  TrendingUp,
  Bell,
  LogOut,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { usePortalAuth } from '../context/PortalAuthContext';
import { fetchMisSolicitudes, getEstadisticasSolicitudes } from '../services/solicitudesService';
import { ESTADOS_CONFIG, PRIORIDADES_CONFIG } from '../types';

export const PortalDashboard: React.FC = () => {
  const { usuario, logout } = usePortalAuth();
  const navigate = useNavigate();

  // Obtener solicitudes recientes
  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['mis-solicitudes', usuario?.id],
    queryFn: () => fetchMisSolicitudes(usuario!.id),
    enabled: !!usuario?.id,
  });

  // Obtener estadísticas
  const { data: stats } = useQuery({
    queryKey: ['estadisticas-solicitudes', usuario?.id],
    queryFn: () => getEstadisticasSolicitudes(usuario!.id),
    enabled: !!usuario?.id,
  });

  // Solicitudes recientes (últimas 5)
  const solicitudesRecientes = useMemo(() => {
    return solicitudes.slice(0, 5);
  }, [solicitudes]);

  // Formatear moneda
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🏢</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-800">Portal de Solicitudes</h1>
                <p className="text-xs text-gray-500">Sistema de Compras</p>
              </div>
            </div>

            {/* Usuario */}
            <div className="flex items-center gap-4">
              {/* Notificaciones */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Perfil */}
              <div className="flex items-center gap-3">
                {usuario?.avatar_url ? (
                  <img
                    src={usuario.avatar_url}
                    alt={usuario.nombre_completo}
                    className="w-10 h-10 rounded-full border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {usuario?.nombre_completo?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-700">
                    {usuario?.nombre_completo}
                  </p>
                  <p className="text-xs text-gray-500">
                    {usuario?.departamento?.nombre || usuario?.puesto || usuario?.email}
                  </p>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Saludo y CTA */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            ¡Hola, {usuario?.nombre || usuario?.nombre_completo?.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-600">
            ¿Necesitas solicitar alguna compra hoy?
          </p>
        </div>

        {/* Botón principal */}
        <button
          onClick={() => navigate('/portal/nueva-solicitud')}
          className="w-full md:w-auto mb-8 flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <Plus size={24} />
          <span className="text-lg">Nueva Solicitud de Compra</span>
        </button>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats?.total || 0}</p>
                <p className="text-xs text-gray-500">Total solicitudes</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pendientes || 0}</p>
                <p className="text-xs text-gray-500">Pendientes</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats?.aprobadas || 0}</p>
                <p className="text-xs text-gray-500">Aprobadas</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">
                  {formatMoney(stats?.monto_total_aprobado || 0)}
                </p>
                <p className="text-xs text-gray-500">Monto aprobado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Solicitudes recientes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Mis Solicitudes Recientes</h3>
            <button
              onClick={() => navigate('/portal/mis-solicitudes')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver todas
              <ChevronRight size={16} />
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : solicitudesRecientes.length === 0 ? (
            <div className="p-8 text-center">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No tienes solicitudes aún</p>
              <button
                onClick={() => navigate('/portal/nueva-solicitud')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Crear tu primera solicitud
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {solicitudesRecientes.map((solicitud) => {
                const estadoConfig = ESTADOS_CONFIG[solicitud.estado];
                const prioridadConfig = PRIORIDADES_CONFIG[solicitud.prioridad];

                return (
                  <div
                    key={solicitud.id}
                    onClick={() => navigate(`/portal/solicitud/${solicitud.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800">
                            {solicitud.numero_solicitud}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: estadoConfig.bgColor,
                              color: estadoConfig.color,
                            }}
                          >
                            {estadoConfig.icon} {estadoConfig.label}
                          </span>
                          {solicitud.prioridad !== 'normal' && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: prioridadConfig.bgColor,
                                color: prioridadConfig.color,
                              }}
                            >
                              {prioridadConfig.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {solicitud.justificacion}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(solicitud.created_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {solicitud.proyecto && ` • ${(solicitud.proyecto as any).nombre}`}
                          {solicitud.evento && ` • ${(solicitud.evento as any).nombre_proyecto}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-800">
                          {formatMoney(solicitud.monto_estimado)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(solicitud.items as any)?.length || 0} items
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Acciones rápidas */}
        {usuario?.primer_acceso && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-start gap-3">
              <Settings className="text-blue-600 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-blue-800">
                  ¡Bienvenido al Portal de Solicitudes!
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Te recomendamos completar tu perfil con tu departamento y datos de contacto
                  para agilizar tus solicitudes.
                </p>
                <button
                  onClick={() => navigate('/portal/perfil')}
                  className="mt-2 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  Completar perfil →
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PortalDashboard;
