/**
 * Formulario de Facturación CFDI 4.0 - FASE 5.1
 * Creación y edición de facturas electrónicas
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Autocomplete,
  AutocompleteItem,
  Divider,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea
} from '@nextui-org/react';
import { Plus, Trash2, Save, Send, Calculator, Search, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import { supabase } from '../../../core/config/supabase';
import { useCreateFactura, useConfiguracion } from '../hooks/useFacturacion';
import {
  USO_CFDI_CATALOG,
  FORMA_PAGO_CATALOG,
  METODO_PAGO_LABEL,
  REGIMEN_FISCAL_CATALOG,
  OBJETO_IMPUESTO_LABEL,
  type UsoCFDI,
  type FormaPago,
  type MetodoPago,
  type RegimenFiscal,
  type ObjetoImpuesto
} from '../types/cfdi';
import type { ConceptoFactura } from '../types';

interface Cliente {
  id: number;
  rfc: string;
  razon_social: string;
  regimen_fiscal: string;
  codigo_postal: string;
  email?: string;
  uso_cfdi_default?: string;
}

interface Producto {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string;
  clave_sat?: string;
  unidad_sat?: string;
  precio_venta: number;
  iva_incluido?: boolean;
}

interface ConceptoForm {
  key: string;
  producto_id?: number;
  clave_prod_serv: string;
  clave_unidad: string;
  cantidad: number;
  unidad: string;
  descripcion: string;
  valor_unitario: number;
  importe: number;
  descuento: number;
  objeto_imp: ObjetoImpuesto;
  tasa_iva: number;
  iva: number;
}

interface FacturaFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  eventoId?: number;
}

export function FacturaForm({ onSuccess, onCancel, eventoId }: FacturaFormProps) {
  const { user } = useAuth();
  const { data: configuracion } = useConfiguracion();
  const createFactura = useCreateFactura();
  const { isOpen: isProductoOpen, onOpen: onProductoOpen, onClose: onProductoClose } = useDisclosure();

  // Estado del formulario
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [usoCfdi, setUsoCfdi] = useState<UsoCFDI>('G03');
  const [formaPago, setFormaPago] = useState<FormaPago>('03');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('PUE');
  const [moneda, setMoneda] = useState('MXN');
  const [tipoCambio, setTipoCambio] = useState(1);
  const [observaciones, setObservaciones] = useState('');
  const [conceptos, setConceptos] = useState<ConceptoForm[]>([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [editingConceptoIndex, setEditingConceptoIndex] = useState<number | null>(null);

  // Queries
  const { data: clientes } = useQuery({
    queryKey: ['clientes-facturacion', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_clientes')
        .select('id, rfc, razon_social, regimen_fiscal, codigo_postal, email, uso_cfdi_default')
        .eq('company_id', user!.company_id)
        .eq('activo', true)
        .order('razon_social');
      if (error) throw error;
      return data as Cliente[];
    },
    enabled: !!user?.company_id
  });

  const { data: productos } = useQuery({
    queryKey: ['productos-facturacion', user?.company_id, searchProducto],
    queryFn: async () => {
      let query = supabase
        .from('productos_erp')
        .select('id, clave, nombre, descripcion, clave_sat, unidad_sat, precio_venta, iva_incluido')
        .eq('company_id', user!.company_id)
        .eq('activo', true);

      if (searchProducto) {
        query = query.or(`nombre.ilike.%${searchProducto}%,clave.ilike.%${searchProducto}%`);
      }

      query = query.limit(50).order('nombre');
      const { data, error } = await query;
      if (error) throw error;
      return data as Producto[];
    },
    enabled: !!user?.company_id
  });

  // Calcular totales
  const totales = useMemo(() => {
    let subtotal = 0;
    let descuento = 0;
    let ivaTotal = 0;

    conceptos.forEach(c => {
      subtotal += c.importe;
      descuento += c.descuento;
      ivaTotal += c.iva;
    });

    const total = subtotal - descuento + ivaTotal;

    return { subtotal, descuento, ivaTotal, total };
  }, [conceptos]);

  // Efecto para cargar cliente por defecto si hay eventoId
  useEffect(() => {
    if (eventoId) {
      loadEventoData(eventoId);
    }
  }, [eventoId]);

  const loadEventoData = async (id: number) => {
    try {
      const { data: evento } = await supabase
        .from('evt_eventos_erp')
        .select('cliente_id, crm_clientes(id, rfc, razon_social, regimen_fiscal, codigo_postal, email, uso_cfdi_default)')
        .eq('id', id)
        .single();

      if (evento?.cliente_id && evento.crm_clientes) {
        const cliente = evento.crm_clientes as unknown as Cliente;
        setClienteId(cliente.id);
        setClienteSeleccionado(cliente);
        if (cliente.uso_cfdi_default) {
          setUsoCfdi(cliente.uso_cfdi_default as UsoCFDI);
        }
      }
    } catch (err) {
      console.error('Error loading evento:', err);
    }
  };

  const handleClienteChange = (key: React.Key | null) => {
    if (!key) {
      setClienteId(null);
      setClienteSeleccionado(null);
      return;
    }

    const id = Number(key);
    const cliente = clientes?.find(c => c.id === id);
    if (cliente) {
      setClienteId(id);
      setClienteSeleccionado(cliente);
      if (cliente.uso_cfdi_default) {
        setUsoCfdi(cliente.uso_cfdi_default as UsoCFDI);
      }
    }
  };

  const agregarConcepto = (producto?: Producto) => {
    const nuevoConcepto: ConceptoForm = {
      key: crypto.randomUUID(),
      producto_id: producto?.id,
      clave_prod_serv: producto?.clave_sat || '01010101',
      clave_unidad: producto?.unidad_sat || 'H87',
      cantidad: 1,
      unidad: 'Pieza',
      descripcion: producto?.nombre || '',
      valor_unitario: producto?.precio_venta || 0,
      importe: producto?.precio_venta || 0,
      descuento: 0,
      objeto_imp: '02',
      tasa_iva: 0.16,
      iva: (producto?.precio_venta || 0) * 0.16
    };

    setConceptos([...conceptos, nuevoConcepto]);
    onProductoClose();
  };

  const actualizarConcepto = (index: number, field: keyof ConceptoForm, value: any) => {
    const nuevosConceptos = [...conceptos];
    const concepto = { ...nuevosConceptos[index] };

    (concepto as any)[field] = value;

    // Recalcular importe e IVA
    if (['cantidad', 'valor_unitario', 'descuento', 'tasa_iva', 'objeto_imp'].includes(field)) {
      concepto.importe = concepto.cantidad * concepto.valor_unitario;

      if (concepto.objeto_imp === '02') {
        concepto.iva = (concepto.importe - concepto.descuento) * concepto.tasa_iva;
      } else {
        concepto.iva = 0;
      }
    }

    nuevosConceptos[index] = concepto;
    setConceptos(nuevosConceptos);
  };

  const eliminarConcepto = (index: number) => {
    setConceptos(conceptos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (timbrar: boolean = false) => {
    if (!clienteId || conceptos.length === 0) {
      return;
    }

    const facturaData = {
      cliente_id: clienteId,
      serie: configuracion?.serie_facturas || 'A',
      tipo_comprobante: 'I' as const,
      fecha_emision: new Date().toISOString(),
      forma_pago: formaPago,
      metodo_pago: metodoPago,
      moneda,
      tipo_cambio: tipoCambio,
      lugar_expedicion: configuracion?.regimen_fiscal ? '06600' : '00000',
      uso_cfdi: usoCfdi,
      observaciones: observaciones || null,
      status: timbrar ? 'pendiente' : 'borrador' as const,
      evento_id: eventoId
    };

    const conceptosData: Partial<ConceptoFactura>[] = conceptos.map(c => ({
      clave_prod_serv: c.clave_prod_serv,
      clave_unidad: c.clave_unidad,
      cantidad: c.cantidad,
      unidad: c.unidad,
      descripcion: c.descripcion,
      valor_unitario: c.valor_unitario,
      importe: c.importe,
      descuento: c.descuento,
      objeto_imp: c.objeto_imp
    }));

    try {
      await createFactura.mutateAsync({ factura: facturaData, conceptos: conceptosData });
      onSuccess?.();
    } catch (err) {
      console.error('Error creating factura:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-bold">Datos de la Factura</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Autocomplete
              label="Cliente"
              placeholder="Buscar cliente por RFC o nombre..."
              selectedKey={clienteId?.toString()}
              onSelectionChange={handleClienteChange}
              isRequired
            >
              {(clientes || []).map((cliente) => (
                <AutocompleteItem key={cliente.id.toString()} textValue={cliente.razon_social}>
                  <div className="flex flex-col">
                    <span className="font-medium">{cliente.razon_social}</span>
                    <span className="text-xs text-gray-500">RFC: {cliente.rfc}</span>
                  </div>
                </AutocompleteItem>
              ))}
            </Autocomplete>

            <Select
              label="Uso de CFDI"
              selectedKeys={[usoCfdi]}
              onSelectionChange={(keys) => setUsoCfdi(Array.from(keys)[0] as UsoCFDI)}
              isRequired
            >
              {Object.entries(USO_CFDI_CATALOG).map(([key, value]) => (
                <SelectItem key={key}>{`${key} - ${value}`}</SelectItem>
              ))}
            </Select>
          </div>

          {/* Info del cliente seleccionado */}
          {clienteSeleccionado && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">RFC:</span>
                  <p className="font-mono font-medium">{clienteSeleccionado.rfc}</p>
                </div>
                <div>
                  <span className="text-gray-500">Razón Social:</span>
                  <p className="font-medium truncate">{clienteSeleccionado.razon_social}</p>
                </div>
                <div>
                  <span className="text-gray-500">Régimen Fiscal:</span>
                  <p className="font-medium">{clienteSeleccionado.regimen_fiscal}</p>
                </div>
                <div>
                  <span className="text-gray-500">C.P.:</span>
                  <p className="font-medium">{clienteSeleccionado.codigo_postal}</p>
                </div>
              </div>
            </div>
          )}

          {/* Forma y método de pago */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Select
              label="Forma de Pago"
              selectedKeys={[formaPago]}
              onSelectionChange={(keys) => setFormaPago(Array.from(keys)[0] as FormaPago)}
            >
              {Object.entries(FORMA_PAGO_CATALOG).map(([key, value]) => (
                <SelectItem key={key}>{`${key} - ${value}`}</SelectItem>
              ))}
            </Select>

            <Select
              label="Método de Pago"
              selectedKeys={[metodoPago]}
              onSelectionChange={(keys) => setMetodoPago(Array.from(keys)[0] as MetodoPago)}
            >
              {Object.entries(METODO_PAGO_LABEL).map(([key, value]) => (
                <SelectItem key={key}>{`${key} - ${value}`}</SelectItem>
              ))}
            </Select>

            <Select
              label="Moneda"
              selectedKeys={[moneda]}
              onSelectionChange={(keys) => setMoneda(Array.from(keys)[0] as string)}
            >
              <SelectItem key="MXN">MXN - Peso Mexicano</SelectItem>
              <SelectItem key="USD">USD - Dólar Americano</SelectItem>
              <SelectItem key="EUR">EUR - Euro</SelectItem>
            </Select>

            {moneda !== 'MXN' && (
              <Input
                type="number"
                label="Tipo de Cambio"
                value={tipoCambio.toString()}
                onValueChange={(v) => setTipoCambio(parseFloat(v) || 1)}
                step={0.0001}
              />
            )}
          </div>
        </CardBody>
      </Card>

      {/* Conceptos */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Conceptos</h3>
          <Button
            color="primary"
            size="sm"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onProductoOpen}
          >
            Agregar Concepto
          </Button>
        </CardHeader>
        <CardBody>
          <Table aria-label="Conceptos de la factura">
            <TableHeader>
              <TableColumn>DESCRIPCIÓN</TableColumn>
              <TableColumn width={80}>CANTIDAD</TableColumn>
              <TableColumn width={120}>P. UNITARIO</TableColumn>
              <TableColumn width={100}>DESCUENTO</TableColumn>
              <TableColumn width={100}>IVA</TableColumn>
              <TableColumn width={120}>IMPORTE</TableColumn>
              <TableColumn width={60}>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody emptyContent="Agregue conceptos a la factura">
              {conceptos.map((concepto, index) => (
                <TableRow key={concepto.key}>
                  <TableCell>
                    <Input
                      size="sm"
                      value={concepto.descripcion}
                      onValueChange={(v) => actualizarConcepto(index, 'descripcion', v)}
                      placeholder="Descripción del concepto"
                    />
                    <div className="flex gap-2 mt-1">
                      <Chip size="sm" variant="flat">
                        Clave: {concepto.clave_prod_serv}
                      </Chip>
                      <Select
                        size="sm"
                        className="max-w-[140px]"
                        selectedKeys={[concepto.objeto_imp]}
                        onSelectionChange={(keys) =>
                          actualizarConcepto(index, 'objeto_imp', Array.from(keys)[0])
                        }
                      >
                        {Object.entries(OBJETO_IMPUESTO_LABEL).map(([key, value]) => (
                          <SelectItem key={key}>{value}</SelectItem>
                        ))}
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      size="sm"
                      type="number"
                      value={concepto.cantidad.toString()}
                      onValueChange={(v) => actualizarConcepto(index, 'cantidad', parseFloat(v) || 0)}
                      min={0}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      size="sm"
                      type="number"
                      value={concepto.valor_unitario.toString()}
                      onValueChange={(v) => actualizarConcepto(index, 'valor_unitario', parseFloat(v) || 0)}
                      startContent={<span className="text-xs">$</span>}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      size="sm"
                      type="number"
                      value={concepto.descuento.toString()}
                      onValueChange={(v) => actualizarConcepto(index, 'descuento', parseFloat(v) || 0)}
                      startContent={<span className="text-xs">$</span>}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{formatCurrency(concepto.iva)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-semibold">
                      {formatCurrency(concepto.importe - concepto.descuento + concepto.iva)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => eliminarConcepto(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totales */}
          {conceptos.length > 0 && (
            <>
              <Divider className="my-4" />
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-mono">{formatCurrency(totales.subtotal)}</span>
                  </div>
                  {totales.descuento > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento:</span>
                      <span className="font-mono">-{formatCurrency(totales.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">IVA (16%):</span>
                    <span className="font-mono">{formatCurrency(totales.ivaTotal)}</span>
                  </div>
                  <Divider />
                  <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL:</span>
                    <span className="font-mono text-primary">{formatCurrency(totales.total)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Observaciones */}
      <Card>
        <CardBody>
          <Textarea
            label="Observaciones / Notas"
            placeholder="Notas adicionales para la factura..."
            value={observaciones}
            onValueChange={setObservaciones}
            minRows={2}
          />
        </CardBody>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="bordered" onPress={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          color="default"
          startContent={<Save className="w-4 h-4" />}
          onPress={() => handleSubmit(false)}
          isLoading={createFactura.isPending}
          isDisabled={!clienteId || conceptos.length === 0}
        >
          Guardar Borrador
        </Button>
        <Button
          color="primary"
          startContent={<Send className="w-4 h-4" />}
          onPress={() => handleSubmit(true)}
          isLoading={createFactura.isPending}
          isDisabled={!clienteId || conceptos.length === 0}
        >
          Guardar y Preparar para Timbrar
        </Button>
      </div>

      {/* Modal de selección de producto */}
      <Modal isOpen={isProductoOpen} onClose={onProductoClose} size="2xl">
        <ModalContent>
          <ModalHeader>Agregar Concepto</ModalHeader>
          <ModalBody>
            <Input
              placeholder="Buscar producto o servicio..."
              value={searchProducto}
              onValueChange={setSearchProducto}
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              className="mb-4"
            />

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {/* Opción para concepto manual */}
              <div
                className="p-3 border rounded-lg cursor-pointer hover:bg-primary-50 hover:border-primary"
                onClick={() => agregarConcepto()}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded">
                    <Calculator className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Concepto Manual</p>
                    <p className="text-sm text-gray-500">Ingresar datos manualmente</p>
                  </div>
                </div>
              </div>

              <Divider className="my-3" />

              {/* Lista de productos */}
              {(productos || []).map((producto) => (
                <div
                  key={producto.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-primary-50 hover:border-primary"
                  onClick={() => agregarConcepto(producto)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{producto.nombre}</p>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>Clave: {producto.clave}</span>
                        <span>Precio: {formatCurrency(producto.precio_venta)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {productos?.length === 0 && (
                <p className="text-center text-gray-500 py-4">No se encontraron productos</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={onProductoClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default FacturaForm;
