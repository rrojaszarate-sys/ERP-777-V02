import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, Clock, CheckCircle, AlertTriangle,
  RefreshCw, Calendar, TrendingUp, FileText,
  Eye, Pencil, Settings
} from 'lucide-react';
import { useAccountingStates } from '../../hooks/useAccountingStates';
import { usePermissions } from '../../../../core/permissions/usePermissions';
import { Button } from '../../../../shared/components/ui/Button';
import { Badge } from '../../../../shared/components/ui/Badge';
import { Modal } from '../../../../shared/components/ui/Modal';
import { DataTable } from '../../../../shared/components/tables/DataTable';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';
import { LoadingSpinner } from '../../../../shared/components/ui/LoadingSpinner';
import { PaymentStatusModal } from './PaymentStatusModal';

export const AccountingStateDashboard: React.FC = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<any>(null);
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  
  const { canUpdate } = usePermissions();
  const {
    dashboard,
    eventsNeedingReview,
    overduePayments,
    isDashboardLoading,
    isEventsLoading,
    isOverdueLoading,
    calculateEventState,
    recalculateAllEvents,
    updatePaymentStatus,
    markAsPaid,
    isCalculating,
    isRecalculating,
    refetchDashboard
  } = useAccountingStates();

  const handleMarkAsPaid = (income: any) => {
    setSelectedIncome(income);
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = (paymentData: any) => {
    if (selectedIncome) {
      markAsPaid({
        incomeId: selectedIncome.id,
        paymentData
      });
    }
    setShowPaymentModal(false);
    setSelectedIncome(null);
  };

  const overdueColumns = [
    {
      key: 'concepto',
      label: 'Concepto',
      filterType: 'text' as const,
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">
            {row.evt_eventos.clave_evento}
          </div>
        </div>
      )
    },
    {
      key: 'cliente_nombre',
      label: 'Cliente',
      filterType: 'text' as const,
      render: (value: string) => (
        <div className="text-gray-900">{value}</div>
      )
    },
    {
      key: 'total',
      label: 'Monto',
      align: 'right' as const,
      render: (value: number) => (
        <div className="font-medium text-red-600">
          {formatCurrency(value)}
        </div>
      )
    },
    {
      key: 'fecha_compromiso_pago',
      label: 'Fecha Compromiso',
      render: (value: string) => (
        <div className="text-gray-900">{formatDate(value)}</div>
      )
    },
    {
      key: 'dias_vencido',
      label: 'Días Vencido',
      align: 'center' as const,
      render: (value: number) => (
        <Badge 
          variant={value > 30 ? 'danger' : value > 15 ? 'warning' : 'info'}
          size="sm"
        >
          {value} días
        </Badge>
      )
    }
  ];

  const overdueActions = [
    {
      label: 'Marcar como Pagado',
      icon: CheckCircle,
      onClick: handleMarkAsPaid,
      show: () => canUpdate('ingresos'),
      className: 'text-green-600 hover:text-green-700',
      tooltip: 'Marcar este ingreso como pagado'
    },
    {
      label: 'Ver Evento',
      icon: Eye,
      onClick: (row: any) => window.open(`/eventos/${row.evento_id}`, '_blank'),
      tooltip: 'Ver detalles del evento'
    }
  ];

  if (isDashboardLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Cargando dashboard contable..." />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Contable</h1>
          <p className="text-gray-600 mt-1">
            Control automático de estados contables y seguimiento de pagos
          </p>
        </div>
        
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <Button
            onClick={() => refetchDashboard()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          
          {canUpdate('eventos') && (
            <Button
              onClick={() => setShowRecalculateModal(true)}
              variant="outline"
              size="sm"
              disabled={isRecalculating}
            >
              <Settings className="w-4 h-4 mr-2" />
              Recalcular Estados
            </Button>
          )}
        </div>
      </div>

      {/* Accounting State Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">
                {dashboard?.eventosCerrados || 0}
              </div>
              <div className="text-sm text-gray-600">Eventos Cerrados</div>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-700">
                {dashboard?.eventosPagosPendientes || 0}
              </div>
              <div className="text-sm text-yellow-600">Pagos Pendientes</div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">
                {dashboard?.eventosPagados || 0}
              </div>
              <div className="text-sm text-green-600">Eventos Pagados</div>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-700">
                {dashboard?.eventosPagosVencidos || 0}
              </div>
              <div className="text-sm text-red-600">Pagos Vencidos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Por Cobrar
          </h3>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {formatCurrency(dashboard?.totalPorCobrar || 0)}
          </div>
          <div className="text-sm text-gray-600">
            Ingresos facturados pendientes de pago
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Vencido
          </h3>
          <div className="text-3xl font-bold text-red-600 mb-2">
            {formatCurrency(dashboard?.totalVencido || 0)}
          </div>
          <div className="text-sm text-gray-600">
            Pagos que han vencido su fecha compromiso
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-mint-600" />
            Tasa de Cobranza
          </h3>
          <div className="text-3xl font-bold text-mint-600 mb-2">
            {dashboard?.tasaCobranza.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-gray-600">
            Porcentaje de ingresos cobrados
          </div>
        </div>
      </div>

      {/* Events Needing Review */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Eventos Pendientes de Revisión Contable
            </h3>
            <Badge variant="warning" size="md">
              {eventsNeedingReview.length} eventos
            </Badge>
          </div>
        </div>
        
        <div className="p-6">
          {isEventsLoading ? (
            <LoadingSpinner text="Cargando eventos..." />
          ) : eventsNeedingReview.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No hay eventos pendientes de revisión contable</p>
            </div>
          ) : (
            <div className="space-y-4">
              {eventsNeedingReview.map(event => (
                <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{event.nombre_proyecto}</h4>
                        <Badge variant="warning" size="sm">
                          {event.evt_estados.nombre}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Clave: {event.clave_evento}</div>
                        <div>Fecha: {formatDate(event.fecha_evento)}</div>
                        <div>Ingresos: {event.evt_ingresos?.length || 0} registros</div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => calculateEventState(event.id.toString())}
                        variant="outline"
                        size="sm"
                        disabled={isCalculating}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Recalcular
                      </Button>
                      <Button
                        onClick={() => window.open(`/eventos/${event.id}`, '_blank')}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Payments Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Pagos Vencidos
            </h3>
            <Badge variant="danger" size="md">
              {overduePayments.length} pagos vencidos
            </Badge>
          </div>
        </div>
        
        <div className="overflow-hidden">
          {isOverdueLoading ? (
            <div className="p-6">
              <LoadingSpinner text="Cargando pagos vencidos..." />
            </div>
          ) : overduePayments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No hay pagos vencidos</p>
            </div>
          ) : (
            <DataTable
              data={overduePayments}
              columns={overdueColumns}
              actions={overdueActions}
              exportable={true}
              filterable={true}
            />
          )}
        </div>
      </div>

      {/* Payment Status Modal */}
      {showPaymentModal && selectedIncome && (
        <PaymentStatusModal
          income={selectedIncome}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedIncome(null);
          }}
          onConfirm={handlePaymentConfirm}
        />
      )}

      {/* Recalculate All Modal */}
      {showRecalculateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowRecalculateModal(false)}
          title="Recalcular Estados Contables"
          size="md"
        >
          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Recálculo Masivo</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    Esta operación recalculará el estado contable de todos los eventos en estado "Cerrado".
                    El proceso puede tomar varios minutos dependiendo del número de eventos.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Eventos a procesar:</span>
                  <div>{dashboard?.eventosCerrados || 0}</div>
                </div>
                <div>
                  <span className="font-medium">Tiempo estimado:</span>
                  <div>{Math.ceil((dashboard?.eventosCerrados || 0) / 10)} minutos</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => setShowRecalculateModal(false)}
                variant="outline"
                disabled={isRecalculating}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  recalculateAllEvents();
                  setShowRecalculateModal(false);
                }}
                disabled={isRecalculating}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                {isRecalculating && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Iniciar Recálculo
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};