/**
 * Barrel export de hooks de inventario
 */

export {
  useProductos,
  useProducto,
  useCategorias,
  useUnidadesMedida
} from './useProductos';

export {
  useAlmacenes,
  useAlmacen,
  useAlmacenPrincipal,
  useUbicaciones
} from './useAlmacenes';

export {
  useMovimientos,
  useMovimiento
} from './useMovimientos';

export {
  useExistencias,
  useExistenciasPorAlmacen,
  useExistenciasPorProducto,
  useExistencia,
  useReservaExistencias,
  useLotes,
  useLotesProximosVencer,
  useSeries,
  useSeriesDisponibles
} from './useExistencias';
