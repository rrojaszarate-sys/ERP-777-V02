/**
 * Header del Portal de Solicitudes
 * Navegación y menú de usuario
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../context/PortalAuthContext';
import {
  FileText,
  Plus,
  CheckSquare,
  LogOut,
  User,
  Menu,
  X,
  Bell,
  Home,
  MessageCircle,
  BarChart3
} from 'lucide-react';

export const PortalHeader: React.FC = () => {
  const { usuario, logout } = usePortalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  const navItems = [
    { path: '/portal', icon: Home, label: 'Inicio', exact: true },
    { path: '/portal/solicitudes', icon: FileText, label: 'Mis Solicitudes' },
    { path: '/portal/nueva', icon: Plus, label: 'Nueva Solicitud' },
    { path: '/portal/mensajes', icon: MessageCircle, label: 'Mensajes' },
    { path: '/portal/reportes', icon: BarChart3, label: 'Reportes' },
  ];

  // Solo mostrar aprobaciones si el usuario puede aprobar
  if (usuario?.puede_aprobar) {
    navItems.splice(3, 0, { path: '/portal/aprobaciones', icon: CheckSquare, label: 'Aprobaciones' });
  }

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y navegación desktop */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/portal" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900 hidden sm:block">
                  Portal de Solicitudes
                </span>
              </Link>
            </div>

            {/* Navegación desktop */}
            <nav className="hidden md:ml-8 md:flex md:space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.path, item.exact)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Lado derecho */}
          <div className="flex items-center gap-4">
            {/* Notificaciones */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Menú de usuario desktop */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {usuario?.avatar_url ? (
                  <img
                    src={usuario.avatar_url}
                    alt={usuario.nombre_completo}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {usuario?.nombre_completo?.split(' ')[0]}
                </span>
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {usuario?.nombre_completo}
                      </p>
                      <p className="text-xs text-gray-500">{usuario?.email}</p>
                      {usuario?.departamento && (
                        <p className="text-xs text-gray-400 mt-1">
                          {usuario.departamento} • {usuario.puesto}
                        </p>
                      )}
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Botón menú móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${
                  isActive(item.path, item.exact)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Info usuario móvil */}
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              {usuario?.avatar_url ? (
                <img
                  src={usuario.avatar_url}
                  alt={usuario.nombre_completo}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {usuario?.nombre_completo}
                </p>
                <p className="text-xs text-gray-500">{usuario?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default PortalHeader;
