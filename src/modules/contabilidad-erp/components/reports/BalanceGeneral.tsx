/**
 * Balance General - FASE 2.4
 * Estado de Situación Financiera (Activo, Pasivo, Capital)
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
  Accordion,
  AccordionItem
} from '@nextui-org/react';
import {
  Download,
  Printer,
  Calendar,
  Building2,
  CreditCard,
  Wallet,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../../../core/config/supabase';
import { BalanceGeneral as BalanceGeneralType, PlanCuentas } from '../../types';
import { formatCurrency } from '../../../../shared/utils/formatters';

interface CuentaConSaldo extends PlanCuentas {
  saldo: number;
}

interface BalanceGeneralProps {
  companyId: string;
}

export function BalanceGeneral({ companyId }: BalanceGeneralProps) {
  const [data, setData] = useState<BalanceGeneralType | null>(null);
  const [cuentasDetalle, setCuentasDetalle] = useState<{
    activos: CuentaConSaldo[];
    pasivos: CuentaConSaldo[];
    capital: CuentaConSaldo[];
  }>({ activos: [], pasivos: [], capital: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Obtener todas las cuentas con tipo activo, pasivo o capital
      const { data: cuentas, error: cuentasError } = await supabase
        .from('cont_plan_cuentas')
        .select('*')
        .eq('company_id', companyId)
        .eq('activo', true)
        .in('tipo', ['activo', 'pasivo', 'capital'])
        .order('codigo');

      if (cuentasError) throw cuentasError;

      // Obtener movimientos hasta la fecha de corte
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
        .lte('poliza.fecha', fechaCorte);

      if (movError) throw movError;

      // Calcular saldos por cuenta
      const saldosPorCuenta: Record<number, number> = {};
      movimientos?.forEach((m: any) => {
        if (!saldosPorCuenta[m.cuenta_id]) {
          saldosPorCuenta[m.cuenta_id] = 0;
        }
        saldosPorCuenta[m.cuenta_id] += (m.debe || 0) - (m.haber || 0);
      });

      // Clasificar cuentas y calcular totales
      const activos: CuentaConSaldo[] = [];
      const pasivos: CuentaConSaldo[] = [];
      const capital: CuentaConSaldo[] = [];

      let activoCirculante = 0;
      let activoFijo = 0;
      let activoDiferido = 0;
      let pasivoCirculante = 0;
      let pasivoLargoPlazo = 0;
      let capitalContable = 0;

      cuentas?.forEach(cuenta => {
        const saldoInicial = cuenta.saldo_inicial || 0;
        const movimiento = saldosPorCuenta[cuenta.id] || 0;
        let saldo = saldoInicial;

        // Calcular saldo según naturaleza
        if (cuenta.naturaleza === 'deudora') {
          saldo = saldoInicial + movimiento;
        } else {
          saldo = saldoInicial - movimiento;
        }

        const cuentaConSaldo: CuentaConSaldo = { ...cuenta, saldo };

        if (cuenta.tipo === 'activo') {
          activos.push(cuentaConSaldo);
          // Clasificar por código
          if (cuenta.codigo.startsWith('1.1') || cuenta.codigo.startsWith('11')) {
            activoCirculante += saldo;
          } else if (cuenta.codigo.startsWith('1.2') || cuenta.codigo.startsWith('12')) {
            activoFijo += saldo;
          } else if (cuenta.codigo.startsWith('1.3') || cuenta.codigo.startsWith('13')) {
            activoDiferido += saldo;
          } else {
            activoCirculante += saldo; // Por defecto
          }
        } else if (cuenta.tipo === 'pasivo') {
          pasivos.push(cuentaConSaldo);
          if (cuenta.codigo.startsWith('2.1') || cuenta.codigo.startsWith('21')) {
            pasivoCirculante += saldo;
          } else if (cuenta.codigo.startsWith('2.2') || cuenta.codigo.startsWith('22')) {
            pasivoLargoPlazo += saldo;
          } else {
            pasivoCirculante += saldo;
          }
        } else if (cuenta.tipo === 'capital') {
          capital.push(cuentaConSaldo);
          capitalContable += saldo;
        }
      });

      const activoTotal = activoCirculante + activoFijo + activoDiferido;
      const pasivoTotal = pasivoCirculante + pasivoLargoPlazo;
      const pasivoMasCapital = pasivoTotal + capitalContable;

      setCuentasDetalle({ activos, pasivos, capital });
      setData({
        activo_circulante: activoCirculante,
        activo_fijo: activoFijo,
        activo_diferido: activoDiferido,
        activo_total: activoTotal,
        pasivo_circulante: pasivoCirculante,
        pasivo_largo_plazo: pasivoLargoPlazo,
        pasivo_total: pasivoTotal,
        capital_contable: capitalContable,
        pasivo_mas_capital: pasivoMasCapital
      });

    } catch (err: any) {
      setError(err.message || 'Error al cargar el balance general');
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
          <p className="mt-4 text-gray-500">Cargando balance general...</p>
        </CardBody>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-warning mb-4" />
          <p className="text-danger">{error || 'No hay datos disponibles'}</p>
          <Button color="primary" className="mt-4" onPress={loadData}>
            Reintentar
          </Button>
        </CardBody>
      </Card>
    );
  }

  // Verificar si el balance cuadra (Activo = Pasivo + Capital)
  const cuadra = Math.abs(data.activo_total - data.pasivo_mas_capital) < 0.01;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex justify-between items-center w-full">
          <div>
            <h2 className="text-xl font-bold">Balance General</h2>
            <p className="text-sm text-gray-500">
              Estado de Situación Financiera al {new Date(fechaCorte).toLocaleDateString('es-MX')}
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
            label="Fecha de Corte"
            value={fechaCorte}
            onValueChange={setFechaCorte}
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
            color={cuadra ? 'success' : 'danger'}
            variant="flat"
            startContent={cuadra ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          >
            {cuadra ? 'Balance Cuadrado' : 'Balance Descuadrado'}
          </Chip>
        </div>
      </CardHeader>

      <Divider />

      <CardBody>
        <div className="grid grid-cols-2 gap-8">
          {/* ACTIVO */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-primary">ACTIVO</h3>
            </div>

            <Accordion variant="bordered">
              {/* Activo Circulante */}
              <AccordionItem
                key="circulante"
                title={
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-medium">Activo Circulante</span>
                    <span className="font-bold">{formatCurrency(data.activo_circulante)}</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {cuentasDetalle.activos
                    .filter(c => c.codigo.startsWith('1.1') || c.codigo.startsWith('11'))
                    .map(cuenta => (
                      <div key={cuenta.id} className="flex justify-between text-sm pl-4">
                        <span className="text-gray-600">
                          <span className="font-mono text-xs mr-2">{cuenta.codigo}</span>
                          {cuenta.nombre}
                        </span>
                        <span>{formatCurrency(cuenta.saldo)}</span>
                      </div>
                    ))}
                </div>
              </AccordionItem>

              {/* Activo Fijo */}
              <AccordionItem
                key="fijo"
                title={
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-medium">Activo Fijo</span>
                    <span className="font-bold">{formatCurrency(data.activo_fijo)}</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {cuentasDetalle.activos
                    .filter(c => c.codigo.startsWith('1.2') || c.codigo.startsWith('12'))
                    .map(cuenta => (
                      <div key={cuenta.id} className="flex justify-between text-sm pl-4">
                        <span className="text-gray-600">
                          <span className="font-mono text-xs mr-2">{cuenta.codigo}</span>
                          {cuenta.nombre}
                        </span>
                        <span>{formatCurrency(cuenta.saldo)}</span>
                      </div>
                    ))}
                </div>
              </AccordionItem>

              {/* Activo Diferido */}
              <AccordionItem
                key="diferido"
                title={
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-medium">Activo Diferido</span>
                    <span className="font-bold">{formatCurrency(data.activo_diferido)}</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {cuentasDetalle.activos
                    .filter(c => c.codigo.startsWith('1.3') || c.codigo.startsWith('13'))
                    .map(cuenta => (
                      <div key={cuenta.id} className="flex justify-between text-sm pl-4">
                        <span className="text-gray-600">
                          <span className="font-mono text-xs mr-2">{cuenta.codigo}</span>
                          {cuenta.nombre}
                        </span>
                        <span>{formatCurrency(cuenta.saldo)}</span>
                      </div>
                    ))}
                </div>
              </AccordionItem>
            </Accordion>

            {/* Total Activo */}
            <div className="mt-4 p-4 bg-primary-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-bold text-primary">TOTAL ACTIVO</span>
                <span className="font-bold text-xl text-primary">
                  {formatCurrency(data.activo_total)}
                </span>
              </div>
            </div>
          </div>

          {/* PASIVO + CAPITAL */}
          <div>
            {/* PASIVO */}
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-danger" />
              <h3 className="text-lg font-bold text-danger">PASIVO</h3>
            </div>

            <Accordion variant="bordered">
              {/* Pasivo Circulante */}
              <AccordionItem
                key="pasivo-circulante"
                title={
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-medium">Pasivo Circulante</span>
                    <span className="font-bold">{formatCurrency(data.pasivo_circulante)}</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {cuentasDetalle.pasivos
                    .filter(c => c.codigo.startsWith('2.1') || c.codigo.startsWith('21'))
                    .map(cuenta => (
                      <div key={cuenta.id} className="flex justify-between text-sm pl-4">
                        <span className="text-gray-600">
                          <span className="font-mono text-xs mr-2">{cuenta.codigo}</span>
                          {cuenta.nombre}
                        </span>
                        <span>{formatCurrency(cuenta.saldo)}</span>
                      </div>
                    ))}
                </div>
              </AccordionItem>

              {/* Pasivo a Largo Plazo */}
              <AccordionItem
                key="pasivo-largo"
                title={
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-medium">Pasivo a Largo Plazo</span>
                    <span className="font-bold">{formatCurrency(data.pasivo_largo_plazo)}</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {cuentasDetalle.pasivos
                    .filter(c => c.codigo.startsWith('2.2') || c.codigo.startsWith('22'))
                    .map(cuenta => (
                      <div key={cuenta.id} className="flex justify-between text-sm pl-4">
                        <span className="text-gray-600">
                          <span className="font-mono text-xs mr-2">{cuenta.codigo}</span>
                          {cuenta.nombre}
                        </span>
                        <span>{formatCurrency(cuenta.saldo)}</span>
                      </div>
                    ))}
                </div>
              </AccordionItem>
            </Accordion>

            {/* Total Pasivo */}
            <div className="mt-4 p-3 bg-danger-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-bold text-danger">Total Pasivo</span>
                <span className="font-bold text-lg text-danger">
                  {formatCurrency(data.pasivo_total)}
                </span>
              </div>
            </div>

            {/* CAPITAL */}
            <div className="flex items-center gap-2 mt-6 mb-4">
              <Wallet className="w-5 h-5 text-success" />
              <h3 className="text-lg font-bold text-success">CAPITAL CONTABLE</h3>
            </div>

            <Accordion variant="bordered">
              <AccordionItem
                key="capital"
                title={
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-medium">Capital Contable</span>
                    <span className="font-bold">{formatCurrency(data.capital_contable)}</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {cuentasDetalle.capital.map(cuenta => (
                    <div key={cuenta.id} className="flex justify-between text-sm pl-4">
                      <span className="text-gray-600">
                        <span className="font-mono text-xs mr-2">{cuenta.codigo}</span>
                        {cuenta.nombre}
                      </span>
                      <span>{formatCurrency(cuenta.saldo)}</span>
                    </div>
                  ))}
                </div>
              </AccordionItem>
            </Accordion>

            {/* Total Capital */}
            <div className="mt-4 p-3 bg-success-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-bold text-success">Total Capital</span>
                <span className="font-bold text-lg text-success">
                  {formatCurrency(data.capital_contable)}
                </span>
              </div>
            </div>

            {/* Total Pasivo + Capital */}
            <div className="mt-4 p-4 bg-secondary-50 rounded-lg border-2 border-secondary">
              <div className="flex justify-between items-center">
                <span className="font-bold">PASIVO + CAPITAL</span>
                <span className="font-bold text-xl">
                  {formatCurrency(data.pasivo_mas_capital)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verificación de cuadre */}
        {!cuadra && (
          <div className="mt-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-danger flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <strong>Advertencia:</strong> El balance no cuadra. Diferencia: {formatCurrency(Math.abs(data.activo_total - data.pasivo_mas_capital))}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Activo ({formatCurrency(data.activo_total)}) ≠ Pasivo + Capital ({formatCurrency(data.pasivo_mas_capital)})
            </p>
          </div>
        )}

        {cuadra && (
          <div className="mt-6 p-4 bg-success-50 border border-success-200 rounded-lg">
            <p className="text-success flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <strong>Ecuación contable verificada:</strong> Activo = Pasivo + Capital
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default BalanceGeneral;
