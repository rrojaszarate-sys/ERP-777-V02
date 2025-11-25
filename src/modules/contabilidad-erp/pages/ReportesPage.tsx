/**
 * PÁGINA DE REPORTES CONTABLES
 * Centraliza todos los reportes contables disponibles
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Tabs, Tab } from '@nextui-org/react';
import { LibroDiarioViewer } from '../components/LibroDiarioViewer';

export const ReportesPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('libro-diario');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reportes Contables</h1>
        <p className="text-gray-500 mt-1">
          Consulta y exporta los reportes contables de tu empresa
        </p>
      </div>

      {/* Tabs de Reportes */}
      <Card>
        <CardHeader>
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
            aria-label="Reportes"
            color="primary"
            variant="underlined"
            classNames={{
              tabList: "gap-6",
              cursor: "w-full bg-primary",
              tab: "max-w-fit px-0 h-12",
            }}
          >
            <Tab key="libro-diario" title="Libro Diario" />
            <Tab key="mayor-general" title="Mayor General" />
            <Tab key="balance" title="Balance de Comprobación" />
            <Tab key="estado-resultados" title="Estado de Resultados" />
            <Tab key="balance-general" title="Balance General" />
          </Tabs>
        </CardHeader>
        <CardBody>
          {selectedTab === 'libro-diario' && <LibroDiarioViewer />}

          {selectedTab === 'mayor-general' && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Mayor General</p>
              <p className="text-sm mt-2">En desarrollo...</p>
            </div>
          )}

          {selectedTab === 'balance' && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Balance de Comprobación</p>
              <p className="text-sm mt-2">En desarrollo...</p>
            </div>
          )}

          {selectedTab === 'estado-resultados' && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Estado de Resultados</p>
              <p className="text-sm mt-2">En desarrollo...</p>
            </div>
          )}

          {selectedTab === 'balance-general' && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Balance General</p>
              <p className="text-sm mt-2">En desarrollo...</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
