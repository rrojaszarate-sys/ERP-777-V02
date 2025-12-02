import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './core/auth/AuthProvider';
import { Layout } from './shared/components/layout/Layout';
import { LoadingSpinner } from './shared/components/ui/LoadingSpinner';

// Lazy loading de páginas para code splitting
// MÓDULO DE EVENTOS (Usando eventos-erp como módulo principal)
const EventsDashboard = lazy(() => import('./modules/eventos-erp/pages/EventsDashboard').then(m => ({ default: m.EventsDashboard })));
const EventosListPage = lazy(() => import('./modules/eventos-erp/EventosListPageNew').then(m => ({ default: m.EventosListPage })));
const ClientesPage = lazy(() => import('./modules/eventos-erp/ClientesListPage').then(m => ({ default: m.ClientesPage })));
const CatalogosPage = lazy(() => import('./modules/eventos-erp/CatalogosPage').then(m => ({ default: m.CatalogosPage })));
const WorkflowVisualizationPage = lazy(() => import('./modules/eventos-erp/components/workflow/WorkflowVisualizationPage').then(m => ({ default: m.WorkflowVisualizationPage })));
const FinancialAnalysisPage = lazy(() => import('./modules/eventos-erp/FinancialAnalysisPage').then(m => ({ default: m.FinancialAnalysisPage })));
const ProyectosEventosPage = lazy(() => import('./modules/eventos-erp/pages/ProyectosEventosPage').then(m => ({ default: m.ProyectosEventosPage })));

// MÓDULO DE CONTABILIDAD
const ContabilidadDashboard = lazy(() => import('./modules/contabilidad-erp/pages/ContabilidadDashboard').then(m => ({ default: m.ContabilidadDashboard })));
const PolizasPage = lazy(() => import('./modules/contabilidad-erp/pages/PolizasPage').then(m => ({ default: m.PolizasPage })));
const ReportesPage = lazy(() => import('./modules/contabilidad-erp/pages/ReportesPage').then(m => ({ default: m.ReportesPage })));
const GastosNoImpactadosPage = lazy(() => import('./modules/contabilidad-erp/pages/GastosNoImpactadosPage').then(m => ({ default: m.GastosNoImpactadosPage })));

// MÓDULO DE CRM Y COTIZACIONES
const CRMDashboard = lazy(() => import('./modules/cotizaciones-erp/pages/CRMDashboard').then(m => ({ default: m.CRMDashboard })));
const ClientesPageCRM = lazy(() => import('./modules/cotizaciones-erp/pages/ClientesPage').then(m => ({ default: m.ClientesPage })));
const CotizacionesPage = lazy(() => import('./modules/cotizaciones-erp/pages/CotizacionesPage').then(m => ({ default: m.CotizacionesPage })));
const PipelinePage = lazy(() => import('./modules/cotizaciones-erp/pages/PipelinePage').then(m => ({ default: m.PipelinePage })));

// MÓDULO DE PROVEEDORES
const ProveedoresDashboard = lazy(() => import('./modules/proveedores-erp/pages/ProveedoresDashboard').then(m => ({ default: m.ProveedoresDashboard })));
const ProveedoresPage = lazy(() => import('./modules/proveedores-erp/pages/ProveedoresPage').then(m => ({ default: m.ProveedoresPage })));
const OrdenesCompraPage = lazy(() => import('./modules/proveedores-erp/pages/OrdenesCompraPage').then(m => ({ default: m.OrdenesCompraPage })));
const CatalogoProveedorPage = lazy(() => import('./modules/proveedores-erp/pages/CatalogoProveedorPage').then(m => ({ default: m.CatalogoProveedorPage })));

