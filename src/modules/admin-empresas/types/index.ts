/**
 * Tipos para Administración de Empresas - FASE 6
 */

// ============================================
// EMPRESA
// ============================================

export interface Empresa {
  id: string;
  codigo?: string; // Abreviación única para identificar la empresa (se usa en el bucket)
  nombre: string;
  razon_social?: string;
  nombre_comercial?: string;
  rfc?: string;
  regimen_fiscal?: string;
  email?: string;
  telefono?: string;
  telefono_secundario?: string;
  whatsapp?: string;
  sitio_web?: string;
  email_facturacion?: string;
  email_soporte?: string;

  // Dirección
  direccion?: string;
  codigo_postal?: string;
  estado?: string;
  ciudad?: string;
  colonia?: string;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;

  // Branding
  logo_url?: string;
  logo_principal_url?: string;
  logo_secundario_url?: string;
  membrete_url?: string;
  favicon_url?: string;
  firma_digital_url?: string;
  sello_empresa_url?: string;
  color_primario?: string;
  color_secundario?: string;
  color_acento?: string;

  // Documentos
  pie_pagina_documentos?: string;
  terminos_condiciones?: string;
  aviso_privacidad?: string;

  // Plan
  plan_tipo: PlanTipo;
  plan_fecha_inicio?: string;
  plan_fecha_fin?: string;
  max_usuarios: number;
  max_almacenamiento_gb: number;

  // Metadata
  activo: boolean;
  configuracion_extra?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type PlanTipo = 'basic' | 'pro' | 'enterprise';

export interface EmpresaStats extends Empresa {
  total_usuarios: number;
  modulos_activos: number;
  invitaciones_pendientes: number;
  estado_plan: 'activo' | 'por_expirar' | 'expirado' | 'sin_expiracion';
}

export interface EmpresaFormData {
  codigo: string; // Abreviación única (requerido para crear bucket)
  nombre: string;
  razon_social?: string;
  nombre_comercial?: string;
  rfc?: string;
  regimen_fiscal?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  codigo_postal?: string;
  estado?: string;
  ciudad?: string;
  plan_tipo?: PlanTipo;
  max_usuarios?: number;
}

// ============================================
// MÓDULOS
// ============================================

export interface ModuloSistema {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  ruta_base?: string;
  orden: number;
  categoria: ModuloCategoria;
  es_core: boolean;
  requiere_plan: PlanTipo;
  activo: boolean;
}

export type ModuloCategoria = 'core' | 'operaciones' | 'finanzas' | 'rh' | 'integraciones' | 'reportes' | 'admin';

export interface ModuloEmpresa {
  id: number;
  company_id: string;
  modulo_id: number;
  habilitado: boolean;
  fecha_activacion?: string;
  fecha_expiracion?: string;
  limite_registros?: number;
  limite_usuarios?: number;
  configuracion?: Record<string, any>;
  // Joined fields
  codigo?: string;
  modulo_nombre?: string;
  descripcion?: string;
  icono?: string;
  ruta_base?: string;
  categoria?: ModuloCategoria;
  es_core?: boolean;
  acceso_permitido?: boolean;
}

export interface ModuloEmpresaView {
  id: number;
  company_id: string;
  empresa_nombre: string;
  modulo_id: number;
  codigo: string;
  modulo_nombre: string;
  descripcion?: string;
  icono?: string;
  ruta_base?: string;
  orden: number;
  categoria: ModuloCategoria;
  es_core: boolean;
  requiere_plan: PlanTipo;
  habilitado: boolean;
  fecha_activacion?: string;
  fecha_expiracion?: string;
  acceso_permitido: boolean;
}

// ============================================
// ROLES
// ============================================

export interface RolEmpresa {
  id: number;
  company_id: string;
  nombre: string;
  descripcion?: string;
  permisos: string[];
  color?: string;
  es_predeterminado: boolean;
  es_admin: boolean;
  puede_eliminar: boolean;
  activo: boolean;
  created_at: string;
}

export interface RolEmpresaFormData {
  nombre: string;
  descripcion?: string;
  permisos: string[];
  color?: string;
  es_predeterminado?: boolean;
}

// ============================================
// USUARIOS
// ============================================

export interface UsuarioEmpresa {
  id: string;
  email: string;
  nombre: string;
  apellidos?: string;
  nombre_completo: string;
  telefono?: string;
  puesto?: string;
  avatar_url?: string;
  activo: boolean;
  ultimo_login?: string;
  created_at: string;
  company_id: string;
  empresa_nombre?: string;
  empresa_logo?: string;
  roles: {
    id: number;
    nombre: string;
    es_admin: boolean;
  }[];
}

export interface UsuarioFormData {
  email: string;
  nombre: string;
  apellidos?: string;
  telefono?: string;
  puesto?: string;
  role_ids: number[];
}

// ============================================
// INVITACIONES
// ============================================

export interface Invitacion {
  id: string;
  company_id: string;
  email: string;
  nombre?: string;
  role_id?: number;
  token: string;
  status: InvitacionStatus;
  mensaje_personalizado?: string;
  enviado_por?: string;
  aceptado_por?: string;
  fecha_envio: string;
  fecha_expiracion: string;
  fecha_aceptacion?: string;
  intentos_reenvio: number;
  created_at: string;
  // Joined
  rol_nombre?: string;
  enviado_por_nombre?: string;
}

export type InvitacionStatus = 'pendiente' | 'aceptada' | 'rechazada' | 'expirada' | 'cancelada';

export interface InvitacionFormData {
  email: string;
  nombre?: string;
  role_id?: number;
  mensaje_personalizado?: string;
}

// ============================================
// ARCHIVOS / BRANDING
// ============================================

export interface ArchivoEmpresa {
  id: string;
  company_id: string;
  tipo: TipoArchivoEmpresa;
  nombre_original: string;
  nombre_storage: string;
  url: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
  activo: boolean;
  created_at: string;
  created_by?: string;
}

export type TipoArchivoEmpresa =
  | 'logo_principal'
  | 'logo_secundario'
  | 'membrete'
  | 'favicon'
  | 'firma'
  | 'sello'
  | 'documento';

// ============================================
// SOLICITUDES DE ACCESO
// ============================================

export interface SolicitudAcceso {
  id: string;
  google_id?: string;
  email: string;
  nombre: string;
  apellido?: string;
  avatar_url?: string;
  empresa_solicitada?: string;
  puesto_solicitado?: string;
  motivo?: string;
  telefono?: string;
  status: SolicitudStatus;
  role_id?: number;
  company_id?: string;
  revisado_por?: string;
  fecha_revision?: string;
  motivo_rechazo?: string;
  notas_admin?: string;
  created_at: string;
  expires_at: string;
}

export type SolicitudStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'expirada';

// ============================================
// CONFIGURACIÓN
// ============================================

export interface ConfiguracionEmpresa {
  // General
  timezone?: string;
  locale?: string;
  currency?: string;
  date_format?: string;

