/**
 * Tipos y interfaces para Almacenes
 */

export type TipoAlmacen = 'PRINCIPAL' | 'SUCURSAL' | 'TRANSITO' | 'VIRTUAL';

export interface Almacen {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;

  // Ubicación
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;

  // Responsable
  responsable_id?: string;

  // Tipo
  tipo: TipoAlmacen;
  es_principal: boolean;

  // Control
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Relaciones
  responsable?: {
    id: string;
    nombre: string;
    email: string;
  };
}

export interface AlmacenCompleto extends Almacen {
  total_productos?: number;
  valor_inventario?: number;
  ubicaciones?: Ubicacion[];
}

export interface Ubicacion {
  id: string;
  almacen_id: string;
  codigo: string;
  nombre: string;

  // Jerarquía
  pasillo?: string;
  rack?: string;
  nivel?: string;

  // Capacidad
  capacidad_maxima?: number;
  unidad_capacidad?: string;

  activo: boolean;
  created_at: string;

  // Relaciones
  almacen?: Almacen;
}

export interface UbicacionConOcupacion extends Ubicacion {
  ocupacion_actual?: number;
  porcentaje_ocupacion?: number;
  productos_almacenados?: number;
}

// ===================================
// DTOs para formularios
// ===================================

export interface AlmacenInsert {
  codigo: string;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  responsable_id?: string;
  tipo: TipoAlmacen;
  es_principal?: boolean;
  activo?: boolean;
}

export interface AlmacenUpdate extends Partial<AlmacenInsert> {
  id: string;
}

export interface UbicacionInsert {
  almacen_id: string;
  codigo: string;
  nombre: string;
  pasillo?: string;
  rack?: string;
  nivel?: string;
  capacidad_maxima?: number;
  unidad_capacidad?: string;
  activo?: boolean;
}

export interface UbicacionUpdate extends Partial<UbicacionInsert> {
  id: string;
}

// ===================================
// Filtros
// ===================================

export interface AlmacenFiltros {
  search?: string;
  tipo?: TipoAlmacen;
  activo?: boolean;
  responsable_id?: string;
}

export interface UbicacionFiltros {
  almacen_id?: string;
  search?: string;
  activo?: boolean;
}

// ===================================
// Estadísticas
// ===================================

export interface AlmacenEstadisticas {
  total_almacenes: number;
  almacenes_activos: number;
  total_productos_almacenados: number;
  valor_total: number;
  almacen_principal?: string;
}
