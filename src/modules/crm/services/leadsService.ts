import { supabase } from '@/core/config/supabase';
import type { Lead, LeadInsert } from '../types';

export const leadsService = {
  async getAll(): Promise<Lead[]> {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Lead[];
  },

  async getById(id: string): Promise<Lead> {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Lead;
  },

  async create(leadData: LeadInsert): Promise<Lead> {
    // Generar código automático
    const { data: ultimos } = await supabase
      .from('crm_leads')
      .select('codigo')
      .order('created_at', { ascending: false })
      .limit(1);

    const year = new Date().getFullYear();
    const numero = ultimos && ultimos.length > 0
      ? parseInt(ultimos[0].codigo.split('-')[2]) + 1
      : 1;
    const codigo = `LEAD-${year}-${numero.toString().padStart(6, '0')}`;

    const { data, error } = await supabase
      .from('crm_leads')
      .insert({
        ...leadData,
        codigo,
        estatus: 'NUEVO',
        puntuacion: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  },

  async update(id: string, leadData: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase
      .from('crm_leads')
      .update(leadData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('crm_leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async calificar(id: string, calificacion: 'FRIO' | 'TIBIO' | 'CALIENTE'): Promise<Lead> {
    const puntuacion = calificacion === 'FRIO' ? 30 : calificacion === 'TIBIO' ? 60 : 90;

    return this.update(id, {
      calificacion,
      puntuacion,
      estatus: 'CALIFICADO',
      fecha_calificacion: new Date().toISOString()
    });
  },

  async convertir(id: string, clienteId: string): Promise<Lead> {
    return this.update(id, {
      estatus: 'CONVERTIDO',
      fecha_conversion: new Date().toISOString()
    });
  }
};
