import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import { iaService } from '../services/iaService';
import toast from 'react-hot-toast';
import type { Workflow } from '../types';

export const usePredicciones = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['predicciones', user?.company_id],
    queryFn: () => iaService.fetchPredicciones(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useWorkflows = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workflows', user?.company_id],
    queryFn: () => iaService.fetchWorkflows(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (workflow: Partial<Workflow>) =>
      iaService.createWorkflow({ ...workflow, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow creado');
    }
  });
};
