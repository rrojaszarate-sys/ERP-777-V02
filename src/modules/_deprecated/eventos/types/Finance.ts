export interface Income {
  // ====== IDENTIFICADORES ======
  id: string;
  evento_id: string;
  categoria_id?: string | null;
  
  // ====== CLIENTE (OBLIGATORIO) ======
  cliente_id: string;                 // ✅ FK a evt_clientes - OBLIGATORIO
  cliente: string;                    // ✅ Nombre del cliente - OBLIGATORIO
  rfc_cliente: string;                // ✅ RFC del cliente - OBLIGATORIO
  
  // ====== PROVEEDOR/EMISOR ======
  proveedor?: string;                 // Emisor de la factura (quien vende)
  rfc_proveedor?: string;             // RFC del emisor
  
  // ====== CONCEPTO ======
  concepto: string;
  descripcion?: string;
  
  // ====== CAMPOS CFDI 4.0 (SAT) ======
  uuid_cfdi?: string;                 // UUID del comprobante fiscal
  folio_fiscal?: string;              // Folio fiscal (UUID)
  serie?: string;                     // Serie del comprobante
  folio?: string;                     // Folio del comprobante
  tipo_comprobante?: 'I' | 'E' | 'T' | 'N' | 'P'; // I=Ingreso, E=Egreso, etc.
  forma_pago_sat?: string;            // Clave SAT forma de pago (01-31)
  metodo_pago_sat?: 'PUE' | 'PPD' | 'PIP'; // PUE=Pago único, PPD=Parcialidades, PIP=Pago inicial y parcialidades
  moneda?: 'MXN' | 'USD' | 'EUR' | 'CAD' | 'GBP';
  tipo_cambio?: number;               // Tipo de cambio si moneda != MXN
  lugar_expedicion?: string;          // Código postal de expedición
  uso_cfdi?: string;                  // Clave SAT uso del CFDI
  regimen_fiscal_receptor?: string;   // Régimen fiscal del receptor
  regimen_fiscal_emisor?: string;     // Régimen fiscal del emisor
  
  // ====== DETALLE DE PRODUCTOS/SERVICIOS ======
  detalle_compra?: {                  // JSONB con líneas de detalle
    productos?: Array<{
      clave_prod_serv?: string;       // Clave SAT producto/servicio
      no_identificacion?: string;     // SKU o código
      descripcion: string;
      cantidad: number;
      clave_unidad?: string;          // Clave SAT unidad
      unidad?: string;
      valor_unitario: number;
      importe: number;
      descuento?: number;
      impuestos?: {
        traslados?: Array<{
          base: number;
          impuesto: string;
          tipo_factor: string;
          tasa_o_cuota: number;
          importe: number;
        }>;
        retenciones?: Array<{
          base: number;
          impuesto: string;
          tipo_factor: string;
          tasa_o_cuota: number;
          importe: number;
        }>;
      };
    }>;
  };
  
  // ====== CAMPOS ADICIONALES (TICKETS) ======
  folio_interno?: string;             // Folio del ticket (no fiscal)
  hora_emision?: string;              // Hora de emisión (HH:MM:SS)
  telefono_proveedor?: string;        // Teléfono del establecimiento
  descuento?: number;                 // Descuento aplicado
  motivo_descuento?: string;          // Razón del descuento
  
  // ====== CAMPOS FINANCIEROS ======
  subtotal: number;
  iva_porcentaje: number;
  iva: number;
  total: number;
  fecha_ingreso: string;
  referencia?: string;
  documento_url?: string;
  
  // ====== ESTADO DE FACTURACIÓN Y COBRO ======
  facturado: boolean;
  cobrado: boolean;
  fecha_facturacion?: string;
  fecha_cobro?: string;
  metodo_cobro?: string;
  dias_credito?: number;
  fecha_compromiso_pago?: string;
  documento_pago_url?: string;        // ✅ Comprobante de pago
  documento_pago_nombre?: string;
  
  // ====== ESTADO DE APROBACIÓN (como gastos) ======
  estado_cobro?: 'cotizado' | 'aprobado' | 'facturado' | 'cobrado_parcial' | 'cobrado_total';
  status_aprobacion?: 'pendiente' | 'aprobado' | 'rechazado';
  aprobado_por?: string;
  fecha_aprobacion?: string;
  
  // ====== RESPONSABLE ======
  responsable_id?: string;            // ✅ Usuario responsable del seguimiento
  
  // ====== ARCHIVOS ADJUNTOS ======
  archivo_adjunto?: string;
  archivo_nombre?: string;
  archivo_tamaño?: number;
  archivo_tipo?: string;
  
  // ====== METADATOS OCR ======
  ocr_confianza?: number;             // Nivel de confianza del OCR (0-1)
  ocr_validado?: boolean;             // Si fue validado manualmente
  ocr_datos_originales?: OCRMetadata; // Datos crudos del OCR
  
  // ====== SOFT DELETE ======
  deleted_at?: string;
  deleted_by?: string;
  delete_reason?: string;
  
  // ====== AUDITORÍA ======
  activo?: boolean;
  notas?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // ====== RELACIONES ======
  categoria?: ExpenseCategory;
}

