// ============================================
// SERVICIOS DEL MÓDULO DE PROYECTOS
// ============================================

import { supabase } from '../../../core/config/supabase';
import type {
  Proyecto,
  Tarea,
  MiembroEquipo,
  FiltrosProyecto,
  FiltrosTarea,
  MetricasProyecto
} from '../types';

// ============================================
// PROYECTOS
// ============================================

export const fetchProyectos = async (companyId: string, filters?: FiltrosProyecto) => {
  let query = supabase
    .from('proy_proyectos')
    .select(`
      *,
      cliente:crm_clientes(*)
    `)
    .eq('company_id', companyId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.cliente_id) {
    query = query.eq('cliente_id', filters.cliente_id);
  }

  if (filters?.responsable_id) {
    query = query.eq('responsable_id', filters.responsable_id);
  }

  if (filters?.fecha_inicio) {
    query = query.gte('fecha_inicio', filters.fecha_inicio);
  }

  if (filters?.fecha_fin) {
    query = query.lte('fecha_fin_estimada', filters.fecha_fin);
  }

  if (filters?.busqueda) {
    query = query.or(`nombre.ilike.%${filters.busqueda}%,descripcion.ilike.%${filters.busqueda}%`);
  }

  query = query.order('fecha_inicio', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data as Proyecto[];
};

export const fetchProyectoById = async (id: number) => {
  const { data, error } = await supabase
    .from('proy_proyectos')
    .select(`
      *,
      cliente:crm_clientes(*),
      tareas:proy_tareas(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Proyecto;
};

export const createProyecto = async (proyecto: Partial<Proyecto>) => {
  const { data, error } = await supabase
    .from('proy_proyectos')
    .insert([proyecto])
    .select()
    .single();

  if (error) throw error;
  return data as Proyecto;
};

export const updateProyecto = async (id: number, proyecto: Partial<Proyecto>) => {
  const { data, error } = await supabase
    .from('proy_proyectos')
    .update(proyecto)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Proyecto;
};

export const deleteProyecto = async (id: number) => {
  const { error } = await supabase
    .from('proy_proyectos')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============================================
// TAREAS
// ============================================

export const fetchTareas = async (filters?: FiltrosTarea) => {
  let query = supabase
    .from('proy_tareas')
    .select('*');

  if (filters?.proyecto_id) {
    query = query.eq('proyecto_id', filters.proyecto_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.asignado_a) {
    query = query.eq('asignado_a', filters.asignado_a);
  }

  if (filters?.prioridad) {
    query = query.eq('prioridad', filters.prioridad);
  }

  if (filters?.fecha_inicio) {
    query = query.gte('fecha_inicio', filters.fecha_inicio);
  }

  if (filters?.fecha_fin) {
    query = query.lte('fecha_fin', filters.fecha_fin);
  }

  if (filters?.busqueda) {
    query = query.or(`nombre.ilike.%${filters.busqueda}%,descripcion.ilike.%${filters.busqueda}%`);
  }

  query = query.order('fecha_inicio');

  const { data, error } = await query;
  if (error) throw error;
  return data as Tarea[];
};

export const fetchTareaById = async (id: number) => {
  const { data, error } = await supabase
    .from('proy_tareas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Tarea;
};

export const createTarea = async (tarea: Partial<Tarea>) => {
  const { data, error } = await supabase
    .from('proy_tareas')
    .insert([tarea])
    .select()
    .single();

  if (error) throw error;
  return data as Tarea;
};

export const updateTarea = async (id: number, tarea: Partial<Tarea>) => {
  const { data, error } = await supabase
    .from('proy_tareas')
    .update(tarea)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Tarea;
};

export const deleteTarea = async (id: number) => {
  const { error } = await supabase
    .from('proy_tareas')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============================================
// EQUIPO DE PROYECTO
// ============================================

export const fetchMiembrosEquipo = async (proyectoId: number) => {
  const { data, error } = await supabase
    .from('proy_equipo')
    .select('*')
    .eq('proyecto_id', proyectoId)
    .eq('activo', true);

  if (error) throw error;
  return data as MiembroEquipo[];
};

export const addMiembroEquipo = async (miembro: Partial<MiembroEquipo>) => {
  const { data, error } = await supabase
    .from('proy_equipo')
    .insert([miembro])
    .select()
    .single();

  if (error) throw error;
  return data as MiembroEquipo;
};

export const removeMiembroEquipo = async (id: number) => {
  const { data, error } = await supabase
    .from('proy_equipo')
    .update({ activo: false })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as MiembroEquipo;
};

// ============================================
// MÉTRICAS Y REPORTES
// ============================================

export const fetchMetricasProyectos = async (companyId: string): Promise<MetricasProyecto> => {
  // Esta función podría llamar a un RPC o hacer múltiples queries

  const { data: proyectos } = await supabase
    .from('proy_proyectos')
    .select('*')
    .eq('company_id', companyId);

  const { data: tareas } = await supabase
    .from('proy_tareas')
    .select('*, proyecto:proy_proyectos!inner(company_id)')
    .eq('proyecto.company_id', companyId);

  const proyectos_activos = proyectos?.filter(p => p.status === 'en_progreso').length || 0;
  const proyectos_completados = proyectos?.filter(p => p.status === 'completado').length || 0;
  const proyectos_retrasados = proyectos?.filter(p =>
    p.status !== 'completado' && new Date(p.fecha_fin_estimada) < new Date()
  ).length || 0;

  const tareas_pendientes = tareas?.filter(t => t.status === 'pendiente').length || 0;
  const tareas_en_progreso = tareas?.filter(t => t.status === 'en_progreso').length || 0;
  const tareas_completadas = tareas?.filter(t => t.status === 'completada').length || 0;

  const horas_estimadas_total = tareas?.reduce((sum, t) => sum + t.horas_estimadas, 0) || 0;
  const horas_reales_total = tareas?.reduce((sum, t) => sum + t.horas_reales, 0) || 0;

  const presupuesto_total = proyectos?.reduce((sum, p) => sum + p.presupuesto, 0) || 0;
  const costo_real_total = proyectos?.reduce((sum, p) => sum + p.costo_real, 0) || 0;

  const eficiencia_promedio = horas_estimadas_total > 0
    ? (horas_reales_total / horas_estimadas_total) * 100
    : 0;

  return {
    proyectos_activos,
    proyectos_completados,
    proyectos_retrasados,
    tareas_pendientes,
    tareas_en_progreso,
    tareas_completadas,
    horas_estimadas_total,
    horas_reales_total,
    presupuesto_total,
    costo_real_total,
    eficiencia_promedio
  };
};

export const calcularProgresoproyecto = async (proyectoId: number): Promise<number> => {
  const { data: tareas } = await supabase
    .from('proy_tareas')
    .select('progreso')
    .eq('proyecto_id', proyectoId);

  if (!tareas || tareas.length === 0) return 0;

  const progresoTotal = tareas.reduce((sum, t) => sum + t.progreso, 0);
  return Math.round(progresoTotal / tareas.length);
};

// ============================================
// ETAPAS (KANBAN)
// ============================================

export const fetchEtapasProyecto = async (companyId: string) => {
  const { data, error } = await supabase
    .from('proy_etapas_proyecto')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('secuencia', { ascending: true });

  if (error) throw error;
  // Mapear secuencia a orden para compatibilidad con el frontend
  return (data || []).map(e => ({ ...e, orden: e.secuencia }));
};

export const fetchEtapasTarea = async (companyId: string) => {
  const { data, error } = await supabase
    .from('proy_etapas_tarea')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('secuencia', { ascending: true });

  if (error) throw error;
  // Mapear secuencia a orden para compatibilidad con el frontend
  return (data || []).map(e => ({ ...e, orden: e.secuencia }));
};

export const updateTareaEtapa = async (tareaId: number, etapaId: number) => {
  const { data, error } = await supabase
    .from('proy_tareas')
    .update({ etapa_id: etapaId, updated_at: new Date().toISOString() })
    .eq('id', tareaId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// CRUD para Etapas de Proyecto
export const createEtapaProyecto = async (etapa: { nombre: string; color: string; orden: number; company_id: string }) => {
  const { data, error } = await supabase
    .from('proy_etapas_proyecto')
    .insert({
      nombre: etapa.nombre,
      color: etapa.color,
      secuencia: etapa.orden,
      company_id: etapa.company_id,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, orden: data.secuencia };
};

export const updateEtapaProyecto = async (id: number, etapa: { nombre?: string; color?: string; orden?: number }) => {
  const updateData: any = { updated_at: new Date().toISOString() };
  if (etapa.nombre !== undefined) updateData.nombre = etapa.nombre;
  if (etapa.color !== undefined) updateData.color = etapa.color;
  if (etapa.orden !== undefined) updateData.secuencia = etapa.orden;

  const { data, error } = await supabase
    .from('proy_etapas_proyecto')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { ...data, orden: data.secuencia };
};

export const deleteEtapaProyecto = async (id: number) => {
  const { error } = await supabase
    .from('proy_etapas_proyecto')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

// CRUD para Etapas de Tarea (Columnas Kanban)
export const createEtapaTarea = async (etapa: { nombre: string; color: string; orden: number; company_id: string }) => {
  const { data, error } = await supabase
    .from('proy_etapas_tarea')
    .insert({
      nombre: etapa.nombre,
      color: etapa.color,
      secuencia: etapa.orden,
      company_id: etapa.company_id,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, orden: data.secuencia };
};

export const updateEtapaTarea = async (id: number, etapa: { nombre?: string; color?: string; orden?: number }) => {
  const updateData: any = { updated_at: new Date().toISOString() };
  if (etapa.nombre !== undefined) updateData.nombre = etapa.nombre;
  if (etapa.color !== undefined) updateData.color = etapa.color;
  if (etapa.orden !== undefined) updateData.secuencia = etapa.orden;

  const { data, error } = await supabase
    .from('proy_etapas_tarea')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { ...data, orden: data.secuencia };
};

export const deleteEtapaTarea = async (id: number) => {
  const { error } = await supabase
    .from('proy_etapas_tarea')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

// ============================================
// MILESTONES (HITOS)
// ============================================

export const fetchMilestones = async (companyId: string, proyectoId?: number) => {
  let query = supabase
    .from('proy_hitos')
    .select(`
      *,
      proyecto:proy_proyectos(nombre),
      responsable:usuarios(nombre, email)
    `)
    .eq('company_id', companyId);

  if (proyectoId) {
    query = query.eq('proyecto_id', proyectoId);
  }

  const { data, error } = await query.order('fecha_objetivo', { ascending: true });

  if (error) throw error;
  return data;
};

export const createMilestone = async (milestone: any) => {
  const { data, error } = await supabase
    .from('proy_hitos')
    .insert({
      ...milestone,
      completado: false,
      progreso: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateMilestone = async (id: number, updateData: any) => {
  const { data, error } = await supabase
    .from('proy_hitos')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteMilestone = async (id: number) => {
  const { error } = await supabase
    .from('proy_hitos')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const completeMilestone = async (id: number) => {
  const { data, error } = await supabase
    .from('proy_hitos')
    .update({
      completado: true,
      progreso: 100,
      fecha_completado: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// TIMESHEET (REGISTROS DE TIEMPO)
// ============================================

export const fetchRegistrosTiempo = async (companyId: string, filters?: any) => {
  let query = supabase
    .from('proy_registros_tiempo')
    .select(`
      *,
      proyecto:proy_proyectos(nombre),
      tarea:proy_tareas(nombre),
      usuario:usuarios(nombre, email)
    `)
    .eq('company_id', companyId);

  if (filters?.proyecto_id) {
    query = query.eq('proyecto_id', filters.proyecto_id);
  }

  if (filters?.usuario_id) {
    query = query.eq('usuario_id', filters.usuario_id);
  }

  if (filters?.fecha_desde) {
    query = query.gte('fecha', filters.fecha_desde);
  }

  if (filters?.fecha_hasta) {
    query = query.lte('fecha', filters.fecha_hasta);
  }

  const { data, error } = await query.order('fecha', { ascending: false });

  if (error) throw error;
  return data;
};

export const createRegistroTiempo = async (registro: any) => {
  const { data, error } = await supabase
    .from('proy_registros_tiempo')
    .insert({
      ...registro,
      aprobado: false,
      facturado: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Actualizar horas_reales de la tarea si está asociada
  if (registro.tarea_id) {
    await supabase.rpc('actualizar_horas_tarea', {
      p_tarea_id: registro.tarea_id
    });
  }

  return data;
};

export const updateRegistroTiempo = async (id: number, updateData: any) => {
  const { data, error } = await supabase
    .from('proy_registros_tiempo')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Actualizar horas_reales de la tarea
  if (data.tarea_id) {
    await supabase.rpc('actualizar_horas_tarea', {
      p_tarea_id: data.tarea_id
    });
  }

  return data;
};

export const deleteRegistroTiempo = async (id: number) => {
  // Obtener el registro antes de eliminarlo para saber qué tarea actualizar
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

  // Actualizar horas_reales de la tarea
  if (registro?.tarea_id) {
    await supabase.rpc('actualizar_horas_tarea', {
      p_tarea_id: registro.tarea_id
    });
  }
};

export const approveRegistroTiempo = async (id: number) => {
  const { data, error } = await supabase
    .from('proy_registros_tiempo')
    .update({
      aprobado: true,
      aprobado_en: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Exportar todo como objeto
export const proyectosService = {
  // Proyectos
  fetchProyectos,
  fetchProyectoById,
  createProyecto,
  updateProyecto,
  deleteProyecto,
  // Tareas
  fetchTareas,
  fetchTareaById,
  createTarea,
  updateTarea,
  deleteTarea,
  // Equipo
  fetchMiembrosEquipo,
  addMiembroEquipo,
  removeMiembroEquipo,
  // Métricas
  fetchMetricasProyectos,
  calcularProgresoproyecto,
  // Etapas (Kanban)
  fetchEtapasProyecto,
  fetchEtapasTarea,
  updateTareaEtapa,
  createEtapaProyecto,
  updateEtapaProyecto,
  deleteEtapaProyecto,
  createEtapaTarea,
  updateEtapaTarea,
  deleteEtapaTarea,
  // Milestones (Hitos)
  fetchMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  completeMilestone,
  // Timesheet (Registros de Tiempo)
  fetchRegistrosTiempo,
  createRegistroTiempo,
  updateRegistroTiempo,
  deleteRegistroTiempo,
  approveRegistroTiempo
};
