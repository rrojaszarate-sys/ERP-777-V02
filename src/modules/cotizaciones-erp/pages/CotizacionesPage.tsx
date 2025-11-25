/**
 * PÁGINA DE COTIZACIONES
 * Gestión completa de cotizaciones
 */

import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  useDisclosure
} from '@nextui-org/react';
import { Plus, FileText } from 'lucide-react';
import { useCotizaciones } from '../hooks/useCotizaciones';
import { CotizacionForm } from '../components/CotizacionForm';

export const CotizacionesPage: React.FC = () => {
  const { data: cotizaciones, isLoading } = useCotizaciones();
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cotizaciones</h1>
          <p className="text-gray-500 mt-1">
            Gestión de cotizaciones y propuestas comerciales
          </p>
        </div>
        <Button
          color="primary"
          size="lg"
          startContent={<Plus className="w-5 h-5" />}
          onPress={onOpen}
        >
          Nueva Cotización
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        <CardBody>
          <Table aria-label="Cotizaciones" isStriped>
            <TableHeader>
              <TableColumn>FOLIO</TableColumn>
              <TableColumn>CLIENTE</TableColumn>
              <TableColumn>FECHA</TableColumn>
              <TableColumn>TOTAL</TableColumn>
              <TableColumn>STATUS</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              emptyContent="No hay cotizaciones"
            >
              {(cotizaciones || []).map((cot) => (
                <TableRow key={cot.id}>
                  <TableCell>
                    <span className="font-mono font-medium">{cot.folio}</span>
                  </TableCell>
                  <TableCell>
                    {cot.cliente?.razon_social || '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(cot.fecha).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-semibold">
                      ${cot.total.toLocaleString('es-MX')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      color={
                        cot.status === 'aprobada' ? 'success' :
                        cot.status === 'enviada' ? 'primary' :
                        cot.status === 'borrador' ? 'warning' :
                        'default'
                      }
                      variant="flat"
                    >
                      {cot.status.toUpperCase()}
                    </Chip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Modal */}
      <CotizacionForm isOpen={isOpen} onClose={onClose} />
    </div>
  );
};
