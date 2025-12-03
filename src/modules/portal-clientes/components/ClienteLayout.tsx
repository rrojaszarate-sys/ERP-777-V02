/**
 * Layout del Portal de Clientes - FASE 5.2
 * Estructura principal con sidebar y header
 */
import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem
} from '@nextui-org/react';
import {
  Home,
  FileText,
  Calendar,
  DollarSign,
  Download,
  Bell,
  LogOut,
  User,
  Menu,
  X,
  Building2,
  HelpCircle
} from 'lucide-react';
import { useClienteAuth } from '../context/ClienteAuthContext';

const menuItems = [
  { path: '/portal-cliente', label: 'Inicio', icon: Home },
  { path: '/portal-cliente/facturas', label: 'Mis Facturas', icon: FileText },
  { path: '/portal-cliente/eventos', label: 'Mis Eventos', icon: Calendar },
  { path: '/portal-cliente/pagos', label: 'Estado de Cuenta', icon: DollarSign },
  { path: '/portal-cliente/documentos', label: 'Documentos', icon: Download },
];

export function ClienteLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cliente, logout } = useClienteAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/portal-cliente/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r">
        {/* Logo */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Portal Cliente</h1>
              <p className="text-xs text-gray-500">MADE ERP</p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Usuario */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              name={cliente?.razon_social?.charAt(0) || 'C'}
              size="sm"
              className="bg-primary text-white"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {cliente?.razon_social || 'Cliente'}
              </p>
              <p className="text-xs text-gray-500 truncate">{cliente?.email}</p>
            </div>
          </div>
          <Button
            variant="flat"
            color="danger"
            size="sm"
            className="w-full"
            startContent={<LogOut className="w-4 h-4" />}
            onPress={handleLogout}
          >
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Sidebar - Mobile (Overlay) */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            {/* Header Mobile */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                <span className="font-bold">Portal Cliente</span>
              </div>
              <Button
                isIconOnly
                variant="light"
                onPress={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Navegación Mobile */}
            <nav className="p-4">
              <ul className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <Navbar maxWidth="full" className="bg-white border-b">
          <NavbarContent justify="start">
            <Button
              isIconOnly
              variant="light"
              className="lg:hidden"
              onPress={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <NavbarBrand className="lg:hidden">
              <Building2 className="w-6 h-6 text-primary" />
              <span className="font-bold ml-2">Portal Cliente</span>
            </NavbarBrand>
          </NavbarContent>

          <NavbarContent justify="end">
            <NavbarItem>
              <Button
                isIconOnly
                variant="light"
                onPress={() => navigate('/portal-cliente/ayuda')}
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </NavbarItem>

            <NavbarItem>
              <Button
                isIconOnly
                variant="light"
                onPress={() => navigate('/portal-cliente/notificaciones')}
              >
                <Bell className="w-5 h-5" />
              </Button>
            </NavbarItem>

            <NavbarItem className="hidden lg:flex">
              <Dropdown>
                <DropdownTrigger>
                  <Button variant="light" className="gap-2">
                    <Avatar
                      name={cliente?.razon_social?.charAt(0) || 'C'}
                      size="sm"
                      className="bg-primary text-white"
                    />
                    <span className="hidden md:inline">
                      {cliente?.razon_social?.substring(0, 20) || 'Cliente'}
                    </span>
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Usuario">
                  <DropdownItem
                    key="profile"
                    startContent={<User className="w-4 h-4" />}
                    onPress={() => navigate('/portal-cliente/perfil')}
                  >
                    Mi Perfil
                  </DropdownItem>
                  <DropdownItem
                    key="logout"
                    color="danger"
                    startContent={<LogOut className="w-4 h-4" />}
                    onPress={handleLogout}
                  >
                    Cerrar Sesión
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </NavbarItem>
          </NavbarContent>
        </Navbar>

        {/* Contenido de la página */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t py-4 px-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} MADE ERP - Portal de Clientes</p>
        </footer>
      </div>
    </div>
  );
}

export default ClienteLayout;
