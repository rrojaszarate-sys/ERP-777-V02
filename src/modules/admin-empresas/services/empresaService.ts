/**
 * Servicio de Administración de Empresas - FASE 6
 */
import { supabase } from '../../../core/config/supabase';
import type {
  Empresa,
  EmpresaStats,
  EmpresaFormData,
  ModuloSistema,
  ModuloEmpresa,
  ModuloEmpresaView,
  RolEmpresa,
  RolEmpresaFormData,
  UsuarioEmpresa,
  UsuarioFormData,
  Invitacion,
  InvitacionFormData,
  ArchivoEmpresa,
  TipoArchivoEmpresa,
  PlanTipo,
  ConfiguracionEmpresa
} from '../types';

// ============================================
// EMPRESAS
// ============================================

export const empresaService = {
  /**
   * Obtener todas las empresas con estadísticas
   */
  async fetchEmpresas(): Promise<EmpresaStats[]> {
    const { data, error } = await supabase
      .from('vw_empresas_stats')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener empresa por ID
   */
  async fetchEmpresaById(id: string): Promise<Empresa | null> {
    const { data, error } = await supabase
      .from('core_companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Crear nueva empresa
   */
  async createEmpresa(data: EmpresaFormData): Promise<Empresa> {
    const { data: empresa, error } = await supabase
      .from('core_companies')
      .insert({
        ...data,
        activo: true,
        plan_fecha_inicio: new Date().toISOString().split('T')[0],
        plan_fecha_fin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;
    return empresa;
  },

  /**
   * Actualizar empresa
   */
  async updateEmpresa(id: string, data: Partial<EmpresaFormData>): Promise<Empresa> {
    const { data: empresa, error } = await supabase
      .from('core_companies')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return empresa;
  },

  /**
   * Actualizar branding de empresa
   */
  async updateBranding(id: string, branding: {
    logo_principal_url?: string;
    logo_secundario_url?: string;
    membrete_url?: string;
    favicon_url?: string;
    firma_digital_url?: string;
    sello_empresa_url?: string;
    color_primario?: string;
    color_secundario?: string;
    color_acento?: string;
    pie_pagina_documentos?: string;
  }): Promise<Empresa> {
    const { data: empresa, error } = await supabase
      .from('core_companies')
      .update({
        ...branding,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return empresa;
  },

  /**
   * Cambiar plan de empresa
   */
  async cambiarPlan(id: string, plan: PlanTipo, fechaFin?: string): Promise<Empresa> {
    const { data: empresa, error } = await supabase
      .from('core_companies')
      .update({
        plan_tipo: plan,
        plan_fecha_fin: fechaFin,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Activar módulos según plan
    await supabase.rpc('activar_modulos_plan', {
      p_company_id: id,
      p_plan_tipo: plan
    });

    return empresa;
  },

  /**
   * Desactivar empresa
   */
  async desactivarEmpresa(id: string): Promise<void> {
    const { error } = await supabase
      .from('core_companies')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Activar empresa
   */
  async activarEmpresa(id: string): Promise<void> {
    const { error } = await supabase
      .from('core_companies')
      .update({ activo: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// MÓDULOS
// ============================================

export const modulosService = {
  /**
   * Obtener catálogo de módulos del sistema
   */
  async fetchModulosSistema(): Promise<ModuloSistema[]> {
    const { data, error } = await supabase
      .from('core_modulos_sistema')
      .select('*')
      .eq('activo', true)
      .order('orden');

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener módulos de una empresa
   */
  async fetchModulosEmpresa(companyId: string): Promise<ModuloEmpresaView[]> {
    const { data, error } = await supabase
      .from('vw_modulos_empresa')
      .select('*')
      .eq('company_id', companyId)
      .order('orden');

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener módulos habilitados (para sidebar)
   */
  async fetchModulosHabilitados(companyId: string): Promise<{
    codigo: string;
    nombre: string;
    icono: string;
    ruta_base: string;
    categoria: string;
    habilitado: boolean;
  }[]> {
    const { data, error } = await supabase.rpc('get_modulos_empresa', {
      p_company_id: companyId
    });

    if (error) throw error;
    return data || [];
  },

  /**
   * Habilitar/deshabilitar módulo para empresa
   */
  async toggleModulo(companyId: string, moduloId: number, habilitado: boolean): Promise<void> {
    const { error } = await supabase
      .from('core_company_modules')
      .upsert({
        company_id: companyId,
        modulo_id: moduloId,
        habilitado,
        fecha_activacion: habilitado ? new Date().toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id,modulo_id'
      });

    if (error) throw error;
  },

  /**
   * Configurar módulo
   */
  async configurarModulo(
    companyId: string,
    moduloId: number,
    config: {
      limite_registros?: number;
      limite_usuarios?: number;
      fecha_expiracion?: string;
      configuracion?: Record<string, any>;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('core_company_modules')
      .update({
        ...config,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('modulo_id', moduloId);

    if (error) throw error;
  },

  /**
   * Activar todos los módulos de un plan
   */
  async activarModulosPlan(companyId: string, plan: PlanTipo): Promise<number> {
    const { data, error } = await supabase.rpc('activar_modulos_plan', {
      p_company_id: companyId,
      p_plan_tipo: plan
    });

    if (error) throw error;
    return data || 0;
  }
};

// ============================================
// ROLES
// ============================================

export const rolesService = {
  /**
   * Obtener roles de una empresa
   */
  async fetchRolesEmpresa(companyId: string): Promise<RolEmpresa[]> {
    const { data, error } = await supabase
      .from('core_roles_empresa')
      .select('*')
      .eq('company_id', companyId)
      .eq('activo', true)
      .order('es_admin', { ascending: false })
      .order('nombre');

    if (error) throw error;
    return data || [];
  },

  /**
   * Crear rol personalizado
   */
  async createRol(companyId: string, data: RolEmpresaFormData): Promise<RolEmpresa> {
    const { data: rol, error } = await supabase
      .from('core_roles_empresa')
      .insert({
        company_id: companyId,
        ...data,
        permisos: JSON.stringify(data.permisos)
      })
      .select()
      .single();

    if (error) throw error;
    return rol;
  },

  /**
   * Actualizar rol
   */
  async updateRol(id: number, data: Partial<RolEmpresaFormData>): Promise<RolEmpresa> {
    const updateData: any = { ...data, updated_at: new Date().toISOString() };
    if (data.permisos) {
      updateData.permisos = JSON.stringify(data.permisos);
    }

    const { data: rol, error } = await supabase
      .from('core_roles_empresa')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return rol;
  },

  /**
   * Eliminar rol
   */
  async deleteRol(id: number): Promise<void> {
    // Verificar que no sea rol del sistema
    const { data: rol } = await supabase
      .from('core_roles_empresa')
      .select('puede_eliminar')
      .eq('id', id)
      .single();

    if (rol && !rol.puede_eliminar) {
      throw new Error('No se puede eliminar un rol del sistema');
    }

    const { error } = await supabase
      .from('core_roles_empresa')
      .update({ activo: false })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Crear roles predeterminados para empresa
   */
  async crearRolesPredeterminados(companyId: string): Promise<number> {
    const { data, error } = await supabase.rpc('crear_roles_empresa', {
      p_company_id: companyId
    });

    if (error) throw error;
    return data || 0;
  }
};

// ============================================
// USUARIOS
// ============================================

export const usuariosService = {
  /**
   * Obtener usuarios de una empresa
   */
  async fetchUsuariosEmpresa(companyId: string): Promise<UsuarioEmpresa[]> {
    const { data, error } = await supabase
      .from('vw_usuarios_completo')
      .select('*')
      .eq('company_id', companyId)
      .order('nombre');

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener usuario por ID
   */
  async fetchUsuarioById(id: string): Promise<UsuarioEmpresa | null> {
    const { data, error } = await supabase
      .from('vw_usuarios_completo')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualizar usuario
   */
  async updateUsuario(id: string, data: Partial<UsuarioFormData>): Promise<void> {
    const { role_ids, ...userData } = data;

    // Actualizar datos del usuario
    if (Object.keys(userData).length > 0) {
      const { error } = await supabase
        .from('core_users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    }

    // Actualizar roles si se proporcionan
    if (role_ids) {
      await this.asignarRoles(id, role_ids);
    }
  },

  /**
   * Asignar roles a usuario
   */
  async asignarRoles(userId: string, roleIds: number[]): Promise<void> {
    // Desactivar roles actuales
    await supabase
      .from('core_user_roles')
      .update({ activo: false })
      .eq('user_id', userId);

    // Asignar nuevos roles
    if (roleIds.length > 0) {
      const { error } = await supabase
        .from('core_user_roles')
        .upsert(
          roleIds.map(roleId => ({
            user_id: userId,
            role_id: roleId,
            activo: true,
            fecha_asignacion: new Date().toISOString()
          })),
          { onConflict: 'user_id,role_id' }
        );

      if (error) throw error;
    }
  },

  /**
   * Desactivar usuario
   */
  async desactivarUsuario(id: string): Promise<void> {
    const { error } = await supabase
      .from('core_users')
      .update({ activo: false })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Activar usuario
   */
  async activarUsuario(id: string): Promise<void> {
    const { error } = await supabase
      .from('core_users')
      .update({ activo: true })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Cambiar empresa de usuario
   */
  async cambiarEmpresa(userId: string, companyId: string): Promise<void> {
    const { error } = await supabase
      .from('core_users')
      .update({ company_id: companyId })
      .eq('id', userId);

    if (error) throw error;
  }
};

// ============================================
// INVITACIONES
// ============================================

export const invitacionesService = {
  /**
   * Obtener invitaciones de una empresa
   */
  async fetchInvitaciones(companyId: string, status?: string): Promise<Invitacion[]> {
    let query = supabase
      .from('core_invitations')
      .select(`
        *,
        core_roles_empresa!role_id(nombre),
        enviado:core_users!enviado_por(nombre, apellidos)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(inv => ({
      ...inv,
      rol_nombre: inv.core_roles_empresa?.nombre,
      enviado_por_nombre: inv.enviado
        ? `${inv.enviado.nombre} ${inv.enviado.apellidos || ''}`
        : undefined
    }));
  },

  /**
   * Crear invitación
   */
  async createInvitacion(companyId: string, data: InvitacionFormData, enviadoPor: string): Promise<Invitacion> {
    // Generar token único
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 32);

    const { data: invitacion, error } = await supabase
      .from('core_invitations')
      .insert({
        company_id: companyId,
        ...data,
        token,
        enviado_por: enviadoPor,
        fecha_expiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return invitacion;
  },

  /**
   * Reenviar invitación
   */
  async reenviarInvitacion(id: string): Promise<void> {
    const { error } = await supabase
      .from('core_invitations')
      .update({
        fecha_envio: new Date().toISOString(),
        fecha_expiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        intentos_reenvio: supabase.rpc('increment', { x: 1 })
      })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Cancelar invitación
   */
  async cancelarInvitacion(id: string): Promise<void> {
    const { error } = await supabase
      .from('core_invitations')
      .update({ status: 'cancelada' })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Validar token de invitación
   */
  async validarToken(token: string): Promise<Invitacion | null> {
    const { data, error } = await supabase
      .from('core_invitations')
      .select('*, core_companies(*)')
      .eq('token', token)
      .eq('status', 'pendiente')
      .gte('fecha_expiracion', new Date().toISOString())
      .single();

    if (error) return null;
    return data;
  },

  /**
   * Aceptar invitación
   */
  async aceptarInvitacion(token: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('core_invitations')
      .update({
        status: 'aceptada',
        aceptado_por: userId,
        fecha_aceptacion: new Date().toISOString()
      })
      .eq('token', token);

    if (error) throw error;
  }
};

// ============================================
// ARCHIVOS / BRANDING
// ============================================

export const archivosService = {
  /**
   * Obtener el bucket de una empresa
   * Cada empresa tiene su propio bucket: erp-{company_id_sin_guiones}
   */
  async getBucketEmpresa(companyId: string): Promise<string> {
    // Intentar obtener el bucket desde la BD
    const { data, error } = await supabase.rpc('get_company_bucket', {
      p_company_id: companyId
    });

    if (error || !data) {
      // Fallback: generar nombre de bucket directamente
      return 'erp-' + companyId.replace(/-/g, '');
    }

    return data;
  },

  /**
   * Obtener archivos de una empresa
   */
  async fetchArchivos(companyId: string, tipo?: TipoArchivoEmpresa): Promise<ArchivoEmpresa[]> {
    let query = supabase
      .from('core_company_files')
      .select('*')
      .eq('company_id', companyId)
      .eq('activo', true)
      .order('created_at', { ascending: false });

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Subir archivo al bucket de la empresa
   */
  async uploadArchivo(
    companyId: string,
    file: File,
    tipo: TipoArchivoEmpresa,
    userId?: string
  ): Promise<ArchivoEmpresa> {
    // Obtener bucket de la empresa
    const bucketName = await this.getBucketEmpresa(companyId);

    // Generar nombre único - estructura: branding/{tipo}/{timestamp}.{ext}
    const ext = file.name.split('.').pop();
    const nombreStorage = `branding/${tipo}/${Date.now()}.${ext}`;

    // Subir a storage del bucket de la empresa
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(nombreStorage, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(nombreStorage);

    // Registrar en base de datos
    const { data: archivo, error } = await supabase
      .from('core_company_files')
      .insert({
        company_id: companyId,
        tipo,
        nombre_original: file.name,
        nombre_storage: nombreStorage,
        bucket_name: bucketName,
        storage_path: nombreStorage,
        url: urlData.publicUrl,
        mime_type: file.type,
        size_bytes: file.size,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    // Actualizar campo correspondiente en empresa
    const campoEmpresa = this.getCampoEmpresa(tipo);
    if (campoEmpresa) {
      await supabase
        .from('core_companies')
        .update({ [campoEmpresa]: urlData.publicUrl })
        .eq('id', companyId);
    }

    return archivo;
  },

  /**
   * Eliminar archivo del bucket de la empresa
   */
  async deleteArchivo(id: string): Promise<void> {
    // Obtener info del archivo
    const { data: archivo } = await supabase
      .from('core_company_files')
      .select('*')
      .eq('id', id)
      .single();

    if (!archivo) throw new Error('Archivo no encontrado');

    // Obtener bucket (puede estar en el registro o calcularlo)
    const bucketName = archivo.bucket_name || await this.getBucketEmpresa(archivo.company_id);

    // Eliminar de storage
    await supabase.storage
      .from(bucketName)
      .remove([archivo.storage_path || archivo.nombre_storage]);

    // Marcar como inactivo
    await supabase
      .from('core_company_files')
      .update({ activo: false })
      .eq('id', id);

    // Limpiar campo en empresa
    const campoEmpresa = this.getCampoEmpresa(archivo.tipo);
    if (campoEmpresa) {
      await supabase
        .from('core_companies')
        .update({ [campoEmpresa]: null })
        .eq('id', archivo.company_id);
    }
  },

  /**
   * Obtener URL pública de un archivo
   */
  async getPublicUrl(companyId: string, storagePath: string): Promise<string> {
    const bucketName = await this.getBucketEmpresa(companyId);
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);
    return data.publicUrl;
  },

  /**
   * Listar archivos en una carpeta del bucket de la empresa
   */
  async listArchivos(companyId: string, folder: string): Promise<{
    name: string;
    url: string;
    size: number;
    created_at: string;
  }[]> {
    const bucketName = await this.getBucketEmpresa(companyId);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder, {
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) throw error;

    return (data || []).map(file => {
      const filePath = `${folder}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return {
        name: file.name,
        url: urlData.publicUrl,
        size: file.metadata?.size || 0,
        created_at: file.created_at || ''
      };
    });
  },

  /**
   * Obtener campo de empresa según tipo de archivo
   */
  getCampoEmpresa(tipo: TipoArchivoEmpresa): string | null {
    const mapping: Record<TipoArchivoEmpresa, string | null> = {
      logo_principal: 'logo_principal_url',
      logo_secundario: 'logo_secundario_url',
      membrete: 'membrete_url',
      favicon: 'favicon_url',
      firma: 'firma_digital_url',
      sello: 'sello_empresa_url',
      documento: null
    };
    return mapping[tipo];
  }
};

// ============================================
// CONFIGURACIÓN
// ============================================

export const configuracionService = {
  /**
   * Obtener configuración de empresa
   */
  async fetchConfiguracion(companyId: string): Promise<ConfiguracionEmpresa> {
    const { data, error } = await supabase
      .from('core_system_config')
      .select('config_key, config_value')
      .eq('company_id', companyId);

    if (error) throw error;

    // Convertir a objeto
    const config: ConfiguracionEmpresa = {};
    (data || []).forEach(item => {
      (config as any)[item.config_key] = item.config_value;
    });

    return config;
  },

  /**
   * Actualizar configuración
   */
  async updateConfiguracion(
    companyId: string,
    config: Partial<ConfiguracionEmpresa>,
    userId?: string
  ): Promise<void> {
    const upserts = Object.entries(config).map(([key, value]) => ({
      company_id: companyId,
      config_key: key,
      config_value: value,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('core_system_config')
      .upsert(upserts, { onConflict: 'company_id,config_key' });

    if (error) throw error;
  }
};

// Export all services
export default {
  empresas: empresaService,
  modulos: modulosService,
  roles: rolesService,
  usuarios: usuariosService,
  invitaciones: invitacionesService,
  archivos: archivosService,
  configuracion: configuracionService
};
