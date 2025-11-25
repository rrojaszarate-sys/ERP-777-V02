/**
 * FORMULARIO DE PÓLIZA CONTABLE
 * Permite crear y editar pólizas con sus movimientos
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip
} from '@nextui-org/react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useCuentasOperativas, useCreatePoliza } from '../hooks/useContabilidad';
import type { Poliza, Movimiento } from '../types';

interface PolizaFormProps {
  isOpen: boolean;
  onClose: () => void;
  poliza?: Poliza | null;
}

interface MovimientoRow {
  id: string;
  cuenta_id: number | null;
  concepto: string;
  debe: number;
  haber: number;
  referencia: string;
}

export const PolizaForm: React.FC<PolizaFormProps> = ({
  isOpen,
  onClose,
  poliza
}) => {
  const { data: cuentas, isLoading: loadingCuentas } = useCuentasOperativas();
  const createPoliza = useCreatePoliza();

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<string>('diario');
  const [concepto, setConcepto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([]);

  useEffect(() => {
    if (isOpen && !poliza) {
      // Agregar dos líneas vacías por defecto
      setMovimientos([
        { id: crypto.randomUUID(), cuenta_id: null, concepto: '', debe: 0, haber: 0, referencia: '' },
        { id: crypto.randomUUID(), cuenta_id: null, concepto: '', debe: 0, haber: 0, referencia: '' }
      ]);
    }
  }, [isOpen, poliza]);

  const agregarMovimiento = () => {
    setMovimientos([
      ...movimientos,
      { id: crypto.randomUUID(), cuenta_id: null, concepto: '', debe: 0, haber: 0, referencia: '' }
    ]);
  };

  const eliminarMovimiento = (id: string) => {
    if (movimientos.length > 2) {
      setMovimientos(movimientos.filter(m => m.id !== id));
    }
  };

  const actualizarMovimiento = (id: string, campo: keyof MovimientoRow, valor: any) => {
    setMovimientos(movimientos.map(m =>
      m.id === id ? { ...m, [campo]: valor } : m
    ));
  };

  const calcularTotales = () => {
    const totalDebe = movimientos.reduce((sum, m) => sum + (m.debe || 0), 0);
    const totalHaber = movimientos.reduce((sum, m) => sum + (m.haber || 0), 0);
    const diferencia = totalDebe - totalHaber;
    return { totalDebe, totalHaber, diferencia };
  };

  const { totalDebe, totalHaber, diferencia } = calcularTotales();
  const estaBalanceada = Math.abs(diferencia) < 0.01;

  const validarFormulario = () => {
    if (!fecha || !tipo || !concepto) {
      return 'Completa todos los campos obligatorios';
    }

    if (movimientos.length < 2) {
      return 'Debe haber al menos 2 movimientos';
    }

    if (!estaBalanceada) {
      return 'La póliza no está cuadrada (Debe ` Haber)';
    }

    for (const mov of movimientos) {
      if (!mov.cuenta_id) {
        return 'Todas las líneas deben tener una cuenta seleccionada';
      }
      if (!mov.concepto) {
        return 'Todas las líneas deben tener un concepto';
      }
      if (mov.debe === 0 && mov.haber === 0) {
        return 'Cada movimiento debe tener monto en Debe o Haber';
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const error = validarFormulario();
    if (error) {
      alert(error);
      return;
    }

    const movimientosData: Partial<Movimiento>[] = movimientos.map(m => ({
      cuenta_id: m.cuenta_id!,
      concepto: m.concepto,
      debe: m.debe || 0,
      haber: m.haber || 0,
      referencia: m.referencia || null
    }));

    await createPoliza.mutateAsync({
      polizaData: {
        fecha,
        tipo: tipo as any,
        concepto,
        referencia: referencia || null,
        status: 'borrador'
      },
      movimientos: movimientosData
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {poliza ? 'Editar Póliza' : 'Nueva Póliza Contable'}
        </ModalHeader>
        <ModalBody>
          {/* Datos Generales */}
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              isRequired
            />
            <Select
              label="Tipo de Póliza"
              selectedKeys={[tipo]}
              onChange={(e) => setTipo(e.target.value)}
              isRequired
            >
              <SelectItem key="diario" value="diario">Diario</SelectItem>
              <SelectItem key="ingreso" value="ingreso">Ingreso</SelectItem>
              <SelectItem key="egreso" value="egreso">Egreso</SelectItem>
              <SelectItem key="ajuste" value="ajuste">Ajuste</SelectItem>
              <SelectItem key="cierre" value="cierre">Cierre</SelectItem>
            </Select>
            <Input
              label="Referencia"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <Textarea
            label="Concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Describe el concepto de la póliza..."
            isRequired
            minRows={2}
          />

          {/* Movimientos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Movimientos</h3>
              <Button
                size="sm"
                color="primary"
                variant="flat"
                startContent={<Plus className="w-4 h-4" />}
                onPress={agregarMovimiento}
              >
                Agregar Línea
              </Button>
            </div>

            <Table aria-label="Movimientos" removeWrapper>
              <TableHeader>
                <TableColumn>CUENTA</TableColumn>
                <TableColumn>CONCEPTO</TableColumn>
                <TableColumn>DEBE</TableColumn>
                <TableColumn>HABER</TableColumn>
                <TableColumn width={50}></TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay movimientos">
                {movimientos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>
                      <Select
                        placeholder="Selecciona cuenta"
                        selectedKeys={mov.cuenta_id ? [mov.cuenta_id.toString()] : []}
                        onChange={(e) => actualizarMovimiento(mov.id, 'cuenta_id', parseInt(e.target.value))}
                        size="sm"
                        isLoading={loadingCuentas}
                      >
                        {(cuentas || []).map((cuenta) => (
                          <SelectItem key={cuenta.id} value={cuenta.id.toString()}>
                            {cuenta.codigo} - {cuenta.nombre}
                          </SelectItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Concepto"
                        value={mov.concepto}
                        onChange={(e) => actualizarMovimiento(mov.id, 'concepto', e.target.value)}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={mov.debe.toString()}
                        onChange={(e) => actualizarMovimiento(mov.id, 'debe', parseFloat(e.target.value) || 0)}
                        size="sm"
                        startContent="$"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={mov.haber.toString()}
                        onChange={(e) => actualizarMovimiento(mov.id, 'haber', parseFloat(e.target.value) || 0)}
                        size="sm"
                        startContent="$"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="light"
                        onPress={() => eliminarMovimiento(mov.id)}
                        isDisabled={movimientos.length <= 2}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totales */}
            <div className="flex items-center justify-end gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Debe</div>
                <div className="text-lg font-semibold">
                  ${totalDebe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Haber</div>
                <div className="text-lg font-semibold">
                  ${totalHaber.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Diferencia</div>
                <div className={`text-lg font-semibold ${estaBalanceada ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
              {estaBalanceada ? (
                <Chip color="success" variant="flat">Cuadrada</Chip>
              ) : (
                <Chip color="danger" variant="flat" startContent={<AlertCircle className="w-4 h-4" />}>
                  Descuadrada
                </Chip>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={createPoliza.isPending}
            isDisabled={!estaBalanceada}
          >
            {poliza ? 'Actualizar' : 'Crear'} Póliza
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
