import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { Users, Calendar, DollarSign, AlertCircle, UserPlus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEmpleados, usePeriodosNomina, useIncidencias } from '../hooks/useRRHH';

export const RRHHDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: empleados } = useEmpleados({ status: 'activo' });
  const { data: periodos } = usePeriodosNomina();
  const { data: incidencias } = useIncidencias({
    fecha_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    fecha_fin: new Date().toISOString()
  });

  const empleadosActivos = empleados?.length || 0;
  const incidenciasMes = incidencias?.length || 0;
  const periodoActual = periodos?.[0];
  const nominaMensual = periodoActual?.total_neto || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recursos Humanos y Nómina</h1>
          <p className="text-gray-500 mt-1">Gestión de personal y nómina</p>
        </div>
        <div className="flex gap-2">
          <Button
            color="secondary"
            variant="flat"
            onPress={() => navigate('/rrhh/nomina')}
            startContent={<FileText className="w-4 h-4" />}
          >
            Procesar Nómina
          </Button>
          <Button
            color="primary"
            onPress={() => navigate('/rrhh/empleados/nuevo')}
            startContent={<UserPlus className="w-4 h-4" />}
          >
            Nuevo Empleado
          </Button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card isPressable onPress={() => navigate('/rrhh/empleados')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Empleados Activos</p>
              <p className="text-2xl font-bold">{empleadosActivos}</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/rrhh/nomina')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Nómina Mensual</p>
              <p className="text-2xl font-bold">
                ${nominaMensual.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/rrhh/incidencias')}>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Incidencias del Mes</p>
              <p className="text-2xl font-bold">{incidenciasMes}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vacaciones Pendientes</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Período de Nómina Actual */}
      {periodoActual && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Período de Nómina Actual</h3>
              <Button
                size="sm"
                color="primary"
                onPress={() => navigate(`/rrhh/nomina/${periodoActual.id}`)}
              >
                Ver Detalle
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="font-semibold capitalize">{periodoActual.tipo_nomina}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Período</p>
                <p className="font-semibold">
                  {new Date(periodoActual.fecha_inicio).toLocaleDateString('es-MX')} - {new Date(periodoActual.fecha_fin).toLocaleDateString('es-MX')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de Pago</p>
                <p className="font-semibold">{new Date(periodoActual.fecha_pago).toLocaleDateString('es-MX')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <p className="font-semibold capitalize">{periodoActual.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-500">Total Percepciones</p>
                <p className="text-lg font-bold text-green-600">
                  ${periodoActual.total_percepciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Deducciones</p>
                <p className="text-lg font-bold text-red-600">
                  ${periodoActual.total_deducciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Neto</p>
                <p className="text-xl font-bold text-blue-600">
                  ${periodoActual.total_neto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card isPressable onPress={() => navigate('/rrhh/empleados')}>
          <CardBody>
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold">Empleados</h3>
                <p className="text-sm text-gray-500">Gestionar plantilla de personal</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/rrhh/nomina')}>
          <CardBody>
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold">Nómina</h3>
                <p className="text-sm text-gray-500">Procesar y consultar nóminas</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => navigate('/rrhh/incidencias')}>
          <CardBody>
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-yellow-600" />
              <div>
                <h3 className="font-semibold">Incidencias</h3>
                <p className="text-sm text-gray-500">Faltas, permisos y vacaciones</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
