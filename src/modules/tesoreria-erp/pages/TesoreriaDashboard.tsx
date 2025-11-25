import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Building2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCuentasBancarias, useMetricasTesoreria, useFlujoCaja } from '../hooks/useTesoreria';

export const TesoreriaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: cuentas } = useCuentasBancarias();
  const { data: metricas } = useMetricasTesoreria();
  const { data: flujo } = useFlujoCaja(6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tesorería</h1>
          <p className="text-gray-500 mt-1">Gestión de cuentas bancarias y flujo de caja</p>
        </div>
        <Button
          color="primary"
          onPress={() => navigate('/tesoreria/movimientos/nuevo')}
          startContent={<Plus className="w-4 h-4" />}
        >
          Nuevo Movimiento
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Saldo Total</p>
              <p className="text-2xl font-bold text-green-600">
                ${(metricas?.saldo_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cuentas Activas</p>
              <p className="text-2xl font-bold">{metricas?.cuentas_activas || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-green-600">
                ${(metricas?.ingresos_mes || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
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
              <p className="text-sm text-gray-500">Egresos del Mes</p>
              <p className="text-2xl font-bold text-red-600">
                ${(metricas?.egresos_mes || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Flujo Neto */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Flujo Neto del Mes</p>
              <p className={`text-3xl font-bold ${(metricas?.flujo_neto_mes || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${(metricas?.flujo_neto_mes || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-100">
              {(metricas?.flujo_neto_mes || 0) >= 0 ? (
                <TrendingUp className="w-10 h-10 text-purple-600" />
              ) : (
                <TrendingDown className="w-10 h-10 text-red-600" />
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Pendientes de Conciliación */}
      {(metricas?.pendientes_conciliacion || 0) > 0 && (
        <Card>
          <CardBody className="bg-yellow-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-900">
                  Movimientos Pendientes de Conciliación
                </h3>
                <p className="text-sm text-yellow-700">
                  Hay {metricas.pendientes_conciliacion} movimientos que requieren conciliación bancaria
                </p>
                <Button
                  size="sm"
                  color="warning"
                  variant="flat"
                  onPress={() => navigate('/tesoreria/movimientos?conciliado=false')}
                  className="mt-2"
                >
                  Ver Movimientos
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Cuentas Bancarias */}
      {cuentas && cuentas.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cuentas Bancarias</h3>
              <Button
                size="sm"
                variant="flat"
                onPress={() => navigate('/tesoreria/cuentas')}
              >
                Ver Todas
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cuentas.filter(c => c.activa).slice(0, 4).map((cuenta) => (
                <div
                  key={cuenta.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/tesoreria/cuentas/${cuenta.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{cuenta.banco}</h4>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {cuenta.tipo.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mb-2 font-mono">
                    {cuenta.numero_cuenta}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Saldo</span>
                    <span className="text-lg font-bold text-green-600">
                      ${cuenta.saldo_actual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Flujo de Caja (últimos 6 meses) */}
      {flujo && flujo.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold mb-4">Flujo de Caja (Últimos 6 Meses)</h3>

            <div className="space-y-3">
              {flujo.map((f) => (
                <div key={f.periodo} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-500">{f.periodo}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-green-600">
                        Ingresos: ${f.ingresos.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </span>
                      <span className="text-red-600">
                        Egresos: ${f.egresos.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${f.flujo_neto >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{
                          width: `${Math.min(Math.abs(f.flujo_neto) / Math.max(f.ingresos, f.egresos) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className={`w-32 text-right font-semibold ${f.flujo_neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${f.flujo_neto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
