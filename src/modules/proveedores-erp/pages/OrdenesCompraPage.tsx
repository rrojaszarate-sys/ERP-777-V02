import React from 'react';
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip } from '@nextui-org/react';
import { Plus } from 'lucide-react';
import { useOrdenesCompra } from '../hooks/useProveedores';

export const OrdenesCompraPage: React.FC = () => {
  const { data: ordenes, isLoading } = useOrdenesCompra();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
          Nueva Orden
        </Button>
      </div>

      <Card>
        <CardBody>
          <Table aria-label="Órdenes de Compra">
            <TableHeader>
              <TableColumn>FOLIO</TableColumn>
              <TableColumn>PROVEEDOR</TableColumn>
              <TableColumn>FECHA</TableColumn>
              <TableColumn>TOTAL</TableColumn>
              <TableColumn>STATUS</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} emptyContent="No hay órdenes">
              {(ordenes || []).map((orden: any) => (
                <TableRow key={orden.id}>
                  <TableCell className="font-mono">{orden.folio}</TableCell>
                  <TableCell>{orden.proveedor?.razon_social || '-'}</TableCell>
                  <TableCell>{new Date(orden.fecha).toLocaleDateString('es-MX')}</TableCell>
                  <TableCell className="font-mono">${orden.total.toLocaleString('es-MX')}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={orden.status === 'recibida_completa' ? 'success' : 'warning'}>
                      {orden.status.toUpperCase()}
                    </Chip>
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
