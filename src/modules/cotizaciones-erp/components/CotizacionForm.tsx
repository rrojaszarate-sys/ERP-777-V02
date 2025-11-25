/**
 * FORMULARIO DE COTIZACIÓN
 * Formulario completo para crear y editar cotizaciones con partidas
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
import { Plus, Trash2, Search } from 'lucide-react';
import {
  useClientes,
  useProductos
} from '../hooks/useCRM';
import {
  useCreateCotizacion,
  useGenerarFolio,
  useCalcularTotalesPartida
} from '../hooks/useCotizaciones';
import type { Cotizacion, PartidaCotizacion } from '../types';

interface CotizacionFormProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacion?: Cotizacion | null;
}

interface PartidaRow {
  id: string;
  producto_id: number | null;
  tipo: 'producto' | 'servicio' | 'concepto';
  sku: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  subtotal: number;
  aplica_iva: boolean;
  tasa_iva: number;
  monto_iva: number;
  total: number;
}

export const CotizacionForm: React.FC<CotizacionFormProps> = ({
  isOpen,
  onClose,
  cotizacion
}) => {
  const { data: clientes } = useClientes();
  const { data: productos } = useProductos();
  const { data: nuevoFolio } = useGenerarFolio();
  const createCotizacion = useCreateCotizacion();
  const { calcular } = useCalcularTotalesPartida();

  // Datos generales
  const [folio, setFolio] = useState('');
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [partidas, setPartidas] = useState<PartidaRow[]>([]);

  useEffect(() => {
    if (isOpen && !cotizacion && nuevoFolio) {
      setFolio(nuevoFolio);
      // Agregar una partida vacía por defecto
      agregarPartida();
    }
  }, [isOpen, cotizacion, nuevoFolio]);

  const agregarPartida = () => {
    setPartidas([
      ...partidas,
      {
        id: crypto.randomUUID(),
        producto_id: null,
        tipo: 'producto',
        sku: '',
        nombre: '',
        descripcion: '',
        cantidad: 1,
        unidad: 'pieza',
        precio_unitario: 0,
        descuento_porcentaje: 0,
        descuento_monto: 0,
        subtotal: 0,
        aplica_iva: true,
        tasa_iva: 16,
        monto_iva: 0,
        total: 0
      }
    ]);
  };

  const eliminarPartida = (id: string) => {
    if (partidas.length > 1) {
      setPartidas(partidas.filter(p => p.id !== id));
    }
  };

  const seleccionarProducto = (partidaId: string, productoId: number) => {
    const producto = productos?.find(p => p.id === productoId);
    if (!producto) return;

    setPartidas(partidas.map(p => {
      if (p.id === partidaId) {
        const totales = calcular(
          p.cantidad,
          producto.precio_base,
          0,
          producto.aplica_iva,
          producto.tasa_iva
        );

        return {
          ...p,
          producto_id: producto.id,
          tipo: producto.tipo as any,
          sku: producto.sku,
          nombre: producto.nombre,
          descripcion: producto.descripcion || '',
          precio_unitario: producto.precio_base,
          unidad: producto.unidad_medida,
          aplica_iva: producto.aplica_iva,
          tasa_iva: producto.tasa_iva,
          ...totales
        };
      }
      return p;
    }));
  };

  const actualizarPartida = (id: string, campo: keyof PartidaRow, valor: any) => {
    setPartidas(partidas.map(p => {
      if (p.id === id) {
        const updated = { ...p, [campo]: valor };

        // Recalcular totales si cambia cantidad, precio o descuento
        if (['cantidad', 'precio_unitario', 'descuento_porcentaje'].includes(campo)) {
          const totales = calcular(
            updated.cantidad,
            updated.precio_unitario,
            updated.descuento_porcentaje,
            updated.aplica_iva,
            updated.tasa_iva
          );
          return { ...updated, ...totales };
        }

        return updated;
      }
      return p;
    }));
  };

  const calcularTotales = () => {
    const subtotal = partidas.reduce((sum, p) => sum + p.subtotal, 0);
    const impuestos = partidas.reduce((sum, p) => sum + p.monto_iva, 0);
    const total = subtotal + impuestos;
    return { subtotal, impuestos, total };
  };

  const { subtotal, impuestos, total } = calcularTotales();

  const handleSubmit = async () => {
    if (!clienteId) {
      alert('Selecciona un cliente');
      return;
    }

    if (partidas.length === 0 || partidas.some(p => !p.nombre)) {
      alert('Agrega al menos una partida válida');
      return;
    }

    const partidasData: Partial<PartidaCotizacion>[] = partidas.map(p => ({
      producto_id: p.producto_id,
      tipo: p.tipo,
      sku: p.sku,
      nombre: p.nombre,
      descripcion: p.descripcion,
      cantidad: p.cantidad,
      unidad: p.unidad,
      precio_unitario: p.precio_unitario,
      descuento_porcentaje: p.descuento_porcentaje,
      descuento_monto: p.descuento_monto,
      subtotal: p.subtotal,
      aplica_iva: p.aplica_iva,
      tasa_iva: p.tasa_iva,
      monto_iva: p.monto_iva,
      total: p.total
    }));

    await createCotizacion.mutateAsync({
      cotizacionData: {
        folio,
        cliente_id: clienteId,
        fecha,
        fecha_vencimiento: fechaVencimiento || null,
        titulo: titulo || null,
        descripcion: descripcion || null,
        status: 'borrador'
      },
      partidas: partidasData
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
        <ModalHeader>
          {cotizacion ? 'Editar Cotización' : 'Nueva Cotización'}
        </ModalHeader>
        <ModalBody>
          {/* Datos Generales */}
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Folio"
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              isReadOnly
            />
            <Select
              label="Cliente"
              placeholder="Selecciona cliente"
              selectedKeys={clienteId ? [clienteId.toString()] : []}
              onChange={(e) => setClienteId(parseInt(e.target.value))}
              isRequired
            >
              {(clientes || []).map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id.toString()}>
                  {cliente.razon_social}
                </SelectItem>
              ))}
            </Select>
            <Input
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              isRequired
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Título"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título de la cotización"
            />
            <Input
              label="Válida hasta"
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
            />
          </div>

          <Textarea
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción general..."
            minRows={2}
          />

          {/* Partidas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Partidas</h3>
              <Button
                size="sm"
                color="primary"
                variant="flat"
                startContent={<Plus className="w-4 h-4" />}
                onPress={agregarPartida}
              >
                Agregar
              </Button>
            </div>

            <Table aria-label="Partidas" removeWrapper>
              <TableHeader>
                <TableColumn>PRODUCTO/SERVICIO</TableColumn>
                <TableColumn>CANTIDAD</TableColumn>
                <TableColumn>PRECIO</TableColumn>
                <TableColumn>DESC %</TableColumn>
                <TableColumn>SUBTOTAL</TableColumn>
                <TableColumn>IVA</TableColumn>
                <TableColumn>TOTAL</TableColumn>
                <TableColumn width={50}></TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay partidas">
                {partidas.map((partida) => (
                  <TableRow key={partida.id}>
                    <TableCell>
                      <Select
                        placeholder="Selecciona producto"
                        size="sm"
                        selectedKeys={partida.producto_id ? [partida.producto_id.toString()] : []}
                        onChange={(e) => seleccionarProducto(partida.id, parseInt(e.target.value))}
                        startContent={<Search className="w-4 h-4" />}
                      >
                        {(productos || []).map((producto) => (
                          <SelectItem key={producto.id} value={producto.id.toString()}>
                            {producto.nombre} - ${producto.precio_base}
                          </SelectItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={partida.cantidad.toString()}
                        onChange={(e) =>
                          actualizarPartida(partida.id, 'cantidad', parseFloat(e.target.value) || 0)
                        }
                        size="sm"
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={partida.precio_unitario.toString()}
                        onChange={(e) =>
                          actualizarPartida(partida.id, 'precio_unitario', parseFloat(e.target.value) || 0)
                        }
                        size="sm"
                        startContent="$"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={partida.descuento_porcentaje.toString()}
                        onChange={(e) =>
                          actualizarPartida(partida.id, 'descuento_porcentaje', parseFloat(e.target.value) || 0)
                        }
                        size="sm"
                        endContent="%"
                        min="0"
                        max="100"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        ${partida.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        ${partida.monto_iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-semibold">
                        ${partida.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="light"
                        onPress={() => eliminarPartida(partida.id)}
                        isDisabled={partidas.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 min-w-[300px]">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-mono font-semibold">
                    ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA:</span>
                  <span className="font-mono font-semibold">
                    ${impuestos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t text-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="font-mono font-bold text-primary">
                    ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
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
            isLoading={createCotizacion.isPending}
          >
            {cotizacion ? 'Actualizar' : 'Crear'} Cotización
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
