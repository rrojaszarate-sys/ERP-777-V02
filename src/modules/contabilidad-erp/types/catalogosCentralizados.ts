/**
 * TIPOS PARA CATÁLOGOS CENTRALIZADOS DE CONTABILIDAD
 * Fuente única de verdad para todo el ERP
 */

// ============================================================================
// CUENTAS CONTABLES
// ============================================================================

export interface CuentaContable {
  id: number;
  company_id: string;
  clave: string;           // MDE2025-001, ING-001, etc.
  cuenta: string;          // GASTOS FIJOS, INGRESOS, etc.
  subcuenta: string | null;
  tipo: 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto';
  presupuesto_anual: number;
  orden_display: number;
  activa: boolean;
  descripcion: string | null;
  created_at: string;
  updated_at: string;
}

export interface CuentaContableFormData {
  clave: string;
  cuenta: string;
  subcuenta: string;
  tipo: CuentaContable['tipo'];
  presupuesto_anual: number;
  descripcion: string;
}

// ============================================================================
// PROVEEDORES CENTRALIZADOS
// ============================================================================

export interface ProveedorCentralizado {
  id: number;
  company_id: string;
  nombre: string;
  rfc: string | null;
  razon_social: string | null;
  regimen_fiscal: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto_nombre: string | null;
  datos_fiscales_completos: boolean;
  fecha_actualizacion_fiscal: string | null;
  requiere_actualizacion: boolean;
  tipo: string | null;
  categoria: string | null;
  activo: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProveedorFormData {
  nombre: string;
  rfc?: string;
  razon_social?: string;
  regimen_fiscal?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contacto_nombre?: string;
  tipo?: string;
  categoria?: string;
}

// Actualización de datos fiscales (al primer pago)
export interface ActualizacionFiscalProveedor {
  rfc: string;
  razon_social: string;
  regimen_fiscal?: string;
  direccion?: string;
}

// ============================================================================
// CLIENTES CENTRALIZADOS
// ============================================================================

export interface ClienteCentralizado {
  id: number;
  company_id: string;
  nombre: string;
  sufijo: string | null;        // DOT, SAM, etc.
  rfc: string | null;
  razon_social: string | null;
  regimen_fiscal: string | null;
  uso_cfdi: string;
  direccion: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  estado: string | null;
  telefono: string | null;
  email: string | null;
  contacto_nombre: string | null;
  contacto_puesto: string | null;
  dias_credito: number;
  limite_credito: number | null;
  descuento_default: number;
  activo: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClienteFormData {
  nombre: string;
  sufijo?: string;
  rfc?: string;
  razon_social?: string;
  regimen_fiscal?: string;
  uso_cfdi?: string;
  direccion?: string;
  codigo_postal?: string;
  ciudad?: string;
  estado?: string;
  telefono?: string;
  email?: string;
  contacto_nombre?: string;
  contacto_puesto?: string;
  dias_credito?: number;
  limite_credito?: number;
  descuento_default?: number;
}

// ============================================================================
// FORMAS DE PAGO
// ============================================================================

export interface FormaPagoCentralizada {
  id: number;
  company_id: string | null;
  nombre: string;
  codigo_sat: string | null;
  tipo: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'electronico' | 'otro' | null;
  banco: string | null;
  cuenta_bancaria: string | null;
  activa: boolean;
  descripcion: string | null;
  created_at: string;
}

// ============================================================================
// EJECUTIVOS/RESPONSABLES
// ============================================================================

export interface EjecutivoCentralizado {
  id: number;
  company_id: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  user_id: string | null;
  departamento: string | null;
  cargo: string | null;
  puede_aprobar_gastos: boolean;
  limite_aprobacion: number | null;
  activo: boolean;
  created_at: string;
}

// ============================================================================
// CATEGORÍAS DE GASTO (SOLO 4)
// ============================================================================

export type CategoriaGastoClave = 'SP' | 'COMB' | 'RH' | 'MAT';

export interface CategoriaGasto {
  id: number;
  clave: CategoriaGastoClave;
  nombre: string;
  descripcion: string | null;
  color: string;
  orden_display: number;
  activo: boolean;
  company_id: string | null;
}

export const CATEGORIAS_GASTO: Record<CategoriaGastoClave, string> = {
  SP: 'Solicitudes de Pago',
  COMB: 'Combustible/Peaje',
  RH: 'Recursos Humanos',
  MAT: 'Materiales'
};

export const CATEGORIAS_GASTO_COLORS: Record<CategoriaGastoClave, string> = {
  SP: '#8B5CF6',     // Violeta
  COMB: '#F59E0B',   // Ámbar
  RH: '#10B981',     // Esmeralda
  MAT: '#3B82F6'     // Azul
};

// ============================================================================
// VALIDACIÓN FISCAL (COMPARTIDA)
// ============================================================================

export interface ValidacionFiscal {
  subtotal: number;
  iva: number;
  retenciones: number;
  total: number;
}

export function validarCuadreFiscal(data: ValidacionFiscal): { valid: boolean; calculado: number; diferencia: number } {
  const calculado = Math.round((data.subtotal + data.iva - data.retenciones) * 100) / 100;
  const diferencia = Math.abs(calculado - data.total);
  return {
    valid: diferencia <= 0.01,
    calculado,
    diferencia
  };
}

// ============================================================================
// VISTA CONSOLIDADA DE GASTOS
// ============================================================================

export interface GastoConsolidado {
  origen: 'GNI' | 'EVENTO';
  id: number | string;
  company_id: string;
  fecha_gasto: string;
  concepto: string;
  proveedor: string | null;
  rfc_proveedor: string | null;
  cuenta_clave: string | null;
  cuenta: string | null;
  subcuenta: string | null;
  subtotal: number;
  iva: number;
  total: number;
  status_pago: string | null;
  pagado: boolean;
  evento_id: number | null;
  evento_clave: string | null;
}

// ============================================================================
// OPCIONES PARA SELECTORES
// ============================================================================

export interface SelectOption<T = number> {
  value: T;
  label: string;
  extra?: Record<string, unknown>;
}

export type ProveedorOption = SelectOption<number> & {
  extra: {
    rfc: string | null;
    datos_fiscales_completos: boolean;
  };
};

export type ClienteOption = SelectOption<number> & {
  extra: {
    rfc: string | null;
    sufijo: string | null;
  };
};

export type CuentaContableOption = SelectOption<number> & {
  extra: {
    clave: string;
    cuenta: string;
    subcuenta: string | null;
    tipo: string;
  };
};
