import { supabase } from '@/core/config/supabase';
import type { Tarea, TareaInsert } from '../types';

export const tareasService = {
  async getAll(): Promise<Tarea[]> {
    const { data, error } = await supabase
      .from('proy_tareas')
      .select(`
        *,
        proyecto:proy_proyectos(*)
      `)
      .order('orden');

    if (error) throw error;
    return data as Tarea[];
  },

  async getByProyecto(proyectoId: string): Promise<Tarea[]> {
    const { data, error } = await supabase
      .from('proy_tareas')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .order('orden');

    if (error) throw error;
    return data as Tarea[];
  },

  async getById(id: string): Promise<Tarea> {
    const { data, error } = await supabase
      .from('proy_tareas')
      .select(`
        *,
        proyecto:proy_proyectos(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Tarea;
  },

  async create(tareaData: TareaInsert): Promise<Tarea> {
    // Obtener siguiente orden
    const { data: ultimas } = await supabase
      .from('proy_tareas')
      .select('orden, codigo')
      .eq('proyecto_id', tareaData.proyecto_id)
      .order('orden', { ascending: false })
      .limit(1);

    const orden = ultimas && ultimas.length > 0 ? ultimas[0].orden + 1 : 1;

    // Generar código
    const numero = ultimas && ultimas.length > 0
      ? parseInt(ultimas[0].codigo.split('-')[2]) + 1
      : 1;
    const codigo = `TAR-${tareaData.proyecto_id.substring(0, 8)}-${numero.toString().padStart(4, '0')}`;

    const { data, error } = await supabase
      .from('proy_tareas')
      .insert({
        ...tareaData,
        codigo,
        orden,
        estatus: 'PENDIENTE',
        progreso: 0,
        horas_reales: 0
      })
      .select()
      .single();

    if (error) throw error;
    return this.getById(data.id);
  },

  async update(id: string, tareaData: Partial<Tarea>): Promise<Tarea> {
    const { data, error } = await supabase
      .from('proy_tareas')
      .update(tareaData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.getById(data.id);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('proy_tareas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async cambiarEstatus(id: string, estatus: 'PENDIENTE' | 'EN_PROGRESO' | 'EN_REVISION' | 'COMPLETADA' | 'CANCELADA'): Promise<Tarea> {
    const updates: any = { estatus };

    if (estatus === 'COMPLETADA') {
      updates.fecha_fin_real = new Date().toISOString();
      updates.progreso = 100;
    } else if (estatus === 'EN_PROGRESO' && !updates.fecha_inicio) {
      updates.fecha_inicio = new Date().toISOString();
    }

    return this.update(id, updates);
  },

  async actualizarHorasReales(tareaId: string): Promise<Tarea> {
    // Sumar todas las horas registradas para esta tarea
    const { data: registros } = await supabase
      .from('proy_registros_tiempo')
      .select('horas')
      .eq('tarea_id', tareaId);

    const horasReales = registros?.reduce((sum, r) => sum + r.horas, 0) || 0;

    return this.update(tareaId, { horas_reales: horasReales });
  }
};
