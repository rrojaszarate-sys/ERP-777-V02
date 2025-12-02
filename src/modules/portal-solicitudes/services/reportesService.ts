/**
 * Servicio de Reportes de Gastos del Portal
 */

import { supabase } from '../../../core/config/supabase';
import type { 
  ReporteGastosPorTipo, 
  ReporteGastosPorEvento, 
  ReporteGastosPorDepartamento,
  TipoGasto 
} from '../types';

// ==========================================
// TIPOS DE GASTO
// ==========================================

/**
 * Obtener tipos de gasto
 */
export async function fetchTiposGasto(empresaId: string): Promise<TipoGasto[]> {
  const { data, error } = await supabase
    .from('tipos_gasto_erp')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .order('nombre');

  if (error) throw error;
  return data || [];
}

// ==========================================
// REPORTES
// ==========================================

/**
 * Reporte de gastos por tipo de gasto
 */
export async function reporteGastosPorTipo(
  empresaId: string,
  filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
    categoria?: string;
  }
): Promise<ReporteGastosPorTipo[]> {
  // Usar la vista si está disponible, o calcular manualmente
  let query = supabase
    .from('vw_reporte_gastos_por_tipo')
    .select('*')
    .eq('empresa_id', empresaId);

  // Si no hay vista, calcular manualmente
  // Esta es una implementación alternativa por si la vista no existe
  const { data, error } = await query;

  if (error) {
    // Fallback: calcular manualmente
    return await calcularReportePorTipoManual(empresaId, filtros);
  }

  return data || [];
}

/**
 * Cálculo manual del reporte por tipo (fallback)
 */
