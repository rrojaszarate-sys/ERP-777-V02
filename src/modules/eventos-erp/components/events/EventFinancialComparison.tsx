import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { EventoCompleto } from '../../types/Event';

interface EventFinancialComparisonProps {
  event: EventoCompleto;
}

/**
 * Component to display financial comparison between estimates and actuals
 * Shows:
 * - Ganancia Estimada vs Ingresos Reales (total)
 * - Gastos Estimados vs Gastos Reales (total_gastos)
 * - Utilidad Estimada vs Utilidad Real (utilidad)
 * - % Utilidad Estimada vs % Utilidad Real (margen_utilidad)
 */
export const EventFinancialComparison: React.FC<EventFinancialComparisonProps> = ({ event }) => {
  // Estimated values
  const gananciaEstimada = event.ganancia_estimada || 0;
  const provisiones = event.provisiones || 0;
  const utilidadEstimada = event.utilidad_estimada || 0;
  const porcentajeUtilidadEstimada = event.porcentaje_utilidad_estimada || 0;

  // Actual values
  const ingresosReales = event.total || 0; // Total de ingresos reales
  const gastosPagados = event.total_gastos || 0; // Total de gastos pagados
  const gastosPendientes = event.gastos_pendientes || 0; // Gastos pendientes
  const gastosTotales = event.gastos_totales || (gastosPagados + gastosPendientes);
  const utilidadReal = event.utilidad || 0; // Utilidad real calculada
  const porcentajeUtilidadReal = event.margen_utilidad || 0; // % Utilidad real

  // Calculations for differences
  const diffGanancia = ingresosReales - gananciaEstimada;
  const diffGastos = gastosPagados - provisiones;
  const diffUtilidad = utilidadReal - utilidadEstimada;
  const diffPorcentaje = porcentajeUtilidadReal - porcentajeUtilidadEstimada;

  // Percentage differences
  const pctDiffGanancia = gananciaEstimada > 0 ? (diffGanancia / gananciaEstimada) * 100 : 0;
  const pctDiffGastos = provisiones > 0 ? (diffGastos / provisiones) * 100 : 0;
  const pctDiffUtilidad = utilidadEstimada > 0 ? (diffUtilidad / utilidadEstimada) * 100 : 0;

  const ComparisonRow = ({
    label,
    estimated,
    actual,
    diff,
    pctDiff,
    isPercentage = false,
    invertColors = false // For expenses, higher is worse
  }: {
    label: string;
    estimated: number;
    actual: number;
    diff: number;
    pctDiff: number;
    isPercentage?: boolean;
    invertColors?: boolean;
  }) => {
    const isPositive = invertColors ? diff < 0 : diff > 0;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    const bgColorClass = isPositive ? 'bg-green-50' : 'bg-red-50';
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <div className="grid grid-cols-5 gap-4 p-3 border-b border-gray-200 hover:bg-gray-50">
        <div className="font-medium text-gray-700">{label}</div>
        <div className="text-right">
          {isPercentage ? `${estimated.toFixed(2)}%` : `$${estimated.toFixed(2)}`}
        </div>
        <div className="text-right font-semibold">
          {isPercentage ? `${actual.toFixed(2)}%` : `$${actual.toFixed(2)}`}
        </div>
        <div className={`text-right font-semibold ${colorClass}`}>
          {isPercentage
            ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`
            : `${diff > 0 ? '+' : ''}$${diff.toFixed(2)}`
          }
        </div>
        <div className={`text-right flex items-center justify-end space-x-1 ${bgColorClass} px-2 py-1 rounded`}>
          <Icon className={`w-4 h-4 ${colorClass}`} />
          <span className={`font-semibold ${colorClass}`}>
            {pctDiff > 0 ? '+' : ''}{pctDiff.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <DollarSign className="w-6 h-6 mr-2 text-purple-600" />
        Comparación Financiera: Estimado vs Real
      </h3>

      {/* Headers */}
      <div className="grid grid-cols-5 gap-4 p-3 bg-gray-100 font-semibold text-gray-700 rounded-t-lg">
        <div>Concepto</div>
        <div className="text-right line-through">Estimado</div>
        <div className="text-right">Real</div>
        <div className="text-right">Diferencia</div>
        <div className="text-right">Variación %</div>
      </div>

      {/* Comparison Rows */}
      <div className="border border-gray-200 rounded-b-lg">
        <ComparisonRow
          label="Ganancia / Ingresos"
          estimated={gananciaEstimada}
          actual={ingresosReales}
          diff={diffGanancia}
          pctDiff={pctDiffGanancia}
        />

        <ComparisonRow
          label="Provisiones / Gastos Pagados"
          estimated={provisiones}
          actual={gastosPagados}
          diff={diffGastos}
          pctDiff={pctDiffGastos}
          invertColors={true} // Higher expenses are worse
        />

        <ComparisonRow
          label="Utilidad ($)"
          estimated={utilidadEstimada}
          actual={utilidadReal}
          diff={diffUtilidad}
          pctDiff={pctDiffUtilidad}
        />

        <ComparisonRow
          label="Utilidad (%)"
          estimated={porcentajeUtilidadEstimada}
          actual={porcentajeUtilidadReal}
          diff={diffPorcentaje}
          pctDiff={porcentajeUtilidadEstimada > 0 ? (diffPorcentaje / porcentajeUtilidadEstimada) * 100 : 0}
          isPercentage={true}
        />
      </div>

      {/* Warning if utility is below 35% */}
      {porcentajeUtilidadReal < 35 && ingresosReales > 0 && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-red-800 font-medium">Alerta: Utilidad Real Baja</h4>
              <p className="text-red-700 text-sm mt-1">
                La utilidad real del evento está por debajo del 35% recomendado
                ({porcentajeUtilidadReal.toFixed(2)}%).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary note */}
      <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
        <p className="font-medium text-blue-900">Notas:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Verde indica resultados mejores de lo estimado</li>
          <li>Rojo indica resultados por debajo de lo estimado</li>
          <li>Para gastos, valores menores son positivos (ahorro)</li>
        </ul>
      </div>
    </div>
  );
};
