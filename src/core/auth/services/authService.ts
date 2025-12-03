/**
 * Servicio de Autenticación con Google OAuth
 * Maneja login, solicitudes de acceso y gestión de usuarios
 */

import { supabase } from '../../config/supabase';

// Dominio permitido para solicitudes
const DOMINIO_PERMITIDO = 'madegroup.mx';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export interface AccessRequest {
  id: string;
  google_id: string;
  email: string;
  nombre: string;
  apellido: string;
  avatar_url: string;
  empresa_solicitada: string;
  puesto_solicitado: string;
  motivo: string;
  telefono: string;
  status: 'pendiente' | 'aprobada' | 'rechazada' | 'expirada';
  role_id: number | null;
  company_id: string | null;
  revisado_por: string | null;
  fecha_revision: string | null;
  motivo_rechazo: string | null;
  notas_admin: string | null;
  created_at: string;
  expires_at: string;
}

export interface CoreUser {
  id: string;
  auth_user_id: string | null;
  google_id: string | null;
  company_id: string;
  email: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  puesto: string | null;
  avatar_url: string | null;
  activo: boolean;
  ultimo_login: string | null;
}

// ============================================================================
// AUTENTICACIÓN CON GOOGLE
// ============================================================================

/**
 * Inicia el flujo de login con Google OAuth
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
        hd: DOMINIO_PERMITIDO, // Restricción a dominio madegroup.mx
      },
    },
  });

  if (error) throw error;
  return data;
};

/**
 * Cierra la sesión del usuario
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Verifica si el email pertenece al dominio permitido
 */
export const isValidDomain = (email: string): boolean => {
  const domain = email.split('@')[1];
  return domain === DOMINIO_PERMITIDO;
};

/**
 * Obtiene el usuario autenticado de Supabase
 */
export const getCurrentAuthUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// ============================================================================
// VERIFICACIÓN DE USUARIO
// ============================================================================

/**
 * Verifica si un usuario de Google ya está registrado en core_users
 */
