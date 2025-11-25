// ============================================
// SERVICIOS DEL MÓDULO DE RRHH Y NÓMINA
// ============================================

import { supabase } from '../../../core/config/supabase';
import type {
  Empleado,
  Departamento,
  Puesto,
  PeriodoNomina,
  ReciboNomina,
  Incidencia,
  VacacionesEmpleado
} from '../types';

// ============================================
// EMPLEADOS
// ============================================

export const fetchEmpleados = async (companyId: string, filters?: {
  status?: string;
  departamento?: number;
  busqueda?: string;
}) => {
  let query = supabase
    .from('rrhh_empleados')
    .select(`
      *,
      departamento:rrhh_departamentos(*),
      puesto:rrhh_puestos(*)
    `)
    .eq('company_id', companyId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.departamento) {
    query = query.eq('departamento_id', filters.departamento);
  }

  if (filters?.busqueda) {
    query = query.or(`nombre.ilike.%${filters.busqueda}%,apellido_paterno.ilike.%${filters.busqueda}%,numero_empleado.ilike.%${filters.busqueda}%`);
  }

  query = query.order('numero_empleado');

  const { data, error } = await query;
  if (error) throw error;
  return data as Empleado[];
};

export const fetchEmpleadoById = async (id: number) => {
  const { data, error } = await supabase
    .from('rrhh_empleados')
    .select(`
      *,
      departamento:rrhh_departamentos(*),
      puesto:rrhh_puestos(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Empleado;
};

export const createEmpleado = async (empleado: Partial<Empleado>) => {
  const { data, error } = await supabase
    .from('rrhh_empleados')
    .insert([empleado])
    .select()
    .single();

  if (error) throw error;
  return data as Empleado;
};

export const updateEmpleado = async (id: number, empleado: Partial<Empleado>) => {
  const { data, error } = await supabase
    .from('rrhh_empleados')
    .update(empleado)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Empleado;
};

export const deleteEmpleado = async (id: number) => {
  const { error } = await supabase
    .from('rrhh_empleados')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const generarNumeroEmpleado = async (companyId: string) => {
  const { data, error } = await supabase
    .from('rrhh_empleados')
    .select('numero_empleado')
    .eq('company_id', companyId)
    .order('numero_empleado', { ascending: false })
    .limit(1);

  if (error) throw error;

  if (!data || data.length === 0) {
    return 'EMP-0001';
  }

  const lastNumber = data[0].numero_empleado;
  const match = lastNumber.match(/\d+$/);
  if (match) {
    const nextNumber = parseInt(match[0]) + 1;
    return `EMP-${nextNumber.toString().padStart(4, '0')}`;
  }

  return 'EMP-0001';
};

// ============================================
// DEPARTAMENTOS Y PUESTOS
// ============================================

export const fetchDepartamentos = async (companyId: string) => {
  const { data, error } = await supabase
    .from('rrhh_departamentos')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('nombre');

  if (error) throw error;
  return data as Departamento[];
};

export const fetchPuestos = async (companyId: string) => {
  const { data, error } = await supabase
    .from('rrhh_puestos')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('nombre');

  if (error) throw error;
  return data as Puesto[];
};

export const createDepartamento = async (departamento: Partial<Departamento>) => {
  const { data, error } = await supabase
    .from('rrhh_departamentos')
    .insert([departamento])
    .select()
    .single();

  if (error) throw error;
  return data as Departamento;
};

export const createPuesto = async (puesto: Partial<Puesto>) => {
  const { data, error } = await supabase
    .from('rrhh_puestos')
    .insert([puesto])
    .select()
    .single();

  if (error) throw error;
  return data as Puesto;
};

// ============================================
// PERÍODOS DE NÓMINA
// ============================================

export const fetchPeriodosNomina = async (companyId: string, filters?: {
  año?: number;
  tipo?: string;
  status?: string;
}) => {
  let query = supabase
    .from('rrhh_periodos_nomina')
    .select('*')
    .eq('company_id', companyId);

  if (filters?.año) {
    query = query.eq('año', filters.año);
  }

  if (filters?.tipo) {
    query = query.eq('tipo_nomina', filters.tipo);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('fecha_inicio', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data as PeriodoNomina[];
};

export const fetchPeriodoNominaById = async (id: number) => {
  const { data, error } = await supabase
    .from('rrhh_periodos_nomina')
    .select(`
      *,
      recibos_nomina:rrhh_recibos_nomina(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as PeriodoNomina;
};

export const createPeriodoNomina = async (periodo: Partial<PeriodoNomina>) => {
  const { data, error } = await supabase
    .from('rrhh_periodos_nomina')
    .insert([periodo])
    .select()
    .single();

  if (error) throw error;
  return data as PeriodoNomina;
};

export const updatePeriodoNomina = async (id: number, periodo: Partial<PeriodoNomina>) => {
  const { data, error } = await supabase
    .from('rrhh_periodos_nomina')
    .update(periodo)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PeriodoNomina;
};

// ============================================
// RECIBOS DE NÓMINA
// ============================================

export const fetchRecibosNomina = async (periodoId: number) => {
  const { data, error } = await supabase
    .from('rrhh_recibos_nomina')
    .select(`
      *,
      empleado:rrhh_empleados(*),
      percepciones:rrhh_percepciones(*),
      deducciones:rrhh_deducciones(*)
    `)
    .eq('periodo_nomina_id', periodoId)
    .order('empleado_id');

  if (error) throw error;
  return data as ReciboNomina[];
};

export const fetchReciboNominaById = async (id: number) => {
  const { data, error } = await supabase
    .from('rrhh_recibos_nomina')
    .select(`
      *,
      empleado:rrhh_empleados(*),
      periodo_nomina:rrhh_periodos_nomina(*),
      percepciones:rrhh_percepciones(*),
      deducciones:rrhh_deducciones(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ReciboNomina;
};

export const createReciboNomina = async (recibo: Partial<ReciboNomina>) => {
  const { data, error } = await supabase
    .from('rrhh_recibos_nomina')
    .insert([recibo])
    .select()
    .single();

  if (error) throw error;
  return data as ReciboNomina;
};

export const calcularNomina = async (periodoId: number) => {
  // Esta función debería llamar a un edge function o RPC para calcular la nómina
  const { data, error } = await supabase.rpc('calcular_nomina_periodo', {
    p_periodo_id: periodoId
  });

  if (error) throw error;
  return data;
};

// ============================================
// INCIDENCIAS
// ============================================

export const fetchIncidencias = async (companyId: string, filters?: {
  empleado_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo?: string;
}) => {
  let query = supabase
    .from('rrhh_incidencias')
    .select(`
      *,
      empleado:rrhh_empleados(*)
    `)
    .eq('company_id', companyId);

  if (filters?.empleado_id) {
    query = query.eq('empleado_id', filters.empleado_id);
  }

  if (filters?.fecha_inicio) {
    query = query.gte('fecha_inicio', filters.fecha_inicio);
  }

  if (filters?.fecha_fin) {
    query = query.lte('fecha_fin', filters.fecha_fin);
  }

  if (filters?.tipo) {
    query = query.eq('tipo', filters.tipo);
  }

  query = query.order('fecha_inicio', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data as Incidencia[];
};

export const createIncidencia = async (incidencia: Partial<Incidencia>) => {
  const { data, error } = await supabase
    .from('rrhh_incidencias')
    .insert([incidencia])
    .select()
    .single();

  if (error) throw error;
  return data as Incidencia;
};

// ============================================
// VACACIONES
// ============================================

export const fetchVacacionesEmpleado = async (empleadoId: number, año?: number) => {
  let query = supabase
    .from('rrhh_vacaciones_empleados')
    .select('*')
    .eq('empleado_id', empleadoId);

  if (año) {
    query = query.eq('año', año);
  }

  query = query.order('año', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data as VacacionesEmpleado[];
};

// Exportar todo como objeto
export const rrhhService = {
  // Empleados
  fetchEmpleados,
  fetchEmpleadoById,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  generarNumeroEmpleado,
  // Catálogos
  fetchDepartamentos,
  fetchPuestos,
  createDepartamento,
  createPuesto,
  // Nómina
  fetchPeriodosNomina,
  fetchPeriodoNominaById,
  createPeriodoNomina,
  updatePeriodoNomina,
  fetchRecibosNomina,
  fetchReciboNominaById,
  createReciboNomina,
  calcularNomina,
  // Incidencias
  fetchIncidencias,
  createIncidencia,
  // Vacaciones
  fetchVacacionesEmpleado
};
