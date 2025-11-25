/**
 * Tipos y interfaces para Productos
 */

export interface UnidadMedida {
  id: string;
  codigo: string;
  nombre: string;
  abreviatura: string;
  tipo: 'LONGITUD' | 'PESO' | 'VOLUMEN' | 'UNIDAD' | 'TIEMPO';
  activo: boolean;
  created_at: string;
}

export interface CategoriaProducto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria_padre_id?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Relaciones
  categoria_padre?: CategoriaProducto;
  subcategorias?: CategoriaProducto[];
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  codigo_barras?: string;
  codigo_sat?: string;
  categoria_id?: string;
  unidad_medida_id?: string;

  // Precios y costos
  precio_venta: number;
  precio_venta_min?: number;
  costo_actual: number;
  margen_utilidad?: number;

  // Control de inventario
  existencia_minima: number;
  existencia_maxima?: number;
  punto_reorden?: number;

  // Tipo de producto
  es_servicio: boolean;
  es_compra: boolean;
  es_venta: boolean;

  // Control de lotes y series
  maneja_lote: boolean;
  maneja_serie: boolean;

  // Impuestos
  aplica_iva: boolean;
  tasa_iva: number;
  aplica_ieps: boolean;
  tasa_ieps: number;

  // Información adicional
  imagen_url?: string;
  peso?: number;
  volumen?: number;
  observaciones?: string;

  // Control
  activo: boolean;
  deleted_at?: string;
  deleted_by?: string;
  delete_reason?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Relaciones
  categoria?: CategoriaProducto;
  unidad_medida?: UnidadMedida;
}

export interface ProductoCompleto extends Producto {
  // Existencias totales en todos los almacenes
  existencia_total?: number;
  existencia_disponible?: number;
  existencia_reservada?: number;

  // Valor del inventario
  valor_inventario?: number;

  // Estadísticas
  ultima_compra?: string;
  ultima_venta?: string;
  rotacion?: number; // Rotación del producto
}

export interface ProductoConExistencia extends Producto {
  existencia: number;
  existencia_disponible: number;
  existencia_reservada: number;
  costo_promedio: number;
  almacen_id: string;
  almacen_nombre?: string;
}

// ===================================
// DTOs para formularios
// ===================================

export interface ProductoInsert {
  codigo: string;
  nombre: string;
  descripcion?: string;
  codigo_barras?: string;
  codigo_sat?: string;
  categoria_id?: string;
  unidad_medida_id?: string;

  precio_venta?: number;
  precio_venta_min?: number;
  costo_actual?: number;
  margen_utilidad?: number;

  existencia_minima?: number;
  existencia_maxima?: number;
  punto_reorden?: number;

  es_servicio?: boolean;
  es_compra?: boolean;
  es_venta?: boolean;

  maneja_lote?: boolean;
  maneja_serie?: boolean;

  aplica_iva?: boolean;
  tasa_iva?: number;
  aplica_ieps?: boolean;
  tasa_ieps?: number;

  imagen_url?: string;
  peso?: number;
  volumen?: number;
  observaciones?: string;

  activo?: boolean;
}

export interface ProductoUpdate extends Partial<ProductoInsert> {
  id: string;
}

export interface ProductoFormData extends ProductoInsert {
  // Datos adicionales para el formulario
  calcular_precio_venta_desde_costo?: boolean;
}

// ===================================
// Filtros y búsqueda
// ===================================

export interface ProductoFiltros {
  search?: string;
  categoria_id?: string;
  es_servicio?: boolean;
  es_compra?: boolean;
  es_venta?: boolean;
  activo?: boolean;
  con_existencias?: boolean;
  sin_existencias?: boolean;
  bajo_minimo?: boolean;
  almacen_id?: string;
}

export interface ProductoPaginacion {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductosResponse {
  data: Producto[];
  pagination: ProductoPaginacion;
}

// ===================================
// Estadísticas
// ===================================

export interface ProductoEstadisticas {
  total_productos: number;
  productos_activos: number;
  productos_inactivos: number;
  productos_sin_existencias: number;
  productos_bajo_minimo: number;
  valor_total_inventario: number;
  productos_servicios: number;
  productos_fisicos: number;
}

// ===================================
// Validaciones
// ===================================

export interface ProductoValidacion {
  codigo_existe: boolean;
  codigo_barras_existe?: boolean;
  errores: string[];
  advertencias: string[];
}
