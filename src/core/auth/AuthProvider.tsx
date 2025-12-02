import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { Crown, User as UserIcon, Eye } from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  nombre: string;
  company_id: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: AuthUser | null; // Alias para compatibilidad
  setRole?: (role: string) => void;
  setCompanyId?: (companyId: string) => void;
  availableRoles?: string[];
  isAuthenticated: boolean;
  isDevelopment: boolean;
  login?: (email: string, password: string) => Promise<void>;
  logout?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAuthenticated: false,
  isDevelopment: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Company ID default para desarrollo
const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('Administrador');
  const [selectedCompanyId, setSelectedCompanyId] = useState(DEFAULT_COMPANY_ID);
  const isDevelopment = import.meta.env.VITE_SECURITY_MODE === 'development';

  const roleIcons = {
    'Administrador': Crown,
    'Ejecutivo': UserIcon,
    'Visualizador': Eye,
  };

  const getRoleUserName = (role: string) => {
    switch (role) {
      case 'Administrador': return 'Admin Usuario';
      case 'Ejecutivo': return 'Juan Carlos Martínez';
      case 'Visualizador': return 'María Elena García';
      default: return 'Usuario';
    }
  };

  useEffect(() => {
    // Always check auth state, but handle differently in development
    if (isDevelopment) {
      // In development, we can still check for real auth but fall back to mock
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser(session.user);
        }
        // If no real session, continue with mock user
      });
    } else {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }
  }, [isDevelopment]);

  const handleLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Modo desarrollo: selector de roles sin autenticación
  if (isDevelopment) {
    const developmentUser: AuthUser = {
      id: '00000000-0000-0000-0000-000000000001', // UUID que coincide con CREAR_USUARIO_DESARROLLO.sql
      email: `${selectedRole.toLowerCase().replace(' ', '_')}@madeevents.dev`,
      role: selectedRole,
      nombre: getRoleUserName(selectedRole),
      company_id: selectedCompanyId
    };

    return (
      <AuthContext.Provider value={{
        user: developmentUser,
        profile: developmentUser, // Alias para compatibilidad
        setRole: setSelectedRole,
        setCompanyId: setSelectedCompanyId,
        availableRoles: ['Administrador', 'Ejecutivo', 'Visualizador'],
        isAuthenticated: true,
        isDevelopment: true
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Modo producción: autenticación completa
  const productionUser = currentUser ? {
    id: currentUser.id,
    email: currentUser.email!,
    role: currentUser.user_metadata?.role || 'Visualizador', // Obtener del perfil real
    nombre: currentUser.user_metadata?.nombre || 'Usuario',
    company_id: currentUser.user_metadata?.company_id || DEFAULT_COMPANY_ID
  } : null;

  return (
    <AuthContext.Provider value={{
      user: productionUser,
      profile: productionUser, // Alias para compatibilidad
      login: handleLogin,
      logout: handleLogout,
      isAuthenticated: !!currentUser,
      isDevelopment: false
    }}>
      {children}
    </AuthContext.Provider>
  );
};