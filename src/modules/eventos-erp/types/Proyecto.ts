// ============================================
// TIPOS DE PROYECTOS INTEGRADOS EN EVENTOS-ERP
// ============================================

export interface Proyecto {
  id: number;
  company_id: string;
  evento_id?: number | null; // Vinculación con eventos
  nombre: string;
  descripcion: string | null;
  cliente_id: number | null;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  fecha_fin_real: string | null;
  presupuesto: number;
  costo_real: number;
  progreso: number; // 0-100
  status: 'planificacion' | 'en_progreso' | 'pausado' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  responsable_id: string | null; // UUID del usuario
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  responsable?: Usuario;
  tareas?: Tarea[];
  equipo?: MiembroEquipo[];
  documentos?: DocumentoProyecto[];
}

export interface Tarea {
  id: number;
  proyecto_id: number;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  horas_estimadas: number;
  horas_reales: number;
  progreso: number; // 0-100
  asignado_a: string | null; // UUID del usuario
  dependencias: number[]; // IDs de tareas de las que depende
  status: 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada' | 'cancelada';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  etiquetas: string[];
  created_at: string;
  updated_at: string;
  asignado?: Usuario;
  comentarios?: ComentarioTarea[];
  archivos_adjuntos?: ArchivoTarea[];
}

export interface MiembroEquipo {
  id: number;
  proyecto_id: number;
  usuario_id: string;
  rol: 'gestor' | 'desarrollador' | 'diseñador' | 'qa' | 'coordinador' | 'otro';
  fecha_asignacion: string;
  activo: boolean;
  created_at: string;
  usuario?: Usuario;
}

export interface ComentarioTarea {
  id: number;
  tarea_id: number;
  usuario_id: string;
  comentario: string;
  created_at: string;
  usuario?: Usuario;
}

export interface ArchivoTarea {
  id: number;
  tarea_id: number;
  nombre: string;
  url: string;
  tipo: string;
  tamaño: number;
  subido_por: string;
  created_at: string;
}

export interface DocumentoProyecto {
  id: number;
  proyecto_id: number;
  nombre: string;
  descripcion: string | null;
  url: string;
  tipo: 'propuesta' | 'contrato' | 'especificacion' | 'reporte' | 'cronograma' | 'otro';
  version: string;
  subido_por: string;
  created_at: string;
}

export interface Hito {
  id: number;
  proyecto_id: number;
  nombre: string;
  descripcion: string | null;
  fecha_objetivo: string;
  fecha_completado: string | null;
  completado: boolean;
  created_at: string;
}

export interface Cliente {
  id: number;
  razon_social: string;
  rfc: string;
  email: string | null;
  telefono: string | null;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  avatar_url: string | null;
}

// Tipos para el diagrama de Gantt
export interface TareaGantt {
  id: number | string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
  type: 'task' | 'milestone' | 'project';
  styles?: {
    backgroundColor?: string;
    progressColor?: string;
    progressSelectedColor?: string;
  };
}

export interface ProyectoGantt {
  id: number | string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'project';
  hideChildren: boolean;
  tasks: TareaGantt[];
}

// Tipos para métricas y reportes
export interface MetricasProyecto {
  proyectos_activos: number;
  proyectos_completados: number;
  proyectos_retrasados: number;
  tareas_pendientes: number;
  tareas_en_progreso: number;
  tareas_completadas: number;
  horas_estimadas_total: number;
  horas_reales_total: number;
  presupuesto_total: number;
  costo_real_total: number;
  eficiencia_promedio: number; // Porcentaje
}

export interface ReporteProyecto {
  proyecto: Proyecto;
  tareas_completadas: number;
  tareas_pendientes: number;
  tareas_retrasadas: number;
  progreso_general: number;
  horas_consumidas: number;
  horas_restantes: number;
  presupuesto_consumido: number;
  presupuesto_restante: number;
  dias_transcurridos: number;
  dias_restantes: number;
  en_tiempo: boolean;
  en_presupuesto: boolean;
}

// Tipos para filtros
export interface FiltrosProyecto {
  status?: string;
  cliente_id?: number;
  responsable_id?: string;
  evento_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  busqueda?: string;
}

export interface FiltrosTarea {
  proyecto_id?: number;
  status?: string;
  asignado_a?: string;
  prioridad?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  busqueda?: string;
}

// Tipos para formularios
export interface ProyectoFormData extends Partial<Proyecto> {}
export interface TareaFormData extends Partial<Tarea> {}
export interface MiembroEquipoFormData extends Partial<MiembroEquipo> {}
