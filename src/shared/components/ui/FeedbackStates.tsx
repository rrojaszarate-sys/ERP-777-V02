import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, XCircle, AlertCircle, Info, Loader2,
  FileQuestion, ServerOff, WifiOff, Search
} from 'lucide-react';

// Componente de estado de carga
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando...',
  size = 'md'
}) => {
  const sizes = {
    sm: { spinner: 'w-6 h-6', text: 'text-sm' },
    md: { spinner: 'w-8 h-8', text: 'text-base' },
    lg: { spinner: 'w-12 h-12', text: 'text-lg' }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <Loader2 className={`${sizes[size].spinner} text-indigo-600 animate-spin`} />
      <p className={`mt-4 text-gray-600 ${sizes[size].text}`}>{message}</p>
    </motion.div>
  );
};

// Componente de estado vacío
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        {icon || <FileQuestion className="w-12 h-12 text-gray-400" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 text-center max-w-md mb-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
};

// Componente de estado de error
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  type?: 'general' | 'network' | 'server' | 'notFound';
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Ha ocurrido un error',
  message,
  onRetry,
  type = 'general'
}) => {
  const icons = {
    general: <XCircle className="w-12 h-12 text-red-500" />,
    network: <WifiOff className="w-12 h-12 text-red-500" />,
    server: <ServerOff className="w-12 h-12 text-red-500" />,
    notFound: <Search className="w-12 h-12 text-gray-400" />
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="p-4 bg-red-50 rounded-full mb-4">
        {icons[type]}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-center max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Intentar de nuevo
        </button>
      )}
    </motion.div>
  );
};

// Componente de alerta inline
interface InlineAlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onDismiss?: () => void;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  type,
  message,
  onDismiss
}) => {
  const config = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      text: 'text-green-800'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      text: 'text-red-800'
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      text: 'text-amber-800'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <Info className="w-5 h-5 text-blue-600" />,
      text: 'text-blue-800'
    }
  };

  const { bg, icon, text } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 p-4 rounded-lg border ${bg}`}
    >
      {icon}
      <p className={`flex-1 text-sm ${text}`}>{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`p-1 rounded hover:bg-white/50 transition-colors ${text}`}
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};

// Componente de badge de estado
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'error';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md'
}) => {
  const config = {
    active: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', defaultLabel: 'Activo' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500', defaultLabel: 'Inactivo' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', defaultLabel: 'Pendiente' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', defaultLabel: 'Completado' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', defaultLabel: 'Cancelado' },
    error: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', defaultLabel: 'Error' }
  };

  const { bg, text, dot, defaultLabel } = config[status];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${bg} ${text} ${sizeClasses}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label || defaultLabel}
    </span>
  );
};

// Componente de progreso
interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  color?: 'indigo' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = true,
  color = 'indigo',
  size = 'md'
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const colors = {
    indigo: 'bg-indigo-600',
    green: 'bg-green-600',
    amber: 'bg-amber-600',
    red: 'bg-red-600'
  };

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progreso</span>
          <span className="font-medium text-gray-900">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heights[size]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`${heights[size]} rounded-full ${colors[color]}`}
        />
      </div>
    </div>
  );
};

// Componente de skeleton para carga
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = ''
}) => {
  const baseClasses = 'animate-pulse bg-gray-200';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Componente de skeleton para tabla
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="25%" height={20} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} width="25%" height={16} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default {
  LoadingState,
  EmptyState,
  ErrorState,
  InlineAlert,
  StatusBadge,
  ProgressBar,
  Skeleton,
  TableSkeleton
};
