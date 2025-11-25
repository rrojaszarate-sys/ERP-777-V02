/**
 * DASHBOARD DE CONTABILIDAD
 * Página principal del módulo de contabilidad con métricas y accesos rápidos
 */

import React from 'react';
import { Card, CardBody, CardHeader, Button, Chip } from '@nextui-org/react';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlanCuentas, usePolizas, useMayorGeneral } from '../hooks/useContabilidad';

export const ContabilidadDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: cuentas } = usePlanCuentas();
  const { data: polizas } = usePolizas();
  const { data: mayorGeneral } = useMayorGeneral();

  // Calcular métricas
  const totalActivos = cuentas
    ?.filter(c => c.tipo === 'activo')
    .reduce((sum, c) => sum + c.saldo_actual, 0) || 0;

  const totalPasivos = cuentas
    ?.filter(c => c.tipo === 'pasivo')
    .reduce((sum, c) => sum + c.saldo_actual, 0) || 0;

  const capital = totalActivos - totalPasivos;

  const polizasBorrador = polizas?.filter(p => p.status === 'borrador').length || 0;
  const polizasAplicadas = polizas?.filter(p => p.status === 'aplicada').length || 0;

  const cuentasActivas = cuentas?.filter(c => c.activo).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contabilidad</h1>
          <p className="text-gray-500 mt-1">
            Gestión contable y reportes financieros
          </p>
        </div>
        <Button
          color="primary"
          size="lg"
          startContent={<Plus className="w-5 h-5" />}
          onPress={() => navigate('/contabilidad/polizas')}
        >
          Nueva Póliza
        </Button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Activos</p>
              <p className="text-2xl font-bold text-green-600">
                ${totalActivos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Pasivos</p>
              <p className="text-2xl font-bold text-red-600">
                ${totalPasivos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Capital Contable</p>
              <p className="text-2xl font-bold text-blue-600">
                ${capital.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pólizas del Mes</p>
              <p className="text-2xl font-bold">{polizas?.length || 0}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pólizas recientes */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Pólizas Recientes</h3>
              <p className="text-sm text-gray-500">Últimas operaciones registradas</p>
            </div>
            <Button
              size="sm"
              variant="flat"
              onPress={() => navigate('/contabilidad/polizas')}
            >
              Ver todas
            </Button>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {polizas?.slice(0, 5).map((poliza) => (
                <div
                  key={poliza.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/contabilidad/polizas/${poliza.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{poliza.numero_poliza}</p>
                      <p className="text-sm text-gray-500">{poliza.concepto}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">
                      ${poliza.total_debe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <Chip
                      size="sm"
                      color={
                        poliza.status === 'aplicada' ? 'success' :
                        poliza.status === 'borrador' ? 'warning' :
                        'danger'
                      }
                      variant="flat"
                    >
                      {poliza.status}
                    </Chip>
                  </div>
                </div>
              ))}
              {(!polizas || polizas.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No hay pólizas registradas</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Estado del sistema */}
        <Card>
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold">Estado del Sistema</h3>
              <p className="text-sm text-gray-500">Resumen de operaciones</p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Pólizas Aplicadas</span>
                </div>
                <span className="font-semibold">{polizasAplicadas}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span>Pólizas en Borrador</span>
                </div>
                <span className="font-semibold">{polizasBorrador}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Cuentas Activas</span>
                </div>
                <span className="font-semibold">{cuentasActivas}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span>Periodo Actual</span>
                </div>
                <span className="font-semibold">
                  {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Enlaces a reportes */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Reportes Contables</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="flat"
              className="h-20"
              onPress={() => navigate('/contabilidad/reportes/libro-diario')}
            >
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-6 h-6" />
                <span>Libro Diario</span>
              </div>
            </Button>

            <Button
              variant="flat"
              className="h-20"
              onPress={() => navigate('/contabilidad/reportes/mayor-general')}
            >
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-6 h-6" />
                <span>Mayor General</span>
              </div>
            </Button>

            <Button
              variant="flat"
              className="h-20"
              onPress={() => navigate('/contabilidad/reportes/balance')}
            >
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-6 h-6" />
                <span>Balance de Comprobación</span>
              </div>
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
