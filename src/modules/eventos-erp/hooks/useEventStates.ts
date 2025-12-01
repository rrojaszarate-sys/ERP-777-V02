import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { workflowLogger } from '../../../core/utils/logger';

export interface EventState {
  id: number;
  nombre: string;
  descripcion?: string;
  color?: string;
  orden: number;
  workflow_step?: number;
}

export const useEventStates = () => {
  return useQuery({
    queryKey: ['event-states'],
    queryFn: async (): Promise<EventState[]> => {
      // Force direct read from Supabase, no cache
      const { data, error } = await supabase
        .from('evt_estados_erp')
        .select('id, nombre, descripcion, color, orden, workflow_step')
        .neq('workflow_step', 0)
        .order('orden', { ascending: true });

      if (error) {
        workflowLogger.error('Error fetching event states', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useEventStateFlow = () => {
  const { data: states, isLoading, error } = useEventStates();

  const getStateById = (id: number): EventState | undefined => {
    return states?.find(state => state.id === id);
  };

  const getNextState = (currentStateId: number): EventState | undefined => {
    if (!states) return undefined;
    
    const currentState = getStateById(currentStateId);
    if (!currentState) return undefined;
    
    const nextOrder = currentState.orden + 1;
    return states.find(state => state.orden === nextOrder);
  };

  const getPreviousState = (currentStateId: number): EventState | undefined => {
    if (!states) return undefined;
    
    const currentState = getStateById(currentStateId);
    if (!currentState) return undefined;
    
    const previousOrder = currentState.orden - 1;
    return states.find(state => state.orden === previousOrder);
  };

  const canAdvanceToState = (currentStateId: number, targetStateId: number): boolean => {
    if (!states) return false;
    
    const currentState = getStateById(currentStateId);
    const targetState = getStateById(targetStateId);
    
    if (!currentState || !targetState) return false;
    
    // Can only advance to the next state in sequence
    return targetState.orden === currentState.orden + 1;
  };

  const canRegressToState = (currentStateId: number, targetStateId: number): boolean => {
    if (!states) return false;
    
    const currentState = getStateById(currentStateId);
    const targetState = getStateById(targetStateId);
    
    if (!currentState || !targetState) return false;
    
    // Can regress to any previous state
    return targetState.orden < currentState.orden;
  };

  const getWorkflowProgress = (currentStateId: number): number => {
    if (!states) return 0;
    
    const currentState = getStateById(currentStateId);
    if (!currentState) return 0;
    
    return (currentState.orden / states.length) * 100;
  };

  return {
    states: states || [],
    isLoading,
    error,
    getStateById,
    getNextState,
    getPreviousState,
    canAdvanceToState,
    canRegressToState,
    getWorkflowProgress
  };
};