import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Trash2, RefreshCw, AlertTriangle, CheckCircle, 
  Users, Calendar, TrendingDown, TrendingUp, Clock, Zap,
  Shield, Settings, BarChart3, FileText, Loader2, Upload
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthProvider';
import { usePermissions } from '../../core/permissions/usePermissions';
import { Button } from '../../shared/components/ui/Button';
import { Modal } from '../../shared/components/ui/Modal';
import { Badge } from '../../shared/components/ui/Badge';
import { LoadingSpinner } from '../../shared/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';
import { useDatabaseStats, useClearDatabase, useGenerateTestData } from './hooks/useDatabaseAdmin';
import { DocumentUploadTool } from './components/DocumentUploadTool';

export const DatabaseAdminPage: React.FC = () => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [numClients, setNumClients] = useState(10);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const [operationLogs, setOperationLogs] = useState<string[]>([]);
  
  const { user, isDevelopment } = useAuth();
  const { hasPermission } = usePermissions();

  // Check permissions
  const canAdminDatabase = hasPermission('system', 'admin', 'database', '*');

  // IMPORTANTE: Este bypass es SOLO para DESARROLLO. NO DESPLEGAR A PRODUCCIÓN.
  // En desarrollo, permitimos que los usuarios mock realicen acciones de administración sin RLS real.
  const isDevMockUser = user?.id === '00000000-0000-0000-0000-000000000001';
  const hasRLSIssues = isDevMockUser;
  // Para quitar las restricciones de logeo forzoso en desarrollo, forzamos finalHasRLSIssues a false.
  const finalHasRLSIssues = isDevelopment ? false : hasRLSIssues;

  // Use the new hooks
  const { data: stats, isLoading: statsLoading } = useDatabaseStats();
  const clearDatabaseMutation = useClearDatabase();
  const generateTestDataMutation = useGenerateTestData();

  // Progress tracking
  const addLog = (message: string) => {
    setOperationLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleClearDatabase = () => {
    setProgress(0);
    setCurrentOperation('Limpiando base de datos...');
    setOperationLogs([]);
    
    clearDatabaseMutation.mutate((progress, message) => {
      setProgress(progress);
      addLog(message);
    });
  };

  const handleGenerateTestData = () => {
    setProgress(0);
    setCurrentOperation('Generando datos de prueba...');
    setOperationLogs([]);
    
    generateTestDataMutation.mutate({
      numClients,
      onProgress: (progress, message) => {
        setProgress(progress);
        addLog(message);
      }
    });
  };

  // Handle mutation completion
  React.useEffect(() => {
    if (clearDatabaseMutation.isSuccess || generateTestDataMutation.isSuccess) {
      setCurrentOperation('');
      setProgress(0);
    }
    if (clearDatabaseMutation.isError || generateTestDataMutation.isError) {
      setCurrentOperation('');
      setProgress(0);
    }
  }, [clearDatabaseMutation.isSuccess, clearDatabaseMutation.isError, generateTestDataMutation.isSuccess, generateTestDataMutation.isError]);

  // Permission check
  if (!canAdminDatabase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a la administración de base de datos.</p>
        </div>
      </div>
    );
  }

  const isOperationRunning = clearDatabaseMutation.isPending || generateTestDataMutation.isPending;

  // Validate number of clients input
  const handleNumClientsChange = (value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 1) {
      setNumClients(1);
    } else if (num > 1000) {
      setNumClients(1000);
    } else {
      setNumClients(num);
    }
  };

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
            <Database className="w-7 h-7 mr-3 text-mint-600" />
            Administración de Base de Datos
          </h1>
          <p className="text-gray-600 mt-1">
            Herramientas para gestión y mantenimiento de datos del sistema
          </p>
        </div>
        
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-red-600 font-medium">Zona de Administrador</span>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-medium">⚠️ Zona de Alto Riesgo</h3>
            <p className="text-red-700 text-sm mt-1">
              Las operaciones en esta página pueden afectar permanentemente los datos del sistema. 
              Úsalas solo en entornos de desarrollo o con respaldos completos.
            </p>
          </div>
        </div>
      </div>

      {/* RLS Warning Banner */}
      {finalHasRLSIssues && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="text-yellow-800 font-medium">🔒 Limitaciones de Desarrollo</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Las operaciones de base de datos están deshabilitadas en modo desarrollo con usuario mock. 
                Para usar estas funciones, inicia sesión con una cuenta real de Supabase que tenga permisos de administrador.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Tool Modal */}
      {showDocumentUpload && (
        <DocumentUploadTool
          onClose={() => setShowDocumentUpload(false)}
        />
      )}

      {/* Current Database Stats */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Estado Actual de la Base de Datos
          </h3>
        </div>
        
        <div className="p-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" text="Cargando estadísticas..." />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatCard
                title="Clientes"
                value={stats?.clientes || 0}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Eventos"
                value={stats?.eventos || 0}
                icon={Calendar}
                color="green"
              />
              <StatCard
                title="Gastos"
                value={stats?.gastos || 0}
                icon={TrendingDown}
                color="red"
              />
              <StatCard
                title="Ingresos"
                value={stats?.ingresos || 0}
                icon={TrendingUp}
                color="mint"
              />
            </div>
          )}
          
          {stats && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              Última actualización: {formatDate(stats.lastUpdated, true)}
            </div>
          )}
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clear Database */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-red-900 flex items-center">
              <Trash2 className="w-5 h-5 mr-2 text-red-600" />
              Limpiar Base de Datos
            </h3>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">⚠️ Operación Destructiva</h4>
                <p className="text-sm text-red-700">
                  Esta acción eliminará TODOS los registros de clientes, eventos, gastos e ingresos.
                  La estructura de las tablas se mantendrá intacta.
                </p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Clientes a eliminar:</span>
                  <span className="font-medium">{stats?.clientes || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Eventos a eliminar:</span>
                  <span className="font-medium">{stats?.eventos || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gastos a eliminar:</span>
                  <span className="font-medium">{stats?.gastos || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ingresos a eliminar:</span>
                  <span className="font-medium">{stats?.ingresos || 0}</span>
                </div>
              </div>
              
              <Button
                onClick={() => setShowClearConfirm(true)}
                variant="danger"
                disabled={isOperationRunning || finalHasRLSIssues || (stats?.clientes === 0 && stats?.eventos === 0)}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {finalHasRLSIssues ? 'Requiere Login Real' : 'Limpiar Base de Datos'}
              </Button>
            </div>
          </div>
        </div>

        {/* Generate Test Data */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-green-900 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2 text-green-600" />
              Generar Datos de Prueba
            </h3>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">📊 Datos a Generar</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-1">
                      Número de clientes a generar:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={numClients}
                      onChange={(e) => handleNumClientsChange(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={isOperationRunning}
                    />
                    <p className="text-xs text-green-600 mt-1">
                      Valor por defecto: 10 clientes (rango: 1-1000)
                    </p>
                  </div>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• {numClients} clientes con datos fiscales completos</li>
                    <li>• {numClients * 5} eventos (5 por cliente)</li>
                    <li>• {numClients * 5 * 5} gastos (5 por evento)</li>
                    <li>• {numClients * 5 * 2} ingresos (2 por evento)</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">⏱️ Tiempo Estimado</h4>
                <p className="text-sm text-blue-700">
                  Aproximadamente {Math.ceil(numClients / 10)} minuto(s) dependiendo de la velocidad de conexión.
                  El proceso se ejecuta en lotes para evitar timeouts.
                </p>
              </div>
              
              <Button
                onClick={() => setShowGenerateConfirm(true)}
                className="w-full bg-green-500 hover:bg-green-600"
                disabled={isOperationRunning || finalHasRLSIssues}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {finalHasRLSIssues ? 'Requiere Login Real' : 'Generar Datos de Prueba'}
              </Button>
            </div>
          </div>
        </div>

        {/* Document Upload Tool */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-blue-900 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-blue-600" />
              Subir Documentos de Prueba
            </h3>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">🔧 Herramienta Interna</h4>
                <p className="text-sm text-blue-700">
                  Sube documentos PDF de prueba a eventos específicos para testing y desarrollo.
                </p>
                <ul className="text-sm text-blue-700 space-y-1 mt-2">
                  <li>• Solo archivos PDF (máximo 10MB)</li>
                  <li>• Se guardan en Supabase Storage</li>
                  <li>• No requiere validación de estado</li>
                  <li>• Uso exclusivo para desarrollo</li>
                </ul>
              </div>
              
              <Button
                onClick={() => setShowDocumentUpload(true)}
                className="w-full bg-blue-500 hover:bg-blue-600"
                disabled={finalHasRLSIssues}
              >
                <Upload className="w-4 h-4 mr-2" />
                {finalHasRLSIssues ? 'Requiere Login Real' : 'Abrir Herramienta de Documentos'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <AnimatePresence>
        {isOperationRunning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg border shadow-sm"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-mint-600" />
                Progreso de la Operación
              </h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{currentOperation}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <motion.div
                      className="bg-mint-500 h-3 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
                
                {/* Operation Logs */}
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <h4 className="font-medium text-gray-900 mb-2">Log de Operaciones</h4>
                  <div className="space-y-1">
                    {operationLogs.map((log, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xs text-gray-600 font-mono"
                      >
                        {log}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          setShowClearConfirm(false);
          handleClearDatabase();
        }}
        title="Confirmar Limpieza de Base de Datos"
        message="Esta acción eliminará TODOS los datos de clientes, eventos, gastos e ingresos. Esta operación NO se puede deshacer."
        confirmText="SÍ, LIMPIAR TODO"
        type="danger"
        stats={stats}
      />

      <ConfirmationModal
        isOpen={showGenerateConfirm}
        onClose={() => setShowGenerateConfirm(false)}
        onConfirm={() => {
          setShowGenerateConfirm(false);
          handleGenerateTestData();
        }}
        title="Confirmar Generación de Datos de Prueba"
        message={`Se generarán aproximadamente ${numClients + (numClients * 5) + (numClients * 5 * 5) + (numClients * 5 * 2)} registros nuevos (${numClients} clientes, ${numClients * 5} eventos, ${numClients * 5 * 5} gastos, ${numClients * 5 * 2} ingresos). Este proceso puede tomar varios minutos.`}
        confirmText="SÍ, GENERAR DATOS"
        type="warning"
        numClients={numClients}
      />
    </motion.div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
}> = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    mint: 'bg-mint-100 text-mint-800'
  };

  return (
    <div className="text-center">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} mb-3`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
};

// Confirmation Modal Component
const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  type: 'danger' | 'warning';
  stats?: any;
  numClients?: number;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText, type, stats, numClients }) => {
  const [confirmationText, setConfirmationText] = useState('');
  const requiredText = 'CONFIRMAR';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      closeOnBackdrop={false}
    >
     <>
      <div className="p-6">
        <div className={`rounded-lg p-4 mb-6 ${
          type === 'danger' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-start space-x-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${
              type === 'danger' ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <div>
              <p className={`text-sm ${
                type === 'danger' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {message}
              </p>
              
              {stats && type === 'danger' && (
                <div className="mt-3 space-y-1 text-xs">
                  <div>• {stats.clientes.toLocaleString()} clientes serán eliminados</div>
                  <div>• {stats.eventos.toLocaleString()} eventos serán eliminados</div>
                  <div>• {stats.gastos.toLocaleString()} gastos serán eliminados</div>
                  <div>• {stats.ingresos.toLocaleString()} ingresos serán eliminados</div>
                </div>
              )}
              
              {numClients && type === 'warning' && (
                <div className="mt-3 space-y-1 text-xs">
                  <div>• {numClients} clientes serán creados</div>
                  <div>• {numClients * 5} eventos serán creados</div>
                  <div>• {numClients * 5 * 5} gastos serán creados</div>
                  <div>• {numClients * 5 * 2} ingresos serán creados</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Para continuar, escribe <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono">
                {requiredText}
              </code> en el campo de abajo:
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder={requiredText}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            variant={type === 'danger' ? 'danger' : 'primary'}
            disabled={confirmationText !== requiredText}
            className={type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
          >
            {confirmText}
          </Button>
        </div>
      </div>
     </>
    </Modal>
  );
};