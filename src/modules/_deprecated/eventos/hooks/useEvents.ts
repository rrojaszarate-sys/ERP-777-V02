import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '../services/eventsService';
import { Event, EventoCompleto } from '../types/Event';
import { supabase } from '../../../core/config/supabase';
import { v4 as uuidv4 } from 'uuid';
export { useClients, useClientEvents, useClientStats } from './useClients';
export const useEvents = (filters?: any) => {
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      try {
        return await eventsService.getEvents(filters);
      } catch (error) {
        console.warn('⚠️ Error fetching events from Supabase:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry failed requests to avoid multiple error logs
  });

  const createEventMutation = useMutation({
    mutationFn: (eventData: Partial<Event>) => eventsService.createEvent(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) => 
      eventsService.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => eventsService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  return {
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    refetch: eventsQuery.refetch,
    createEvent: createEventMutation.mutate,
    updateEvent: updateEventMutation.mutate,
    deleteEvent: deleteEventMutation.mutate,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };
};

export const useEvent = (id: string) => {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsService.getEventById(id),
    enabled: !!id,
  });
};

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => eventsService.getDashboardMetrics(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
};

export const useTemporalAnalysis = (months: number = 6) => {
  return useQuery({
    queryKey: ['temporal-analysis', months],
    queryFn: () => eventsService.getTemporalAnalysis(months),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useExpensesByCategory = () => {
  return useQuery({
    queryKey: ['expenses-by-category'],
    queryFn: () => eventsService.getExpensesByCategory(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
