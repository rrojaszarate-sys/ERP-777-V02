/**
 * Barrel export de todos los tipos de Inventario
 */

// Productos
export type {
  UnidadMedida,
  CategoriaProducto,
  Producto,
  ProductoCompleto,
  ProductoConExistencia,
  ProductoInsert,
  ProductoUpdate,
  ProductoFormData,
  ProductoFiltros,
  ProductoPaginacion,
  ProductosResponse,
  ProductoEstadisticas,
  ProductoValidacion
} from './Producto';

// Almacenes
export type {
  TipoAlmacen,
  Almacen,
  AlmacenCompleto,
  Ubicacion,
  UbicacionConOcupacion,
  AlmacenInsert,
  AlmacenUpdate,
  UbicacionInsert,
  UbicacionUpdate,
  AlmacenFiltros,
  UbicacionFiltros,
  AlmacenEstadisticas
} from './Almacen';

// Movimientos
export type {
  TipoMovimiento,
  EstatusMovimiento,
  TipoReferencia,
  Movimiento,
  MovimientoDetalle,
  MovimientoCompleto,
  MovimientoInsert,
  MovimientoDetalleInsert,
  MovimientoCompletoInsert,
  MovimientoUpdate,
  EntradaFormData,
  SalidaFormData,
  TraspasoFormData,
  AjusteFormData,
  MovimientoFiltros,
  Existencia,
  ExistenciasPorAlmacen,
  ExistenciasPorProducto,
  Lote,
  Serie,
  Conteo,
  ConteoDetalle,
  ConteoCompleto,
  ReporteMovimientos,
  ReporteExistencias,
  ReporteValuacion
} from './Movimiento';
