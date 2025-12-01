import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';

// Estructura para totales por categoría
interface TotalesPorCategoria {
  total: number;
  combustible: number;
  materiales: number;
  rh: number;
  sps: number;
}

// Función para agrupar registros por categoría
function agruparPorCategoria(registros: any[]): TotalesPorCategoria {
  const resultado = { total: 0, combustible: 0, materiales: 0, rh: 0, sps: 0 };

  registros.forEach((r: any) => {
    const monto = r.total || 0;
    const clave = r.categoria?.clave || 'SP'; // Default a SP si no tiene categoría

    resultado.total += monto;

    switch (clave) {
      case 'COMB':
        resultado.combustible += monto;
        break;
      case 'MAT':
        resultado.materiales += monto;
        break;
      case 'RH':
        resultado.rh += monto;
        break;
      case 'SP':
      default:
        resultado.sps += monto;
        break;
    }
  });

  return resultado;
}

// Función auxiliar para calcular provisiones por categoría desde la tabla directamente
async function calcularProvisionesPorCategoria(eventosIds: number[]): Promise<TotalesPorCategoria> {
  if (eventosIds.length === 0) {
    return { total: 0, combustible: 0, materiales: 0, rh: 0, sps: 0 };
  }

  const { data: provisiones, error } = await supabase
    .from('evt_provisiones_erp')
    .select('total, categoria:cat_categorias_gasto(clave)')
    .in('evento_id', eventosIds)
    .eq('activo', true);

  if (error || !provisiones) {
    console.error('Error cargando provisiones:', error);
    return { total: 0, combustible: 0, materiales: 0, rh: 0, sps: 0 };
  }

  return agruparPorCategoria(provisiones);
}

// Función auxiliar para calcular gastos por categoría desde la tabla directamente
async function calcularGastosPorCategoria(eventosIds: number[]): Promise<{
  pagados: TotalesPorCategoria;
  pendientes: TotalesPorCategoria;
}> {
  if (eventosIds.length === 0) {
    return {
      pagados: { total: 0, combustible: 0, materiales: 0, rh: 0, sps: 0 },
      pendientes: { total: 0, combustible: 0, materiales: 0, rh: 0, sps: 0 }
    };
  }

  // Gastos usan evt_categorias_gastos_erp (nombre, no clave)
  const { data: gastos, error } = await supabase
    .from('evt_gastos_erp')
    .select('total, pagado, categoria_id, categoria:evt_categorias_gastos_erp(nombre)')
    .in('evento_id', eventosIds)
    .is('deleted_at', null);

  if (error || !gastos) {
    console.error('Error cargando gastos:', error);
    return {
      pagados: { total: 0, combustible: 0, materiales: 0, rh: 0, sps: 0 },
      pendientes: { total: 0, combustible: 0, materiales: 0, rh: 0, sps: 0 }
    };
  }

  // Agrupar por estado de pago
  const pagados = gastos.filter((g: any) => g.pagado);
  const pendientes = gastos.filter((g: any) => !g.pagado);

  return {
    pagados: agruparGastosPorCategoria(pagados),
    pendientes: agruparGastosPorCategoria(pendientes)
  };
}

// Función para agrupar gastos por categoría usando nombre
function agruparGastosPorCategoria(registros: any[]): TotalesPorCategoria {
  const resultado = { total: 0, combustible: 0, materiales: 0, rh: 0, sps: 0 };

  registros.forEach((r: any) => {
    const monto = r.total || 0;
    const nombre = (r.categoria?.nombre || '').toLowerCase();

    resultado.total += monto;

    // Mapear por nombre de categoría
    if (nombre.includes('combustible') || nombre.includes('peaje')) {
      resultado.combustible += monto;
    } else if (nombre.includes('material')) {
      resultado.materiales += monto;
    } else if (nombre.includes('rh') || nombre.includes('recurso')) {
      resultado.rh += monto;
    } else {
      // SP o sin categoría
      resultado.sps += monto;
    }
  });

  return resultado;
}

