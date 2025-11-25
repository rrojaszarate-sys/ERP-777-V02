import { supabase } from '@/core/config/supabase';
import type { RegistroTiempo, RegistroTiempoInsert } from '../types';

export const registrosTiempoService = {
  async getAll(): Promise<RegistroTiempo[]> {
    const { data, error } = await supabase
      .from('proy_registros_tiempo')
      .select(`
        *,
        proyecto:proy_proyectos(*),
        tarea:proy_tareas(*)
      `)
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data as RegistroTiempo[];
  },

  async getByProyecto(proyectoId: string): Promise<RegistroTiempo[]> {
    const { data, error } = await supabase
      .from('proy_registros_tiempo')
      .select(`
        *,
        tarea:proy_tareas(*)
      `)
      .eq('proyecto_id', proyectoId)
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data as RegistroTiempo[];
  },

  async getByTarea(tareaId: string): Promise<RegistroTiempo[]> {
    const { data, error } = await supabase
      .from('proy_registros_tiempo')
      .select('*')
      .eq('tarea_id', tareaId)
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data as RegistroTiempo[];
  },

  async getByUsuario(usuarioId: string, fechaInicio?: string, fechaFin?: string): Promise<RegistroTiempo[]> {
    let query = supabase
      .from('proy_registros_tiempo')
      .select(`
        *,
        proyecto:proy_proyectos(*),
        tarea:proy_tareas(*)
      `)
      .eq('usuario_id', usuarioId);

    if (fechaInicio) query = query.gte('fecha', fechaInicio);
    if (fechaFin) query = query.lte('fecha', fechaFin);

    const { data, error } = await query.order('fecha', { ascending: false });

    if (error) throw error;
    return data as RegistroTiempo[];
  },

  async create(registroData: RegistroTiempoInsert): Promise<RegistroTiempo> {
    const monto = registroData.facturable && registroData.tarifa_hora
      ? registroData.horas * registroData.tarifa_hora
      : 0;

    const { data, error } = await supabase
      .from('proy_registros_tiempo')
      .insert({
        ...registroData,
        facturable: registroData.facturable || false,
        facturado: false,
        monto
      })
      .select()
      .single();

    if (error) throw error;

    // Actualizar horas reales de la tarea si existe
    if (registroData.tarea_id) {
      const { tareasService } = await import('./tareasService');
      await tareasService.actualizarHorasReales(registroData.tarea_id);
    }

    return data as RegistroTiempo;
  },

  async update(id: string, registroData: Partial<RegistroTiempo>): Promise<RegistroTiempo> {
    // Recalcular monto si cambió horas o tarifa
    if (registroData.horas || registroData.tarifa_hora) {
      const { data: current } = await supabase
        .from('proy_registros_tiempo')
        .select('horas, tarifa_hora, facturable')
        .eq('id', id)
        .single();

      if (current && current.facturable) {
        const horas = registroData.horas || current.horas;
        const tarifa = registroData.tarifa_hora || current.tarifa_hora || 0;
        registroData.monto = horas * tarifa;
      }
    }

    const { data, error } = await supabase
      .from('proy_registros_tiempo')
      .update(registroData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as RegistroTiempo;
  },

  async delete(id: string): Promise<void> {
    // Obtener tarea_id antes de eliminar para actualizar horas
    const { data: registro } = await supabase
      .from('proy_registros_tiempo')
      .select('tarea_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('proy_registros_tiempo')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Actualizar horas reales de la tarea
    if (registro?.tarea_id) {
      const { tareasService } = await import('./tareasService');
      await tareasService.actualizarHorasReales(registro.tarea_id);
    }
  }
};
