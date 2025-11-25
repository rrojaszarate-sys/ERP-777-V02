import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { BarChart3, TrendingUp, FileText, Plus } from 'lucide-react';
import { useReportes, useMetricasBI } from '../hooks/useReportes';

export const ReportesDashboard: React.FC = () => {
  const { data: reportes } = useReportes();
  const { data: metricas } = useMetricasBI();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes y Business Intelligence</h1>
          <p className="text-gray-500 mt-1">Análisis y reportes personalizados</p>
        </div>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
          Nuevo Reporte
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Reportes Creados</p>
              <p className="text-2xl font-bold">{reportes?.length || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ventas Totales</p>
              <p className="text-2xl font-bold">${(metricas?.ventas_totales || 0).toLocaleString()}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dashboards Activos</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">Reportes Disponibles</h3>
          <p className="text-gray-500">Constructor de reportes personalizados con SQL y visualizaciones dinámicas</p>
        </CardBody>
      </Card>
    </div>
  );
};
