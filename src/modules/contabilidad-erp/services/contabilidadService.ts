/**
 * SERVICIO DE CONTABILIDAD
 * Funciones para plan de cuentas, pólizas y reportes
 */

import { supabase } from '../../../core/config/supabase';
import type {
  PlanCuentas,
  Poliza,
  Movimiento,
  PolizaConMovimientos,
  PeriodoContable,
  LibroDiarioItem,
  MayorGeneralItem,
  BalanceComprobacionItem
} from '../types';

// ============================================================================
// PLAN DE CUENTAS
// ============================================================================

export const fetchPlanCuentas = async (companyId: string) => {
  const { data, error } = await supabase
    .from('cont_plan_cuentas')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('codigo');

  if (error) throw error;
  return data as PlanCuentas[];
};

export const fetchCuentasByCodigo = async (codigo: string, companyId: string) => {
  const { data, error } = await supabase
    .from('cont_plan_cuentas')
    .select('*')
    .eq('company_id', companyId)
    .ilike('codigo', `${codigo}%`)
    .eq('activo', true)
    .order('codigo');

  if (error) throw error;
  return data as PlanCuentas[];
};

export const fetchCuentasQueAceptanMovimientos = async (companyId: string) => {
  const { data, error } = await supabase
    .from('cont_plan_cuentas')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .eq('acepta_movimientos', true)
    .order('codigo');

  if (error) throw error;
  return data as PlanCuentas[];
};

export const createCuenta = async (cuenta: Partial<PlanCuentas>) => {
  const { data, error } = await supabase
    .from('cont_plan_cuentas')
    .insert([cuenta])
    .select()
    .single();

  if (error) throw error;
  return data as PlanCuentas;
};

export const updateCuenta = async (id: number, updates: Partial<PlanCuentas>) => {
  const { data, error } = await supabase
    .from('cont_plan_cuentas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlanCuentas;
};

// ============================================================================
// PÓLIZAS Y MOVIMIENTOS
// ============================================================================

export const fetchPolizas = async (
  companyId: string,
  filters?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo?: string;
    status?: string;
  }
) => {
  let query = supabase
    .from('cont_polizas')
    .select('*')
    .eq('company_id', companyId)
    .order('fecha', { ascending: false })
    .order('numero_poliza', { ascending: false });

  if (filters?.fecha_inicio) {
    query = query.gte('fecha', filters.fecha_inicio);
  }
  if (filters?.fecha_fin) {
    query = query.lte('fecha', filters.fecha_fin);
  }
  if (filters?.tipo) {
    query = query.eq('tipo', filters.tipo);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Poliza[];
};

export const fetchPolizaById = async (id: number) => {
  const { data: poliza, error: polizaError } = await supabase
    .from('cont_polizas')
    .select('*')
    .eq('id', id)
    .single();

  if (polizaError) throw polizaError;

  const { data: movimientos, error: movError } = await supabase
    .from('cont_movimientos')
    .select(`
      *,
      cuenta:cont_plan_cuentas(*)
    `)
    .eq('poliza_id', id)
    .order('id');

  if (movError) throw movError;

  return {
    ...poliza,
    movimientos
  } as PolizaConMovimientos;
};

export const createPoliza = async (
  polizaData: Partial<Poliza>,
  movimientos: Partial<Movimiento>[]
) => {
  // Validar que debe = haber
  const totalDebe = movimientos.reduce((sum, m) => sum + (m.debe || 0), 0);
  const totalHaber = movimientos.reduce((sum, m) => sum + (m.haber || 0), 0);

  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    throw new Error(`La póliza no está cuadrada. Debe: ${totalDebe}, Haber: ${totalHaber}`);
  }

  // Crear póliza
  const { data: poliza, error: polizaError } = await supabase
    .from('cont_polizas')
    .insert([{
      ...polizaData,
      total_debe: totalDebe,
      total_haber: totalHaber
    }])
    .select()
    .single();

  if (polizaError) throw polizaError;

  // Crear movimientos
  const movimientosConPoliza = movimientos.map(m => ({
    ...m,
    poliza_id: poliza.id
  }));

  const { data: movimientosCreados, error: movError } = await supabase
    .from('cont_movimientos')
    .insert(movimientosConPoliza)
    .select();

  if (movError) throw movError;

  return {
    ...poliza,
    movimientos: movimientosCreados
  } as PolizaConMovimientos;
};

