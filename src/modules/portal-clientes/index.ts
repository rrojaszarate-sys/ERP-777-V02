/**
 * Portal de Clientes - FASE 5.2
 * Módulo de acceso externo para clientes
 */

// Context
export { ClienteAuthProvider, useClienteAuth } from './context/ClienteAuthContext';

// Pages
export { ClienteDashboard } from './pages/ClienteDashboard';
export { ClienteLoginPage } from './pages/ClienteLoginPage';
export { ClienteFacturasPage } from './pages/ClienteFacturasPage';

// Components
export { ClienteLayout } from './components/ClienteLayout';

// Services
export { portalClienteService } from './services/portalClienteService';

// Types
export type {
  ClientePortal,
  FacturaCliente,
  EventoCliente,
  CotizacionCliente,
  PagoCliente,
  DocumentoCliente,
  NotificacionCliente,
  ResumenCliente
} from './types';
