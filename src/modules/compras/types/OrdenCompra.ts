/**
 * Types para Órdenes de Compra
 */

import type { Proveedor } from './Proveedor';
import type { Producto } from '@/modules/inventario/types';

export type EstatusOrdenCompra = 'BORRADOR' | 'ENVIADA' | 'CONFIRMADA' | 'PARCIAL' | 'COMPLETA' | 'CANCELADA';

export interface OrdenCompra {
  id: string;
  folio: string;
  fecha: string;
  fecha_entrega_esperada?: string;

  proveedor_id: string;
  almacen_destino_id?: string;
  direccion_entrega?: string;
  requisicion_id?: string;

  moneda: string;
  tipo_cambio: number;
  condiciones_pago?: string;
  forma_pago?: string;
  dias_credito: number;

  subtotal: number;
  descuento: number;
  iva: number;
  ieps: number;
  otros_impuestos: number;
  total: number;

  observaciones?: string;
  terminos_condiciones?: string;

  estatus: EstatusOrdenCompra;
  enviada_a_proveedor_at?: string;
  confirmada_por_proveedor_at?: string;

  created_at: string;
  updated_at: string;

  // Relaciones
  proveedor?: Proveedor;
}

export interface OrdenCompraDetalle {
  id: string;
  orden_compra_id: string;
  producto_id: string;

  descripcion: string;
  cantidad: number;
  cantidad_recibida: number;
  cantidad_pendiente: number;

  precio_unitario: number;
  descuento_porcentaje: number;
  descuento_importe: number;
  subtotal: number;

  iva_porcentaje: number;
  iva_importe: number;
  ieps_porcentaje: number;
  ieps_importe: number;

  total: number;

  observaciones?: string;
  producto?: Producto;
}

export interface OrdenCompraCompleta extends OrdenCompra {
  detalles: OrdenCompraDetalle[];
}

export interface OrdenCompraInsert {
  fecha: string;
  fecha_entrega_esperada?: string;
  proveedor_id: string;
  almacen_destino_id?: string;
  requisicion_id?: string;
  observaciones?: string;
  detalles: Array<{
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
    descuento_porcentaje?: number;
  }>;
}
