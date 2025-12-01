import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Clock, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Modal } from '../../../../shared/components/ui/Modal';
import { Badge } from '../../../../shared/components/ui/Badge';
import { useEventStates, EventState } from '../../hooks/useEventStates';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { usePermissions } from '../../../../core/permissions/usePermissions';
import { EventWorkflowVisualization } from './EventWorkflowVisualization';
import { supabase } from '../../../../core/config/supabase';
import { workflowService } from '../../services/workflowService';
import toast from 'react-hot-toast';

interface EventStateManagerProps {
  eventId: string;
  currentStateId: number;
  onStateChange: (newStateId: number, validationData?: any) => void;
  className?: string;
}

export const EventStateManager: React.FC<EventStateManagerProps> = ({
  eventId,
  currentStateId,
  onStateChange,
  className = ''
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetState, setTargetState] = useState<EventState | null>(null);
  const [validationData, setValidationData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const {
    states,
    getNextState, // Assuming useEventStates provides this
    getPreviousState, // Assuming useEventStates provides this
  } = useEventStates();

  const currentState = states?.find(s => s.id === currentStateId);
  const nextState = getNextState(currentStateId);
  const previousState = getPreviousState(currentStateId);
  
  const canManageWorkflow = hasPermission('eventos', 'update', 'workflow');

  const canAdvanceToState = (currentId: number, targetId: number) => true; // Simplified for now
  const canRegressToState = (currentId: number, targetId: number) => true; // Simplified for now

  // Verificar si el estado actual es "Cancelado"
  const isCancelled = currentState?.nombre.toLowerCase() === 'cancelado';

  const handleStateTransition = (targetStateObj: EventState) => {
    if (!canManageWorkflow) return;
    
    setTargetState(targetStateObj);
    setValidationData({});
    setShowConfirmModal(true);
  };

  const confirmStateChange = async () => {
    if (targetState) {
      setIsLoading(true);
      try {
        await workflowService.changeEventState(
          parseInt(eventId),
          targetState.id,
          user!.id,
          validationData
        );
        toast.success(`Estado cambiado a ${targetState.nombre}`);
        onStateChange(targetState.id, validationData);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al cambiar de estado');
      } finally {
        setIsLoading(false);
        setShowConfirmModal(false);
        setTargetState(null);
        setValidationData({});
      }
    }
  };

  const handleCancelEvent = async () => {
    try {
      // Buscar el estado "Cancelado"
      const { data: canceladoState, error } = await supabase
        .from('evt_estados')
        .select('id, nombre, color, orden')
        .eq('nombre', 'Cancelado')
        .single();

      if (error || !canceladoState) {
        console.error('Error: Estado "Cancelado" no encontrado', error);
        return;
      }

      // Abrir modal de confirmación con el estado "Cancelado"
      setTargetState(canceladoState as EventState);
      setValidationData({});
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al intentar cancelar evento:', error);
    }
  };

  const getStateTransitionRequirements = (state: EventState): string[] => {
    const requirements: string[] = [];

    switch (state.nombre.toLowerCase()) {
      case 'borrador':
        requirements.push('Información básica del evento');
        requirements.push('Cliente y responsable asignados');
        break;
      case 'acuerdo':
        requirements.push('Contrato firmado con el cliente');
        requirements.push('Presupuesto aprobado');
        break;
      case 'orden de compra': // Mantenido, ya que 'Aprobado' se renombró a 'Orden de Compra'
        requirements.push('Orden de compra generada');
        requirements.push('Proveedores confirmados');
        break;
      case 'en ejecución': // Corregido de 'en proceso'
        requirements.push('Recursos asignados');
        requirements.push('Cronograma en marcha');
        break;
      case 'finalizado': // Corregido de 'completado'
        requirements.push('Evento ejecutado exitosamente');
        requirements.push('Entregables completados');
        break;
      case 'facturado': // Mantenido
        requirements.push('Todos los ingresos facturados');
        requirements.push('Documentos fiscales completos');
        break;
      case 'pagado':
        requirements.push('Todos los ingresos pagados');
        requirements.push('Comprobantes de pago recibidos');
        break;
      case 'cancelado':
        requirements.push('Notificar al cliente sobre la cancelación');
        requirements.push('Documentar el motivo de la cancelación');
        requirements.push('Verificar compromisos pendientes');
        break;
      default:
        requirements.push('Verificar requisitos específicos del estado');
        break;
    }

    return requirements;
  };

  if (!currentState) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Estado del evento no encontrado</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current State Display */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Estado Actual del Evento</h3>
          {canManageWorkflow && (
            <div className="flex space-x-2">
              {previousState && canRegressToState(currentStateId, previousState.id) && !isCancelled && (
                <Button
                  onClick={() => handleStateTransition(previousState)}
                  variant="outline"
                  size="sm"
                  className="text-gray-600"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Regresar
                </Button>
              )}

              {nextState && canAdvanceToState(currentStateId, nextState.id) && !isCancelled && (
                <Button
                  onClick={() => handleStateTransition(nextState)}
                  size="sm"
                  className="bg-mint-500 hover:bg-mint-600"
                >
                  Avanzar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {!isCancelled && (
                <Button
                  onClick={handleCancelEvent}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Evento
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div 
            className="p-4 rounded-full border-2"
            style={{
              backgroundColor: currentState.color || '#74F1C8',
              borderColor: currentState.color || '#74F1C8'
            }}
          >
            <Clock className="w-6 h-6 text-white" />
          </div>
          
          <div>
            <h4 className="text-xl font-bold text-gray-900">{currentState.nombre}</h4>
            {currentState.descripcion && (
              <p className="text-gray-600">{currentState.descripcion}</p>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="info" size="sm">
                Paso {currentState.orden} de {states.length}
              </Badge>
              {currentState.workflow_step && (
                <Badge variant="default" size="sm">
                  Workflow {currentState.workflow_step}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Visualization */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Flujo de Estados</h3>
        <EventWorkflowVisualization
          currentStateId={currentStateId}
          onStateClick={canManageWorkflow ? handleStateTransition : undefined}
          showProgress={false}
          interactive={canManageWorkflow}
        />
      </div>

      {/* Next Steps */}
      {nextState && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Siguiente Paso</h4>
          <div className="flex items-center space-x-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: nextState.color || '#74F1C8' }}
            />
            <span className="text-blue-800">{nextState.nombre}</span>
          </div>
          
          {nextState.descripcion && (
            <p className="text-sm text-blue-700 mt-2">{nextState.descripcion}</p>
          )}
          
          {canManageWorkflow && (
            <div className="mt-3">
              <Button
                onClick={() => handleStateTransition(nextState)}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
              >
                Avanzar a {nextState.nombre}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* State Transition Confirmation Modal */}
      {showConfirmModal && targetState && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowConfirmModal(false);
            setTargetState(null);
            setValidationData({});
          }}
          title={`Cambiar Estado a: ${targetState.nombre}`}
          size="md"
        >
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: targetState.color || '#74F1C8' }}
                >
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{targetState.nombre}</h3>
                  {targetState.descripcion && (
                    <p className="text-gray-600">{targetState.descripcion}</p>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Requisitos para este estado:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {getStateTransitionRequirements(targetState).map((requirement, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Validation Fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas del cambio de estado
                </label>
                <textarea
                  value={validationData.notes || ''}
                  onChange={(e) => setValidationData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
                  placeholder="Describe los motivos del cambio de estado..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de transición
                </label>
                <input
                  type="date"
                  value={validationData.transition_date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setValidationData(prev => ({ ...prev, transition_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setShowConfirmModal(false);
                  setTargetState(null);
                  setValidationData({});
                }}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmStateChange}
                style={{ backgroundColor: targetState.color || '#74F1C8' }}
                className="text-white hover:opacity-90" disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Confirmar Cambio'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};