import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  color: 'mint' | 'red' | 'green' | 'blue' | 'purple';
  trend: 'up' | 'down' | 'neutral';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  trend
}) => {
  const colorClasses = {
    mint: 'bg-mint-100 text-mint-800 border-mint-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus
  };

  const TrendIcon = trendIcons[trend];

  return (
    <motion.div
      className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center space-x-1 text-sm ${
          trend === 'up' 
            ? 'text-green-600' 
            : trend === 'down' 
            ? 'text-red-600' 
            : 'text-gray-600'
        }`}>
          <TrendIcon className="w-4 h-4" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
        <p className={`text-sm ${
          trend === 'up' 
            ? 'text-green-600' 
            : trend === 'down' 
            ? 'text-red-600' 
            : 'text-gray-600'
        }`}>
          {change}
        </p>
      </div>
    </motion.div>
  );
};