// Tipos para formularios de eventos

export interface EventoFormData {
  clave_evento: string;
  nombre_proyecto: string;
  cliente_id: number;
  tipo_evento_id?: number;
  fecha_evento: string;
  fecha_fin_evento?: string;
  ubicacion?: string;
  descripcion?: string;
  total?: number;
  responsable_id?: string;
  estado_id?: number;
  company_id?: string;
}

export interface ValidationData {
  notes?: string;
  transition_date?: string;
  [key: string]: any;
}

export interface StateTransitionValidation {
  valid: boolean;
  errors: string[];
}
