/**
 * Tipos y interfaces para Movimientos de Inventario
 */

import type { Producto } from './Producto';
import type { Almacen, Ubicacion } from './Almacen';

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'TRASPASO' | 'AJUSTE';
export type EstatusMovimiento = 'BORRADOR' | 'PROCESADO' | 'CANCELADO';
export type TipoReferencia = 'COMPRA' | 'VENTA' | 'AJUSTE' | 'TRASPASO' | 'PRODUCCION' | 'DEVOLUCION' | 'MANUAL';

export interface Movimiento {
  id: string;
  folio: string;
  tipo_movimiento: TipoMovimiento;
  fecha: string; // Date in ISO format

  // Almacenes
  almacen_origen_id?: string;
  almacen_destino_id?: string;

  // Referencias
  referencia?: string;
  tipo_referencia?: TipoReferencia;
  documento_id?: string;

  // Información
  concepto: string;
  observaciones?: string;

  // Control
  estatus: EstatusMovimiento;
  procesado_at?: string;
  cancelado_at?: string;
  motivo_cancelacion?: string;

  // Usuario
  usuario_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  almacen_origen?: Almacen;
  almacen_destino?: Almacen;
  usuario?: {
    id: string;
    nombre: string;
  };
}

export interface MovimientoDetalle {
  id: string;
  movimiento_id: string;
  producto_id: string;

  // Ubicaciones
  ubicacion_origen_id?: string;
  ubicacion_destino_id?: string;

  // Cantidad
  cantidad: number;

  // Costo
  costo_unitario: number;
  costo_total: number;

  // Lote y Serie
  lote?: string;
  serie?: string;
  fecha_caducidad?: string;

  // Observaciones
  observaciones?: string;

  created_at: string;

  // Relaciones
  producto?: Producto;
  ubicacion_origen?: Ubicacion;
  ubicacion_destino?: Ubicacion;
}

export interface MovimientoCompleto extends Movimiento {
  detalles: MovimientoDetalle[];
  total_productos: number;
  total_cantidad: number;
  costo_total: number;
}

// ===================================
// DTOs para formularios
// ===================================

export interface MovimientoInsert {
  tipo_movimiento: TipoMovimiento;
  fecha: string;
  almacen_origen_id?: string;
  almacen_destino_id?: string;
  referencia?: string;
  tipo_referencia?: TipoReferencia;
  documento_id?: string;
  concepto: string;
  observaciones?: string;
}

export interface MovimientoDetalleInsert {
  producto_id: string;
  ubicacion_origen_id?: string;
  ubicacion_destino_id?: string;
  cantidad: number;
  costo_unitario: number;
  lote?: string;
  serie?: string;
  fecha_caducidad?: string;
  observaciones?: string;
}

export interface MovimientoCompletoInsert extends MovimientoInsert {
  detalles: MovimientoDetalleInsert[];
}

export interface MovimientoUpdate extends Partial<MovimientoInsert> {
  id: string;
}

// ===================================
// Formularios específicos por tipo
// ===================================

export interface EntradaFormData {
  fecha: string;
  almacen_destino_id: string;
  referencia?: string;
  tipo_referencia: TipoReferencia;
  concepto: string;
  observaciones?: string;
  productos: Array<{
    producto_id: string;
    producto?: Producto;
    cantidad: number;
    costo_unitario: number;
    lote?: string;
    fecha_caducidad?: string;
    ubicacion_destino_id?: string;
  }>;
}

export interface SalidaFormData {
  fecha: string;
  almacen_origen_id: string;
  referencia?: string;
  tipo_referencia: TipoReferencia;
  concepto: string;
  observaciones?: string;
  productos: Array<{
    producto_id: string;
    producto?: Producto;
    cantidad: number;
    costo_unitario: number;
    lote?: string;
    serie?: string;
    ubicacion_origen_id?: string;
  }>;
}

export interface TraspasoFormData {
  fecha: string;
  almacen_origen_id: string;
  almacen_destino_id: string;
  referencia?: string;
  concepto: string;
  observaciones?: string;
  productos: Array<{
    producto_id: string;
    producto?: Producto;
    cantidad: number;
    lote?: string;
    ubicacion_origen_id?: string;
    ubicacion_destino_id?: string;
  }>;
}

export interface AjusteFormData {
  fecha: string;
  almacen_id: string;
  concepto: string;
  observaciones?: string;
  productos: Array<{
    producto_id: string;
    producto?: Producto;
    cantidad_sistema: number;
    cantidad_fisica: number;
    diferencia: number;
    costo_unitario: number;
    ubicacion_id?: string;
  }>;
}

// ===================================
// Filtros
// ===================================

export interface MovimientoFiltros {
  search?: string; // Buscar en folio, concepto, referencia
  tipo_movimiento?: TipoMovimiento;
  estatus?: EstatusMovimiento;
  fecha_inicio?: string;
  fecha_fin?: string;
  almacen_origen_id?: string;
  almacen_destino_id?: string;
  producto_id?: string;
  tipo_referencia?: TipoReferencia;
  usuario_id?: string;
}

