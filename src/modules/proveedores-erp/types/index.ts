export interface Proveedor {
  id: number;
  tipo: 'proveedor' | 'prospecto' | 'inactivo';
  razon_social: string;
  nombre_comercial: string | null;
  rfc: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  categoria: string | null;
  dias_credito: number;
  limite_credito: number;
  calificacion_calidad: number | null;
  calificacion_servicio: number | null;
  activo: boolean;
  company_id: string;
  created_at: string;
}

export interface OrdenCompra {
  id: number;
  folio: string;
  proveedor_id: number;
  fecha: string;
  fecha_entrega_estimada: string | null;
  status: 'borrador' | 'enviada' | 'confirmada' | 'recibida_parcial' | 'recibida_completa' | 'cancelada';
  subtotal: number;
  impuestos: number;
  total: number;
  company_id: string;
  created_at: string;
}

export interface PartidaOC {
  id: number;
  orden_compra_id: number;
  producto_id: number | null;
  descripcion: string;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  precio_unitario: number;
  total: number;
}

// Relación Proveedor-Producto
export interface ProveedorProducto {
  id: number;
  proveedor_id: number;
  producto_id: number;
  codigo_proveedor: string | null; // SKU del proveedor
  precio_proveedor: number;
  tiempo_entrega_dias: number;
  cantidad_minima: number;
  es_preferido: boolean;
  fecha_vigencia_inicio: string | null;
  fecha_vigencia_fin: string | null;
  notas: string | null;
  activo: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
  // Relaciones expandidas
  proveedor?: Proveedor;
  producto?: {
    id: number;
    codigo: string;
    nombre: string;
    categoria: string;
    unidad_medida: string;
  };
}
