import { supabase } from '../../../core/config/supabase';
import type { ConfiguracionIntegracion, LogIntegracion } from '../types';

export const fetchIntegraciones = async (companyId: string) => {
  const { data, error } = await supabase
    .from('int_configuraciones')
    .select('*')
    .eq('company_id', companyId)
    .order('nombre');

  if (error) throw error;
  return data as ConfiguracionIntegracion[];
};

export const createIntegracion = async (config: Partial<ConfiguracionIntegracion>) => {
  const { data, error } = await supabase
    .from('int_configuraciones')
    .insert([config])
    .select()
    .single();

  if (error) throw error;
  return data as ConfiguracionIntegracion;
};

export const fetchLogs = async (configuracionId?: number) => {
  let query = supabase
    .from('int_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (configuracionId) {
    query = query.eq('configuracion_id', configuracionId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as LogIntegracion[];
};

export const integracionesService = {
  fetchIntegraciones,
  createIntegracion,
  fetchLogs
};
