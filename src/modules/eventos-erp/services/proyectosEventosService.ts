// ============================================
// SERVICIO DE PROYECTOS PARA EVENTOS-ERP
// ============================================

import { supabase } from '../../../core/config/supabase';
import type {
  Proyecto,
  Tarea,
  MiembroEquipo,
  MetricasProyecto,
  FiltrosProyecto,
  FiltrosTarea,
  Hito,
  DocumentoProyecto
} from '../types/Proyecto';

class ProyectosEventosService {
  // ============================================
  // PROYECTOS
  // ============================================

  async fetchProyectos(companyId: string, filtros?: FiltrosProyecto): Promise<Proyecto[]> {
    let query = supabase
      .from('proyectos_eventos_erp')
      .select(`
        *,
        cliente:clientes_eventos(id, razon_social, rfc),
        responsable:users(id, email),
        tareas:tareas_proyectos_erp(count)
      `)
      .eq('company_id', companyId);

    if (filtros?.status) query = query.eq('status', filtros.status);
    if (filtros?.cliente_id) query = query.eq('cliente_id', filtros.cliente_id);
    if (filtros?.responsable_id) query = query.eq('responsable_id', filtros.responsable_id);
    if (filtros?.evento_id) query = query.eq('evento_id', filtros.evento_id);
    if (filtros?.busqueda) {
      query = query.or(`nombre.ilike.%${filtros.busqueda}%,descripcion.ilike.%${filtros.busqueda}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async fetchProyectoById(id: number): Promise<Proyecto> {
    const { data, error } = await supabase
      .from('proyectos_eventos_erp')
      .select(`
        *,
        cliente:clientes_eventos(id, razon_social, rfc, email, telefono),
        responsable:users(id, email),
        tareas:tareas_proyectos_erp(*),
        equipo:equipo_proyectos_erp(*, usuario:users(id, email)),
        documentos:documentos_proyectos_erp(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async fetchProyectosPorEvento(eventoId: number): Promise<Proyecto[]> {
    const { data, error } = await supabase
      .from('proyectos_eventos_erp')
      .select('*, tareas:tareas_proyectos_erp(count)')
      .eq('evento_id', eventoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createProyecto(proyecto: Partial<Proyecto>): Promise<Proyecto> {
    const { data, error } = await supabase
      .from('proyectos_eventos_erp')
      .insert([proyecto])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProyecto(id: number, proyecto: Partial<Proyecto>): Promise<Proyecto> {
    const { data, error } = await supabase
      .from('proyectos_eventos_erp')
      .update(proyecto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProyecto(id: number): Promise<void> {
    const { error } = await supabase
      .from('proyectos_eventos_erp')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // TAREAS
  // ============================================

  async fetchTareas(filtros?: FiltrosTarea): Promise<Tarea[]> {
    let query = supabase
      .from('tareas_proyectos_erp')
      .select(`
        *,
        asignado:users(id, email),
        comentarios:comentarios_tareas_erp(count)
      `);

    if (filtros?.proyecto_id) query = query.eq('proyecto_id', filtros.proyecto_id);
    if (filtros?.status) query = query.eq('status', filtros.status);
    if (filtros?.asignado_a) query = query.eq('asignado_a', filtros.asignado_a);
    if (filtros?.prioridad) query = query.eq('prioridad', filtros.prioridad);
    if (filtros?.busqueda) {
      query = query.or(`nombre.ilike.%${filtros.busqueda}%,descripcion.ilike.%${filtros.busqueda}%`);
    }

    const { data, error } = await query.order('fecha_inicio', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async fetchTareaById(id: number): Promise<Tarea> {
    const { data, error } = await supabase
      .from('tareas_proyectos_erp')
      .select(`
        *,
        asignado:users(id, email),
        comentarios:comentarios_tareas_erp(*, usuario:users(id, email)),
        archivos_adjuntos:archivos_tareas_erp(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createTarea(tarea: Partial<Tarea>): Promise<Tarea> {
    const { data, error } = await supabase
      .from('tareas_proyectos_erp')
      .insert([tarea])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTarea(id: number, tarea: Partial<Tarea>): Promise<Tarea> {
    const { data, error } = await supabase
      .from('tareas_proyectos_erp')
      .update(tarea)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTarea(id: number): Promise<void> {
    const { error } = await supabase
      .from('tareas_proyectos_erp')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // EQUIPO
  // ============================================

  async fetchEquipo(proyectoId: number): Promise<MiembroEquipo[]> {
    const { data, error } = await supabase
      .from('equipo_proyectos_erp')
      .select('*, usuario:users(id, email)')
      .eq('proyecto_id', proyectoId)
      .eq('activo', true)
      .order('fecha_asignacion', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async addMiembroEquipo(miembro: Partial<MiembroEquipo>): Promise<MiembroEquipo> {
    const { data, error } = await supabase
      .from('equipo_proyectos_erp')
      .insert([miembro])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeMiembroEquipo(id: number): Promise<void> {
    const { error } = await supabase
      .from('equipo_proyectos_erp')
      .update({ activo: false })
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // HITOS
  // ============================================

  async fetchHitos(proyectoId: number): Promise<Hito[]> {
    const { data, error } = await supabase
      .from('hitos_proyectos_erp')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .order('fecha_objetivo', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createHito(hito: Partial<Hito>): Promise<Hito> {
    const { data, error } = await supabase
      .from('hitos_proyectos_erp')
      .insert([hito])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateHito(id: number, hito: Partial<Hito>): Promise<Hito> {
    const { data, error } = await supabase
      .from('hitos_proyectos_erp')
      .update(hito)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async marcarHitoCompletado(id: number): Promise<Hito> {
    const { data, error } = await supabase
      .from('hitos_proyectos_erp')
      .update({
        completado: true,
        fecha_completado: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================
  // DOCUMENTOS
  // ============================================

  async fetchDocumentos(proyectoId: number): Promise<DocumentoProyecto[]> {
    const { data, error } = await supabase
      .from('documentos_proyectos_erp')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async uploadDocumento(documento: Partial<DocumentoProyecto>): Promise<DocumentoProyecto> {
    const { data, error } = await supabase
      .from('documentos_proyectos_erp')
      .insert([documento])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================
  // MÉTRICAS
  // ============================================

  async fetchMetricasProyectos(companyId: string): Promise<MetricasProyecto> {
    const { data: proyectos, error: pError } = await supabase
      .from('proyectos_eventos_erp')
      .select('*')
      .eq('company_id', companyId);

    if (pError) throw pError;

    const { data: tareas, error: tError } = await supabase
      .from('tareas_proyectos_erp')
      .select('*')
      .in('proyecto_id', proyectos?.map(p => p.id) || []);

    if (tError) throw tError;

    const activos = proyectos?.filter(p => p.status === 'en_progreso').length || 0;
    const completados = proyectos?.filter(p => p.status === 'completado').length || 0;
    const retrasados = proyectos?.filter(p => {
      if (p.status === 'completado') return false;
      return new Date(p.fecha_fin_estimada) < new Date();
    }).length || 0;

    const tareasPendientes = tareas?.filter(t => t.status === 'pendiente').length || 0;
    const tareasEnProgreso = tareas?.filter(t => t.status === 'en_progreso').length || 0;
    const tareasCompletadas = tareas?.filter(t => t.status === 'completada').length || 0;

    const horasEstimadas = tareas?.reduce((sum, t) => sum + t.horas_estimadas, 0) || 0;
    const horasReales = tareas?.reduce((sum, t) => sum + t.horas_reales, 0) || 0;
    const presupuestoTotal = proyectos?.reduce((sum, p) => sum + p.presupuesto, 0) || 0;
    const costoRealTotal = proyectos?.reduce((sum, p) => sum + p.costo_real, 0) || 0;

    const eficienciaPromedio = horasReales > 0
      ? Math.round((horasEstimadas / horasReales) * 100)
      : 100;

    return {
      proyectos_activos: activos,
      proyectos_completados: completados,
      proyectos_retrasados: retrasados,
      tareas_pendientes: tareasPendientes,
      tareas_en_progreso: tareasEnProgreso,
      tareas_completadas: tareasCompletadas,
      horas_estimadas_total: horasEstimadas,
      horas_reales_total: horasReales,
      presupuesto_total: presupuestoTotal,
      costo_real_total: costoRealTotal,
      eficiencia_promedio: eficienciaPromedio
    };
  }
}

export const proyectosEventosService = new ProyectosEventosService();
