/**
 * KardexPage - Página de Kardex de Inventario
 * Vista detallada de movimientos por producto con saldo acumulado
 */

import React, { useState, useEffect } from 'react';
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
      <td className="px-4 py-3 text-sm text-gray-600">
        {new Date(movimiento.fecha).toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
          <Icon className="w-3 h-3" />
          {config.texto}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {movimiento.documento_tipo ? (
          <span className="text-gray-800">
            {movimiento.documento_tipo}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {movimiento.almacen}
      </td>
      <td className="px-4 py-3 text-right font-medium">
        {esEntrada ? (
          <span className="text-green-600">+{movimiento.cantidad}</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-medium">
        {!esEntrada ? (
          <span className="text-red-600">-{movimiento.cantidad}</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-bold text-gray-800">{movimiento.saldo_cantidad}</span>
        <span className="text-xs text-gray-500 ml-1">{unidad}</span>
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-600">
        {movimiento.costo_unitario ? `$${movimiento.costo_unitario.toFixed(2)}` : '-'}
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-600">
        {movimiento.costo_total ? `$${movimiento.costo_total.toFixed(2)}` : '-'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate" title={movimiento.notas}>
        {movimiento.notas || '-'}
      </td>
    </tr>
  );
};

// Componente Principal
const KardexPage: React.FC = () => {
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-7 h-7 text-indigo-600" />
          Kardex de Inventario
        </h1>
        <p className="text-gray-500 mt-1">
          Consulta el historial de movimientos y saldos por producto
        </p>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-700">Filtros de Búsqueda</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Producto */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto *
            </label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto por nombre o SKU..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {busquedaProducto && (
              <div className="absolute z-10 mt-1 w-full max-w-lg bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {productosFiltrados.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setFiltros({ ...filtros, producto_id: p.id });
                      setBusquedaProducto(`${p.sku} - ${p.nombre}`);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-indigo-50 flex justify-between items-center"
                  >
                    <span className="text-sm">{p.nombre}</span>
                    <span className="text-xs text-gray-500 font-mono">{p.sku}</span>
                  </button>
                ))}
                {productosFiltrados.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">No se encontraron productos</div>
                )}
              </div>
            )}
          </div>

          {/* Almacén */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Almacén
            </label>
            <select
              value={filtros.almacen_id}
              onChange={(e) => setFiltros({ ...filtros, almacen_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos los almacenes</option>
              {almacenes.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <CalendarDays className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={filtros.fecha_desde}
                  onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  title="Desde"
                />
              </div>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
                  className="w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
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
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
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
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 print:shadow-none">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{kardex.producto.nombre}</h2>
                <p className="text-gray-500">SKU: {kardex.producto.sku} | Unidad: {kardex.producto.unidad_medida}</p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={handleExportar}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
                <button
                  onClick={handleImprimir}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Saldo Inicial</p>
                <p className="text-2xl font-bold text-gray-600">{kardex.saldo_inicial}</p>
                <p className="text-xs text-gray-400">{kardex.producto.unidad_medida}</p>
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
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-sm text-indigo-600">Saldo Final</p>
                <p className="text-2xl font-bold text-indigo-700">{kardex.saldo_final}</p>
                <p className="text-xs text-indigo-500">{kardex.producto.unidad_medida}</p>
              </div>
            </div>
          </div>

          {/* Tabla de movimientos */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden print:shadow-none">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Detalle de Movimientos ({kardex.movimientos.length})
              </h3>
            </div>

            {kardex.movimientos.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No hay movimientos para este producto en el período seleccionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Almacén</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entrada</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salida</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">C. Unit.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">C. Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardex.movimientos.map((mov) => (
                      <FilaMovimiento 
                        key={mov.id} 
                        movimiento={mov} 
                        unidad={kardex.producto.unidad_medida}
                      />
                    ))}
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
