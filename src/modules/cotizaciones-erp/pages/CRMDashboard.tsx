/**
 * DASHBOARD CRM
 * Vista principal del módulo CRM con métricas y accesos rápidos
 */

import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { Users, FileText, TrendingUp, DollarSign, Calendar, Target, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClientes, useOportunidades } from '../hooks/useCRM';
import { useCotizaciones } from '../hooks/useCotizaciones';

export const CRMDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: clientes } = useClientes();
  const { data: oportunidades } = useOportunidades();
  const { data: cotizaciones } = useCotizaciones();

  // Calcular métricas
  const totalClientes = clientes?.filter(c => c.tipo === 'cliente').length || 0;
  const totalProspectos = clientes?.filter(c => c.tipo === 'prospecto').length || 0;

  const oportunidadesActivas = oportunidades?.filter(
    op => !['ganada', 'perdida'].includes(op.etapa)
  ).length || 0;

  const valorPipeline = oportunidades
    ?.filter(op => !['ganada', 'perdida'].includes(op.etapa))
    .reduce((sum, op) => sum + (op.valor_estimado || 0), 0) || 0;

  const cotizacionesEnviadas = cotizaciones?.filter(c => c.status === 'enviada').length || 0;
  const cotizacionesAprobadas = cotizaciones?.filter(c => c.status === 'aprobada').length || 0;

  const valorCotizadoMes = cotizaciones
    ?.filter(c => {
      const fecha = new Date(c.fecha);
      const hoy = new Date();
      return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    })
    .reduce((sum, c) => sum + c.total, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM y Ventas</h1>
          <p className="text-gray-500 mt-1">
            Gestión de clientes, oportunidades y cotizaciones
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            color="primary"
            variant="flat"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => navigate('/crm/clientes/nuevo')}
          >
            Nuevo Cliente
          </Button>
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => navigate('/crm/cotizaciones/nueva')}
          >
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card isPressable onPress={() => navigate('/crm/clientes')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Clientes</p>
              <p className="text-2xl font-bold">{totalClientes}</p>
              <p className="text-xs text-gray-500">{totalProspectos} prospectos</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/crm/pipeline')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Oportunidades Activas</p>
              <p className="text-2xl font-bold">{oportunidadesActivas}</p>
              <p className="text-xs text-gray-500">
                ${valorPipeline.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/crm/cotizaciones')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cotizaciones Enviadas</p>
              <p className="text-2xl font-bold">{cotizacionesEnviadas}</p>
              <p className="text-xs text-gray-500">{cotizacionesAprobadas} aprobadas</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cotizado este Mes</p>
              <p className="text-2xl font-bold">
                ${valorCotizadoMes.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cotizaciones recientes */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cotizaciones Recientes</h3>
              <Button
                size="sm"
                variant="flat"
                onPress={() => navigate('/crm/cotizaciones')}
              >
                Ver todas
              </Button>
            </div>
            <div className="space-y-3">
              {cotizaciones?.slice(0, 5).map((cot) => (
                <div
                  key={cot.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/crm/cotizaciones/${cot.id}`)}
                >
                  <div>
                    <p className="font-medium">{cot.folio}</p>
                    <p className="text-sm text-gray-500">
                      {cot.cliente?.razon_social}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">
                      ${cot.total.toLocaleString('es-MX')}
                    </p>
                    <p className="text-xs text-gray-500">{cot.status}</p>
                  </div>
                </div>
              ))}
              {(!cotizaciones || cotizaciones.length === 0) && (
                <p className="text-center text-gray-500 py-8">
                  No hay cotizaciones recientes
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Actividades pendientes */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Próximas Actividades</h3>
              <Button
                size="sm"
                variant="flat"
                onPress={() => navigate('/crm/actividades')}
              >
                Ver todas
              </Button>
            </div>
            <div className="space-y-3">
              <div className="text-center text-gray-500 py-8">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No hay actividades programadas</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">Accesos Rápidos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="flat"
              className="h-20"
              onPress={() => navigate('/crm/clientes')}
            >
              <div className="flex flex-col items-center gap-2">
                <Users className="w-6 h-6" />
                <span>Clientes</span>
              </div>
            </Button>
            <Button
              variant="flat"
              className="h-20"
              onPress={() => navigate('/crm/pipeline')}
            >
              <div className="flex flex-col items-center gap-2">
                <Target className="w-6 h-6" />
                <span>Pipeline</span>
              </div>
            </Button>
            <Button
              variant="flat"
              className="h-20"
              onPress={() => navigate('/crm/cotizaciones')}
            >
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-6 h-6" />
                <span>Cotizaciones</span>
              </div>
            </Button>
            <Button
              variant="flat"
              className="h-20"
              onPress={() => navigate('/crm/productos')}
            >
              <div className="flex flex-col items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                <span>Productos</span>
              </div>
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
