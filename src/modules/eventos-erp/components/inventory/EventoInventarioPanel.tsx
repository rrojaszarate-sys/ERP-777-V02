/**
 * Panel de Inventario para Eventos - FASE 3.1
 * Integración Eventos <-> Inventario
 * Permite gestionar reservas y materiales desde el evento
 */
import { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Progress,
  Spinner,
  Divider,
  Tooltip,
  useDisclosure
} from '@nextui-org/react';
import {
  Package,
  Plus,
  BoxSelect,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  Truck,
  RotateCcw,
  Search,
  Calendar
} from 'lucide-react';
import { supabase } from '../../../../core/config/supabase';
import {
  fetchReservas,
  createReserva,
  registrarEntregaReserva,
  registrarDevolucionReserva,
  cancelarReserva,
  getResumenReservasEvento,
  crearReservasMasivas
} from '../../../inventario-erp/services/reservasService';
import {
  fetchKits,
  calcularMaterialesKit,
  verificarDisponibilidadKit
} from '../../../inventario-erp/services/kitsService';
import { formatCurrency } from '../../../../shared/utils/formatters';

interface EventoInventarioPanelProps {
  eventoId: number;
  eventoNombre: string;
  fechaEvento: string;
  fechaFin?: string;
  companyId: string;
  userId?: string;
}

interface Producto {
  id: number;
  nombre: string;
  clave: string;
  unidad: string;
  costo: number;
}

interface Almacen {
  id: number;
  nombre: string;
  codigo: string;
}

