import { supabase } from '../../../core/config/supabase';
import type { ReportePersonalizado, MetricasBI } from '../types';

export const fetchReportes = async (companyId: string) => {
  const { data, error } = await supabase
    .from('rep_reportes_personalizados')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ReportePersonalizado[];
};

export const createReporte = async (reporte: Partial<ReportePersonalizado>) => {
  const { data, error } = await supabase
    .from('rep_reportes_personalizados')
    .insert([reporte])
    .select()
    .single();

  if (error) throw error;
  return data as ReportePersonalizado;
};

export const fetchMetricasBI = async (companyId: string): Promise<MetricasBI> => {
  // Query paralelas para obtener métricas reales de todas las tablas
  const [
    ventasResult,
    cxcResult,
    cxpResult,
    inventarioResult,
    empleadosResult,
    proyectosResult
  ] = await Promise.all([
    // Ventas totales (facturas emitidas)
    supabase
      .from('fac_facturas')
      .select('total')
      .eq('company_id', companyId)
      .eq('status', 'timbrada'),

    // Cuentas por cobrar (facturas pendientes de pago)
    supabase
      .from('fac_facturas')
      .select('saldo_pendiente')
      .eq('company_id', companyId)
      .in('status', ['timbrada', 'enviada'])
      .gt('saldo_pendiente', 0),

    // Cuentas por pagar (facturas de proveedores pendientes)
    supabase
      .from('prov_facturas_proveedor')
      .select('saldo_pendiente')
      .eq('company_id', companyId)
      .eq('status', 'pendiente'),

    // Valor del inventario
    supabase
      .from('inv_productos')
      .select('precio_costo, stock_actual')
      .eq('company_id', companyId)
      .eq('activo', true),

    // Empleados activos
    supabase
      .from('rrhh_empleados')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'activo'),

    // Proyectos activos
    supabase
      .from('proy_proyectos')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'en_progreso')
  ]);

  // Calcular totales
  const ventas_totales = ventasResult.data?.reduce((sum, f) => sum + (f.total || 0), 0) || 0;
  const cuentas_por_cobrar = cxcResult.data?.reduce((sum, f) => sum + (f.saldo_pendiente || 0), 0) || 0;
  const cuentas_por_pagar = cxpResult.data?.reduce((sum, f) => sum + (f.saldo_pendiente || 0), 0) || 0;
  const inventario_valor = inventarioResult.data?.reduce(
    (sum, p) => sum + ((p.precio_costo || 0) * (p.stock_actual || 0)), 0
  ) || 0;
  const empleados_activos = empleadosResult.count || 0;
  const proyectos_activos = proyectosResult.count || 0;

  return {
    ventas_totales,
    cuentas_por_cobrar,
    cuentas_por_pagar,
    inventario_valor,
    empleados_activos,
    proyectos_activos
  };
};

export const reportesService = {
  fetchReportes,
  createReporte,
  fetchMetricasBI
};