// ===================================
// Existencias
// ===================================

export interface Existencia {
  id: string;
  producto_id: string;
  almacen_id: string;
  ubicacion_id?: string;

  cantidad: number;
  cantidad_reservada: number;
  cantidad_disponible: number;

  costo_promedio: number;
  costo_total: number;

  ultima_entrada?: string;
  ultima_salida?: string;
  updated_at: string;

  // Relaciones
  producto?: Producto;
  almacen?: Almacen;
  ubicacion?: Ubicacion;
}

export interface ExistenciasPorAlmacen {
  almacen_id: string;
  almacen_nombre: string;
  existencias: Existencia[];
  total_productos: number;
  valor_total: number;
}

export interface ExistenciasPorProducto {
  producto_id: string;
  producto: Producto;
  existencias_por_almacen: Array<{
    almacen_id: string;
    almacen_nombre: string;
    cantidad: number;
    cantidad_disponible: number;
    cantidad_reservada: number;
    costo_promedio: number;
  }>;
  total_existencia: number;
  total_disponible: number;
  total_reservado: number;
}

// ===================================
// Lotes y Series
// ===================================

export interface Lote {
  id: string;
  producto_id: string;
  almacen_id: string;
  lote: string;
  fecha_fabricacion?: string;
  fecha_caducidad?: string;
  cantidad_original: number;
  cantidad_actual: number;
  activo: boolean;
  created_at: string;

  // Relaciones
  producto?: Producto;
  almacen?: Almacen;
}

export interface Serie {
  id: string;
  producto_id: string;
  almacen_id: string;
  serie: string;
  estatus: 'DISPONIBLE' | 'VENDIDO' | 'EN_REPARACION' | 'DADO_DE_BAJA';
  fecha_entrada?: string;
  fecha_salida?: string;
  documento_entrada_id?: string;
  documento_salida_id?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;

  // Relaciones
  producto?: Producto;
  almacen?: Almacen;
}

// ===================================
// Conteo físico
// ===================================

export interface Conteo {
  id: string;
  folio: string;
  almacen_id: string;
  fecha_inicio: string;
  fecha_fin?: string;
  tipo_conteo: 'TOTAL' | 'PARCIAL' | 'CICLICO';
  estatus: 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';
  responsable_id?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  almacen?: Almacen;
  responsable?: {
    id: string;
    nombre: string;
  };
}

export interface ConteoDetalle {
  id: string;
  conteo_id: string;
  producto_id: string;
  ubicacion_id?: string;
  cantidad_sistema: number;
  cantidad_contada?: number;
  diferencia: number;
  lote?: string;
  observaciones?: string;
  contado_por?: string;
  fecha_conteo?: string;
  created_at: string;

  // Relaciones
  producto?: Producto;
  ubicacion?: Ubicacion;
}

export interface ConteoCompleto extends Conteo {
  detalles: ConteoDetalle[];
  total_productos: number;
  productos_contados: number;
  productos_pendientes: number;
  total_diferencias: number;
}

// ===================================
// Reportes
// ===================================

export interface ReporteMovimientos {
  periodo: {
    fecha_inicio: string;
    fecha_fin: string;
  };
  por_tipo: Array<{
    tipo: TipoMovimiento;
    cantidad_movimientos: number;
    total_productos: number;
    valor_total: number;
  }>;
  por_almacen: Array<{
    almacen_id: string;
    almacen_nombre: string;
    entradas: number;
    salidas: number;
    traspasos: number;
    ajustes: number;
  }>;
  top_productos: Array<{
    producto_id: string;
    producto_nombre: string;
    total_movimientos: number;
    cantidad_total: number;
  }>;
}

export interface ReporteExistencias {
  fecha_reporte: string;
  por_almacen: Array<{
    almacen_id: string;
    almacen_nombre: string;
    total_productos: number;
    valor_inventario: number;
    productos_bajo_minimo: number;
  }>;
  productos_sin_existencias: Producto[];
  productos_bajo_minimo: Array<{
    producto: Producto;
    existencia_actual: number;
    existencia_minima: number;
    faltante: number;
  }>;
  productos_sobre_maximo: Array<{
    producto: Producto;
    existencia_actual: number;
    existencia_maxima: number;
    excedente: number;
  }>;
  valor_total_inventario: number;
}

export interface ReporteValuacion {
  fecha_reporte: string;
  metodo_valuacion: 'PEPS' | 'UEPS' | 'PROMEDIO';
  por_categoria: Array<{
    categoria_id: string;
    categoria_nombre: string;
    total_productos: number;
    cantidad_total: number;
    valor_total: number;
    porcentaje_valor: number;
  }>;
  por_almacen: Array<{
    almacen_id: string;
    almacen_nombre: string;
    valor_inventario: number;
    porcentaje_valor: number;
  }>;
  productos_mayor_valor: Array<{
    producto: Producto;
    cantidad: number;
    costo_promedio: number;
    valor_total: number;
  }>;
  valor_total: number;
}
