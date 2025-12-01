import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { isSupabaseConfiguredForRealData } from '../../../core/config/supabase';
import { DashboardMetrics } from '../types/Event';

// Mock dashboard metrics for fallback
const getMockDashboardMetrics = (): DashboardMetrics => ({
  total_eventos: 12,
  eventos_futuros: 5,
  eventos_pasados: 7,
  pagos_pendientes: 3,
  facturas_pendientes: 2,
  pagos_vencidos: 1,
  eventos_cobrados: 8,
  ingresos_totales: 237800,
  ingresos_cobrados: 139200,
  ingresos_por_cobrar: 98600,
  gastos_totales: 157800,
  utilidad_total: 80000,
  margen_promedio: 33.6,
  tasa_cobranza: 66.7,
  ratio_gastos_ingresos: 0.66
});

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      // Check if Supabase is properly configured
      if (!isSupabaseConfiguredForRealData()) {
        console.warn('⚠️ Supabase not configured for dashboard metrics, using mock data');
        return getMockDashboardMetrics();
      }

      try {
        // Test connectivity first
        const { error: connectError } = await supabase.from('vw_dashboard_metricas').select('*').limit(1);
        if (connectError) {
          console.warn('⚠️ Dashboard view not available, using mock data:', connectError.message);
          return getMockDashboardMetrics();
        }

        const { data, error } = await supabase
          .from('vw_dashboard_metricas')
          .select('*')
          .maybeSingle();

        if (error) throw error;
        return data || getMockDashboardMetrics();
      } catch (error) {
        console.warn('⚠️ Error fetching dashboard metrics, using mock data:', error);
        return getMockDashboardMetrics();
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
    retry: false, // Don't retry failed requests
  });
};