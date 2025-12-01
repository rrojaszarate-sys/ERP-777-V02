import { supabase } from '@/core/config/supabase';
import type { Nomina, NominaInsert, NominaDetalle } from '../types';

export const nominasService = {
  async getAll(): Promise<Nomina[]> {
    const { data, error } = await supabase
      .from('rrhh_nominas')
      .select('*')
      .order('fecha_inicio', { ascending: false });

    if (error) throw error;
    return data as Nomina[];
  },

  async getById(id: string): Promise<Nomina> {
    const { data: nomina, error: errorNom } = await supabase
      .from('rrhh_nominas')
      .select('*')
      .eq('id', id)
      .single();

    if (errorNom) throw errorNom;

    const { data: detalles, error: errorDet } = await supabase
      .from('rrhh_nominas_detalle')
      .select(`
        *,
        empleado:rrhh_empleados(*)
      `)
      .eq('nomina_id', id)
      .order('empleado_id');

    if (errorDet) throw errorDet;

    return { ...nomina, detalles } as Nomina;
  },

  async create(nominaData: NominaInsert): Promise<Nomina> {
    // Generar folio
    const { data: ultimas } = await supabase
      .from('rrhh_nominas')
      .select('folio')
      .order('created_at', { ascending: false })
      .limit(1);

    const year = new Date().getFullYear();
    const numero = ultimas && ultimas.length > 0
      ? parseInt(ultimas[0].folio.split('-')[2]) + 1
      : 1;
    const folio = `NOM-${year}-${numero.toString().padStart(6, '0')}`;

    // Obtener empleados a incluir
    let empleadosQuery = supabase
      .from('rrhh_empleados')
      .select('*')
      .eq('estatus', 'ACTIVO');

    if (nominaData.empleados_ids && nominaData.empleados_ids.length > 0) {
      empleadosQuery = empleadosQuery.in('id', nominaData.empleados_ids);
    }

    const { data: empleados, error: errorEmp } = await empleadosQuery;
    if (errorEmp) throw errorEmp;

    // Crear nómina
    const { data: nomina, error: errorNom } = await supabase
      .from('rrhh_nominas')
      .insert({
        folio,
        tipo: nominaData.tipo,
        periodo: nominaData.periodo,
        fecha_inicio: nominaData.fecha_inicio,
        fecha_fin: nominaData.fecha_fin,
        fecha_pago: nominaData.fecha_pago,
        total_percepciones: 0,
        total_deducciones: 0,
        total_neto: 0,
        num_empleados: empleados?.length || 0,
        estatus: 'BORRADOR'
      })
      .select()
      .single();

    if (errorNom) throw errorNom;

    // Crear detalles para cada empleado (inicialmente en ceros)
    if (empleados && empleados.length > 0) {
      const detalles = empleados.map(emp => ({
        nomina_id: nomina.id,
        empleado_id: emp.id,
        dias_trabajados: 0,
        dias_falta: 0,
        dias_vacaciones: 0,
        dias_incapacidad: 0,
        salario_base: emp.salario_base,
        salario_diario: emp.salario_diario,
        total_percepciones: 0,
        total_deducciones: 0,
        total_neto: 0,
        estatus_cfdi: 'PENDIENTE'
      }));

      const { error: errorDet } = await supabase
        .from('rrhh_nominas_detalle')
        .insert(detalles);

      if (errorDet) {
        await supabase.from('rrhh_nominas').delete().eq('id', nomina.id);
        throw errorDet;
      }
    }

    return this.getById(nomina.id);
  },

  async calcular(id: string): Promise<Nomina> {
    // Esta función debería llamar a la lógica de cálculo de nómina
    // Por ahora solo actualizamos el estatus
    const { error } = await supabase
      .from('rrhh_nominas')
      .update({
        estatus: 'CALCULADA',
        fecha_calculo: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // TODO: Implementar cálculo real de percepciones y deducciones
    // usando los conceptos de nómina configurados

    return this.getById(id);
  },

  async timbrar(id: string): Promise<Nomina> {
    // Esta función debería conectar con un PAC para timbrar
    const { error } = await supabase
      .from('rrhh_nominas')
      .update({
        estatus: 'TIMBRADA',
        fecha_timbrado: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // TODO: Implementar integración con PAC para CFDI de nómina

    return this.getById(id);
  },

  async marcarPagada(id: string): Promise<Nomina> {
    const { error } = await supabase
      .from('rrhh_nominas')
      .update({
        estatus: 'PAGADA',
        fecha_pago_real: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return this.getById(id);
  },

  async getConceptos() {
    const { data, error } = await supabase
      .from('rrhh_conceptos_nomina')
      .select('*')
      .eq('activo', true)
      .order('orden');

    if (error) throw error;
    return data;
  }
};
