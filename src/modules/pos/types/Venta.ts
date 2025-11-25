/**
 * Types para POS (Punto de Venta)
 */

export type TipoPago = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA' | 'CHEQUE' | 'MIXTO';
export type EstatusVenta = 'ABIERTA' | 'COMPLETADA' | 'CANCELADA' | 'DEVUELTA';
export type TipoVenta = 'MOSTRADOR' | 'DOMICILIO' | 'TELEFONO' | 'WEB';

export interface CajaPOS {
  id: string;
  codigo: string;
  nombre: string;
  sucursal?: string;
  terminal?: string;
  activa: boolean;

  // Apertura
  fecha_apertura?: string;
  hora_apertura?: string;
  monto_inicial?: number;
  abierta_por?: string;

  // Cierre
  fecha_cierre?: string;
  hora_cierre?: string;
  monto_final?: number;
  monto_esperado?: number;
  diferencia?: number;
  cerrada_por?: string;

  created_at: string;
  updated_at: string;
}

export interface TurnoCaja {
  id: string;
  caja_id: string;
  cajero_id: string;

  // Apertura
  fecha_apertura: string;
  hora_apertura: string;
  monto_inicial: number;

  // Cierre
  fecha_cierre?: string;
  hora_cierre?: string;
  monto_final?: number;
  monto_esperado?: number;
  diferencia?: number;

  // Totales
  total_ventas: number;
  total_devoluciones: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  num_ventas: number;

  // Control
  abierto: boolean;
  observaciones?: string;

  created_at: string;
  updated_at: string;

  // Relaciones
  caja?: CajaPOS;
}

export interface VentaPOS {
  id: string;
  folio: string;
  turno_caja_id: string;
  cajero_id?: string;
  cliente_id?: string;
  cliente_nombre?: string;

  // Tipo de venta
  tipo_venta: TipoVenta;

  // Fechas
  fecha: string;
  hora: string;

  // Totales
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;

  // Pago
  tipo_pago: TipoPago;
  monto_pagado: number;
  cambio: number;

  // Facturación
  requiere_factura: boolean;
  facturado: boolean;
  evento_id?: string;

  // Control
  estatus: EstatusVenta;
  cancelada_por?: string;
  fecha_cancelacion?: string;
  motivo_cancelacion?: string;

  // Observaciones
  observaciones?: string;

  created_at: string;
  updated_at: string;

  // Relaciones
  detalles?: VentaPOSDetalle[];
  turno?: TurnoCaja;
}

export interface VentaPOSDetalle {
  id: string;
  venta_id: string;
  producto_id: string;
  codigo_producto: string;
  nombre_producto: string;

  // Cantidades
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  iva: number;
  total: number;

  // Inventario
  almacen_id?: string;
  lote_id?: string;
  serie?: string;

  created_at: string;
}

export interface DevolucionPOS {
  id: string;
  folio: string;
  venta_id: string;
  turno_caja_id: string;

  fecha: string;
  hora: string;

  total_devolucion: number;
  motivo: string;

  autorizada_por?: string;
  observaciones?: string;

  created_at: string;

  // Relaciones
  venta?: VentaPOS;
  detalles?: DevolucionPOSDetalle[];
}

export interface DevolucionPOSDetalle {
  id: string;
  devolucion_id: string;
  venta_detalle_id: string;
  producto_id: string;

  cantidad_devuelta: number;
  precio_unitario: number;
  total: number;

  created_at: string;
}

// Insert types
export interface TurnoCajaInsert {
  caja_id: string;
  cajero_id: string;
  monto_inicial: number;
}

export interface VentaPOSInsert {
  turno_caja_id: string;
  cliente_id?: string;
  cliente_nombre?: string;
  tipo_venta: TipoVenta;
  tipo_pago: TipoPago;
  monto_pagado: number;
  requiere_factura?: boolean;
  observaciones?: string;
  detalles: Array<{
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
    descuento?: number;
    almacen_id?: string;
  }>;
}

export interface DevolucionPOSInsert {
  venta_id: string;
  turno_caja_id: string;
  motivo: string;
  detalles: Array<{
    venta_detalle_id: string;
    cantidad_devuelta: number;
  }>;
}
