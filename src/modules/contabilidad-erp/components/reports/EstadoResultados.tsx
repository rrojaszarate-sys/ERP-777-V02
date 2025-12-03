/**
 * Estado de Resultados - FASE 2.4
 * Reporte de ingresos, gastos y utilidad del período
 */
import { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Input,
  Button,
  Chip,
  Divider,
  Progress
} from '@nextui-org/react';
import {
  Download,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart
} from 'lucide-react';
import { supabase } from '../../../../core/config/supabase';
import { EstadoResultados as EstadoResultadosType } from '../../types';
import { formatCurrency } from '../../../../shared/utils/formatters';

interface EstadoResultadosProps {
  companyId: string;
}

export function EstadoResultados({ companyId }: EstadoResultadosProps) {
  const [data, setData] = useState<EstadoResultadosType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de fecha
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const [fechaInicio, setFechaInicio] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(lastDayOfMonth.toISOString().split('T')[0]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Obtener cuentas con sus movimientos
      const { data: cuentas, error: cuentasError } = await supabase
        .from('cont_plan_cuentas')
        .select('id, codigo, nombre, tipo')
        .eq('company_id', companyId)
        .eq('acepta_movimientos', true)
        .eq('activo', true)
        .in('tipo', ['ingreso', 'gasto']);

      if (cuentasError) throw cuentasError;

      // Obtener movimientos del período
      const { data: movimientos, error: movError } = await supabase
        .from('cont_movimientos')
        .select(`
          cuenta_id,
          debe,
          haber,
          poliza:cont_polizas!inner(company_id, status, fecha)
        `)
        .eq('poliza.company_id', companyId)
        .eq('poliza.status', 'aplicada')
        .gte('poliza.fecha', fechaInicio)
        .lte('poliza.fecha', fechaFin);

      if (movError) throw movError;

      // Agrupar movimientos por cuenta
      const movPorCuenta: Record<number, { debe: number; haber: number }> = {};
      movimientos?.forEach((m: any) => {
        if (!movPorCuenta[m.cuenta_id]) {
          movPorCuenta[m.cuenta_id] = { debe: 0, haber: 0 };
        }
        movPorCuenta[m.cuenta_id].debe += m.debe || 0;
        movPorCuenta[m.cuenta_id].haber += m.haber || 0;
      });

      // Calcular totales por tipo de cuenta
      let ventasNetas = 0;
      let costoVentas = 0;
      let gastosOperacion = 0;
      let otrosIngresos = 0;
      let otrosGastos = 0;

      cuentas?.forEach(cuenta => {
        const movs = movPorCuenta[cuenta.id] || { debe: 0, haber: 0 };
        const saldo = movs.haber - movs.debe; // Ingresos son acreedores

        if (cuenta.tipo === 'ingreso') {
          // Las cuentas de ingreso 4xx son ventas
          if (cuenta.codigo.startsWith('4')) {
            if (cuenta.codigo.startsWith('401') || cuenta.codigo.startsWith('402')) {
              ventasNetas += saldo;
            } else if (cuenta.codigo.startsWith('403') || cuenta.codigo.startsWith('404')) {
              costoVentas += (movs.debe - movs.haber); // Costo es deudor
            } else {
              otrosIngresos += saldo;
            }
          }
        } else if (cuenta.tipo === 'gasto') {
          // Las cuentas de gasto 5xx y 6xx
          const gastoDebe = movs.debe - movs.haber;
          if (cuenta.codigo.startsWith('5')) {
            gastosOperacion += gastoDebe;
          } else if (cuenta.codigo.startsWith('6')) {
            otrosGastos += gastoDebe;
          }
        }
      });

      // Calcular resultados
      const utilidadBruta = ventasNetas - costoVentas;
      const utilidadOperacion = utilidadBruta - gastosOperacion;
      const utilidadAntesImpuestos = utilidadOperacion + otrosIngresos - otrosGastos;
      const impuestos = utilidadAntesImpuestos > 0 ? utilidadAntesImpuestos * 0.30 : 0; // 30% ISR
      const utilidadNeta = utilidadAntesImpuestos - impuestos;

      setData({
        ventas_netas: ventasNetas,
        costo_ventas: costoVentas,
        utilidad_bruta: utilidadBruta,
        gastos_operacion: gastosOperacion,
        utilidad_operacion: utilidadOperacion,
        otros_ingresos: otrosIngresos,
        otros_gastos: otrosGastos,
        utilidad_antes_impuestos: utilidadAntesImpuestos,
        impuestos,
        utilidad_neta: utilidadNeta
      });

    } catch (err: any) {
      setError(err.message || 'Error al cargar el estado de resultados');
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
    console.log('Exportar PDF');
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500">Cargando estado de resultados...</p>
        </CardBody>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <p className="text-danger">{error || 'No hay datos disponibles'}</p>
          <Button color="primary" className="mt-4" onPress={loadData}>
            Reintentar
          </Button>
        </CardBody>
      </Card>
    );
  }

  const margenBruto = data.ventas_netas > 0 ? (data.utilidad_bruta / data.ventas_netas) * 100 : 0;
  const margenNeto = data.ventas_netas > 0 ? (data.utilidad_neta / data.ventas_netas) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex justify-between items-center w-full">
          <div>
            <h2 className="text-xl font-bold">Estado de Resultados</h2>
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
      </CardHeader>

      <Divider />

      <CardBody>
        {/* Indicadores rápidos */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-success-50">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 text-success">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">Ventas Netas</span>
              </div>
              <p className="text-2xl font-bold mt-2">{formatCurrency(data.ventas_netas)}</p>
            </CardBody>
          </Card>

          <Card className="bg-warning-50">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 text-warning">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium">Utilidad Bruta</span>
              </div>
              <p className="text-2xl font-bold mt-2">{formatCurrency(data.utilidad_bruta)}</p>
              <p className="text-xs text-gray-500">Margen: {margenBruto.toFixed(1)}%</p>
            </CardBody>
          </Card>

          <Card className="bg-primary-50">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 text-primary">
                <PieChart className="w-5 h-5" />
                <span className="text-sm font-medium">Utilidad Operación</span>
              </div>
              <p className="text-2xl font-bold mt-2">{formatCurrency(data.utilidad_operacion)}</p>
            </CardBody>
          </Card>

          <Card className={data.utilidad_neta >= 0 ? 'bg-success-50' : 'bg-danger-50'}>
            <CardBody className="p-4">
              <div className={`flex items-center gap-2 ${data.utilidad_neta >= 0 ? 'text-success' : 'text-danger'}`}>
                {data.utilidad_neta >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <span className="text-sm font-medium">Utilidad Neta</span>
              </div>
              <p className="text-2xl font-bold mt-2">{formatCurrency(data.utilidad_neta)}</p>
              <p className="text-xs text-gray-500">Margen: {margenNeto.toFixed(1)}%</p>
            </CardBody>
          </Card>
        </div>

        {/* Reporte detallado */}
        <div className="space-y-4 max-w-2xl">
          {/* Ventas */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold">Ventas Netas</span>
              <span className="font-bold text-lg">{formatCurrency(data.ventas_netas)}</span>
            </div>
          </div>

          {/* Costo de Ventas */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center py-2 text-gray-600">
              <span className="pl-4">(-) Costo de Ventas</span>
              <span className="text-danger">{formatCurrency(data.costo_ventas)}</span>
            </div>
          </div>

          {/* Utilidad Bruta */}
          <div className="border-b pb-4 bg-gray-50 p-2 rounded">
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold">(=) Utilidad Bruta</span>
              <span className={`font-bold text-lg ${data.utilidad_bruta >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(data.utilidad_bruta)}
              </span>
            </div>
            <Progress
              value={margenBruto}
              color={margenBruto >= 30 ? 'success' : margenBruto >= 20 ? 'warning' : 'danger'}
              size="sm"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">Margen Bruto: {margenBruto.toFixed(2)}%</p>
          </div>

          {/* Gastos de Operación */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center py-2 text-gray-600">
              <span className="pl-4">(-) Gastos de Operación</span>
              <span className="text-danger">{formatCurrency(data.gastos_operacion)}</span>
            </div>
          </div>

          {/* Utilidad de Operación */}
          <div className="border-b pb-4 bg-gray-50 p-2 rounded">
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold">(=) Utilidad de Operación</span>
              <span className={`font-bold text-lg ${data.utilidad_operacion >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(data.utilidad_operacion)}
              </span>
            </div>
          </div>

          {/* Otros Ingresos/Gastos */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center py-2 text-gray-600">
              <span className="pl-4">(+) Otros Ingresos</span>
              <span className="text-success">{formatCurrency(data.otros_ingresos)}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-gray-600">
              <span className="pl-4">(-) Otros Gastos</span>
              <span className="text-danger">{formatCurrency(data.otros_gastos)}</span>
            </div>
          </div>

          {/* Utilidad antes de Impuestos */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold">(=) Utilidad antes de Impuestos</span>
              <span className={`font-bold ${data.utilidad_antes_impuestos >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(data.utilidad_antes_impuestos)}
              </span>
            </div>
          </div>

          {/* Impuestos */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center py-2 text-gray-600">
              <span className="pl-4">(-) ISR (30%)</span>
              <span className="text-danger">{formatCurrency(data.impuestos)}</span>
            </div>
          </div>

          {/* Utilidad Neta */}
          <div className="p-4 rounded-lg" style={{
            backgroundColor: data.utilidad_neta >= 0 ? 'var(--nextui-colors-success50)' : 'var(--nextui-colors-danger50)'
          }}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">(=) UTILIDAD NETA</span>
              <span className={`font-bold text-2xl ${data.utilidad_neta >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(data.utilidad_neta)}
              </span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default EstadoResultados;
