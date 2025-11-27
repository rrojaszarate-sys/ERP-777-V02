/**
 * ÍCONOS DE ACCIÓN ESTÁNDAR
 *
 * Componentes homologados para acciones CRUD en todo el ERP
 *
 * USO:
 * import { EditIcon, ViewIcon, DeleteIcon, CloseIcon } from '@/shared/components/ui/ActionIcons';
 *
 * <EditIcon onClick={handleEdit} />
 * <ViewIcon onClick={handleView} />
 * <DeleteIcon onClick={handleDelete} />
 * <CloseIcon onClick={handleClose} />
 *
 * ESTÁNDAR DE ÍCONOS:
 * - Editar:   Pencil (lápiz - intuitivo para edición)
 * - Ver:      Eye (ojo - ver detalles)
 * - Eliminar: Trash2 (papelera)
 * - Cerrar:   X (equis)
 * - Agregar:  Plus (más)
 * - Guardar:  Save (diskette)
 * - Cancelar: XCircle (equis en círculo)
 */

import React from 'react';
import {
  Pencil,
  Eye,
  Trash2,
  X,
  Plus,
  Save,
  XCircle,
  Check,
  RefreshCw,
  Download,
  Upload,
  Settings,
  MoreVertical,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { LucideProps } from 'lucide-react';

// Tipos para los íconos
interface ActionIconProps extends Omit<LucideProps, 'ref'> {
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}

// Tamaños predefinidos
const SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6'
} as const;

type IconSize = keyof typeof SIZES;

interface ActionIconWrapperProps extends ActionIconProps {
  Icon: React.ComponentType<LucideProps>;
  colorClass?: string;
  hoverClass?: string;
  size?: IconSize;
}

