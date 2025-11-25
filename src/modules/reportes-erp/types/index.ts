// ============================================
// TIPOS DEL MÓDULO DE REPORTES Y BI
// ============================================

export interface ReportePersonalizado {
  id: number;
  company_id: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'tabla' | 'grafico' | 'dashboard';
  query_sql: string | null;
  parametros: Record<string, any> | null;
  visualizacion: 'tabla' | 'barras' | 'lineas' | 'pie' | 'area' | 'mixto';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardPersonalizado {
  id: number;
  company_id: string;
  nombre: string;
  descripcion: string | null;
  widgets: Widget[];
  layout: any;
  compartido: boolean;
  created_at: string;
}

export interface Widget {
  id: string;
  tipo: 'kpi' | 'chart' | 'table' | 'text';
  titulo: string;
  fuente_datos: string;
  configuracion: any;
  posicion: { x: number; y: number; w: number; h: number };
}

export interface MetricasBI {
  ventas_totales: number;
  cuentas_por_cobrar: number;
  cuentas_por_pagar: number;
  inventario_valor: number;
  empleados_activos: number;
  proyectos_activos: number;
}

export interface ReporteFormData extends Partial<ReportePersonalizado> {}
