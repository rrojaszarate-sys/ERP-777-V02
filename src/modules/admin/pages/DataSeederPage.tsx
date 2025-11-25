import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Play, Trash2, CheckCircle, AlertCircle, Info,
  Loader2, Package, Users, Calendar, DollarSign, FileText,
  TrendingUp, ChevronDown, ChevronRight, Shield, Settings
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { useDataSeeder } from '../hooks/useDataSeeder';

// Definición de módulos del sistema
interface DataModule {
  id: string;
  name: string;
  description: string;
  icon: typeof Database;
  dependencies: string[];
  estimatedRecords: number;
  tables: string[];
  color: string;
}

const DATA_MODULES: DataModule[] = [
  {
    id: 'core',
    name: 'Core del Sistema',
    description: 'Empresas, usuarios y configuración base',
    icon: Settings,
    dependencies: [],
    estimatedRecords: 5,
    tables: ['companies_erp', 'users_erp'],
    color: 'bg-gray-500'
  },
  {
    id: 'catalogos',
    name: 'Catálogos Base',
    description: 'Estados, tipos de eventos, categorías',
    icon: Package,
    dependencies: ['core'],
    estimatedRecords: 30,
    tables: ['estados_erp', 'tipos_eventos_erp', 'categorias_gastos_erp'],
    color: 'bg-purple-500'
  },
  {
    id: 'clientes',
    name: 'Clientes',
    description: '15 clientes mexicanos con datos completos',
    icon: Users,
    dependencies: ['core'],
    estimatedRecords: 15,
    tables: ['clientes_erp', 'contactos_clientes_erp'],
    color: 'bg-blue-500'
  },
  {
    id: 'productos',
    name: 'Productos',
    description: '30 productos variados para eventos',
    icon: Package,
    dependencies: ['core'],
    estimatedRecords: 30,
    tables: ['productos_erp'],
    color: 'bg-teal-500'
  },
  {
    id: 'almacenes',
    name: 'Almacenes',
    description: '8 almacenes diversos en México',
    icon: Package,
    dependencies: ['core'],
    estimatedRecords: 8,
    tables: ['almacenes_erp'],
    color: 'bg-cyan-500'
  },
  {
    id: 'movimientos_inventario',
    name: 'Movimientos Inventario',
    description: '50 movimientos de entrada/salida/ajuste',
    icon: Package,
    dependencies: ['productos', 'almacenes'],
    estimatedRecords: 50,
    tables: ['movimientos_inventario_erp'],
    color: 'bg-orange-500'
  },
  {
    id: 'eventos',
    name: 'Eventos',
    description: '20 eventos distribuidos en 6 meses',
    icon: Calendar,
    dependencies: ['core', 'catalogos', 'clientes'],
    estimatedRecords: 20,
    tables: ['eventos_erp'],
    color: 'bg-green-500'
  },
  {
    id: 'finanzas',
    name: 'Finanzas',
    description: 'Ingresos, gastos y provisiones',
    icon: DollarSign,
    dependencies: ['eventos', 'catalogos'],
    estimatedRecords: 220,
    tables: ['ingresos_erp', 'gastos_erp'],
    color: 'bg-emerald-500'
  },
  {
    id: 'contabilidad',
    name: 'Contabilidad',
    description: 'Plan de cuentas y pólizas contables',
    icon: FileText,
    dependencies: ['core'],
    estimatedRecords: 50,
    tables: ['cuentas_contables_erp', 'polizas_erp'],
    color: 'bg-indigo-500'
  },
  {
    id: 'rrhh',
    name: 'RRHH y Nómina',
    description: 'Empleados, departamentos y nóminas',
    icon: Users,
    dependencies: ['core'],
    estimatedRecords: 25,
    tables: ['empleados_erp', 'departamentos_erp', 'nominas_erp'],
    color: 'bg-pink-500'
  }
];

