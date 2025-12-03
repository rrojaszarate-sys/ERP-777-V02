/**
 * Módulo de Administración de Empresas - FASE 6
 * Sistema multi-tenant con gestión de empresas, usuarios, módulos y branding
 */

// Types
export * from './types';

// Services
export {
  empresaService,
  modulosService,
  rolesService,
  usuariosService,
  invitacionesService,
  archivosService,
  configuracionService
} from './services/empresaService';

// Hooks
export {
  // Empresas
  useEmpresas,
  useEmpresa,
  useCreateEmpresa,
  useUpdateEmpresa,
  useUpdateBranding,
  useCambiarPlan,
  useToggleEmpresa,
  // Módulos
  useModulosSistema,
  useModulosEmpresa,
  useModulosHabilitados,
  useToggleModulo,
  useActivarModulosPlan,
  // Roles
  useRolesEmpresa,
  useCreateRol,
  useUpdateRol,
  useDeleteRol,
  // Usuarios
  useUsuariosEmpresa,
  useUsuario,
  useUpdateUsuario,
  useAsignarRoles,
  useToggleUsuario,
  // Invitaciones
  useInvitaciones,
  useCreateInvitacion,
  useReenviarInvitacion,
  useCancelarInvitacion,
  // Archivos
  useArchivosEmpresa,
  useUploadArchivo,
  useDeleteArchivo,
  // Configuración
  useConfiguracionEmpresa,
  useUpdateConfiguracion
} from './hooks/useEmpresas';

// Components
export { EmpresaForm } from './components/EmpresaForm';
export { BrandingManager } from './components/BrandingManager';
export { ModulosManager } from './components/ModulosManager';
export { UsuariosManager } from './components/UsuariosManager';

// Pages
export { EmpresasListPage } from './pages/EmpresasListPage';
export { EmpresaDetailPage } from './pages/EmpresaDetailPage';
