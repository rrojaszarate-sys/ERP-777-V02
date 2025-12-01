import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { formatCurrency } from '../../../shared/utils/formatters';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataTable } from '../../../shared/components/tables/DataTable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface IngresosDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'pendientes' | 'facturados' | 'cobrados';
}

interface Ingreso {
  id: string;
  evento_id: string;
  concepto: string;
  total: number;
  facturado: boolean;
  cobrado: boolean;
  fecha_emision: string | null;
  fecha_facturacion: string | null;
  fecha_cobro: string | null;
  evento?: {
    nombre_evento: string;
  };
}

export default function IngresosDetailModal({ isOpen, onClose, type }: IngresosDetailModalProps) {
  const { data: ingresos, isLoading } = useQuery({
    queryKey: ['ingresos-detail', type],
    queryFn: async () => {
      let query = supabase
        .from('evt_ingresos')
        .select(`
          *,
          evento:evt_eventos(nombre_evento)
        `)
        .order('fecha_emision', { ascending: false });

      if (type === 'pendientes') {
        query = query.eq('facturado', false).eq('cobrado', false);
      } else if (type === 'facturados') {
        query = query.eq('facturado', true).eq('cobrado', false);
      } else if (type === 'cobrados') {
        query = query.eq('cobrado', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Ingreso[];
    },
    enabled: isOpen,
  });

  const getTitle = () => {
    if (type === 'pendientes') return '🔴 Ingresos Pendientes';
    if (type === 'facturados') return '🟡 Ingresos Facturados';
    return '🟢 Ingresos Cobrados';
  };

  const getStateText = (ingreso: Ingreso) => {
    if (ingreso.cobrado) return 'Cobrado';
    if (ingreso.facturado) return 'Facturado';
    return 'Pendiente';
  };

  const getStateColor = (ingreso: Ingreso) => {
    if (ingreso.cobrado) return 'text-green-600 bg-green-50';
    if (ingreso.facturado) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const exportToExcel = () => {
    if (!ingresos) return;

    const exportData = ingresos.map(ing => ({
      'Evento': ing.evento?.nombre_evento || 'N/A',
      'Concepto': ing.concepto,
      'Monto': ing.total,
      'Estado': getStateText(ing),
      'Fecha Emisión': ing.fecha_emision ? format(new Date(ing.fecha_emision), 'dd/MM/yyyy', { locale: es }) : 'N/A',
      'Fecha Facturación': ing.fecha_facturacion ? format(new Date(ing.fecha_facturacion), 'dd/MM/yyyy', { locale: es }) : 'N/A',
      'Fecha Cobro': ing.fecha_cobro ? format(new Date(ing.fecha_cobro), 'dd/MM/yyyy', { locale: es }) : 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ingresos');
    XLSX.writeFile(wb, `ingresos_${type}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const columns = [
    {
      key: 'evento',
      label: 'Evento',
      render: (_value: unknown, ingreso: Ingreso) => ingreso.evento?.nombre_evento || 'N/A',
    },
    {
      key: 'concepto',
      label: 'Concepto',
    },
    {
      key: 'total',
      label: 'Monto',
      render: (_value: unknown, ingreso: Ingreso) => formatCurrency(ingreso.total),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (_value: unknown, ingreso: Ingreso) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(ingreso)}`}>
          {getStateText(ingreso)}
        </span>
      ),
    },
    {
      key: 'fecha_emision',
      label: 'Fecha Emisión',
      render: (_value: unknown, ingreso: Ingreso) => 
        ingreso.fecha_emision 
          ? format(new Date(ingreso.fecha_emision), 'dd/MM/yyyy', { locale: es })
          : 'N/A',
    },
    {
      key: 'fecha_facturacion',
      label: 'Fecha Facturación',
      render: (_value: unknown, ingreso: Ingreso) => 
        ingreso.fecha_facturacion 
          ? format(new Date(ingreso.fecha_facturacion), 'dd/MM/yyyy', { locale: es })
          : 'N/A',
    },
    {
      key: 'fecha_cobro',
      label: 'Fecha Cobro',
      render: (_value: unknown, ingreso: Ingreso) => 
        ingreso.fecha_cobro 
          ? format(new Date(ingreso.fecha_cobro), 'dd/MM/yyyy', { locale: es })
          : 'N/A',
    },
  ];

  const totalAmount = ingresos?.reduce((sum, ing) => sum + ing.total, 0) || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-10 bg-white rounded-xl shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {ingresos?.length || 0} registros • Total: {formatCurrency(totalAmount)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              ) : ingresos && ingresos.length > 0 ? (
                <DataTable
                  data={ingresos}
                  columns={columns}
                  filterable
                  exportable
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <p className="text-lg">No se encontraron ingresos</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
