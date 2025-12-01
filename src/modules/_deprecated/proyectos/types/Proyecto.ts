/**
 * Types para Gestión de Proyectos
 */

export type EstatusProyecto = 'PLANEACION' | 'ACTIVO' | 'EN_PAUSA' | 'COMPLETADO' | 'CANCELADO';
export type PrioridadProyecto = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type TipoProyecto = 'INTERNO' | 'CLIENTE' | 'DESARROLLO' | 'CONSULTORIA' | 'OTRO';

export interface Proyecto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoProyecto;

  // Cliente
  cliente_id?: string;
  contacto_nombre?: string;
  contacto_email?: string;

  // Fechas
  fecha_inicio: string;
  fecha_fin_estimada: string;
  fecha_fin_real?: string;

  // Presupuesto
  presupuesto: number;
  costo_real: number;

  // Control
  estatus: EstatusProyecto;
  prioridad: PrioridadProyecto;
  progreso: number; // 0-100

  // Asignación
  responsable_id?: string;
  equipo?: string[]; // Array de IDs de usuarios

  // Observaciones
  observaciones?: string;

  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Relaciones
  tareas?: Tarea[];
  horas?: RegistroTiempo[];
}

export type EstatusTarea = 'PENDIENTE' | 'EN_PROGRESO' | 'EN_REVISION' | 'COMPLETADA' | 'CANCELADA';
export type PrioridadTarea = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface Tarea {
  id: string;
  proyecto_id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;

  // Jerarquía
  tarea_padre_id?: string;
  orden: number;

  // Fechas
  fecha_inicio?: string;
  fecha_fin_estimada?: string;
  fecha_fin_real?: string;

  // Tiempo
  horas_estimadas?: number;
  horas_reales: number;

  // Control
  estatus: EstatusTarea;
  prioridad: PrioridadTarea;
  progreso: number; // 0-100

  // Asignación
  asignado_a?: string;

  // Dependencias
  tareas_dependientes?: string[]; // IDs de tareas que dependen de esta

  // Observaciones
  observaciones?: string;

  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  proyecto?: Proyecto;
  subtareas?: Tarea[];
  registros_tiempo?: RegistroTiempo[];
}

export interface RegistroTiempo {
  id: string;
  proyecto_id: string;
  tarea_id?: string;
  usuario_id: string;

  fecha: string;
  horas: number;
  descripcion?: string;

  // Facturación
  facturable: boolean;
  facturado: boolean;
  tarifa_hora?: number;
  monto?: number;

  created_at: string;
  updated_at: string;

  // Relaciones
  proyecto?: Proyecto;
  tarea?: Tarea;
}

export interface HitoProyecto {
  id: string;
  proyecto_id: string;
  nombre: string;
  descripcion?: string;
  fecha_objetivo: string;
  fecha_completado?: string;
  completado: boolean;
  orden: number;
  created_at: string;

  // Relaciones
  proyecto?: Proyecto;
}

export interface DocumentoProyecto {
  id: string;
  proyecto_id: string;
  nombre: string;
  descripcion?: string;
  tipo_documento: string;
  url: string;
  tamano_bytes?: number;
  uploaded_by?: string;
  created_at: string;

  // Relaciones
  proyecto?: Proyecto;
}

// Insert types
export interface ProyectoInsert {
  nombre: string;
  descripcion?: string;
  tipo: TipoProyecto;
  cliente_id?: string;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  presupuesto: number;
  prioridad: PrioridadProyecto;
  responsable_id?: string;
  equipo?: string[];
}

export interface TareaInsert {
  proyecto_id: string;
  nombre: string;
  descripcion?: string;
  tarea_padre_id?: string;
  fecha_inicio?: string;
  fecha_fin_estimada?: string;
  horas_estimadas?: number;
  prioridad: PrioridadTarea;
  asignado_a?: string;
}

export interface RegistroTiempoInsert {
  proyecto_id: string;
  tarea_id?: string;
  usuario_id: string;
  fecha: string;
  horas: number;
  descripcion?: string;
  facturable?: boolean;
  tarifa_hora?: number;
}
