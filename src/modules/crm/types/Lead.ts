/**
 * Types para CRM - Leads y Oportunidades
 */

export type OrigenLead = 'WEB' | 'TELEFONO' | 'EMAIL' | 'REFERIDO' | 'REDES_SOCIALES' | 'EVENTO' | 'PUBLICIDAD' | 'OTRO';
export type EstatusLead = 'NUEVO' | 'CONTACTADO' | 'CALIFICADO' | 'NO_CALIFICADO' | 'CONVERTIDO' | 'PERDIDO';
export type CalificacionLead = 'FRIO' | 'TIBIO' | 'CALIENTE';

export interface Lead {
  id: string;
  codigo: string;
  nombre: string;
  empresa?: string;
  cargo?: string;
  email?: string;
  telefono?: string;
  celular?: string;
  origen: OrigenLead;
  estatus: EstatusLead;
  calificacion?: CalificacionLead;

  // Scoring
  puntuacion?: number;

  // Información adicional
  industria?: string;
  num_empleados?: number;
  ingreso_anual_estimado?: number;
  sitio_web?: string;

  // Dirección
  calle?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  pais?: string;

  // Seguimiento
  descripcion?: string;
  necesidades?: string;
  presupuesto_estimado?: number;
  fecha_contacto?: string;
  fecha_calificacion?: string;
  fecha_conversion?: string;
  motivo_perdida?: string;

  // Asignación
  asignado_a?: string;
  campania_id?: string;

  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export type EstatusOportunidad = 'NUEVA' | 'CALIFICACION' | 'PROPUESTA' | 'NEGOCIACION' | 'GANADA' | 'PERDIDA' | 'CANCELADA';
export type ProbabilidadCierre = 10 | 25 | 50 | 75 | 90 | 100;

export interface Oportunidad {
  id: string;
  codigo: string;
  nombre: string;
  lead_id?: string;
  cliente_id?: string;
  contacto_nombre?: string;
  contacto_email?: string;
  contacto_telefono?: string;

  // Comercial
  monto_estimado: number;
  probabilidad_cierre: ProbabilidadCierre;
  fecha_estimada_cierre: string;
  fecha_cierre_real?: string;

  // Pipeline
  etapa_id: string;
  estatus: EstatusOportunidad;
  motivo_perdida?: string;
  competidor?: string;

  // Detalles
  descripcion?: string;
  necesidades?: string;
  productos_interes?: string[];
  presupuesto_cliente?: number;

  // Seguimiento
  proximo_paso?: string;
  fecha_proximo_paso?: string;
  asignado_a?: string;

  // SAT (si se convierte en venta)
  evento_id?: string;

  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Relaciones
  lead?: Lead;
  etapa?: EtapaPipeline;
}

export interface EtapaPipeline {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  probabilidad_default: ProbabilidadCierre;
  color?: string;
  activa: boolean;
  created_at: string;
}

export type TipoActividad = 'LLAMADA' | 'EMAIL' | 'REUNION' | 'TAREA' | 'DEMO' | 'PROPUESTA' | 'SEGUIMIENTO' | 'OTRO';
export type EstatusActividad = 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';

export interface Actividad {
  id: string;
  tipo: TipoActividad;
  asunto: string;
  descripcion?: string;
  fecha_programada: string;
  fecha_completada?: string;
  duracion_minutos?: number;

  // Relacionado con
  lead_id?: string;
  oportunidad_id?: string;
  cliente_id?: string;

  // Asignación
  asignado_a?: string;
  estatus: EstatusActividad;
  resultado?: string;

  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  lead?: Lead;
  oportunidad?: Oportunidad;
}

export type TipoCampania = 'EMAIL' | 'REDES_SOCIALES' | 'PUBLICIDAD' | 'EVENTO' | 'WEBINAR' | 'CONTENIDO' | 'TELEMARKETING' | 'OTRA';
export type EstatusCampania = 'PLANIFICACION' | 'ACTIVA' | 'COMPLETADA' | 'CANCELADA';

export interface Campania {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoCampania;
  estatus: EstatusCampania;

  // Fechas
  fecha_inicio: string;
  fecha_fin: string;

  // Presupuesto
  presupuesto: number;
  costo_real?: number;

  // Métricas
  num_leads_generados: number;
  num_oportunidades: number;
  num_conversiones: number;
  ingresos_generados: number;

  // Detalles
  descripcion?: string;
  objetivo?: string;
  publico_objetivo?: string;
  mensaje?: string;

  // Asignación
  responsable?: string;

  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Insert types
export interface LeadInsert {
  nombre: string;
  empresa?: string;
  email?: string;
  telefono?: string;
  origen: OrigenLead;
  calificacion?: CalificacionLead;
  descripcion?: string;
  asignado_a?: string;
  campania_id?: string;
}

export interface OportunidadInsert {
  nombre: string;
  lead_id?: string;
  cliente_id?: string;
  monto_estimado: number;
  probabilidad_cierre: ProbabilidadCierre;
  fecha_estimada_cierre: string;
  etapa_id: string;
  descripcion?: string;
  asignado_a?: string;
}

export interface ActividadInsert {
  tipo: TipoActividad;
  asunto: string;
  descripcion?: string;
  fecha_programada: string;
  lead_id?: string;
  oportunidad_id?: string;
  asignado_a?: string;
}
