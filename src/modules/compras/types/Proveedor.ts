/**
 * Types para Proveedores
 */

export interface Proveedor {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial?: string;
  rfc?: string;

  // Contacto
  email?: string;
  telefono?: string;
  sitio_web?: string;

  // Dirección
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  codigo_postal?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;

  // Información comercial
  dias_credito: number;
  limite_credito?: number;
  descuento_por_defecto: number;

  // Datos bancarios
  banco?: string;
  cuenta_bancaria?: string;
  clabe?: string;

  // Clasificación
  tipo_proveedor?: string;
  calificacion?: number;

  // Control
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactoProveedor {
  id: string;
  proveedor_id: string;
  nombre: string;
  cargo?: string;
  email?: string;
  telefono?: string;
  celular?: string;
  es_principal: boolean;
  activo: boolean;
}

export interface ProductoProveedor {
  id: string;
  proveedor_id: string;
  producto_id: string;
  codigo_proveedor?: string;
  precio_compra: number;
  descuento: number;
  tiempo_entrega_dias?: number;
  es_preferido: boolean;
}

export interface ProveedorInsert extends Omit<Proveedor, 'id' | 'created_at' | 'updated_at'> {}
export interface ProveedorUpdate extends Partial<ProveedorInsert> { id: string; }
