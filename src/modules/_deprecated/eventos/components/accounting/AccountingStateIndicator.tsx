import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '../../../../shared/components/ui/Badge';

interface AccountingStateIndicatorProps {
  stateName: string;
  showIcon?: boolean;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AccountingStateIndicator: React.FC<AccountingStateIndicatorProps> = ({
  stateName,
  showIcon = true,
  showProgress = false,
  size = 'md',
  className = ''
}) => {
  const getStateConfig = (state: string) => {
    switch (state.toLowerCase()) {
      case 'cerrado':
        return {
          variant: 'default' as const,
          icon: Clock,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          textColor: '#374151',
          progress: 70
        };
      case 'pagos pendiente':
        return {
          variant: 'warning' as const,
          icon: Clock,
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          textColor: '#92400E',
          progress: 80
        };
      case 'pagados':
        return {
          variant: 'success' as const,
          icon: CheckCircle,
          color: '#10B981',
          bgColor: '#D1FAE5',
          textColor: '#065F46',
          progress: 100
        };
      case 'pagos vencidos':
        return {
          variant: 'danger' as const,
          icon: AlertTriangle,
          color: '#EF4444',
          bgColor: '#FEE2E2',
          textColor: '#991B1B',
          progress: 75
        };
      default:
        return {
          variant: 'default' as const,
          icon: XCircle,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          textColor: '#374151',
          progress: 0
        };
    }
  };

  const config = getStateConfig(stateName);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <motion.div
      className={`flex items-center space-x-2 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {showIcon && (
        <div 
          className="p-1 rounded-full"
          style={{ backgroundColor: config.bgColor }}
        >
          <Icon 
            className={`${iconSizes[size]}`}
            style={{ color: config.color }}
          />
        </div>
      )}
      
      <Badge
        variant={config.variant}
        size={size}
        style={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          borderColor: config.color + '40'
        }}
      >
        {stateName}
      </Badge>
      
      {showProgress && (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-200 rounded-full h-1.5">
            <motion.div
              className="h-1.5 rounded-full"
              style={{ backgroundColor: config.color }}
              initial={{ width: 0 }}
              animate={{ width: `${config.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <span className={`text-xs text-gray-500 ${sizeClasses[size]}`}>
            {config.progress}%
          </span>
        </div>
      )}
    </motion.div>
  );
};