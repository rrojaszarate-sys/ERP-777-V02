import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../../shared/components/ui/Button';
import { Modal } from '../../../../shared/components/ui/Modal';
import { Badge } from '../../../../shared/components/ui/Badge';
import { useEventStateValidation } from '../../hooks/useEventStateValidation';
import { useEventStates } from '../../hooks/useEventStates';
import { EventoCompleto } from '../../types/Event';
import { DocumentosEvento } from '../documents/DocumentosEvento';
import { workflowService } from '../../services/workflowService';
import { useAuth } from '../../../../core/auth/AuthProvider';

interface StateAdvancementManagerProps {
  event: EventoCompleto;
  onStateChanged: (newStateName?: string) => void;
  className?: string;
}

export const StateAdvancementManager: React.FC<StateAdvancementManagerProps> = ({
  event,
  onStateChanged,
  className = ''
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  const { data: states } = useEventStates();
  const { user } = useAuth();
  const {
    nextValidState,
    updateEventState,
    isUpdatingState,
    validateAdvancement
  } = useEventStateValidation(event.id.toString());

  // En desarrollo, usar usuario fijo que existe en users_erp
  const isDevMode = import.meta.env.VITE_SECURITY_MODE === 'development';
  const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
  const effectiveUserId = isDevMode ? DEV_USER_ID : (user?.id || null);

  const currentState = useMemo(() => states?.find(s => s.id === event.estado_id), [states, event.estado_id]);

  const handleAutoAdvance = async (tipo: string) => {
    if (!effectiveUserId) {
      // El hook `updateEventState` ya maneja esto, pero es bueno tener una guarda aquí.
      return;
    }

    try {
      console.log(`[StateAdvancementManager] Iniciando avance para documento tipo: ${tipo}`);
      const result = await workflowService.advanceStateOnDocumentUpload(event.id, tipo, effectiveUserId);
      
      if (result.success) {
        onStateChanged(result.newState); // Llama a la prop del padre con el nuevo estado
      } else {
        toast.info(`ℹ️ Documento subido. ${result.message}`);
        console.log(`[StateAdvancementManager] No se avanzó el estado: ${result.message}`);
      }
    } catch (error) {
      console.error('Error en handleAutoAdvance:', error);
      toast.error('Ocurrió un error al procesar el documento.');
    }
  };

  const handleAdvanceState = async () => {
    if (!nextValidState) return;

    setValidationError('');
    
    // Validate the advancement
    const validation = await validateAdvancement(nextValidState.id);
    
    if (!validation.valid) {
      setValidationError(validation.errors.join('. '));
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmStateAdvancement = async () => {
    if (nextValidState) {
      await updateEventState(nextValidState.id);
      onStateChanged(nextValidState.nombre); // Pasa el nombre del nuevo estado
      setShowConfirmModal(false);
    }
  };

  const canAdvance = nextValidState && currentState?.nombre.toLowerCase() !== 'cancelado';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current State Display */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: currentState?.color || '#74F1C8' }}
            >
              {currentState?.orden || '?'}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {currentState?.nombre || 'Estado desconocido'}
              </h3>
              <p className="text-sm text-gray-600">
                {currentState?.descripcion || 'Sin descripción'}
              </p>
            </div>
          </div>
          
          <Badge variant="info" size="sm">
            Estado Actual
          </Badge>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Error de Validación</h4>
              <p className="text-red-700 text-sm mt-1">{validationError}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Next State Action */}
      {canAdvance ? (
        <div className="bg-mint-50 border border-mint-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: nextValidState.color || '#74F1C8' }}
              >
                {nextValidState.orden}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  Siguiente: {nextValidState.nombre}
                </h4>
                <p className="text-sm text-gray-600">
                  {nextValidState.descripcion}
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleAdvanceState}
              disabled={isUpdatingState}
              className="bg-mint-500 hover:bg-mint-600"
            >
              {isUpdatingState ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Avanzar Estado
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <h4 className="font-medium text-gray-600">
                {currentState?.nombre.toLowerCase() === 'cancelado' 
                  ? 'Evento Cancelado'
                  : 'Estado Final Alcanzado'
                }
              </h4>
              <p className="text-sm text-gray-500">
                {currentState?.nombre.toLowerCase() === 'cancelado'
                  ? 'Los eventos cancelados no pueden cambiar de estado'
                  : 'Este evento ha alcanzado el estado final del flujo'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload for Auto-Advancement */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Documentos para Avance Automático</h3>
        <p className="text-sm text-gray-500 mb-4">
          Sube documentos como el contrato o la orden de compra para avanzar el estado automáticamente.
        </p>
        <DocumentosEvento
          eventoId={event.id}
          estadoActual={event.estado_id}
          onDocumentUploaded={onStateChanged}
        />
      </div>

      {/* State Advancement Confirmation Modal */}
      {showConfirmModal && nextValidState && (
        <Modal
          isOpen={true}
          onClose={() => setShowConfirmModal(false)}
          title="Confirmar Avance de Estado"
          size="md"
        >
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: currentState?.color || '#74F1C8' }}
                >
                  {currentState?.orden}
                </div>
                <span className="text-gray-900">{currentState?.nombre}</span>
              </div>
              
              <ArrowRight className="w-5 h-5 text-gray-400" />
              
              <div className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: nextValidState.color || '#74F1C8' }}
                >
                  {nextValidState.orden}
                </div>
                <span className="text-gray-900">{nextValidState.nombre}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Cambio de Estado</h4>
              <p className="text-blue-800 text-sm">
                El evento "{event.nombre_proyecto}" avanzará del estado "{currentState?.nombre}" 
                al estado "{nextValidState.nombre}".
              </p>
              {nextValidState.descripcion && (
                <p className="text-blue-700 text-sm mt-2">
                  <strong>Descripción del nuevo estado:</strong> {nextValidState.descripcion}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setShowConfirmModal(false)}
                variant="outline"
                disabled={isUpdatingState}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmStateAdvancement}
                disabled={isUpdatingState}
                style={{ backgroundColor: nextValidState.color || '#74F1C8' }}
                className="text-white hover:opacity-90"
              >
                {isUpdatingState && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Avance
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
