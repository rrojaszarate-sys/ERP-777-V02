import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, AlertTriangle, TrendingUp, Warehouse, ArrowUpCircle } from 'lucide-react';
import { useProductos } from '../hooks/useProductos';
import { useAlmacenes } from '../hooks/useInventario';
import { useAuth } from '../../../core/auth/AuthProvider';
import { supabase } from '../../../core/config/supabase';
import { useQuery } from '@tanstack/react-query';

interface StockPorAlmacen {
  producto_id: number;
  almacen_id: number;
  stock: number;
}

export const StockPage: React.FC = () => {
  const { user } = useAuth();
  const { productos } = useProductos();
  const { data: almacenes } = useAlmacenes();
  const [searchTerm, setSearchTerm] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="w-8 h-8" />
          Stock por Almacén
        </h1>
        <p className="text-gray-500 mt-1">Niveles de inventario en tiempo real</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Productos</p>
              <p className="text-2xl font-bold">{stats.totalProductos}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-100">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Con Stock</p>
              <p className="text-2xl font-bold">{stats.conStock}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-bold">{stats.stockBajo}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gray-100">
              <Package className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sin Stock</p>
              <p className="text-2xl font-bold">{stats.sinStock}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={(e) => setSoloStockBajo(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Solo stock bajo</span>
          </label>
        </div>
      </div>

      {/* Tabla de Stock */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min / Max
                </th>
                {almacenes?.map(almacen => (
                  <th key={almacen.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <Warehouse className="w-4 h-4" />
                      {almacen.nombre}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4 + (almacenes?.length || 0)} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((producto, idx) => {
                  const stockTotal = stockTotalPorProducto[producto.id!] || 0;
                  const estado = getStockEstado(producto);

                  return (
                    <motion.tr
                      key={producto.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{producto.nombre}</div>
                          <div className="text-sm text-gray-500">{producto.codigo}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-gray-900">
                          {stockTotal}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">{producto.unidad_medida}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {producto.stock_minimo} / {producto.stock_maximo}
                      </td>
                      {almacenes?.map(almacen => {
                        const stock = getStockPorAlmacen(producto.id!, almacen.id);
                        return (
                          <td key={almacen.id} className="px-6 py-4 text-center">
                            <span className={`font-medium ${stock > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                              {stock}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estado.bg} ${estado.color}`}>
                          {estado.label}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ayuda */}
      {productosFiltrados.length === 0 && searchTerm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            No se encontraron productos que coincidan con "{searchTerm}". Intenta con otro término de búsqueda.
          </p>
        </div>
      )}
    </div>
  );
};
