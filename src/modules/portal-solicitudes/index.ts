/**
 * Portal de Solicitudes de Compra
 * Módulo para que ejecutivos realicen solicitudes de compra
 * con autenticación via Google OAuth corporativo
 * 
 * NOTA: RLS desactivado durante desarrollo
 * Activar antes de producción
 */

// Types
export * from './types';

// Context
export { PortalAuthProvider, usePortalAuth } from './context/PortalAuthContext';

// Services
export { solicitudesService } from './services/solicitudesService';
export { mensajesService } from './services/mensajesService';
export { reportesService } from './services/reportesService';

// Components
export { PortalLayout, PortalPublicLayout } from './components/PortalLayout';
export { PortalHeader } from './components/PortalHeader';

// Pages
export { PortalLoginPage } from './pages/PortalLoginPage';
export { PortalDashboard } from './pages/PortalDashboard';
export { NuevaSolicitudPage } from './pages/NuevaSolicitudPage';
export { DetalleSolicitudPage } from './pages/DetalleSolicitudPage';
export { MisSolicitudesPage } from './pages/MisSolicitudesPage';
export { AprobacionesPage } from './pages/AprobacionesPage';
export { CentroMensajesPage } from './pages/CentroMensajesPage';
export { ReportesGastosPage } from './pages/ReportesGastosPage';
