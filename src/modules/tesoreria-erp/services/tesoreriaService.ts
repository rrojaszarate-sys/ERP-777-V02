// ============================================
// SERVICIOS DEL MÓDULO DE TESORERÍA
// ============================================

import { supabase } from '../../../core/config/supabase';
import type { CuentaBancaria, MovimientoBancario, MetricasTesoreria, FlujoCaja } from '../types';

// ============================================
// CUENTAS BANCARIAS
// ============================================

export const fetchCuentasBancarias = async (companyId: string) => {
  const { data, error } = await supabase
    .from('tes_cuentas_bancarias')
    .select('*')
    .eq('company_id', companyId)
    .order('banco');

  if (error) throw error;
  return data as CuentaBancaria[];
};

export const fetchCuentaBancariaById = async (id: number) => {
  const { data, error } = await supabase
    .from('tes_cuentas_bancarias')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CuentaBancaria;
};

export const createCuentaBancaria = async (cuenta: Partial<CuentaBancaria>) => {
  const { data, error } = await supabase
    .from('tes_cuentas_bancarias')
    .insert([cuenta])
    .select()
    .single();

  if (error) throw error;
  return data as CuentaBancaria;
};

export const updateCuentaBancaria = async (id: number, cuenta: Partial<CuentaBancaria>) => {
  const { data, error } = await supabase
    .from('tes_cuentas_bancarias')
    .update(cuenta)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CuentaBancaria;
};

// ============================================
// MOVIMIENTOS BANCARIOS
// ============================================

export const fetchMovimientosBancarios = async (companyId: string, filters?: {
  cuenta_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  conciliado?: boolean;
}) => {
  let query = supabase
    .from('tes_movimientos')
    .select('*, cuenta:tes_cuentas_bancarias(*)')
    .eq('company_id', companyId);

  if (filters?.cuenta_id) {
    query = query.eq('cuenta_id', filters.cuenta_id);
  }

  if (filters?.fecha_inicio) {
    query = query.gte('fecha', filters.fecha_inicio);
  }

  if (filters?.fecha_fin) {
    query = query.lte('fecha', filters.fecha_fin);
  }

  if (filters?.conciliado !== undefined) {
    query = query.eq('conciliado', filters.conciliado);
  }

  query = query.order('fecha', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data as MovimientoBancario[];
};

export const createMovimientoBancario = async (movimiento: Partial<MovimientoBancario>) => {
  // Obtener cuenta para calcular saldo resultante
  const { data: cuenta } = await supabase
    .from('tes_cuentas_bancarias')
    .select('saldo_actual')
    .eq('id', movimiento.cuenta_id)
    .single();

  let nuevoSaldo = cuenta?.saldo_actual || 0;

  if (movimiento.tipo === 'deposito') {
    nuevoSaldo += movimiento.monto || 0;
  } else if (movimiento.tipo === 'retiro' || movimiento.tipo === 'transferencia') {
    nuevoSaldo -= movimiento.monto || 0;
  }

  const movimientoConSaldo = {
    ...movimiento,
    saldo_resultante: nuevoSaldo
  };

  const { data, error } = await supabase
    .from('tes_movimientos')
    .insert([movimientoConSaldo])
    .select()
    .single();

  if (error) throw error;

  // Actualizar saldo de cuenta
  await supabase
    .from('tes_cuentas_bancarias')
    .update({ saldo_actual: nuevoSaldo })
    .eq('id', movimiento.cuenta_id);

  return data as MovimientoBancario;
};

export const conciliarMovimiento = async (id: number) => {
  const { data, error } = await supabase
    .from('tes_movimientos')
    .update({ conciliado: true })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as MovimientoBancario;
};

// ============================================
// MÉTRICAS Y REPORTES
// ============================================

export const fetchMetricasTesoreria = async (companyId: string): Promise<MetricasTesoreria> => {
  const { data: cuentas } = await supabase
    .from('tes_cuentas_bancarias')
    .select('saldo_actual, activa')
    .eq('company_id', companyId);

  const saldo_total = cuentas?.reduce((sum, c) => sum + (c.activa ? c.saldo_actual : 0), 0) || 0;
  const cuentas_activas = cuentas?.filter(c => c.activa).length || 0;

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const finMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

  const { data: movimientos } = await supabase
    .from('tes_movimientos')
    .select('tipo, monto, conciliado')
    .eq('company_id', companyId)
    .gte('fecha', inicioMes)
    .lte('fecha', finMes);

  const movimientos_mes = movimientos?.length || 0;
  const pendientes_conciliacion = movimientos?.filter(m => !m.conciliado).length || 0;
  const ingresos_mes = movimientos?.filter(m => m.tipo === 'deposito').reduce((sum, m) => sum + m.monto, 0) || 0;
  const egresos_mes = movimientos?.filter(m => m.tipo === 'retiro' || m.tipo === 'transferencia').reduce((sum, m) => sum + m.monto, 0) || 0;
  const flujo_neto_mes = ingresos_mes - egresos_mes;

  return {
    saldo_total,
    cuentas_activas,
    movimientos_mes,
    pendientes_conciliacion,
    ingresos_mes,
    egresos_mes,
    flujo_neto_mes
  };
};

export const fetchFlujoCaja = async (companyId: string, meses: number = 12): Promise<FlujoCaja[]> => {
  const flujos: FlujoCaja[] = [];
  const hoy = new Date();

  for (let i = meses - 1; i >= 0; i--) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString().split('T')[0];
    const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: movimientos } = await supabase
      .from('tes_movimientos')
      .select('tipo, monto')
      .eq('company_id', companyId)
      .gte('fecha', inicioMes)
      .lte('fecha', finMes);

    const ingresos = movimientos?.filter(m => m.tipo === 'deposito').reduce((sum, m) => sum + m.monto, 0) || 0;
    const egresos = movimientos?.filter(m => m.tipo === 'retiro' || m.tipo === 'transferencia').reduce((sum, m) => sum + m.monto, 0) || 0;

    flujos.push({
      periodo: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`,
      ingresos,
      egresos,
      saldo_inicial: 0,
      saldo_final: 0,
      flujo_neto: ingresos - egresos
    });
  }

  return flujos;
};

export const tesoreriaService = {
  fetchCuentasBancarias,
  fetchCuentaBancariaById,
  createCuentaBancaria,
  updateCuentaBancaria,
  fetchMovimientosBancarios,
  createMovimientoBancario,
  conciliarMovimiento,
  fetchMetricasTesoreria,
  fetchFlujoCaja
};