// MÓDULO DE INVENTARIO
const InventarioDashboard = lazy(() => import('./modules/inventario-erp/pages/InventarioDashboard').then(m => ({ default: m.InventarioDashboard })));
const ProductosPage = lazy(() => import('./modules/inventario-erp/pages/ProductosPage').then(m => ({ default: m.ProductosPage })));
const AlmacenesPage = lazy(() => import('./modules/inventario-erp/pages/AlmacenesPage').then(m => ({ default: m.AlmacenesPage })));
const MovimientosPage = lazy(() => import('./modules/inventario-erp/pages/MovimientosPage').then(m => ({ default: m.MovimientosPage })));
const StockPage = lazy(() => import('./modules/inventario-erp/pages/StockPage').then(m => ({ default: m.StockPage })));
const DocumentosInventarioPage = lazy(() => import('./modules/inventario-erp/pages/DocumentosInventarioPage').then(m => ({ default: m.DocumentosInventarioPage })));
const MobileScannerPage = lazy(() => import('./modules/inventario-erp/pages/MobileScannerPage').then(m => ({ default: m.MobileScannerPage })));
const SesionesMovilPage = lazy(() => import('./modules/inventario-erp/pages/SesionesMovilPage').then(m => ({ default: m.SesionesMovilPage })));
const EtiquetasPage = lazy(() => import('./modules/inventario-erp/pages/EtiquetasPage').then(m => ({ default: m.EtiquetasPage })));
// Nuevas páginas de inventario avanzado
const TransferenciasPage = lazy(() => import('./modules/inventario-erp/pages/TransferenciasPage').then(m => ({ default: m.default })));
const KardexPage = lazy(() => import('./modules/inventario-erp/pages/KardexPage').then(m => ({ default: m.default })));
const ValuacionInventarioPage = lazy(() => import('./modules/inventario-erp/pages/ValuacionInventarioPage').then(m => ({ default: m.default })));
const PuntoReordenPage = lazy(() => import('./modules/inventario-erp/pages/PuntoReordenPage').then(m => ({ default: m.default })));
const UbicacionesPage = lazy(() => import('./modules/inventario-erp/pages/UbicacionesPage').then(m => ({ default: m.default })));
const LotesPage = lazy(() => import('./modules/inventario-erp/pages/LotesPage').then(m => ({ default: m.default })));
const ConteosPage = lazy(() => import('./modules/inventario-erp/pages/ConteosPage').then(m => ({ default: m.default })));
const ReservasPage = lazy(() => import('./modules/inventario-erp/pages/ReservasPage').then(m => ({ default: m.default })));
const KitsEventoPage = lazy(() => import('./modules/inventario-erp/pages/KitsEventoPage').then(m => ({ default: m.default })));
const ChecklistEventoPage = lazy(() => import('./modules/inventario-erp/pages/ChecklistEventoPage').then(m => ({ default: m.default })));
const AlertasInventarioPage = lazy(() => import('./modules/inventario-erp/pages/AlertasInventarioPage').then(m => ({ default: m.default })));
const ConfiguracionInventarioPage = lazy(() => import('./modules/inventario-erp/pages/ConfiguracionInventarioPage').then(m => ({ default: m.default })));

// MÓDULO DE RRHH Y NÓMINA
const RRHHDashboard = lazy(() => import('./modules/rrhh-erp/pages/RRHHDashboard').then(m => ({ default: m.RRHHDashboard })));
const EmpleadosPage = lazy(() => import('./modules/rrhh-erp/pages/EmpleadosPage').then(m => ({ default: m.EmpleadosPage })));
const NominaPage = lazy(() => import('./modules/rrhh-erp/pages/NominaPage').then(m => ({ default: m.NominaPage })));

// MÓDULO DE FACTURACIÓN CFDI 4.0
const FacturacionDashboard = lazy(() => import('./modules/facturacion-erp/pages/FacturacionDashboard').then(m => ({ default: m.FacturacionDashboard })));
const FacturasPage = lazy(() => import('./modules/facturacion-erp/pages/FacturasPage').then(m => ({ default: m.FacturasPage })));
const ConfiguracionPage = lazy(() => import('./modules/facturacion-erp/pages/ConfiguracionPage').then(m => ({ default: m.ConfiguracionPage })));

