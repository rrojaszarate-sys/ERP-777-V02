// ============================================
// TIPOS DEL MÓDULO DE PROYECTOS CON GANTT
// ============================================

// Etapas configurables del proyecto (como Odoo)
export interface EtapaProyecto {
  id: number;
  company_id: string;
  nombre: string;
  descripcion: string | null;
  color: string; // hex color
  secuencia: number; // orden de las etapas
  es_final: boolean; // si es etapa final (completado/cancelado)
  activo: boolean;
  created_at: string;
}

export interface Proyecto {
  id: number;
  company_id: string;
  nombre: string;
  descripcion: string | null;
  codigo: string | null; // código único del proyecto
  cliente_id: number | null;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  fecha_fin_real: string | null;
  presupuesto: number;
  costo_real: number;
  ingreso_estimado: number;
  ingreso_real: number;
  progreso: number; // 0-100
  etapa_id: number | null; // Etapa configurable
  status: 'planificacion' | 'en_progreso' | 'pausado' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  responsable_id: string | null; // UUID del usuario
  tipo_facturacion: 'precio_fijo' | 'tiempo_material' | 'milestones' | 'no_facturable';
  privado: boolean;
  favorito: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  responsable?: Usuario;
  etapa?: EtapaProyecto;
  tareas?: Tarea[];
  equipo?: MiembroEquipo[];
  documentos?: DocumentoProyecto[];
  milestones?: Hito[];
  timesheets?: RegistroTiempo[];
}

// Etapas configurables de tareas (como Odoo Kanban)
export interface EtapaTarea {
  id: number;
  company_id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  secuencia: number;
  es_cerrado: boolean; // si es etapa final
  fold: boolean; // si se colapsa en Kanban
  activo: boolean;
  created_at: string;
}

export interface Tarea {
  id: number;
  proyecto_id: number;
  tarea_padre_id: number | null; // Para subtareas
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  horas_estimadas: number;
  horas_reales: number;
  horas_facturables: number;
  progreso: number; // 0-100
  asignado_a: string | null; // UUID del usuario
  watchers: string[]; // Seguidores (UUIDs)
  dependencias: number[]; // IDs de tareas de las que depende
  etapa_id: number | null; // Etapa configurable en Kanban
  status: 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada' | 'cancelada';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  etiquetas: string[];
  color: string | null;
  checklist: ChecklistItem[];
  milestone_id: number | null; // Asociada a un hito
  facturable: boolean;
  facturado: boolean;
  costo_estimado: number;
  costo_real: number;
  secuencia: number; // Orden en Kanban
  created_at: string;
  updated_at: string;
  proyecto?: Proyecto;
  etapa?: EtapaTarea;
  asignado?: Usuario;
  tarea_padre?: Tarea;
  subtareas?: Tarea[];
  comentarios?: ComentarioTarea[];
  archivos_adjuntos?: ArchivoTarea[];
  timesheets?: RegistroTiempo[];
}

// Checklist dentro de tareas
export interface ChecklistItem {
  id: string;
  texto: string;
  completado: boolean;
  asignado_a: string | null;
}

export interface MiembroEquipo {
  id: number;
  proyecto_id: number;
  usuario_id: string;
  rol: 'gestor' | 'desarrollador' | 'diseñador' | 'qa' | 'otro';
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
  tipo: 'propuesta' | 'contrato' | 'especificacion' | 'reporte' | 'otro';
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
  progreso: number; // 0-100 calculado desde tareas
  responsable_id: string | null;
  created_at: string;
  updated_at: string;
  tareas?: Tarea[];
  responsable?: Usuario;
}

// Timesheet - Registro de tiempo (como Odoo)
export interface RegistroTiempo {
  id: number;
  company_id: string;
  proyecto_id: number;
  tarea_id: number | null;
  usuario_id: string;
  fecha: string;
  horas: number;
  descripcion: string | null;
  facturable: boolean;
  facturado: boolean;
  costo_hora: number;
  precio_hora: number;
  aprobado: boolean;
  aprobado_por: string | null;
  aprobado_en: string | null;
  created_at: string;
  updated_at: string;
  proyecto?: Proyecto;
  tarea?: Tarea;
  usuario?: Usuario;
}

// Plantillas de proyecto (para configurabilidad)
export interface PlantillaProyecto {
  id: number;
  company_id: string;
  nombre: string;
  descripcion: string | null;
  etapas_predeterminadas: number[]; // IDs de etapas
  tareas_plantilla: TareaPlantilla[];
  horas_estimadas_total: number;
  activo: boolean;
  created_at: string;
}

export interface TareaPlantilla {
  nombre: string;
  descripcion: string | null;
  horas_estimadas: number;
  dias_desde_inicio: number;
  duracion_dias: number;
  dependencias_indices: number[]; // Índices dentro del array
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

// Tipos para métricas y reportes (como Odoo)
export interface MetricasProyecto {
  proyectos_activos: number;
  proyectos_completados: number;
  proyectos_retrasados: number;
  tareas_pendientes: number;
  tareas_en_progreso: number;
  tareas_completadas: number;
  horas_estimadas_total: number;
  horas_reales_total: number;
  horas_facturables_total: number;
  horas_facturadas_total: number;
  presupuesto_total: number;
  costo_real_total: number;
  ingreso_estimado_total: number;
  ingreso_real_total: number;
  rentabilidad_estimada: number; // ingreso_estimado - costo_estimado
  rentabilidad_real: number; // ingreso_real - costo_real
  margen_estimado: number; // % de ganancia estimada
  margen_real: number; // % de ganancia real
  eficiencia_tiempo: number; // horas_reales / horas_estimadas * 100
  eficiencia_costo: number; // costo_real / presupuesto * 100
}

export interface ReporteProyecto {
  proyecto: Proyecto;
  // Tareas
  tareas_completadas: number;
  tareas_pendientes: number;
  tareas_retrasadas: number;
  tareas_total: number;
  progreso_general: number;
  // Tiempo
  horas_estimadas: number;
  horas_consumidas: number;
  horas_restantes: number;
  horas_facturables: number;
  horas_facturadas: number;
  eficiencia_tiempo: number; // %
  // Presupuesto y Costos
  presupuesto: number;
  costo_estimado: number;
  costo_consumido: number;
  costo_restante: number;
  // Ingresos
  ingreso_estimado: number;
  ingreso_real: number;
  ingreso_pendiente: number;
  // Rentabilidad
  rentabilidad_estimada: number;
  rentabilidad_real: number;
  margen_estimado: number; // %
  margen_real: number; // %
  // Fechas
  dias_transcurridos: number;
  dias_restantes: number;
  dias_retraso: number;
  // Indicadores
  en_tiempo: boolean;
  en_presupuesto: boolean;
  rentable: boolean;
  // Milestones
  milestones_completados: number;
  milestones_pendientes: number;
  milestones_retrasados: number;
}

// Tipos para filtros
export interface FiltrosProyecto {
  status?: string;
  cliente_id?: number;
  responsable_id?: string;
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
