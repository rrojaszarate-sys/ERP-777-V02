/**
 * TIPOS DE CONTABILIDAD
 */

export interface PlanCuentas {
  id: number;
  codigo: string;
  nombre: string;
  tipo: 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto' | 'resultado';
  naturaleza: 'deudora' | 'acreedora';
  nivel: number;
  cuenta_padre_id: number | null;
  acepta_movimientos: boolean;
  codigo_sat: string | null;
  descripcion: string | null;
  saldo_inicial: number;
  saldo_actual: number;
  activo: boolean;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Poliza {
  id: number;
  numero_poliza: string;
  tipo: 'diario' | 'ingreso' | 'egreso' | 'ajuste' | 'cierre';
  fecha: string;
  concepto: string;
  referencia: string | null;
  origen: string | null;
  origen_id: string | null;
  total_debe: number;
  total_haber: number;
  status: 'borrador' | 'aplicada' | 'cancelada';
  cancelada_por: string | null;
  fecha_cancelacion: string | null;
  motivo_cancelacion: string | null;
  created_by: string;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Movimiento {
  id: number;
  poliza_id: number;
  cuenta_id: number;
  concepto: string;
  debe: number;
  haber: number;
  referencia: string | null;
  created_at: string;
  // Joined data
  cuenta?: PlanCuentas;
}

export interface PolizaConMovimientos extends Poliza {
  movimientos: Movimiento[];
}

export interface PeriodoContable {
  id: number;
  anio: number;
  mes: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  cerrado: boolean;
  fecha_cierre: string | null;
  cerrado_por: string | null;
  company_id: string | null;
  created_at: string;
}

export interface LibroDiarioItem {
  poliza_id: number;
  numero_poliza: string;
  fecha: string;
  tipo: string;
  concepto_poliza: string;
  referencia: string | null;
  status: string;
  movimiento_id: number;
  cuenta_codigo: string;
  cuenta_nombre: string;
  concepto_movimiento: string;
  debe: number;
  haber: number;
  referencia_movimiento: string | null;
}

export interface MayorGeneralItem {
  cuenta_id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  naturaleza: string;
  saldo_inicial: number;
  total_debe: number;
  total_haber: number;
  saldo_final: number;
}

export interface BalanceComprobacionItem {
  codigo: string;
  nombre: string;
  saldo_inicial: number;
  debe_periodo: number;
  haber_periodo: number;
  saldo_final: number;
}

export interface BalanceGeneral {
  activo_circulante: number;
  activo_fijo: number;
  activo_diferido: number;
  activo_total: number;
  pasivo_circulante: number;
  pasivo_largo_plazo: number;
  pasivo_total: number;
  capital_contable: number;
  pasivo_mas_capital: number;
}

export interface EstadoResultados {
  ventas_netas: number;
  costo_ventas: number;
  utilidad_bruta: number;
  gastos_operacion: number;
  utilidad_operacion: number;
  otros_ingresos: number;
  otros_gastos: number;
  utilidad_antes_impuestos: number;
  impuestos: number;
  utilidad_neta: number;
}