// MÓDULO DE PROYECTOS CON GANTT
const ProyectosDashboard = lazy(() => import('./modules/proyectos-erp/pages/ProyectosDashboard').then(m => ({ default: m.ProyectosDashboard })));
const ProyectosPage = lazy(() => import('./modules/proyectos-erp/pages/ProyectosPage').then(m => ({ default: m.ProyectosPage })));
const TareasPage = lazy(() => import('./modules/proyectos-erp/pages/TareasPage').then(m => ({ default: m.TareasPage })));

// MÓDULO DE TESORERÍA
const TesoreriaDashboard = lazy(() => import('./modules/tesoreria-erp/pages/TesoreriaDashboard').then(m => ({ default: m.TesoreriaDashboard })));
const CuentasBancariasPage = lazy(() => import('./modules/tesoreria-erp/pages/CuentasBancariasPage').then(m => ({ default: m.CuentasBancariasPage })));
const MovimientosBancariosPage = lazy(() => import('./modules/tesoreria-erp/pages/MovimientosPage').then(m => ({ default: m.MovimientosPage })));

// MÓDULO DE REPORTES Y BI
const ReportesBIDashboard = lazy(() => import('./modules/reportes-erp/pages/ReportesDashboard').then(m => ({ default: m.ReportesDashboard })));

// MÓDULO DE INTEGRACIONES
const IntegracionesDashboard = lazy(() => import('./modules/integraciones-erp/pages/IntegracionesDashboard').then(m => ({ default: m.IntegracionesDashboard })));

// MÓDULO DE IA Y AUTOMATIZACIÓN
const IADashboard = lazy(() => import('./modules/ia-erp/pages/IADashboard').then(m => ({ default: m.IADashboard })));

// MÓDULO DE COMPRAS
const ComprasDashboard = lazy(() => import('./modules/compras-erp/pages/ComprasDashboard').then(m => ({ default: m.default })));
const ComprasOrdenesPage = lazy(() => import('./modules/compras-erp/pages/OrdenesCompraPage').then(m => ({ default: m.default })));
const RequisicionesPage = lazy(() => import('./modules/compras-erp/pages/RequisicionesPage').then(m => ({ default: m.default })));
const RecepcionesPage = lazy(() => import('./modules/compras-erp/pages/RecepcionesPage').then(m => ({ default: m.default })));
const TiposAlmacenPage = lazy(() => import('./modules/compras-erp/pages/TiposAlmacenPage').then(m => ({ default: m.default })));

// PORTAL DE SOLICITUDES DE COMPRA (Acceso para ejecutivos con Google OAuth)
const PortalLoginPage = lazy(() => import('./modules/portal-solicitudes/pages/PortalLoginPage').then(m => ({ default: m.PortalLoginPage })));
const PortalDashboard = lazy(() => import('./modules/portal-solicitudes/pages/PortalDashboard').then(m => ({ default: m.PortalDashboard })));
const NuevaSolicitudPage = lazy(() => import('./modules/portal-solicitudes/pages/NuevaSolicitudPage').then(m => ({ default: m.NuevaSolicitudPage })));
const DetalleSolicitudPage = lazy(() => import('./modules/portal-solicitudes/pages/DetalleSolicitudPage').then(m => ({ default: m.DetalleSolicitudPage })));
const MisSolicitudesPage = lazy(() => import('./modules/portal-solicitudes/pages/MisSolicitudesPage').then(m => ({ default: m.MisSolicitudesPage })));
const PortalAprobacionesPage = lazy(() => import('./modules/portal-solicitudes/pages/AprobacionesPage').then(m => ({ default: m.AprobacionesPage })));
const CentroMensajesPage = lazy(() => import('./modules/portal-solicitudes/pages/CentroMensajesPage').then(m => ({ default: m.CentroMensajesPage })));
const ReportesGastosPage = lazy(() => import('./modules/portal-solicitudes/pages/ReportesGastosPage').then(m => ({ default: m.ReportesGastosPage })));
const PortalLayout = lazy(() => import('./modules/portal-solicitudes/components/PortalLayout').then(m => ({ default: m.PortalLayout })));
const PortalPublicLayout = lazy(() => import('./modules/portal-solicitudes/components/PortalLayout').then(m => ({ default: m.PortalPublicLayout })));

