import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, User, MapPin, DollarSign, TrendingUp, TrendingDown, Plus, CreditCard as Edit, Trash2, Eye, FileText, Paperclip, X, Receipt } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal } from '../../../../shared/components/ui/Modal';
import { Button } from '../../../../shared/components/ui/Button';
import { Badge } from '../../../../shared/components/ui/Badge';
import { useIncomes, useExpenses, useFinancialSummary } from '../../hooks/useFinances';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';
import { EventoCompleto } from '../../types/Event';
import { IncomeTab } from '../finances/IncomeTab';
import { ExpenseTab } from '../finances/ExpenseTab';
import { FinancialSummary } from '../finances/FinancialSummary';
import { WorkflowStatusBadge } from '../workflow/WorkflowStatusBadge';
import { StateAdvancementManager } from '../workflow/StateAdvancementManager';
import { EventDocumentUpload } from '../documents/EventDocumentUpload';
import { EventWorkflowVisualization } from '../workflow/EventWorkflowVisualization';
import { Settings } from 'lucide-react';
import { DocumentosEvento } from '../documents/DocumentosEvento';
// import { InvoicesTab } from '../invoices/InvoicesTab'; // ❌ Archivo movido a trash
import toast from 'react-hot-toast';
import { supabase } from '../../../../core/config/supabase';



interface EventDetailProps {
  event: EventoCompleto;
  onClose: () => void;
  onEdit: (event: EventoCompleto) => void;
}

