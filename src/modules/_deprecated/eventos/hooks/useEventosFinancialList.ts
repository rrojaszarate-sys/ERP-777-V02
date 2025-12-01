import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';

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
        console.log('🔍 Cargando eventos desde vw_eventos_analisis_financiero...');
        
        let query = supabase
          .from('vw_eventos_analisis_financiero')
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
            const provisionesTotal = (evento.provision_combustible_peaje || 0) + 
                                     (evento.provision_materiales || 0) + 
                                     (evento.provision_recursos_humanos || 0) + 
                                     (evento.provision_solicitudes_pago || 0);
            
            // CORRECCIÓN: Usar gastos TOTALES (pagados + pendientes), no solo pagados
            const gastosPagados = evento.gastos_pagados_total || 0;
            const gastosPendientes = evento.gastos_pendientes_total || 0;
            const gastosTotales = gastosPagados + gastosPendientes;
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
          .from('vw_eventos_analisis_financiero')
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

        // Calcular sumatorias
        const dashboard: DashboardEventosFinancial = {
          total_eventos: total,
          
          // INGRESOS
          total_ingresos_estimados: eventos.reduce((sum: number, e: any) => sum + (e.ingreso_estimado || 0), 0),
          total_ingresos_cobrados: eventos.reduce((sum: number, e: any) => sum + (e.ingresos_cobrados || 0), 0),
          total_ingresos_pendientes: eventos.reduce((sum: number, e: any) => sum + (e.ingresos_pendientes || 0), 0),
          total_ingresos_reales: eventos.reduce((sum: number, e: any) => sum + (e.ingresos_totales || 0), 0),
          
          // PROVISIONES
          total_provisiones: eventos.reduce((sum: number, e: any) => sum + (
            (e.provision_combustible_peaje || 0) +
            (e.provision_materiales || 0) +
            (e.provision_recursos_humanos || 0) +
            (e.provision_solicitudes_pago || 0)
          ), 0),
          total_provision_combustible: eventos.reduce((sum: number, e: any) => sum + (e.provision_combustible_peaje || 0), 0),
          total_provision_materiales: eventos.reduce((sum: number, e: any) => sum + (e.provision_materiales || 0), 0),
          total_provision_rh: eventos.reduce((sum: number, e: any) => sum + (e.provision_recursos_humanos || 0), 0),
          total_provision_sps: eventos.reduce((sum: number, e: any) => sum + (e.provision_solicitudes_pago || 0), 0),
          
          // GASTOS TOTALES
          total_gastos_totales: eventos.reduce((sum: number, e: any) => sum + (
            (e.gastos_pagados_total || 0) + (e.gastos_pendientes_total || 0)
          ), 0),
          total_gastos_pagados: eventos.reduce((sum: number, e: any) => sum + (e.gastos_pagados_total || 0), 0),
          total_gastos_pendientes: eventos.reduce((sum: number, e: any) => sum + (e.gastos_pendientes_total || 0), 0),
          
          // GASTOS POR CATEGORÍA - COMBUSTIBLE
          total_gastos_combustible_pagados: eventos.reduce((sum: number, e: any) => sum + (e.gastos_combustible_pagados || 0), 0),
          total_gastos_combustible_pendientes: eventos.reduce((sum: number, e: any) => sum + (e.gastos_combustible_pendientes || 0), 0),
          
          // GASTOS POR CATEGORÍA - MATERIALES
          total_gastos_materiales_pagados: eventos.reduce((sum: number, e: any) => sum + (e.gastos_materiales_pagados || 0), 0),
          total_gastos_materiales_pendientes: eventos.reduce((sum: number, e: any) => sum + (e.gastos_materiales_pendientes || 0), 0),
          
          // GASTOS POR CATEGORÍA - RH
          total_gastos_rh_pagados: eventos.reduce((sum: number, e: any) => sum + (e.gastos_rh_pagados || 0), 0),
          total_gastos_rh_pendientes: eventos.reduce((sum: number, e: any) => sum + (e.gastos_rh_pendientes || 0), 0),
          
          // GASTOS POR CATEGORÍA - SPS
          total_gastos_sps_pagados: eventos.reduce((sum: number, e: any) => sum + (e.gastos_sps_pagados || 0), 0),
          total_gastos_sps_pendientes: eventos.reduce((sum: number, e: any) => sum + (e.gastos_sps_pendientes || 0), 0),
          
          // DISPONIBLE
          total_disponible: eventos.reduce((sum: number, e: any) => sum + (
            ((e.provision_combustible_peaje || 0) +
             (e.provision_materiales || 0) +
             (e.provision_recursos_humanos || 0) +
             (e.provision_solicitudes_pago || 0)) -
            (e.gastos_pagados_total || 0)
          ), 0),
          total_disponible_combustible: eventos.reduce((sum: number, e: any) => sum + (
            (e.provision_combustible_peaje || 0) - (e.gastos_combustible_pagados || 0)
          ), 0),
          total_disponible_materiales: eventos.reduce((sum: number, e: any) => sum + (
            (e.provision_materiales || 0) - (e.gastos_materiales_pagados || 0)
          ), 0),
          total_disponible_rh: eventos.reduce((sum: number, e: any) => sum + (
            (e.provision_recursos_humanos || 0) - (e.gastos_rh_pagados || 0)
          ), 0),
          total_disponible_sps: eventos.reduce((sum: number, e: any) => sum + (
            (e.provision_solicitudes_pago || 0) - (e.gastos_sps_pagados || 0)
          ), 0),
          
          // PROVISIONES COMPROMETIDAS Y DISPONIBLES (nuevos campos)
          total_provisiones_comprometidas: eventos.reduce((sum: number, e: any) => sum + (e.gastos_pendientes_total || 0), 0),
          total_provisiones_disponibles: eventos.reduce((sum: number, e: any) => sum + (
            ((e.provision_combustible_peaje || 0) +
             (e.provision_materiales || 0) +
             (e.provision_recursos_humanos || 0) +
             (e.provision_solicitudes_pago || 0)) -
            ((e.gastos_pagados_total || 0) + (e.gastos_pendientes_total || 0))
          ), 0),
          
          // UTILIDAD
          total_utilidad_estimada: eventos.reduce((sum: number, e: any) => sum + (e.utilidad_estimada || 0), 0),
          total_utilidad_real: eventos.reduce((sum: number, e: any) => sum + (e.utilidad_real || 0), 0),
          total_utilidad_cobrada: eventos.reduce((sum: number, e: any) => sum + (e.utilidad_cobrada || e.utilidad_real || 0), 0),
          margen_estimado_promedio: total > 0
            ? eventos.reduce((sum: number, e: any) => sum + (e.margen_estimado_pct || 0), 0) / total
            : 0,
          margen_promedio: total > 0
            ? eventos.reduce((sum: number, e: any) => sum + (e.margen_real_pct || 0), 0) / total
            : 0,
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
