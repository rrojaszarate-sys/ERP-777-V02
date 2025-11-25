import { supabase } from '@/core/config/supabase';
import type { Actividad, ActividadInsert } from '../types';

export const actividadesService = {
  async getAll(): Promise<Actividad[]> {
    const { data, error } = await supabase
      .from('crm_actividades')
      .select(`
        *,
        lead:crm_leads(*),
        oportunidad:crm_oportunidades(*)
      `)
      .order('fecha_programada', { ascending: true });

    if (error) throw error;
    return data as Actividad[];
  },

  async getByLead(leadId: string): Promise<Actividad[]> {
    const { data, error } = await supabase
      .from('crm_actividades')
      .select('*')
      .eq('lead_id', leadId)
      .order('fecha_programada', { ascending: false });

    if (error) throw error;
    return data as Actividad[];
  },

  async getByOportunidad(oportunidadId: string): Promise<Actividad[]> {
    const { data, error } = await supabase
      .from('crm_actividades')
      .select('*')
      .eq('oportunidad_id', oportunidadId)
      .order('fecha_programada', { ascending: false });

    if (error) throw error;
    return data as Actividad[];
  },

  async create(actividadData: ActividadInsert): Promise<Actividad> {
    const { data, error } = await supabase
      .from('crm_actividades')
      .insert({
        ...actividadData,
        estatus: 'PENDIENTE'
      })
      .select()
      .single();

    if (error) throw error;
    return data as Actividad;
  },

  async update(id: string, actividadData: Partial<Actividad>): Promise<Actividad> {
    const { data, error } = await supabase
      .from('crm_actividades')
      .update(actividadData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Actividad;
  },

  async completar(id: string, resultado?: string): Promise<Actividad> {
    return this.update(id, {
      estatus: 'COMPLETADA',
      fecha_completada: new Date().toISOString(),
      resultado
    });
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('crm_actividades')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
