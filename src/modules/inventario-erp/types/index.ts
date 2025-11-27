export interface Almacen {
  id: number;
  nombre: string;
  codigo: string;
  direccion: string | null;
  tipo: 'principal' | 'sucursal' | 'consignacion' | 'transito';
  activo: boolean;
  company_id: string;
}

export interface MovimientoInventario {
  id: number;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
  producto_id: number;
  almacen_id: number;
  cantidad: number;
  costo_unitario: number | null;
  referencia: string | null;
  created_at: string;
}

// ============================================================================
// DOCUMENTOS DE INVENTARIO (ENTRADAS/SALIDAS CON FIRMAS)
// ============================================================================

export type TipoDocumentoInventario = 'entrada' | 'salida';
export type EstadoDocumentoInventario = 'borrador' | 'confirmado' | 'cancelado';

export interface DocumentoInventario {
  id: number;
  numero_documento: string;
  tipo: TipoDocumentoInventario;
  fecha: string;
  almacen_id: number;
  evento_id: number | null;
  nombre_entrega: string | null;
  firma_entrega: string | null;
  nombre_recibe: string | null;
  firma_recibe: string | null;
  observaciones: string | null;
  estado: EstadoDocumentoInventario;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relaciones expandidas
  almacen?: Almacen;
  evento?: { id: number; nombre: string };
  detalles?: DetalleDocumentoInventario[];
}

export interface DetalleDocumentoInventario {
  id: number;
  documento_id: number;
  producto_id: number;
  cantidad: number;
  observaciones: string | null;
  created_at: string;
  // Relación expandida
  producto?: Producto;
}

export interface Producto {
  id: number;
  nombre: string;
  codigo: string | null;
  sku: string | null;
  codigo_qr: string | null;
  descripcion: string | null;
  categoria_id: number | null;
  unidad_medida: string;
  precio_compra: number | null;
  precio_venta: number | null;
  stock_minimo: number;
  activo: boolean;
  company_id: string;
  created_at: string;
  // Relación expandida
  categoria?: { id: number; nombre: string };
}

// Para formularios de creación/edición
export interface DocumentoInventarioFormData {
  tipo: TipoDocumentoInventario;
  fecha: string;
  almacen_id: number | null;
  evento_id: number | null;
  nombre_entrega: string;
  firma_entrega: string | null;
  nombre_recibe: string;
  firma_recibe: string | null;
  observaciones: string;
  detalles: DetalleFormData[];
}

export interface DetalleFormData {
  producto_id: number;
  producto?: Producto;
  cantidad: number;
  observaciones: string;
}

// Para la vista consolidada
export interface DocumentoInventarioResumen {
  id: number;
  numero_documento: string;
  tipo: TipoDocumentoInventario;
  fecha: string;
  almacen_id: number;
  almacen_nombre: string;
  evento_id: number | null;
  evento_nombre: string | null;
  nombre_entrega: string | null;
  nombre_recibe: string | null;
  estado: EstadoDocumentoInventario;
  observaciones: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  total_lineas: number;
  total_productos: number;
}

// Para generación de etiquetas QR
export interface ProductoQRLabel {
  codigo: string;
  nombre: string;
  categoria: string;
}