export const EventDetail: React.FC<EventDetailProps> = ({
  event: initialEvent,
  onClose,
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ingresos' | 'gastos' | 'balance' | 'archivos' | 'estados' | 'facturas'>('overview');
  const [eventDocuments, setEventDocuments] = useState<any[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Consultar el evento activamente para obtener cambios en tiempo real
  const { data: currentEvent } = useQuery({
    queryKey: ['evento-detail', initialEvent.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_eventos_completos')
        .select('*')
        .eq('id', initialEvent.id)
        .single();

      if (error) throw error;
      return data as EventoCompleto;
    },
    initialData: initialEvent,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Usar el evento actualizado, o el inicial si no hay datos aún
  const event = currentEvent || initialEvent;

  const { data: financialSummary } = useFinancialSummary(event.id);
  const { incomes, refetch: refetchIncomes } = useIncomes(event.id);
  const { expenses, refetch: refetchExpenses } = useExpenses(event.id);

  const getStatusBadge = (status: string, type: 'pago' | 'facturacion') => {
    if (type === 'pago') {
      const variants = {
        'pendiente': 'warning',
        'pago_pendiente': 'warning',
        'pagado': 'success',
        'vencido': 'danger'
      };
      
      const labels = {
        'pendiente': 'Pendiente',
        'pago_pendiente': 'Pago Pendiente',
        'pagado': 'Pagado',
        'vencido': 'Vencido'
      };
      
      return (
        <Badge variant={variants[status as keyof typeof variants] as any}>
          {labels[status as keyof typeof labels]}
        </Badge>
      );
    } else {
      const variants = {
        'pendiente_facturar': 'warning',
        'facturado': 'success',
        'cancelado': 'danger'
      };
      
      const labels = {
        'pendiente_facturar': 'Pendiente Facturar',
        'facturado': 'Facturado',
        'cancelado': 'Cancelado'
      };
      
      return (
        <Badge variant={variants[status as keyof typeof variants] as any}>
          {labels[status as keyof typeof labels]}
        </Badge>
      );
    }
  };

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: Eye },
    { id: 'ingresos', label: 'Ingresos', icon: TrendingUp },
    { id: 'gastos', label: 'Gastos', icon: TrendingDown },
    { id: 'balance', label: 'Balance', icon: DollarSign },
    { id: 'facturas', label: 'Facturas XML', icon: Receipt },
    { id: 'archivos', label: 'Archivos', icon: Paperclip },
    { id: 'estados', label: 'Estados', icon: Settings }
  ];
/*
  const handleDocumentUploaded = (document: any) => {
    setEventDocuments(prev => [...prev, document]);
  };

  const handleDocumentRemoved = (documentId: string) => {
    setEventDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };*/

  const handleStateChanged = (newStateName?: string) => {
    // Refresh event data when state changes without closing the modal
    if (newStateName) {
      toast.success(`🎉 Estado avanzado a: ${newStateName}`);
    }
    console.log('[EventDetail] Refrescando datos del evento después del cambio de estado');
    // Invalidate queries to refresh the event data
    queryClient.invalidateQueries({ queryKey: ['eventos'] });
    queryClient.invalidateQueries({ queryKey: ['evento', event.id] });
    queryClient.invalidateQueries({ queryKey: ['evento-detail', event.id] });
    refetchIncomes();
    refetchExpenses();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${event.nombre_proyecto}`}
      size="full"
    >
      <div className="flex flex-col h-full">
        {/* Header with basic info */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Información General</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-mono text-gray-900">{event.clave_evento}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      {event.lugar || 'Ubicación no especificada'}
                    </div>
                    <div className="flex items-center text-sm">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      {event.responsable_nombre || 'Sin responsable'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Cliente</h3>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">
                      {event.cliente_comercial || event.cliente_nombre}
                    </div>
                    <div className="text-sm text-gray-600">{event.cliente_rfc}</div>
                    {event.contacto_principal && (
                      <div className="text-sm text-gray-500">{event.contacto_principal}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Estados</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Estado: </span>
                      <WorkflowStatusBadge stateId={event.estado_id} showProgress={true} />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Facturación: </span>
                      {getStatusBadge(event.status_facturacion, 'facturacion')}
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Pago: </span>
                      {getStatusBadge(event.status_pago, 'pago')}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Resumen Financiero</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Presupuesto:</span>
                      <span className="font-medium text-blue-600">{formatCurrency(event.presupuesto_estimado || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(event.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gastos:</span>
                      <span className="font-medium text-red-600">{formatCurrency(event.total_gastos)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t pt-1">
                      <span>Utilidad:</span>
                      <span className={event.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(event.utilidad)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2 ml-6">
              <Button
                onClick={() => onEdit(event)}
                variant="outline"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-mint-500 text-mint-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <OverviewTab event={event} />
            )}
            
            {activeTab === 'ingresos' && (
              <IncomeTab 
                eventId={event.id}
                incomes={incomes}
                onRefresh={refetchIncomes}
              />
            )}
            
            {activeTab === 'gastos' && (
              <ExpenseTab 
                eventId={event.id}
                expenses={expenses}
                onRefresh={refetchExpenses}
              />
            )}
            
            {activeTab === 'balance' && financialSummary && (
              <FinancialSummary 
                eventId={event.id}
                summary={financialSummary}
              />
            )}
            
            {activeTab === 'facturas' && (
              <div className="text-center py-8 text-gray-500">
                <p>La pestaña de facturas está temporalmente deshabilitada</p>
              </div>
            )}
            
            {activeTab === 'archivos' && (
              <DocumentsTab event={event} onStateChanged={handleStateChanged} />
            )}
            
            {activeTab === 'estados' && (
              <StatesTab 
                event={event}
                onStateChanged={handleStateChanged}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ event: EventoCompleto }> = ({ event }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      {/* Event Workflow Visualization */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Estado Actual del Evento</h3>
        <EventWorkflowVisualization
          currentStateId={event.estado_id}
          showProgress={true}
          interactive={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Information */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Detalles del Evento</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Descripción</label>
              <p className="text-gray-900 mt-1">{event.descripcion || 'Sin descripción'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha de Inicio</label>
                <p className="text-gray-900">{formatDate(event.fecha_evento)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha de Fin</label>
                <p className="text-gray-900">
                  {event.fecha_fin ? formatDate(event.fecha_fin) : 'Mismo día'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Hora de Inicio</label>
                <p className="text-gray-900">{event.hora_inicio || 'No especificada'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Hora de Fin</label>
                <p className="text-gray-900">{event.hora_fin || 'No especificada'}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Número de Invitados</label>
              <p className="text-gray-900">{event.numero_invitados || 'No especificado'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Presupuesto <span className="line-through">Estimado</span></label>
              <div className="flex items-center space-x-2">
                <p className="text-lg font-medium text-blue-600">{formatCurrency(event.presupuesto_estimado || 0)}</p>
                {event.presupuesto_estimado && event.total && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    event.total <= event.presupuesto_estimado 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {event.total <= event.presupuesto_estimado ? 'Dentro del presupuesto' : 'Excede presupuesto'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Project Status */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estado del Proyecto</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Prioridad</label>
              <Badge 
                variant={
                  event.prioridad === 'urgente' ? 'danger' :
                  event.prioridad === 'alta' ? 'warning' :
                  event.prioridad === 'media' ? 'info' : 'default'
                }
                size="sm"
              >
                {event.prioridad?.toUpperCase()}
              </Badge>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Fechas Importantes</label>
              <div className="space-y-2 mt-2">
                {event.fecha_facturacion && (
                  <div className="flex justify-between text-sm">
                    <span>Facturación:</span>
                    <span>{formatDate(event.fecha_facturacion)}</span>
                  </div>
                )}
                {event.fecha_vencimiento && (
                  <div className="flex justify-between text-sm">
                    <span>Vencimiento:</span>
                    <span className={event.dias_vencido && event.dias_vencido > 0 ? 'text-red-600' : ''}>
                      {formatDate(event.fecha_vencimiento)}
                    </span>
                  </div>
                )}
                {event.fecha_pago && (
                  <div className="flex justify-between text-sm">
                    <span>Pago:</span>
                    <span className="text-green-600">{formatDate(event.fecha_pago)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notes */}
      {event.notas && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notas del Evento</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{event.notas}</p>
        </div>
      )}
    </motion.div>
  );
};

// Documents Tab Component

const DocumentsTab: React.FC<{
  event: EventoCompleto;
  onStateChanged: (newStateName?: string) => void;
}> = ({ event, onStateChanged }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      <h3 className="text-lg font-medium text-gray-900 mb-4">📂 Documentos del Evento</h3>
      <p className="text-sm text-gray-600 mb-4">
        Sube documentos como contratos, órdenes de compra o documentos de cierre para avanzar el estado del evento automáticamente.
      </p>
      <DocumentosEvento
        eventoId={event.id}
        estadoActual={event.estado_id}
        onDocumentUploaded={onStateChanged}
      />
    </motion.div>
  );
};

/*
const DocumentsTab: React.FC<{ 
  eventId: string;
  documents: any[];
  onDocumentUploaded: (document: any) => void;
  onDocumentRemoved: (documentId: string) => void;
}> = ({ eventId, documents, onDocumentUploaded, onDocumentRemoved }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Documentos del Evento</h3>
        <p className="text-sm text-gray-600 mb-6">
          Documentos opcionales que se pueden adjuntar según el estado del evento.
        </p>
        
        <EventDocumentUpload
          eventId={eventId}
          currentDocuments={documents}
          onDocumentUploaded={onDocumentUploaded}
          onDocumentRemoved={onDocumentRemoved}
        />
      </div>
    </motion.div>
  );
};
*/
// States Tab Component
const StatesTab: React.FC<{ 
  event: EventoCompleto;
  onStateChanged: () => void;
}> = ({ event, onStateChanged }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Gestión de Estados</h3>
        <p className="text-sm text-gray-600 mb-6">
          Control del flujo de estados del evento con validaciones automáticas.
        </p>
        
        <StateAdvancementManager
          event={event}
          onStateChanged={onStateChanged}
        />
      </div>
    </motion.div>
  );
};