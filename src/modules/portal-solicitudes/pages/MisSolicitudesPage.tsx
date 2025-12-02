/**
 * Página de mis solicitudes
 * Lista todas las solicitudes del usuario con filtros
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PortalHeader } from '../components/PortalHeader';
import { usePortalAuth } from '../context/PortalAuthContext';
import { solicitudesService } from '../services/solicitudesService';
import { EstadoSolicitud, PrioridadSolicitud } from '../types';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Package,
  ChevronRight,
  Loader2,
  Eye
} from 'lucide-react';

// Configuración de estados
const estadoConfig: Record<EstadoSolicitud, { 
  label: string; 
  color: string; 
  bgColor: string;
}> = {
  borrador: { label: 'Borrador', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  enviada: { label: 'Enviada', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  en_revision: { label: 'En Revisión', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  aprobada: { label: 'Aprobada', color: 'text-green-600', bgColor: 'bg-green-100' },
  rechazada: { label: 'Rechazada', color: 'text-red-600', bgColor: 'bg-red-100' },
  en_cotizacion: { label: 'En Cotización', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  orden_generada: { label: 'Orden Generada', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  recibida: { label: 'Recibida', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  cerrada: { label: 'Cerrada', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

const prioridadConfig: Record<PrioridadSolicitud, { 
  label: string; 
  color: string; 
  bgColor: string;
}> = {
  normal: { label: 'Normal', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  urgente: { label: 'Urgente', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critica: { label: 'Crítica', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export const MisSolicitudesPage: React.FC = () => {
  const { usuario } = usePortalAuth();
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitud | ''>('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<PrioridadSolicitud | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Query para las solicitudes
  const { data: solicitudes = [], isLoading, error } = useQuery({
    queryKey: ['mis-solicitudes', usuario?.id, filtroEstado],
    queryFn: () => solicitudesService.fetchMisSolicitudes(
      usuario!.id,
      filtroEstado || undefined
    ),
    enabled: !!usuario?.id,
  });

  // Filtrar localmente por búsqueda y prioridad
  const solicitudesFiltradas = solicitudes.filter(sol => {
    const matchBusqueda = !busqueda || 
      sol.numero_solicitud.toLowerCase().includes(busqueda.toLowerCase()) ||
      sol.justificacion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      sol.proyecto?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      sol.evento?.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchPrioridad = !filtroPrioridad || sol.prioridad === filtroPrioridad;

    return matchBusqueda && matchPrioridad;
  });

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('');
    setFiltroPrioridad('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Solicitudes</h1>
            <p className="text-gray-500">
              {solicitudesFiltradas.length} solicitud{solicitudesFiltradas.length !== 1 ? 'es' : ''}
            </p>
          </div>

          <Link
            to="/portal/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nueva Solicitud
          </Link>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por número, proyecto, evento..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro de estado */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoSolicitud | '')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              {Object.entries(estadoConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Filtro de prioridad */}
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value as PrioridadSolicitud | '')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las prioridades</option>
              {Object.entries(prioridadConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Limpiar filtros */}
            {(busqueda || filtroEstado || filtroPrioridad) && (
              <button
                onClick={limpiarFiltros}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Limpiar
              </button>
            )}
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
            <h2 className="text-lg font-medium text-red-900">Error al cargar solicitudes</h2>
            <p className="text-red-600 mt-2">Por favor, intenta nuevamente.</p>
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              {solicitudes.length === 0 ? 'No tienes solicitudes' : 'Sin resultados'}
            </h2>
            <p className="text-gray-500 mb-6">
              {solicitudes.length === 0 
                ? 'Comienza creando tu primera solicitud de compra'
                : 'No hay solicitudes que coincidan con los filtros'}
            </p>
            {solicitudes.length === 0 && (
              <Link
                to="/portal/nueva"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Crear Primera Solicitud
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {solicitudesFiltradas.map((solicitud) => {
              const estadoConf = estadoConfig[solicitud.estado];
              const prioridadConf = prioridadConfig[solicitud.prioridad];

              return (
                <Link
                  key={solicitud.id}
                  to={`/portal/solicitudes/${solicitud.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition-all group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-semibold text-gray-900">
                          {solicitud.numero_solicitud}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoConf.bgColor} ${estadoConf.color}`}>
                          {estadoConf.label}
                        </span>
                        {solicitud.prioridad !== 'normal' && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${prioridadConf.bgColor} ${prioridadConf.color}`}>
                            {prioridadConf.label}
                          </span>
                        )}
                      </div>

                      {/* Destino */}
                      <p className="text-gray-600 mb-2">
                        {solicitud.tipo_destino === 'proyecto' && solicitud.proyecto && (
                          <span className="flex items-center gap-1">
                            <span className="text-gray-400">Proyecto:</span>
                            <span className="font-medium">{solicitud.proyecto.nombre}</span>
                          </span>
                        )}
                        {solicitud.tipo_destino === 'evento' && solicitud.evento && (
                          <span className="flex items-center gap-1">
                            <span className="text-gray-400">Evento:</span>
                            <span className="font-medium">{solicitud.evento.nombre}</span>
                          </span>
                        )}
                        {solicitud.tipo_destino === 'operativo' && (
                          <span className="text-gray-500">Gastos operativos</span>
                        )}
                        {solicitud.tipo_destino === 'stock' && (
                          <span className="text-gray-500">Reposición de stock</span>
                        )}
                      </p>

                      {/* Justificación resumida */}
                      {solicitud.justificacion && (
                        <p className="text-sm text-gray-500 truncate max-w-xl">
                          {solicitud.justificacion}
                        </p>
                      )}
                    </div>

                    {/* Metadatos */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Package className="w-4 h-4" />
                        <span>{solicitud.items?.length || 0} items</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-500">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-medium text-gray-900">
                          ${solicitud.monto_estimado.toLocaleString('es-MX')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(solicitud.fecha_requerida).toLocaleDateString('es-MX', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors hidden lg:block" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Resumen por estados */}
        {!isLoading && solicitudes.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Resumen por Estado</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(estadoConfig).map(([estado, config]) => {
                const count = solicitudes.filter(s => s.estado === estado).length;
                if (count === 0) return null;
                
                return (
                  <button
                    key={estado}
                    onClick={() => setFiltroEstado(estado as EstadoSolicitud)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      filtroEstado === estado
                        ? 'bg-blue-600 text-white'
                        : `${config.bgColor} ${config.color} hover:opacity-80`
                    }`}
                  >
                    {config.label}
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      filtroEstado === estado ? 'bg-blue-500' : 'bg-white/50'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MisSolicitudesPage;
