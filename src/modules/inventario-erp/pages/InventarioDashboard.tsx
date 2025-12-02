import React, { useMemo, useState } from 'react';
import {
  Package, Warehouse, TrendingUp, AlertTriangle, HelpCircle, BookOpen, ArrowRight,
  MapPin, Layers, ClipboardCheck, CalendarCheck, Box, Bell, CheckCircle, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAlmacenes, useMovimientos, useProductosBajoStock } from '../hooks/useInventario';
import { useProductos } from '../hooks/useProductos';
import { HelpButton } from '../../../shared/components/ui/HelpGuide';
import { InventarioHelpGuide } from '../components/InventarioHelpGuide';
import { useTheme } from '../../../shared/components/theme';
// TODO: Re-habilitar cuando los servicios estén completos
// import { useCompany } from '../../../core/context/CompanyContext';
// import { getEstadisticasAlertas, fetchAlertas } from '../services/alertasService';
// import { getChecklistsPendientes } from '../services/checklistService';
// import { fetchReservasProximas } from '../services/reservasService';
// import { fetchLotesProximosAVencer } from '../services/lotesService';
// import { fetchConteosPendientes } from '../services/conteosService';

export const InventarioDashboard: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const { data: almacenes } = useAlmacenes();
  const { data: movimientos } = useMovimientos();
  const { productos } = useProductos();
  const { data: productosBajoStock } = useProductosBajoStock();
  const { paletteConfig, isDark } = useTheme();
  // TODO: Re-habilitar cuando los servicios estén completos
  // const { selectedCompany } = useCompany();
  // const companyId = selectedCompany?.id || '';
  const companyId = '1'; // Hardcoded temporalmente

  // Nuevas queries para funcionalidades avanzadas - DESHABILITADAS
  const alertasStats = { total: 0, criticas: 0, altas: 0, medias: 0, bajas: 0 };
  const alertasActivas: any[] = [];
  const checklistsPendientes: any[] = [];

  // Queries de funcionalidades avanzadas - DESHABILITADAS
  const reservasProximas: any[] = [];
  const lotesVenciendo: any[] = [];
  const conteosPendientes: any[] = [];

  // Colores dinámicos
  const colors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    bg: isDark ? '#111827' : '#f9fafb',
    card: isDark ? '#1f2937' : '#ffffff',
    cardHover: isDark ? '#374151' : '#f3f4f6',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#f9fafb' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    textSecondary: isDark ? '#d1d5db' : '#4b5563',
  }), [paletteConfig, isDark]);

  // Calcular productos activos
  const productosActivos = useMemo(() => {
    return productos.filter(p => p.activo).length;
  }, [productos]);

  // Calcular movimientos del mes actual
  const movimientosDelMes = useMemo(() => {
    if (!movimientos) return 0;
    const now = new Date();
    const mesActual = now.getMonth();
    const añoActual = now.getFullYear();

    return movimientos.filter(m => {
      const fecha = new Date(m.created_at);
      return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
    }).length;
  }, [movimientos]);

  return (
    <div className="space-y-6 p-6 min-h-screen" style={{ backgroundColor: colors.bg }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.text }}>Inventario</h1>
          <p className="mt-1" style={{ color: colors.textMuted }}>Control de almacenes, stock y eventos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/inventario/configuracion')}
            className="px-3 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb', color: colors.textSecondary }}
            title="Configuración de submódulos"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={() => navigate('/inventario/alertas')}
            className="relative px-3 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: '#EF444420', color: '#EF4444' }}
          >
            <Bell size={20} />
            {(alertasStats?.activas || 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {alertasStats?.activas > 99 ? '99+' : alertasStats?.activas}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/inventario/movimientos/nuevo')}
            className="px-4 py-2 text-white rounded-lg font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: colors.primary }}
          >
            Nuevo Movimiento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Almacenes */}
        <div
          onClick={() => navigate('/inventario/almacenes')}
          className="rounded-xl shadow-sm p-6 cursor-pointer transition-all hover:shadow-md border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.primary}20` }}>
              <Warehouse className="w-6 h-6" style={{ color: colors.primary }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Almacenes</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{almacenes?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Movimientos del Mes */}
        <div
          onClick={() => navigate('/inventario/movimientos')}
          className="rounded-xl shadow-sm p-6 cursor-pointer transition-all hover:shadow-md border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Movimientos del Mes</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{movimientosDelMes}</p>
            </div>
          </div>
        </div>

        {/* Productos Activos */}
        <div
          onClick={() => navigate('/inventario/productos')}
          className="rounded-xl shadow-sm p-6 cursor-pointer transition-all hover:shadow-md border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.secondary}20` }}>
              <TrendingUp className="w-6 h-6" style={{ color: colors.secondary }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Productos Activos</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{productosActivos}</p>
            </div>
          </div>
        </div>

        {/* Stock Bajo */}
        <div
          onClick={() => navigate('/inventario/productos')}
          className="rounded-xl shadow-sm p-6 cursor-pointer transition-all hover:shadow-md border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Stock Bajo</p>
              <p className="text-2xl font-bold text-red-600">{productosBajoStock?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas avanzadas */}
      <div>
        <h2 className="text-lg font-bold mb-3" style={{ color: colors.text }}>
          Gestión Avanzada
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Alertas Activas */}
          <div
            onClick={() => navigate('/inventario/alertas')}
            className="rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md border relative"
            style={{ backgroundColor: colors.card, borderColor: (alertasStats?.activas || 0) > 0 ? '#EF4444' : colors.border }}
          >
            {(alertasStats?.criticas || 0) > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                {alertasStats?.criticas}
              </span>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#EF444420' }}>
                <Bell className="w-5 h-5" style={{ color: '#EF4444' }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: colors.text }}>{alertasStats?.activas || 0}</p>
                <p className="text-sm" style={{ color: colors.textMuted }}>Alertas Activas</p>
              </div>
            </div>
          </div>

          {/* Reservas Próximas */}
          <div
            onClick={() => navigate('/inventario/reservas')}
            className="rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#8B5CF620' }}>
                <CalendarCheck className="w-5 h-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: colors.text }}>{reservasProximas.length}</p>
                <p className="text-sm" style={{ color: colors.textMuted }}>Reservas Próximas</p>
              </div>
            </div>
          </div>

          {/* Lotes por Vencer */}
          <div
            onClick={() => navigate('/inventario/lotes')}
            className="rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md border"
            style={{ backgroundColor: colors.card, borderColor: lotesVenciendo.length > 0 ? '#F59E0B' : colors.border }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#F59E0B20' }}>
                <Layers className="w-5 h-5" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: colors.text }}>{lotesVenciendo.length}</p>
                <p className="text-sm" style={{ color: colors.textMuted }}>Lotes por Vencer</p>
              </div>
            </div>
          </div>

          {/* Conteos Pendientes */}
          <div
            onClick={() => navigate('/inventario/conteos')}
            className="rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#3B82F620' }}>
                <ClipboardCheck className="w-5 h-5" style={{ color: '#3B82F6' }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: colors.text }}>{conteosPendientes.length}</p>
                <p className="text-sm" style={{ color: colors.textMuted }}>Conteos Pendientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/inventario/ubicaciones')}
          className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#06B6D420' }}>
            <MapPin className="w-5 h-5" style={{ color: '#06B6D4' }} />
          </div>
          <span className="font-medium" style={{ color: colors.text }}>Ubicaciones</span>
          <ArrowRight className="w-4 h-4 ml-auto" style={{ color: colors.textMuted }} />
        </button>
        <button
          onClick={() => navigate('/inventario/kits')}
          className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#EC489920' }}>
            <Box className="w-5 h-5" style={{ color: '#EC4899' }} />
          </div>
          <span className="font-medium" style={{ color: colors.text }}>Kits Evento</span>
          <ArrowRight className="w-4 h-4 ml-auto" style={{ color: colors.textMuted }} />
        </button>
        <button
          onClick={() => navigate('/inventario/checklists')}
          className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#10B98120' }}>
            <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
          </div>
          <span className="font-medium" style={{ color: colors.text }}>Checklists</span>
          <ArrowRight className="w-4 h-4 ml-auto" style={{ color: colors.textMuted }} />
        </button>
        <button
          onClick={() => navigate('/inventario/etiquetas')}
          className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#F59E0B20' }}>
            <Package className="w-5 h-5" style={{ color: '#F59E0B' }} />
          </div>
          <span className="font-medium" style={{ color: colors.text }}>Etiquetas</span>
          <ArrowRight className="w-4 h-4 ml-auto" style={{ color: colors.textMuted }} />
        </button>
      </div>

      {/* Alertas y Checklists pendientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alertas recientes */}
        {alertasActivas.length > 0 && (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2" style={{ color: colors.text }}>
                <Bell className="w-5 h-5 text-red-500" />
                Alertas Recientes
              </h3>
              <button onClick={() => navigate('/inventario/alertas')} className="text-sm hover:underline" style={{ color: colors.primary }}>
                Ver todas
              </button>
            </div>
            <div className="space-y-2">
              {alertasActivas.slice(0, 3).map((alerta: any) => (
                <div key={alerta.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: colors.cardHover }}>
                  <div className="w-2 h-2 rounded-full" style={{
                    backgroundColor: alerta.prioridad === 'critica' ? '#DC2626' :
                      alerta.prioridad === 'alta' ? '#EF4444' :
                      alerta.prioridad === 'media' ? '#F59E0B' : '#10B981'
                  }} />
                  <p className="text-sm flex-1 truncate" style={{ color: colors.text }}>{alerta.mensaje}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklists pendientes */}
        {checklistsPendientes.length > 0 && (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2" style={{ color: colors.text }}>
                <CheckCircle className="w-5 h-5 text-blue-500" />
                Checklists Pendientes
              </h3>
              <button onClick={() => navigate('/inventario/checklists')} className="text-sm hover:underline" style={{ color: colors.primary }}>
                Ver todos
              </button>
            </div>
            <div className="space-y-2">
              {checklistsPendientes.slice(0, 3).map((checklist: any) => (
                <div key={checklist.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: colors.cardHover }}>
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                    backgroundColor: checklist.tipo === 'pre_evento' ? '#3B82F620' : '#10B98120',
                    color: checklist.tipo === 'pre_evento' ? '#3B82F6' : '#10B981',
                  }}>
                    {checklist.tipo === 'pre_evento' ? 'Pre' : 'Post'}
                  </span>
                  <p className="text-sm flex-1 truncate" style={{ color: colors.text }}>
                    {checklist.evento?.nombre_proyecto || `Evento ${checklist.evento_id}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Accesos rápidos con guía visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Guía */}
        <div 
          className="rounded-xl p-6 text-white"
          style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold mb-2">¿Primera vez aquí?</h3>
              <p className="text-white/80 text-sm mb-4">
                Aprende a gestionar tu inventario paso a paso con nuestra guía interactiva.
              </p>
              <button
                onClick={() => setShowHelp(true)}
                className="px-3 py-1.5 bg-white rounded-lg font-medium text-sm flex items-center gap-2"
                style={{ color: colors.primary }}
              >
                <BookOpen className="w-4 h-4" />
                Ver Guía
              </button>
            </div>
            <HelpCircle className="w-12 h-12 text-white/30" />
          </div>
        </div>

        {/* Agregar Productos */}
        <div 
          className="rounded-xl p-6 border-2 border-dashed"
          style={{ backgroundColor: colors.cardHover, borderColor: colors.border }}
        >
          <h3 className="text-lg font-bold mb-2" style={{ color: colors.text }}>Agregar Productos</h3>
          <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
            Crea productos manualmente o importa desde Excel.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/inventario/productos')}
              className="px-3 py-1.5 text-white rounded-lg font-medium text-sm flex items-center gap-1 hover:opacity-90"
              style={{ backgroundColor: colors.primary }}
            >
              <Package className="w-4 h-4" />
              Manual
            </button>
            <button
              onClick={() => navigate('/inventario/productos')}
              className="px-3 py-1.5 border rounded-lg font-medium text-sm hover:opacity-80"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Importar Excel
            </button>
          </div>
        </div>

        {/* Ver Stock */}
        <div 
          className="rounded-xl p-6 border-2 border-dashed"
          style={{ backgroundColor: colors.cardHover, borderColor: colors.border }}
        >
          <h3 className="text-lg font-bold mb-2" style={{ color: colors.text }}>Ver Stock Actual</h3>
          <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
            Consulta existencias y productos bajo mínimo.
          </p>
          <button
            onClick={() => navigate('/inventario/stock')}
            className="px-3 py-1.5 text-white rounded-lg font-medium text-sm flex items-center gap-1 hover:opacity-90"
            style={{ backgroundColor: colors.primary }}
          >
            <TrendingUp className="w-4 h-4" />
            Ver Stock
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Productos con stock bajo - alerta visual */}
      {productosBajoStock && productosBajoStock.length > 0 && (
        <div 
          className="rounded-xl p-4 border border-l-4 border-l-red-500"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold" style={{ color: colors.text }}>Productos con Stock Bajo</h3>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  {productosBajoStock.length} producto(s) requieren reabastecimiento
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/inventario/stock')}
              className="px-3 py-1.5 text-red-600 bg-red-50 rounded-lg font-medium text-sm hover:bg-red-100"
            >
              Ver Todos
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {productosBajoStock.slice(0, 3).map((producto: any) => (
              <div 
                key={producto.id} 
                className="flex items-center justify-between p-2 bg-red-50 rounded-lg"
              >
                <span className="font-medium" style={{ color: colors.text }}>{producto.nombre}</span>
                <span className="text-sm text-red-600">Stock: {producto.stock_actual || 0}</span>
              </div>
            ))}
            {productosBajoStock.length > 3 && (
              <p className="text-sm text-center pt-2" style={{ color: colors.textMuted }}>
                y {productosBajoStock.length - 3} más...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Botón de ayuda flotante */}
      <HelpButton onClick={() => setShowHelp(true)} label="¿Necesitas ayuda?" />

      {/* Modal de guía */}
      {showHelp && <InventarioHelpGuide onClose={() => setShowHelp(false)} />}
    </div>
  );
};
