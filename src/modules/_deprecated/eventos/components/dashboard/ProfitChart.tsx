import React from 'react';
import { motion } from 'framer-motion';
import { AnalisisTemporal } from '../../types/Event';
import { formatCurrency, getMonthName } from '../../../../shared/utils/formatters';

interface ProfitChartProps {
  data: AnalisisTemporal[];
  className?: string;
}

export const ProfitChart: React.FC<ProfitChartProps> = ({ data, className = '' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No hay datos temporales</div>
          <div className="text-sm">Los datos aparecerán cuando haya eventos registrados</div>
        </div>
      </div>
    );
  }

  const maxUtilidad = Math.max(...data.map(item => item.utilidad_mes));
  const minUtilidad = Math.min(...data.map(item => item.utilidad_mes));
  const range = maxUtilidad - minUtilidad;
  const chartHeight = 200;
  const chartWidth = 350;

  return (
    <div className={`relative h-80 ${className}`}>
      <svg viewBox="0 0 400 300" className="w-full h-full">
        <defs>
          <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#74F1C8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#74F1C8" stopOpacity="0.1" />
          </linearGradient>
          <filter id="lineShadow">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        
        {/* Grid lines */}
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = 50 + (1 - ratio) * chartHeight;
            return (
              <line
                key={index}
                x1="50"
                y1={y}
                x2={50 + chartWidth}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            );
          })}
        </g>
        
        {/* Profit line and area */}
        <g>
          {/* Area fill */}
          <motion.polygon
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            fill="url(#profitGradient)"
            points={[
              // Top line points
              ...data.map((item, index) => {
                const x = 50 + (index / (data.length - 1)) * chartWidth;
                const y = 50 + ((maxUtilidad - item.utilidad_mes) / range) * chartHeight;
                return `${x},${y}`;
              }),
              // Bottom line points (reversed)
              `${50 + chartWidth},${50 + chartHeight}`,
              `50,${50 + chartHeight}`
            ].join(' ')}
          />
          
          {/* Profit line */}
          <motion.polyline
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            fill="none"
            stroke="#74F1C8"
            strokeWidth="3"
            filter="url(#lineShadow)"
            points={data.map((item, index) => {
              const x = 50 + (index / (data.length - 1)) * chartWidth;
              const y = 50 + ((maxUtilidad - item.utilidad_mes) / range) * chartHeight;
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = 50 + (index / (data.length - 1)) * chartWidth;
            const y = 50 + ((maxUtilidad - item.utilidad_mes) / range) * chartHeight;
            
            return (
              <motion.g
                key={index}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#74F1C8"
                  stroke="white"
                  strokeWidth="2"
                  className="hover:r-6 transition-all cursor-pointer"
                />
                
                {/* Hover tooltip */}
                <g className="opacity-0 hover:opacity-100 transition-opacity">
                  <rect
                    x={x - 40}
                    y={y - 35}
                    width="80"
                    height="25"
                    fill="rgba(0,0,0,0.8)"
                    rx="4"
                  />
                  <text
                    x={x}
                    y={y - 20}
                    textAnchor="middle"
                    className="text-xs fill-white font-medium"
                  >
                    {formatCurrency(item.utilidad_mes)}
                  </text>
                </g>
              </motion.g>
            );
          })}
        </g>
        
        {/* X-axis labels */}
        <g>
          {data.map((item, index) => {
            const x = 50 + (index / (data.length - 1)) * chartWidth;
            return (
              <text
                key={index}
                x={x}
                y={270}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {getMonthName(item.mes).substring(0, 3)}
              </text>
            );
          })}
        </g>
        
        {/* Y-axis labels */}
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = 50 + (1 - ratio) * chartHeight;
            const value = minUtilidad + (range * ratio);
            
            return (
              <text
                key={index}
                x="45"
                y={y + 3}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {formatCurrency(value)}
              </text>
            );
          })}
        </g>
        
        {/* Chart title */}
        <text
          x="200"
          y="25"
          textAnchor="middle"
          className="text-sm font-medium fill-gray-700"
        >
          Tendencia de Utilidad (Últimos 6 meses)
        </text>
      </svg>
    </div>
  );
};