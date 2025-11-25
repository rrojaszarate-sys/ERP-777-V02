import React, { useState } from 'react';
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Select, SelectItem } from '@nextui-org/react';
import { Plus, CheckCircle } from 'lucide-react';
import { useMovimientosBancarios, useConciliarMovimiento } from '../hooks/useTesoreria';

export const MovimientosPage: React.FC = () => {
  const [conciliadoFilter, setConciliadoFilter] = useState('');

  const { data: movimientos, isLoading } = useMovimientosBancarios({
    conciliado: conciliadoFilter === 'true' ? true : conciliadoFilter === 'false' ? false : undefined
  });

  const conciliarMovimiento = useConciliarMovimiento();

  const handleConciliar = async (id: number) => {
    await conciliarMovimiento.mutateAsync(id);
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'deposito': return 'success';
      case 'retiro': return 'danger';
      case 'transferencia': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Movimientos Bancarios</h1>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
          Nuevo Movimiento
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex gap-4">
            <Select
              label="Estado de Conciliación"
              selectedKeys={conciliadoFilter ? [conciliadoFilter] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setConciliadoFilter(value);
              }}
              className="w-64"
            >
              <SelectItem key="" value="">Todos</SelectItem>
              <SelectItem key="true" value="true">Conciliados</SelectItem>
              <SelectItem key="false" value="false">Pendientes</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Tabla */}
      <Card>
        <CardBody>
          <Table aria-label="Movimientos Bancarios">
            <TableHeader>
              <TableColumn>FECHA</TableColumn>
              <TableColumn>CUENTA</TableColumn>
              <TableColumn>TIPO</TableColumn>
              <TableColumn>CONCEPTO</TableColumn>
              <TableColumn>REFERENCIA</TableColumn>
              <TableColumn>MONTO</TableColumn>
              <TableColumn>SALDO</TableColumn>
              <TableColumn>CONCILIADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} emptyContent="No hay movimientos">
              {(movimientos || []).map((mov: any) => (
                <TableRow key={mov.id}>
                  <TableCell>{new Date(mov.fecha).toLocaleDateString('es-MX')}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-semibold">{mov.cuenta?.banco}</div>
                      <div className="text-xs text-gray-500">{mov.cuenta?.numero_cuenta}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={getTipoColor(mov.tipo)}>
                      {mov.tipo.toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">{mov.concepto || '-'}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{mov.referencia || '-'}</TableCell>
                  <TableCell className={`font-mono font-semibold ${mov.tipo === 'deposito' ? 'text-green-600' : 'text-red-600'}`}>
                    {mov.tipo === 'deposito' ? '+' : '-'}${mov.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-mono">
                    ${mov.saldo_resultante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {mov.conciliado ? (
                      <Chip size="sm" color="success" startContent={<CheckCircle className="w-3 h-3" />}>
                        CONCILIADO
                      </Chip>
                    ) : (
                      <Chip size="sm" color="warning">
                        PENDIENTE
                      </Chip>
                    )}
                  </TableCell>
                  <TableCell>
                    {!mov.conciliado && (
                      <Button
                        size="sm"
                        color="success"
                        variant="flat"
                        onPress={() => handleConciliar(mov.id)}
                        isLoading={conciliarMovimiento.isPending}
                      >
                        Conciliar
                      </Button>
                    )}
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
