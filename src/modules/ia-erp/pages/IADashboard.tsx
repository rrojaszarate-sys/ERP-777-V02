import React from 'react';
import { Card, CardBody, Button, Chip } from '@nextui-org/react';
import { Brain, Zap, Plus, TrendingUp } from 'lucide-react';
import { usePredicciones, useWorkflows } from '../hooks/useIA';

export const IADashboard: React.FC = () => {
  const { data: predicciones } = usePredicciones();
  const { data: workflows } = useWorkflows();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">IA y Automatización</h1>
          <p className="text-gray-500 mt-1">Predicciones y workflows automáticos</p>
        </div>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
          Nuevo Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Predicciones</p>
              <p className="text-2xl font-bold">{predicciones?.length || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Workflows</p>
              <p className="text-2xl font-bold">{workflows?.length || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Workflows Activos</p>
              <p className="text-2xl font-bold">{workflows?.filter(w => w.activo).length || 0}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">Modelos de IA Disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Predicción de Ventas', 'Optimización de Inventario', 'Análisis de Cobranza', 'Predicción de Demanda'].map((modelo) => (
              <div key={modelo} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{modelo}</span>
                  <Chip size="sm" color="success">Disponible</Chip>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