async function calcularReportePorTipoManual(
  empresaId: string,
  filtros?: { fechaInicio?: string; fechaFin?: string; categoria?: string }
): Promise<ReporteGastosPorTipo[]> {
  let query = supabase
    .from('solicitudes_compra_erp')
    .select(`
      tipo_gasto_id,
      estado,
      monto_estimado,
      monto_aprobado,
      created_at,
      tipo_gasto:tipos_gasto_erp(id, codigo, nombre, categoria)
    `)
    .eq('empresa_id', empresaId)
    .neq('estado', 'borrador');

  if (filtros?.fechaInicio) {
    query = query.gte('created_at', filtros.fechaInicio);
  }
  if (filtros?.fechaFin) {
    query = query.lte('created_at', filtros.fechaFin);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Agrupar por tipo de gasto y mes
  const grupos = new Map<string, ReporteGastosPorTipo>();

  data?.forEach((sol: any) => {
    const mes = sol.created_at.substring(0, 7); // YYYY-MM
    const tipoGasto = sol.tipo_gasto;
    const key = `${tipoGasto?.id || 'null'}_${mes}`;

    if (!grupos.has(key)) {
      grupos.set(key, {
        empresa_id: empresaId,
        tipo_gasto_id: tipoGasto?.id || 0,
        tipo_gasto_codigo: tipoGasto?.codigo || 'SIN_TIPO',
        tipo_gasto_nombre: tipoGasto?.nombre || 'Sin clasificar',
        categoria: tipoGasto?.categoria || 'operativo',
        mes,
        cantidad_solicitudes: 0,
        monto_total_estimado: 0,
        monto_total_aprobado: 0,
        aprobadas: 0,
        rechazadas: 0,
        pendientes: 0,
      });
    }

    const grupo = grupos.get(key)!;
    grupo.cantidad_solicitudes++;
    grupo.monto_total_estimado += sol.monto_estimado || 0;
    grupo.monto_total_aprobado += sol.monto_aprobado || 0;

    if (sol.estado === 'aprobada') grupo.aprobadas++;
    else if (sol.estado === 'rechazada') grupo.rechazadas++;
    else if (['enviada', 'en_revision'].includes(sol.estado)) grupo.pendientes++;
  });

  return Array.from(grupos.values());
}

/**
 * Reporte de gastos por evento
 */
export async function reporteGastosPorEvento(
  empresaId: string,
  filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
    eventoId?: number;
  }
): Promise<ReporteGastosPorEvento[]> {
  let query = supabase
    .from('solicitudes_compra_erp')
    .select(`
      evento_id,
      estado,
      monto_estimado,
      monto_aprobado,
      evento:eventos(id, nombre_proyecto, fecha_inicio, fecha_fin)
    `)
    .eq('empresa_id', empresaId)
    .eq('tipo_destino', 'evento')
    .neq('estado', 'borrador')
    .not('evento_id', 'is', null);

  if (filtros?.eventoId) {
    query = query.eq('evento_id', filtros.eventoId);
  }
  if (filtros?.fechaInicio) {
    query = query.gte('created_at', filtros.fechaInicio);
  }
  if (filtros?.fechaFin) {
    query = query.lte('created_at', filtros.fechaFin);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Agrupar por evento
  const grupos = new Map<number, ReporteGastosPorEvento>();

  data?.forEach((sol: any) => {
    const eventoId = sol.evento_id;
    const evento = sol.evento;

    if (!grupos.has(eventoId)) {
      grupos.set(eventoId, {
        empresa_id: empresaId,
        evento_id: eventoId,
        evento_nombre: evento?.nombre_proyecto || 'Evento desconocido',
        fecha_inicio: evento?.fecha_inicio,
        fecha_fin: evento?.fecha_fin,
        cantidad_solicitudes: 0,
        monto_total_estimado: 0,
        monto_total_aprobado: 0,
        aprobadas: 0,
        rechazadas: 0,
        completadas: 0,
      });
    }

    const grupo = grupos.get(eventoId)!;
    grupo.cantidad_solicitudes++;
    grupo.monto_total_estimado += sol.monto_estimado || 0;
    grupo.monto_total_aprobado += sol.monto_aprobado || 0;

    if (sol.estado === 'aprobada') grupo.aprobadas++;
    else if (sol.estado === 'rechazada') grupo.rechazadas++;
    else if (sol.estado === 'recibida') grupo.completadas++;
  });

  return Array.from(grupos.values());
}

/**
 * Reporte de gastos por departamento
 */
export async function reporteGastosPorDepartamento(
  empresaId: string,
  filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
    departamentoId?: number;
  }
): Promise<ReporteGastosPorDepartamento[]> {
  let query = supabase
    .from('solicitudes_compra_erp')
    .select(`
      departamento_id,
      estado,
      monto_estimado,
      monto_aprobado,
      created_at,
      departamento:departamentos_erp(id, codigo, nombre, centro_costos)
    `)
    .eq('empresa_id', empresaId)
    .neq('estado', 'borrador');

  if (filtros?.departamentoId) {
    query = query.eq('departamento_id', filtros.departamentoId);
  }
  if (filtros?.fechaInicio) {
    query = query.gte('created_at', filtros.fechaInicio);
  }
  if (filtros?.fechaFin) {
    query = query.lte('created_at', filtros.fechaFin);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Agrupar por departamento y mes
  const grupos = new Map<string, ReporteGastosPorDepartamento>();

  data?.forEach((sol: any) => {
    const mes = sol.created_at.substring(0, 7);
    const depto = sol.departamento;
    const key = `${depto?.id || 'null'}_${mes}`;

    if (!grupos.has(key)) {
      grupos.set(key, {
        empresa_id: empresaId,
        departamento_id: depto?.id || 0,
        departamento_codigo: depto?.codigo || 'SIN_DEPTO',
        departamento_nombre: depto?.nombre || 'Sin departamento',
        centro_costos: depto?.centro_costos || '',
        mes,
        cantidad_solicitudes: 0,
        monto_total_estimado: 0,
        monto_total_aprobado: 0,
        aprobadas: 0,
        rechazadas: 0,
      });
    }

    const grupo = grupos.get(key)!;
    grupo.cantidad_solicitudes++;
    grupo.monto_total_estimado += sol.monto_estimado || 0;
    grupo.monto_total_aprobado += sol.monto_aprobado || 0;

    if (sol.estado === 'aprobada') grupo.aprobadas++;
    else if (sol.estado === 'rechazada') grupo.rechazadas++;
  });

  return Array.from(grupos.values());
}

/**
 * Resumen general de gastos
 */
export async function resumenGeneralGastos(
  empresaId: string,
  periodo?: { inicio: string; fin: string }
): Promise<{
  total_solicitudes: number;
  monto_total_estimado: number;
  monto_total_aprobado: number;
  por_estado: Record<string, number>;
  por_prioridad: Record<string, number>;
  promedio_tiempo_aprobacion_dias: number;
}> {
  let query = supabase
    .from('solicitudes_compra_erp')
    .select('estado, prioridad, monto_estimado, monto_aprobado, created_at, enviada_at')
    .eq('empresa_id', empresaId)
    .neq('estado', 'borrador');

  if (periodo?.inicio) {
    query = query.gte('created_at', periodo.inicio);
  }
  if (periodo?.fin) {
    query = query.lte('created_at', periodo.fin);
  }

  const { data, error } = await query;
  if (error) throw error;

  const resultado = {
    total_solicitudes: data?.length || 0,
    monto_total_estimado: 0,
    monto_total_aprobado: 0,
    por_estado: {} as Record<string, number>,
    por_prioridad: {} as Record<string, number>,
    promedio_tiempo_aprobacion_dias: 0,
  };

  let totalDiasAprobacion = 0;
  let conteoAprobadas = 0;

  data?.forEach((sol: any) => {
    resultado.monto_total_estimado += sol.monto_estimado || 0;
    resultado.monto_total_aprobado += sol.monto_aprobado || 0;

    resultado.por_estado[sol.estado] = (resultado.por_estado[sol.estado] || 0) + 1;
    resultado.por_prioridad[sol.prioridad] = (resultado.por_prioridad[sol.prioridad] || 0) + 1;

    // Calcular tiempo de aprobación
    if (sol.estado === 'aprobada' && sol.enviada_at) {
      const fechaEnvio = new Date(sol.enviada_at);
      const fechaCreacion = new Date(sol.created_at);
      const dias = Math.ceil((fechaEnvio.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24));
      totalDiasAprobacion += dias;
      conteoAprobadas++;
    }
  });

  if (conteoAprobadas > 0) {
    resultado.promedio_tiempo_aprobacion_dias = totalDiasAprobacion / conteoAprobadas;
  }

  return resultado;
}

/**
 * Top departamentos por gasto
 */
export async function topDepartamentosPorGasto(
  empresaId: string,
  limite = 5
): Promise<Array<{ departamento: string; monto: number; cantidad: number }>> {
  const reportePorDepto = await reporteGastosPorDepartamento(empresaId);

  // Agrupar por departamento (sin separar por mes)
  const agrupado = new Map<string, { monto: number; cantidad: number }>();

  reportePorDepto.forEach((r) => {
    const key = r.departamento_nombre;
    if (!agrupado.has(key)) {
      agrupado.set(key, { monto: 0, cantidad: 0 });
    }
    const actual = agrupado.get(key)!;
    actual.monto += r.monto_total_estimado;
    actual.cantidad += r.cantidad_solicitudes;
  });

  return Array.from(agrupado.entries())
    .map(([departamento, datos]) => ({ departamento, ...datos }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, limite);
}

// Exportar como servicio
export const reportesService = {
  fetchTiposGasto,
  reporteGastosPorTipo,
  reporteGastosPorEvento,
  reporteGastosPorDepartamento,
  resumenGeneralGastos,
  topDepartamentosPorGasto,
};