export function EventoInventarioPanel({
  eventoId,
  eventoNombre,
  fechaEvento,
  fechaFin,
  companyId,
  userId
}: EventoInventarioPanelProps) {
  const [selectedTab, setSelectedTab] = useState('reservas');
  const [reservas, setReservas] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [kits, setKits] = useState<any[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de nueva reserva
  const { isOpen: isReservaOpen, onOpen: onReservaOpen, onClose: onReservaClose } = useDisclosure();
  const [newReserva, setNewReserva] = useState({
    producto_id: '',
    almacen_id: '',
    cantidad: 1,
    notas: ''
  });

  // Modal de kit
  const { isOpen: isKitOpen, onOpen: onKitOpen, onClose: onKitClose } = useDisclosure();
  const [selectedKit, setSelectedKit] = useState<any>(null);
  const [numPersonas, setNumPersonas] = useState(50);
  const [kitDisponibilidad, setKitDisponibilidad] = useState<any>(null);

  // Cargar datos
  useEffect(() => {
    loadData();
  }, [eventoId, companyId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Cargar reservas del evento
      const reservasData = await fetchReservas(companyId, { eventoId });
      setReservas(reservasData);

      // Cargar resumen
      const resumenData = await getResumenReservasEvento(eventoId);
      setResumen(resumenData);

      // Cargar kits disponibles
      const kitsData = await fetchKits(companyId, { activo: true });
      setKits(kitsData);

      // Cargar productos
      const { data: productosData } = await supabase
        .from('inv_productos_erp')
        .select('id, nombre, codigo, unidad_medida, costo_promedio')
        .eq('company_id', companyId)
        .eq('activo', true)
        .order('nombre');

      setProductos((productosData || []).map(p => ({
        id: p.id,
        nombre: p.nombre,
        clave: p.codigo,
        unidad: p.unidad_medida,
        costo: p.costo_promedio || 0
      })));

      // Cargar almacenes
      const { data: almacenesData } = await supabase
        .from('inv_almacenes_erp')
        .select('id, nombre, codigo')
        .eq('company_id', companyId)
        .eq('activo', true)
        .order('nombre');

      setAlmacenes(almacenesData || []);

    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear nueva reserva
  const handleCrearReserva = async () => {
    if (!newReserva.producto_id || !newReserva.almacen_id) return;

    try {
      await createReserva(
        {
          evento_id: eventoId,
          producto_id: parseInt(newReserva.producto_id),
          almacen_id: parseInt(newReserva.almacen_id),
          cantidad_reservada: newReserva.cantidad,
          fecha_necesidad: fechaEvento,
          fecha_devolucion_esperada: fechaFin || undefined,
          notas: newReserva.notas || undefined
        },
        companyId,
        userId
      );

      onReservaClose();
      setNewReserva({ producto_id: '', almacen_id: '', cantidad: 1, notas: '' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al crear reserva');
    }
  };

  // Registrar entrega
  const handleEntrega = async (reservaId: number, cantidad: number) => {
    try {
      await registrarEntregaReserva(reservaId, cantidad);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar entrega');
    }
  };

  // Registrar devolución
  const handleDevolucion = async (reservaId: number, cantidad: number) => {
    try {
      await registrarDevolucionReserva(reservaId, cantidad);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar devolución');
    }
  };

  // Cancelar reserva
  const handleCancelar = async (reservaId: number) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;

    try {
      await cancelarReserva(reservaId, 'Cancelada por usuario');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar reserva');
    }
  };

  // Verificar disponibilidad de kit
  const handleVerificarKit = async (kit: any) => {
    setSelectedKit(kit);
    try {
      const disponibilidad = await verificarDisponibilidadKit(
        kit.id,
        numPersonas,
        almacenes[0]?.id || 1,
        companyId
      );
      setKitDisponibilidad(disponibilidad);
      onKitOpen();
    } catch (err) {
      console.error('Error verificando kit:', err);
    }
  };

  // Aplicar kit (crear reservas masivas)
  const handleAplicarKit = async () => {
    if (!selectedKit || !kitDisponibilidad) return;

    const almacenId = almacenes[0]?.id;
    if (!almacenId) {
      alert('No hay almacenes disponibles');
      return;
    }

    try {
      const materiales = await calcularMaterialesKit(selectedKit.id, numPersonas);
      const productos = materiales.map(m => ({
        producto_id: m.producto_id,
        almacen_id: almacenId,
        cantidad: m.cantidad_calculada
      }));

      const resultado = await crearReservasMasivas(
        eventoId,
        productos,
        fechaEvento,
        fechaFin || null,
        companyId,
        userId
      );

      alert(`Se crearon ${resultado.creadas} reservas. ${resultado.errores.length > 0 ? `Errores: ${resultado.errores.join(', ')}` : ''}`);
      onKitClose();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al aplicar kit');
    }
  };

  // Estados de reserva con colores
  const getEstadoChip = (estado: string) => {
    const estados: Record<string, { color: 'default' | 'primary' | 'success' | 'warning' | 'danger'; label: string }> = {
      activa: { color: 'primary', label: 'Activa' },
      parcial: { color: 'warning', label: 'Parcial' },
      entregada: { color: 'success', label: 'Entregada' },
      devuelta: { color: 'default', label: 'Devuelta' },
      cancelada: { color: 'danger', label: 'Cancelada' }
    };
    const config = estados[estado] || { color: 'default', label: estado };
    return <Chip color={config.color} size="sm" variant="flat">{config.label}</Chip>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500">Cargando inventario...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">Inventario del Evento</h3>
        </div>
        <div className="flex gap-2">
          <Button
            color="secondary"
            variant="flat"
            startContent={<BoxSelect className="w-4 h-4" />}
            onPress={() => onKitOpen()}
          >
            Usar Kit
          </Button>
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onReservaOpen}
          >
            Nueva Reserva
          </Button>
        </div>
      </CardHeader>

      <Divider />

      <CardBody>
        {/* Resumen */}
        {resumen && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-primary-50">
              <CardBody className="p-3">
                <p className="text-xs text-gray-500">Productos Reservados</p>
                <p className="text-2xl font-bold text-primary">{resumen.total_productos}</p>
              </CardBody>
            </Card>
            <Card className="bg-warning-50">
              <CardBody className="p-3">
                <p className="text-xs text-gray-500">Unidades Reservadas</p>
                <p className="text-2xl font-bold text-warning">{resumen.total_unidades_reservadas}</p>
              </CardBody>
            </Card>
            <Card className="bg-success-50">
              <CardBody className="p-3">
                <p className="text-xs text-gray-500">Entregadas</p>
                <p className="text-2xl font-bold text-success">{resumen.total_unidades_entregadas}</p>
                <Progress
                  value={resumen.porcentaje_entregado}
                  color="success"
                  size="sm"
                  className="mt-1"
                />
              </CardBody>
            </Card>
            <Card className="bg-secondary-50">
              <CardBody className="p-3">
                <p className="text-xs text-gray-500">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(resumen.valor_total_reservado)}</p>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
          color="primary"
          variant="underlined"
        >
          <Tab
            key="reservas"
            title={
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>Reservas ({reservas.length})</span>
              </div>
            }
          >
            <Table
              aria-label="Reservas del evento"
              classNames={{ wrapper: 'min-h-[300px]' }}
            >
              <TableHeader>
                <TableColumn>PRODUCTO</TableColumn>
                <TableColumn>ALMACÉN</TableColumn>
                <TableColumn align="center">RESERVADO</TableColumn>
                <TableColumn align="center">ENTREGADO</TableColumn>
                <TableColumn align="center">DEVUELTO</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay reservas para este evento">
                {reservas.map((reserva) => (
                  <TableRow key={reserva.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{reserva.producto?.nombre}</p>
                        <p className="text-xs text-gray-500">{reserva.producto?.clave}</p>
                      </div>
                    </TableCell>
                    <TableCell>{reserva.almacen?.nombre}</TableCell>
                    <TableCell>
                      <span className="font-mono">{reserva.cantidad_reservada}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-success">{reserva.cantidad_entregada}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-secondary">{reserva.cantidad_devuelta}</span>
                    </TableCell>
                    <TableCell>{getEstadoChip(reserva.estado)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {reserva.estado === 'activa' && (
                          <>
                            <Tooltip content="Entregar todo">
                              <Button
                                isIconOnly
                                size="sm"
                                color="success"
                                variant="flat"
                                onPress={() => handleEntrega(reserva.id, reserva.cantidad_reservada - reserva.cantidad_entregada)}
                              >
                                <Truck className="w-4 h-4" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Cancelar">
                              <Button
                                isIconOnly
                                size="sm"
                                color="danger"
                                variant="flat"
                                onPress={() => handleCancelar(reserva.id)}
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </Button>
                            </Tooltip>
                          </>
                        )}
                        {(reserva.estado === 'entregada' || reserva.estado === 'parcial') && reserva.cantidad_entregada > reserva.cantidad_devuelta && (
                          <Tooltip content="Registrar devolución">
                            <Button
                              isIconOnly
                              size="sm"
                              color="secondary"
                              variant="flat"
                              onPress={() => handleDevolucion(reserva.id, reserva.cantidad_entregada - reserva.cantidad_devuelta)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Tab>

          <Tab
            key="kits"
            title={
              <div className="flex items-center gap-2">
                <BoxSelect className="w-4 h-4" />
                <span>Kits Disponibles ({kits.length})</span>
              </div>
            }
          >
            <div className="grid grid-cols-3 gap-4">
              {kits.map((kit) => (
                <Card key={kit.id} isPressable onPress={() => handleVerificarKit(kit)}>
                  <CardBody className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{kit.nombre}</p>
                        <p className="text-xs text-gray-500">{kit.codigo}</p>
                      </div>
                      <Chip size="sm" variant="flat" color="primary">
                        {kit.tipo_evento || 'General'}
                      </Chip>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {kit.descripcion || 'Sin descripción'}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-gray-500">
                        {kit.detalles?.length || 0} productos
                      </span>
                      <span className="text-sm font-medium">
                        {kit.personas_base} personas base
                      </span>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </Tab>
        </Tabs>
      </CardBody>

      {/* Modal Nueva Reserva */}
      <Modal isOpen={isReservaOpen} onClose={onReservaClose} size="lg">
        <ModalContent>
          <ModalHeader>Nueva Reserva de Material</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Select
                label="Producto"
                placeholder="Selecciona un producto"
                selectedKeys={newReserva.producto_id ? [newReserva.producto_id] : []}
                onSelectionChange={(keys) => setNewReserva({ ...newReserva, producto_id: Array.from(keys)[0] as string })}
              >
                {productos.map((p) => (
                  <SelectItem key={p.id.toString()} textValue={p.nombre}>
                    <div className="flex justify-between">
                      <span>{p.nombre}</span>
                      <span className="text-xs text-gray-500">{p.clave}</span>
                    </div>
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="Almacén"
                placeholder="Selecciona almacén de salida"
                selectedKeys={newReserva.almacen_id ? [newReserva.almacen_id] : []}
                onSelectionChange={(keys) => setNewReserva({ ...newReserva, almacen_id: Array.from(keys)[0] as string })}
              >
                {almacenes.map((a) => (
                  <SelectItem key={a.id.toString()} textValue={a.nombre}>
                    {a.nombre} ({a.codigo})
                  </SelectItem>
                ))}
              </Select>

              <Input
                type="number"
                label="Cantidad"
                value={newReserva.cantidad.toString()}
                onValueChange={(v) => setNewReserva({ ...newReserva, cantidad: parseInt(v) || 1 })}
                min={1}
              />

              <Input
                label="Notas (opcional)"
                value={newReserva.notas}
                onValueChange={(v) => setNewReserva({ ...newReserva, notas: v })}
              />

              <div className="flex gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Fecha necesidad: {new Date(fechaEvento).toLocaleDateString('es-MX')}</span>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onReservaClose}>
              Cancelar
            </Button>
            <Button color="primary" onPress={handleCrearReserva}>
              Crear Reserva
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Kit */}
      <Modal isOpen={isKitOpen} onClose={onKitClose} size="2xl">
        <ModalContent>
          <ModalHeader>
            Aplicar Kit: {selectedKit?.nombre}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                type="number"
                label="Número de personas"
                value={numPersonas.toString()}
                onValueChange={(v) => {
                  setNumPersonas(parseInt(v) || 50);
                  if (selectedKit) handleVerificarKit(selectedKit);
                }}
                min={1}
              />

              {kitDisponibilidad && (
                <>
                  <div className="flex items-center gap-2">
                    {kitDisponibilidad.disponible ? (
                      <Chip color="success" startContent={<CheckCircle className="w-4 h-4" />}>
                        Todos los materiales disponibles
                      </Chip>
                    ) : (
                      <Chip color="danger" startContent={<AlertTriangle className="w-4 h-4" />}>
                        Faltan materiales
                      </Chip>
                    )}
                  </div>

                  <Table aria-label="Materiales del kit">
                    <TableHeader>
                      <TableColumn>PRODUCTO</TableColumn>
                      <TableColumn align="center">NECESARIO</TableColumn>
                      <TableColumn align="center">DISPONIBLE</TableColumn>
                      <TableColumn align="center">FALTANTE</TableColumn>
                      <TableColumn>ESTADO</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {kitDisponibilidad.productos.map((p: any) => (
                        <TableRow key={p.producto_id}>
                          <TableCell>{p.producto_nombre}</TableCell>
                          <TableCell>{p.cantidad_necesaria}</TableCell>
                          <TableCell>{p.stock_disponible}</TableCell>
                          <TableCell>
                            <span className={p.faltante > 0 ? 'text-danger font-bold' : ''}>
                              {p.faltante}
                            </span>
                          </TableCell>
                          <TableCell>
                            {p.disponible ? (
                              <CheckCircle className="w-4 h-4 text-success" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-danger" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onKitClose}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleAplicarKit}
              isDisabled={!kitDisponibilidad?.disponible}
            >
              Crear Reservas del Kit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}

export default EventoInventarioPanel;
