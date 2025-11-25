import { supabase } from '@/core/config/supabase';
import type { Empleado, EmpleadoInsert } from '../types';

export const empleadosService = {
  async getAll(): Promise<Empleado[]> {
    const { data, error } = await supabase
      .from('rrhh_empleados')
      .select(`
        *,
        departamento:rrhh_departamentos(*),
        puesto:rrhh_puestos(*)
      `)
      .order('numero_empleado');

    if (error) throw error;
    return data as Empleado[];
  },

  async getActivos(): Promise<Empleado[]> {
    const { data, error } = await supabase
      .from('rrhh_empleados')
      .select(`
        *,
        departamento:rrhh_departamentos(*),
        puesto:rrhh_puestos(*)
      `)
      .eq('estatus', 'ACTIVO')
      .order('numero_empleado');

    if (error) throw error;
    return data as Empleado[];
  },

  async getById(id: string): Promise<Empleado> {
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
  },

  async create(empleadoData: EmpleadoInsert): Promise<Empleado> {
    // Generar número de empleado
    const { data: ultimos } = await supabase
      .from('rrhh_empleados')
      .select('numero_empleado')
      .order('created_at', { ascending: false })
      .limit(1);

    const numero = ultimos && ultimos.length > 0
      ? parseInt(ultimos[0].numero_empleado) + 1
      : 1;
    const numero_empleado = numero.toString().padStart(6, '0');

    // Calcular nombre completo
    const nombre_completo = `${empleadoData.nombre} ${empleadoData.apellido_paterno} ${empleadoData.apellido_materno || ''}`.trim();

    // Calcular salarios
    const diasPorPeriodo = empleadoData.periodicidad_pago === 'SEMANAL' ? 7 :
                          empleadoData.periodicidad_pago === 'QUINCENAL' ? 15 : 30;
    const salario_diario = empleadoData.salario_base / diasPorPeriodo;
    const salario_diario_integrado = salario_diario * 1.0493; // Factor integrado básico

    const { data, error } = await supabase
      .from('rrhh_empleados')
      .insert({
        ...empleadoData,
        numero_empleado,
        nombre_completo,
        salario_diario,
        salario_diario_integrado,
        estatus: 'ACTIVO'
      })
      .select()
      .single();

    if (error) throw error;
    return this.getById(data.id);
  },

  async update(id: string, empleadoData: Partial<Empleado>): Promise<Empleado> {
    const { data, error } = await supabase
      .from('rrhh_empleados')
      .update(empleadoData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.getById(data.id);
  },

  async darBaja(id: string, motivo: string): Promise<Empleado> {
    return this.update(id, {
      estatus: 'BAJA',
      fecha_baja: new Date().toISOString(),
      motivo_baja: motivo
    });
  },

  async getDepartamentos() {
    const { data, error } = await supabase
      .from('rrhh_departamentos')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return data;
  },

  async getPuestos() {
    const { data, error } = await supabase
      .from('rrhh_puestos')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return data;
  }
};
