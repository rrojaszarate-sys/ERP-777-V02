import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { Modal } from '../../../shared/components/ui/Modal';
import { useAuth } from '../../../core/auth/AuthProvider';
import { EventStateManager } from './workflow/EventStateManager';
import { WorkflowStatusBadge } from './workflow/WorkflowStatusBadge';
import { workflowService } from '../services/workflowService';
import { DocumentosEvento } from '../components/documents/DocumentosEvento';
import { supabase } from '../../../core/config/supabase';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface WorkflowStatusManagerProps {
  evento: any;
  onStatusChange?: (newStateId: number, validationData?: any) => void;
  className?: string;
}

export const WorkflowStatusManager: React.FC<WorkflowStatusManagerProps> = ({
  evento,
  onStatusChange,
  className = ''
}) => {
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleStateChange = async (newStateId: number, validationData?: any) => {
    try {
      if (!user) {
        toast.error('No se pudo identificar al usuario para realizar el cambio.');
        return;
      }
      
      await workflowService.changeEventState(evento.id, newStateId, user.id, validationData);

      const { data: estadoNuevo } = await supabase
        .from('evt_estados_erp')
        .select('nombre')
        .eq('id', newStateId)
        .single();

      toast.success(`✅ Estado actualizado a: ${estadoNuevo?.nombre || 'nuevo estado'}`);

      await queryClient.invalidateQueries({ queryKey: ['evento', evento.id] });
      await queryClient.invalidateQueries({ queryKey: ['eventos'] });

      if (onStatusChange) {
        onStatusChange(newStateId, validationData);
      }
    } catch (error) {
      console.error('Error changing event state:', error);
      toast.error('Error al cambiar el estado del evento');
    }
  };

  const handleDocumentUploaded = async () => {
    // La lógica de avance ahora está en el trigger de la BD.
    // Solo necesitamos refrescar la data del evento para ver el cambio.
    toast.info('Refrescando estado del evento...');
    await queryClient.invalidateQueries({ queryKey: ['evento', evento.id] });
    await queryClient.invalidateQueries({ queryKey: ['eventos'] });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Estado actual */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Estado del Evento</h3>
          <Button
            onClick={() => setShowWorkflowManager(true)}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Gestionar Estado
          </Button>
        </div>
        <div className="flex items-center justify-center">
          <WorkflowStatusBadge
            stateId={evento.estado_id}
            showProgress={true}
            size="md"
          />
        </div>
      </div>

      {/* Documentos vinculados */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Documentos Clave del Workflow</h3>
        <p className="text-sm text-gray-500 mb-4">
          Sube o consulta los documentos que avanzan automáticamente el estado del evento.
        </p>
        <DocumentosEvento
          eventoId={evento.id}
          estadoActual={evento.estado_id}
          onDocumentUploaded={handleDocumentUploaded}
        />
      </div>

      {/* Modal de gestión de estado */}
      {showWorkflowManager && (
        <Modal
          isOpen={true}
          onClose={() => setShowWorkflowManager(false)}
          title="Gestión de Estado del Evento"
          size="lg"
        >
          <EventStateManager
            eventId={String(evento.id)}
            currentStateId={evento.estado_id}
            onStateChange={(newStateId, validationData) => {
              handleStateChange(newStateId, validationData);
              setShowWorkflowManager(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
};