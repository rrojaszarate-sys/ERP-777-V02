export interface OCRDocument {
  id: string;
  evento_id: string;
  nombre_archivo: string;
  ruta_storage: string;
  tipo_documento: 'ticket' | 'factura' | 'auto';
  estado_procesamiento: 'pending' | 'processing' | 'completed' | 'error';
  confianza_general?: number;
  tiempo_procesamiento_ms?: number;
  error_mensaje?: string;
  
  // Datos extraídos
  texto_completo?: string;
  datos_ticket?: TicketData;
  datos_factura?: FacturaData;
  
  // Validación
  validado: boolean;
  validado_por?: string;
  validado_fecha?: string;
  notas_validacion?: string;
  
  created_at: string;
  updated_at: string;
}

export interface TicketData {
  establecimiento?: string;
  direccion?: string;
  telefono?: string;
  fecha?: string;
  hora?: string;
  total?: number;
  subtotal?: number;
  iva?: number;
  propina?: number;
  descuento?: number;
  forma_pago?: string;
  numero_transaccion?: string;
  codigo_postal?: string;
  rfc?: string;
  proveedor?: string;
  productos?: ProductoTicket[];
  detalle?: DetalleItem[]; // Nuevo campo: array de artículos extraídos con análisis espacial
  confianza_campos?: Record<string, number>;
}

export interface DetalleItem {
  descripcion: string;
  precio: number;
}

export interface ProductoTicket {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  confianza?: number;
}

export interface FacturaData {
  // Identificadores
  uuid?: string;
  serie?: string;
  folio?: string;
  
  // Emisor
  rfc_emisor?: string;
  nombre_emisor?: string;
  regimen_fiscal?: string;
  
  // Receptor
  rfc_receptor?: string;
  nombre_receptor?: string;
  uso_cfdi?: string;
  
  // Montos
  subtotal?: number;
  iva?: number;
  ieps?: number;
  retencion_isr?: number;
  retencion_iva?: number;
  total?: number;
  
  // Detalles de pago
  forma_pago?: string;
  metodo_pago?: string;
  moneda?: string;
  tipo_cambio?: number;
  
  // Fechas
  fecha_emision?: string;
  fecha_certificacion?: string;
  
  // Validación SAT
  estado?: string;
  validado_sat?: boolean;
  fecha_validacion_sat?: string;
  
  // Conceptos
  conceptos?: ConceptoFactura[];
  
  // Confianza
  confianza_campos?: Record<string, number>;
}

export interface ConceptoFactura {
  clave_producto?: string;
  descripcion?: string;
  cantidad?: number;
  unidad?: string;
  precio_unitario?: number;
  importe?: number;
  iva?: number;
  confianza?: number;
}

export interface ProcessingConfig {
  tipo_documento: 'ticket' | 'factura' | 'auto';
  idioma?: 'spa' | 'eng';
  preprocesar?: boolean;
  extraer_texto_completo?: boolean;
  validar_automaticamente?: boolean;
}

export interface OCRProcessingResult {
  success: boolean;
  document?: OCRDocument;
  error?: string;
}

export interface OCRQueryParams {
  evento_id?: string;
  tipo_documento?: 'ticket' | 'factura';
  estado_procesamiento?: string;
  validado?: boolean;
  fecha_desde?: string;
  fecha_hasta?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}
