import { supabase } from '@/core/config/supabase';
import type { Proyecto, ProyectoInsert } from '../types';

export const proyectosService = {
  async getAll(): Promise<Proyecto[]> {
    const { data, error } = await supabase
      .from('proy_proyectos')
      .select('*')
      .order('fecha_inicio', { ascending: false });

    if (error) throw error;
    return data as Proyecto[];
  },

  async getActivos(): Promise<Proyecto[]> {
    const { data, error } = await supabase
      .from('proy_proyectos')
      .select('*')
      .in('estatus', ['PLANEACION', 'ACTIVO', 'EN_PAUSA'])
      .order('fecha_inicio', { ascending: false });

    if (error) throw error;
    return data as Proyecto[];
  },

  async getById(id: string): Promise<Proyecto> {
    const { data, error } = await supabase
      .from('proy_proyectos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Proyecto;
  },

  async create(proyectoData: ProyectoInsert): Promise<Proyecto> {
    // Generar código
    const { data: ultimos } = await supabase
      .from('proy_proyectos')
      .select('codigo')
      .order('created_at', { ascending: false })
      .limit(1);

    const year = new Date().getFullYear();
    const numero = ultimos && ultimos.length > 0
      ? parseInt(ultimos[0].codigo.split('-')[2]) + 1
      : 1;
    const codigo = `PROY-${year}-${numero.toString().padStart(5, '0')}`;

    const { data, error } = await supabase
      .from('proy_proyectos')
      .insert({
        ...proyectoData,
        codigo,
        estatus: 'PLANEACION',
        progreso: 0,
        costo_real: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data as Proyecto;
  },

  async update(id: string, proyectoData: Partial<Proyecto>): Promise<Proyecto> {
    const { data, error } = await supabase
      .from('proy_proyectos')
      .update(proyectoData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Proyecto;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('proy_proyectos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async cambiarEstatus(id: string, estatus: 'PLANEACION' | 'ACTIVO' | 'EN_PAUSA' | 'COMPLETADO' | 'CANCELADO'): Promise<Proyecto> {
    const updates: any = { estatus };

    if (estatus === 'COMPLETADO') {
      updates.fecha_fin_real = new Date().toISOString();
      updates.progreso = 100;
    }

    return this.update(id, updates);
  },

  async actualizarProgreso(id: string): Promise<Proyecto> {
    // Calcular progreso basado en tareas
    const { data: tareas } = await supabase
      .from('proy_tareas')
      .select('progreso')
      .eq('proyecto_id', id);

    if (tareas && tareas.length > 0) {
      const progresoTotal = tareas.reduce((sum, t) => sum + t.progreso, 0);
      const progresoPromedio = Math.round(progresoTotal / tareas.length);

      return this.update(id, { progreso: progresoPromedio });
    }

    return this.getById(id);
  },

  async getEstadisticas(id: string) {
    // Obtener estadísticas del proyecto
    const { data: tareas } = await supabase
      .from('proy_tareas')
      .select('estatus, horas_estimadas, horas_reales')
      .eq('proyecto_id', id);

    const { data: registros } = await supabase
      .from('proy_registros_tiempo')
      .select('horas, facturable, monto')
      .eq('proyecto_id', id);

    const totalTareas = tareas?.length || 0;
    const tareasCompletadas = tareas?.filter(t => t.estatus === 'COMPLETADA').length || 0;
    const horasEstimadas = tareas?.reduce((sum, t) => sum + (t.horas_estimadas || 0), 0) || 0;
    const horasReales = registros?.reduce((sum, r) => sum + r.horas, 0) || 0;
    const horasFacturables = registros?.filter(r => r.facturable).reduce((sum, r) => sum + r.horas, 0) || 0;
    const montoFacturable = registros?.filter(r => r.facturable).reduce((sum, r) => sum + (r.monto || 0), 0) || 0;

    return {
      totalTareas,
      tareasCompletadas,
      tareasPendientes: totalTareas - tareasCompletadas,
      horasEstimadas,
      horasReales,
      horasFacturables,
      montoFacturable,
      eficiencia: horasEstimadas > 0 ? Math.round((horasEstimadas / horasReales) * 100) : 0
    };
  }
};
