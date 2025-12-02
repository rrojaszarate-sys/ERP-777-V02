/**
 * Módulo de Compras ERP
 * Exportaciones centralizadas
 */

// Types
export * from './types';

// Services
export { 
  fetchTiposAlmacen,
  createTipoAlmacen,
  updateTipoAlmacen,
  deleteTipoAlmacen,
  getConfigAlmacen,
} from './services/tiposAlmacenService';

export {
  fetchOrdenesCompra,
  fetchOrdenCompra,
  createOrdenCompra,
  updateOrdenCompra,
  aprobarOrdenCompra,
  enviarOrdenCompra,
  completarOrdenCompra,
  cancelarOrdenCompra,
  deleteOrdenCompra,
} from './services/ordenesCompraService';

export {
  fetchRecepciones,
  fetchRecepcion,
  createRecepcion,
  verificarRecepcion,
  registrarDiferencias,
  finalizarRecepcion,
} from './services/recepcionesService';

export {
  fetchRequisiciones,
  fetchRequisicion,
  createRequisicion,
  aprobarRequisicion,
  rechazarRequisicion,
  convertirAOrdenCompra,
  generarRequisicionAutomatica,
  deleteRequisicion,
} from './services/requisicionesService';

// Pages
export { default as ComprasDashboard } from './pages/ComprasDashboard';
export { default as OrdenesCompraPage } from './pages/OrdenesCompraPage';
export { default as RequisicionesPage } from './pages/RequisicionesPage';
export { default as RecepcionesPage } from './pages/RecepcionesPage';
export { default as TiposAlmacenPage } from './pages/TiposAlmacenPage';
