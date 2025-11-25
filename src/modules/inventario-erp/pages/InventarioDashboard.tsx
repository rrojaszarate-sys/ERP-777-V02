import React, { useMemo } from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { Package, Warehouse, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAlmacenes, useMovimientos, useProductosBajoStock } from '../hooks/useInventario';
import { useProductos } from '../hooks/useProductos';

export const InventarioDashboard: React.FC = () => {
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
    </div>
  );
};
