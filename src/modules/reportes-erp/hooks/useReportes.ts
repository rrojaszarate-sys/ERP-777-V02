import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import { reportesService } from '../services/reportesService';
import toast from 'react-hot-toast';
import type { ReportePersonalizado } from '../types';

export const useReportes = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reportes', user?.company_id],
    queryFn: () => reportesService.fetchReportes(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateReporte = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (reporte: Partial<ReportePersonalizado>) =>
      reportesService.createReporte({ ...reporte, company_id: user!.company_id, created_by: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes'] });
      toast.success('Reporte creado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear reporte');
    }
  });
};

export const useMetricasBI = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['metricas-bi', user?.company_id],
    queryFn: () => reportesService.fetchMetricasBI(user!.company_id!),
    enabled: !!user?.company_id
  });
};
