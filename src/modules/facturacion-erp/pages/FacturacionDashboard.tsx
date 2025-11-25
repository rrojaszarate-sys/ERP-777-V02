import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { FileText, DollarSign, CheckCircle, XCircle, AlertCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFacturas, useConfiguracion } from '../hooks/useFacturacion';

export const FacturacionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: facturas } = useFacturas();
  const { data: configuracion } = useConfiguracion();

  const totalFacturas = facturas?.length || 0;
  const facturasTimbradas = facturas?.filter(f => f.status === 'timbrada').length || 0;
  const facturasPendientes = facturas?.filter(f => f.status === 'pendiente').length || 0;
  const facturasCanceladas = facturas?.filter(f => f.status === 'cancelada').length || 0;

  const totalFacturado = facturas
    ?.filter(f => f.status === 'timbrada')
    .reduce((sum, f) => sum + f.total, 0) || 0;

  const configuracionCompleta = !!(
    configuracion?.regimen_fiscal &&
    configuracion?.certificado_cer &&
    configuracion?.certificado_key &&
    configuracion?.pac_proveedor
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturación Electrónica CFDI 4.0</h1>
          <p className="text-gray-500 mt-1">Sistema de facturación electrónica</p>
        </div>
        <div className="flex gap-2">
          {!configuracionCompleta && (
            <Button
              color="warning"
              variant="flat"
              onPress={() => navigate('/facturacion/configuracion')}
              startContent={<AlertCircle className="w-4 h-4" />}
            >
              Configurar
            </Button>
          )}
          <Button
            color="primary"
            onPress={() => navigate('/facturacion/facturas/nueva')}
            startContent={<FileText className="w-4 h-4" />}
            isDisabled={!configuracionCompleta}
          >
            Nueva Factura
          </Button>
        </div>
      </div>

      {/* Alerta de configuración */}
      {!configuracionCompleta && (
        <Card>
          <CardBody className="bg-yellow-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-900">
                  Configuración Incompleta
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Debes configurar tu régimen fiscal, certificados digitales y proveedor de certificación (PAC) para poder timbrar facturas.
                </p>
                <Button
                  size="sm"
                  color="warning"
                  variant="flat"
                  onPress={() => navigate('/facturacion/configuracion')}
                  className="mt-2"
                >
                  Ir a Configuración
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card isPressable onPress={() => navigate('/facturacion/facturas')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Facturas</p>
              <p className="text-2xl font-bold">{totalFacturas}</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/facturacion/facturas?status=timbrada')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Timbradas</p>
              <p className="text-2xl font-bold">{facturasTimbradas}</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/facturacion/facturas?status=pendiente')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold">{facturasPendientes}</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/facturacion/facturas?status=cancelada')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Canceladas</p>
              <p className="text-2xl font-bold">{facturasCanceladas}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Total Facturado */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Facturado (Timbradas)</p>
              <p className="text-3xl font-bold text-green-600">
                ${totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-100">
              <DollarSign className="w-10 h-10 text-green-600" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card isPressable onPress={() => navigate('/facturacion/facturas')}>
          <CardBody>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold">Facturas</h3>
                <p className="text-sm text-gray-500">Gestionar facturas emitidas</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/facturacion/complementos-pago')}>
          <CardBody>
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold">Complementos de Pago</h3>
                <p className="text-sm text-gray-500">Registrar pagos recibidos</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/facturacion/configuracion')}>
          <CardBody>
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-purple-600" />
              <div>
                <h3 className="font-semibold">Configuración</h3>
                <p className="text-sm text-gray-500">Certificados y PAC</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Facturas Recientes */}
      {facturas && facturas.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Facturas Recientes</h3>
              <Button
                size="sm"
                variant="flat"
                onPress={() => navigate('/facturacion/facturas')}
              >
                Ver Todas
              </Button>
            </div>

            <div className="space-y-2">
              {facturas.slice(0, 5).map((factura) => (
                <div
                  key={factura.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/facturacion/facturas/${factura.id}`)}
                >
                  <div>
                    <div className="font-semibold">
                      {factura.serie}{factura.folio}
                    </div>
                    <div className="text-sm text-gray-500">
                      {factura.cliente?.razon_social || 'Cliente sin nombre'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">
                      ${factura.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(factura.fecha_emision).toLocaleDateString('es-MX')}
                    </div>
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
