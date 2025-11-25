import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingStateService, AccountingStateResult, IncomeValidation } from '../../../services/accountingStateService';
import { useAuth } from '../../../core/auth/AuthProvider';

export const useAccountingStates = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get dashboard metrics for accounting states
  const dashboardQuery = useQuery({
    queryKey: ['accounting-state-dashboard'],
    queryFn: () => accountingStateService.getAccountingStateDashboard(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });

  // Get events needing review
  const eventsNeedingReviewQuery = useQuery({
    queryKey: ['events-needing-review'],
    queryFn: () => accountingStateService.getEventsNeedingReview(),
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
  });

  // Get overdue payments
  const overduePaymentsQuery = useQuery({
    queryKey: ['overdue-payments'],
    queryFn: () => accountingStateService.getOverduePaymentsReport(),
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
  });

  // Calculate state for specific event
  const calculateStateMutation = useMutation({
    mutationFn: (eventId: string) => accountingStateService.calculateEventAccountingState(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-state-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['events-needing-review'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  // Recalculate all closed events
  const recalculateAllMutation = useMutation({
    mutationFn: () => accountingStateService.recalculateAllClosedEvents(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-state-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['events-needing-review'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  // Update income payment status
  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ 
      incomeId, 
      updates 
    }: { 
      incomeId: string; 
      updates: any;
    }) => accountingStateService.updateIncomePaymentStatus(incomeId, updates, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-state-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-payments'] });
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });

  // Mark income as paid
  const markAsPaidMutation = useMutation({
    mutationFn: ({ 
      incomeId, 
      paymentData 
    }: { 
      incomeId: string; 
      paymentData: any;
    }) => accountingStateService.markIncomeAsPaid(incomeId, paymentData, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-state-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-payments'] });
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });

  // Set payment commitment date
  const setCommitmentDateMutation = useMutation({
    mutationFn: ({ 
      incomeId, 
      commitmentDate 
    }: { 
      incomeId: string; 
      commitmentDate: string;
    }) => accountingStateService.setPaymentCommitmentDate(incomeId, commitmentDate, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-state-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-payments'] });
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });

  return {
    // Data
    dashboard: dashboardQuery.data,
    eventsNeedingReview: eventsNeedingReviewQuery.data || [],
    overduePayments: overduePaymentsQuery.data || [],
    
    // Loading states
    isDashboardLoading: dashboardQuery.isLoading,
    isEventsLoading: eventsNeedingReviewQuery.isLoading,
    isOverdueLoading: overduePaymentsQuery.isLoading,
    
    // Mutations
    calculateEventState: calculateStateMutation.mutate,
    recalculateAllEvents: recalculateAllMutation.mutate,
    updatePaymentStatus: updatePaymentStatusMutation.mutate,
    markAsPaid: markAsPaidMutation.mutate,
    setCommitmentDate: setCommitmentDateMutation.mutate,
    
    // Mutation states
    isCalculating: calculateStateMutation.isPending,
    isRecalculating: recalculateAllMutation.isPending,
    isUpdatingPayment: updatePaymentStatusMutation.isPending,
    
    // Refetch functions
    refetchDashboard: dashboardQuery.refetch,
    refetchEvents: eventsNeedingReviewQuery.refetch,
    refetchOverdue: overduePaymentsQuery.refetch,
  };
};

export const useEventAccountingValidation = (eventId: string) => {
  return useQuery({
    queryKey: ['event-accounting-validation', eventId],
    queryFn: () => accountingStateService.validateEventStateTransition(eventId, 'Pagados'),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
};

export const useEventsByAccountingState = (stateName: string) => {
  return useQuery({
    queryKey: ['events-by-accounting-state', stateName],
    queryFn: () => accountingStateService.getEventsByAccountingState(stateName),
    enabled: !!stateName,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};