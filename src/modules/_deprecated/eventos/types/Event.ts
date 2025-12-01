export interface Event {
  id: string;
  company_id?: string;
  clave_evento: string;
  nombre_proyecto: string;
  descripcion?: string;
  cliente_id?: string;
  tipo_evento_id?: string;
  estado_id: number;
  responsable_id?: string;
  solicitante_id?: string;
  fecha_evento: string;
  fecha_fin?: string;
  /** @deprecated Campo no utilizado - Se eliminará en futuras versiones */
  hora_inicio?: string;
  /** @deprecated Campo no utilizado - Se eliminará en futuras versiones */
  hora_fin?: string;
  lugar?: string;
  numero_invitados?: number;
  // Financial estimates (Proyección)
  ingreso_estimado?: number; // Alias for ganancia_estimada
  ganancia_estimada?: number; // Income estimate
  provisiones?: number; // Expense estimate (formerly gastos_estimados)
  utilidad_estimada?: number; // Calculated: ingreso - gastos
  porcentaje_utilidad_estimada?: number; // Calculated: (utilidad / ingreso) * 100

  // Financial actuals (Resultado Real)
  ingreso_real?: number; // Alias for total
  subtotal: number;
  iva_porcentaje: number;
  iva: number;
  total: number; // Total income (real)
  total_gastos: number; // Total expenses paid (real)
  gastos_pendientes?: number; // Pending expenses
  ingresos_pendientes?: number; // Pending income
  gastos_totales?: number; // Total expenses (paid + pending)
  utilidad: number; // Real profit
  margen_utilidad: number; // Real margin %
  
  // Status
  status_facturacion: 'pendiente_facturar' | 'facturado' | 'cancelado';
  status_pago: 'pendiente' | 'pago_pendiente' | 'pagado' | 'vencido';
  fecha_facturacion?: string;
  fecha_vencimiento?: string;
  fecha_pago?: string;
  documento_factura_url?: string;
  documento_pago_url?: string;
  
  // Project management
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  fase_proyecto: 'cotizacion' | 'aprobado' | 'en_proceso' | 'completado';
  notas?: string;
  
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Relations
  cliente?: Cliente;
  tipo_evento?: TipoEvento;
  estado?: EventState;
  responsable?: Usuario;
  solicitante?: Usuario;
  ingresos?: Income[];
  gastos?: Expense[];
  documentos?: Documento[];
}

export interface EventoCompleto extends Event {
  cliente_nombre?: string;
  cliente_comercial?: string;
  cliente_rfc?: string;
  cliente_email?: string;
  cliente_telefono?: string;
  contacto_principal?: string;
  tipo_evento?: string;
  tipo_color?: string;
  estado?: string;
  estado_color?: string;
  workflow_step?: number;
  responsable_nombre?: string;
  dias_vencido?: number;
  status_vencimiento?: string;
  creado_por?: string;
  actualizado_por?: string;
}

