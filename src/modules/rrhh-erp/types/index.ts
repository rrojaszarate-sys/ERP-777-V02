// ============================================
// TIPOS DEL MÓDULO DE RRHH Y NÓMINA
// ============================================

export interface Empleado {
  id: number;
  company_id: string;
  numero_empleado: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  rfc: string;
  curp: string;
  nss: string | null;
  fecha_nacimiento: string;
  fecha_ingreso: string;
  fecha_baja: string | null;
  departamento_id: number | null;
  puesto_id: number | null;
  tipo_contrato: 'planta' | 'temporal' | 'honorarios' | 'practicante';
  tipo_jornada: 'completa' | 'parcial' | 'mixta' | 'reducida';
  salario_base: number;
  salario_diario: number;
  salario_diario_integrado: number;
  forma_pago: 'efectivo' | 'transferencia' | 'cheque';
  banco: string | null;
  clabe: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  codigo_postal: string | null;
  contacto_emergencia: string | null;
  telefono_emergencia: string | null;
  status: 'activo' | 'baja' | 'suspendido' | 'vacaciones';
  created_at: string;
  updated_at: string;
  departamento?: Departamento;
  puesto?: Puesto;
}

export interface Departamento {
  id: number;
  company_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
}

export interface Puesto {
  id: number;
  company_id: string;
  nombre: string;
  descripcion: string | null;
  nivel: string | null;
  activo: boolean;
  created_at: string;
}

export interface PeriodoNomina {
  id: number;
  company_id: string;
  tipo_nomina: 'semanal' | 'quincenal' | 'mensual' | 'extraordinaria';
  numero_periodo: number;
  año: number;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_pago: string;
  status: 'abierto' | 'procesado' | 'timbrado' | 'pagado' | 'cancelado';
  total_percepciones: number;
  total_deducciones: number;
  total_neto: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
  recibos_nomina?: ReciboNomina[];
}

export interface ReciboNomina {
  id: number;
  company_id: string;
  periodo_nomina_id: number;
  empleado_id: number;
  dias_trabajados: number;
  dias_falta: number;
  dias_vacaciones: number;
  dias_incapacidad: number;
  horas_extra: number;
  total_percepciones: number;
  total_deducciones: number;
  total_neto: number;
  status: 'borrador' | 'calculado' | 'timbrado' | 'pagado' | 'cancelado';
  uuid_cfdi: string | null;
  xml_cfdi: string | null;
  pdf_url: string | null;
  fecha_timbrado: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  empleado?: Empleado;
  periodo_nomina?: PeriodoNomina;
  percepciones?: Percepcion[];
  deducciones?: Deduccion[];
}

export interface Percepcion {
  id: number;
  recibo_nomina_id: number;
  clave_sat: string;
  concepto: string;
  tipo: 'sueldo' | 'bono' | 'comision' | 'aguinaldo' | 'vacaciones' | 'prima_vacacional' | 'otro';
  gravado: number;
  exento: number;
  total: number;
  created_at: string;
}

export interface Deduccion {
  id: number;
  recibo_nomina_id: number;
  clave_sat: string;
  concepto: string;
  tipo: 'isr' | 'imss' | 'prestamo' | 'falta' | 'pension' | 'otro';
  monto: number;
  created_at: string;
}

export interface Incidencia {
  id: number;
  company_id: string;
  empleado_id: number;
  tipo: 'falta' | 'retardo' | 'permiso' | 'incapacidad' | 'vacaciones' | 'suspension';
  fecha_inicio: string;
  fecha_fin: string | null;
  dias: number;
  horas: number | null;
  justificada: boolean;
  motivo: string | null;
  documentos_url: string | null;
  created_at: string;
  empleado?: Empleado;
}

export interface VacacionesEmpleado {
  id: number;
  empleado_id: number;
  año: number;
  dias_derecho: number;
  dias_tomados: number;
  dias_disponibles: number;
  created_at: string;
  updated_at: string;
}

// Tipos para formularios
export interface EmpleadoFormData extends Partial<Empleado> {}
export interface PeriodoNominaFormData extends Partial<PeriodoNomina> {}
export interface ReciboNominaFormData extends Partial<ReciboNomina> {}
export interface IncidenciaFormData extends Partial<Incidencia> {}