export const aplicarPoliza = async (id: number) => {
  const { data, error } = await supabase
    .from('cont_polizas')
    .update({ status: 'aplicada', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'borrador')
    .select()
    .single();

  if (error) throw error;
  return data as Poliza;
};

export const cancelarPoliza = async (id: number, userId: string, motivo: string) => {
  const { data, error } = await supabase
    .from('cont_polizas')
    .update({
      status: 'cancelada',
      cancelada_por: userId,
      fecha_cancelacion: new Date().toISOString(),
      motivo_cancelacion: motivo,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'aplicada')
    .select()
    .single();

  if (error) throw error;
  return data as Poliza;
};

// ============================================================================
// REPORTES CONTABLES
// ============================================================================

export const fetchLibroDiario = async (
  companyId: string,
  fechaInicio: string,
  fechaFin: string
) => {
  // Query from tables directly (more reliable than views)
  const { data, error } = await supabase
    .from('cont_polizas')
    .select(`
      id,
      numero_poliza,
      fecha,
      tipo,
      concepto,
      referencia,
      status,
      movimientos:cont_movimientos(
        id,
        concepto,
        debe,
        haber,
        referencia,
        cuenta:cont_plan_cuentas(codigo, nombre)
      )
    `)
    .eq('company_id', companyId)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha', { ascending: true })
    .order('numero_poliza', { ascending: true });

  if (error) throw error;

  // Transform to LibroDiarioItem format
  const items: LibroDiarioItem[] = [];
  data?.forEach(poliza => {
    poliza.movimientos?.forEach((mov: any) => {
      items.push({
        poliza_id: poliza.id,
        numero_poliza: poliza.numero_poliza,
        fecha: poliza.fecha,
        tipo: poliza.tipo,
        concepto_poliza: poliza.concepto,
        referencia: poliza.referencia,
        status: poliza.status,
        movimiento_id: mov.id,
        cuenta_codigo: mov.cuenta?.codigo || '',
        cuenta_nombre: mov.cuenta?.nombre || '',
        concepto_movimiento: mov.concepto,
        debe: mov.debe,
        haber: mov.haber,
        referencia_movimiento: mov.referencia
      });
    });
  });

  return items;
};

export const fetchMayorGeneral = async (
  companyId: string,
  fechaInicio?: string,
  fechaFin?: string
) => {
  // Get all accounts with their movements
  const { data: cuentas, error: cuentasError } = await supabase
    .from('cont_plan_cuentas')
    .select('id, codigo, nombre, tipo, naturaleza, saldo_inicial')
    .eq('company_id', companyId)
    .eq('acepta_movimientos', true)
    .eq('activo', true)
    .order('codigo');

  if (cuentasError) throw cuentasError;

  // Get all movements for the period
  let movQuery = supabase
    .from('cont_movimientos')
    .select(`
      cuenta_id,
      debe,
      haber,
      poliza:cont_polizas!inner(company_id, status, fecha)
    `)
    .eq('poliza.company_id', companyId)
    .eq('poliza.status', 'aplicada');

  if (fechaInicio) {
    movQuery = movQuery.gte('poliza.fecha', fechaInicio);
  }
  if (fechaFin) {
    movQuery = movQuery.lte('poliza.fecha', fechaFin);
  }

  const { data: movimientos, error: movError } = await movQuery;
  if (movError) throw movError;

  // Calculate totals per account
  const movPorCuenta: Record<number, { debe: number; haber: number }> = {};
  movimientos?.forEach((m: any) => {
    if (!movPorCuenta[m.cuenta_id]) {
      movPorCuenta[m.cuenta_id] = { debe: 0, haber: 0 };
    }
    movPorCuenta[m.cuenta_id].debe += m.debe || 0;
    movPorCuenta[m.cuenta_id].haber += m.haber || 0;
  });

  // Build result
  const result: MayorGeneralItem[] = cuentas?.map(cuenta => {
    const movs = movPorCuenta[cuenta.id] || { debe: 0, haber: 0 };
    const saldoInicial = cuenta.saldo_inicial || 0;
    let saldoFinal = saldoInicial;

    if (cuenta.naturaleza === 'deudora') {
      saldoFinal = saldoInicial + movs.debe - movs.haber;
    } else {
      saldoFinal = saldoInicial + movs.haber - movs.debe;
    }

    return {
      cuenta_id: cuenta.id,
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      naturaleza: cuenta.naturaleza,
      saldo_inicial: saldoInicial,
      total_debe: movs.debe,
      total_haber: movs.haber,
      saldo_final: saldoFinal
    };
  }) || [];

  return result;
};

export const fetchBalanceComprobacion = async (
  companyId: string,
  fechaInicio: string,
  fechaFin: string
) => {
  // Get all accounts
  const { data: cuentas, error: cuentasError } = await supabase
    .from('cont_plan_cuentas')
    .select('id, codigo, nombre, saldo_inicial, naturaleza')
    .eq('company_id', companyId)
    .eq('acepta_movimientos', true)
    .eq('activo', true)
    .order('codigo');

  if (cuentasError) throw cuentasError;

  // Get movements for the period
  const { data: movimientos, error: movError } = await supabase
    .from('cont_movimientos')
    .select(`
      cuenta_id,
      debe,
      haber,
      poliza:cont_polizas!inner(company_id, status, fecha)
    `)
    .eq('poliza.company_id', companyId)
    .eq('poliza.status', 'aplicada')
    .gte('poliza.fecha', fechaInicio)
    .lte('poliza.fecha', fechaFin);

  if (movError) throw movError;

  // Calculate totals per account
  const movPorCuenta: Record<number, { debe: number; haber: number }> = {};
  movimientos?.forEach((m: any) => {
    if (!movPorCuenta[m.cuenta_id]) {
      movPorCuenta[m.cuenta_id] = { debe: 0, haber: 0 };
    }
    movPorCuenta[m.cuenta_id].debe += m.debe || 0;
    movPorCuenta[m.cuenta_id].haber += m.haber || 0;
  });

  // Build balance
  const result: BalanceComprobacionItem[] = cuentas?.map(cuenta => {
    const movs = movPorCuenta[cuenta.id] || { debe: 0, haber: 0 };
    const saldoInicial = cuenta.saldo_inicial || 0;
    let saldoFinal = saldoInicial;

    if (cuenta.naturaleza === 'deudora') {
      saldoFinal = saldoInicial + movs.debe - movs.haber;
    } else {
      saldoFinal = saldoInicial + movs.haber - movs.debe;
    }

    return {
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      saldo_inicial: saldoInicial,
      debe_periodo: movs.debe,
      haber_periodo: movs.haber,
      saldo_final: saldoFinal
    };
  }) || [];

  return result;
};

// ============================================================================
// PERIODOS CONTABLES
// ============================================================================

export const fetchPeriodos = async (companyId: string, anio?: number) => {
  let query = supabase
    .from('cont_periodos')
    .select('*')
    .eq('company_id', companyId)
    .order('anio', { ascending: false })
    .order('mes', { ascending: false });

  if (anio) {
    query = query.eq('anio', anio);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as PeriodoContable[];
};

export const cerrarPeriodo = async (
  periodoId: number,
  userId: string
) => {
  const { data, error } = await supabase
    .from('cont_periodos')
    .update({
      cerrado: true,
      fecha_cierre: new Date().toISOString(),
      cerrado_por: userId
    })
    .eq('id', periodoId)
    .eq('cerrado', false)
    .select()
    .single();

  if (error) throw error;
  return data as PeriodoContable;
};

// ============================================================================
// GENERACIÓN AUTOMÁTICA DE PÓLIZAS
// ============================================================================

export const generarPolizaDesdeEvento = async (
  eventoId: number,
  tipo: 'ingreso' | 'gasto',
  companyId: string,
  userId: string
) => {
  // Obtener configuración de cuentas contables por defecto
  const { data: config } = await supabase
    .from('cont_configuracion')
    .select('*')
    .eq('company_id', companyId)
    .single();

  // Cuentas por defecto (si no hay configuración)
  const cuentaIngresos = config?.cuenta_ingresos_id || null;
  const cuentaGastos = config?.cuenta_gastos_id || null;
  const cuentaBanco = config?.cuenta_banco_id || null;
  const cuentaClientes = config?.cuenta_clientes_id || null;
  const cuentaProveedores = config?.cuenta_proveedores_id || null;

  if (tipo === 'ingreso') {
    // Obtener ingresos del evento
    const { data: ingresos, error: ingError } = await supabase
      .from('evt_ingresos')
      .select('*')
      .eq('evento_id', eventoId)
      .eq('cobrado', true); // Solo ingresos cobrados

    if (ingError) throw ingError;
    if (!ingresos || ingresos.length === 0) {
      throw new Error('No hay ingresos cobrados para generar póliza');
    }

    // Calcular total de ingresos
    const totalIngresos = ingresos.reduce((sum, ing) => sum + (ing.total || 0), 0);

    // Crear movimientos contables
    const movimientos: Partial<Movimiento>[] = [];

    // Debito: Banco o Clientes
    if (cuentaBanco || cuentaClientes) {
      movimientos.push({
        cuenta_id: cuentaBanco || cuentaClientes,
        concepto: `Ingreso evento #${eventoId}`,
        debe: totalIngresos,
        haber: 0
      });
    }

    // Crédito: Cuenta de Ingresos
    if (cuentaIngresos) {
      movimientos.push({
        cuenta_id: cuentaIngresos,
        concepto: `Ingreso evento #${eventoId}`,
        debe: 0,
        haber: totalIngresos
      });
    }

    if (movimientos.length < 2) {
      throw new Error('Faltan cuentas contables configuradas para generar póliza de ingreso');
    }

    // Generar número de póliza
    const fecha = new Date().toISOString().split('T')[0];
    const { data: lastPoliza } = await supabase
      .from('cont_polizas')
      .select('numero_poliza')
      .eq('company_id', companyId)
      .order('id', { ascending: false })
      .limit(1);

    const lastNum = lastPoliza?.[0]?.numero_poliza?.match(/\d+$/)?.[0] || '0';
    const newNum = (parseInt(lastNum) + 1).toString().padStart(6, '0');
    const numeroPoliza = `POL-${newNum}`;

    // Crear póliza
    return createPoliza(
      {
        numero_poliza: numeroPoliza,
        tipo: 'ingreso',
        fecha,
        concepto: `Registro de ingresos evento #${eventoId}`,
        origen: 'eventos',
        origen_id: eventoId.toString(),
        status: 'borrador',
        created_by: userId,
        company_id: companyId
      },
      movimientos
    );

  } else {
    // tipo === 'gasto'
    // Obtener gastos del evento
    const { data: gastos, error: gasError } = await supabase
      .from('evt_gastos')
      .select('*')
      .eq('evento_id', eventoId)
      .eq('pagado', true); // Solo gastos pagados

    if (gasError) throw gasError;
    if (!gastos || gastos.length === 0) {
      throw new Error('No hay gastos pagados para generar póliza');
    }

    // Calcular total de gastos
    const totalGastos = gastos.reduce((sum, gasto) => sum + (gasto.total || 0), 0);

    // Crear movimientos contables
    const movimientos: Partial<Movimiento>[] = [];

    // Debito: Cuenta de Gastos
    if (cuentaGastos) {
      movimientos.push({
        cuenta_id: cuentaGastos,
        concepto: `Gastos evento #${eventoId}`,
        debe: totalGastos,
        haber: 0
      });
    }

    // Crédito: Banco o Proveedores
    if (cuentaBanco || cuentaProveedores) {
      movimientos.push({
        cuenta_id: cuentaBanco || cuentaProveedores,
        concepto: `Gastos evento #${eventoId}`,
        debe: 0,
        haber: totalGastos
      });
    }

    if (movimientos.length < 2) {
      throw new Error('Faltan cuentas contables configuradas para generar póliza de gasto');
    }

    // Generar número de póliza
    const fecha = new Date().toISOString().split('T')[0];
    const { data: lastPoliza } = await supabase
      .from('cont_polizas')
      .select('numero_poliza')
      .eq('company_id', companyId)
      .order('id', { ascending: false })
      .limit(1);

    const lastNum = lastPoliza?.[0]?.numero_poliza?.match(/\d+$/)?.[0] || '0';
    const newNum = (parseInt(lastNum) + 1).toString().padStart(6, '0');
    const numeroPoliza = `POL-${newNum}`;

    // Crear póliza
    return createPoliza(
      {
        numero_poliza: numeroPoliza,
        tipo: 'egreso',
        fecha,
        concepto: `Registro de gastos evento #${eventoId}`,
        origen: 'eventos',
        origen_id: eventoId.toString(),
        status: 'borrador',
        created_by: userId,
        company_id: companyId
      },
      movimientos
    );
  }
};
