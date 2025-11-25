export interface Prediccion {
  id: number;
  company_id: string;
  tipo: 'ventas' | 'inventario' | 'cobranza' | 'demanda';
  modelo: string;
  input_data: any;
  prediccion: any;
  confianza: number;
  created_at: string;
}

export interface Workflow {
  id: number;
  company_id: string;
  nombre: string;
  trigger_tipo: 'manual' | 'programado' | 'evento';
  trigger_condiciones: any;
  acciones: any[];
  activo: boolean;
  ejecutado_veces: number;
  created_at: string;
}

export interface WorkflowFormData extends Partial<Workflow> {}