export interface Expense {
  id: string;
  evento_id: string;
  categoria_id?: string;
  concepto: string;
  descripcion?: string;

  // ====== CAMPOS CFDI 4.0 (SAT) ======
  uuid_cfdi?: string;               // UUID del comprobante fiscal (solo facturas)
  folio_fiscal?: string;            // Folio fiscal del SAT (solo facturas)
  serie?: string;                   // Serie de la factura
  tipo_comprobante?: 'I' | 'E' | 'T' | 'N' | 'P'; // I=Ingreso, E=Egreso, etc.
  forma_pago_sat?: '01' | '02' | '03' | '04' | '05' | '28' | '99'; // Código SAT c_FormaPago
  metodo_pago_sat?: 'PUE' | 'PPD';  // PUE=Pago único, PPD=Parcialidades
  lugar_expedicion?: string;        // Código postal de expedición
  moneda?: 'MXN' | 'USD' | 'EUR' | 'CAD' | 'GBP'; // Catálogo c_Moneda
  tipo_cambio?: number;             // Tipo de cambio (si moneda != MXN)
  // ===================================

  // ====== DETALLE DE PRODUCTOS (JSON) ======
  detalle_productos?: {
    productos: Array<{
      numero: number;
      codigo?: string;
      clave_prod_serv?: string;     // Clave SAT de producto/servicio
      descripcion: string;
      cantidad: number;
      unidad?: string;               // PZA, KG, LT, etc.
      precio_unitario: number;
      importe: number;
      descuento?: number;
    }>;
    total_productos: number;
    subtotal_productos: number;
  };
  // ==========================================

  // ====== CAMPOS ADICIONALES (TICKETS) ======
  folio_interno?: string;           // Folio del ticket (no fiscal)
  hora_emision?: string;            // Hora de emisión (HH:MM:SS)
  telefono_proveedor?: string;      // Teléfono del establecimiento
  descuento?: number;               // Descuento aplicado
  motivo_descuento?: string;        // Razón del descuento
  // ==========================================

  // ====== CAMPOS ESTÁNDAR ======
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  iva_porcentaje: number;
  iva: number;
  total: number;
  proveedor?: string;
  rfc_proveedor?: string;
  fecha_gasto: string;
  forma_pago: 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'debito' | 'credito' | 'vales';
  referencia?: string;
  documento_url?: string;
  // =============================

  // Approval workflow
  status_aprobacion: 'pendiente' | 'aprobado' | 'rechazado';
  aprobado_por?: string;
  fecha_aprobacion?: string;

  // File attachment
  archivo_adjunto?: string;
  archivo_nombre?: string;
  archivo_tamaño?: number;
  archivo_tipo?: string;
  xml_file_url?: string;              // URL del archivo XML CFDI (separado del PDF/imagen)

  // OCR metadata
  ocr_confianza?: number;
  ocr_validado?: boolean;
  ocr_datos_originales?: OCRMetadata;

  // Soft delete
  notas?: string;
  deleted_at?: string;
  deleted_by?: string;
  delete_reason?: string;

  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relations
  categoria?: ExpenseCategory;
}

export interface ExpenseCategory {
  id: string;
  company_id?: string;
  nombre: string;
  descripcion?: string;
  color: string;
  activo: boolean;
  created_at: string;
}


export interface Documento {
  id: string;
  evento_id: string;
  tipo_documento: string;
  categoria?: string;
  nombre_archivo: string;
  url_archivo: string;
  tamaño_archivo?: number;
  tipo_mime?: string;
  descripcion?: string;
  created_at: string;
  uploaded_by?: string;
}


export interface FinancialSummary {
  total_ingresos: number;
  total_gastos: number;
  utilidad: number;
  margen_porcentaje: number;
  ingresos_por_estado: Record<string, number>;
  gastos_por_categoria: Record<string, number>;
  archivos_adjuntos: {
    total_archivos: number;
    archivos_ingresos: number;
    archivos_gastos: number;
    tamaño_total_mb: number;
  };
}

export const INCOME_STATES = {
  COTIZADO: 'cotizado',
  APROBADO: 'aprobado',
  FACTURADO: 'facturado',
  COBRADO_PARCIAL: 'cobrado_parcial',
  COBRADO_TOTAL: 'cobrado_total'
} as const;

export const EXPENSE_CATEGORIES = {
  SPS: 'Servicios Profesionales',
  RH: 'Recursos Humanos',
  MATERIALES: 'Materiales',
  COMBUSTIBLE_CASETAS: 'Combustible/Casetas',
  OTROS: 'Otros'
} as const;

export const EXPENSE_APPROVAL_STATUS = {
  PENDIENTE: 'pendiente',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado'
} as const;

export const PAYMENT_METHODS = {
  EFECTIVO: 'efectivo',
  TRANSFERENCIA: 'transferencia',
  CHEQUE: 'cheque',
  TARJETA: 'tarjeta',
  DEBITO: 'debito',
  CREDITO: 'credito',
  VALES: 'vales'
} as const;

