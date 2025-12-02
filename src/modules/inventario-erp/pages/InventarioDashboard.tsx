import React, { useMemo, useState } from 'react';
import { Package, Warehouse, TrendingUp, AlertTriangle, HelpCircle, BookOpen, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAlmacenes, useMovimientos, useProductosBajoStock } from '../hooks/useInventario';
import { useProductos } from '../hooks/useProductos';
import { HelpButton } from '../../../shared/components/ui/HelpGuide';
import { InventarioHelpGuide } from '../components/InventarioHelpGuide';
import { useTheme } from '../../../shared/components/theme';

export const InventarioDashboard: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const { data: almacenes } = useAlmacenes();
  const { data: movimientos } = useMovimientos();
  const { productos } = useProductos();
  const { data: productosBajoStock } = useProductosBajoStock();
  const { paletteConfig, isDark } = useTheme();

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
          <p className="mt-1" style={{ color: colors.textMuted }}>Control de almacenes y movimientos</p>
        </div>
        <button
          onClick={() => navigate('/inventario/movimientos/nuevo')}
          className="px-4 py-2 text-white rounded-lg font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: colors.primary }}
        >
          Nuevo Movimiento
        </button>
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
