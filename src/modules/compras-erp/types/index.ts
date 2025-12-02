/**
 * Tipos para el módulo de Compras
 */

// Estados de orden de compra
export type EstadoOrdenCompra = 
  | 'borrador'
  | 'pendiente_aprobacion'
  | 'aprobada'
  | 'enviada_proveedor'
  | 'parcialmente_recibida'
  | 'recibida'
  | 'cancelada'
  | 'cerrada';

// Estados de requisición
export type EstadoRequisicion = 
  | 'pendiente'
  | 'aprobada'
  | 'rechazada'
  | 'en_compra'
  | 'completada';

// Estados de recepción
export type EstadoRecepcion = 
  | 'pendiente'
  | 'en_proceso'
  | 'verificada'
  | 'con_diferencias'
  | 'finalizada';

// Prioridades
export type PrioridadRequisicion = 'baja' | 'media' | 'alta' | 'urgente';

// Tipo de almacén
export interface TipoAlmacen {
  id: number;
  empresa_id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono: string;
  color: string;
  usa_lotes: boolean;
  usa_fechas_vencimiento: boolean;
  usa_numeros_serie: boolean;
  usa_ubicaciones: boolean;
  usa_reservas_evento: boolean;
  dias_alerta_vencimiento: number;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface TipoAlmacenConfig {
  usa_lotes: boolean;
  usa_fecha_caducidad: boolean;
  usa_ubicaciones: boolean;
  usa_numero_serie: boolean;
  usa_peso: boolean;
  usa_dimensiones: boolean;
  requiere_inspeccion_entrada: boolean;
  requiere_inspeccion_salida: boolean;
  permite_reservas: boolean;
  permite_transferencias: boolean;
  control_temperatura: boolean;
  es_consumible: boolean;
  es_reutilizable: boolean;
  dias_alerta_stock_bajo: number;
  porcentaje_stock_minimo: number;
  dias_alerta_vencimiento?: number;
}

export type TipoAlmacenCreate = Omit<TipoAlmacen, 'id' | 'created_at' | 'updated_at'>;

// Orden de compra
export interface OrdenCompra {
  id: number;
  empresa_id: string;
  numero_orden: string;
  numero_cotizacion_proveedor?: string;
  referencia_interna?: string;
  proveedor_id: number;
  contacto_proveedor?: string;
  fecha_orden: string;
  fecha_entrega_esperada?: string;
  fecha_entrega_real?: string;
  fecha_vencimiento?: string;
  almacen_destino_id?: number;
  evento_id?: number;
  proyecto_id?: number;
  estado: EstadoOrdenCompra;
  requiere_aprobacion: boolean;
  aprobado_por?: string;
  fecha_aprobacion?: string;
  motivo_rechazo?: string;
  subtotal: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  iva: number;
  otros_impuestos: number;
  total: number;
  moneda: string;
  tipo_cambio: number;
  condiciones_pago?: string;
  dias_credito: number;
  metodo_envio?: string;
  costo_envio: number;
  notas_internas?: string;
  notas_proveedor?: string;
  terminos_condiciones?: string;
  documento_adjunto?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Relaciones
  proveedor?: any;
  almacen_destino?: any;
  evento?: any;
  detalles?: OrdenCompraDetalle[];
}

export interface OrdenCompraDetalle {
  id: number;
  orden_id: number;
  producto_id: number;
  descripcion_adicional?: string;
  cantidad: number;
  cantidad_recibida: number;
  cantidad_pendiente: number;
  unidad_medida?: string;
  precio_unitario: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  subtotal: number;
  iva_porcentaje: number;
  iva_monto: number;
  ubicacion_destino_id?: number;
  notas?: string;
  completada: boolean;
  created_at: string;
  // Relaciones
  producto?: any;
}

// Recepción de compra
export interface RecepcionCompra {
  id: number;
  empresa_id: string;
  orden_id: number;
  numero_recepcion: string;
  fecha_recepcion: string;
  almacen_id: number;
  recibido_por?: string;
  verificado_por?: string;
  estado: EstadoRecepcion;
  numero_factura?: string;
  numero_remision?: string;
  documento_adjunto?: string;
  notas?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  orden_compra?: OrdenCompra;
  almacen?: any;
  detalles?: RecepcionCompraDetalle[];
}

export interface RecepcionCompraDetalle {
  id: number;
  recepcion_id: number;
  orden_detalle_id: number;
  cantidad_esperada: number;
  cantidad_recibida: number;
  cantidad_rechazada: number;
  ubicacion_id?: number;
  lote_id?: number;
  numero_lote_nuevo?: string;
  fecha_caducidad?: string;
  estado_calidad: 'aceptado' | 'rechazado' | 'cuarentena';
  motivo_rechazo?: string;
  costo_unitario_real?: number;
  notas?: string;
  created_at: string;
}

// Requisición de compra
export interface RequisicionCompra {
  id: number;
  empresa_id: string;
  numero_requisicion: string;
  solicitante_id: string;
  departamento?: string;
  fecha_requisicion: string;
  fecha_requerida?: string;
  evento_id?: number;
  proyecto_id?: number;
  estado: EstadoRequisicion;
  aprobada_por?: string;
  fecha_aprobacion?: string;
  motivo_rechazo?: string;
  prioridad: PrioridadRequisicion;
  orden_compra_id?: number;
  justificacion?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  solicitante?: any;
  evento?: any;
  orden_compra?: OrdenCompra;
  detalles?: RequisicionCompraDetalle[];
}

export interface RequisicionCompraDetalle {
  id: number;
  requisicion_id: number;
  producto_id?: number;
  descripcion_libre?: string;
  cantidad: number;
  unidad_medida?: string;
  proveedor_sugerido_id?: number;
  precio_estimado?: number;
  especificaciones?: string;
  notas?: string;
  created_at: string;
  // Relaciones
  producto?: any;
  proveedor_sugerido?: any;
}

// Para crear nuevos registros
export type OrdenCompraCreate = Omit<OrdenCompra, 'id' | 'created_at' | 'updated_at' | 'proveedor' | 'almacen_destino' | 'evento' | 'detalles'>;
export type OrdenCompraDetalleCreate = Omit<OrdenCompraDetalle, 'id' | 'created_at' | 'cantidad_pendiente' | 'subtotal' | 'producto'>;
export type RecepcionCompraCreate = Omit<RecepcionCompra, 'id' | 'created_at' | 'updated_at' | 'orden' | 'almacen' | 'detalles'>;
export type RequisicionCompraCreate = Omit<RequisicionCompra, 'id' | 'created_at' | 'updated_at' | 'solicitante' | 'evento' | 'orden_compra' | 'detalles'>;
