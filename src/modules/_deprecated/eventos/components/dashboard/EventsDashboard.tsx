import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingDown, TrendingUp, Target, Calendar, 
  AlertTriangle, FileText, Paperclip, BarChart3, PieChart,
  Filter, RotateCcw
} from 'lucide-react';
import { useTemporalAnalysis, useExpensesByCategory } from '../../hooks/useEvents';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { KPICard } from './KPICard';
import { Income3DChart } from './Income3DChart';
import { Expense3DChart } from './Expense3DChart';
import { ProfitChart } from './ProfitChart';
import { formatCurrency, formatPercentage, getMonthName } from '../../../../shared/utils/formatters';
import { PageSkeleton } from '../../../../shared/components/ui/LoadingSpinner';
import { Button } from '../../../../shared/components/ui/Button';
import { CheckCircle } from 'lucide-react';

export const EventsDashboard: React.FC = () => {
  const [filters, setFilters] = useState({
    period: 'month' as 'month' | 'quarter' | 'year' | 'custom',
    cliente: '',
    estado: [] as string[],
    origen: 'all' as 'all' | 'with_files' | 'without_files'
  });

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: temporalData } = useTemporalAnalysis(6);
  const { data: expensesByCategory } = useExpensesByCategory();

  const clearFilters = () => {
    setFilters({
      period: 'month',
      cliente: '',
      estado: [],
      origen: 'all'
    });
  };

  if (metricsLoading) return <PageSkeleton />;

  // Show configuration notice if Supabase is not configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isSupabaseConfigured = supabaseUrl && supabaseKey && 
    !supabaseUrl.includes('your-project') && 
    !supabaseKey.includes('your-anon-key');
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Configuration Notice */}
      {!isSupabaseConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg"
        >
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3" />
            <div>
              <h3 className="text-yellow-800 font-medium">
                Modo Demo - Supabase no configurado
              </h3>
              <p className="text-yellow-700 text-sm">
                Los datos mostrados son de demostración. Para conectar con datos reales, configura las variables de entorno de Supabase en el archivo .env
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Eventos</h1>
          <p className="text-gray-600">
            Panel de control empresarial con análisis financiero y gestión de archivos
            {!isSupabaseConfigured && <span className="text-yellow-600"> (Modo Demo)</span>}
          </p>
        </div>
        
        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Período:</span>
          </div>
          
          <select
            value={filters.period}
            onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value as any }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 text-sm"
          >
            <option value="month">Este mes</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Este año</option>
            <option value="custom">Personalizado</option>
          </select>

          <select
            value={filters.origen}
            onChange={(e) => setFilters(prev => ({ ...prev, origen: e.target.value as any }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 text-sm"
          >
            <option value="all">Todos los registros</option>
            <option value="with_files">Con archivos adjuntos</option>
            <option value="without_files">Sin archivos adjuntos</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <KPICard
          title="Ingresos del Mes"
          value={formatCurrency(metrics?.ingresos_totales || 0)}
          change="+12.5% vs mes anterior"
          icon={DollarSign}
          color="mint"
          trend="up"
        />
        
        <KPICard
          title="Gastos del Mes"
          value={formatCurrency(metrics?.gastos_totales || 0)}
          change="-5.2% vs mes anterior"
          icon={TrendingDown}
          color="red"
          trend="down"
        />
        
        <KPICard
          title="Utilidad Neta"
          value={formatCurrency(metrics?.utilidad_total || 0)}
          change={`${formatPercentage(metrics?.margen_promedio || 0)} margen`}
          icon={TrendingUp}
          color="green"
          trend="up"
        />
        
        <KPICard
          title="Tasa de Cobranza"
          value={`${formatPercentage(metrics?.tasa_cobranza || 0)}`}
          change={`${metrics?.pagos_pendientes || 0} pendientes`}
          icon={Target}
          color="blue"
          trend={(metrics?.tasa_cobranza || 0) > 80 ? 'up' : 'down'}
        />
        
        <KPICard
          title="Eventos Activos"
          value={(metrics?.total_eventos || 0).toString()}
          change={`${metrics?.eventos_futuros || 0} futuros`}
          icon={Calendar}
          color="purple"
          trend="neutral"
        />
        
        <KPICard
          title="Pagos Vencidos"
          value={(metrics?.pagos_vencidos || 0).toString()}
          change="Requieren seguimiento"
          icon={AlertTriangle}
          color="orange"
          trend={metrics?.pagos_vencidos ? 'down' : 'neutral'}
        />
        
        <KPICard
          title="Archivos Adjuntos"
          value="47"
          change="Facturas y comprobantes"
          icon={Paperclip}
          color="mint"
          trend="up"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Distribution 3D */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-green-600" />
              Distribución de Ingresos
            </h3>
          </div>
          <div className="p-6">
            <Income3DChart 
              data={{
                cotizado: metrics?.ingresos_totales ? metrics.ingresos_totales * 0.3 : 0,
                aprobado: metrics?.ingresos_totales ? metrics.ingresos_totales * 0.25 : 0,
                facturado: metrics?.ingresos_totales ? metrics.ingresos_totales * 0.25 : 0,
                cobrado: metrics?.ingresos_cobrados || 0
              }}
            />
          </div>
        </div>

        {/* Expenses by Category 3D */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-red-600" />
              Gastos por Categoría
            </h3>
          </div>
          <div className="p-6">
            <Expense3DChart data={expensesByCategory || []} />
          </div>
        </div>
      </div>

      {/* Second Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Trend */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-mint-600" />
              Tendencia de Rentabilidad
            </h3>
          </div>
          <div className="p-6">
            <ProfitChart data={temporalData || []} />
          </div>
        </div>

        {/* File Management */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Paperclip className="w-5 h-5 mr-2 text-blue-600" />
              Gestión de Archivos
            </h3>
          </div>
          <div className="p-6">
            <FileManagementChart />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            className="bg-mint-500 hover:bg-mint-600 h-16 flex-col"
            onClick={() => window.location.href = '/eventos/nuevo'}
          >
            <Calendar className="w-6 h-6 mb-1" />
            Nuevo Evento
          </Button>
          
          <Button
            variant="outline"
            className="h-16 flex-col"
            onClick={() => window.location.href = '/eventos/clientes'}
          >
            <FileText className="w-6 h-6 mb-1" />
            Gestionar Clientes
          </Button>
          
          <Button
            variant="outline"
            className="h-16 flex-col border-mint-200 text-mint-700 hover:bg-mint-50"
            onClick={() => window.location.href = '/eventos/archivos'}
          >
            <Paperclip className="w-6 h-6 mb-1" />
            Gestionar Archivos
          </Button>
          
          <Button
            variant="outline"
            className="h-16 flex-col"
            onClick={() => window.location.href = '/eventos/reportes'}
          >
            <BarChart3 className="w-6 h-6 mb-1" />
            Ver Reportes
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
        </div>
        <div className="p-6">
          <RecentActivity />
        </div>
      </div>
    </motion.div>
  );
};

// Recent Activity Component
const RecentActivity: React.FC = () => {
  const activities = [
    {
      id: 1,
      type: 'ocr_processed',
      description: 'Comprobante procesado automáticamente',
      details: 'Factura de Catering Premium - $15,000',
      timestamp: '2025-01-15T10:30:00Z',
      icon: Paperclip,
      color: 'text-mint-600'
    },
    {
      id: 2,
      type: 'payment_received',
      description: 'Pago recibido',
      details: 'Evento Corporativo XYZ - $85,000',
      timestamp: '2025-01-15T09:15:00Z',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      id: 3,
      type: 'event_created',
      description: 'Nuevo evento creado',
      details: 'Conferencia Tech Summit 2025',
      timestamp: '2025-01-15T08:45:00Z',
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      id: 4,
      type: 'expense_approved',
      description: 'Gasto aprobado',
      details: 'Decoración navideña - $8,500',
      timestamp: '2025-01-14T16:20:00Z',
      icon: CheckCircle,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className={`p-2 rounded-lg bg-gray-100 ${activity.color}`}>
            <activity.icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {activity.description}
            </p>
            <p className="text-sm text-gray-600">
              {activity.details}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(activity.timestamp).toLocaleString('es-MX')}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// File Management Chart Component
const FileManagementChart: React.FC = () => {
  const fileStats = {
    totalFiles: 47,
    invoiceFiles: 23,
    expenseFiles: 24,
    totalSizeMB: 156.7
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <div className="text-lg font-bold text-blue-700">{fileStats.totalFiles}</div>
          <div className="text-xs text-blue-600">Total Archivos</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <div className="text-lg font-bold text-green-700">{fileStats.invoiceFiles}</div>
          <div className="text-xs text-green-600">Facturas PDF</div>
        </div>
        
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <TrendingDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
          <div className="text-lg font-bold text-red-700">{fileStats.expenseFiles}</div>
          <div className="text-xs text-red-600">Comprobantes</div>
        </div>
        
        <div className="text-center p-3 bg-mint-50 rounded-lg">
          <BarChart3 className="w-6 h-6 text-mint-600 mx-auto mb-2" />
          <div className="text-lg font-bold text-mint-700">{fileStats.totalSizeMB}MB</div>
          <div className="text-xs text-mint-600">Tamaño Total</div>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Distribución de Archivos</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Facturas PDF (Ingresos)</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(fileStats.invoiceFiles / fileStats.totalFiles) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">{fileStats.invoiceFiles}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Comprobantes (Gastos)</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${(fileStats.expenseFiles / fileStats.totalFiles) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">{fileStats.expenseFiles}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};