import React from 'react';
import { Card, CardBody, Button, Chip } from '@nextui-org/react';
import { Plug, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useIntegraciones } from '../hooks/useIntegraciones';

export const IntegracionesDashboard: React.FC = () => {
  const { data: integraciones } = useIntegraciones();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integraciones Externas</h1>
          <p className="text-gray-500 mt-1">Conecta con sistemas externos</p>
        </div>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
          Nueva Integración
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Plug className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Integraciones</p>
              <p className="text-2xl font-bold">{integraciones?.length || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activas</p>
              <p className="text-2xl font-bold">{integraciones?.filter(i => i.activo).length || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inactivas</p>
              <p className="text-2xl font-bold">{integraciones?.filter(i => !i.activo).length || 0}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">Integraciones Disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['API REST', 'Webhooks', 'FTP/SFTP', 'Email', 'CONTPAQi', 'Odoo'].map((tipo) => (
              <div key={tipo} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{tipo}</span>
                  <Chip size="sm" color="default">Disponible</Chip>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