export interface Cliente {
  id: string;
  company_id?: string;
  razon_social: string;
  nombre_comercial?: string;
  rfc: string;
  sufijo: string;
  email?: string;
  telefono?: string;
  direccion_fiscal?: string;
  contacto_principal?: string;
  telefono_contacto?: string;
  email_contacto?: string;
  regimen_fiscal?: string;
  uso_cfdi: string;
  metodo_pago: string;
  forma_pago: string;
  dias_credito: number;
  limite_credito?: number;
  activo: boolean;
  notas?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TipoEvento {
  id: string;
  company_id?: string;
  nombre: string;
  descripcion?: string;
  color: string;
  activo: boolean;
  created_at: string;
}

export interface Estado {
  id: number;
  nombre: string;
  descripcion?: string;
  color?: string;
  orden: number;
  workflow_step?: number;
}

export interface EventState {
  id: number;
  nombre: string;
  descripcion?: string;
  color?: string;
  orden: number;
  workflow_step?: number;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
}

export interface DashboardMetrics {
  total_eventos: number;
  eventos_futuros: number;
  eventos_pasados: number;
  pagos_pendientes: number;
  facturas_pendientes: number;
  pagos_vencidos: number;
  eventos_cobrados: number;
  ingresos_totales: number;
  ingresos_cobrados: number;
  ingresos_por_cobrar: number;
  gastos_totales: number;
  utilidad_total: number;
  margen_promedio: number;
  tasa_cobranza: number;
  ratio_gastos_ingresos: number;
}

export interface AnalisisTemporal {
  año: number;
  mes: number;
  total_eventos: number;
  ingresos_mes: number;
  gastos_mes: number;
  utilidad_mes: number;
  margen_promedio: number;
  eventos_cobrados: number;
  eventos_pendientes: number;
}

export const EVENT_STATES = {
  BORRADOR: 1,
  COTIZADO: 2,
  APROBADO: 3,
  EN_PROCESO: 4,
  COMPLETADO: 5,
  FACTURADO: 6,
  COBRADO: 7
} as const;

export const PAYMENT_STATUS = {
  PENDIENTE: 'pendiente',
  PAGO_PENDIENTE: 'pago_pendiente',
  PAGADO: 'pagado',
  VENCIDO: 'vencido'
} as const;

export const BILLING_STATUS = {
  PENDIENTE_FACTURAR: 'pendiente_facturar',
  FACTURADO: 'facturado',
  CANCELADO: 'cancelado'
} as const;

export const PROJECT_PHASES = {
  COTIZACION: 'cotizacion',
  APROBADO: 'aprobado',
  EN_PROCESO: 'en_proceso',
  COMPLETADO: 'completado'
} as const;

export const PRIORITIES = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente'
} as const;

// Financial Analysis Types

export interface FinancialProjection {
  ingreso_estimado: number;
  provisiones: number; // Expense estimate (formerly gastos_estimados)
  utilidad_estimada: number;
  margen_estimado: number; // %
}

export interface FinancialResult {
  ingreso_real: number;
  gastos_pagados: number; // Paid expenses (real)
  gastos_pendientes: number; // Pending expenses
  gastos_totales: number; // Total expenses (paid + pending)
  utilidad_real: number;
  margen_real: number; // %
}

export interface FinancialComparison {
  diferencia_absoluta: number; // Utilidad Real - Utilidad Estimada
  diferencia_porcentaje: number; // ((Utilidad Real / Utilidad Estimada) - 1) * 100
  variacion_ingresos: number; // %
  variacion_gastos: number; // %
  variacion_margen: number; // Margen Real - Margen Estimado
}

export interface EventFinancialAnalysis {
  event_id: string;
  event_name: string;
  cliente_nombre?: string;
  fecha_evento: string;
  tipo_evento?: string;
  responsable_nombre?: string;
  projection: FinancialProjection;
  result: FinancialResult;
  comparison: FinancialComparison;
  status: 'excelente' | 'bueno' | 'alerta' | 'critico'; // Based on margin
  alert_level: 'none' | 'warning' | 'danger'; // Based on variation
}

export interface PortfolioFinancialSummary {
  total_eventos: number;

  // Totals
  total_ingresos_estimados: number;
  total_ingresos_reales: number;
  total_provisiones: number; // Total provisions (formerly total_gastos_estimados)
  total_gastos_pagados: number; // Total paid expenses
  total_gastos_pendientes: number; // Total pending expenses
  total_gastos_totales: number; // Total expenses (paid + pending)
  total_utilidad_estimada: number;
  total_utilidad_real: number;

  // Averages
  promedio_margen_estimado: number; // %
  promedio_margen_real: number; // %

  // Deviations
  desviacion_ingresos: number; // %
  desviacion_gastos: number; // %
  desviacion_utilidad: number; // %
  desviacion_global: number; // % overall deviation

  // Performance metrics
  eventos_sobre_estimacion: number; // Events exceeding estimates
  eventos_bajo_estimacion: number; // Events below estimates
  eventos_con_margen_critico: number; // Events with margin < 35%
  tasa_precision_estimacion: number; // % accuracy
}

export interface FinancialFilters {
  cliente_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo_evento_id?: string;
  responsable_id?: string;
  año?: number;
  mes?: number;
  margen_minimo?: number;
  solo_completados?: boolean;
}