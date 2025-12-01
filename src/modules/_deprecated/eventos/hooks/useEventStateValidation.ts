import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEventStateFlow, EventState } from './useEventStates';
import { workflowService } from '../services/workflowService';
import { useAuth } from '../../../core/auth/AuthProvider';
import toast from 'react-hot-toast';
import { workflowLogger } from '../../../core/utils/logger';

export const useEventStateValidation = (eventId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { states, getNextState } = useEventStateFlow();
  
  // Memoize the current event data to avoid re-fetching inside the hook
  const currentEvent = useMemo(() => queryClient.getQueryData<any>(['evento', eventId]), [queryClient, eventId]);

  const [isUpdatingState, setIsUpdatingState] = useState(false);

  const validateAdvancement = useCallback(
    async (targetStateId: number) => {
      if (!eventId) {
        return { valid: false, errors: ['ID de evento no válido'] };
      }

      if (!currentEvent) {
        return { valid: false, errors: ['Evento no encontrado'] };
      }

      return workflowService.validateStateTransition(
        parseInt(eventId, 10),
        currentEvent.estado_id,
        targetStateId
      );
    },
    [eventId]
  );

  const updateEventState = useCallback(
    async (newStateId: number, validationData?: any) => {
      if (!user?.id) {
        toast.error('No se pudo identificar al usuario para realizar el cambio.');
        return;
      }
      setIsUpdatingState(true);
      try {
        await workflowService.changeEventState(
          parseInt(eventId),
          newStateId,
          user.id,
          validationData
        );
        toast.success('Estado del evento actualizado correctamente.');
        // Invalidate queries to refetch data across the app
        await queryClient.invalidateQueries({ queryKey: ['evento', eventId.toString()] });
        await queryClient.invalidateQueries({ queryKey: ['eventos'] });
      } catch (error) {
        workflowLogger.error('Error al actualizar el estado del evento', error);
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el estado.');
        throw error; // Re-throw so the calling component knows about the error
      } finally {
        setIsUpdatingState(false);
      }
    },
    [eventId, user, queryClient]
  );

  const nextValidState = useMemo(() => {
    if (!currentEvent || !states) return null;
    return getNextState(currentEvent.estado_id);
  }, [currentEvent, states, getNextState]);

  return {
    nextValidState,
    validateAdvancement,
    updateEventState,
    isUpdatingState,
  };
};