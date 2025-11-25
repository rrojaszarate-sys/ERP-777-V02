// ============================================
// TIPOS DEL MÓDULO DE TESORERÍA
// ============================================

export interface CuentaBancaria {
  id: number;
  company_id: string;
  banco: string;
  numero_cuenta: string;
  clabe: string | null;
  tipo: 'cheques' | 'inversion' | 'nomina';
  saldo_actual: number;
  moneda: string;
  activa: boolean;
  created_at: string;
}

export interface MovimientoBancario {
  id: number;
  company_id: string;
  cuenta_id: number;
  tipo: 'deposito' | 'retiro' | 'transferencia';
  monto: number;
  fecha: string;
  concepto: string | null;
  referencia: string | null;
  saldo_resultante: number;
  conciliado: boolean;
  created_at: string;
  cuenta?: CuentaBancaria;
}

export interface Conciliacion {
  id: number;
  cuenta_id: number;
  periodo_inicio: string;
  periodo_fin: string;
  saldo_inicial: number;
  saldo_final_sistema: number;
  saldo_final_banco: number;
  diferencia: number;
  status: 'pendiente' | 'conciliado' | 'con_diferencias';
  movimientos_conciliados: number;
  movimientos_pendientes: number;
  notas: string | null;
  created_at: string;
  cuenta?: CuentaBancaria;
}

export interface FlujoCaja {
  periodo: string;
  ingresos: number;
  egresos: number;
  saldo_inicial: number;
  saldo_final: number;
  flujo_neto: number;
}

export interface MetricasTesoreria {
  saldo_total: number;
  cuentas_activas: number;
  movimientos_mes: number;
  pendientes_conciliacion: number;
  ingresos_mes: number;
  egresos_mes: number;
  flujo_neto_mes: number;
}

export interface CuentaBancariaFormData extends Partial<CuentaBancaria> {}
export interface MovimientoBancarioFormData extends Partial<MovimientoBancario> {}
