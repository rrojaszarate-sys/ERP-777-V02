/**
 * Hooks de React Query para Administración de Empresas - FASE 6
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  empresaService,
  modulosService,
  rolesService,
  usuariosService,
  invitacionesService,
  archivosService,
  configuracionService
} from '../services/empresaService';
import toast from 'react-hot-toast';
import type {
  EmpresaFormData,
  RolEmpresaFormData,
  UsuarioFormData,
  InvitacionFormData,
  TipoArchivoEmpresa,
  PlanTipo,
  ConfiguracionEmpresa
} from '../types';

// ============================================
// EMPRESAS
// ============================================

export const useEmpresas = () => {
  return useQuery({
    queryKey: ['empresas'],
    queryFn: () => empresaService.fetchEmpresas()
  });
};

export const useEmpresa = (id: string) => {
  return useQuery({
    queryKey: ['empresa', id],
    queryFn: () => empresaService.fetchEmpresaById(id),
    enabled: !!id
  });
};

export const useCreateEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmpresaFormData) => empresaService.createEmpresa(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success('Empresa creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear empresa');
    }
  });
};

export const useUpdateEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmpresaFormData> }) =>
      empresaService.updateEmpresa(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      queryClient.invalidateQueries({ queryKey: ['empresa', variables.id] });
      toast.success('Empresa actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar empresa');
    }
  });
};

export const useUpdateBranding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, branding }: {
      id: string;
      branding: {
        logo_principal_url?: string;
        logo_secundario_url?: string;
        membrete_url?: string;
        color_primario?: string;
        color_secundario?: string;
        pie_pagina_documentos?: string;
      }
    }) => empresaService.updateBranding(id, branding),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['empresa', variables.id] });
      toast.success('Branding actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar branding');
    }
  });
};

export const useCambiarPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, plan, fechaFin }: { id: string; plan: PlanTipo; fechaFin?: string }) =>
      empresaService.cambiarPlan(id, plan, fechaFin),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      queryClient.invalidateQueries({ queryKey: ['empresa', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['modulos-empresa', variables.id] });
      toast.success('Plan actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cambiar plan');
    }
  });
};

export const useToggleEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      activo ? empresaService.activarEmpresa(id) : empresaService.desactivarEmpresa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success('Estado actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cambiar estado');
    }
  });
};

// ============================================
// MÓDULOS
// ============================================

export const useModulosSistema = () => {
  return useQuery({
    queryKey: ['modulos-sistema'],
    queryFn: () => modulosService.fetchModulosSistema()
  });
};

export const useModulosEmpresa = (companyId: string) => {
  return useQuery({
    queryKey: ['modulos-empresa', companyId],
    queryFn: () => modulosService.fetchModulosEmpresa(companyId),
    enabled: !!companyId
  });
};

export const useModulosHabilitados = (companyId?: string) => {
  const { user } = useAuth();
  const id = companyId || user?.company_id;

  return useQuery({
    queryKey: ['modulos-habilitados', id],
    queryFn: () => modulosService.fetchModulosHabilitados(id!),
    enabled: !!id
  });
};

export const useToggleModulo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, moduloId, habilitado }: {
      companyId: string;
      moduloId: number;
      habilitado: boolean;
    }) => modulosService.toggleModulo(companyId, moduloId, habilitado),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modulos-empresa', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['modulos-habilitados', variables.companyId] });
      toast.success(variables.habilitado ? 'Módulo habilitado' : 'Módulo deshabilitado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cambiar módulo');
    }
  });
};

export const useActivarModulosPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, plan }: { companyId: string; plan: PlanTipo }) =>
      modulosService.activarModulosPlan(companyId, plan),
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modulos-empresa', variables.companyId] });
      toast.success(`${count} módulos activados`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al activar módulos');
    }
  });
};

// ============================================
// ROLES
// ============================================

export const useRolesEmpresa = (companyId?: string) => {
  const { user } = useAuth();
  const id = companyId || user?.company_id;

  return useQuery({
    queryKey: ['roles-empresa', id],
    queryFn: () => rolesService.fetchRolesEmpresa(id!),
    enabled: !!id
  });
};

export const useCreateRol = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: RolEmpresaFormData) =>
      rolesService.createRol(user!.company_id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-empresa'] });
      toast.success('Rol creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear rol');
    }
  });
};

export const useUpdateRol = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RolEmpresaFormData> }) =>
      rolesService.updateRol(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-empresa'] });
      toast.success('Rol actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar rol');
    }
  });
};

export const useDeleteRol = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => rolesService.deleteRol(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-empresa'] });
      toast.success('Rol eliminado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar rol');
    }
  });
};

// ============================================
// USUARIOS
// ============================================

export const useUsuariosEmpresa = (companyId?: string) => {
  const { user } = useAuth();
  const id = companyId || user?.company_id;

  return useQuery({
    queryKey: ['usuarios-empresa', id],
    queryFn: () => usuariosService.fetchUsuariosEmpresa(id!),
    enabled: !!id
  });
};

export const useUsuario = (id: string) => {
  return useQuery({
    queryKey: ['usuario', id],
    queryFn: () => usuariosService.fetchUsuarioById(id),
    enabled: !!id
  });
};

export const useUpdateUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UsuarioFormData> }) =>
      usuariosService.updateUsuario(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-empresa'] });
      queryClient.invalidateQueries({ queryKey: ['usuario', variables.id] });
      toast.success('Usuario actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar usuario');
    }
  });
};

export const useAsignarRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: number[] }) =>
      usuariosService.asignarRoles(userId, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-empresa'] });
      toast.success('Roles asignados');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al asignar roles');
    }
  });
};

export const useToggleUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      activo ? usuariosService.activarUsuario(id) : usuariosService.desactivarUsuario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-empresa'] });
      toast.success('Estado actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cambiar estado');
    }
  });
};

// ============================================
// INVITACIONES
// ============================================

export const useInvitaciones = (companyId?: string, status?: string) => {
  const { user } = useAuth();
  const id = companyId || user?.company_id;

  return useQuery({
    queryKey: ['invitaciones', id, status],
    queryFn: () => invitacionesService.fetchInvitaciones(id!, status),
    enabled: !!id
  });
};

export const useCreateInvitacion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: InvitacionFormData) =>
      invitacionesService.createInvitacion(user!.company_id!, data, user!.id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitaciones'] });
      toast.success('Invitación enviada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear invitación');
    }
  });
};

export const useReenviarInvitacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invitacionesService.reenviarInvitacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitaciones'] });
      toast.success('Invitación reenviada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al reenviar');
    }
  });
};

export const useCancelarInvitacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invitacionesService.cancelarInvitacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitaciones'] });
      toast.success('Invitación cancelada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cancelar');
    }
  });
};

// ============================================
// ARCHIVOS / BRANDING
// ============================================

export const useArchivosEmpresa = (companyId?: string, tipo?: TipoArchivoEmpresa) => {
  const { user } = useAuth();
  const id = companyId || user?.company_id;

  return useQuery({
    queryKey: ['archivos-empresa', id, tipo],
    queryFn: () => archivosService.fetchArchivos(id!, tipo),
    enabled: !!id
  });
};

export const useUploadArchivo = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ companyId, file, tipo }: {
      companyId: string;
      file: File;
      tipo: TipoArchivoEmpresa;
    }) => archivosService.uploadArchivo(companyId, file, tipo, user?.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['archivos-empresa', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['empresa', variables.companyId] });
      toast.success('Archivo subido exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al subir archivo');
    }
  });
};

export const useDeleteArchivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archivosService.deleteArchivo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archivos-empresa'] });
      queryClient.invalidateQueries({ queryKey: ['empresa'] });
      toast.success('Archivo eliminado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar archivo');
    }
  });
};

// ============================================
// CONFIGURACIÓN
// ============================================

export const useConfiguracionEmpresa = (companyId?: string) => {
  const { user } = useAuth();
  const id = companyId || user?.company_id;

  return useQuery({
    queryKey: ['configuracion-empresa', id],
    queryFn: () => configuracionService.fetchConfiguracion(id!),
    enabled: !!id
  });
};

export const useUpdateConfiguracion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ companyId, config }: {
      companyId: string;
      config: Partial<ConfiguracionEmpresa>;
    }) => configuracionService.updateConfiguracion(companyId, config, user?.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['configuracion-empresa', variables.companyId] });
      toast.success('Configuración guardada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al guardar configuración');
    }
  });
};
