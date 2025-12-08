import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, AlertTriangle, TrendingUp, Warehouse, ArrowUpCircle } from 'lucide-react';
import { useProductos } from '../hooks/useProductos';
import { useAlmacenes } from '../hooks/useInventario';
import { useAuth } from '../../../core/auth/AuthProvider';
import { useTheme } from '../../../shared/components/theme';
import { supabase } from '../../../core/config/supabase';
import { useQuery } from '@tanstack/react-query';

interface StockPorAlmacen {
  producto_id: number;
  almacen_id: number;
  stock: number;
}

export const StockPage: React.FC = () => {
  const { user } = useAuth();
  const { paletteConfig, isDark } = useTheme();
  const { productos } = useProductos();
  const { data: almacenes } = useAlmacenes();
  const [searchTerm, setSearchTerm] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

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

  // Calcular stock por producto y almacén desde movimientos
  const { data: stockData, isLoading } = useQuery({
    queryKey: ['stock-por-almacen', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];

      const { data: movimientos, error } = await supabase
        .from('movimientos_inventario_erp')
        .select('producto_id, almacen_id, tipo, cantidad')
        .eq('company_id', user.company_id);

      if (error) throw error;

      // Calcular stock por producto y almacén
      const stockMap: Record<string, number> = {};

      movimientos?.forEach(mov => {
        const key = `${mov.producto_id}-${mov.almacen_id}`;
        if (!stockMap[key]) {
          stockMap[key] = 0;
        }

        if (mov.tipo === 'entrada' || mov.tipo === 'ajuste') {
          stockMap[key] += mov.cantidad;
        } else if (mov.tipo === 'salida') {
          stockMap[key] -= mov.cantidad;
        }
      });

      // Convertir a array
      const stockArray: StockPorAlmacen[] = Object.entries(stockMap).map(([key, stock]) => {
        const [producto_id, almacen_id] = key.split('-').map(Number);
        return { producto_id, almacen_id, stock };
      });

      return stockArray;
    },
    enabled: !!user?.company_id
  });

  // Calcular stock total por producto
  const stockTotalPorProducto = useMemo(() => {
    const totales: Record<number, number> = {};
    stockData?.forEach(item => {
      if (!totales[item.producto_id]) {
        totales[item.producto_id] = 0;
      }
      totales[item.producto_id] += item.stock;
    });
    return totales;
  }, [stockData]);

  // Filtrar productos
  const productosFiltrados = useMemo(() => {
    let filtrados = productos;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtrados = filtrados.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por stock bajo
    if (soloStockBajo) {
      filtrados = filtrados.filter(p => {
        const stockTotal = stockTotalPorProducto[p.id!] || 0;
        return stockTotal < p.stock_minimo;
      });
    }

    return filtrados;
  }, [productos, searchTerm, soloStockBajo, stockTotalPorProducto]);

  // Estadísticas
  const stats = useMemo(() => {
    const totalProductos = productos.length;
    const conStock = productos.filter(p => (stockTotalPorProducto[p.id!] || 0) > 0).length;
    const stockBajo = productos.filter(p => {
      const stockTotal = stockTotalPorProducto[p.id!] || 0;
      return stockTotal < p.stock_minimo && stockTotal > 0;
    }).length;
    const sinStock = productos.filter(p => (stockTotalPorProducto[p.id!] || 0) === 0).length;

    return { totalProductos, conStock, stockBajo, sinStock };
  }, [productos, stockTotalPorProducto]);

  const getStockPorAlmacen = (productoId: number, almacenId: number) => {
    const item = stockData?.find(s => s.producto_id === productoId && s.almacen_id === almacenId);
    return item?.stock || 0;
  };

  const getStockEstado = (producto: any) => {
    const stockTotal = stockTotalPorProducto[producto.id!] || 0;

    if (stockTotal === 0) {
      return { color: 'text-gray-500', bg: 'bg-gray-100', label: 'Sin stock' };
    } else if (stockTotal < producto.stock_minimo) {
      return { color: 'text-red-600', bg: 'bg-red-100', label: 'Stock bajo' };
    } else if (stockTotal >= producto.stock_maximo) {
      return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Stock alto' };
    } else {
      return { color: 'text-green-600', bg: 'bg-green-100', label: 'Stock normal' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.primary }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 p-6" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
          <Package className="w-8 h-8" />
          Stock por Almacén
        </h1>
        <p className="mt-1" style={{ color: colors.textMuted }}>Niveles de inventario en tiempo real</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg shadow p-6"
          style={{ backgroundColor: colors.card }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.primary}20` }}>
              <Package className="w-6 h-6" style={{ color: colors.primary }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Total Productos</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.totalProductos}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg shadow p-6"
          style={{ backgroundColor: colors.card }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-100">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Con Stock</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.conStock}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg shadow p-6"
          style={{ backgroundColor: colors.card }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Stock Bajo</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.stockBajo}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg shadow p-6"
          style={{ backgroundColor: colors.card }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: isDark ? '#374151' : '#f3f4f6' }}>
              <Package className="w-6 h-6" style={{ color: colors.textMuted }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Sin Stock</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.sinStock}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg shadow p-4" style={{ backgroundColor: colors.card }}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: colors.textMuted }} />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
              style={{ 
                backgroundColor: colors.bg, 
                borderColor: colors.border, 
                color: colors.text,
                outlineColor: colors.primary 
              }}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={(e) => setSoloStockBajo(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: colors.primary }}
            />
            <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>Solo stock bajo</span>
          </label>
        </div>
      </div>

      {/* Tabla de Stock */}
      <div className="rounded-lg shadow overflow-hidden" style={{ backgroundColor: colors.card }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: isDark ? '#374151' : '#f9fafb', borderBottom: `1px solid ${colors.border}` }}>
              <tr>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Producto
                </th>
                <th className="px-2 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Stock Total
                </th>
                <th className="px-2 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Min / Max
                </th>
                {almacenes?.map(almacen => (
                  <th key={almacen.id} className="px-2 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                    <div className="flex items-center justify-center gap-1">
                      <Warehouse className="w-3 h-3" />
                      <span className="truncate max-w-[80px]" title={almacen.nombre}>{almacen.nombre}</span>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: colors.border }}>
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4 + (almacenes?.length || 0)} className="px-2 py-4 text-center text-xs" style={{ color: colors.textMuted }}>
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((producto) => {
                  const stockTotal = stockTotalPorProducto[producto.id!] || 0;
                  const estado = getStockEstado(producto);

                  return (
                    <tr
                      key={producto.id}
                      className="transition-colors hover:bg-gray-50"
                      style={{ backgroundColor: colors.card }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.cardHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.card}
                    >
                      <td className="px-2 py-1">
                        <div>
                          <div className="font-medium text-xs truncate max-w-[180px]" style={{ color: colors.text }} title={producto.nombre}>{producto.nombre}</div>
                          <div className="text-[10px]" style={{ color: colors.textMuted }}>{producto.codigo}</div>
                        </div>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className="text-sm font-bold" style={{ color: colors.text }}>
                          {stockTotal}
                        </span>
                        <span className="text-[10px] ml-1" style={{ color: colors.textMuted }}>{producto.unidad_medida}</span>
                      </td>
                      <td className="px-2 py-1 text-center text-[10px]" style={{ color: colors.textSecondary }}>
                        {producto.stock_minimo} / {producto.stock_maximo}
                      </td>
                      {almacenes?.map(almacen => {
                        const stock = getStockPorAlmacen(producto.id!, almacen.id);
                        return (
                          <td key={almacen.id} className="px-2 py-1 text-center">
                            <span className="font-medium text-xs" style={{ color: stock > 0 ? colors.text : colors.textMuted }}>
                              {stock}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1 text-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${estado.bg} ${estado.color}`}>
                          {estado.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ayuda */}
      {productosFiltrados.length === 0 && searchTerm && (
        <div className="rounded-lg p-4" style={{ backgroundColor: `${colors.primary}10`, border: `1px solid ${colors.primary}30` }}>
          <p className="text-sm" style={{ color: colors.primary }}>
            No se encontraron productos que coincidan con "{searchTerm}". Intenta con otro término de búsqueda.
          </p>
        </div>
      )}
    </div>
  );
};
