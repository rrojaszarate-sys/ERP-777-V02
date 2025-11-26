import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Trash2, CheckCircle, Info, AlertCircle } from 'lucide-react';

type DialogType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
  isLoading?: boolean;
  itemName?: string;
}

const typeConfig: Record<DialogType, { icon: React.ReactNode; bgColor: string; iconBg: string; confirmBtn: string }> = {
  danger: {
    icon: <Trash2 className="w-6 h-6 text-red-600" />,
    bgColor: 'bg-red-50',
    iconBg: 'bg-red-100',
    confirmBtn: 'bg-red-600 hover:bg-red-700'
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    bgColor: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700'
  },
  info: {
    icon: <Info className="w-6 h-6 text-blue-600" />,
    bgColor: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700'
  },
  success: {
    icon: <CheckCircle className="w-6 h-6 text-green-600" />,
    bgColor: 'bg-green-50',
    iconBg: 'bg-green-100',
    confirmBtn: 'bg-green-600 hover:bg-green-700'
  }
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  isLoading = false,
  itemName
}) => {
  const config = typeConfig[type];

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          />

          {/* Dialog */}
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header con icono */}
              <div className={`${config.bgColor} px-6 py-4`}>
                <div className="flex items-center gap-4">
                  <div className={`${config.iconBg} p-3 rounded-full`}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white/50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="px-6 py-4">
                <p className="text-gray-600">{message}</p>

                {itemName && (
                  <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-500">Elemento a eliminar:</p>
                    <p className="font-medium text-gray-900">{itemName}</p>
                  </div>
                )}

                {type === 'danger' && (
                  <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>Esta acción no se puede deshacer.</span>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${config.confirmBtn}`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      {type === 'danger' && <Trash2 className="w-4 h-4" />}
                      <span>{confirmText}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Hook para usar el diálogo de confirmación fácilmente
export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type?: DialogType;
    itemName?: string;
  } | null>(null);

  const showConfirm = ({
    title,
    message,
    onConfirm,
    type = 'danger',
    itemName
  }: {
    title: string;
    message: string;
    onConfirm: () => void;
    type?: DialogType;
    itemName?: string;
  }) => {
    setConfig({ title, message, onConfirm, type, itemName });
    setIsOpen(true);
  };

  const hideConfirm = () => {
    setIsOpen(false);
    setConfig(null);
  };

  const ConfirmDialogComponent = config ? (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={hideConfirm}
      onConfirm={() => {
        config.onConfirm();
        hideConfirm();
      }}
      title={config.title}
      message={config.message}
      type={config.type}
      itemName={config.itemName}
    />
  ) : null;

  return { showConfirm, ConfirmDialogComponent };
};

export default ConfirmDialog;
