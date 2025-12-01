import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';

export interface CuentaContable {
  id: number;
  company_id?: string;
  codigo: string;
  nombre: string;
  tipo: 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto';
  descripcion?: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export const useCuentasContables = () => {
  return useQuery({
    queryKey: ['cuentas-contables'],
    queryFn: async (): Promise<CuentaContable[]> => {
      const { data, error } = await supabase
        .from('evt_cuentas_contables')
        .select('*')
        .eq('activa', true)
        .order('codigo');

      if (error) {
        console.error('Error al obtener cuentas contables:', error);
        throw error;
      }

      return data || [];
    }
  });
};