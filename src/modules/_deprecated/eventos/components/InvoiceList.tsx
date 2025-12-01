/**
 * 📋 Lista de Facturas Electrónicas con Gestión de Cobro
 */

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Chip,
  Button,
  Input,
  Select,
  SelectItem,
  Tooltip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@nextui-org/react';
import { 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Eye, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { COBRO_STATES } from '../types/Invoice';
import { 
  formatDateForDisplay, 
  getMensajeEstado, 
  diasHastaVencimiento,
  getColorByDaysRemaining
} from '../utils/dateCalculator';
import type { Invoice, InvoiceFilters } from '../types/Invoice';

interface InvoiceListProps {
  eventoId?: string;
  onInvoiceClick?: (invoice: Invoice) => void;
  refreshTrigger?: number;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  eventoId,
  onInvoiceClick,
  refreshTrigger = 0
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<InvoiceFilters>({
    year: new Date().getFullYear(),
    month: undefined,
    status_cobro: undefined,
    cliente: '',
    proximas_vencer: false,
    vencidas: false
  });

  useEffect(() => {
    loadInvoices();
  }, [eventoId, refreshTrigger, filters]);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await invoiceService.getInvoices(filters);
      
      // Si hay un eventoId específico, filtrar
      const filtered = eventoId 
        ? data.filter(inv => inv.evento_id === eventoId)
        : data;
      
      setInvoices(filtered);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarcarCobrado = async (invoice: Invoice) => {
    try {
      await invoiceService.marcarComoCobrado(invoice.id);
      loadInvoices();
    } catch (error) {
      console.error('Error al marcar como cobrado:', error);
    }
  };

  const handleCancelar = async (invoice: Invoice) => {
    try {
      await invoiceService.cancelarFactura(invoice.id);
      loadInvoices();
    } catch (error) {
      console.error('Error al cancelar factura:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getStatusChip = (invoice: Invoice) => {
    const state = COBRO_STATES[invoice.status_cobro];
    const diasRestantes = diasHastaVencimiento(new Date(invoice.fecha_compromiso));
    
    return (
      <Tooltip content={getMensajeEstado(new Date(invoice.fecha_compromiso), invoice.status_cobro)}>
        <Chip
          color={getColorByDaysRemaining(diasRestantes)}
          variant="flat"
          size="sm"
          startContent={<span>{state.icon}</span>}
        >
          {state.label}
        </Chip>
      </Tooltip>
    );
  };

  const columns = [
    { key: 'fecha_emision', label: 'EMISIÓN' },
    { key: 'cliente', label: 'CLIENTE' },
    { key: 'uuid', label: 'UUID / FOLIO' },
    { key: 'total', label: 'TOTAL' },
    { key: 'fecha_compromiso', label: 'VENCIMIENTO' },
    { key: 'status', label: 'ESTADO' },
    { key: 'actions', label: 'ACCIONES' }
  ];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        <Input
          type="number"
          label="Año"
          placeholder="2024"
          value={filters.year?.toString() || ''}
          onValueChange={(value) => setFilters({ ...filters, year: parseInt(value) || undefined })}
          className="w-28"
        />
        
        <Select
          label="Mes"
          placeholder="Todos"
          selectedKeys={filters.month ? [filters.month.toString()] : []}
          onSelectionChange={(keys) => {
            const month = Array.from(keys)[0];
            setFilters({ ...filters, month: month ? parseInt(month as string) : undefined });
          }}
          className="w-36"
        >
          <SelectItem key="1" value="1">Enero</SelectItem>
          <SelectItem key="2" value="2">Febrero</SelectItem>
          <SelectItem key="3" value="3">Marzo</SelectItem>
          <SelectItem key="4" value="4">Abril</SelectItem>
          <SelectItem key="5" value="5">Mayo</SelectItem>
          <SelectItem key="6" value="6">Junio</SelectItem>
          <SelectItem key="7" value="7">Julio</SelectItem>
          <SelectItem key="8" value="8">Agosto</SelectItem>
          <SelectItem key="9" value="9">Septiembre</SelectItem>
          <SelectItem key="10" value="10">Octubre</SelectItem>
          <SelectItem key="11" value="11">Noviembre</SelectItem>
          <SelectItem key="12" value="12">Diciembre</SelectItem>
        </Select>

        <Input
          placeholder="Buscar cliente..."
          value={filters.cliente || ''}
          onValueChange={(value) => setFilters({ ...filters, cliente: value })}
          startContent={<Search className="w-4 h-4 text-gray-400" />}
          className="flex-1 min-w-60"
        />

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filters.proximas_vencer ? 'solid' : 'bordered'}
            color={filters.proximas_vencer ? 'warning' : 'default'}
            onPress={() => setFilters({ ...filters, proximas_vencer: !filters.proximas_vencer, vencidas: false })}
          >
            <AlertCircle className="w-4 h-4" />
            Próximas
          </Button>
          
          <Button
            size="sm"
            variant={filters.vencidas ? 'solid' : 'bordered'}
            color={filters.vencidas ? 'danger' : 'default'}
            onPress={() => setFilters({ ...filters, vencidas: !filters.vencidas, proximas_vencer: false })}
          >
            <XCircle className="w-4 h-4" />
            Vencidas
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <Table 
        aria-label="Lista de facturas"
        isStriped
        classNames={{
          base: "max-h-[600px]",
          table: "min-h-[400px]"
        }}
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key} align={column.key === 'actions' ? 'center' : 'start'}>
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        
        <TableBody 
          items={invoices}
          isLoading={isLoading}
          emptyContent={isLoading ? "Cargando..." : "No hay facturas"}
        >
          {(invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">
                    {formatDateForDisplay(invoice.fecha_emision)}
                  </span>
                </div>
              </TableCell>
              
              <TableCell>
                <div>
                  <p className="font-medium text-sm">
                    {invoice.evento?.cliente?.razon_social || 'Sin cliente'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {invoice.evento?.clave_evento}
                  </p>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex flex-col gap-1">
                  <Tooltip content={invoice.uuid_cfdi}>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {invoice.uuid_cfdi.substring(0, 8)}...
                    </code>
                  </Tooltip>
                  {invoice.folio && (
                    <span className="text-xs text-gray-500">
                      {invoice.serie}-{invoice.folio}
                    </span>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  <div>
                    <p className="font-semibold text-sm">
                      {formatCurrency(invoice.total)}
                    </p>
                    {invoice.monto_cobrado > 0 && (
                      <p className="text-xs text-success">
                        Cobrado: {formatCurrency(invoice.monto_cobrado)}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div>
                  <p className="text-sm font-medium">
                    {formatDateForDisplay(invoice.fecha_compromiso)}
                  </p>
                  <p className={`text-xs ${diasHastaVencimiento(new Date(invoice.fecha_compromiso)) < 0 ? 'text-danger' : 'text-gray-500'}`}>
                    {getMensajeEstado(new Date(invoice.fecha_compromiso), invoice.status_cobro)}
                  </p>
                </div>
              </TableCell>
              
              <TableCell>
                {getStatusChip(invoice)}
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => onInvoiceClick?.(invoice)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  {invoice.xml_url && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      as="a"
                      href={invoice.xml_url}
                      target="_blank"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Dropdown>
                    <DropdownTrigger>
                      <Button isIconOnly size="sm" variant="light">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Acciones">
                      {invoice.status_cobro !== 'cobrado' && (
                        <DropdownItem
                          key="cobrar"
                          startContent={<CheckCircle className="w-4 h-4" />}
                          onPress={() => handleMarcarCobrado(invoice)}
                        >
                          Marcar como cobrado
                        </DropdownItem>
                      )}
                      <DropdownItem
                        key="cancelar"
                        className="text-danger"
                        color="danger"
                        startContent={<XCircle className="w-4 h-4" />}
                        onPress={() => handleCancelar(invoice)}
                      >
                        Cancelar factura
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Resumen */}
      {invoices.length > 0 && (
        <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Total Facturas</p>
            <p className="text-lg font-bold">{invoices.length}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Monto Total</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Por Cobrar</p>
            <p className="text-lg font-bold text-warning">
              {formatCurrency(invoices.filter(i => i.status_cobro === 'pendiente').reduce((sum, inv) => sum + inv.total, 0))}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Vencidas</p>
            <p className="text-lg font-bold text-danger">
              {invoices.filter(i => i.status_cobro === 'vencido').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
