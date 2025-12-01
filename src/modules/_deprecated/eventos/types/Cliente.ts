// Tipos para Clientes

export interface Cliente {
  id: number;
  razon_social: string;
  nombre_comercial?: string;
  rfc?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  contacto_principal?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClienteFormData {
  razon_social: string;
  nombre_comercial?: string;
  rfc?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  contacto_principal?: string;
}

export interface ClienteListItem extends Cliente {
  eventos_count?: number;
  total_facturado?: number;
}
