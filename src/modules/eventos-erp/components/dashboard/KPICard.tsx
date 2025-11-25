import React from 'react';
import { motion } from 'framer-motion';
import { Video as LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  color: 'mint' | 'red' | 'green' | 'blue' | 'purple' | 'orange';
  trend?: 'up' | 'down' | 'neutral';
}

const colorClasses = {
  mint: 'bg-mint-500 text-white',
  red: 'bg-red-500 text-white',
  green: 'bg-green-500 text-white',
  blue: 'bg-blue-500 text-white',
  purple: 'bg-purple-500 text-white',
  orange: 'bg-orange-500 text-white'
};

const trendColors = {
  up: 'text-green-600',
  down: 'text-red-600',
  neutral: 'text-gray-600'
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  trend = 'neutral'
}) => {
  const TrendIcon = trendIcons[trend];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== 'neutral' && (
          <TrendIcon className={`w-5 h-5 ${trendColors[trend]}`} />
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
        {change && (
          <p className={`text-sm ${trendColors[trend]}`}>
            {change}
          </p>
        )}
      </div>
    </motion.div>
  );
};