import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { Users, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProveedores, useOrdenesCompra } from '../hooks/useProveedores';

export const ProveedoresDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: proveedores } = useProveedores();
  const { data: ordenes } = useOrdenesCompra();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proveedores y Compras</h1>
          <p className="text-gray-500 mt-1">Gestión de proveedores y órdenes de compra</p>
        </div>
        <Button color="primary" onPress={() => navigate('/proveedores/ordenes/nueva')}>
          Nueva Orden de Compra
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card isPressable onPress={() => navigate('/proveedores/catalogo')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Proveedores</p>
              <p className="text-2xl font-bold">{proveedores?.length || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/proveedores/ordenes')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Órdenes Activas</p>
              <p className="text-2xl font-bold">
                {ordenes?.filter((o: any) => o.status !== 'cancelada').length || 0}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Recepciones Pendientes</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Gasto del Mes</p>
              <p className="text-2xl font-bold">$0</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
