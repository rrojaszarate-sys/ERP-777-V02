import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { PortfolioFinancialSummary as PortfolioSummary } from '../../types/Event';

interface PortfolioFinancialSummaryProps {
  summary: PortfolioSummary;
}

/**
 * Componente de Resumen Financiero del Portafolio de Eventos
 */
export const PortfolioFinancialSummaryComponent: React.FC<PortfolioFinancialSummaryProps> = ({ summary }) => {

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getDeviationColor = (deviation: number) => {
    const abs = Math.abs(deviation);
    if (abs > 20) return 'text-red-600';
    if (abs > 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getDeviationIcon = (deviation: number) => {
    return deviation >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />;
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color = 'blue',
    trend
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <div className={`bg-white rounded-lg shadow-md p-5 border-l-4 border-${color}-500`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-600">{title}</h4>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
      <p className={`text-2xl font-bold text-${color}-700 mb-1`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 flex items-center">
          {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1 text-green-500" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1 text-red-500" />}
          {subtitle}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2 flex items-center">
          <BarChart3 className="w-8 h-8 mr-3" />
          Resumen Financiero del Portafolio
        </h2>
        <p className="text-purple-100">
          Análisis consolidado de {summary.total_eventos} eventos
        </p>
      </div>

      {/* Totales Generales */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Totales Generales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Ingresos */}
          <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-green-500">
            <h4 className="text-sm font-medium text-gray-600 mb-3">Ingresos</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 line-through">Estimado</span>
                <span className="text-sm font-semibold text-blue-600">
                  {formatCurrency(summary.total_ingresos_estimados)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Real</span>
                <span className="text-lg font-bold text-green-700">
                  {formatCurrency(summary.total_ingresos_reales)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                {getDeviationIcon(summary.desviacion_ingresos)}
                <span className={`text-sm font-semibold ${getDeviationColor(summary.desviacion_ingresos)}`}>
                  {summary.desviacion_ingresos > 0 ? '+' : ''}
                  {formatPercentage(summary.desviacion_ingresos)}
                </span>
              </div>
            </div>
          </div>

          {/* Gastos */}
          <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-orange-500">
            <h4 className="text-sm font-medium text-gray-600 mb-3">Gastos</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Provisiones</span>
                <span className="text-sm font-semibold text-blue-600">
                  {formatCurrency(summary.total_provisiones)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Pagado</span>
                <span className="text-lg font-bold text-orange-700">
                  {formatCurrency(summary.total_gastos_pagados)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                {getDeviationIcon(summary.desviacion_gastos)}
                <span className={`text-sm font-semibold ${getDeviationColor(-summary.desviacion_gastos)}`}>
                  {summary.desviacion_gastos > 0 ? '+' : ''}
                  {formatPercentage(summary.desviacion_gastos)}
                </span>
              </div>
            </div>
          </div>

          {/* Utilidad */}
          <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-purple-500">
            <h4 className="text-sm font-medium text-gray-600 mb-3">Utilidad</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Estimada</span>
                <span className="text-sm font-semibold text-blue-600">
                  {formatCurrency(summary.total_utilidad_estimada)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Real</span>
                <span className="text-lg font-bold text-purple-700">
                  {formatCurrency(summary.total_utilidad_real)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                {getDeviationIcon(summary.desviacion_utilidad)}
                <span className={`text-sm font-semibold ${getDeviationColor(summary.desviacion_utilidad)}`}>
                  {summary.desviacion_utilidad > 0 ? '+' : ''}
                  {formatPercentage(summary.desviacion_utilidad)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Márgenes Promedio */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Márgenes Promedio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <StatCard
            title="Margen Estimado Promedio"
            value={formatPercentage(summary.promedio_margen_estimado)}
            icon={Target}
            color="blue"
            subtitle="Proyección inicial"
          />

          <StatCard
            title="Margen Real Promedio"
            value={formatPercentage(summary.promedio_margen_real)}
            icon={DollarSign}
            color={summary.promedio_margen_real >= 35 ? 'green' : 'red'}
            subtitle={summary.promedio_margen_real >= 35 ? 'Objetivo alcanzado' : 'Por debajo del objetivo (35%)'}
            trend={summary.promedio_margen_real >= 35 ? 'up' : 'down'}
          />
        </div>
      </div>

      {/* Métricas de Desempeño */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Métricas de Desempeño</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <StatCard
            title="Sobre Estimación"
            value={summary.eventos_sobre_estimacion}
            icon={CheckCircle}
            color="green"
            subtitle={`${((summary.eventos_sobre_estimacion / summary.total_eventos) * 100).toFixed(0)}% del total`}
          />

          <StatCard
            title="Bajo Estimación"
            value={summary.eventos_bajo_estimacion}
            icon={AlertCircle}
            color="yellow"
            subtitle={`${((summary.eventos_bajo_estimacion / summary.total_eventos) * 100).toFixed(0)}% del total`}
          />

          <StatCard
            title="Margen Crítico"
            value={summary.eventos_con_margen_critico}
            icon={XCircle}
            color="red"
            subtitle={`< 35% de margen`}
          />

          <StatCard
            title="Precisión Estimación"
            value={formatPercentage(summary.tasa_precision_estimacion)}
            icon={Target}
            color={summary.tasa_precision_estimacion >= 80 ? 'green' : summary.tasa_precision_estimacion >= 60 ? 'yellow' : 'red'}
            subtitle="Exactitud promedio"
            trend={summary.tasa_precision_estimacion >= 80 ? 'up' : summary.tasa_precision_estimacion >= 60 ? 'neutral' : 'down'}
          />
        </div>
      </div>

      {/* Desviación Global */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-purple-600" />
            Desviación Global
          </h3>
          <div className={`text-3xl font-bold ${getDeviationColor(summary.desviacion_global)}`}>
            {formatPercentage(summary.desviacion_global)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">Ingresos</p>
            <p className={`text-lg font-semibold ${getDeviationColor(summary.desviacion_ingresos)}`}>
              {summary.desviacion_ingresos > 0 ? '+' : ''}{formatPercentage(summary.desviacion_ingresos)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Gastos</p>
            <p className={`text-lg font-semibold ${getDeviationColor(-summary.desviacion_gastos)}`}>
              {summary.desviacion_gastos > 0 ? '+' : ''}{formatPercentage(summary.desviacion_gastos)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Utilidad</p>
            <p className={`text-lg font-semibold ${getDeviationColor(summary.desviacion_utilidad)}`}>
              {summary.desviacion_utilidad > 0 ? '+' : ''}{formatPercentage(summary.desviacion_utilidad)}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">
            {summary.desviacion_global < 10
              ? '✅ Excelente precisión en la estimación de eventos'
              : summary.desviacion_global < 20
              ? '⚠️ Precisión moderada, revisar procesos de estimación'
              : '🚨 Alta desviación, requiere mejora significativa en la planificación'}
          </p>
        </div>
      </div>

      {/* Insights y Recomendaciones */}
      <div className="bg-blue-50 rounded-lg p-5 border-l-4 border-blue-500">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Insights y Recomendaciones</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          {summary.promedio_margen_real < 35 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>El margen promedio está por debajo del objetivo (35%). Considera revisar precios o reducir costos.</span>
            </li>
          )}
          {summary.eventos_con_margen_critico > 0 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                {summary.eventos_con_margen_critico} evento(s) tienen margen crítico. Requieren atención inmediata.
              </span>
            </li>
          )}
          {summary.desviacion_global > 15 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>La desviación global es alta. Mejorar procesos de estimación y seguimiento.</span>
            </li>
          )}
          {summary.tasa_precision_estimacion < 70 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>La tasa de precisión es baja. Revisar metodología de cotización y planificación.</span>
            </li>
          )}
          {summary.eventos_sobre_estimacion > summary.total_eventos * 0.6 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>La mayoría de eventos superan las estimaciones. Considerar ajustar proyecciones al alza.</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};