export interface EventoFinancialListItem {
  // Identificación
  id: string;
  clave_evento: string;
  nombre_proyecto: string;
  cliente_id: string;
  cliente_nombre: string;
  fecha_evento: string;
  estado_id: number;
  estado_nombre: string;

  // Proyección (Estimado)
  ingreso_estimado: number;
  provisiones: number; // Alias para compatibilidad
  provisiones_total: number; // Campo real de la vista
  utilidad_estimada: number;
  porcentaje_utilidad_estimada: number;

  // Ingresos Reales
  ingresos_cobrados: number;
  ingresos_pendientes: number;
  ingresos_totales: number;
  diferencia_ingresos_absoluta: number;
  variacion_ingresos_porcentaje: number;
  porcentaje_cobro: number;
  status_cobro: 'sin_ingresos' | 'cobrado_completo' | 'cobrado_parcial' | 'pendiente_cobro';

  // Gastos Reales
  gastos_pagados: number; // Alias para compatibilidad
  gastos_pagados_total: number; // Campo real de la vista
  gastos_pendientes: number; // Alias para compatibilidad
  gastos_pendientes_total: number; // Campo real de la vista
  gastos_totales: number;
  diferencia_gastos_absoluta: number;
  variacion_gastos_porcentaje: number;
  porcentaje_pago_gastos: number;
  status_pago_gastos: 'sin_gastos' | 'pagado_completo' | 'pagado_parcial' | 'pendiente_pago';

  // Gastos por Categoría - Pagados
  gastos_combustible_pagados: number;
  gastos_materiales_pagados: number;
  gastos_rh_pagados: number;
  gastos_sps_pagados: number;

  // Gastos por Categoría - Pendientes
  gastos_combustible_pendientes: number;
  gastos_materiales_pendientes: number;
  gastos_rh_pendientes: number;
  gastos_sps_pendientes: number;

  // Provisiones y Disponibilidad
  provisiones_comprometidas: number; // Gastos pendientes de pago
  provisiones_disponibles: number; // Provisiones - Gastos totales
  disponible_total: number; // Provisiones - Gastos pagados

  // Provisiones por Categoría
  provision_combustible_peaje: number;
  provision_materiales: number;
  provision_recursos_humanos: number;
  provision_solicitudes_pago: number;

  // Utilidad Real
  utilidad_real: number;
  margen_utilidad_real: number;
  diferencia_utilidad_absoluta: number;
  diferencia_margen_absoluta: number;

  // Status General
  status_evento: 'proyeccion_favorable' | 'proyeccion_neutral' | 'proyeccion_desfavorable';
  desviacion_presupuesto: 'dentro_presupuesto' | 'sobrepresupuesto' | 'bajopresupuesto';
  salud_financiera: 'excelente' | 'buena' | 'regular' | 'mala' | 'critica';
}

export interface DashboardEventosFinancial {
  total_eventos: number;
  total_ingresos_estimados: number;
  total_ingresos_cobrados: number;
  total_ingresos_pendientes: number;
  total_ingresos_reales: number;
  total_provisiones: number;
  total_provision_combustible: number;
  total_provision_materiales: number;
  total_provision_rh: number;
  total_provision_sps: number;
  total_gastos_totales: number;
  total_gastos_pagados: number;
  total_gastos_pendientes: number;
  total_gastos_combustible_pagados: number;
  total_gastos_combustible_pendientes: number;
  total_gastos_materiales_pagados: number;
  total_gastos_materiales_pendientes: number;
  total_gastos_rh_pagados: number;
  total_gastos_rh_pendientes: number;
  total_gastos_sps_pagados: number;
  total_gastos_sps_pendientes: number;
  total_disponible: number;
  total_disponible_combustible: number;
  total_disponible_materiales: number;
  total_disponible_rh: number;
  total_disponible_sps: number;
  total_provisiones_comprometidas: number; // Gastos pendientes de pago
  total_provisiones_disponibles: number; // Provisiones - Gastos totales
  total_utilidad_estimada: number;
  total_utilidad_real: number;
  total_utilidad_cobrada: number; // Mismo que utilidad_real pero con nombre más claro
  margen_estimado_promedio: number;
  margen_promedio: number;
}

