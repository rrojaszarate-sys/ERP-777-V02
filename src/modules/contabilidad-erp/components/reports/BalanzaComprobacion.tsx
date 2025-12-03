/**
 * Balanza de Comprobación - FASE 2.4
 * Reporte de saldos con totales y validación de cuadre
 */
import { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Input,
  Button,
  Chip,
  Divider
} from '@nextui-org/react';
import { Download, Printer, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchBalanceComprobacion } from '../../services/contabilidadService';
import { BalanceComprobacionItem } from '../../types';
import { formatCurrency } from '../../../../shared/utils/formatters';

interface BalanzaComprobacionProps {
  companyId: string;
}

export function BalanzaComprobacion({ companyId }: BalanzaComprobacionProps) {
  const [data, setData] = useState<BalanceComprobacionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de fecha
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const [fechaInicio, setFechaInicio] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(lastDayOfMonth.toISOString().split('T')[0]);

  // Totales
  const [totales, setTotales] = useState({
    saldoInicialDebe: 0,
    saldoInicialHaber: 0,
    debePeriodo: 0,
    haberPeriodo: 0,
    saldoFinalDebe: 0,
    saldoFinalHaber: 0
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resultado = await fetchBalanceComprobacion(companyId, fechaInicio, fechaFin);
      setData(resultado);

      // Calcular totales
      const newTotales = resultado.reduce((acc, item) => {
        // Saldo inicial por naturaleza
        if (item.saldo_inicial >= 0) {
          acc.saldoInicialDebe += item.saldo_inicial;
        } else {
          acc.saldoInicialHaber += Math.abs(item.saldo_inicial);
        }

        acc.debePeriodo += item.debe_periodo;
        acc.haberPeriodo += item.haber_periodo;

        // Saldo final por naturaleza
        if (item.saldo_final >= 0) {
          acc.saldoFinalDebe += item.saldo_final;
        } else {
          acc.saldoFinalHaber += Math.abs(item.saldo_final);
        }

        return acc;
      }, {
        saldoInicialDebe: 0,
        saldoInicialHaber: 0,
        debePeriodo: 0,
        haberPeriodo: 0,
        saldoFinalDebe: 0,
        saldoFinalHaber: 0
      });

      setTotales(newTotales);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la balanza de comprobación');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const handleBuscar = () => {
    loadData();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Balanza de Comprobación', pageWidth / 2, 20, { align: 'center' });
    
    // Período
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Período: ${new Date(fechaInicio).toLocaleDateString('es-MX')} - ${new Date(fechaFin).toLocaleDateString('es-MX')}`,
      pageWidth / 2, 28, { align: 'center' }
    );
    
    // Fecha de generación
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth - 15, 10, { align: 'right' });
    
    // Tabla de datos
    const tableData = data.map(item => [
      item.codigo,
      item.nombre,
      formatCurrency(item.saldo_inicial),
      formatCurrency(item.debe_periodo),
      formatCurrency(item.haber_periodo),
      formatCurrency(item.saldo_final)
    ]);
    
    // Agregar fila de totales
    tableData.push([
      '',
      'TOTALES',
      formatCurrency(totales.saldoInicialDebe - totales.saldoInicialHaber),
      formatCurrency(totales.debePeriodo),
      formatCurrency(totales.haberPeriodo),
      formatCurrency(totales.saldoFinalDebe - totales.saldoFinalHaber)
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [['Código', 'Cuenta', 'Saldo Inicial', 'Debe', 'Haber', 'Saldo Final']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 55 },
        2: { halign: 'right', cellWidth: 28 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'right', cellWidth: 28 }
      },
      foot: [[
        '', '',
        estaCuadrada ? '✓ Balanza Cuadrada' : '⚠ Descuadrada',
        '', '', ''
      ]],
      footStyles: {
        fillColor: estaCuadrada ? [34, 197, 94] : [239, 68, 68],
        textColor: 255,
        fontStyle: 'bold'
      }
    });
    
    // Guardar
    const fileName = `Balanza_${fechaInicio}_${fechaFin}.pdf`;
    doc.save(fileName);
  };

  const handlePrint = () => {
    window.print();
  };

  // Verificar si la balanza está cuadrada
  const estaCuadrada = Math.abs(totales.debePeriodo - totales.haberPeriodo) < 0.01;

  const columns = [
    { key: 'codigo', label: 'CÓDIGO' },
    { key: 'nombre', label: 'CUENTA' },
    { key: 'saldo_inicial', label: 'SALDO INICIAL' },
    { key: 'debe_periodo', label: 'DEBE' },
    { key: 'haber_periodo', label: 'HABER' },
    { key: 'saldo_final', label: 'SALDO FINAL' }
  ];

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500">Cargando balanza de comprobación...</p>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-warning mb-4" />
          <p className="text-danger">{error}</p>
          <Button color="primary" className="mt-4" onPress={loadData}>
            Reintentar
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex justify-between items-center w-full">
          <div>
            <h2 className="text-xl font-bold">Balanza de Comprobación</h2>
            <p className="text-sm text-gray-500">
              Período: {new Date(fechaInicio).toLocaleDateString('es-MX')} - {new Date(fechaFin).toLocaleDateString('es-MX')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="bordered"
              startContent={<Printer className="w-4 h-4" />}
              onPress={handlePrint}
            >
              Imprimir
            </Button>
            <Button
              color="primary"
              startContent={<Download className="w-4 h-4" />}
              onPress={handleExportPDF}
            >
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 items-end w-full">
          <Input
            type="date"
            label="Fecha Inicio"
            value={fechaInicio}
            onValueChange={setFechaInicio}
            startContent={<Calendar className="w-4 h-4 text-gray-400" />}
            className="max-w-xs"
          />
          <Input
            type="date"
            label="Fecha Fin"
            value={fechaFin}
            onValueChange={setFechaFin}
            startContent={<Calendar className="w-4 h-4 text-gray-400" />}
            className="max-w-xs"
          />
          <Button color="primary" onPress={handleBuscar}>
            Generar Reporte
          </Button>
        </div>

        {/* Estado de cuadre */}
        <div className="flex justify-end">
          <Chip
            color={estaCuadrada ? 'success' : 'danger'}
            variant="flat"
            startContent={estaCuadrada ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          >
            {estaCuadrada ? 'Balanza Cuadrada' : 'Balanza Descuadrada'}
          </Chip>
        </div>
      </CardHeader>

      <Divider />

      <CardBody>
        <Table
          aria-label="Balanza de Comprobación"
          isStriped
          classNames={{
            wrapper: 'min-h-[400px]'
          }}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.key}
                align={['saldo_inicial', 'debe_periodo', 'haber_periodo', 'saldo_final'].includes(column.key) ? 'end' : 'start'}
              >
                {column.label}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody items={data} emptyContent="No hay datos para mostrar">
            {(item) => (
              <TableRow key={item.codigo}>
                <TableCell>
                  <span className="font-mono">{item.codigo}</span>
                </TableCell>
                <TableCell>{item.nombre}</TableCell>
                <TableCell>
                  <span className={item.saldo_inicial < 0 ? 'text-danger' : ''}>
                    {formatCurrency(item.saldo_inicial)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    {formatCurrency(item.debe_periodo)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    {formatCurrency(item.haber_periodo)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={item.saldo_final < 0 ? 'text-danger font-bold' : 'font-bold'}>
                    {formatCurrency(item.saldo_final)}
                  </span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Totales */}
        <div className="mt-4 border-t-2 border-gray-300 pt-4">
          <div className="grid grid-cols-6 gap-4 font-bold text-right">
            <div className="text-left col-span-2">TOTALES</div>
            <div>{formatCurrency(totales.saldoInicialDebe)}</div>
            <div>{formatCurrency(totales.debePeriodo)}</div>
            <div>{formatCurrency(totales.haberPeriodo)}</div>
            <div>{formatCurrency(totales.saldoFinalDebe)}</div>
          </div>

          {!estaCuadrada && (
            <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-danger text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                La diferencia es de {formatCurrency(Math.abs(totales.debePeriodo - totales.haberPeriodo))}
              </p>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default BalanzaComprobacion;
