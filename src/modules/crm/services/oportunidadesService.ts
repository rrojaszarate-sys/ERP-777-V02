import { supabase } from '@/core/config/supabase';
import type { Oportunidad, OportunidadInsert } from '../types';

export const oportunidadesService = {
  async getAll(): Promise<Oportunidad[]> {
    const { data, error } = await supabase
      .from('crm_oportunidades')
      .select(`
        *,
        lead:crm_leads(*),
        etapa:crm_etapas_pipeline(*)
      `)
      .order('fecha_estimada_cierre', { ascending: true });

    if (error) throw error;
    return data as Oportunidad[];
  },

  async getById(id: string): Promise<Oportunidad> {
    const { data, error } = await supabase
      .from('crm_oportunidades')
      .select(`
        *,
        lead:crm_leads(*),
        etapa:crm_etapas_pipeline(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Oportunidad;
  },

  async create(oportunidadData: OportunidadInsert): Promise<Oportunidad> {
    // Generar código automático
    const { data: ultimos } = await supabase
      .from('crm_oportunidades')
      .select('codigo')
      .order('created_at', { ascending: false })
      .limit(1);

    const year = new Date().getFullYear();
    const numero = ultimos && ultimos.length > 0
      ? parseInt(ultimos[0].codigo.split('-')[2]) + 1
      : 1;
    const codigo = `OPP-${year}-${numero.toString().padStart(6, '0')}`;

    const { data, error } = await supabase
      .from('crm_oportunidades')
      .insert({
        ...oportunidadData,
        codigo,
        estatus: 'NUEVA'
      })
      .select()
      .single();

    if (error) throw error;
    return this.getById(data.id);
  },

  async update(id: string, oportunidadData: Partial<Oportunidad>): Promise<Oportunidad> {
    const { data, error } = await supabase
      .from('crm_oportunidades')
      .update(oportunidadData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.getById(data.id);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('crm_oportunidades')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async moverEtapa(id: string, etapaId: string): Promise<Oportunidad> {
    // Obtener probabilidad de la nueva etapa
    const { data: etapa } = await supabase
      .from('crm_etapas_pipeline')
      .select('probabilidad_default')
      .eq('id', etapaId)
      .single();

    return this.update(id, {
      etapa_id: etapaId,
      probabilidad_cierre: etapa?.probabilidad_default
    });
  },

  async ganar(id: string, eventoId?: string): Promise<Oportunidad> {
    return this.update(id, {
      estatus: 'GANADA',
      probabilidad_cierre: 100,
      fecha_cierre_real: new Date().toISOString(),
      evento_id: eventoId
    });
  },

  async perder(id: string, motivo: string): Promise<Oportunidad> {
    return this.update(id, {
      estatus: 'PERDIDA',
      probabilidad_cierre: 0,
      fecha_cierre_real: new Date().toISOString(),
      motivo_perdida: motivo
    });
  }
};
