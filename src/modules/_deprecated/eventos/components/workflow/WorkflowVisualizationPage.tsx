import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Workflow, RefreshCw, Eye, Settings, Database } from 'lucide-react';
import { useEventStates } from '../../hooks/useEventStates';
import { Button } from '../../../../shared/components/ui/Button';
import { Badge } from '../../../../shared/components/ui/Badge';
import { LoadingSpinner } from '../../../../shared/components/ui/LoadingSpinner';
import { EventWorkflowVisualization } from './EventWorkflowVisualization';

export const WorkflowVisualizationPage: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState<number>(1); // Default to first state
  const { data: states, isLoading, error, refetch } = useEventStates();

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Cargando estados del workflow..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error al cargar los estados</div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Workflow className="w-7 h-7 mr-3 text-mint-600" />
            Flujo de Estados de Eventos
          </h1>
          <p className="text-gray-600 mt-1">
            Visualización del workflow completo con datos en tiempo real desde Supabase
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Badge variant="info" size="md">
            {states?.length || 0} estados activos
          </Badge>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* States Overview */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Database className="w-5 h-5 mr-2 text-blue-600" />
            Estados Configurados (Orden por columna 'orden')
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {states?.map((state) => (
              <motion.div
                key={state.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: state.orden * 0.1 }}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedEventId === state.id 
                    ? 'shadow-md' 
                    : 'hover:shadow-sm'
                }`}
                style={{
                  borderColor: selectedEventId === state.id ? state.color || '#74F1C8' : '#E5E7EB',
                  backgroundColor: selectedEventId === state.id ? `${state.color || '#74F1C8'}10` : '#FFFFFF'
                }}
                onClick={() => setSelectedEventId(state.id)}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: state.color || '#74F1C8' }}
                  >
                    {state.orden}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{state.nombre}</h4>
                    <Badge variant="default" size="sm">
                      ID: {state.id}
                    </Badge>
                  </div>
                </div>
                
                {state.descripcion && (
                  <p className="text-sm text-gray-600 mb-3">
                    {state.descripcion}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Orden: {state.orden}</span>
                  <span>Workflow: {state.workflow_step || 'N/A'}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Workflow Visualization */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Eye className="w-5 h-5 mr-2 text-mint-600" />
              Visualización del Flujo
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Estado actual simulado:</span>
              <Badge 
                variant="info" 
                style={{
                  backgroundColor: `${states?.find(s => s.id === selectedEventId)?.color || '#74F1C8'}20`,
                  color: states?.find(s => s.id === selectedEventId)?.color || '#74F1C8'
                }}
              >
                {states?.find(s => s.id === selectedEventId)?.nombre}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <EventWorkflowVisualization
            currentStateId={selectedEventId}
            showProgress={true}
            interactive={false}
          />
        </div>
      </div>

      {/* Raw Data Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Datos de la Tabla evt_estados</h3>
          <p className="text-sm text-gray-600">Datos directos de Supabase (excluye workflow_step = 0)</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workflow Step</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {states?.map((state) => (
                <tr key={state.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {state.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Badge variant="default" size="sm">
                      {state.orden}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: state.color || '#74F1C8' }}
                      />
                      <span className="text-sm font-medium text-gray-900">{state.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                    {state.descripcion || 'Sin descripción'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: state.color || '#74F1C8' }}
                      />
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {state.color || '#74F1C8'}
                      </code>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {state.workflow_step || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};