  // Fiscal
  iva_rate?: number;
  retencion_isr?: number;
  retencion_iva?: number;

  // Operaciones
  credit_days_default?: number;
  auto_calculate_totals?: boolean;
  require_approvals?: boolean;

  // Notificaciones
  email_notifications?: boolean;
  push_notifications?: boolean;
  webhook_notifications?: boolean;

  // Seguridad
  session_timeout_minutes?: number;
  require_2fa?: boolean;
  allowed_domains?: string[];
}

// ============================================
// PLANES
// ============================================

export const PLANES: Record<PlanTipo, {
  nombre: string;
  descripcion: string;
  precio_mensual: number;
  max_usuarios: number;
  max_almacenamiento_gb: number;
  modulos_incluidos: string[];
  color: string;
}> = {
  basic: {
    nombre: 'Básico',
    descripcion: 'Para pequeñas empresas',
    precio_mensual: 499,
    max_usuarios: 5,
    max_almacenamiento_gb: 5,
    modulos_incluidos: ['dashboard', 'eventos', 'inventario', 'crm', 'compras', 'gastos', 'reportes', 'admin-usuarios', 'configuracion'],
    color: '#71717A'
  },
  pro: {
    nombre: 'Profesional',
    descripcion: 'Para empresas en crecimiento',
    precio_mensual: 999,
    max_usuarios: 25,
    max_almacenamiento_gb: 25,
    modulos_incluidos: ['dashboard', 'eventos', 'inventario', 'crm', 'proyectos', 'facturacion', 'contabilidad', 'tesoreria', 'compras', 'gastos', 'portal-clientes', 'webhooks', 'reportes', 'auditoria', 'admin-usuarios', 'configuracion'],
    color: '#006FEE'
  },
  enterprise: {
    nombre: 'Empresarial',
    descripcion: 'Para grandes organizaciones',
    precio_mensual: 2499,
    max_usuarios: 100,
    max_almacenamiento_gb: 100,
    modulos_incluidos: ['*'], // Todos los módulos
    color: '#17C964'
  }
};

// ============================================
// CATEGORÍAS DE MÓDULOS
// ============================================

export const CATEGORIAS_MODULOS: Record<ModuloCategoria, {
  nombre: string;
  descripcion: string;
  icono: string;
}> = {
  core: {
    nombre: 'Sistema',
    descripcion: 'Módulos principales del sistema',
    icono: 'Settings'
  },
  operaciones: {
    nombre: 'Operaciones',
    descripcion: 'Gestión operativa del negocio',
    icono: 'Briefcase'
  },
  finanzas: {
    nombre: 'Finanzas',
    descripcion: 'Gestión financiera y contable',
    icono: 'DollarSign'
  },
  rh: {
    nombre: 'Recursos Humanos',
    descripcion: 'Gestión de personal',
    icono: 'Users'
  },
  integraciones: {
    nombre: 'Integraciones',
    descripcion: 'Conexiones externas',
    icono: 'Link'
  },
  reportes: {
    nombre: 'Reportes',
    descripcion: 'Análisis y reportes',
    icono: 'BarChart'
  },
  admin: {
    nombre: 'Administración',
    descripcion: 'Configuración y administración',
    icono: 'Shield'
  }
};
