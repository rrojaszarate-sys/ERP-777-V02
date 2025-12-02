/**
 * ValuacionInventarioPage - Reporte de Valoración del Inventario
 * Calcula el valor total del inventario con análisis por categoría y ABC
 */

import React, { useState, useEffect } from 'react';
import { 
  DollarSign,
  Filter,
  Download,
  Printer,
  PieChart,
  Store,
  CalendarDays,
  Table2,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../../core/config/supabase';
import { 
  generarValuacion, 
  generarAnalisisABC,
  exportarValuacionCSV,
  type ResumenValuacion,
  type MetodoValuacion,
  type FiltrosValuacion
} from '../services/valuacionService';

// Componente de tarjeta KPI
const TarjetaKPI: React.FC<{
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  color: string;
  icon: React.ElementType;
}> = ({ titulo, valor, subtitulo, color, icon: Icon }) => (
  <div className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${color}`}>
    <div className="flex justify-between">
      <div>
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{valor}</p>
        {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
      </div>
      <Icon className="w-8 h-8 text-gray-300" />
    </div>
  </div>
);

// Vista de tabla
const TablaValuacion: React.FC<{ valuacion: ResumenValuacion }> = ({ valuacion }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Últ. Entrada</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {valuacion.items.map((item, index) => (
          <tr key={item.producto_id} className="hover:bg-gray-50">
            <td className="px-4 py-3">
              <span className="font-mono text-sm text-gray-600">{item.sku}</span>
            </td>
            <td className="px-4 py-3">
              <span className="text-sm font-medium text-gray-800">{item.producto_nombre}</span>
            </td>
            <td className="px-4 py-3">
              <span className="text-sm text-gray-600">{item.categoria}</span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="font-medium">{item.cantidad.toLocaleString()}</span>
              <span className="text-xs text-gray-400 ml-1">{item.unidad_medida}</span>
            </td>
            <td className="px-4 py-3 text-right text-sm">
              ${item.costo_unitario.toFixed(2)}
            </td>
            <td className="px-4 py-3 text-right">
              <span className="font-bold text-green-700">${item.valor_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </td>
            <td className="px-4 py-3 text-center text-xs text-gray-500">
              {item.ultima_entrada ? new Date(item.ultima_entrada).toLocaleDateString('es-MX') : '-'}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-gray-100">
        <tr>
          <td colSpan={3} className="px-4 py-3 font-bold text-gray-800">TOTAL</td>
          <td className="px-4 py-3 text-center font-bold">{valuacion.total_unidades.toLocaleString()}</td>
          <td className="px-4 py-3"></td>
          <td className="px-4 py-3 text-right font-bold text-green-700 text-lg">
            ${valuacion.valor_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </td>
          <td className="px-4 py-3"></td>
        </tr>
      </tfoot>
    </table>
  </div>
);

// Vista por categoría
const GraficoCategorias: React.FC<{ valuacion: ResumenValuacion }> = ({ valuacion }) => {
  const colores = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 
    'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-orange-500'
  ];

  return (
    <div className="space-y-4">
      {valuacion.por_categoria.map((cat, index) => {
        const porcentaje = (cat.valor / valuacion.valor_total) * 100;
        return (
          <div key={cat.categoria} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-800">{cat.categoria}</span>
              <span className="text-sm text-gray-500">{cat.cantidad} productos</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div 
                  className={`${colores[index % colores.length]} h-3 rounded-full transition-all`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <div className="text-right min-w-[120px]">
                <span className="font-bold text-gray-800">${cat.valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span className="text-xs text-gray-500 ml-1">({porcentaje.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Vista Análisis ABC
const AnalisisABCView: React.FC<{ almacen_id?: string }> = ({ almacen_id }) => {
  const [analisis, setAnalisis] = useState<Awaited<ReturnType<typeof generarAnalisisABC>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const resultado = await generarAnalisisABC(almacen_id);
        setAnalisis(resultado);
      } catch (error) {
        console.error('Error cargando análisis ABC:', error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [almacen_id]);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">Generando análisis ABC...</p>
      </div>
    );
  }

  if (!analisis) return null;

  const ClasificacionCard: React.FC<{
    clase: 'A' | 'B' | 'C';
    color: string;
    bgColor: string;
    datos: typeof analisis.resumen.a;
    items: typeof analisis.clasificacion_a;
  }> = ({ clase, color, bgColor, datos, items }) => (
    <div className={`rounded-xl ${bgColor} p-5`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`text-3xl font-black ${color}`}>Clase {clase}</span>
          <p className="text-sm text-gray-600 mt-1">
            {clase === 'A' && '~80% del valor'}
            {clase === 'B' && '~15% del valor'}
            {clase === 'C' && '~5% del valor'}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${color}`}>{datos.productos}</p>
          <p className="text-xs text-gray-500">productos ({datos.porcentaje_productos.toFixed(1)}%)</p>
        </div>
      </div>
      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-600">Valor del inventario:</p>
        <p className={`text-xl font-bold ${color}`}>
          ${datos.valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-gray-500">({datos.porcentaje_valor.toFixed(1)}% del total)</p>
      </div>
      <div className="mt-4 max-h-40 overflow-y-auto text-sm">
        {items.slice(0, 5).map(item => (
          <div key={item.producto_id} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
            <span className="text-gray-700 truncate flex-1">{item.producto_nombre}</span>
            <span className="text-gray-500 ml-2">${item.valor_total.toLocaleString()}</span>
          </div>
        ))}
        {items.length > 5 && (
          <p className="text-xs text-gray-400 mt-2">... y {items.length - 5} más</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <ClasificacionCard 
        clase="A" 
        color="text-green-700"
        bgColor="bg-green-50"
        datos={analisis.resumen.a}
        items={analisis.clasificacion_a}
      />
      <ClasificacionCard 
        clase="B" 
        color="text-yellow-700"
        bgColor="bg-yellow-50"
        datos={analisis.resumen.b}
        items={analisis.clasificacion_b}
      />
      <ClasificacionCard 
        clase="C" 
        color="text-red-700"
        bgColor="bg-red-50"
        datos={analisis.resumen.c}
        items={analisis.clasificacion_c}
      />
    </div>
  );
};

// Componente Principal
const ValuacionInventarioPage: React.FC = () => {
  const [valuacion, setValuacion] = useState<ResumenValuacion | null>(null);
  const [loading, setLoading] = useState(false);
  const [almacenes, setAlmacenes] = useState<{ id: string; nombre: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [vista, setVista] = useState<'tabla' | 'categorias' | 'abc'>('tabla');
  
  // Filtros
  const [filtros, setFiltros] = useState<FiltrosValuacion>({
    metodo: 'promedio',
    fecha_corte: new Date().toISOString().split('T')[0],
    incluir_sin_stock: false
  });

  // Cargar catálogos
  useEffect(() => {
    const cargar = async () => {
      const [almacs, cats] = await Promise.all([
        supabase.from('almacenes').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('categorias_producto').select('id, nombre').eq('activo', true).order('nombre')
      ]);
      setAlmacenes(almacs.data || []);
      setCategorias(cats.data || []);
    };
    cargar();
  }, []);

  // Generar reporte
  const handleGenerar = async () => {
    setLoading(true);
    try {
      const resultado = await generarValuacion(filtros);
      setValuacion(resultado);
    } catch (error) {
      console.error('Error generando valuación:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  // Exportar
  const handleExportar = () => {
    if (!valuacion) return;
    const csv = exportarValuacionCSV(valuacion);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `valuacion_inventario_${valuacion.fecha_corte}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-7 h-7 text-green-600" />
          Valoración de Inventario
        </h1>
        <p className="text-gray-500 mt-1">
          Calcula el valor total del inventario con diferentes métodos de costeo
        </p>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-700">Parámetros del Reporte</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Almacén */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Store className="w-4 h-4 inline mr-1" />
              Almacén
            </label>
            <select
              value={filtros.almacen_id || ''}
              onChange={(e) => setFiltros({ ...filtros, almacen_id: e.target.value || undefined })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todos los almacenes</option>
              {almacenes.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={filtros.categoria_id || ''}
              onChange={(e) => setFiltros({ ...filtros, categoria_id: e.target.value || undefined })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Método */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Costeo
            </label>
            <select
              value={filtros.metodo}
              onChange={(e) => setFiltros({ ...filtros, metodo: e.target.value as MetodoValuacion })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="promedio">Promedio Ponderado</option>
              <option value="peps">PEPS (FIFO)</option>
              <option value="ueps">UEPS (LIFO)</option>
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <CalendarDays className="w-4 h-4 inline mr-1" />
              Fecha de Corte
            </label>
            <input
              type="date"
              value={filtros.fecha_corte}
              onChange={(e) => setFiltros({ ...filtros, fecha_corte: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Botón */}
          <div className="flex items-end">
            <button
              onClick={handleGenerar}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Generando...
                </>
              ) : (
                <>
                  <PieChart className="w-5 h-5" />
                  Generar Reporte
                </>
              )}
            </button>
          </div>
        </div>

        {/* Checkbox incluir sin stock */}
        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={filtros.incluir_sin_stock}
              onChange={(e) => setFiltros({ ...filtros, incluir_sin_stock: e.target.checked })}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            Incluir productos sin stock
          </label>
        </div>
      </div>

      {/* Resultados */}
      {valuacion && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <TarjetaKPI
              titulo="Valor Total del Inventario"
              valor={`$${valuacion.valor_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
              subtitulo={`Corte: ${new Date(valuacion.fecha_corte).toLocaleDateString('es-MX')}`}
              color="border-green-500"
              icon={DollarSign}
            />
            <TarjetaKPI
              titulo="Total de Productos"
              valor={valuacion.total_productos.toLocaleString()}
              subtitulo="con existencia"
              color="border-blue-500"
              icon={Table2}
            />
            <TarjetaKPI
              titulo="Total de Unidades"
              valor={valuacion.total_unidades.toLocaleString()}
              subtitulo="en inventario"
              color="border-purple-500"
              icon={BarChart3}
            />
            <TarjetaKPI
              titulo="Categorías"
              valor={valuacion.por_categoria.length}
              subtitulo="con productos"
              color="border-orange-500"
              icon={PieChart}
            />
          </div>

          {/* Controles de vista y exportación */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setVista('tabla')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${
                  vista === 'tabla' 
                    ? 'bg-green-100 text-green-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Table2 className="w-4 h-4" />
                Tabla
              </button>
              <button
                onClick={() => setVista('categorias')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${
                  vista === 'categorias' 
                    ? 'bg-green-100 text-green-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <PieChart className="w-4 h-4" />
                Por Categoría
              </button>
              <button
                onClick={() => setVista('abc')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${
                  vista === 'abc' 
                    ? 'bg-green-100 text-green-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Análisis ABC
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportar}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>

          {/* Contenido según vista */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {vista === 'tabla' && <TablaValuacion valuacion={valuacion} />}
            {vista === 'categorias' && (
              <div className="p-6">
                <GraficoCategorias valuacion={valuacion} />
              </div>
            )}
            {vista === 'abc' && (
              <div className="p-6">
                <AnalisisABCView almacen_id={filtros.almacen_id} />
              </div>
            )}
          </div>
        </>
      )}

      {!valuacion && !loading && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Genera tu reporte de valoración</h3>
          <p className="text-gray-500">
            Selecciona los parámetros y haz clic en "Generar Reporte" para ver el valor de tu inventario
          </p>
        </div>
      )}
    </div>
  );
};

export default ValuacionInventarioPage;
