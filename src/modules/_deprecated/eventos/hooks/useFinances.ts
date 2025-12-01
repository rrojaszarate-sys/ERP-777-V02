import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financesService } from '../services/financesService';
import { Income, Expense } from '../types/Finance';

export const useIncomes = (eventId: string) => {
  const queryClient = useQueryClient();

  const incomesQuery = useQuery({
    queryKey: ['incomes', eventId],
    queryFn: () => financesService.getIncomes(eventId),
    enabled: !!eventId,
  });

  const createIncomeMutation = useMutation({
    mutationFn: (incomeData: Partial<Income>) => financesService.createIncome(incomeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', eventId] });
    },
  });

  const updateIncomeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Income> }) => 
      financesService.updateIncome(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', eventId] });
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (id: string) => financesService.deleteIncome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', eventId] });
    },
  });

  const createFromOCRMutation = useMutation({
    mutationFn: ({ ocrData, userId }: { ocrData: any; userId?: string }) => 
      financesService.createIncomeFromOCR(eventId, ocrData, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', eventId] });
    },
  });

  return {
    incomes: incomesQuery.data || [],
    isLoading: incomesQuery.isLoading,
    error: incomesQuery.error,
    refetch: incomesQuery.refetch,
    createIncome: createIncomeMutation.mutate,
    updateIncome: updateIncomeMutation.mutate,
    deleteIncome: deleteIncomeMutation.mutate,
    isCreating: createIncomeMutation.isPending,
    isUpdating: updateIncomeMutation.isPending,
    isDeleting: deleteIncomeMutation.isPending,
  };
};

export const useExpenses = (eventId: string) => {
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ['expenses', eventId],
    queryFn: () => financesService.getExpenses(eventId),
    enabled: !!eventId,
  });

  const createExpenseMutation = useMutation({
    mutationFn: (expenseData: Partial<Expense>) => {
      console.log('🚀 [useExpenses] Iniciando creación de gasto con datos:', expenseData);
      return financesService.createExpense(expenseData);
    },
    onSuccess: (data) => {
      console.log('✅ [useExpenses] Gasto creado exitosamente:', data);
      queryClient.invalidateQueries({ queryKey: ['expenses', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', eventId] });
      
      // Importar toast dinámicamente
      import('react-hot-toast').then(({ toast }) => {
        toast.success('✅ Gasto guardado correctamente');
      });
    },
    onError: (error: any) => {
      console.error('❌ [useExpenses] Error al crear gasto:', error);
      console.error('❌ [useExpenses] Tipo de error:', typeof error);
      console.error('❌ [useExpenses] Error.message:', error?.message);
      console.error('❌ [useExpenses] Error.code:', error?.code);
      console.error('❌ [useExpenses] Error completo:', error);
      
      // Extraer mensaje de error
      let errorMessage = 'Error desconocido al guardar el gasto';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Importar toast dinámicamente
      import('react-hot-toast').then(({ toast }) => {
        toast.error(`❌ Error al guardar: ${errorMessage}`);
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expense> }) => 
      financesService.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', eventId] });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: ({ id, reason, userId }: { id: string; reason?: string; userId?: string }) => 
      financesService.deleteExpense(id, reason, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', eventId] });
    },
  });

  const createFromOCRMutation = useMutation({
    mutationFn: ({ ocrData, userId }: { ocrData: any; userId?: string }) => 
      financesService.createExpenseFromOCR(eventId, ocrData, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', eventId] });
    },
  });

  return {
    expenses: expensesQuery.data || [],
    isLoading: expensesQuery.isLoading,
    error: expensesQuery.error,
    refetch: expensesQuery.refetch,
    createExpense: createExpenseMutation.mutate,
    updateExpense: updateExpenseMutation.mutate,
    deleteExpense: deleteExpenseMutation.mutate,
    isCreating: createExpenseMutation.isPending,
    isUpdating: updateExpenseMutation.isPending,
    isDeleting: deleteExpenseMutation.isPending,
  };
};

export const useExpenseCategories = () => {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => financesService.getExpenseCategories(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useFinancialSummary = (eventId: string) => {
  return useQuery({
    queryKey: ['financial-summary', eventId],
    queryFn: () => financesService.getFinancialSummary(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useExpenseAnalytics = (eventId?: string) => {
  return useQuery({
    queryKey: ['expense-analytics', eventId],
    queryFn: () => financesService.getExpenseAnalytics(eventId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useIncomeAnalytics = (eventId?: string) => {
  return useQuery({
    queryKey: ['income-analytics', eventId],
    queryFn: () => financesService.getIncomeAnalytics(eventId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};