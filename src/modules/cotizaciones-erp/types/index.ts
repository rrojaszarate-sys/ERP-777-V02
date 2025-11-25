/**
 * TIPOS DE COTIZACIONES Y CRM
 */

// ============================================================================
// CLIENTES Y CONTACTOS (CRM)
// ============================================================================

export interface Cliente {
  id: number;
  tipo: 'prospecto' | 'cliente' | 'inactivo';
  razon_social: string;
  nombre_comercial: string | null;
  rfc: string | null;
  email: string | null;
  telefono: string | null;
  telefono_secundario: string | null;
  website: string | null;

  // Dirección
  calle: string | null;
  numero_exterior: string | null;
  numero_interior: string | null;
  colonia: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  estado: string | null;
  pais: string;

  // Información comercial
  industria: string | null;
  tamaño_empresa: 'micro' | 'pequeña' | 'mediana' | 'grande' | 'corporativo' | null;
  origen: 'web' | 'referido' | 'evento' | 'llamada_fria' | 'linkedin' | 'otro' | null;
  calificacion: number | null;

  // Información financiera
  credito_autorizado: number;
  dias_credito: number;
  descuento_general: number;

  // Responsable
  ejecutivo_id: string | null;

  // Notas y tags
  notas: string | null;
  tags: string[];

  // Metadata
  activo: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Contacto {
  id: number;
  cliente_id: number;
  nombre: string;
  apellidos: string | null;
  puesto: string | null;
  departamento: string | null;
  email: string | null;
  telefono: string | null;
  telefono_movil: string | null;
  extension: string | null;
  es_principal: boolean;
  recibe_cotizaciones: boolean;
  recibe_facturas: boolean;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PRODUCTOS Y SERVICIOS
// ============================================================================

export interface Producto {
  id: number;
  tipo: 'producto' | 'servicio' | 'paquete';
  sku: string;
  nombre: string;
  descripcion: string | null;
  descripcion_larga: string | null;

  // Precios
  precio_base: number;
  precio_minimo: number | null;
  costo: number | null;

  // Unidades
  unidad_medida: string;
  cantidad_minima: number;
  cantidad_maxima: number | null;

  // Categorización
  categoria: string | null;
  subcategoria: string | null;
  tags: string[];

  // Impuestos
  aplica_iva: boolean;
  tasa_iva: number;

  // Inventario
  requiere_inventario: boolean;
  stock_actual: number;
  stock_minimo: number | null;

  // Metadata
  imagen_url: string | null;
  activo: boolean;
  destacado: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// COTIZACIONES
// ============================================================================

export interface Cotizacion {
  id: number;
  folio: string;

  // Cliente
  cliente_id: number;
  contacto_id: number | null;

  // Información general
  fecha: string;
  fecha_vencimiento: string | null;
  titulo: string | null;
  descripcion: string | null;

  // Estado
  status: 'borrador' | 'enviada' | 'revisada' | 'aprobada' | 'rechazada' | 'expirada' | 'convertida';

  // Montos
  subtotal: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  impuestos: number;
  total: number;

  // Condiciones
  moneda: string;
  tipo_cambio: number;
  forma_pago: string | null;
  condiciones_pago: string | null;
  tiempo_entrega: string | null;

  // Validez
  dias_validez: number;

  // Conversión
  convertida_a_evento: number | null;
  fecha_conversion: string | null;

  // Notas
  notas_internas: string | null;
  notas_cliente: string | null;
  terminos_condiciones: string | null;

  // Responsables
  elaborado_por: string | null;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;

  // Metadata
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface PartidaCotizacion {
  id: number;
  cotizacion_id: number;
  orden: number;

  // Producto/servicio
  producto_id: number | null;
  tipo: 'producto' | 'servicio' | 'concepto';

  sku: string | null;
  nombre: string;
  descripcion: string | null;

  // Cantidades
  cantidad: number;
  unidad: string;

  // Precios
  precio_unitario: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  subtotal: number;

  // Impuestos
  aplica_iva: boolean;
  tasa_iva: number;
  monto_iva: number;

  total: number;

  // Metadata
  notas: string | null;
  created_at: string;
}

export interface CotizacionConPartidas extends Cotizacion {
  partidas: PartidaCotizacion[];
  cliente?: Cliente;
  contacto?: Contacto;
}

// ============================================================================
// OPORTUNIDADES Y PIPELINE
// ============================================================================

export interface Oportunidad {
  id: number;
  nombre: string;

  // Cliente
  cliente_id: number;
  contacto_id: number | null;

  // Pipeline
  etapa: 'prospecto' | 'calificacion' | 'propuesta' | 'negociacion' | 'cierre' | 'ganada' | 'perdida';
  probabilidad: number;

  // Valores
  valor_estimado: number | null;
  valor_real: number | null;
  moneda: string;

  // Fechas
  fecha_creacion: string;
  fecha_cierre_estimada: string | null;
  fecha_cierre_real: string | null;

  // Origen y competencia
  origen: string | null;
  competidores: string | null;
  razon_ganada: string | null;
  razon_perdida: string | null;

  // Relaciones
  cotizacion_id: number | null;
  evento_id: number | null;

  // Responsable
  ejecutivo_id: string | null;

  // Metadata
  notas: string | null;
  tags: string[];
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface OportunidadConRelaciones extends Oportunidad {
  cliente?: Cliente;
  contacto?: Contacto;
  cotizacion?: Cotizacion;
}

export interface Actividad {
  id: number;
  tipo: 'llamada' | 'email' | 'reunion' | 'presentacion' | 'visita' | 'seguimiento' | 'otro';

  // Relaciones
  cliente_id: number | null;
  oportunidad_id: number | null;
  cotizacion_id: number | null;

  // Detalles
  titulo: string;
  descripcion: string | null;
  resultado: string | null;

  // Fechas
  fecha_programada: string | null;
  fecha_realizada: string | null;
  duracion_minutos: number | null;

  // Estado
  status: 'programada' | 'completada' | 'cancelada';

  // Responsable
  asignado_a: string | null;

  company_id: string;
  created_at: string;
}

// ============================================================================
// INTERFACES DE VISTA Y REPORTES
// ============================================================================

export interface PipelineMetrics {
  total_oportunidades: number;
  valor_total_pipeline: number;
  tasa_conversion: number;
  tiempo_promedio_cierre: number;
  por_etapa: {
    etapa: string;
    cantidad: number;
    valor: number;
    probabilidad_promedio: number;
  }[];
}

export interface ClienteMetrics {
  total_clientes: number;
  total_prospectos: number;
  clientes_nuevos_mes: number;
  tasa_conversion_prospecto_cliente: number;
  valor_promedio_cliente: number;
}

export interface CotizacionMetrics {
  total_cotizaciones: number;
  cotizaciones_enviadas: number;
  cotizaciones_aprobadas: number;
  cotizaciones_rechazadas: number;
  tasa_aprobacion: number;
  valor_total_cotizado: number;
  valor_total_aprobado: number;
  ticket_promedio: number;
}
