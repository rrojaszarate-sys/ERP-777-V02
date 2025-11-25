import { supabase } from '@/core/config/supabase';
import type { TurnoCaja, TurnoCajaInsert } from '../types';

export const turnosCajaService = {
  async getAll(): Promise<TurnoCaja[]> {
    const { data, error } = await supabase
      .from('pos_turnos_caja')
      .select(`
        *,
        caja:pos_cajas(*)
      `)
      .order('fecha_apertura', { ascending: false });

    if (error) throw error;
    return data as TurnoCaja[];
  },

  async getTurnoActual(cajaId: string): Promise<TurnoCaja | null> {
    const { data, error } = await supabase
      .from('pos_turnos_caja')
      .select(`
        *,
        caja:pos_cajas(*)
      `)
      .eq('caja_id', cajaId)
      .eq('abierto', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as TurnoCaja | null;
  },

  async abrir(turnoData: TurnoCajaInsert): Promise<TurnoCaja> {
    // Verificar que no haya turno abierto en esa caja
    const turnoActual = await this.getTurnoActual(turnoData.caja_id);
    if (turnoActual) {
      throw new Error('Ya existe un turno abierto en esta caja');
    }

    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];

    const { data, error } = await supabase
      .from('pos_turnos_caja')
      .insert({
        ...turnoData,
        fecha_apertura: fecha,
        hora_apertura: hora,
        abierto: true,
        total_ventas: 0,
        total_devoluciones: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        num_ventas: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data as TurnoCaja;
  },

  async cerrar(id: string, montoFinal: number, observaciones?: string): Promise<TurnoCaja> {
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];

    // Obtener turno actual
    const { data: turno } = await supabase
      .from('pos_turnos_caja')
      .select('*')
      .eq('id', id)
      .single();

    if (!turno) throw new Error('Turno no encontrado');

    const montoEsperado = turno.monto_inicial + turno.total_efectivo;
    const diferencia = montoFinal - montoEsperado;

    const { data, error } = await supabase
      .from('pos_turnos_caja')
      .update({
        fecha_cierre: fecha,
        hora_cierre: hora,
        monto_final: montoFinal,
        monto_esperado: montoEsperado,
        diferencia,
        abierto: false,
        observaciones
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as TurnoCaja;
  },

  async getCajas() {
    const { data, error } = await supabase
      .from('pos_cajas')
      .select('*')
      .eq('activa', true)
      .order('nombre');

    if (error) throw error;
    return data;
  }
};
