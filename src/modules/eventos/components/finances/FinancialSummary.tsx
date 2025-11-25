import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Target, Paperclip, FileText } from 'lucide-react';
import { FinancialSummary as FinancialSummaryType } from '../../types/Finance';
import { formatCurrency, formatPercentage } from '../../../../shared/utils/formatters';

interface FinancialSummaryProps {
  eventId: number;
  summary: FinancialSummaryType;
  className?: string;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  eventId,
  summary,
  className = ''
}) => {
  const margenColor = summary.margen_porcentaje >= 20 ? 'text-green-600' : 
                     summary.margen_porcentaje >= 10 ? 'text-yellow-600' : 'text-red-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`p-6 space-y-6 ${className}`}
    >
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-green-900">Ingresos Totales</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-700 mb-2">
            {formatCurrency(summary.total_ingresos)}
          </div>
          <div className="text-sm text-green-600">
            {Object.keys(summary.ingresos_por_estado).length} registros
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-red-900">Gastos Totales</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-red-700 mb-2">
            {formatCurrency(summary.total_gastos)}
          </div>
          <div className="text-sm text-red-600">
            {Object.keys(summary.gastos_por_categoria).length} categorías
          </div>
        </div>
        
        <div className="bg-mint-50 border border-mint-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-mint-100 rounded-lg">
              <Target className="w-6 h-6 text-mint-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-mint-900">Utilidad Neta</h3>
            </div>
          </div>
          <div className={`text-3xl font-bold mb-2 ${margenColor}`}>
            {formatCurrency(summary.utilidad)}
          </div>
          <div className={`text-sm ${margenColor}`}>
            {formatPercentage(summary.margen_porcentaje)} margen
          </div>
        </div>
      </div>

      {/* Income Breakdown */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Desglose de Ingresos por Estado</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(summary.ingresos_por_estado).map(([estado, monto]) => (
            <div key={estado} className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(monto)}
              </div>
              <div className="text-sm text-green-600 capitalize">
                {estado.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Desglose de Gastos por Categoría</h3>
        <div className="space-y-3">
          {Object.entries(summary.gastos_por_categoria).map(([categoria, monto]) => {
            const percentage = summary.total_gastos > 0 ? (monto / summary.total_gastos) * 100 : 0;
            return (
              <div key={categoria} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">{categoria}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatCurrency(monto)}</div>
                    <div className="text-sm text-gray-500">{percentage.toFixed(1)}%</div>
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* File Attachment Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-mint-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Paperclip className="w-5 h-5 mr-2 text-blue-600" />
          Estadísticas de Archivos
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summary.archivos_adjuntos.total_archivos}
            </div>
            <div className="text-sm text-gray-600">Total Archivos</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.archivos_adjuntos.archivos_ingresos}
            </div>
            <div className="text-sm text-gray-600">Facturas</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {summary.archivos_adjuntos.archivos_gastos}
            </div>
            <div className="text-sm text-gray-600">Comprobantes</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-mint-600">
              {summary.archivos_adjuntos.tamaño_total_mb.toFixed(1)}MB
            </div>
            <div className="text-sm text-gray-600">Tamaño Total</div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-white rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Cobertura de documentación:</span> {' '}
              {summary.archivos_adjuntos.total_archivos > 0 ? 
                `${((summary.archivos_adjuntos.archivos_ingresos + summary.archivos_adjuntos.archivos_gastos) / summary.archivos_adjuntos.total_archivos * 100).toFixed(1)}% de registros con archivo adjunto` :
                'Sin archivos adjuntos'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Profitability Analysis */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Análisis de Rentabilidad</h3>
        
        <div className="space-y-4">
          {/* Profit margin indicator */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Margen de Utilidad</h4>
              <p className="text-sm text-gray-600">
                {summary.margen_porcentaje >= 20 ? 'Excelente rentabilidad' :
                 summary.margen_porcentaje >= 10 ? 'Rentabilidad aceptable' :
                 summary.margen_porcentaje >= 0 ? 'Rentabilidad baja' : 'Pérdida'}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${margenColor}`}>
                {formatPercentage(summary.margen_porcentaje)}
              </div>
              <div className="text-sm text-gray-500">del total</div>
            </div>
          </div>
          
          {/* Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Recomendaciones</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {summary.margen_porcentaje < 10 && (
                <li>• Revisar estructura de costos para mejorar rentabilidad</li>
              )}
              {summary.archivos_adjuntos.archivos_ingresos === 0 && (
                <li>• Asegurar que todos los ingresos tengan factura PDF adjunta</li>
              )}
              {summary.margen_porcentaje >= 20 && (
                <li>• Excelente rentabilidad, mantener estructura actual</li>
              )}
              <li>• Mantener documentación completa de comprobantes</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};