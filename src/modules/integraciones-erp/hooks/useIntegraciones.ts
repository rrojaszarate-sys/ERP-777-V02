import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import { integracionesService } from '../services/integracionesService';
import toast from 'react-hot-toast';
import type { ConfiguracionIntegracion } from '../types';

export const useIntegraciones = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['integraciones', user?.company_id],
    queryFn: () => integracionesService.fetchIntegraciones(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateIntegracion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (config: Partial<ConfiguracionIntegracion>) =>
      integracionesService.createIntegracion({ ...config, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integraciones'] });
      toast.success('Integración creada');
    }
  });
};

export const useLogs = (configuracionId?: number) => {
  return useQuery({
    queryKey: ['logs-integraciones', configuracionId],
    queryFn: () => integracionesService.fetchLogs(configuracionId)
  });
};
