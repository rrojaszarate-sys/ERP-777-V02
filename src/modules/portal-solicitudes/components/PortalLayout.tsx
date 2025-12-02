/**
 * Layout del Portal de Solicitudes
 * Wrapper con autenticación y providers
 */

import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { PortalAuthProvider, usePortalAuth } from '../context/PortalAuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Query client para el portal
const portalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Componente interno que verifica autenticación
const PortalAuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = usePortalAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
};

// Layout principal
export const PortalLayout: React.FC = () => {
  return (
    <QueryClientProvider client={portalQueryClient}>
      <PortalAuthProvider>
        <PortalAuthGuard>
          <Outlet />
        </PortalAuthGuard>
        <Toaster position="top-right" />
      </PortalAuthProvider>
    </QueryClientProvider>
  );
};

// Layout para páginas públicas (login)
export const PortalPublicLayout: React.FC = () => {
  return (
    <QueryClientProvider client={portalQueryClient}>
      <PortalAuthProvider>
        <Outlet />
        <Toaster position="top-right" />
      </PortalAuthProvider>
    </QueryClientProvider>
  );
};

export default PortalLayout;
