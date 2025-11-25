import { useMemo } from 'react';
import {
  EventoCompleto,
  EventFinancialAnalysis,
  PortfolioFinancialSummary,
  FinancialProjection,
  FinancialResult,
  FinancialComparison
} from '../types/Event';

/**
 * Hook para calcular análisis financiero de eventos
 */
export const useEventFinancialAnalysis = () => {

  /**
   * Calcula el análisis financiero de un evento individual
   */
  const calculateEventAnalysis = (event: EventoCompleto): EventFinancialAnalysis => {
    // Proyección (Estimado)
    const ingreso_estimado = event.ganancia_estimada || event.ingreso_estimado || 0;
    const provisiones = event.provisiones || 0;
    const utilidad_estimada = ingreso_estimado - provisiones;
    const margen_estimado = ingreso_estimado > 0
      ? (utilidad_estimada / ingreso_estimado) * 100
      : 0;

    const projection: FinancialProjection = {
      ingreso_estimado,
      provisiones,
      utilidad_estimada,
      margen_estimado
    };

    // Resultado (Real)
    const ingreso_real = event.total || event.ingreso_real || 0;
    const gastos_pagados = event.total_gastos || 0; // Solo gastos pagados
    const gastos_pendientes = event.gastos_pendientes || 0;
    const gastos_totales = event.gastos_totales || (gastos_pagados + gastos_pendientes);
    const utilidad_real = event.utilidad || (ingreso_real - gastos_pagados);
    const margen_real = event.margen_utilidad ||
      (ingreso_real > 0 ? (utilidad_real / ingreso_real) * 100 : 0);

    const result: FinancialResult = {
      ingreso_real,
      gastos_pagados,
      gastos_pendientes,
      gastos_totales,
      utilidad_real,
      margen_real
    };

    // Comparación
    const diferencia_absoluta = utilidad_real - utilidad_estimada;
    const diferencia_porcentaje = utilidad_estimada > 0
      ? ((utilidad_real / utilidad_estimada) - 1) * 100
      : 0;

    const variacion_ingresos = ingreso_estimado > 0
      ? ((ingreso_real / ingreso_estimado) - 1) * 100
      : 0;

    const variacion_gastos = provisiones > 0
      ? ((gastos_pagados / provisiones) - 1) * 100
      : 0;

    const variacion_margen = margen_real - margen_estimado;

    const comparison: FinancialComparison = {
      diferencia_absoluta,
      diferencia_porcentaje,
      variacion_ingresos,
      variacion_gastos,
      variacion_margen
    };

    // Determinar estado basado en margen real
    let status: 'excelente' | 'bueno' | 'alerta' | 'critico';
    if (margen_real >= 50) status = 'excelente';
    else if (margen_real >= 35) status = 'bueno';
    else if (margen_real >= 20) status = 'alerta';
    else status = 'critico';

    // Determinar nivel de alerta basado en variación
    let alert_level: 'none' | 'warning' | 'danger';
    const abs_variacion = Math.abs(diferencia_porcentaje);
    if (abs_variacion > 20) alert_level = 'danger';
    else if (abs_variacion > 10) alert_level = 'warning';
    else alert_level = 'none';

    return {
      event_id: event.id,
      event_name: event.nombre_proyecto,
      cliente_nombre: event.cliente_nombre || event.cliente_comercial,
      fecha_evento: event.fecha_evento,
      tipo_evento: event.tipo_evento,
      responsable_nombre: event.responsable_nombre,
      projection,
      result,
      comparison,
      status,
      alert_level
    };
  };

  /**
   * Calcula el resumen financiero del portafolio de eventos
   */
  const calculatePortfolioSummary = (events: EventoCompleto[]): PortfolioFinancialSummary => {
    const total_eventos = events.length;

    if (total_eventos === 0) {
      return {
        total_eventos: 0,
        total_ingresos_estimados: 0,
        total_ingresos_reales: 0,
        total_provisiones: 0,
        total_gastos_pagados: 0,
        total_gastos_pendientes: 0,
        total_gastos_totales: 0,
        total_utilidad_estimada: 0,
        total_utilidad_real: 0,
        promedio_margen_estimado: 0,
        promedio_margen_real: 0,
        desviacion_ingresos: 0,
        desviacion_gastos: 0,
        desviacion_utilidad: 0,
        desviacion_global: 0,
        eventos_sobre_estimacion: 0,
        eventos_bajo_estimacion: 0,
        eventos_con_margen_critico: 0,
        tasa_precision_estimacion: 0
      };
    }

    // Calcular totales
    let total_ingresos_estimados = 0;
    let total_ingresos_reales = 0;
    let total_provisiones = 0;
    let total_gastos_pagados = 0;
    let total_gastos_pendientes = 0;
    let total_gastos_totales = 0;
    let total_utilidad_estimada = 0;
    let total_utilidad_real = 0;
    let suma_margen_estimado = 0;
    let suma_margen_real = 0;
    let eventos_sobre_estimacion = 0;
    let eventos_bajo_estimacion = 0;
    let eventos_con_margen_critico = 0;
    let eventos_con_datos = 0;

    events.forEach(event => {
      const analysis = calculateEventAnalysis(event);

      total_ingresos_estimados += analysis.projection.ingreso_estimado;
      total_ingresos_reales += analysis.result.ingreso_real;
      total_provisiones += analysis.projection.provisiones;
      total_gastos_pagados += analysis.result.gastos_pagados;
      total_gastos_pendientes += analysis.result.gastos_pendientes;
      total_gastos_totales += analysis.result.gastos_totales;
      total_utilidad_estimada += analysis.projection.utilidad_estimada;
      total_utilidad_real += analysis.result.utilidad_real;

      if (analysis.projection.ingreso_estimado > 0) {
        suma_margen_estimado += analysis.projection.margen_estimado;
        eventos_con_datos++;
      }

      if (analysis.result.ingreso_real > 0) {
        suma_margen_real += analysis.result.margen_real;
      }

      // Contar eventos sobre/bajo estimación
      if (analysis.result.utilidad_real > analysis.projection.utilidad_estimada) {
        eventos_sobre_estimacion++;
      } else if (analysis.result.utilidad_real < analysis.projection.utilidad_estimada) {
        eventos_bajo_estimacion++;
      }

      // Contar eventos con margen crítico
      if (analysis.result.margen_real < 35) {
        eventos_con_margen_critico++;
      }
    });

    // Calcular promedios
    const promedio_margen_estimado = eventos_con_datos > 0
      ? suma_margen_estimado / eventos_con_datos
      : 0;
    const promedio_margen_real = eventos_con_datos > 0
      ? suma_margen_real / eventos_con_datos
      : 0;

    // Calcular desviaciones
    const desviacion_ingresos = total_ingresos_estimados > 0
      ? ((total_ingresos_reales / total_ingresos_estimados) - 1) * 100
      : 0;

    const desviacion_gastos = total_provisiones > 0
      ? ((total_gastos_pagados / total_provisiones) - 1) * 100
      : 0;

    const desviacion_utilidad = total_utilidad_estimada > 0
      ? ((total_utilidad_real / total_utilidad_estimada) - 1) * 100
      : 0;

    // Desviación global (promedio de las desviaciones absolutas)
    const desviacion_global = (
      Math.abs(desviacion_ingresos) +
      Math.abs(desviacion_gastos) +
      Math.abs(desviacion_utilidad)
    ) / 3;

    // Tasa de precisión (inversa de la desviación global)
    const tasa_precision_estimacion = Math.max(0, 100 - desviacion_global);

    return {
      total_eventos,
      total_ingresos_estimados,
      total_ingresos_reales,
      total_provisiones,
      total_gastos_pagados,
      total_gastos_pendientes,
      total_gastos_totales,
      total_utilidad_estimada,
      total_utilidad_real,
      promedio_margen_estimado,
      promedio_margen_real,
      desviacion_ingresos,
      desviacion_gastos,
      desviacion_utilidad,
      desviacion_global,
      eventos_sobre_estimacion,
      eventos_bajo_estimacion,
      eventos_con_margen_critico,
      tasa_precision_estimacion
    };
  };

  /**
   * Calcula análisis para múltiples eventos
   */
  const calculateMultipleEventsAnalysis = (events: EventoCompleto[]): EventFinancialAnalysis[] => {
    return events.map(event => calculateEventAnalysis(event));
  };

  return {
    calculateEventAnalysis,
    calculatePortfolioSummary,
    calculateMultipleEventsAnalysis
  };
};

/**
 * Hook para obtener color según el margen
 */
export const useMarginColor = (margin: number): string => {
  return useMemo(() => {
    if (margin >= 35) return 'text-green-600';
    return 'text-red-600';
  }, [margin]);
};

/**
 * Hook para obtener color según la variación
 */
export const useVariationColor = (variation: number): string => {
  return useMemo(() => {
    const absVariation = Math.abs(variation);
    if (absVariation > 10) return 'text-yellow-600';
    return 'text-gray-600';
  }, [variation]);
};

/**
 * Hook para obtener clase de fondo según el status
 */
export const useStatusBgColor = (status: 'excelente' | 'bueno' | 'alerta' | 'critico'): string => {
  return useMemo(() => {
    switch (status) {
      case 'excelente': return 'bg-green-100 border-green-400';
      case 'bueno': return 'bg-blue-100 border-blue-400';
      case 'alerta': return 'bg-yellow-100 border-yellow-400';
      case 'critico': return 'bg-red-100 border-red-400';
    }
  }, [status]);
};
