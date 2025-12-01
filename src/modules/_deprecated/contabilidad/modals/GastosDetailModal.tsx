import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { formatCurrency } from '../../../shared/utils/formatters';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataTable } from '../../../shared/components/tables/DataTable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface GastosDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'pendientes' | 'comprobados' | 'pagados';
}

interface Gasto {
  id: string;
  evento_id: string;
  concepto: string;
  total: number;
  comprobado: boolean;
  pagado: boolean;
  fecha_emision: string | null;
  fecha_comprobacion: string | null;
  fecha_pago: string | null;
  evento?: {
    nombre_evento: string;
  };
}

export default function GastosDetailModal({ isOpen, onClose, type }: GastosDetailModalProps) {
  const { data: gastos, isLoading } = useQuery({
    queryKey: ['gastos-detail', type],
    queryFn: async () => {
      let query = supabase
        .from('evt_gastos')
        .select(`
          *,
          evento:evt_eventos(nombre_evento)
        `)
        .order('fecha_emision', { ascending: false });

      if (type === 'pendientes') {
        query = query.eq('comprobado', false).eq('pagado', false);
      } else if (type === 'comprobados') {
        query = query.eq('comprobado', true).eq('pagado', false);
      } else if (type === 'pagados') {
        query = query.eq('pagado', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Gasto[];
    },
    enabled: isOpen,
  });

  const getTitle = () => {
    if (type === 'pendientes') return '🔴 Gastos Pendientes';
    if (type === 'comprobados') return '🟡 Gastos Comprobados';
    return '🟢 Gastos Pagados';
  };

  const getStateText = (gasto: Gasto) => {
    if (gasto.pagado) return 'Pagado';
    if (gasto.comprobado) return 'Comprobado';
    return 'Pendiente';
  };

  const getStateColor = (gasto: Gasto) => {
    if (gasto.pagado) return 'text-green-600 bg-green-50';
    if (gasto.comprobado) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const exportToExcel = () => {
    if (!gastos) return;

    const exportData = gastos.map(gasto => ({
      'Evento': gasto.evento?.nombre_evento || 'N/A',
      'Concepto': gasto.concepto,
      'Monto': gasto.total,
      'Estado': getStateText(gasto),
      'Fecha Emisión': gasto.fecha_emision ? format(new Date(gasto.fecha_emision), 'dd/MM/yyyy', { locale: es }) : 'N/A',
      'Fecha Comprobación': gasto.fecha_comprobacion ? format(new Date(gasto.fecha_comprobacion), 'dd/MM/yyyy', { locale: es }) : 'N/A',
      'Fecha Pago': gasto.fecha_pago ? format(new Date(gasto.fecha_pago), 'dd/MM/yyyy', { locale: es }) : 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
    XLSX.writeFile(wb, `gastos_${type}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const columns = [
    {
      key: 'evento',
      label: 'Evento',
      render: (_value: unknown, gasto: Gasto) => gasto.evento?.nombre_evento || 'N/A',
    },
    {
      key: 'concepto',
      label: 'Concepto',
    },
    {
      key: 'total',
      label: 'Monto',
      render: (_value: unknown, gasto: Gasto) => formatCurrency(gasto.total),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (_value: unknown, gasto: Gasto) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(gasto)}`}>
          {getStateText(gasto)}
        </span>
      ),
    },
    {
      key: 'fecha_emision',
      label: 'Fecha Emisión',
      render: (_value: unknown, gasto: Gasto) => 
        gasto.fecha_emision 
          ? format(new Date(gasto.fecha_emision), 'dd/MM/yyyy', { locale: es })
          : 'N/A',
    },
    {
      key: 'fecha_comprobacion',
      label: 'Fecha Comprobación',
      render: (_value: unknown, gasto: Gasto) => 
        gasto.fecha_comprobacion 
          ? format(new Date(gasto.fecha_comprobacion), 'dd/MM/yyyy', { locale: es })
          : 'N/A',
    },
    {
      key: 'fecha_pago',
      label: 'Fecha Pago',
      render: (_value: unknown, gasto: Gasto) => 
        gasto.fecha_pago 
          ? format(new Date(gasto.fecha_pago), 'dd/MM/yyyy', { locale: es })
          : 'N/A',
    },
  ];

  const totalAmount = gastos?.reduce((sum, gasto) => sum + gasto.total, 0) || 0;

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
                  {gastos?.length || 0} registros • Total: {formatCurrency(totalAmount)}
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
              ) : gastos && gastos.length > 0 ? (
                <DataTable
                  data={gastos}
                  columns={columns}
                  filterable
                  exportable
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <p className="text-lg">No se encontraron gastos</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
