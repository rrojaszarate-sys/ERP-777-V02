import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../../../shared/utils/formatters';

interface Expense3DChartProps {
  data: Array<{
    categoria: string;
    monto_total: number;
    categoria_color: string;
  }>;
  className?: string;
}

export const Expense3DChart: React.FC<Expense3DChartProps> = ({ data, className = '' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No hay datos de gastos</div>
          <div className="text-sm">Los gastos aparecerán aquí cuando se registren</div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.monto_total));
  const chartHeight = 200;
  const barWidth = 40;
  const spacing = 60;

  return (
    <div className={`relative h-80 ${className}`}>
      <svg viewBox="0 0 400 300" className="w-full h-full">
        <defs>
          {data.map((item, index) => (
            <linearGradient key={index} id={`expenseGradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={item.categoria_color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={item.categoria_color} stopOpacity="0.7" />
            </linearGradient>
          ))}
          <filter id="barShadow">
            <feDropShadow dx="3" dy="5" stdDeviation="4" floodOpacity="0.3"/>
          </filter>
        </defs>
        
        {/* 3D Bars */}
        <g>
          {data.map((item, index) => {
            const barHeight = (item.monto_total / maxValue) * chartHeight;
            const x = 50 + index * spacing;
            const y = 250 - barHeight;
            
            // Calculate 3D offset
            const offset3D = 15;
            
            return (
              <motion.g
                key={item.categoria}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" }}
              >
                {/* 3D Side face */}
                <polygon
                  points={`${x + barWidth},${y} ${x + barWidth + offset3D},${y - offset3D} ${x + barWidth + offset3D},${250 - offset3D} ${x + barWidth},250`}
                  fill={item.categoria_color}
                  opacity="0.6"
                />
                
                {/* 3D Top face */}
                <polygon
                  points={`${x},${y} ${x + barWidth},${y} ${x + barWidth + offset3D},${y - offset3D} ${x + offset3D},${y - offset3D}`}
                  fill={item.categoria_color}
                  opacity="0.8"
                />
                
                {/* Main bar face */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={`url(#expenseGradient-${index})`}
                  filter="url(#barShadow)"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
                
                {/* Value label on top */}
                <text
                  x={x + barWidth / 2}
                  y={y - 10}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-700"
                >
                  {formatCurrency(item.monto_total)}
                </text>
                
                {/* Category label at bottom */}
                <text
                  x={x + barWidth / 2}
                  y={270}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {item.categoria.length > 10 ? 
                    item.categoria.substring(0, 10) + '...' : 
                    item.categoria
                  }
                </text>
              </motion.g>
            );
          })}
        </g>
        
        {/* Y-axis labels */}
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = 250 - (ratio * chartHeight);
            const value = maxValue * ratio;
            
            return (
              <g key={index}>
                <line
                  x1="40"
                  y1={y}
                  x2="45"
                  y2={y}
                  stroke="#9CA3AF"
                  strokeWidth="1"
                />
                <text
                  x="35"
                  y={y + 3}
                  textAnchor="end"
                  className="text-xs fill-gray-500"
                >
                  {formatCurrency(value)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};