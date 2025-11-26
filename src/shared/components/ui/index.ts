// Componentes de UI centralizados del sistema ERP

// Componentes de carga y retroalimentación
export { LoadingSpinner } from './LoadingSpinner';
export {
  LoadingState,
  EmptyState,
  ErrorState,
  InlineAlert,
  StatusBadge,
  ProgressBar,
  Skeleton,
  TableSkeleton
} from './FeedbackStates';

// Componentes de diálogos y confirmación
export { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';

// Componentes de ayuda y guías
export { HelpGuide, HelpButton, ContextualHelp } from './HelpGuide';
export type { GuideStep, GuideSection } from './HelpGuide';

// Re-exportación de tipos
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}
