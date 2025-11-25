import { supabase } from '../../../core/config/supabase';
import type { Prediccion, Workflow } from '../types';

export const fetchPredicciones = async (companyId: string) => {
  const { data, error } = await supabase
    .from('ia_predicciones')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as Prediccion[];
};

export const fetchWorkflows = async (companyId: string) => {
  const { data, error } = await supabase
    .from('auto_workflows')
    .select('*')
    .eq('company_id', companyId)
    .order('nombre');

  if (error) throw error;
  return data as Workflow[];
};

export const createWorkflow = async (workflow: Partial<Workflow>) => {
  const { data, error } = await supabase
    .from('auto_workflows')
    .insert([workflow])
    .select()
    .single();

  if (error) throw error;
  return data as Workflow;
};

export const iaService = {
  fetchPredicciones,
  fetchWorkflows,
  createWorkflow
};
