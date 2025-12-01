import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Mail, Phone, MapPin, CreditCard, Calendar, DollarSign, FileText, X, Pencil, Trash2, Eye, TrendingUp } from 'lucide-react';
import { Modal } from '../../../../shared/components/ui/Modal';
import { Button } from '../../../../shared/components/ui/Button';
import { Badge } from '../../../../shared/components/ui/Badge';
import { useClientEvents } from '../../hooks/useClients';
import { usePermissions } from '../../../../core/permissions/usePermissions';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';
import { Cliente } from '../../types/Event';

interface ClientDetailModalProps {
  client: Cliente;
  onClose: () => void;
  onEdit: (client: Cliente) => void;
  onDelete: (client: Cliente) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  onClose,
  onEdit,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'events' | 'financial'>('info');
  const { canUpdate, canDelete } = usePermissions();
  const { data: clientEvents, isLoading: eventsLoading } = useClientEvents(client.id);

  const tabs = [
    { id: 'info', label: 'Información', icon: Building2 },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'financial', label: 'Financiero', icon: DollarSign }
  ];

  // Calculate financial summary
  const financialSummary = React.useMemo(() => {
    if (!clientEvents) return null;
    
    const totalFacturado = clientEvents.reduce((sum, event) => sum + (event.total || 0), 0);
    const totalUtilidad = clientEvents.reduce((sum, event) => sum + (event.utilidad || 0), 0);
    const eventosPagados = clientEvents.filter(event => event.status_pago === 'pagado').length;
    const eventosPendientes = clientEvents.filter(event => event.status_pago !== 'pagado').length;
    
    return {
      totalFacturado,
      totalUtilidad,
      eventosPagados,
      eventosPendientes,
      margenPromedio: totalFacturado > 0 ? (totalUtilidad / totalFacturado) * 100 : 0
    };
  }, [clientEvents]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Cliente: ${client.nombre_comercial || client.razon_social}`}
      size="xl"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Información Fiscal</h3>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{client.razon_social}</div>
                    <div className="text-sm text-gray-600 font-mono">{client.rfc}</div>
                    <Badge variant="info" size="sm">
                      Régimen {client.regimen_fiscal}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Contacto</h3>
                  <div className="space-y-1">
                    <div className="text-gray-900">{client.contacto_principal || 'Sin contacto'}</div>
                    {client.email && (
                      <div className="text-sm text-gray-600 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {client.email}
                      </div>
                    )}
                    {client.telefono && (
                      <div className="text-sm text-gray-600 flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {client.telefono}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Configuración</h3>
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="text-gray-500">CFDI:</span> {client.uso_cfdi}
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Crédito:</span> {client.dias_credito} días
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Límite:</span> {formatCurrency(client.limite_credito || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2 ml-6">
              {canUpdate('clientes') && (
                <Button
                  onClick={() => onEdit(client)}
                  variant="outline"
                  size="sm"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              {canDelete('clientes') && (
                <Button
                  onClick={() => onDelete(client)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              )}
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
                {tab.id === 'events' && clientEvents && (
                  <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                    {clientEvents.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'info' && (
              <ClientInfoTab client={client} />
            )}
            
            {activeTab === 'events' && (
              <ClientEventsTab 
                client={client}
                events={clientEvents || []}
                isLoading={eventsLoading}
              />
            )}
            
            {activeTab === 'financial' && financialSummary && (
              <ClientFinancialTab 
                client={client}
                summary={financialSummary}
                events={clientEvents || []}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
};

// Client Info Tab
const ClientInfoTab: React.FC<{ client: Cliente }> = ({ client }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Razón Social</label>
              <p className="text-gray-900 mt-1">{client.razon_social}</p>
            </div>
            
            {client.nombre_comercial && (
              <div>
                <label className="text-sm font-medium text-gray-500">Nombre Comercial</label>
                <p className="text-gray-900 mt-1">{client.nombre_comercial}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-500">RFC</label>
              <p className="text-gray-900 font-mono mt-1">{client.rfc}</p>
            </div>

            {client.sufijo && (
              <div>
                <label className="text-sm font-medium text-gray-500">Sufijo</label>
                <p className="text-gray-900 font-mono mt-1">{client.sufijo}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500">Régimen Fiscal</label>
              <div className="mt-1">
                <Badge variant="info" size="sm">
                  {client.regimen_fiscal}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact Information */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Contacto</h3>
          <div className="space-y-4">
            {client.contacto_principal && (
              <div>
                <label className="text-sm font-medium text-gray-500">Contacto Principal</label>
                <p className="text-gray-900 mt-1">{client.contacto_principal}</p>
              </div>
            )}
            
            {client.email && (
              <div>
                <label className="text-sm font-medium text-gray-500">Email Principal</label>
                <p className="text-gray-900 mt-1 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  {client.email}
                </p>
              </div>
            )}
            
            {client.telefono && (
              <div>
                <label className="text-sm font-medium text-gray-500">Teléfono Principal</label>
                <p className="text-gray-900 mt-1 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  {client.telefono}
                </p>
              </div>
            )}
            
            {client.email_contacto && (
              <div>
                <label className="text-sm font-medium text-gray-500">Email de Contacto</label>
                <p className="text-gray-900 mt-1">{client.email_contacto}</p>
              </div>
            )}
            
            {client.telefono_contacto && (
              <div>
                <label className="text-sm font-medium text-gray-500">Teléfono de Contacto</label>
                <p className="text-gray-900 mt-1">{client.telefono_contacto}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Address */}
      {client.direccion_fiscal && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Dirección Fiscal</h3>
          <p className="text-gray-900 flex items-start">
            <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
            {client.direccion_fiscal}
          </p>
        </div>
      )}
      
      {/* Billing Configuration */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Facturación</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Uso CFDI</label>
            <p className="text-gray-900 mt-1">{client.uso_cfdi}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Método de Pago</label>
            <p className="text-gray-900 mt-1">{client.metodo_pago}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Forma de Pago</label>
            <p className="text-gray-900 mt-1">{client.forma_pago}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Días de Crédito</label>
            <p className="text-gray-900 mt-1">{client.dias_credito} días</p>
          </div>
        </div>
        
        {client.limite_credito && client.limite_credito > 0 && (
          <div className="mt-4 pt-4 border-t">
            <label className="text-sm font-medium text-gray-500">Límite de Crédito</label>
            <p className="text-lg font-medium text-gray-900 mt-1">
              {formatCurrency(client.limite_credito)}
            </p>
          </div>
        )}
      </div>
      
      {/* Notes */}
      {client.notas && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notas</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{client.notas}</p>
        </div>
      )}
    </motion.div>
  );
};

// Client Events Tab
const ClientEventsTab: React.FC<{ 
  client: Cliente; 
  events: any[]; 
  isLoading: boolean;
}> = ({ client, events, isLoading }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Eventos del Cliente</h3>
        <Badge variant="info" size="md">
          {events.length} eventos
        </Badge>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay eventos registrados para este cliente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <div key={event.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">{event.nombre_proyecto}</h4>
                    <Badge 
                      variant={
                        event.status_pago === 'pagado' ? 'success' :
                        event.status_pago === 'pago_pendiente' ? 'warning' : 'info'
                      } 
                      size="sm"
                    >
                      {event.status_pago}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Clave:</span>
                      <div className="font-mono">{event.clave_evento}</div>
                    </div>
                    <div>
                      <span className="font-medium">Fecha:</span>
                      <div>{formatDate(event.fecha_evento)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Total:</span>
                      <div className="font-medium text-gray-900">{formatCurrency(event.total || 0)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Utilidad:</span>
                      <div className={`font-medium ${
                        (event.utilidad || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(event.utilidad || 0)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={() => window.open(`/eventos/${event.id}`, '_blank')}
                  variant="outline"
                  size="sm"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// Client Financial Tab
const ClientFinancialTab: React.FC<{ 
  client: Cliente; 
  summary: any; 
  events: any[];
}> = ({ client, summary, events }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-6 h-6 text-green-600" />
            <div>
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(summary.totalFacturado)}
              </div>
              <div className="text-sm text-green-600">Total Facturado</div>
            </div>
          </div>
        </div>
        
        <div className="bg-mint-50 border border-mint-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-mint-600" />
            <div>
              <div className="text-lg font-bold text-mint-700">
                {formatCurrency(summary.totalUtilidad)}
              </div>
              <div className="text-sm text-mint-600">Utilidad Generada</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-blue-700">{summary.eventosPagados}</div>
              <div className="text-sm text-blue-600">Eventos Pagados</div>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-yellow-600" />
            <div>
              <div className="text-lg font-bold text-yellow-700">{summary.eventosPendientes}</div>
              <div className="text-sm text-yellow-600">Eventos Pendientes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Profitability Analysis */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Análisis de Rentabilidad</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Margen Promedio</span>
              <span className={`text-lg font-bold ${
                summary.margenPromedio >= 20 ? 'text-green-600' :
                summary.margenPromedio >= 10 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {summary.margenPromedio.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  summary.margenPromedio >= 20 ? 'bg-green-500' :
                  summary.margenPromedio >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(summary.margenPromedio, 100)}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Eventos totales:</span>
                <span className="font-medium">{events.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Eventos pagados:</span>
                <span className="font-medium text-green-600">{summary.eventosPagados}</span>
              </div>
              <div className="flex justify-between">
                <span>Eventos pendientes:</span>
                <span className="font-medium text-yellow-600">{summary.eventosPendientes}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Tasa de pago:</span>
                <span className="font-medium">
                  {events.length > 0 ? ((summary.eventosPagados / events.length) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Information */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Crediticia</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Días de Crédito</label>
            <p className="text-2xl font-bold text-gray-900 mt-1">{client.dias_credito}</p>
            <p className="text-sm text-gray-600">días</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Límite de Crédito</label>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(client.limite_credito || 0)}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Crédito Utilizado</label>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {formatCurrency(summary.eventosPendientes * 10000)} {/* Mock calculation */}
            </p>
            <p className="text-sm text-gray-600">
              {client.limite_credito > 0 ? 
                `${((summary.eventosPendientes * 10000 / client.limite_credito) * 100).toFixed(1)}% utilizado` :
                'Sin límite'
              }
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};