/**
 * VISOR DE LIBRO DIARIO
 * Muestra el reporte de libro diario con filtros de fecha
 */

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Chip,
  Spinner
} from '@nextui-org/react';
import { Calendar, Download, Printer } from 'lucide-react';
import { useLibroDiario } from '../hooks/useContabilidad';

export const LibroDiarioViewer: React.FC = () => {
  const [fechaInicio, setFechaInicio] = useState(() => {
    const firstDay = new Date();
    firstDay.setDate(1);
    return firstDay.toISOString().split('T')[0];
  });

  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);

  const { data: movimientos, isLoading, refetch } = useLibroDiario(fechaInicio, fechaFin);

  const calcularTotales = () => {
    if (!movimientos) return { totalDebe: 0, totalHaber: 0 };

    const totalDebe = movimientos.reduce((sum, m) => sum + (m.debe || 0), 0);
    const totalHaber = movimientos.reduce((sum, m) => sum + (m.haber || 0), 0);

    return { totalDebe, totalHaber };
  };

  const { totalDebe, totalHaber } = calcularTotales();

  const handleExportar = () => {
    if (!movimientos || movimientos.length === 0) return;

    // Crear CSV
    const headers = ['Fecha', 'Póliza', 'Tipo', 'Cuenta', 'Concepto', 'Debe', 'Haber', 'Status'];
    const rows = movimientos.map(m => [
      m.fecha,
      m.numero_poliza,
      m.tipo,
      `${m.cuenta_codigo} - ${m.cuenta_nombre}`,
      m.concepto_movimiento,
      m.debe.toFixed(2),
      m.haber.toFixed(2),
      m.status
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `libro_diario_${fechaInicio}_${fechaFin}.csv`;
    link.click();
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-2xl font-bold">Libro Diario</h2>
            <p className="text-sm text-gray-500">
              Registro cronológico de todas las operaciones contables
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              startContent={<Download className="w-4 h-4" />}
              onPress={handleExportar}
              isDisabled={!movimientos || movimientos.length === 0}
            >
              Exportar
            </Button>
            <Button
              size="sm"
              variant="flat"
              startContent={<Printer className="w-4 h-4" />}
              onPress={handleImprimir}
              isDisabled={!movimientos || movimientos.length === 0}
            >
              Imprimir
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-end gap-4 w-full">
          <Input
            label="Fecha Inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            startContent={<Calendar className="w-4 h-4" />}
            className="max-w-xs"
          />
          <Input
            label="Fecha Fin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            startContent={<Calendar className="w-4 h-4" />}
            className="max-w-xs"
          />
          <Button color="primary" onPress={() => refetch()}>
            Consultar
          </Button>
        </div>
      </CardHeader>

      <CardBody>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <Table aria-label="Libro Diario" isStriped>
              <TableHeader>
                <TableColumn>FECHA</TableColumn>
                <TableColumn>PÓLIZA</TableColumn>
                <TableColumn>TIPO</TableColumn>
                <TableColumn>CUENTA</TableColumn>
                <TableColumn>CONCEPTO</TableColumn>
                <TableColumn>DEBE</TableColumn>
                <TableColumn>HABER</TableColumn>
                <TableColumn>STATUS</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay movimientos en el periodo seleccionado">
                {(movimientos || []).map((mov, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(mov.fecha).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{mov.numero_poliza}</span>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color="primary">
                        {mov.tipo.toUpperCase()}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-gray-500">{mov.cuenta_codigo}</span>
                        <span className="text-sm">{mov.cuenta_nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="text-sm line-clamp-2">{mov.concepto_movimiento}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {mov.debe > 0 && (
                        <span className="font-mono text-sm text-green-600">
                          ${mov.debe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {mov.haber > 0 && (
                        <span className="font-mono text-sm text-blue-600">
                          ${mov.haber.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={
                          mov.status === 'aplicada' ? 'success' :
                          mov.status === 'borrador' ? 'warning' :
                          'danger'
                        }
                        variant="flat"
                      >
                        {mov.status === 'aplicada' ? 'Aplicada' :
                         mov.status === 'borrador' ? 'Borrador' :
                         'Cancelada'}
                      </Chip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totales */}
            {movimientos && movimientos.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Total Debe:</span>
                    <span className="font-mono font-semibold text-green-600">
                      ${totalDebe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Total Haber:</span>
                    <span className="font-mono font-semibold text-blue-600">
                      ${totalHaber.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 pt-2 border-t">
                    <span className="text-sm text-gray-600">Diferencia:</span>
                    <span className={`font-mono font-semibold ${Math.abs(totalDebe - totalHaber) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(totalDebe - totalHaber).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};
