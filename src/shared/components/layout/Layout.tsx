import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Home, Calendar, Package, ShoppingCart, Calculator,
  Menu, Search, Bell, Settings, LogOut, Clock, ChevronDown,
  List, DollarSign, BarChart3, CreditCard, FolderOpen, Users,
  FileText, BookOpen, Receipt, Target, Truck, Warehouse, Briefcase,
  FileSpreadsheet, FolderKanban, CheckCircle, Landmark, PieChart, Plug, Brain
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { APP_CONFIG } from '../../../core/config/constants';
import { ThemePalettePicker } from '../theme/ThemePalettePicker';
import { CompanySelector } from '../CompanySelector';

export const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isDevelopment, logout, setCompanyId } = useAuth();
  const location = useLocation();

  const modules = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: Home,
      path: '/',
      active: true,
      color: 'text-mint-600'
    },
    {
      id: 'eventos-erp',
      name: 'Eventos-ERP',
      icon: Calendar,
      active: true,
      color: 'text-orange-600',
      submenu: [
        { name: 'Lista de Eventos', path: '/eventos-erp', icon: List },
        { name: 'Clientes', path: '/eventos-erp/clientes', icon: Users },
        { name: 'Proyectos y Gantt', path: '/eventos-erp/proyectos', icon: FolderKanban },
        { name: 'Análisis Financiero', path: '/eventos-erp/analisis-financiero', icon: BarChart3 },
        { name: 'Flujo de Estados', path: '/eventos-erp/workflow', icon: Settings },
        { name: 'Catálogos', path: '/eventos-erp/catalogos', icon: FolderOpen }
      ]
    },
    // OCULTO: Módulo de producción - usar Eventos-ERP
    // {
    //   id: 'eventos',
    //   name: 'Eventos (Producción)',
    //   icon: Calendar,
    //   active: false,
    //   color: 'text-blue-600',
    //   submenu: [
    //     { name: 'Lista de Eventos', path: '/eventos', icon: List },
    //     { name: 'Clientes', path: '/eventos/clientes', icon: Users },
    //     { name: 'Proyectos y Gantt', path: '/eventos/proyectos', icon: FolderKanban },
    //     { name: 'Análisis Financiero', path: '/eventos/analisis-financiero', icon: BarChart3 },
    //     { name: 'Flujo de Estados', path: '/eventos/workflow', icon: Settings },
    //     { name: 'Catálogos', path: '/eventos/catalogos', icon: FolderOpen }
    //   ]
    // },
    {
      id: 'contabilidad',
      name: 'Contabilidad',
      icon: Calculator,
      active: true,
      color: 'text-green-600',
      submenu: [
        { name: 'Dashboard', path: '/contabilidad', icon: Home },
        { name: 'Gastos No Impactados', path: '/contabilidad/gastos-no-impactados', icon: DollarSign },
        { name: 'Pólizas', path: '/contabilidad/polizas', icon: FileText },
        { name: 'Plan de Cuentas', path: '/contabilidad/plan-cuentas', icon: BookOpen },
        { name: 'Reportes', path: '/contabilidad/reportes', icon: Receipt }
      ]
    },
    {
      id: 'crm',
      name: 'CRM y Ventas',
      icon: Users,
      active: true,
      color: 'text-purple-600',
      submenu: [
        { name: 'Dashboard', path: '/crm', icon: Home },
        { name: 'Clientes', path: '/crm/clientes', icon: Users },
        { name: 'Cotizaciones', path: '/crm/cotizaciones', icon: FileText },
        { name: 'Pipeline', path: '/crm/pipeline', icon: Target }
      ]
    },
    {
      id: 'proveedores',
      name: 'Proveedores',
      icon: Truck,
      active: true,
      color: 'text-orange-600',
      submenu: [
        { name: 'Dashboard', path: '/proveedores', icon: Home },
        { name: 'Catálogo', path: '/proveedores/catalogo', icon: Users },
        { name: 'Órdenes de Compra', path: '/proveedores/ordenes', icon: ShoppingCart }
      ]
    },
    {
      id: 'compras',
      name: 'Compras',
      icon: ShoppingCart,
      active: true,
      color: 'text-sky-600',
      submenu: [
        { name: 'Dashboard', path: '/compras', icon: Home },
        { name: 'Órdenes de Compra', path: '/compras/ordenes', icon: ShoppingCart },
        { name: 'Requisiciones', path: '/compras/requisiciones', icon: FileText },
        { name: 'Recepciones', path: '/compras/recepciones', icon: Package },
        { name: 'Tipos de Almacén', path: '/compras/tipos-almacen', icon: Settings }
      ]
    },
    {
      id: 'inventario',
      name: 'Inventario',
      icon: Warehouse,
      active: true,
      color: 'text-teal-600',
      submenu: [
        { name: 'Dashboard', path: '/inventario', icon: Home },
        { name: 'Productos', path: '/inventario/productos', icon: Package },
        { name: 'Almacenes', path: '/inventario/almacenes', icon: Warehouse },
        { name: 'Ubicaciones', path: '/inventario/ubicaciones', icon: FolderOpen },
        { name: 'Movimientos', path: '/inventario/movimientos', icon: List },
        { name: 'Stock', path: '/inventario/stock', icon: BarChart3 },
        { name: 'Lotes', path: '/inventario/lotes', icon: Package },
        { name: 'Conteos', path: '/inventario/conteos', icon: CheckCircle },
        { name: 'Reservas', path: '/inventario/reservas', icon: Calendar },
        { name: 'Kits Evento', path: '/inventario/kits', icon: FolderKanban },
        { name: 'Checklists', path: '/inventario/checklists', icon: CheckCircle },
        { name: 'Alertas', path: '/inventario/alertas', icon: Bell },
        { name: 'Documentos', path: '/inventario/documentos', icon: FileText }
      ]
    },
    {
      id: 'rrhh',
      name: 'RRHH y Nómina',
      icon: Briefcase,
      active: true,
      color: 'text-pink-600',
      submenu: [
        { name: 'Dashboard', path: '/rrhh', icon: Home },
        { name: 'Empleados', path: '/rrhh/empleados', icon: Users },
        { name: 'Nómina', path: '/rrhh/nomina', icon: DollarSign }
      ]
    },
    {
      id: 'facturacion',
      name: 'Facturación',
      icon: FileSpreadsheet,
      active: true,
      color: 'text-indigo-600',
      submenu: [
        { name: 'Dashboard', path: '/facturacion', icon: Home },
        { name: 'Facturas', path: '/facturacion/facturas', icon: FileText },
        { name: 'Configuración', path: '/facturacion/configuracion', icon: Settings }
      ]
    },
    {
      id: 'proyectos',
      name: 'Proyectos',
      icon: FolderKanban,
      active: true,
      color: 'text-violet-600',
      submenu: [
        { name: 'Dashboard', path: '/proyectos', icon: Home },
        { name: 'Lista de Proyectos', path: '/proyectos/lista', icon: List },
        { name: 'Tareas', path: '/proyectos/tareas', icon: CheckCircle }
      ]
    },
    {
      id: 'tesoreria',
      name: 'Tesorería',
      icon: Landmark,
      active: true,
      color: 'text-emerald-600',
      submenu: [
        { name: 'Dashboard', path: '/tesoreria', icon: Home },
        { name: 'Cuentas Bancarias', path: '/tesoreria/cuentas', icon: CreditCard },
        { name: 'Movimientos', path: '/tesoreria/movimientos', icon: DollarSign }
      ]
    },
    {
      id: 'reportes',
      name: 'Reportes y BI',
      icon: PieChart,
      active: true,
      color: 'text-cyan-600',
      submenu: [
        { name: 'Dashboard', path: '/reportes', icon: Home }
      ]
    },
    {
      id: 'integraciones',
      name: 'Integraciones',
      icon: Plug,
      active: true,
      color: 'text-amber-600',
      submenu: [
        { name: 'Dashboard', path: '/integraciones', icon: Home }
      ]
    },
    {
      id: 'ia',
      name: 'IA y Automatización',
      icon: Brain,
      active: true,
      color: 'text-fuchsia-600',
      submenu: [
        { name: 'Dashboard', path: '/ia', icon: Home }
      ]
    },
    {
      id: 'desarrollo',
      name: 'Desarrollo',
      icon: BookOpen,
      active: true,
      color: 'text-red-600',
      submenu: [
        { name: 'Documentación', path: '/desarrollo', icon: BookOpen },
        { name: 'Solicitudes de Acceso', path: '/admin/usuarios', icon: Users },
        { name: 'Generador de Datos', path: '/admin/data-seeder', icon: Settings },
        { name: 'Catálogos', path: '/admin/catalogos', icon: FolderOpen }
      ]
    }
  ];

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen theme-bg-secondary flex">
      {/* Sidebar */}
      <motion.div 
        className={`theme-bg-card shadow-lg ${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 relative z-10`}
        initial={{ x: -250 }}
        animate={{ x: 0 }}
      >
        {/* Logo */}
        <div className="p-4 border-b theme-border-primary">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-500)' }}>
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1 className="font-bold theme-text-primary">{APP_CONFIG.name}</h1>
                  <p className="text-xs theme-text-secondary">{APP_CONFIG.version}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1">
          {modules.map(module => (
            <ModuleNavItem 
              key={module.id} 
              module={module} 
              collapsed={sidebarCollapsed}
              isActive={isActivePath(module.path || '/')}
            />
          ))}
        </nav>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="theme-bg-card shadow-sm border-b theme-border-primary px-6 py-4">
          <div className="flex items-center justify-between min-h-[60px]">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="theme-icon-secondary theme-hover transition-colors p-2 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Breadcrumbs />
            </div>
            
            <div className="flex items-center space-x-3">
              <GlobalSearch />
              <NotificationBell />
              {user?.company_id && setCompanyId && (
                <CompanySelector
                  currentCompanyId={user.company_id}
                  onCompanyChange={setCompanyId}
                />
              )}
              <ThemePalettePicker />
              <UserMenu user={user} isDevelopment={isDevelopment} logout={logout} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const ModuleNavItem: React.FC<{
  module: any;
  collapsed: boolean;
  isActive: boolean;
}> = ({ module, collapsed, isActive }) => {
  const [showSubmenu, setShowSubmenu] = useState(false);
  const navigate = useNavigate();

  if (module.status === 'coming-soon') {
    return (
      <div className="mb-2 relative group">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 opacity-60">
          <module.icon className="w-5 h-5 text-gray-400" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                className="flex-1"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
              >
                <span className="text-gray-500">{module.name}</span>
                <div className="text-xs text-gray-400 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Próximamente</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {collapsed && (
          <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            {module.name} - Próximamente
          </div>
        )}
      </div>
    );
  }

  const handleMainClick = () => {
    if (module.path && !module.submenu) {
      // Si tiene path y no tiene submenu, navegar directamente
      navigate(module.path);
    } else if (module.submenu) {
      // Si tiene submenu, solo toggle del submenu
      setShowSubmenu(!showSubmenu);
    }
  };

  return (
    <div className="mb-2">
      <button
        onClick={handleMainClick}
        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-mint-50 text-mint-700 border-l-4 border-mint-500'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center space-x-3">
          <module.icon className={`w-5 h-5 ${module.color || 'text-current'}`} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-medium"
              >
                {module.name}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {!collapsed && module.submenu && (
          <ChevronDown className={`w-4 h-4 transition-transform ${
            showSubmenu ? 'rotate-180' : ''
          }`} />
        )}
      </button>

      {/* Submenu */}
      {module.submenu && showSubmenu && !collapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-1 ml-8 space-y-1"
        >
          {module.submenu.map((item: any, index: number) => (
            <Link
              key={index}
              to={item.path}
              className="flex items-center space-x-2 p-2 text-sm theme-text-secondary hover:theme-text-accent hover:theme-hover rounded"
            >
              <item.icon className="w-4 h-4 theme-icon-secondary hover:theme-icon-interactive" />
              <span>{item.name}</span>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
};

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  return (
    <nav className="text-sm">
      <Link to="/" className="theme-text-secondary hover:theme-text-accent transition-colors">Inicio</Link>
      {pathnames.map((name, index) => (
        <span key={index} className="theme-text-tertiary">
          {' / '}
          <span className="theme-text-primary capitalize">{name}</span>
        </span>
      ))}
    </nav>
  );
};

const GlobalSearch: React.FC = () => {
  return (
    <div className="relative">
      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 theme-icon-tertiary" />
      <input
        type="text"
        placeholder="Búsqueda global..."
        className="pl-10 pr-4 py-2 border theme-border-primary rounded-lg focus:ring-2 theme-bg-card theme-text-primary w-64"
        style={{ 
          '--tw-ring-color': 'var(--theme-primary-500)',
          focusBorderColor: 'var(--theme-primary-500)'
        } as React.CSSProperties}
      />
    </div>
  );
};

const NotificationBell: React.FC = () => {
  return (
    <button className="relative theme-icon-secondary hover:theme-icon-interactive transition-colors">
      <Bell className="w-5 h-5" />
      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--theme-error)' }}></div>
    </button>
  );
};

const UserMenu: React.FC<{
  user: any;
  isDevelopment: boolean;
  logout?: () => void;
}> = ({ user, isDevelopment, logout }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-3 theme-text-primary hover:theme-text-accent transition-colors"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-500)' }}>
          <span className="text-white text-sm font-medium">
            {user?.nombre?.charAt(0) || 'U'}
          </span>
        </div>
        <div className="text-left">
          <div className="text-sm font-medium theme-text-primary">{user?.nombre}</div>
          <div className="text-xs theme-text-secondary">{user?.role}</div>
        </div>
        <ChevronDown className="w-4 h-4 theme-icon-secondary" />
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 theme-bg-card rounded-lg shadow-lg border theme-border-primary py-2 z-50"
          >
            <div className="px-4 py-2 border-b theme-border-primary">
              <div className="text-sm font-medium theme-text-primary">{user?.nombre}</div>
              <div className="text-xs theme-text-secondary">{user?.email}</div>
              {isDevelopment && (
                <div className="text-xs font-medium mt-1 theme-warning-text">
                  Modo Desarrollo
                </div>
              )}
            </div>
            
            <button className="w-full text-left px-4 py-2 text-sm theme-text-primary theme-hover flex items-center space-x-2">
              <Settings className="w-4 h-4 theme-icon-secondary" />
              <span>Configuración</span>
            </button>
            
            {!isDevelopment && logout && (
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm theme-error-text hover:theme-error flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};