import React from 'react';

/**
 * 🎯 Componente GaugeChart (Velocímetro)
 *
 * Muestra un indicador visual tipo velocímetro para porcentajes de utilidad
 * con lógica de semáforo integrada.
 *
 * @param value - Porcentaje de utilidad (0-100)
 * @param size - Tamaño del gauge ('sm' | 'md' | 'lg')
 * @param showLabel - Mostrar etiqueta con porcentaje
 * @param className - Clases CSS adicionales
 */

interface GaugeChartProps {
  value: number; // Porcentaje 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  // Limitar valor entre 0 y 100
  const clampedValue = Math.max(0, Math.min(100, value));

  // Lógica de semáforo según requerimientos
  // Verde: ≥35%, Amarillo: 25-34%, Rojo: 1-24%, Gris: ≤0%
  const getColor = (percentage: number): { stroke: string; bg: string; text: string } => {
    if (percentage >= 35) {
      return {
        stroke: '#10b981', // green-500
        bg: 'bg-green-100',
        text: 'text-green-700'
      };
    } else if (percentage >= 25) {
      return {
        stroke: '#f59e0b', // yellow-500
        bg: 'bg-yellow-100',
        text: 'text-yellow-700'
      };
    } else if (percentage >= 1) {
      return {
        stroke: '#ef4444', // red-500
        bg: 'bg-red-100',
        text: 'text-red-700'
      };
    } else {
      // Para 0% o negativos
      return {
        stroke: '#9ca3af', // gray-400
        bg: 'bg-gray-100',
        text: 'text-gray-700'
      };
    }
  };

  // Configuración de tamaños
  const sizeConfig = {
    sm: { radius: 40, strokeWidth: 6, fontSize: 'text-xs', width: 100, height: 60 },
    md: { radius: 50, strokeWidth: 8, fontSize: 'text-sm', width: 130, height: 75 },
    lg: { radius: 70, strokeWidth: 10, fontSize: 'text-lg', width: 170, height: 100 }
  };

  const config = sizeConfig[size];
  const { stroke, bg, text } = getColor(clampedValue);

  // Cálculos del arco (semicírculo)
  const circumference = Math.PI * config.radius; // Semicírculo
  const offset = circumference - (clampedValue / 100) * circumference;

  // Centro del SVG
  const centerX = config.width / 2;
  const centerY = config.height - 10; // Ajuste para semicírculo

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={config.width}
        height={config.height}
        viewBox={`0 0 ${config.width} ${config.height}`}
        className="overflow-visible"
      >
        {/* Círculo de fondo (gris) */}
        <path
          d={`M ${centerX - config.radius} ${centerY}
              A ${config.radius} ${config.radius} 0 0 1 ${centerX + config.radius} ${centerY}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
        />

        {/* Círculo de progreso (coloreado según semáforo) */}
        <path
          d={`M ${centerX - config.radius} ${centerY}
              A ${config.radius} ${config.radius} 0 0 1 ${centerX + config.radius} ${centerY}`}
          fill="none"
          stroke={stroke}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out, stroke 0.3s ease-in-out',
          }}
        />

        {/* Texto del porcentaje en el centro */}
        {showLabel && (
          <text
            x={centerX}
            y={centerY - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`font-bold ${config.fontSize}`}
            fill="currentColor"
          >
            {clampedValue.toFixed(0)}%
          </text>
        )}

        {/* Marcadores opcionales (0%, 50%, 100%) */}
        <g className="text-xs fill-gray-400">
          <text x={centerX - config.radius - 5} y={centerY + 5} fontSize="10" textAnchor="end">
            0%
          </text>
          <text x={centerX + config.radius + 5} y={centerY + 5} fontSize="10" textAnchor="start">
            100%
          </text>
        </g>
      </svg>

      {/* Badge opcional debajo del gauge */}
      {showLabel && (
        <div className={`mt-1 px-2 py-0.5 rounded-full ${bg} ${text} text-xs font-medium`}>
          {clampedValue >= 35 ? 'Excelente' : clampedValue >= 25 ? 'Regular' : clampedValue >= 1 ? 'Bajo' : 'Ninguno'}
        </div>
      )}
    </div>
  );
};

/**
 * Variante compacta para uso inline en tablas
 */
export const GaugeChartInline: React.FC<GaugeChartProps> = (props) => {
  return <GaugeChart {...props} size="sm" showLabel={false} />;
};
