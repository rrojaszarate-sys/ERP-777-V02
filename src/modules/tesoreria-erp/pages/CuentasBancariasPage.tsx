import React from 'react';
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip } from '@nextui-org/react';
import { Plus, Edit2, Building2 } from 'lucide-react';
import { useCuentasBancarias } from '../hooks/useTesoreria';

export const CuentasBancariasPage: React.FC = () => {
  const { data: cuentas, isLoading } = useCuentasBancarias();

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'cheques': return 'primary';
      case 'inversion': return 'success';
      case 'nomina': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cuentas Bancarias</h1>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
          Nueva Cuenta
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Cuentas</p>
                <p className="text-2xl font-bold">{cuentas?.length || 0}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Cuentas Activas</p>
                <p className="text-2xl font-bold">{cuentas?.filter(c => c.activa).length || 0}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm text-gray-500">Saldo Total</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(cuentas?.filter(c => c.activa).reduce((sum, c) => sum + c.saldo_actual, 0) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardBody>
          <Table aria-label="Cuentas Bancarias">
            <TableHeader>
              <TableColumn>BANCO</TableColumn>
              <TableColumn>NÚMERO DE CUENTA</TableColumn>
              <TableColumn>CLABE</TableColumn>
              <TableColumn>TIPO</TableColumn>
              <TableColumn>MONEDA</TableColumn>
              <TableColumn>SALDO</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} emptyContent="No hay cuentas bancarias">
              {(cuentas || []).map((cuenta: any) => (
                <TableRow key={cuenta.id}>
                  <TableCell className="font-semibold">{cuenta.banco}</TableCell>
                  <TableCell className="font-mono">{cuenta.numero_cuenta}</TableCell>
                  <TableCell className="font-mono text-sm">{cuenta.clabe || '-'}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={getTipoColor(cuenta.tipo)}>
                      {cuenta.tipo.toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>{cuenta.moneda}</TableCell>
                  <TableCell className="font-mono font-semibold text-green-600">
                    ${cuenta.saldo_actual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={cuenta.activa ? 'success' : 'default'}>
                      {cuenta.activa ? 'ACTIVA' : 'INACTIVA'}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Button isIconOnly size="sm" variant="light">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
};
