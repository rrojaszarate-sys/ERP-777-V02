import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { EventFinancialAnalysis } from '../../types/Event';
import { useMarginColor, useStatusBgColor } from '../../hooks/useEventFinancialAnalysis';

interface FinancialBalancePanelProps {
  analysis: EventFinancialAnalysis;
  showComparison?: boolean;
}

/**
 * Panel de Balance Financiero - Muestra Proyección vs Resultado
 */
export const FinancialBalancePanel: React.FC<FinancialBalancePanelProps> = ({
  analysis,
  showComparison = true
}) => {
  const { projection, result, comparison, status, alert_level } = analysis;

  const marginEstimadoColor = useMarginColor(projection.margen_estimado);
  const marginRealColor = useMarginColor(result.margen_real);
  const statusBgColor = useStatusBgColor(status);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getVariationIcon = (value: number) => {
    return value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getVariationColor = (value: number, invertColors = false) => {
    const isPositive = invertColors ? value < 0 : value > 0;
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${statusBgColor}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center mb-2">
          <DollarSign className="w-6 h-6 mr-2" />
          Balance Financiero: {analysis.event_name}
        </h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          {analysis.cliente_nombre && (
            <span>Cliente: <strong>{analysis.cliente_nombre}</strong></span>
          )}
          {analysis.fecha_evento && (
            <span>Fecha: <strong>{new Date(analysis.fecha_evento).toLocaleDateString('es-MX')}</strong></span>
          )}
          {analysis.tipo_evento && (
            <span>Tipo: <strong>{analysis.tipo_evento}</strong></span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* PROYECCIÓN (Estimado) */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-blue-200">
          <div className="flex items-center mb-4">
            <Target className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="text-lg font-semibold text-blue-900">Proyección (<span className="line-through">Estimado</span>)</h4>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Ingreso <span className="line-through">Estimado</span></span>
              <span className="font-semibold text-blue-700">
                {formatCurrency(projection.ingreso_estimado)}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Provisiones</span>
              <span className="font-semibold text-orange-600">
                {formatCurrency(projection.provisiones)}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-blue-300">
              <span className="font-medium text-gray-800">Utilidad <span className="line-through">Estimada</span></span>
              <span className="font-bold text-blue-800 text-lg">
                {formatCurrency(projection.utilidad_estimada)}
              </span>
            </div>

            <div className="flex justify-between items-center bg-blue-50 p-3 rounded">
              <span className="font-medium text-gray-800">Margen <span className="line-through">Estimado</span></span>
              <span className={`font-bold text-lg ${marginEstimadoColor}`}>
                {formatPercentage(projection.margen_estimado)}
              </span>
            </div>
          </div>
        </div>

        {/* RESULTADO (Real) */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-green-200">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="text-lg font-semibold text-green-900">Resultado (Real)</h4>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Ingreso Real</span>
              <span className="font-semibold text-green-700">
                {formatCurrency(result.ingreso_real)}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Gastos Reales</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(result.gastos_reales)}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-green-300">
              <span className="font-medium text-gray-800">Utilidad Real</span>
              <span className="font-bold text-green-800 text-lg">
                {formatCurrency(result.utilidad_real)}
              </span>
            </div>

            <div className="flex justify-between items-center bg-green-50 p-3 rounded">
              <span className="font-medium text-gray-800">Margen Real</span>
              <span className={`font-bold text-lg ${marginRealColor}`}>
                {formatPercentage(result.margen_real)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPARACIÓN */}
      {showComparison && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-purple-200">
          <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Comparación: Real vs Estimado
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Diferencia Absoluta */}
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Diferencia Absoluta</p>
              <div className="flex items-center space-x-2">
                {getVariationIcon(comparison.diferencia_absoluta)}
                <span className={`font-bold text-lg ${getVariationColor(comparison.diferencia_absoluta)}`}>
                  {formatCurrency(comparison.diferencia_absoluta)}
                </span>
              </div>
            </div>

            {/* Diferencia Porcentual */}
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Diferencia Porcentual</p>
              <div className="flex items-center space-x-2">
                {getVariationIcon(comparison.diferencia_porcentaje)}
                <span className={`font-bold text-lg ${getVariationColor(comparison.diferencia_porcentaje)}`}>
                  {comparison.diferencia_porcentaje > 0 ? '+' : ''}
                  {formatPercentage(comparison.diferencia_porcentaje)}
                </span>
              </div>
            </div>

            {/* Variación de Margen */}
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Variación de Margen</p>
              <div className="flex items-center space-x-2">
                {getVariationIcon(comparison.variacion_margen)}
                <span className={`font-bold text-lg ${getVariationColor(comparison.variacion_margen)}`}>
                  {comparison.variacion_margen > 0 ? '+' : ''}
                  {formatPercentage(comparison.variacion_margen)}
                </span>
              </div>
            </div>
          </div>

          {/* Detalles adicionales */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-sm">
              <span className="text-gray-600">Variación Ingresos: </span>
              <span className={`font-semibold ${getVariationColor(comparison.variacion_ingresos)}`}>
                {comparison.variacion_ingresos > 0 ? '+' : ''}
                {formatPercentage(comparison.variacion_ingresos)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Variación Gastos: </span>
              <span className={`font-semibold ${getVariationColor(comparison.variacion_gastos, true)}`}>
                {comparison.variacion_gastos > 0 ? '+' : ''}
                {formatPercentage(comparison.variacion_gastos)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Alertas */}
      {(result.margen_real < 35 || alert_level !== 'none') && (
        <div className="mt-4 space-y-2">
          {result.margen_real < 35 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h5 className="text-red-800 font-medium">Margen Crítico</h5>
                <p className="text-red-700 text-sm">
                  El margen real ({formatPercentage(result.margen_real)}) está por debajo del 35% recomendado.
                </p>
              </div>
            </div>
          )}

          {alert_level === 'warning' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h5 className="text-yellow-800 font-medium">Variación Moderada</h5>
                <p className="text-yellow-700 text-sm">
                  La variación entre estimado y real es mayor al 10%. Revisar planificación.
                </p>
              </div>
            </div>
          )}

          {alert_level === 'danger' && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h5 className="text-red-800 font-medium">Variación Alta</h5>
                <p className="text-red-700 text-sm">
                  La variación entre estimado y real es mayor al 20%. Requiere atención inmediata.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Badge */}
      <div className="mt-4 flex justify-end">
        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
          status === 'excelente' ? 'bg-green-200 text-green-800' :
          status === 'bueno' ? 'bg-blue-200 text-blue-800' :
          status === 'alerta' ? 'bg-yellow-200 text-yellow-800' :
          'bg-red-200 text-red-800'
        }`}>
          Estado: {status.toUpperCase()}
        </div>
      </div>
    </div>
  );
};
