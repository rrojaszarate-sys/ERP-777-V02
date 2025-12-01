/**
 * Types para RRHH y Nómina
 */

export type TipoEmpleado = 'PLANTA' | 'EVENTUAL' | 'HONORARIOS' | 'BECARIO';
export type EstatusEmpleado = 'ACTIVO' | 'BAJA' | 'SUSPENDIDO' | 'VACACIONES';
export type TipoContrato = 'INDEFINIDO' | 'TEMPORAL' | 'PROYECTO' | 'HONORARIOS';

export interface Empleado {
  id: string;
  numero_empleado: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  nombre_completo: string;

  // Datos personales
  fecha_nacimiento: string;
  lugar_nacimiento?: string;
  genero?: 'M' | 'F' | 'OTRO';
  estado_civil?: 'SOLTERO' | 'CASADO' | 'UNION_LIBRE' | 'DIVORCIADO' | 'VIUDO';
  curp?: string;
  rfc?: string;
  nss?: string; // Número Seguro Social
  email?: string;
  telefono?: string;
  celular?: string;

  // Dirección
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  pais?: string;

  // Laborales
  departamento_id?: string;
  puesto_id?: string;
  tipo_empleado: TipoEmpleado;
  tipo_contrato: TipoContrato;
  fecha_ingreso: string;
  fecha_baja?: string;
  motivo_baja?: string;
  estatus: EstatusEmpleado;

  // Salario
  salario_base: number;
  salario_diario: number;
  salario_diario_integrado: number;
  periodicidad_pago: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

  // Datos bancarios
  banco?: string;
  cuenta_bancaria?: string;
  clabe?: string;

  // Contacto de emergencia
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  contacto_emergencia_relacion?: string;

  // Documentos
  foto_url?: string;
  documentos?: string[]; // URLs de documentos

  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Relaciones
  departamento?: Departamento;
  puesto?: Puesto;
}

export interface Departamento {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  departamento_padre_id?: string;
  responsable_id?: string;
  activo: boolean;
  created_at: string;
}

export interface Puesto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  departamento_id?: string;
  salario_minimo?: number;
  salario_maximo?: number;
  requisitos?: string;
  activo: boolean;
  created_at: string;
}

export type TipoConcepto = 'PERCEPCION' | 'DEDUCCION';
export type CategoriaConcepto = 'GRAVADO' | 'EXENTO' | 'MIXTO';

export interface ConceptoNomina {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoConcepto;
  categoria: CategoriaConcepto;
  clave_sat?: string;
  porcentaje?: number;
  monto_fijo?: number;
  aplica_isr: boolean;
  aplica_imss: boolean;
  activo: boolean;
  orden: number;
  created_at: string;
}

export type TipoNomina = 'ORDINARIA' | 'EXTRAORDINARIA' | 'FINIQUITO' | 'AGUINALDO' | 'PTU';
export type EstatusNomina = 'BORRADOR' | 'CALCULADA' | 'TIMBRADA' | 'PAGADA' | 'CANCELADA';
export type PeriodoNomina = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

export interface Nomina {
  id: string;
  folio: string;
  tipo: TipoNomina;
  periodo: PeriodoNomina;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_pago: string;

  // Totales
  total_percepciones: number;
  total_deducciones: number;
  total_neto: number;
  num_empleados: number;

  // Control
  estatus: EstatusNomina;
  calculada_por?: string;
  fecha_calculo?: string;
  timbrada_por?: string;
  fecha_timbrado?: string;
  pagada_por?: string;
  fecha_pago_real?: string;

  // Observaciones
  observaciones?: string;

  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  detalles?: NominaDetalle[];
}

export interface NominaDetalle {
  id: string;
  nomina_id: string;
  empleado_id: string;

  // Días trabajados
  dias_trabajados: number;
  dias_falta: number;
  dias_vacaciones: number;
  dias_incapacidad: number;

  // Salarios
  salario_base: number;
  salario_diario: number;

  // Totales
  total_percepciones: number;
  total_deducciones: number;
  total_neto: number;

  // CFDI
  uuid_sat?: string;
  xml_sat?: string;
  pdf_url?: string;
  estatus_cfdi?: 'PENDIENTE' | 'TIMBRADO' | 'CANCELADO';

  created_at: string;
  updated_at: string;

  // Relaciones
  empleado?: Empleado;
  percepciones?: NominaConcepto[];
  deducciones?: NominaConcepto[];
}

export interface NominaConcepto {
  id: string;
  nomina_detalle_id: string;
  concepto_id: string;
  tipo: TipoConcepto;
  clave_sat?: string;
  concepto_nombre: string;
  monto: number;
  gravado?: number;
  exento?: number;
  created_at: string;

  // Relaciones
  concepto?: ConceptoNomina;
}

// Insert types
export interface EmpleadoInsert {
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  fecha_nacimiento: string;
  curp?: string;
  rfc?: string;
  nss?: string;
  email?: string;
  telefono?: string;
  departamento_id?: string;
  puesto_id?: string;
  tipo_empleado: TipoEmpleado;
  tipo_contrato: TipoContrato;
  fecha_ingreso: string;
  salario_base: number;
  periodicidad_pago: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
}

export interface NominaInsert {
  tipo: TipoNomina;
  periodo: PeriodoNomina;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_pago: string;
  empleados_ids?: string[]; // Si está vacío, incluye todos los activos
}
