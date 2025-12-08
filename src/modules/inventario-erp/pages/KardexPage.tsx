/**
 * KardexPage - Página de Kardex de Inventario
 * Vista detallada de movimientos por producto con saldo acumulado
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Download,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  CalendarDays,
  Filter,
  Printer
} from 'lucide-react';
import { supabase } from '../../../core/config/supabase';
import { useTheme } from '../../../shared/components/theme';
import { 
  obtenerKardex, 
  exportarKardexCSV,
  type KardexProducto,
  type FiltrosKardex 
} from '../services/kardexService';

// Componente de fila de movimiento
const FilaMovimiento: React.FC<{
  movimiento: KardexProducto['movimientos'][0];
  unidad: string;
}> = ({ movimiento, unidad }) => {
  const esEntrada = movimiento.tipo === 'entrada' || movimiento.tipo === 'ajuste_positivo';
  
  const tipoConfig: Record<string, { color: string; texto: string; icon: React.ElementType }> = {
    'entrada': { color: 'text-green-600 bg-green-50', texto: 'Entrada', icon: ArrowDown },
    'salida': { color: 'text-red-600 bg-red-50', texto: 'Salida', icon: ArrowUp },
    'ajuste_positivo': { color: 'text-blue-600 bg-blue-50', texto: 'Ajuste +', icon: ArrowDown },
    'ajuste_negativo': { color: 'text-orange-600 bg-orange-50', texto: 'Ajuste -', icon: ArrowUp }
  };

  const config = tipoConfig[movimiento.tipo] || tipoConfig['entrada'];
  const Icon = config.icon;

  return (
    <tr className="hover:bg-gray-50 border-b">
      <td className="px-2 py-1 text-[10px] text-gray-600">
        {new Date(movimiento.fecha).toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })}
      </td>
      <td className="px-2 py-1">
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.color}`}>
          <Icon className="w-2.5 h-2.5" />
          {config.texto}
        </span>
      </td>
      <td className="px-2 py-1 text-[10px]">
        {movimiento.documento_tipo ? (
          <span className="text-gray-800">{movimiento.documento_tipo}</span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-2 py-1 text-[10px] text-gray-600 truncate max-w-[80px]" title={movimiento.almacen}>
        {movimiento.almacen}
      </td>
      <td className="px-2 py-1 text-right text-xs font-medium">
        {esEntrada ? (
          <span className="text-green-600">+{movimiento.cantidad}</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="px-2 py-1 text-right text-xs font-medium">
        {!esEntrada ? (
          <span className="text-red-600">-{movimiento.cantidad}</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="px-2 py-1 text-right">
        <span className="font-bold text-xs text-gray-800">{movimiento.saldo_cantidad}</span>
        <span className="text-[10px] text-gray-500 ml-0.5">{unidad}</span>
      </td>
      <td className="px-2 py-1 text-right text-[10px] text-gray-600">
        {movimiento.costo_unitario ? `$${movimiento.costo_unitario.toFixed(2)}` : '-'}
      </td>
      <td className="px-2 py-1 text-right text-[10px] text-gray-600">
        {movimiento.costo_total ? `$${movimiento.costo_total.toFixed(2)}` : '-'}
      </td>
      <td className="px-2 py-1 text-[10px] text-gray-500 max-w-[100px] truncate" title={movimiento.notas}>
        {movimiento.notas || '-'}
      </td>
    </tr>
  );
};

// Componente Principal
const KardexPage: React.FC = () => {
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

  const [productos, setProductos] = useState<{ id: string; nombre: string; sku: string; unidad_medida: string }[]>([]);
  const [almacenes, setAlmacenes] = useState<{ id: string; nombre: string }[]>([]);
  const [kardex, setKardex] = useState<KardexProducto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [filtros, setFiltros] = useState<FiltrosKardex>({
    producto_id: '',
    almacen_id: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  const [busquedaProducto, setBusquedaProducto] = useState('');

  // Cargar catálogos
  useEffect(() => {
    const cargarCatalogos = async () => {
      const [prods, almacs] = await Promise.all([
        supabase.from('productos').select('id, nombre, sku, unidad_medida').eq('activo', true).order('nombre'),
        supabase.from('almacenes').select('id, nombre').eq('activo', true).order('nombre')
      ]);
      setProductos(prods.data || []);
      setAlmacenes(almacs.data || []);
    };
    cargarCatalogos();
  }, []);

  // Buscar Kardex
  const buscarKardex = async () => {
    if (!filtros.producto_id) {
      setError('Seleccione un producto');
      return;
    }

    setLoading(true);
    setError('');
    setKardex(null);

    try {
      const resultado = await obtenerKardex(filtros);
      setKardex(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar Kardex');
    } finally {
      setLoading(false);
    }
  };

  // Exportar CSV
  const handleExportar = () => {
    if (!kardex) return;
    
    const csv = exportarKardexCSV(kardex);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kardex_${kardex.producto.sku}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Imprimir
  const handleImprimir = () => {
    window.print();
  };

  // Productos filtrados
  const productosFiltrados = productos.filter(p => 
    busquedaProducto === '' ||
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
    p.sku.toLowerCase().includes(busquedaProducto.toLowerCase())
  ).slice(0, 20);

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.primary}20` }}>
            <FileText className="w-7 h-7" style={{ color: colors.primary }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
              Kardex de Inventario
            </h1>
            <p style={{ color: colors.textMuted }}>
              Consulta el historial de movimientos y saldos por producto
            </p>
          </div>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="rounded-xl shadow-sm p-6 mb-6" style={{ backgroundColor: colors.card }}>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5" style={{ color: colors.textMuted }} />
          <h2 className="font-semibold" style={{ color: colors.textSecondary }}>Filtros de Búsqueda</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Producto */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
              Producto *
            </label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }} />
              <input
                type="text"
                placeholder="Buscar producto por nombre o SKU..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              />
            </div>
            {busquedaProducto && (
              <div className="absolute z-10 mt-1 w-full max-w-lg border rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                {productosFiltrados.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setFiltros({ ...filtros, producto_id: p.id });
                      setBusquedaProducto(`${p.sku} - ${p.nombre}`);
                    }}
                    className="w-full px-4 py-2 text-left flex justify-between items-center transition-colors hover:bg-[#E0F2F1]"
                    style={{ color: colors.text }}
                  >
                    <span className="text-sm">{p.nombre}</span>
                    <span className="text-xs font-mono" style={{ color: colors.textMuted }}>{p.sku}</span>
                  </button>
                ))}
                {productosFiltrados.length === 0 && (
                  <div className="px-4 py-3 text-sm" style={{ color: colors.textMuted }}>No se encontraron productos</div>
                )}
              </div>
            )}
          </div>

          {/* Almacén */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
              Almacén
            </label>
            <select
              value={filtros.almacen_id}
              onChange={(e) => setFiltros({ ...filtros, almacen_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
              style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
            >
              <option value="">Todos los almacenes</option>
              {almacenes.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
              Período
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <CalendarDays className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }} />
                <input
                  type="date"
                  value={filtros.fecha_desde}
                  onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  title="Desde"
                />
              </div>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
                  className="w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  title="Hasta"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botón buscar */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={buscarKardex}
            disabled={loading || !filtros.producto_id}
            className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: colors.primary }}
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Consultando...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Consultar Kardex
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Resultados */}
      {kardex && (
        <>
          {/* Resumen del producto */}
          <div className="rounded-xl shadow-sm p-6 mb-6 print:shadow-none" style={{ backgroundColor: colors.card }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.text }}>{kardex.producto.nombre}</h2>
                <p style={{ color: colors.textMuted }}>SKU: {kardex.producto.sku} | Unidad: {kardex.producto.unidad_medida}</p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={handleExportar}
                  className="px-3 py-2 border rounded-lg hover:opacity-80 flex items-center gap-2 text-sm transition-colors"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
                <button
                  onClick={handleImprimir}
                  className="px-3 py-2 border rounded-lg hover:opacity-80 flex items-center gap-2 text-sm transition-colors"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg p-4" style={{ backgroundColor: isDark ? '#374151' : '#f9fafb' }}>
                <p className="text-sm" style={{ color: colors.textMuted }}>Saldo Inicial</p>
                <p className="text-2xl font-bold" style={{ color: colors.textSecondary }}>{kardex.saldo_inicial}</p>
                <p className="text-xs" style={{ color: colors.textMuted }}>{kardex.producto.unidad_medida}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600">Total Entradas</p>
                <p className="text-2xl font-bold text-green-700">+{kardex.total_entradas}</p>
                <p className="text-xs text-green-500">{kardex.producto.unidad_medida}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-red-600">Total Salidas</p>
                <p className="text-2xl font-bold text-red-700">-{kardex.total_salidas}</p>
                <p className="text-xs text-red-500">{kardex.producto.unidad_medida}</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: `${colors.primary}15` }}>
                <p className="text-sm" style={{ color: colors.primary }}>Saldo Final</p>
                <p className="text-2xl font-bold" style={{ color: colors.primary }}>{kardex.saldo_final}</p>
                <p className="text-xs" style={{ color: colors.primary }}>{kardex.producto.unidad_medida}</p>
              </div>
            </div>
          </div>

          {/* Tabla de movimientos */}
          <div className="rounded-xl shadow-sm overflow-hidden print:shadow-none" style={{ backgroundColor: colors.card }}>
            <div className="px-6 py-4 border-b" style={{ backgroundColor: isDark ? '#374151' : '#f9fafb', borderColor: colors.border }}>
              <h3 className="font-semibold flex items-center gap-2" style={{ color: colors.textSecondary }}>
                <SlidersHorizontal className="w-5 h-5" />
                Detalle de Movimientos ({kardex.movimientos.length})
              </h3>
            </div>

            {kardex.movimientos.length === 0 ? (
              <div className="p-12 text-center" style={{ color: colors.textMuted }}>
                <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
                <p>No hay movimientos para este producto en el período seleccionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: isDark ? '#374151' : '#f9fafb' }}>
                    <tr>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>Fecha</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>Tipo</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>Documento</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>Almacén</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>Entrada</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>Salida</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>Saldo</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>C. Unit.</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>C. Total</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase" style={{ color: colors.textMuted }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: colors.border }}>
                    {kardex.movimientos.map((mov, idx) => {
                      const esEntrada = mov.tipo === 'entrada' || mov.tipo === 'ajuste_positivo';
                      const tipoConfig: Record<string, { color: string; texto: string; icon: React.ElementType }> = {
                        'entrada': { color: 'text-green-600 bg-green-50', texto: 'Entrada', icon: ArrowDown },
                        'salida': { color: 'text-red-600 bg-red-50', texto: 'Salida', icon: ArrowUp },
                        'ajuste_positivo': { color: 'text-blue-600 bg-blue-50', texto: 'Ajuste +', icon: ArrowDown },
                        'ajuste_negativo': { color: 'text-orange-600 bg-orange-50', texto: 'Ajuste -', icon: ArrowUp }
                      };
                      const config = tipoConfig[mov.tipo] || tipoConfig['entrada'];
                      const Icon = config.icon;

                      return (
                        <tr
                          key={mov.id}
                          className="transition-colors hover:bg-[#E0F2F1]"
                          style={{ backgroundColor: isDark ? (idx % 2 === 0 ? '#1E293B' : '#263244') : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC') }}
                        >
                          <td className="px-2 py-1 text-[10px]" style={{ color: colors.textMuted }}>
                            {new Date(mov.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-2 py-1">
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.color}`}>
                              <Icon className="w-2.5 h-2.5" />
                              {config.texto}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-[10px]" style={{ color: mov.documento_tipo ? colors.text : colors.textMuted }}>
                            {mov.documento_tipo || '-'}
                          </td>
                          <td className="px-2 py-1 text-[10px] truncate max-w-[80px]" style={{ color: colors.textMuted }} title={mov.almacen}>
                            {mov.almacen}
                          </td>
                          <td className="px-2 py-1 text-right text-xs font-medium">
                            {esEntrada ? <span className="text-green-600">+{mov.cantidad}</span> : <span style={{ color: colors.textMuted }}>-</span>}
                          </td>
                          <td className="px-2 py-1 text-right text-xs font-medium">
                            {!esEntrada ? <span className="text-red-600">-{mov.cantidad}</span> : <span style={{ color: colors.textMuted }}>-</span>}
                          </td>
                          <td className="px-2 py-1 text-right">
                            <span className="font-bold text-xs" style={{ color: colors.text }}>{mov.saldo_cantidad}</span>
                            <span className="text-[10px] ml-0.5" style={{ color: colors.textMuted }}>{kardex.producto.unidad_medida}</span>
                          </td>
                          <td className="px-2 py-1 text-right text-[10px]" style={{ color: colors.textMuted }}>
                            {mov.costo_unitario ? `$${mov.costo_unitario.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-2 py-1 text-right text-[10px]" style={{ color: colors.textMuted }}>
                            {mov.costo_total ? `$${mov.costo_total.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-2 py-1 text-[10px] max-w-[100px] truncate" style={{ color: colors.textMuted }} title={mov.notas}>
                            {mov.notas || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none, .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default KardexPage;
