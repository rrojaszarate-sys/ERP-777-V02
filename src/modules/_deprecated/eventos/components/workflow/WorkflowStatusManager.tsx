import { EventoCompleto } from '../../../core/types/events';
import { useAuth } from '../../../core/auth/AuthProvider';
import { EventStateManager } from './workflow/EventStateManager';
import { WorkflowStatusBadge } from './workflow/WorkflowStatusBadge';
import { workflowService } from '../services/workflowService';
import { StateAdvancementManager } from './StateAdvancementManager';

interface WorkflowStatusManagerProps {
  evento: EventoCompleto;
  onStatusChange: (newStateId: number) => void;
  className?: string;
}

export const WorkflowStatusManager: React.FC<WorkflowStatusManagerProps> = ({
  evento,
  onStatusChange,
  className = ''
}) => {
  const { user } = useAuth();

  const handleStateChange = async (newStateId: number, validationData?: any) => {
    try {
      await workflowService.changeEventState(
        evento.id,
        newStateId,
        validationData
      );
      onStatusChange(newStateId);
    } catch (error) {
      console.error('Error changing event state:', error);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <StateAdvancementManager
        event={evento}
        onStateChanged={() => onStatusChange(evento.estado_id)}
      />
    </div>
  );
};