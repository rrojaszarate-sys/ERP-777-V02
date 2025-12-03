/**
 * Contexto de Autenticación del Portal de Clientes - FASE 5.2
 * Permite a clientes externos acceder a su información
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../core/config/supabase';
import type { ClientePortal } from '../types';

interface ClienteAuthContextType {
  cliente: ClientePortal | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  loginWithToken: (token: string) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  requestAccess: (email: string) => Promise<boolean>;
  logout: () => void;
}

const ClienteAuthContext = createContext<ClienteAuthContextType | undefined>(undefined);

export const ClienteAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cliente, setCliente] = useState<ClientePortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar sesión guardada
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('cliente_portal_token');
      if (token) {
        const clienteData = await verificarToken(token);
        if (clienteData) {
          setCliente(clienteData);
          return;
        }
      }

      setCliente(null);
    } catch (err) {
      console.error('Error verificando sesión:', err);
      setCliente(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar token de acceso
  const verificarToken = async (token: string): Promise<ClientePortal | null> => {
    try {
      const { data, error } = await supabase
        .from('crm_clientes')
        .select('*')
        .eq('token_acceso', token)
        .eq('activo', true)
        .single();

      if (error || !data) return null;

      // Actualizar último acceso
      await supabase
        .from('crm_clientes')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('id', data.id);

      return data as ClientePortal;
    } catch (err) {
      console.error('Error verificando token:', err);
      return null;
    }
  };

  // Login con token (para links directos)
  const loginWithToken = async (token: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const clienteData = await verificarToken(token);

      if (clienteData) {
        localStorage.setItem('cliente_portal_token', token);
        setCliente(clienteData);
        return true;
      }

      setError('Token de acceso inválido o expirado');
      return false;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Login con email y password
  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Buscar cliente por email
      const { data: clienteData, error: clienteError } = await supabase
        .from('crm_clientes')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('activo', true)
        .single();

      if (clienteError || !clienteData) {
        setError('Cliente no encontrado');
        return false;
      }

      // Verificar contraseña (hash simple para demo, usar bcrypt en producción)
      const { data: authData, error: authError } = await supabase
        .rpc('verificar_password_cliente', {
          p_cliente_id: clienteData.id,
          p_password: password
        });

      if (authError || !authData) {
        setError('Contraseña incorrecta');
        return false;
      }

      // Generar token de sesión
      const token = crypto.randomUUID();

      await supabase
        .from('crm_clientes')
        .update({
          token_acceso: token,
          ultimo_acceso: new Date().toISOString()
        })
        .eq('id', clienteData.id);

      localStorage.setItem('cliente_portal_token', token);
      setCliente({ ...clienteData, token_acceso: token });
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Solicitar acceso al portal
  const requestAccess = async (email: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Verificar si el cliente existe
      const { data: clienteData, error: clienteError } = await supabase
        .from('crm_clientes')
        .select('id, email, razon_social')
        .eq('email', email.toLowerCase())
        .eq('activo', true)
        .single();

      if (clienteError || !clienteData) {
        setError('No se encontró una cuenta con ese correo. Contacte a su ejecutivo.');
        return false;
      }

      // Generar token de acceso temporal
      const token = crypto.randomUUID();
      const expiracion = new Date();
      expiracion.setHours(expiracion.getHours() + 24);

      await supabase
        .from('crm_clientes')
        .update({
          token_acceso: token,
          token_expiracion: expiracion.toISOString()
        })
        .eq('id', clienteData.id);

      // En producción, enviar email con link de acceso
      // await enviarEmailAcceso(clienteData.email, token);

      return true;
    } catch (err: any) {
      setError(err.message || 'Error al solicitar acceso');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('cliente_portal_token');
    setCliente(null);
  };

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <ClienteAuthContext.Provider
      value={{
        cliente,
        loading,
        error,
        isAuthenticated: !!cliente,
        loginWithToken,
        loginWithEmail,
        requestAccess,
        logout
      }}
    >
      {children}
    </ClienteAuthContext.Provider>
  );
};

export const useClienteAuth = () => {
  const context = useContext(ClienteAuthContext);
  if (!context) {
    throw new Error('useClienteAuth debe usarse dentro de ClienteAuthProvider');
  }
  return context;
};

export default ClienteAuthContext;
