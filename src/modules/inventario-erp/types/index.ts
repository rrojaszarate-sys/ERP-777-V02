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
