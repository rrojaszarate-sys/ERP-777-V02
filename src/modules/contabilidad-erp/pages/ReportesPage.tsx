/**
 * PÁGINA DE REPORTES CONTABLES - FASE 2.4
 * Centraliza todos los reportes contables disponibles
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Tabs, Tab } from '@nextui-org/react';
import { FileText, BookOpen, Scale, TrendingUp, Building2 } from 'lucide-react';
import { LibroDiarioViewer } from '../components/LibroDiarioViewer';
import { BalanzaComprobacion, EstadoResultados, BalanceGeneral } from '../components/reports';
import { useAuth } from '../../../core/auth/AuthProvider';

export const ReportesPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('libro-diario');
  const { user } = useAuth();

  // Company ID del usuario autenticado o valor por defecto para desarrollo
  const companyId = user?.company_id || '00000000-0000-0000-0000-000000000001';

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
              tabList: "gap-6 flex-wrap",
              cursor: "w-full bg-primary",
              tab: "max-w-fit px-0 h-12",
            }}
          >
            <Tab
              key="libro-diario"
              title={
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Libro Diario</span>
                </div>
              }
            />
            <Tab
              key="mayor-general"
              title={
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Mayor General</span>
                </div>
              }
            />
            <Tab
              key="balance"
              title={
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  <span>Balanza de Comprobación</span>
                </div>
              }
            />
            <Tab
              key="estado-resultados"
              title={
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Estado de Resultados</span>
                </div>
              }
            />
            <Tab
              key="balance-general"
              title={
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>Balance General</span>
                </div>
              }
            />
          </Tabs>
        </CardHeader>
        <CardBody>
          {selectedTab === 'libro-diario' && <LibroDiarioViewer />}

          {selectedTab === 'mayor-general' && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Mayor General</p>
              <p className="text-sm mt-2">Próximamente - Reporte de movimientos por cuenta</p>
            </div>
          )}

          {selectedTab === 'balance' && (
            <BalanzaComprobacion companyId={companyId} />
          )}

          {selectedTab === 'estado-resultados' && (
            <EstadoResultados companyId={companyId} />
          )}

          {selectedTab === 'balance-general' && (
            <BalanceGeneral companyId={companyId} />
          )}
        </CardBody>
      </Card>
    </div>
  );
};
