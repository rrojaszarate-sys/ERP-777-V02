export interface EventoCompleto {
  id: string;
  clave_unica: string; // Auto-generated unique key
  nombre: string;
  descripcion?: string;
  cliente_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  responsable_id: string;
  status_workflow: 'pendiente_facturar' | 'facturado' | 'pago_pendiente' | 'pagado';
  subtotal: number;
  iva: number;
  total: number;
  utilidad: number;
  created_at: string;
  updated_at: string;
  
  // Relations
  cliente?: Cliente;
  responsable?: Usuario;
  ingresos?: Ingreso[];
  gastos?: Gasto[];
  documentos?: DocumentoEvento[];
  audit_log?: AuditLog[];
}

export interface Ingreso {
  id: string;
  evento_id: string;
  concepto: string;
  monto: number;
  fecha_registro: string;
  usuario_registro_id: string;
  documento_id?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  usuario_registro?: Usuario;
  documento?: DocumentoEvento;
}

export interface Gasto {
  id: string;
  evento_id: string;
  concepto: string;
  categoria: 'sps' | 'rrhh' | 'materiales' | 'combustible_casetas' | 'otros';
  monto: number;
  fecha: string;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  proveedor?: string;
  usuario_registro_id: string;
  usuario_aprobacion_id?: string;
  documento_id?: string;
  notas_aprobacion?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  usuario_registro?: Usuario;
  usuario_aprobacion?: Usuario;
  documento?: DocumentoEvento;
}

export interface DocumentoEvento {
  id: string;
  evento_id: string;
  nombre_archivo: string;
  ruta_archivo: string;
  tipo_documento: 'ingreso' | 'gasto' | 'factura' | 'comprobante';
  datos_ocr?: DatosOCR;
  usuario_subida_id: string;
  created_at: string;
  
  // Relations
  usuario_subida?: Usuario;
}

export interface DatosOCR {
  fecha_extraida?: string;
  monto_extraido?: number;
  concepto_extraido?: string;
  proveedor_extraido?: string;
  confianza_ocr: number; // 0-100
  validado: boolean;
  usuario_validacion_id?: string;
  fecha_validacion?: string;
  tipo_documento?: string;
  campos_confianza?: Record<string, number>;
  
  // Campos específicos para CFDI
  rfc_emisor?: string;
  rfc_receptor?: string;
  uuid?: string;
  subtotal?: number;
  iva?: number;
  total?: number;
  metodo_pago?: string;
  forma_pago?: string;
  uso_cfdi?: string;
  nombre_emisor?: string;
  regimen_fiscal?: string;
  
  // Campos específicos para nómina
  empleado?: string;
  percepciones?: number;
  deducciones?: number;
  
  // Campos específicos para estado de cuenta
  numero_cuenta?: string;
  saldo?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  
  // Campos específicos para orden de compra
  numero_orden?: string;
  
  // Campos específicos para contrato
  parte_a?: string;
  parte_b?: string;
  
  // Validaciones y enriquecimiento
  validaciones?: {
    calculo_correcto?: boolean;
    rfc_valido?: boolean;
    uuid_valido?: boolean;
    confianza_general?: number;
  };
  categoria_sugerida?: string;
}

export interface AuditLog {
  id: string;
  evento_id: string;
  company_id?: string;
  usuario_id: string;
  action: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  timestamp: string;
  
  // Relations
  usuario?: Usuario;
}

export interface Cliente {
  id: string;
  razon_social: string;
  nombre_comercial?: string;
  rfc: string;
  email?: string;
  telefono?: string;
  direccion_fiscal?: string;
  contacto_principal?: string;
  activo: boolean;
  created_at: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  permisos: string[];
  activo: boolean;
  created_at: string;
}

export const CATEGORIAS_GASTO = {
  sps: 'SPs (Servicios Profesionales)',
  rrhh: 'RRHH (Recursos Humanos)',
  materiales: 'Materiales',
  combustible_casetas: 'Combustible/Casetas',
  otros: 'Otros'
} as const;

export const STATUS_WORKFLOW = {
  pendiente_facturar: 'Pendiente Facturar',
  facturado: 'Facturado',
  pago_pendiente: 'Pago Pendiente',
  pagado: 'Pagado'
} as const;

export const STATUS_GASTO = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado'
} as const;