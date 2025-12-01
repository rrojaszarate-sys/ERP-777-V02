import React from 'react';
import { Badge } from '../../../../shared/components/ui/Badge';
import { useEventStates } from '../../hooks/useEventStates';

interface WorkflowStatusBadgeProps {
  stateId: number;
  showProgress?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({
  stateId,
  showProgress = false,
  size = 'sm',
  className = ''
}) => {
  const { data: states } = useEventStates();
  
  const state = states?.find(s => s.id === stateId);
  
  if (!state) {
    return (
      <Badge variant="default" size={size} className={className}>
        Estado desconocido
      </Badge>
    );
  }

  const calculateProgress = (currentId: number): number | undefined => {
    if (!states || states.length === 0) return undefined;
    const currentState = states.find(s => s.id === currentId);
    if (!currentState) return undefined;
    return (currentState.orden / states.length) * 100;
  };

  const progress = showProgress ? calculateProgress(stateId) : undefined;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge
        variant="default"
        size={size}
        style={{
          backgroundColor: `${state.color || '#74F1C8'}20`,
          color: state.color || '#74F1C8',
          borderColor: `${state.color || '#74F1C8'}40`
        }}
      >
        {state.nombre}
      </Badge>
      
      {showProgress && progress !== undefined && (
        <span className="text-xs text-gray-500">
          ({progress.toFixed(0)}%)
        </span>
      )}
    </div>
  );
};