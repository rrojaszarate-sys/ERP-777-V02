import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { Crown, User as UserIcon, Eye } from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  nombre: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setRole?: (role: string) => void;
  availableRoles?: string[];
  isAuthenticated: boolean;
  isDevelopment: boolean;
  login?: (email: string, password: string) => Promise<void>;
  logout?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('Administrador');
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
      nombre: getRoleUserName(selectedRole)
    };

    return (
      <AuthContext.Provider value={{
        user: developmentUser,
        setRole: setSelectedRole,
        availableRoles: ['Administrador', 'Ejecutivo', 'Visualizador'],
        isAuthenticated: true,
        isDevelopment: true
      }}>
        <div className="min-h-screen bg-gray-50">
          {/* Selector de rol flotante en desarrollo */}
          <div className="fixed top-4 right-4 z-50 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 shadow-lg">
            <div className="text-xs text-yellow-800 mb-2 font-medium flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
              MODO DESARROLLO
            </div>
            <select 
              value={selectedRole} 
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-white border border-yellow-300 rounded px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
            >
              {Object.keys(roleIcons).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <div className="text-xs text-yellow-700 mt-2">
              Usuario: {getRoleUserName(selectedRole)}
            </div>
          </div>
          {children}
        </div>
      </AuthContext.Provider>
    );
  }

  // Modo producción: autenticación completa
  const productionUser = currentUser ? {
    id: currentUser.id,
    email: currentUser.email!,
    role: currentUser.user_metadata?.role || 'Visualizador', // Obtener del perfil real
    nombre: currentUser.user_metadata?.nombre || 'Usuario'
  } : null;

  return (
    <AuthContext.Provider value={{
      user: productionUser,
      login: handleLogin,
      logout: handleLogout,
      isAuthenticated: !!currentUser,
      isDevelopment: false
    }}>
      {children}
    </AuthContext.Provider>
  );
};