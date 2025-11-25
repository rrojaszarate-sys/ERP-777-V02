/**
 * 📄 Página Principal - Gestión de Facturas Electrónicas (CFDI)
 */

import React, { useState } from 'react';
import { Upload, BarChart3, List, Bell } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { InvoiceUploadModal } from '../components/InvoiceUploadModal';
import { InvoiceList } from '../components/InvoiceList';
import { InvoiceDashboard } from '../components/InvoiceDashboard';
import type { Invoice, InvoiceFilters } from '../types/Invoice';

interface FacturasPageProps {
  eventoId?: string;
}

export const FacturasPage: React.FC<FacturasPageProps> = ({ eventoId }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [filters, setFilters] = useState<InvoiceFilters>({
    year: new Date().getFullYear()
  });

  const handleUploadSuccess = (invoice: Invoice) => {
    console.log('✅ Factura cargada:', invoice);
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'listado', label: 'Listado de Facturas', icon: List },
    { id: 'configuracion', label: 'Configuración', icon: Bell }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            📋 Gestión de Facturas Electrónicas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Administra facturas XML (CFDI) con seguimiento automático de cobros
          </p>
        </div>
        
        {eventoId && (
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            size="md"
          >
            <Upload className="w-4 h-4 mr-2" />
            Cargar Factura XML
          </Button>
        )}
      </div>

      {/* Tabs personalizados */}
      {eventoId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-4 px-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    selectedTab === tab.id
                      ? 'border-mint-500 text-mint-600 dark:text-mint-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {selectedTab === 'dashboard' && (
              <InvoiceDashboard filters={filters} />
            )}

            {selectedTab === 'listado' && (
              <InvoiceList 
                eventoId={eventoId}
                refreshTrigger={refreshTrigger}
              />
            )}

            {selectedTab === 'configuracion' && (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Sistema de Alertas Automáticas</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-2xl mx-auto">
                  Las alertas de cobro se envían automáticamente a los clientes y responsables según la configuración:
                </p>
                <ul className="text-left max-w-md mx-auto space-y-2 text-sm">
                  <li>✅ <strong>Alerta Previa:</strong> 3 días antes del vencimiento</li>
                  <li>✅ <strong>Alerta de Compromiso:</strong> El día del vencimiento</li>
                  <li>✅ <strong>Alertas de Vencidas:</strong> Cada 7 días después del vencimiento</li>
                </ul>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Tip:</strong> Las alertas se ejecutan automáticamente cada día a las 9:00 AM
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Información de ayuda cuando no hay evento seleccionado
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-l-mint-500 p-6">
          <div className="flex items-start gap-4">
            <div className="text-mint-500 text-4xl">💡</div>
            <div>
              <h3 className="font-semibold mb-2 text-lg">¿Cómo funciona el sistema de facturas?</h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong>1. Selecciona un evento</strong> desde el módulo de eventos
                </p>
                <p>
                  <strong>2. Carga el XML</strong> de la factura electrónica (CFDI)
                </p>
                <p>
                  <strong>3. Define los días de crédito</strong> para calcular la fecha de vencimiento
                </p>
                <p>
                  <strong>4. El sistema automáticamente:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Extrae todos los datos del XML (UUID, RFC, montos, fechas)</li>
                  <li>Calcula la fecha de compromiso de pago</li>
                  <li>Programa alertas automáticas de cobro</li>
                  <li>Envía emails al cliente y responsable</li>
                </ul>
              </div>
              <div className="mt-4 p-3 bg-mint-50 dark:bg-mint-900/20 rounded">
                <p className="text-sm text-mint-800 dark:text-mint-200">
                  📌 <strong>Nota:</strong> Para usar este módulo, primero selecciona un evento desde la página de Eventos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de carga */}
      {eventoId && (
        <InvoiceUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          eventoId={eventoId}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

export default FacturasPage;
