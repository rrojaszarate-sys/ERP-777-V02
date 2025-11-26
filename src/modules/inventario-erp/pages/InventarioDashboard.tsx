import React, { useMemo, useState } from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { Package, Warehouse, TrendingUp, AlertTriangle, HelpCircle, BookOpen, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAlmacenes, useMovimientos, useProductosBajoStock } from '../hooks/useInventario';
import { useProductos } from '../hooks/useProductos';
import { HelpButton } from '../../../shared/components/ui/HelpGuide';
import { InventarioHelpGuide } from '../components/InventarioHelpGuide';

export const InventarioDashboard: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const { data: almacenes } = useAlmacenes();
  const { data: movimientos } = useMovimientos();
  const { productos } = useProductos();
  const { data: productosBajoStock } = useProductosBajoStock();

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-gray-500 mt-1">Control de almacenes y movimientos</p>
        </div>
        <Button color="primary" onPress={() => navigate('/inventario/movimientos/nuevo')}>
          Nuevo Movimiento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card isPressable onPress={() => navigate('/inventario/almacenes')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Warehouse className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Almacenes</p>
              <p className="text-2xl font-bold">{almacenes?.length || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/inventario/movimientos')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Movimientos del Mes</p>
              <p className="text-2xl font-bold">{movimientosDelMes}</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/inventario/productos')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Productos Activos</p>
              <p className="text-2xl font-bold">{productosActivos}</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/inventario/productos')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-bold">{productosBajoStock?.length || 0}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Accesos rápidos con guía visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardBody className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold mb-2">¿Primera vez aquí?</h3>
                <p className="text-white/80 text-sm mb-4">
                  Aprende a gestionar tu inventario paso a paso con nuestra guía interactiva.
                </p>
                <Button
                  size="sm"
                  className="bg-white text-indigo-600 font-medium"
                  onPress={() => setShowHelp(true)}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Ver Guía
                </Button>
              </div>
              <HelpCircle className="w-12 h-12 text-white/30" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardBody className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Agregar Productos</h3>
            <p className="text-gray-600 text-sm mb-4">
              Crea productos manualmente o importa desde Excel.
            </p>
            <div className="flex gap-2">
              <Button size="sm" color="primary" onPress={() => navigate('/inventario/productos')}>
                <Package className="w-4 h-4 mr-1" />
                Manual
              </Button>
              <Button size="sm" variant="bordered" onPress={() => navigate('/inventario/productos')}>
                Importar Excel
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardBody className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Ver Stock Actual</h3>
            <p className="text-gray-600 text-sm mb-4">
              Consulta existencias y productos bajo mínimo.
            </p>
            <Button size="sm" color="primary" onPress={() => navigate('/inventario/stock')}>
              <TrendingUp className="w-4 h-4 mr-1" />
              Ver Stock
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Productos con stock bajo - alerta visual */}
      {productosBajoStock && productosBajoStock.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Productos con Stock Bajo</h3>
                  <p className="text-sm text-gray-600">
                    {productosBajoStock.length} producto(s) requieren reabastecimiento
                  </p>
                </div>
              </div>
              <Button size="sm" color="danger" variant="flat" onPress={() => navigate('/inventario/stock')}>
                Ver Todos
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {productosBajoStock.slice(0, 3).map((producto: any) => (
                <div key={producto.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <span className="font-medium text-gray-900">{producto.nombre}</span>
                  <span className="text-sm text-red-600">Stock: {producto.stock_actual || 0}</span>
                </div>
              ))}
              {productosBajoStock.length > 3 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  y {productosBajoStock.length - 3} más...
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Botón de ayuda flotante */}
      <HelpButton onClick={() => setShowHelp(true)} label="¿Necesitas ayuda?" />

      {/* Modal de guía */}
      {showHelp && <InventarioHelpGuide onClose={() => setShowHelp(false)} />}
    </div>
  );
};