export interface EventosFinancialFilters {
  año?: number;
  mes?: number;
  cliente_id?: string;
  estado_id?: number;
  search?: string;
  disponible_positivo?: boolean; // Filtrar eventos con presupuesto disponible > 0
}

/**
 * Hook para obtener eventos con análisis financiero completo
 */
export const useEventosFinancialList = (filters?: EventosFinancialFilters) => {
  return useQuery({
    queryKey: ['eventos-financial-list-v2', filters], // v2 para forzar refresh después de actualizar vista
    queryFn: async (): Promise<EventoFinancialListItem[]> => {
      try {
        console.log('🔍 Cargando eventos desde vw_eventos_analisis_financiero_erp...');
        
        let query = supabase
          .from('vw_eventos_analisis_financiero_erp')
          .select('*')
          .order('fecha_evento', { ascending: false });

        // Aplicar filtros
        if (filters?.año) {
          const añoStr = filters.año.toString();
          query = query
            .gte('fecha_evento', `${añoStr}-01-01`)
            .lte('fecha_evento', `${añoStr}-12-31`);
        }

        if (filters?.mes && filters?.año) {
          const añoStr = filters.año.toString();
          const mesStr = filters.mes.toString().padStart(2, '0');
          const siguienteMes = filters.mes === 12 ? 1 : filters.mes + 1;
          const siguienteAño = filters.mes === 12 ? filters.año + 1 : filters.año;
          const siguienteMesStr = siguienteMes.toString().padStart(2, '0');
          const siguienteAñoStr = siguienteAño.toString();
          
          query = query
            .gte('fecha_evento', `${añoStr}-${mesStr}-01`)
            .lt('fecha_evento', `${siguienteAñoStr}-${siguienteMesStr}-01`);
        }

        if (filters?.cliente_id) {
          query = query.eq('cliente_id', filters.cliente_id);
        }

        if (filters?.estado_id) {
          query = query.eq('estado_id', filters.estado_id);
        }

        if (filters?.search) {
          query = query.or(
            `clave_evento.ilike.%${filters.search}%,` +
            `nombre_proyecto.ilike.%${filters.search}%,` +
            `cliente_nombre.ilike.%${filters.search}%`
          );
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ Error al cargar eventos financieros:', error);
          throw error;
        }

        let resultados = data || [];

        // Aplicar filtro de disponible después de cargar datos (es un cálculo derivado)
        if (filters?.disponible_positivo) {
          resultados = resultados.filter((evento: any) => {
            const provisionesTotal = evento.provisiones_total || 0;
            const gastosTotales = (evento.gastos_pagados_total || 0) + (evento.gastos_pendientes_total || 0);
            const disponible = provisionesTotal - gastosTotales;
            return disponible > 0;
          });
        }

        console.log('✅ Eventos financieros cargados:', resultados.length);
        if (resultados.length > 0) {
          console.log('📊 Primer evento (verificar campos):', {
            id: resultados[0].id,
            clave_evento: resultados[0].clave_evento,
            ingreso_estimado: resultados[0].ingreso_estimado,
            provisiones_total: resultados[0].provisiones_total,
            ingresos_cobrados: resultados[0].ingresos_cobrados,
            gastos_pagados_total: resultados[0].gastos_pagados_total,
            utilidad_real: resultados[0].utilidad_real
          });
        }
        return resultados;
      } catch (error) {
        console.error('❌ Error crítico:', error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 segundos
  });
};

/**
 * Hook para obtener el dashboard de sumatorias
 */
export const useEventosFinancialDashboard = (filters?: EventosFinancialFilters) => {
  return useQuery({
    queryKey: ['eventos-financial-dashboard-v2', filters], // v2 para forzar refresh
    queryFn: async (): Promise<DashboardEventosFinancial> => {
      try {
        console.log('📊 Calculando dashboard financiero...');
        
        let query = supabase
          .from('vw_eventos_analisis_financiero_erp')
          .select('*');

        // Aplicar mismos filtros
        if (filters?.año) {
          const añoStr = filters.año.toString();
          query = query
            .gte('fecha_evento', `${añoStr}-01-01`)
            .lte('fecha_evento', `${añoStr}-12-31`);
        }

        if (filters?.mes && filters?.año) {
          const añoStr = filters.año.toString();
          const mesStr = filters.mes.toString().padStart(2, '0');
          const siguienteMes = filters.mes === 12 ? 1 : filters.mes + 1;
          const siguienteAño = filters.mes === 12 ? filters.año + 1 : filters.año;
          const siguienteMesStr = siguienteMes.toString().padStart(2, '0');
          const siguienteAñoStr = siguienteAño.toString();
          
          query = query
            .gte('fecha_evento', `${añoStr}-${mesStr}-01`)
            .lt('fecha_evento', `${siguienteAñoStr}-${siguienteMesStr}-01`);
        }

        if (filters?.cliente_id) {
          query = query.eq('cliente_id', filters.cliente_id);
        }

        if (filters?.estado_id) {
          query = query.eq('estado_id', filters.estado_id);
        }

        if (filters?.search) {
          query = query.or(
            `clave_evento.ilike.%${filters.search}%,` +
            `nombre_proyecto.ilike.%${filters.search}%,` +
            `cliente_nombre.ilike.%${filters.search}%`
          );
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ Error al calcular dashboard:', error);
          throw error;
        }

        const eventos = data || [];
        const total = eventos.length;

        // Obtener IDs de eventos para consultar por categoría
        const eventosIds = eventos.map((e: any) => e.id);

        // Calcular provisiones y gastos por categoría desde las tablas directamente
        const [provisionesPorCategoria, gastosPorCategoria] = await Promise.all([
          calcularProvisionesPorCategoria(eventosIds),
          calcularGastosPorCategoria(eventosIds)
        ]);

        console.log('📦 Provisiones por categoría:', provisionesPorCategoria);
        console.log('💰 Gastos por categoría:', gastosPorCategoria);

        // Calcular sumatorias
        const dashboard: DashboardEventosFinancial = {
          total_eventos: total,

          // INGRESOS
          total_ingresos_estimados: eventos.reduce((sum: number, e: any) => sum + (e.ingreso_estimado || 0), 0),
          total_ingresos_cobrados: eventos.reduce((sum: number, e: any) => sum + (e.ingresos_cobrados || 0), 0),
          total_ingresos_pendientes: eventos.reduce((sum: number, e: any) => sum + (e.ingresos_pendientes || 0), 0),
          total_ingresos_reales: eventos.reduce((sum: number, e: any) => sum + (e.ingresos_totales || 0), 0),

          // PROVISIONES - calculadas directamente desde evt_provisiones_erp
          total_provisiones: provisionesPorCategoria.total,
          total_provision_combustible: provisionesPorCategoria.combustible,
          total_provision_materiales: provisionesPorCategoria.materiales,
          total_provision_rh: provisionesPorCategoria.rh,
          total_provision_sps: provisionesPorCategoria.sps,

          // GASTOS TOTALES - calculados directamente desde evt_gastos_erp
          total_gastos_totales: gastosPorCategoria.pagados.total + gastosPorCategoria.pendientes.total,
          total_gastos_pagados: gastosPorCategoria.pagados.total,
          total_gastos_pendientes: gastosPorCategoria.pendientes.total,

          // GASTOS POR CATEGORÍA - COMBUSTIBLE
          total_gastos_combustible_pagados: gastosPorCategoria.pagados.combustible,
          total_gastos_combustible_pendientes: gastosPorCategoria.pendientes.combustible,

          // GASTOS POR CATEGORÍA - MATERIALES
          total_gastos_materiales_pagados: gastosPorCategoria.pagados.materiales,
          total_gastos_materiales_pendientes: gastosPorCategoria.pendientes.materiales,

          // GASTOS POR CATEGORÍA - RH
          total_gastos_rh_pagados: gastosPorCategoria.pagados.rh,
          total_gastos_rh_pendientes: gastosPorCategoria.pendientes.rh,

          // GASTOS POR CATEGORÍA - SPS (Solicitudes de Pago)
          total_gastos_sps_pagados: gastosPorCategoria.pagados.sps,
          total_gastos_sps_pendientes: gastosPorCategoria.pendientes.sps,

          // DISPONIBLE = Provisiones - Gastos Pagados
          total_disponible: provisionesPorCategoria.total - gastosPorCategoria.pagados.total,
          total_disponible_combustible: provisionesPorCategoria.combustible - gastosPorCategoria.pagados.combustible,
          total_disponible_materiales: provisionesPorCategoria.materiales - gastosPorCategoria.pagados.materiales,
          total_disponible_rh: provisionesPorCategoria.rh - gastosPorCategoria.pagados.rh,
          total_disponible_sps: provisionesPorCategoria.sps - gastosPorCategoria.pagados.sps,

          // PROVISIONES COMPROMETIDAS Y DISPONIBLES
          total_provisiones_comprometidas: gastosPorCategoria.pendientes.total,
          total_provisiones_disponibles: Math.max(0, provisionesPorCategoria.total - (gastosPorCategoria.pagados.total + gastosPorCategoria.pendientes.total)),

          // UTILIDAD - Ingresos - Gastos
          total_utilidad_estimada: eventos.reduce((sum: number, e: any) => sum + (e.utilidad_estimada || 0), 0),
          total_utilidad_real: (() => {
            const ingresosTotales = eventos.reduce((sum: number, e: any) => sum + (e.ingresos_totales || 0), 0);
            const gastosTotales = gastosPorCategoria.pagados.total + gastosPorCategoria.pendientes.total;
            return ingresosTotales - gastosTotales;
          })(),
          total_utilidad_cobrada: (() => {
            const ingresosTotales = eventos.reduce((sum: number, e: any) => sum + (e.ingresos_totales || 0), 0);
            const gastosTotales = gastosPorCategoria.pagados.total + gastosPorCategoria.pendientes.total;
            return ingresosTotales - gastosTotales;
          })(),
          margen_estimado_promedio: total > 0
            ? eventos.reduce((sum: number, e: any) => sum + (e.margen_estimado_pct || 0), 0) / total
            : 0,
          margen_promedio: (() => {
            const totalIngresos = eventos.reduce((sum: number, e: any) => sum + (e.ingresos_totales || 0), 0);
            const totalGastos = gastosPorCategoria.pagados.total + gastosPorCategoria.pendientes.total;
            const utilidad = totalIngresos - totalGastos;
            return totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;
          })(),
        };

        console.log('✅ Dashboard calculado:', dashboard);
        return dashboard;
      } catch (error) {
        console.error('❌ Error crítico en dashboard:', error);
        
        // Retornar dashboard vacío en caso de error
        return {
          total_eventos: 0,
          total_ingresos_estimados: 0,
          total_ingresos_cobrados: 0,
          total_ingresos_pendientes: 0,
          total_ingresos_reales: 0,
          total_provisiones: 0,
          total_provision_combustible: 0,
          total_provision_materiales: 0,
          total_provision_rh: 0,
          total_provision_sps: 0,
          total_gastos_totales: 0,
          total_gastos_pagados: 0,
          total_gastos_pendientes: 0,
          total_gastos_combustible_pagados: 0,
          total_gastos_combustible_pendientes: 0,
          total_gastos_materiales_pagados: 0,
          total_gastos_materiales_pendientes: 0,
          total_gastos_rh_pagados: 0,
          total_gastos_rh_pendientes: 0,
          total_gastos_sps_pagados: 0,
          total_gastos_sps_pendientes: 0,
          total_disponible: 0,
          total_disponible_combustible: 0,
          total_disponible_materiales: 0,
          total_disponible_rh: 0,
          total_disponible_sps: 0,
          total_provisiones_comprometidas: 0,
          total_provisiones_disponibles: 0,
          total_utilidad_estimada: 0,
          total_utilidad_real: 0,
          total_utilidad_cobrada: 0,
          margen_estimado_promedio: 0,
          margen_promedio: 0,
        };
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 segundos
  });
};
