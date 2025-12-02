/**
 * Página de Reportes de Gastos
 * Análisis por tipo de gasto, evento, departamento
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PortalHeader } from '../components/PortalHeader';
import { usePortalAuth } from '../context/PortalAuthContext';
import { reportesService } from '../services/reportesService';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Building,
  Calendar,
  Filter,
  Download,
  Loader2,
  FileText,
  Target,
  Package
} from 'lucide-react';

type TipoReporte = 'tipo_gasto' | 'evento' | 'departamento' | 'resumen';

export const ReportesGastosPage: React.FC = () => {
  const { usuario } = usePortalAuth();
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('resumen');
  const [periodoInicio, setPeriodoInicio] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [periodoFin, setPeriodoFin] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Query para resumen general
  const { data: resumen, isLoading: loadingResumen } = useQuery({
    queryKey: ['reporte-resumen', usuario?.empresa_id, periodoInicio, periodoFin],
    queryFn: () => reportesService.resumenGeneralGastos(
      usuario!.empresa_id,
      { inicio: periodoInicio, fin: periodoFin }
    ),
    enabled: !!usuario?.empresa_id && tipoReporte === 'resumen',
  });

  // Query para reporte por tipo de gasto
  const { data: reportePorTipo = [], isLoading: loadingTipo } = useQuery({
    queryKey: ['reporte-por-tipo', usuario?.empresa_id, periodoInicio, periodoFin],
    queryFn: () => reportesService.reporteGastosPorTipo(
      usuario!.empresa_id,
      { fechaInicio: periodoInicio, fechaFin: periodoFin }
    ),
    enabled: !!usuario?.empresa_id && tipoReporte === 'tipo_gasto',
  });

  // Query para reporte por evento
  const { data: reportePorEvento = [], isLoading: loadingEvento } = useQuery({
    queryKey: ['reporte-por-evento', usuario?.empresa_id, periodoInicio, periodoFin],
    queryFn: () => reportesService.reporteGastosPorEvento(
      usuario!.empresa_id,
      { fechaInicio: periodoInicio, fechaFin: periodoFin }
    ),
    enabled: !!usuario?.empresa_id && tipoReporte === 'evento',
  });

  // Query para reporte por departamento
  const { data: reportePorDepto = [], isLoading: loadingDepto } = useQuery({
    queryKey: ['reporte-por-depto', usuario?.empresa_id, periodoInicio, periodoFin],
    queryFn: () => reportesService.reporteGastosPorDepartamento(
      usuario!.empresa_id,
      { fechaInicio: periodoInicio, fechaFin: periodoFin }
    ),
    enabled: !!usuario?.empresa_id && tipoReporte === 'departamento',
  });

  // Query para top departamentos
  const { data: topDeptos = [] } = useQuery({
    queryKey: ['top-departamentos', usuario?.empresa_id],
    queryFn: () => reportesService.topDepartamentosPorGasto(usuario!.empresa_id, 5),
    enabled: !!usuario?.empresa_id && tipoReporte === 'resumen',
  });

  const formatMonto = (monto: number) => 
    `$${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const isLoading = loadingResumen || loadingTipo || loadingEvento || loadingDepto;

  // Agrupar datos por mes para gráficos
  const agruparPorMes = (data: any[]) => {
    const meses = new Map<string, number>();
    data.forEach(item => {
      const mes = item.mes?.substring(0, 7) || 'Sin fecha';
      meses.set(mes, (meses.get(mes) || 0) + item.monto_total_estimado);
    });
    return Array.from(meses.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes de Gastos</h1>
            <p className="text-gray-500">Análisis y seguimiento de solicitudes de compra</p>
          </div>
          
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Tipo de reporte */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Reporte
              </label>
              <select
                value={tipoReporte}
                onChange={(e) => setTipoReporte(e.target.value as TipoReporte)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="resumen">Resumen General</option>
                <option value="tipo_gasto">Por Tipo de Gasto</option>
                <option value="evento">Por Evento</option>
                <option value="departamento">Por Departamento</option>
              </select>
            </div>

            {/* Periodo */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={periodoFin}
                onChange={(e) => setPeriodoFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* RESUMEN GENERAL */}
            {tipoReporte === 'resumen' && resumen && (
              <div className="space-y-6">
                {/* KPIs principales */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900">{resumen.total_solicitudes}</p>
                        <p className="text-sm text-gray-500">Total Solicitudes</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatMonto(resumen.monto_total_estimado)}
                        </p>
                        <p className="text-sm text-gray-500">Monto Estimado</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-100 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatMonto(resumen.monto_total_aprobado)}
                        </p>
                        <p className="text-sm text-gray-500">Monto Aprobado</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-100 rounded-xl">
                        <Calendar className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900">
                          {resumen.promedio_tiempo_aprobacion_dias.toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-500">Días Promedio Aprobación</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distribución por estado */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Estado</h3>
                    <div className="space-y-3">
                      {Object.entries(resumen.por_estado).map(([estado, cantidad]) => {
                        const porcentaje = (cantidad / resumen.total_solicitudes * 100).toFixed(1);
                        const colores: Record<string, string> = {
                          aprobada: 'bg-green-500',
                          rechazada: 'bg-red-500',
                          enviada: 'bg-blue-500',
                          en_revision: 'bg-yellow-500',
                          recibida: 'bg-emerald-500',
                          cerrada: 'bg-gray-500',
                        };
                        return (
                          <div key={estado}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="capitalize text-gray-600">{estado.replace('_', ' ')}</span>
                              <span className="font-medium">{cantidad} ({porcentaje}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${colores[estado] || 'bg-gray-400'}`}
                                style={{ width: `${porcentaje}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Departamentos por Gasto</h3>
                    <div className="space-y-4">
                      {topDeptos.map((depto, index) => (
                        <div key={depto.departamento} className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-400' :
                            'bg-blue-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-900">{depto.departamento}</span>
                              <span className="text-gray-500">{formatMonto(depto.monto)}</span>
                            </div>
                            <p className="text-xs text-gray-400">{depto.cantidad} solicitudes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* REPORTE POR TIPO DE GASTO */}
            {tipoReporte === 'tipo_gasto' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Gastos por Tipo</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de Gasto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solicitudes</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estimado</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aprobado</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aprobadas</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rechazadas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportePorTipo.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{item.tipo_gasto_nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.categoria === 'operativo' ? 'bg-blue-100 text-blue-700' :
                              item.categoria === 'inversion' ? 'bg-purple-100 text-purple-700' :
                              item.categoria === 'proyecto' ? 'bg-green-100 text-green-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {item.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{item.cantidad_solicitudes}</td>
                          <td className="px-4 py-3 text-right">{formatMonto(item.monto_total_estimado)}</td>
                          <td className="px-4 py-3 text-right text-green-600">{formatMonto(item.monto_total_aprobado)}</td>
                          <td className="px-4 py-3 text-right text-green-600">{item.aprobadas}</td>
                          <td className="px-4 py-3 text-right text-red-600">{item.rechazadas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REPORTE POR EVENTO */}
            {tipoReporte === 'evento' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Gastos por Evento</h3>
                </div>
                {reportePorEvento.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay solicitudes asociadas a eventos en este período</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fechas</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solicitudes</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estimado</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aprobado</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completadas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportePorEvento.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-900">{item.evento_nombre}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.fecha_inicio && new Date(item.fecha_inicio).toLocaleDateString('es-MX')}
                              {item.fecha_fin && ` - ${new Date(item.fecha_fin).toLocaleDateString('es-MX')}`}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{item.cantidad_solicitudes}</td>
                            <td className="px-4 py-3 text-right">{formatMonto(item.monto_total_estimado)}</td>
                            <td className="px-4 py-3 text-right text-green-600">{formatMonto(item.monto_total_aprobado)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                                {item.completadas}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* REPORTE POR DEPARTAMENTO */}
            {tipoReporte === 'departamento' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Gastos por Departamento</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centro Costos</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solicitudes</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estimado</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aprobado</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Aprobación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportePorDepto.map((item, index) => {
                        const total = item.aprobadas + item.rechazadas;
                        const porcentajeAprobacion = total > 0 ? (item.aprobadas / total * 100).toFixed(0) : '-';
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-900">{item.departamento_nombre}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.centro_costos || '-'}</td>
                            <td className="px-4 py-3 text-right font-medium">{item.cantidad_solicitudes}</td>
                            <td className="px-4 py-3 text-right">{formatMonto(item.monto_total_estimado)}</td>
                            <td className="px-4 py-3 text-right text-green-600">{formatMonto(item.monto_total_aprobado)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                Number(porcentajeAprobacion) >= 80 ? 'bg-green-100 text-green-700' :
                                Number(porcentajeAprobacion) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {porcentajeAprobacion}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ReportesGastosPage;