export const checkUserExists = async (email: string): Promise<CoreUser | null> => {
  const { data, error } = await supabase
    .from('core_users')
    .select('*')
    .eq('email', email)
    .eq('activo', true)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Verifica si hay una solicitud pendiente para este email
 */
export const checkPendingRequest = async (email: string): Promise<AccessRequest | null> => {
  const { data, error } = await supabase
    .from('core_access_requests')
    .select('*')
    .eq('email', email)
    .eq('status', 'pendiente')
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Obtiene el estado completo del usuario (registrado, pendiente, o nuevo)
 */
export const getUserStatus = async (email: string): Promise<{
  status: 'registered' | 'pending' | 'rejected' | 'new';
  user?: CoreUser;
  request?: AccessRequest;
}> => {
  // Verificar si ya está registrado
  const existingUser = await checkUserExists(email);
  if (existingUser) {
    return { status: 'registered', user: existingUser };
  }

  // Verificar si tiene solicitud pendiente
  const pendingRequest = await checkPendingRequest(email);
  if (pendingRequest) {
    return { status: 'pending', request: pendingRequest };
  }

  // Verificar si fue rechazado recientemente
  const { data: rejectedRequest } = await supabase
    .from('core_access_requests')
    .select('*')
    .eq('email', email)
    .eq('status', 'rechazada')
    .order('fecha_revision', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rejectedRequest) {
    return { status: 'rejected', request: rejectedRequest };
  }

  return { status: 'new' };
};

// ============================================================================
// SOLICITUDES DE ACCESO
// ============================================================================

/**
 * Crea una nueva solicitud de acceso
 */
export const createAccessRequest = async (data: {
  google_id: string;
  email: string;
  nombre: string;
  apellido: string;
  avatar_url: string;
  empresa_solicitada?: string;
  puesto_solicitado?: string;
  motivo?: string;
  telefono?: string;
}): Promise<AccessRequest> => {
  // Verificar dominio
  if (!isValidDomain(data.email)) {
    throw new Error(`Solo se permiten correos de @${DOMINIO_PERMITIDO}`);
  }

  // Verificar si ya existe solicitud
  const existing = await checkPendingRequest(data.email);
  if (existing) {
    throw new Error('Ya tienes una solicitud pendiente de revisión');
  }

  const { data: request, error } = await supabase
    .from('core_access_requests')
    .insert([{
      google_id: data.google_id,
      email: data.email,
      nombre: data.nombre,
      apellido: data.apellido || '',
      avatar_url: data.avatar_url,
      empresa_solicitada: data.empresa_solicitada || '',
      puesto_solicitado: data.puesto_solicitado || '',
      motivo: data.motivo || '',
      telefono: data.telefono || '',
      status: 'pendiente',
    }])
    .select()
    .single();

  if (error) throw error;
  return request;
};

/**
 * Obtiene todas las solicitudes pendientes (para admin)
 */
export const getPendingRequests = async (): Promise<AccessRequest[]> => {
  const { data, error } = await supabase
    .from('core_access_requests')
    .select('*')
    .eq('status', 'pendiente')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Obtiene todas las solicitudes (para admin)
 */
export const getAllRequests = async (status?: string): Promise<AccessRequest[]> => {
  let query = supabase
    .from('core_access_requests')
    .select(`
      *,
      role:core_roles(id, nombre),
      company:core_companies(id, nombre),
      revisor:core_users!revisado_por(id, nombre)
    `)
    .order('created_at', { ascending: false });

  if (status && status !== 'todas') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Aprueba una solicitud de acceso y crea el usuario
 */
export const approveAccessRequest = async (
  requestId: string,
  roleId: number,
  companyId: string,
  adminUserId: string,
  notas?: string
): Promise<CoreUser> => {
  // Obtener la solicitud
  const { data: request, error: fetchError } = await supabase
    .from('core_access_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;
  if (!request) throw new Error('Solicitud no encontrada');
  if (request.status !== 'pendiente') {
    throw new Error('Esta solicitud ya fue procesada');
  }

  // Crear el usuario en core_users
  const { data: newUser, error: createError } = await supabase
    .from('core_users')
    .insert([{
      google_id: request.google_id,
      email: request.email,
      nombre: request.nombre,
      apellidos: request.apellido,
      avatar_url: request.avatar_url,
      telefono: request.telefono,
      puesto: request.puesto_solicitado,
      company_id: companyId,
      activo: true,
    }])
    .select()
    .single();

  if (createError) throw createError;

  // Asignar rol al usuario
  const { error: roleError } = await supabase
    .from('core_user_roles')
    .insert([{
      user_id: newUser.id,
      role_id: roleId,
      asignado_por: adminUserId,
      activo: true,
    }]);

  if (roleError) throw roleError;

  // Actualizar la solicitud como aprobada
  const { error: updateError } = await supabase
    .from('core_access_requests')
    .update({
      status: 'aprobada',
      role_id: roleId,
      company_id: companyId,
      revisado_por: adminUserId,
      fecha_revision: new Date().toISOString(),
      notas_admin: notas || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) throw updateError;

  return newUser;
};

/**
 * Rechaza una solicitud de acceso
 */
export const rejectAccessRequest = async (
  requestId: string,
  adminUserId: string,
  motivo: string
): Promise<void> => {
  const { error } = await supabase
    .from('core_access_requests')
    .update({
      status: 'rechazada',
      revisado_por: adminUserId,
      fecha_revision: new Date().toISOString(),
      motivo_rechazo: motivo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pendiente');

  if (error) throw error;
};

// ============================================================================
// GESTIÓN DE USUARIOS
// ============================================================================

/**
 * Obtiene el perfil completo del usuario con sus roles
 */
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('core_users')
    .select(`
      *,
      company:core_companies(id, nombre, rfc),
      roles:core_user_roles(
        id,
        activo,
        role:core_roles(id, nombre, permisos)
      )
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Obtiene el perfil del usuario por email
 */
export const getUserProfileByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from('core_users')
    .select(`
      *,
      company:core_companies(id, nombre, rfc),
      roles:core_user_roles(
        id,
        activo,
        role:core_roles(id, nombre, permisos)
      )
    `)
    .eq('email', email)
    .eq('activo', true)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Actualiza el último login del usuario
 */
export const updateLastLogin = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('core_users')
    .update({
      ultimo_login: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) console.error('Error actualizando último login:', error);
};

/**
 * Vincula un auth_user_id de Supabase con un core_user
 */
export const linkAuthUser = async (coreUserId: string, authUserId: string): Promise<void> => {
  const { error } = await supabase
    .from('core_users')
    .update({
      auth_user_id: authUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', coreUserId);

  if (error) throw error;
};

// ============================================================================
// ROLES
// ============================================================================

/**
 * Obtiene todos los roles disponibles
 */
export const getRoles = async () => {
  const { data, error } = await supabase
    .from('core_roles')
    .select('*')
    .eq('activo', true)
    .order('id');

  if (error) throw error;
  return data || [];
};

/**
 * Obtiene las empresas disponibles
 */
export const getCompanies = async () => {
  const { data, error } = await supabase
    .from('core_companies')
    .select('*')
    .eq('activo', true)
    .order('nombre');

  if (error) throw error;
  return data || [];
};

// ============================================================================
// ESTADÍSTICAS (para dashboard admin)
// ============================================================================

export const getAccessRequestStats = async () => {
  const { data, error } = await supabase
    .from('core_access_requests')
    .select('status');

  if (error) throw error;

  const stats = {
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
    total: data?.length || 0,
  };

  data?.forEach(r => {
    if (r.status === 'pendiente') stats.pendientes++;
    else if (r.status === 'aprobada') stats.aprobadas++;
    else if (r.status === 'rechazada') stats.rechazadas++;
  });

  return stats;
};
