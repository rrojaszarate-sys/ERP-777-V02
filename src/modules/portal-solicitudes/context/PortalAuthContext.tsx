/**
 * Contexto de autenticación del Portal con Google OAuth
 * 
 * NOTA: Durante desarrollo, la validación de dominio está DESACTIVADA.
 * Activar antes de producción cambiando VALIDAR_DOMINIO a true.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../core/config/supabase';
import type { UsuarioPortal } from '../types';

interface PortalAuthContextType {
  usuario: UsuarioPortal | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUsuario: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

// ============================================
// CONFIGURACIÓN DE DESARROLLO
// ============================================
// IMPORTANTE: Cambiar a true antes de producción
const VALIDAR_DOMINIO = false; // DESACTIVADO para desarrollo

// Dominios corporativos permitidos (se pueden cargar de la BD)
const DOMINIOS_PERMITIDOS = [
  'tuempresa.com',
  'gniproduccion.com',
  // Agregar más dominios según sea necesario
];

export const PortalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar si el dominio del email está permitido
  const verificarDominio = (email: string): boolean => {
    // Durante desarrollo, permitir todos los dominios
    if (!VALIDAR_DOMINIO) {
      return true;
    }
    const dominio = email.split('@')[1];
    return DOMINIOS_PERMITIDOS.includes(dominio);
  };

  // Obtener o crear usuario del portal desde los datos de Google
  const obtenerUsuarioPortal = async (googleUser: any): Promise<UsuarioPortal | null> => {
    try {
      const email = googleUser.email;
      
      // Verificar dominio corporativo (solo si está habilitado)
      if (!verificarDominio(email)) {
        throw new Error(`El dominio de correo no está autorizado. Use su correo corporativo.`);
      }

      // Buscar si el usuario ya existe
      const { data: usuarioExistente, error: errorBusqueda } = await supabase
        .from('usuarios_portal_erp')
        .select(`
          *,
          departamento:departamentos_erp(id, codigo, nombre, centro_costos),
          jefe_directo:usuarios_portal_erp!jefe_directo_id(id, nombre_completo, email)
        `)
        .eq('email', email)
        .single();

      if (usuarioExistente && !errorBusqueda) {
        // Actualizar último acceso
        await supabase
          .from('usuarios_portal_erp')
          .update({ 
            ultimo_acceso: new Date().toISOString(),
            avatar_url: googleUser.user_metadata?.avatar_url || usuarioExistente.avatar_url,
          })
          .eq('id', usuarioExistente.id);
        
        return usuarioExistente;
      }

      // Si no existe, crear nuevo usuario
      // Primero obtener la empresa (por ahora tomamos la primera)
      const { data: empresa } = await supabase
        .from('empresas')
        .select('id')
        .limit(1)
        .single();

      if (!empresa) {
        throw new Error('No se encontró la empresa configurada');
      }

      // Crear usuario usando la función de PostgreSQL
      const { data: nuevoUsuario, error: errorCrear } = await supabase
        .rpc('upsert_usuario_google', {
          p_empresa_id: empresa.id,
          p_google_id: googleUser.id,
          p_email: email,
          p_nombre_completo: googleUser.user_metadata?.full_name || email.split('@')[0],
          p_nombre: googleUser.user_metadata?.name?.split(' ')[0] || '',
          p_apellido: googleUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
          p_avatar_url: googleUser.user_metadata?.avatar_url || null,
        });

      if (errorCrear) {
        console.error('Error al crear usuario:', errorCrear);
        // Intentar insertar directamente
        const { data: usuarioInsertado, error: errorInsert } = await supabase
          .from('usuarios_portal_erp')
          .insert({
            empresa_id: empresa.id,
            google_id: googleUser.id,
            email: email,
            nombre_completo: googleUser.user_metadata?.full_name || email.split('@')[0],
            nombre: googleUser.user_metadata?.name?.split(' ')[0] || '',
            apellido: googleUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
            avatar_url: googleUser.user_metadata?.avatar_url || null,
            ultimo_acceso: new Date().toISOString(),
          })
          .select()
          .single();

        if (errorInsert) throw errorInsert;
        return usuarioInsertado;
      }

      return nuevoUsuario;
    } catch (err: any) {
      console.error('Error obteniendo usuario del portal:', err);
      throw err;
    }
  };

  // Verificar sesión actual
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const usuarioPortal = await obtenerUsuarioPortal(session.user);
        setUsuario(usuarioPortal);
      } else {
        setUsuario(null);
      }
    } catch (err: any) {
      console.error('Error verificando sesión:', err);
      setError(err.message);
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login con Google
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/portal/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: DOMINIOS_PERMITIDOS[0], // Restringir a dominio corporativo
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Error en login:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUsuario(null);
    } catch (err: any) {
      console.error('Error en logout:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Refrescar datos del usuario
  const refreshUsuario = async () => {
    if (!usuario) return;
    
    try {
      const { data, error } = await supabase
        .from('usuarios_portal_erp')
        .select(`
          *,
          departamento:departamentos_erp(id, codigo, nombre, centro_costos),
          jefe_directo:usuarios_portal_erp!jefe_directo_id(id, nombre_completo, email)
        `)
        .eq('id', usuario.id)
        .single();

      if (error) throw error;
      setUsuario(data);
    } catch (err: any) {
      console.error('Error refrescando usuario:', err);
    }
  };

  // Escuchar cambios de autenticación
  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const usuarioPortal = await obtenerUsuarioPortal(session.user);
          setUsuario(usuarioPortal);
        } catch (err: any) {
          setError(err.message);
          await supabase.auth.signOut();
        }
      } else if (event === 'SIGNED_OUT') {
        setUsuario(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkSession]);

  return (
    <PortalAuthContext.Provider
      value={{
        usuario,
        loading,
        error,
        isAuthenticated: !!usuario,
        loginWithGoogle,
        logout,
        refreshUsuario,
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
};

export const usePortalAuth = () => {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error('usePortalAuth debe usarse dentro de PortalAuthProvider');
  }
  return context;
};

export default PortalAuthContext;