/**
 * Metadata completa del OCR para auditoría y análisis
 */
export interface OCRMetadata {
  texto_completo: string;
  confianza_general: number;
  motor_usado: 'google_vision' | 'tesseract' | 'ocr_space';
  timestamp: string;
  productos_detectados: Array<{
    codigo?: string;
    clave_prod_serv?: string;
    nombre: string;
    cantidad: number;
    unidad?: string;
    precio_unitario: number;
    subtotal: number;
    descuento?: number;
  }>;
  metadata_adicional: {
    establecimiento?: string;
    rfc?: string;
    telefono?: string;
    direccion?: string;
    folio_interno?: string;
    folio_fiscal?: string;
    uuid_cfdi?: string;
    serie?: string;
    hora?: string;
    lugar_expedicion?: string;
  };
  campos_confianza: Record<string, number>;
  errores_detectados: string[];
}

/**
 * Catálogos del SAT para referencia
 */
export const SAT_FORMA_PAGO = {
  EFECTIVO: '01',
  CHEQUE: '02',
  TRANSFERENCIA: '03',
  TARJETA_CREDITO: '04',
  MONEDERO: '05',
  TARJETA_DEBITO: '28',
  POR_DEFINIR: '99'
} as const;

export const SAT_METODO_PAGO = {
  PAGO_UNICO: 'PUE',
  PAGO_PARCIALIDADES: 'PPD'
} as const;

export const SAT_TIPO_COMPROBANTE = {
  INGRESO: 'I',
  EGRESO: 'E',
  TRASLADO: 'T',
  NOMINA: 'N',
  PAGO: 'P'
} as const;

export const SAT_MONEDA = {
  PESO_MEXICANO: 'MXN',
  DOLAR: 'USD',
  EURO: 'EUR',
  DOLAR_CANADIENSE: 'CAD',
  LIBRA: 'GBP'
} as const;

// =====================================================
// NUEVOS TIPOS PARA SISTEMA DE ESTADOS Y CUENTAS
// =====================================================

/**
 * Estado del ingreso en el flujo de trabajo
 */
export interface EstadoIngreso {
  id: number;
  nombre: 'PLANEADO' | 'ORDEN_COMPRA' | 'FACTURADO' | 'PAGADO';
  descripcion?: string;
  orden: number;
  color?: string;
  created_at: string;
}

/**
 * Cuenta contable para clasificación de gastos
 */
export interface CuentaContable {
  id: number;
  company_id?: string;
  codigo: string;
  nombre: string;
  tipo: 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto';
  descripcion?: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Ingreso con campos extendidos para control de facturación
 */
export interface IncomeExtended extends Income {
  // Control de estado y flujo de trabajo
  estado_id?: number;
  estado?: EstadoIngreso;

  // Control de facturación
  dias_facturacion?: number;
  fecha_limite_facturacion?: string;

  // Orden de compra
  orden_compra_url?: string;
  orden_compra_nombre?: string;

  // Alertas y notificaciones
  alertas_enviadas?: Array<{
    tipo: 'facturacion_proxima' | 'facturacion_vencida';
    fecha_envio: string;
    destinatario: string;
  }>;

  // Datos relacionados para vistas
  evento_nombre?: string;
  clave_evento?: string;
  cliente_nombre?: string;
  responsable_nombre?: string;
  estado_nombre?: string;
  estado_color?: string;
  estado_vencimiento?: 'normal' | 'proximo' | 'vencido';
}

/**
 * Gasto con campos extendidos para control de pagos
 */
export interface ExpenseExtended extends Expense {
  // Clasificación contable
  cuenta_id?: number;
  cuenta?: CuentaContable;

  // Control de pago
  comprobante_pago_url?: string;
  comprobante_pago_nombre?: string;
  fecha_pago?: string;
  responsable_pago_id?: string;
  responsable_pago?: {
    id: string;
    nombre: string;
    email?: string;
  };
  pagado?: boolean;

  // Comprobación
  comprobado?: boolean;

  // Autorización (siempre true por defecto)
  autorizado?: boolean;

  // Datos relacionados para vistas
  evento_nombre?: string;
  clave_evento?: string;
  proveedor_nombre?: string;
  responsable_pago_nombre?: string;
  cuenta_nombre?: string;
  cuenta_codigo?: string;
  dias_pendiente?: number;
  dias_sin_comprobar?: number;
}

/**
 * Constantes para estados de ingreso
 */
export const ESTADOS_INGRESO = {
  PLANEADO: 1,
  ORDEN_COMPRA: 2,
  FACTURADO: 3,
  PAGADO: 4
} as const;

/**
 * Colores por estado de ingreso
 */
export const ESTADOS_INGRESO_COLORS = {
  PLANEADO: 'blue',
  ORDEN_COMPRA: 'indigo',
  FACTURADO: 'yellow',
  PAGADO: 'green'
} as const;

/**
 * Tipos de cuenta contable
 */
export const TIPOS_CUENTA = {
  ACTIVO: 'activo',
  PASIVO: 'pasivo',
  CAPITAL: 'capital',
  INGRESO: 'ingreso',
  GASTO: 'gasto'
} as const;