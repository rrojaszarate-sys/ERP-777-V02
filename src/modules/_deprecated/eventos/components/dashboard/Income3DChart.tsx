import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../../../shared/utils/formatters';

interface Income3DChartProps {
  data: {
    cotizado: number;
    aprobado: number;
    facturado: number;
    cobrado: number;
  };
  className?: string;
}

export const Income3DChart: React.FC<Income3DChartProps> = ({ data, className = '' }) => {
  const total = Object.values(data).reduce((sum, value) => sum + value, 0);
  
  const segments = [
    { key: 'cotizado', label: 'Cotizado', value: data.cotizado, color: '#3498DB' },
    { key: 'aprobado', label: 'Aprobado', value: data.aprobado, color: '#2ECC71' },
    { key: 'facturado', label: 'Facturado', value: data.facturado, color: '#F39C12' },
    { key: 'cobrado', label: 'Cobrado', value: data.cobrado, color: '#74F1C8' }
  ].filter(segment => segment.value > 0);

  let currentAngle = 0;

  return (
    <div className={`relative h-80 ${className}`}>
      <svg viewBox="0 0 400 300" className="w-full h-full">
        <defs>
          {segments.map((segment, index) => (
            <linearGradient key={index} id={`gradient-${segment.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={segment.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={segment.color} stopOpacity="0.7" />
            </linearGradient>
          ))}
          <filter id="shadow3d">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.2"/>
          </filter>
        </defs>
        
        {/* 3D Pie Chart */}
        <g transform="translate(200, 150)">
          {segments.map((segment, index) => {
            const percentage = segment.value / total;
            const angle = percentage * 2 * Math.PI;
            const endAngle = currentAngle + angle;
            
            const x1 = Math.cos(currentAngle) * 80;
            const y1 = Math.sin(currentAngle) * 80;
            const x2 = Math.cos(endAngle) * 80;
            const y2 = Math.sin(endAngle) * 80;
            
            const largeArcFlag = angle > Math.PI ? 1 : 0;
            
            const pathData = [
              `M 0 0`,
              `L ${x1} ${y1}`,
              `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `Z`
            ].join(' ');
            
            // 3D effect - bottom slice
            const bottomPath = [
              `M 0 8`,
              `L ${x1} ${y1 + 8}`,
              `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2 + 8}`,
              `Z`
            ].join(' ');
            
            const result = (
              <g key={segment.key}>
                {/* Bottom slice for 3D effect */}
                <motion.path
                  d={bottomPath}
                  fill={segment.color}
                  opacity="0.6"
                  filter="url(#shadow3d)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                />
                
                {/* Main slice */}
                <motion.path
                  d={pathData}
                  fill={`url(#gradient-${segment.key})`}
                  stroke="white"
                  strokeWidth="2"
                  filter="url(#shadow3d)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  className="cursor-pointer"
                />
                
                {/* Label */}
                {percentage > 0.05 && (
                  <text
                    x={Math.cos(currentAngle + angle / 2) * 100}
                    y={Math.sin(currentAngle + angle / 2) * 100}
                    textAnchor="middle"
                    className="text-xs font-medium fill-gray-700"
                  >
                    {(percentage * 100).toFixed(0)}%
                  </text>
                )}
              </g>
            );
            
            currentAngle = endAngle;
            return result;
          })}
        </g>
        
        {/* Legend */}
        <g transform="translate(20, 20)">
          {segments.map((segment, index) => (
            <g key={segment.key} transform={`translate(0, ${index * 20})`}>
              <rect
                width="12"
                height="12"
                fill={segment.color}
                rx="2"
              />
              <text
                x="18"
                y="9"
                className="text-xs fill-gray-700"
              >
                {segment.label}: {formatCurrency(segment.value)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};