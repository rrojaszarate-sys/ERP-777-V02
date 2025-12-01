import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, ArrowRight, Circle } from 'lucide-react';
import { useEventStateFlow, EventState } from '../../hooks/useEventStates';
import { Badge } from '../../../../shared/components/ui/Badge';

interface EventWorkflowVisualizationProps {
  currentStateId: number;
  onStateClick?: (state: EventState) => void;
  showProgress?: boolean;
  interactive?: boolean;
  className?: string;
}

export const EventWorkflowVisualization: React.FC<EventWorkflowVisualizationProps> = ({
  currentStateId,
  onStateClick,
  showProgress = true,
  interactive = false,
  className = ''
}) => {
  const {
    states,
    isLoading,
    error,
    getStateById,
    canAdvanceToState,
    canRegressToState,
    getWorkflowProgress
  } = useEventStateFlow();

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-600 mb-2">Error cargando estados del workflow</div>
        <div className="text-sm text-gray-500">{error.message}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!states || states.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-600">No hay estados de workflow configurados</div>
      </div>
    );
  }

  const currentState = getStateById(currentStateId);
  const progress = getWorkflowProgress(currentStateId);

  const getStateStatus = (state: EventState): 'completed' | 'current' | 'upcoming' | 'available' => {
    if (!currentState) return 'upcoming';
    
    if (state.orden < currentState.orden) return 'completed';
    if (state.id === currentStateId) return 'current';
    if (interactive && (canAdvanceToState(currentStateId, state.id) || canRegressToState(currentStateId, state.id))) {
      return 'available';
    }
    return 'upcoming';
  };

  const handleStateClick = (state: EventState) => {
    if (!interactive || !onStateClick) return;
    
    const status = getStateStatus(state);
    if (status === 'available' || status === 'current') {
      onStateClick(state);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progreso del Evento</span>
            <span>{progress.toFixed(0)}% completado</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-mint-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Workflow Steps */}
      <div className="space-y-3">
        {states.map((state, index) => {
          const status = getStateStatus(state);
          const isClickable = interactive && (status === 'available' || status === 'current');
          
          return (
            <motion.div
              key={state.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative flex items-center p-4 rounded-lg border-2 transition-all ${
                status === 'current'
                  ? `shadow-md`
                  : status === 'completed'
                  ? 'border-green-500 bg-green-50'
                  : status === 'available'
                  ? 'border-gray-300 bg-white cursor-pointer'
                  : 'border-gray-200 bg-gray-50'
              }`}
              style={{
                borderColor: status === 'current' ? state.color || '#74F1C8' : undefined,
                backgroundColor: status === 'current' ? `${state.color || '#74F1C8'}10` : undefined
              }}
              onClick={() => handleStateClick(state)}
              whileHover={isClickable ? { scale: 1.02 } : {}}
              whileTap={isClickable ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center space-x-4 flex-1">
                {/* State Icon */}
                <div 
                  className={`p-3 rounded-full border-2 ${
                    status === 'completed'
                      ? 'bg-green-500 border-green-500'
                      : status === 'current'
                      ? ''
                      : status === 'available'
                      ? 'border-gray-400'
                      : 'border-gray-300'
                  }`}
                  style={{
                    backgroundColor: status === 'current' ? state.color || '#74F1C8' : undefined,
                    borderColor: status === 'current' ? state.color || '#74F1C8' : undefined
                  }}
                >
                  {status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : status === 'current' ? (
                    <Clock className="w-6 h-6 text-white" />
                  ) : (
                    <Circle className={`w-6 h-6 ${
                      status === 'available' ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                  )}
                </div>

                {/* State Information */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className={`font-medium ${
                      status === 'current'
                        ? 'text-gray-900'
                        : status === 'completed'
                        ? 'text-green-800'
                        : status === 'available'
                        ? 'text-gray-700'
                        : 'text-gray-500'
                    }`}>
                      {state.nombre}
                    </h4>
                    
                    {/* State Badge */}
                    <Badge
                      variant={
                        status === 'current' ? 'info' :
                        status === 'completed' ? 'success' :
                        status === 'available' ? 'default' : 'default'
                      }
                      size="sm"
                      style={{
                        backgroundColor: status === 'current' ? `${state.color || '#74F1C8'}20` : undefined,
                        color: status === 'current' ? state.color || '#74F1C8' : undefined,
                        borderColor: status === 'current' ? `${state.color || '#74F1C8'}40` : undefined
                      }}
                    >
                      Paso {state.orden}
                    </Badge>

                    {status === 'current' && (
                      <Badge variant="info" size="sm">
                        Actual
                      </Badge>
                    )}
                  </div>
                  
                  {state.descripcion && (
                    <p className={`text-sm mt-1 ${
                      status === 'current'
                        ? 'text-gray-700'
                        : status === 'completed'
                        ? 'text-green-700'
                        : 'text-gray-500'
                    }`}>
                      {state.descripcion}
                    </p>
                  )}
                </div>

                {/* Action Indicator */}
                {isClickable && (
                  <ArrowRight className="w-5 h-5" style={{ color: state.color || '#74F1C8' }} />
                )}
              </div>

              {/* Connection Line */}
              {index < states.length - 1 && (
                <div 
                  className={`absolute left-8 top-full w-0.5 h-3 ${
                    status === 'completed' ? 'bg-green-400' : 'bg-gray-300'
                  }`}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Workflow Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">
              {states.filter(s => getStateStatus(s) === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completados</div>
          </div>
          <div>
            <div className="text-lg font-bold text-mint-600">1</div>
            <div className="text-sm text-gray-600">Actual</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-600">
              {states.filter(s => getStateStatus(s) === 'upcoming').length}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </div>
        </div>
      </div>
    </div>
  );
};