// Wrapper base para todos los íconos de acción
const ActionIconWrapper: React.FC<ActionIconWrapperProps> = ({
  Icon,
  onClick,
  disabled = false,
  title,
  colorClass = 'text-gray-500',
  hoverClass = 'hover:text-gray-700',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClass = SIZES[size];
  const baseClasses = `${sizeClass} ${colorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${hoverClass}`} transition-colors`;

  return (
    <Icon
      className={`${baseClasses} ${className}`}
      onClick={disabled ? undefined : onClick}
      title={title}
      {...props}
    />
  );
};

// ============================================================
// ÍCONOS DE ACCIÓN PRINCIPALES
// ============================================================

/** Ícono de Editar (Pencil/Lápiz) - Color azul */
export const EditIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={Pencil}
    colorClass="text-blue-500"
    hoverClass="hover:text-blue-700"
    title="Editar"
    size={size}
    {...props}
  />
);

/** Ícono de Ver/Visualizar (Eye/Ojo) - Color gris */
export const ViewIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={Eye}
    colorClass="text-gray-500"
    hoverClass="hover:text-gray-700"
    title="Ver detalles"
    size={size}
    {...props}
  />
);

/** Ícono de Eliminar (Trash/Papelera) - Color rojo */
export const DeleteIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={Trash2}
    colorClass="text-red-500"
    hoverClass="hover:text-red-700"
    title="Eliminar"
    size={size}
    {...props}
  />
);

/** Ícono de Cerrar (X) - Color gris */
export const CloseIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={X}
    colorClass="text-gray-400"
    hoverClass="hover:text-gray-600"
    title="Cerrar"
    size={size}
    {...props}
  />
);

/** Ícono de Agregar (Plus/Más) - Color verde */
export const AddIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={Plus}
    colorClass="text-green-500"
    hoverClass="hover:text-green-700"
    title="Agregar"
    size={size}
    {...props}
  />
);

/** Ícono de Guardar (Save/Diskette) - Color verde */
export const SaveIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={Save}
    colorClass="text-green-500"
    hoverClass="hover:text-green-700"
    title="Guardar"
    size={size}
    {...props}
  />
);

/** Ícono de Cancelar (XCircle) - Color rojo */
export const CancelIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={XCircle}
    colorClass="text-red-400"
    hoverClass="hover:text-red-600"
    title="Cancelar"
    size={size}
    {...props}
  />
);

/** Ícono de Confirmar (Check) - Color verde */
export const ConfirmIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={Check}
    colorClass="text-green-500"
    hoverClass="hover:text-green-700"
    title="Confirmar"
    size={size}
    {...props}
  />
);

/** Ícono de Refrescar (RefreshCw) - Color azul */
export const RefreshIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={RefreshCw}
    colorClass="text-blue-500"
    hoverClass="hover:text-blue-700"
    title="Actualizar"
    size={size}
    {...props}
  />
);

/** Ícono de Descargar (Download) - Color azul */
export const DownloadIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={Download}
    colorClass="text-blue-500"
    hoverClass="hover:text-blue-700"
    title="Descargar"
    size={size}
    {...props}
  />
);

/** Ícono de Subir (Upload) - Color azul */
export const UploadIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={Upload}
    colorClass="text-blue-500"
    hoverClass="hover:text-blue-700"
    title="Subir"
    size={size}
    {...props}
  />
);

/** Ícono de Configuración (Settings) - Color gris */
export const SettingsIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={Settings}
    colorClass="text-gray-500"
    hoverClass="hover:text-gray-700"
    title="Configuración"
    size={size}
    {...props}
  />
);

/** Ícono de Más Opciones (MoreVertical) - Color gris */
export const MoreIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={MoreVertical}
    colorClass="text-gray-500"
    hoverClass="hover:text-gray-700"
    title="Más opciones"
    size={size}
    {...props}
  />
);

/** Ícono de Copiar (Copy) - Color gris */
export const CopyIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={Copy}
    colorClass="text-gray-500"
    hoverClass="hover:text-gray-700"
    title="Copiar"
    size={size}
    {...props}
  />
);

/** Ícono de Enlace Externo (ExternalLink) - Color azul */
export const ExternalLinkIcon: React.FC<ActionIconProps & { size?: IconSize }> = ({ size = 'md', ...props }) => (
  <ActionIconWrapper
    Icon={ExternalLink}
    colorClass="text-blue-500"
    hoverClass="hover:text-blue-700"
    title="Abrir enlace"
    size={size}
    {...props}
  />
);

// ============================================================
// COMPONENTE DE GRUPO DE ACCIONES
// ============================================================

interface ActionButtonsGroupProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  size?: IconSize;
  className?: string;
}

/**
 * Grupo de botones de acción estándar (Ver, Editar, Eliminar)
 *
 * @example
 * <ActionButtonsGroup
 *   onView={() => handleView(item)}
 *   onEdit={() => handleEdit(item)}
 *   onDelete={() => handleDelete(item)}
 * />
 */
export const ActionButtonsGroup: React.FC<ActionButtonsGroupProps> = ({
  onView,
  onEdit,
  onDelete,
  showView = true,
  showEdit = true,
  showDelete = true,
  size = 'md',
  className = ''
}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    {showView && onView && (
      <button
        onClick={onView}
        className="p-1 rounded hover:bg-gray-100 transition-colors"
        title="Ver detalles"
      >
        <ViewIcon size={size} />
      </button>
    )}
    {showEdit && onEdit && (
      <button
        onClick={onEdit}
        className="p-1 rounded hover:bg-blue-50 transition-colors"
        title="Editar"
      >
        <EditIcon size={size} />
      </button>
    )}
    {showDelete && onDelete && (
      <button
        onClick={onDelete}
        className="p-1 rounded hover:bg-red-50 transition-colors"
        title="Eliminar"
      >
        <DeleteIcon size={size} />
      </button>
    )}
  </div>
);

// ============================================================
// EXPORTACIÓN DE ÍCONOS CRUDOS (para uso directo de Lucide)
// ============================================================

export {
  Pencil as RawEditIcon,
  Eye as RawViewIcon,
  Trash2 as RawDeleteIcon,
  X as RawCloseIcon,
  Plus as RawAddIcon,
  Save as RawSaveIcon,
  XCircle as RawCancelIcon,
  Check as RawConfirmIcon,
  RefreshCw as RawRefreshIcon,
  Download as RawDownloadIcon,
  Upload as RawUploadIcon,
  Settings as RawSettingsIcon,
  MoreVertical as RawMoreIcon,
  Copy as RawCopyIcon,
  ExternalLink as RawExternalLinkIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
};