// MÓDULO DE DESARROLLO (Documentación técnica y pruebas)
const DocumentacionPage = lazy(() => import('./modules/desarrollo/pages/DocumentacionPage').then(m => ({ default: m.DocumentacionPage })));

// MÓDULO DE ADMINISTRACIÓN (Herramientas de desarrollo)
const DataSeederPage = lazy(() => import('./modules/admin/pages/DataSeederPage').then(m => ({ default: m.DataSeederPage })));
const CatalogosAdminPage = lazy(() => import('./modules/admin/pages/CatalogosAdminPage').then(m => ({ default: m.CatalogosAdminPage })));

// Configurar React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 30, // 30 minutos
      retry: (failureCount, error) => {
        if (failureCount < 2) return true;
        return false;
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <LoadingSpinner size="lg" text="Cargando..." />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<EventsDashboard />} />

                {/* Rutas de Eventos (módulo principal) */}
                <Route path="eventos" element={<EventosListPage />} />
                <Route path="eventos/clientes" element={<ClientesPage />} />
                <Route path="eventos/analisis-financiero" element={<FinancialAnalysisPage />} />
                <Route path="eventos/workflow" element={<WorkflowVisualizationPage />} />
                <Route path="eventos/catalogos" element={<CatalogosPage />} />
                <Route path="eventos/proyectos" element={<ProyectosEventosPage />} />

                {/* Rutas de Contabilidad */}
                <Route path="contabilidad" element={<ContabilidadDashboard />} />
                <Route path="contabilidad/polizas" element={<PolizasPage />} />
                <Route path="contabilidad/reportes" element={<ReportesPage />} />
                <Route path="contabilidad/plan-cuentas" element={<ContabilidadDashboard />} />
                <Route path="contabilidad/gastos-no-impactados" element={<GastosNoImpactadosPage />} />

                {/* Rutas de CRM y Cotizaciones */}
                <Route path="crm" element={<CRMDashboard />} />
                <Route path="crm/clientes" element={<ClientesPageCRM />} />
                <Route path="crm/cotizaciones" element={<CotizacionesPage />} />
                <Route path="crm/pipeline" element={<PipelinePage />} />

                {/* Rutas de Proveedores */}
                <Route path="proveedores" element={<ProveedoresDashboard />} />
                <Route path="proveedores/catalogo" element={<ProveedoresPage />} />
                <Route path="proveedores/catalogo/:proveedorId/productos" element={<CatalogoProveedorPage />} />
                <Route path="proveedores/ordenes" element={<OrdenesCompraPage />} />

                {/* Rutas de Inventario */}
                <Route path="inventario" element={<InventarioDashboard />} />
                <Route path="inventario/productos" element={<ProductosPage />} />
                <Route path="inventario/almacenes" element={<AlmacenesPage />} />
                <Route path="inventario/movimientos" element={<MovimientosPage />} />
                <Route path="inventario/stock" element={<StockPage />} />
                <Route path="inventario/documentos" element={<DocumentosInventarioPage />} />
                <Route path="inventario/etiquetas" element={<EtiquetasPage />} />
                <Route path="inventario/sesiones" element={<SesionesMovilPage />} />
                <Route path="inventario/mobile-scanner" element={<MobileScannerPage />} />
                {/* Nuevas rutas de inventario avanzado */}
                <Route path="inventario/transferencias" element={<TransferenciasPage />} />
                <Route path="inventario/kardex" element={<KardexPage />} />
                <Route path="inventario/valuacion" element={<ValuacionInventarioPage />} />
                <Route path="inventario/reorden" element={<PuntoReordenPage />} />
                <Route path="inventario/ubicaciones" element={<UbicacionesPage />} />
                <Route path="inventario/lotes" element={<LotesPage />} />
                <Route path="inventario/conteos" element={<ConteosPage />} />
                <Route path="inventario/reservas" element={<ReservasPage />} />
                <Route path="inventario/kits" element={<KitsEventoPage />} />
                <Route path="inventario/checklists" element={<ChecklistEventoPage />} />
                <Route path="inventario/alertas" element={<AlertasInventarioPage />} />
                <Route path="inventario/configuracion" element={<ConfiguracionInventarioPage />} />

                {/* Rutas de RRHH y Nómina */}
                <Route path="rrhh" element={<RRHHDashboard />} />
                <Route path="rrhh/empleados" element={<EmpleadosPage />} />
                <Route path="rrhh/nomina" element={<NominaPage />} />

                {/* Rutas de Facturación CFDI 4.0 */}
                <Route path="facturacion" element={<FacturacionDashboard />} />
                <Route path="facturacion/facturas" element={<FacturasPage />} />
                <Route path="facturacion/configuracion" element={<ConfiguracionPage />} />

                {/* Rutas de Proyectos con Gantt */}
                <Route path="proyectos" element={<ProyectosDashboard />} />
                <Route path="proyectos/lista" element={<ProyectosPage />} />
                <Route path="proyectos/tareas" element={<TareasPage />} />

                {/* Rutas de Tesorería */}
                <Route path="tesoreria" element={<TesoreriaDashboard />} />
                <Route path="tesoreria/cuentas" element={<CuentasBancariasPage />} />
                <Route path="tesoreria/movimientos" element={<MovimientosBancariosPage />} />

                {/* Rutas de Reportes y BI */}
                <Route path="reportes" element={<ReportesBIDashboard />} />

                {/* Rutas de Integraciones */}
                <Route path="integraciones" element={<IntegracionesDashboard />} />

                {/* Rutas de IA y Automatización */}
                <Route path="ia" element={<IADashboard />} />

                {/* Rutas de Compras */}
                <Route path="compras" element={<ComprasDashboard />} />
                <Route path="compras/ordenes" element={<ComprasOrdenesPage />} />
                <Route path="compras/requisiciones" element={<RequisicionesPage />} />
                <Route path="compras/recepciones" element={<RecepcionesPage />} />
                <Route path="compras/tipos-almacen" element={<TiposAlmacenPage />} />

                {/* Rutas de Eventos-ERP (módulo independiente - desarrollo) */}
                <Route path="eventos-erp" element={<EventosListPage />} />
                <Route path="eventos-erp/clientes" element={<ClientesPage />} />
                <Route path="eventos-erp/proyectos" element={<ProyectosEventosPage />} />
                <Route path="eventos-erp/analisis-financiero" element={<FinancialAnalysisPage />} />
                <Route path="eventos-erp/workflow" element={<WorkflowVisualizationPage />} />
                <Route path="eventos-erp/catalogos" element={<CatalogosPage />} />

                {/* Rutas de Desarrollo (Documentación técnica y pruebas) */}
                <Route path="desarrollo" element={<DocumentacionPage />} />
                <Route path="admin/data-seeder" element={<DataSeederPage />} />
                <Route path="admin/catalogos" element={<CatalogosAdminPage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>

              {/* PORTAL DE SOLICITUDES DE COMPRA - Rutas públicas (fuera del Layout principal) */}
              <Route path="/portal" element={<PortalPublicLayout />}>
                <Route path="login" element={<PortalLoginPage />} />
              </Route>

              {/* PORTAL DE SOLICITUDES DE COMPRA - Rutas protegidas */}
              <Route path="/portal" element={<PortalLayout />}>
                <Route index element={<PortalDashboard />} />
                <Route path="solicitudes" element={<MisSolicitudesPage />} />
                <Route path="solicitudes/:id" element={<DetalleSolicitudPage />} />
                <Route path="nueva" element={<NuevaSolicitudPage />} />
                <Route path="aprobaciones" element={<PortalAprobacionesPage />} />
                <Route path="mensajes" element={<CentroMensajesPage />} />
                <Route path="reportes" element={<ReportesGastosPage />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;