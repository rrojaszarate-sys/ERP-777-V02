/**
 * PuntoReordenPage - Gestión de Punto de Reorden y Compras Automáticas
 * Identifica productos bajo mínimo y genera requisiciones automáticas
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell,
  ShoppingCart,
  AlertTriangle,
  Clock,
  CheckCircle,
  RotateCcw,
  Plus,
  DollarSign,
  Store,
  Truck
} from 'lucide-react';
import { supabase } from '../../../core/config/supabase';
import { 
  obtenerProductosBajoReorden,
  generarRequisicionAutomatica,
  obtenerResumenReorden,
  verificarYGenerarAlertas,
  type ProductoBajoStock
} from '../services/reordenService';

// Badge de urgencia
const UrgenciaBadge: React.FC<{ dias: number }> = ({ dias }) => {
  if (dias <= 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <AlertTriangle className="w-3 h-3" />
        CRÍTICO
      </span>
    );
  }
  if (dias <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        <Clock className="w-3 h-3" />
        Urgente
      </span>
    );
  }
  if (dias <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3" />
        {dias} días
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <CheckCircle className="w-3 h-3" />
      {dias}+ días
    </span>
  );
};

// Tarjeta KPI
const KPICard: React.FC<{
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  color: string;
  icon: React.ElementType;
}> = ({ titulo, valor, subtitulo, color, icon: Icon }) => (
  <div className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${color}`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{valor}</p>
        {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color.replace('border-', 'bg-').replace('-500', '-100')}`}>
        <Icon className={`w-6 h-6 ${color.replace('border-', 'text-')}`} />
      </div>
    </div>
  </div>
);

// Componente Principal
const PuntoReordenPage: React.FC = () => {
  const [productos, setProductos] = useState<ProductoBajoStock[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [almacenes, setAlmacenes] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [resumen, setResumen] = useState({
    productos_bajo_minimo: 0,
    productos_criticos: 0,
    requisiciones_pendientes: 0,
    valor_sugerido_compra: 0
  });

  // Cargar datos
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prods, almacs, res] = await Promise.all([
        obtenerProductosBajoReorden(filtroAlmacen || undefined),
        supabase.from('almacenes').select('id, nombre').eq('activo', true).order('nombre'),
        obtenerResumenReorden()
      ]);
      
      setProductos(prods);
      setAlmacenes(almacs.data || []);
      setResumen(res);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroAlmacen]);

  // Toggle selección
  const toggleSeleccion = (id: string) => {
    const nuevos = new Set(seleccionados);
    if (nuevos.has(id)) {
      nuevos.delete(id);
    } else {
      nuevos.add(id);
    }
    setSeleccionados(nuevos);
  };

  // Seleccionar todos
  const seleccionarTodos = () => {
    if (seleccionados.size === productos.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(productos.map(p => `${p.producto_id}-${p.almacen_id}`)));
    }
  };

  // Generar requisición
  const handleGenerarRequisicion = async () => {
    if (seleccionados.size === 0) {
      alert('Seleccione al menos un producto');
      return;
    }

    if (!confirm(`¿Generar requisición de compra para ${seleccionados.size} productos?`)) {
      return;
    }

    setGenerando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const productosSeleccionados = productos.filter(
        p => seleccionados.has(`${p.producto_id}-${p.almacen_id}`)
      );

      const numero = await generarRequisicionAutomatica(productosSeleccionados, user.id);
      
      alert(`✅ Requisición ${numero} generada exitosamente`);
      setSeleccionados(new Set());
      cargarDatos();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al generar requisición');
    } finally {
      setGenerando(false);
    }
  };

  // Verificar alertas
  const handleVerificarAlertas = async () => {
    try {
      const alertasCreadas = await verificarYGenerarAlertas();
      alert(`Se crearon ${alertasCreadas} nuevas alertas`);
      cargarDatos();
    } catch (error) {
      console.error('Error verificando alertas:', error);
    }
  };

  // Calcular totales seleccionados
  const totalUnidadesSel = productos
    .filter(p => seleccionados.has(`${p.producto_id}-${p.almacen_id}`))
    .reduce((sum, p) => sum + p.cantidad_sugerida, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-7 h-7 text-orange-600" />
            Punto de Reorden
          </h1>
          <p className="text-gray-500 mt-1">
            Productos bajo stock mínimo y generación automática de requisiciones
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleVerificarAlertas}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Verificar Alertas
          </button>
          <button
            onClick={handleGenerarRequisicion}
            disabled={seleccionados.size === 0 || generando}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
          >
            {generando ? (
              <>
                <span className="animate-spin">⏳</span>
                Generando...
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Generar Requisición ({seleccionados.size})
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          titulo="Productos Bajo Mínimo"
          valor={resumen.productos_bajo_minimo}
          subtitulo="requieren atención"
          color="border-orange-500"
          icon={AlertTriangle}
        />
        <KPICard
          titulo="Críticos"
          valor={resumen.productos_criticos}
          subtitulo="menos de 3 días"
          color="border-red-500"
          icon={Bell}
        />
        <KPICard
          titulo="Requisiciones Pendientes"
          valor={resumen.requisiciones_pendientes}
          subtitulo="por aprobar"
          color="border-blue-500"
          icon={ShoppingCart}
        />
        <KPICard
          titulo="Valor Sugerido"
          valor={`$${resumen.valor_sugerido_compra.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          subtitulo="compra recomendada"
          color="border-green-500"
          icon={DollarSign}
        />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-gray-400" />
            <select
              value={filtroAlmacen}
              onChange={(e) => setFiltroAlmacen(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Todos los almacenes</option>
              {almacenes.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
          
          {seleccionados.size > 0 && (
            <div className="ml-auto flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                {seleccionados.size} seleccionados | {totalUnidadesSel} unidades
              </span>
              <button
                onClick={() => setSeleccionados(new Set())}
                className="text-orange-600 hover:text-orange-700"
              >
                Limpiar selección
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Analizando niveles de stock...</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">¡Todo en orden!</h3>
            <p className="text-gray-500">No hay productos bajo el punto de reorden</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={seleccionados.size === productos.length && productos.length > 0}
                    onChange={seleccionarTodos}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Almacén</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mínimo</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad Sugerida</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Urgencia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productos.map((prod) => {
                const key = `${prod.producto_id}-${prod.almacen_id}`;
                const isSelected = seleccionados.has(key);
                const porcentajeStock = (prod.stock_actual / prod.stock_minimo) * 100;
                
                return (
                  <tr 
                    key={key} 
                    className={`hover:bg-gray-50 ${isSelected ? 'bg-orange-50' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSeleccion(key)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-800">{prod.producto_nombre}</p>
                        <p className="text-xs text-gray-500 font-mono">{prod.sku}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{prod.almacen_nombre}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-center">
                        <span className={`font-bold ${
                          porcentajeStock < 25 ? 'text-red-600' :
                          porcentajeStock < 50 ? 'text-orange-600' :
                          'text-yellow-600'
                        }`}>
                          {prod.stock_actual}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{prod.unidad_medida}</span>
                        <div className="mt-1 h-1.5 bg-gray-200 rounded-full w-20 mx-auto">
                          <div 
                            className={`h-full rounded-full ${
                              porcentajeStock < 25 ? 'bg-red-500' :
                              porcentajeStock < 50 ? 'bg-orange-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(100, porcentajeStock)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-600">
                      {prod.stock_minimo}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                        <Plus className="w-4 h-4" />
                        {prod.cantidad_sugerida}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <UrgenciaBadge dias={prod.dias_sin_stock_estimado} />
                    </td>
                    <td className="px-4 py-4">
                      {prod.proveedor_preferido_nombre ? (
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{prod.proveedor_preferido_nombre}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Sin proveedor</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Leyenda */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Leyenda de urgencia:</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-gray-600">Crítico: Sin stock en 1-2 días</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span className="text-gray-600">Urgente: Sin stock en 3 días</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-gray-600">Atención: Sin stock en 4-7 días</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-600">Normal: Más de 7 días</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuntoReordenPage;