export const DataSeederPage: React.FC = () => {
  const { user, isDevelopment } = useAuth();
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ timestamp: Date; message: string; type: 'info' | 'success' | 'error' }[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});

  const { seedModule, seedAll, clearAll, getStats } = useDataSeeder();

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
  };

  const toggleModule = (moduleId: string) => {
    const newSelected = new Set(selectedModules);
    if (newSelected.has(moduleId)) {
      newSelected.delete(moduleId);
    } else {
      newSelected.add(moduleId);
      // Auto-select dependencies
      const module = DATA_MODULES.find(m => m.id === moduleId);
      module?.dependencies.forEach(dep => newSelected.add(dep));
    }
    setSelectedModules(newSelected);
  };

  const toggleDetails = (moduleId: string) => {
    const newDetails = new Set(showDetails);
    if (newDetails.has(moduleId)) {
      newDetails.delete(moduleId);
    } else {
      newDetails.add(moduleId);
    }
    setShowDetails(newDetails);
  };

  const handleSeedSelected = async () => {
    if (selectedModules.size === 0) {
      addLog('Selecciona al menos un módulo', 'error');
      return;
    }

    setIsSeeding(true);
    setProgress(0);
    setLogs([]);
    addLog('Iniciando generación de datos...', 'info');

    try {
      const modulesArray = Array.from(selectedModules);
      const totalModules = modulesArray.length;

      for (let i = 0; i < modulesArray.length; i++) {
        const moduleId = modulesArray[i];
        const module = DATA_MODULES.find(m => m.id === moduleId);

        if (module) {
          addLog(`Poblando: ${module.name}`, 'info');
          await seedModule(moduleId);
          addLog(`✓ ${module.name} completado (${module.estimatedRecords} registros)`, 'success');
          setProgress(((i + 1) / totalModules) * 100);
        }
      }

      addLog('¡Generación completada exitosamente!', 'success');
      await refreshStats();
    } catch (error: any) {
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsSeeding(false);
      setProgress(0);
    }
  };

  const handleSeedAll = async () => {
    setIsSeeding(true);
    setProgress(0);
    setLogs([]);
    addLog('Poblando TODA la base de datos...', 'info');

    try {
      for (let i = 0; i < DATA_MODULES.length; i++) {
        const module = DATA_MODULES[i];
        addLog(`Poblando: ${module.name}`, 'info');
        await seedModule(module.id);
        addLog(`✓ ${module.name} completado`, 'success');
        setProgress(((i + 1) / DATA_MODULES.length) * 100);
      }

      addLog('¡Base de datos completamente poblada!', 'success');
      await refreshStats();
    } catch (error: any) {
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsSeeding(false);
      setProgress(0);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('¿Estás seguro de eliminar TODOS los datos de prueba? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsSeeding(true);
    setLogs([]);
    addLog('Limpiando base de datos...', 'info');

    try {
      await clearAll();
      addLog('Base de datos limpiada exitosamente', 'success');
      await refreshStats();
    } catch (error: any) {
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const refreshStats = async () => {
    try {
      const newStats = await getStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    }
  };

  React.useEffect(() => {
    refreshStats();
  }, []);

  if (!isDevelopment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Solo Disponible en Desarrollo</h1>
          <p className="text-gray-600">Esta herramienta solo está disponible en modo desarrollo.</p>
        </div>
      </div>
    );
  }

  const totalEstimatedRecords = Array.from(selectedModules)
    .map(id => DATA_MODULES.find(m => m.id === id)?.estimatedRecords || 0)
    .reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🌱 Generador de Datos de Prueba
            </h1>
            <p className="text-gray-600">
              Pobla la base de datos con información de prueba modular y consistente
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshStats}
              disabled={isSeeding}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Actualizar Stats
            </button>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h3 className="font-semibold text-yellow-800">Modo Desarrollo Activo</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Esta herramienta solo funciona en desarrollo. Los datos generados son ficticios pero realistas.
              <strong className="ml-1">No usar en producción.</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Modules */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Módulos Disponibles</h2>
                <div className="text-sm text-gray-500">
                  {selectedModules.size} de {DATA_MODULES.length} seleccionados
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {DATA_MODULES.map(module => {
                const IconComponent = module.icon;
                const isSelected = selectedModules.has(module.id);
                const isExpanded = showDetails.has(module.id);
                const recordCount = stats[module.id] || 0;

                return (
                  <motion.div
                    key={module.id}
                    className={`border rounded-lg transition-all ${
                      isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleModule(module.id)}
                          disabled={isSeeding}
                          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div
                          className={`w-10 h-10 ${module.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                        >
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{module.name}</h3>
                            <button
                              onClick={() => toggleDetails(module.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>~{module.estimatedRecords} registros</span>
                            {recordCount > 0 && (
                              <span className="text-green-600 font-medium">
                                ✓ {recordCount} existentes
                              </span>
                            )}
                          </div>
                          {module.dependencies.length > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                              <Info className="w-3 h-3" />
                              <span>
                                Requiere: {module.dependencies.map(d => DATA_MODULES.find(m => m.id === d)?.name).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-gray-200"
                          >
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Tablas afectadas:</h4>
                            <div className="flex flex-wrap gap-2">
                              {module.tables.map(table => (
                                <span
                                  key={table}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono"
                                >
                                  {table}
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedModules.size > 0 && (
                  <span>Se crearán aproximadamente <strong>{totalEstimatedRecords}</strong> registros</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClearAll}
                  disabled={isSeeding}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar Todo
                </button>
                <button
                  onClick={handleSeedSelected}
                  disabled={isSeeding || selectedModules.size === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSeeding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Poblando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Poblar Seleccionados
                    </>
                  )}
                </button>
                <button
                  onClick={handleSeedAll}
                  disabled={isSeeding}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  Poblar Todo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Progress & Logs */}
        <div className="space-y-6">
          {/* Progress */}
          {isSeeding && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Progreso</h3>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-center text-sm text-gray-600 mt-2">
                  {Math.round(progress)}%
                </div>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Registro de Operaciones</h3>
              <button
                onClick={() => setLogs([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Limpiar
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay operaciones registradas
                </p>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`text-sm flex items-start gap-2 ${
                      log.type === 'error' ? 'text-red-600' :
                      log.type === 'success' ? 'text-green-600' :
                      'text-gray-600'
                    }`}
                  >
                    {log.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    {log.type === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    {log.type === 'info' && <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <span className="text-xs text-gray-400 mr-2">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      {log.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Estadísticas Actuales</h3>
            <div className="space-y-2">
              {Object.entries(stats).map(([key, value]) => {
                const module = DATA_MODULES.find(m => m.id === key);
                return module ? (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{module.name}</span>
                    <span className="font-semibold text-gray-900">{value}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
