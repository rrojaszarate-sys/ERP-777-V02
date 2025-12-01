/**
 * 🧾 Tab de Facturas - Wrapper para FacturasPage
 * 
 * Componente que envuelve FacturasPage y lo adapta al estilo del EventDetail
 */

import React from 'react';
import { motion } from 'framer-motion';
import FacturasPage from '../../pages/FacturasPage';

interface InvoicesTabProps {
  eventoId: string;
}

export const InvoicesTab: React.FC<InvoicesTabProps> = ({ eventoId }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full"
    >
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">📄 Gestión de Facturas Electrónicas (CFDI)</h3>
          <p className="text-sm text-gray-600 mt-1">
            Sube y gestiona facturas XML con detección automática de alertas de vencimiento
          </p>
        </div>
        
        <div className="bg-white rounded-lg">
          <FacturasPage eventoId={eventoId} />
        </div>
      </div>
    </motion.div>
  );
};

export default InvoicesTab;
