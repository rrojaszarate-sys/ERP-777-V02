/**
 * TIPOS PARA GASTOS NO IMPACTADOS (GNI)
 * Gestión de gastos operativos fuera de eventos
 */

// ============================================================================
// CATÁLOGOS
// ============================================================================

export interface ClaveGasto {
  id: number;
  clave: string;           // MDE2025-002A
  cuenta: string;          // GASTOS FIJOS
  subcuenta: string;       // Agua embotellada
  presupuesto_anual: number;
  descripcion: string | null;
  orden_display: number;
  activo: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface FormaPago {
  id: number;
  nombre: string;          // KUSPIT SP´S
  tipo: string | null;     // transferencia, tarjeta, efectivo
  banco: string | null;    // SANTANDER, BBVA
  descripcion: string | null;
  activo: boolean;
  company_id: string;
  created_at: string;
}

export interface Proveedor {
  id: number;
  nombre: string;           // Campo requerido en BD
  rfc: string | null;
  razon_social: string | null;
  regimen_fiscal: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto_nombre: string | null;
  tipo: string | null;      // proveedor, acreedor, prestador
  categoria: string | null; // SP, materiales, servicios, etc.
  activo: boolean;
  notas: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface Ejecutivo {
  id: number;
  nombre: string;
  user_id: string | null;
  departamento: string | null;
  activo: boolean;
  company_id: string;
  created_at: string;
}

// ============================================================================
// GASTO NO IMPACTADO
// ============================================================================

export interface GastoNoImpactado {
  id: number;
  company_id: string;

  // Clasificación
  tipo: string;
  categoria: string | null;
  concepto: string;
  descripcion: string | null;

  // Montos
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  iva_porcentaje: number;
  iva: number;
  total: number;

  // Referencias a catálogos
  cuenta_id: number;
  clave_gasto_id: number | null;
  proveedor_id: number | null;
  forma_pago_id: number | null;
  ejecutivo_id: number | null;

  // Período y fechas
  periodo: string | null;        // '2025-01'
  fecha_gasto: string;
  fecha_facturacion: string | null;
  fecha_pago: string | null;

  // Estado
  validacion: string;            // pendiente, correcto, revisar
  status_pago: string;           // pendiente, pagado
  pagado: boolean;
  comprobado: boolean;

  // Documentación
  folio_factura: string | null;
  documento_url: string | null;
  folio_fiscal: string | null;

  // Proveedor (legacy - texto libre)
  proveedor: string | null;
  rfc_proveedor: string | null;

  // Auditoría
  notas: string | null;
  importado_de: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Vista consolidada con joins
export interface GastoNoImpactadoView {
  id: number;
  company_id: string;
  periodo: string | null;
  fecha_gasto: string;

  // Proveedor (del catálogo)
  proveedor_id: number | null;
  proveedor: string | null;
  rfc_proveedor: string | null;

  // Clasificación
  concepto: string;
  subcuenta: string | null;
  cuenta: string | null;
  clave: string | null;

  // Montos
  subtotal: number;
  iva: number;
  total: number;

  // Estado
  validacion: string | null;
  status_pago: string | null;

  // Forma de pago
  forma_pago: string | null;

  // Ejecutivo
  ejecutivo: string | null;

  // Documentación
  folio_factura: string | null;
  documento_url: string | null;

  // Auditoría
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FORMULARIOS
// ============================================================================

export interface GastoNoImpactadoFormData {
  proveedor_id: number | null;
  concepto: string;
  clave_gasto_id: number | null;
  subtotal: number;
  iva: number;
  total: number;
  validacion: string;
  forma_pago_id: number | null;
  ejecutivo_id: number | null;
  status_pago: string;
  fecha_gasto: string;
  periodo: string;
  folio_factura: string;
  documento_url: string | null;
  notas: string;
}

export interface ProveedorFormData {
  rfc: string;
  razon_social: string;
  direccion: string;
  telefono: string;
  email: string;
  contacto_nombre: string;
}

export interface ClaveGastoFormData {
  clave: string;
  cuenta: string;
  subcuenta: string;
  presupuesto_anual: number;
  descripcion: string;
}

// ============================================================================
// FILTROS Y REPORTES
// ============================================================================

export interface GNIFiltros {
  periodo?: string;        // Formato: "YYYY-MM" (un solo mes)
  anio?: number;           // Año completo (ej: 2025)
  meses?: number[];        // Meses específicos del año (1-12)
  cuenta?: string;
  clave_gasto_id?: number;
  proveedor_id?: number;
  ejecutivo_id?: number;
  forma_pago_id?: number;
  validacion?: string;
  status_pago?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface GNITotalesPeriodo {
  cuenta: string;
  subcuenta: string;
  clave: string;
  total_subtotal: number;
  total_iva: number;
  total: number;
  cantidad_registros: number;
}

export interface GNIResumenMensual {
  periodo: string;
  total_gastos: number;
  cantidad_registros: number;
  por_cuenta: {
    cuenta: string;
    total: number;
  }[];
}

// ============================================================================
// IMPORTACIÓN EXCEL
// ============================================================================

export interface ExcelGastoRow {
  PROVEEDOR: string;
  CONCEPTO: string;
  SUBCUENTA: string;
  CUENTA: string;
  CLAVE: string;
  SUBTOTAL: number;
  IVA: number;
  TOTAL: number;
  VALIDACION: string;
  'FORMA DE PAGO': string;
  EJECUTIVO: string;
  STATUS: string;
  FECHA: number | string;  // Excel serial o string
  FACTURA: string;
}

export interface ImportExcelResult {
  total_filas: number;
  importados: number;
  errores: number;
  proveedores_nuevos: number;
  detalle_errores: {
    fila: number;
    error: string;
  }[];
}

// ============================================================================
// MEMBRETE PDF
// ============================================================================

export interface MembreteConfig {
  logo_url: string | null;
  nombre_empresa: string;
  rfc: string | null;
  slogan: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  website: string | null;
  footer: string | null;
}

export interface PDFReporteGNI {
  membrete: MembreteConfig;
  titulo: string;
  periodo: string;
  fecha_generacion: string;
  gastos: GastoNoImpactadoView[];
  totales: {
    subtotal: number;
    iva: number;
    total: number;
  };
}
