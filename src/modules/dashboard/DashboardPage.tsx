import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingDown, TrendingUp, Target, Calendar, 
  AlertTriangle, Users, FileText, Package, ShoppingBag 
} from 'lucide-react';
import { supabase } from '../../core/config/supabase';
import { formatCurrency, formatPercentage } from '../../shared/utils/formatters';
import { LoadingSpinner, PageSkeleton } from '../../shared/components/ui/LoadingSpinner';
import { useDashboardMetrics } from '../eventos/hooks/useDashboardMetrics';
import { eventsService } from '../eventos/services/eventsService';
import { KPICard } from './components/KPICard';
import { Chart3DContainer } from './components/Chart3DContainer';

export const DashboardPage: React.FC = () => {
  const { data: metricas, isLoading, error } = useDashboardMetrics();

  // Datos adicionales para gráficos
  const { data: eventosRecientes } = useQuery({
    queryKey: ['eventos-recientes'],
    queryFn: async () => {
      try {
        const events = await eventsService.getEvents();
        return events.slice(0, 5); // Get 5 most recent events
      } catch (error) {
        console.warn('⚠️ Error fetching recent events:', error);
        return [];
      }
    },
    retry: false
  });

  const { data: gastosCategoria } = useQuery({
    queryKey: ['gastos-categoria'],
    queryFn: async () => {
      // Return mock data when Supabase is not available
      return [
        { name: 'Catering', value: 15000, color: '#EF4444' },
        { name: 'Decoración', value: 8000, color: '#F59E0B' },
        { name: 'Audio/Video', value: 12000, color: '#10B981' },
        { name: 'Personal', value: 20000, color: '#3B82F6' },
        { name: 'Transporte', value: 5000, color: '#8B5CF6' }
      ];
    },
    retry: false
  });

  if (isLoading) return <PageSkeleton />;

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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
          <p className="text-gray-600 mt-1">Panel de control empresarial MADE Events (Modo Demo)</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 mt-4 sm:mt-0">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span>Datos de demostración</span>
        </div>
      </div>

      {/* KPIs Grid - 2 Filas x 4 Columnas */}
      <div className="space-y-6">
        {/* Primera Fila - 4 KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Ingresos Totales"
            value={formatCurrency(metricas?.ingresos_totales || 0)}
            change="+12.5% vs mes anterior"
            icon={DollarSign}
            color="mint"
            trend="up"
          />
          <KPICard
            title="Gastos Totales"
            value={formatCurrency(metricas?.gastos_totales || 0)}
            change="-5.2% vs mes anterior"
            icon={TrendingDown}
            color="red"
            trend="down"
          />
          <KPICard
            title="Utilidad Neta"
            value={formatCurrency(metricas?.utilidad_total || 0)}
            change={`${formatPercentage(metricas?.margen_promedio || 0)} margen`}
            icon={TrendingUp}
            color="green"
            trend="up"
          />
          <KPICard
            title="Tasa de Cobranza"
            value={`${formatPercentage(metricas?.tasa_cobranza || 0)}`}
            change={`${metricas?.pagos_pendientes || 0} pendientes`}
            icon={Target}
            color="blue"
            color="blue"
            trend={(metricas?.tasa_cobranza || 0) > 80 ? 'up' : 'down'}
          />
        </div>

        {/* Segunda Fila - 4 KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Eventos Activos"
            value={(metricas?.total_eventos || 0).toString()}
            change={`${metricas?.eventos_futuros || 0} futuros`}
            icon={Calendar}
            color="purple"
            trend="neutral"
          />
          {/* Placeholders para futura expansión */}
          <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ROI Promedio</p>
                <p className="text-2xl font-bold text-gray-400 mt-1">Próximamente</p>
              </div>
              <div className="p-3 bg-gray-200 rounded-lg">
                <TrendingUp className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Clientes Activos</p>
                <p className="text-2xl font-bold text-gray-400 mt-1">Próximamente</p>
              </div>
              <div className="p-3 bg-gray-200 rounded-lg">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-gray-400 mt-1">Próximamente</p>
              </div>
              <div className="p-3 bg-gray-200 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart3DContainer title="Distribución de Gastos por Categoría">
          <GastosPorCategoria3D data={gastosCategoria || []} />
        </Chart3DContainer>
        
        <Chart3DContainer title="Evolución de Ingresos vs Gastos">
          <IngresosVsGastos3D 
            ingresos={metricas?.ingresos_totales || 0}
            gastos={metricas?.gastos_totales || 0}
          />
        </Chart3DContainer>
      </div>

      {/* Recent Events Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Eventos Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eventosRecientes?.map((evento) => (
                <motion.tr
                  key={evento.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{evento.nombre_proyecto}</div>
                    <div className="text-sm text-gray-500">
                      {evento.responsable_nombre}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {evento.cliente_nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(evento.fecha_evento).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      evento.status_pago === 'pagado' 
                        ? 'bg-green-100 text-green-800'
                        : evento.status_facturacion === 'facturado'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {evento.status_pago}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatCurrency(evento.total || 0)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <QuickStatCard
          icon={AlertTriangle}
          title="Pagos Vencidos"
          value={metricas?.pagos_vencidos || 0}
          color="red"
        />
        <QuickStatCard
          icon={Users}
          title="Clientes Activos"
          value={15} // Esto vendría de otra query
          color="blue"
        />
        <QuickStatCard
          icon={FileText}
          title="Facturas Pendientes"
          value={metricas?.pagos_pendientes || 0}
          color="yellow"
        />
        <QuickStatCard
          icon={Package}
          title="Eventos Este Mes"
          value={8} // Esto vendría de otra query
          color="purple"
        />
      </div>
    </motion.div>
  );
};

// Componente de gráfico 3D con SVG personalizado
const GastosPorCategoria3D: React.FC<{ data: any[] }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="relative h-80 flex items-center justify-center">
      <svg viewBox="0 0 400 300" className="w-full h-full">
        <defs>
          <filter id="shadow3d">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.2"/>
          </filter>
        </defs>
        
        {data.map((item, index) => {
          const angle = (index / data.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 80;
          const x = 200 + Math.cos(angle) * radius;
          const y = 150 + Math.sin(angle) * radius;
          const size = Math.max(20, (item.value / total) * 60);
          
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r={size}
                fill={item.color}
                filter="url(#shadow3d)"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
              <text
                x={x}
                y={y + size + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {item.name}
              </text>
              <text
                x={x}
                y={y + size + 35}
                textAnchor="middle"
                className="text-xs fill-gray-500 font-medium"
              >
                {formatCurrency(item.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const IngresosVsGastos3D: React.FC<{ ingresos: number; gastos: number }> = ({ ingresos, gastos }) => {
  const maxValue = Math.max(ingresos, gastos);
  const ingresosHeight = (ingresos / maxValue) * 200;
  const gastosHeight = (gastos / maxValue) * 200;
  
  return (
    <div className="relative h-80 flex items-center justify-center">
      <svg viewBox="0 0 400 300" className="w-full h-full">
        <defs>
          <linearGradient id="ingresosGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#059669" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="gastosGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#DC2626" stopOpacity="1" />
          </linearGradient>
          <filter id="barShadow">
            <feDropShadow dx="3" dy="5" stdDeviation="4" floodOpacity="0.3"/>
          </filter>
        </defs>
        
        {/* Barras 3D */}
        <g>
          {/* Ingresos */}
          <rect
            x={120}
            y={280 - ingresosHeight}
            width={60}
            height={ingresosHeight}
            fill="url(#ingresosGradient)"
            filter="url(#barShadow)"
          />
          <polygon
            points={`120,${280 - ingresosHeight} 180,${280 - ingresosHeight} 200,${260 - ingresosHeight} 140,${260 - ingresosHeight}`}
            fill="#047857"
          />
          <polygon
            points={`180,${280 - ingresosHeight} 180,280 200,260 200,${260 - ingresosHeight}`}
            fill="#065F46"
          />
          
          {/* Gastos */}
          <rect
            x={220}
            y={280 - gastosHeight}
            width={60}
            height={gastosHeight}
            fill="url(#gastosGradient)"
            filter="url(#barShadow)"
          />
          <polygon
            points={`220,${280 - gastosHeight} 280,${280 - gastosHeight} 300,${260 - gastosHeight} 240,${260 - gastosHeight}`}
            fill="#B91C1C"
          />
          <polygon
            points={`280,${280 - gastosHeight} 280,280 300,260 300,${260 - gastosHeight}`}
            fill="#991B1B"
          />
        </g>
        
        {/* Etiquetas */}
        <text x={150} y={295} textAnchor="middle" className="text-sm fill-gray-700 font-medium">
          Ingresos
        </text>
        <text x={150} y={310} textAnchor="middle" className="text-xs fill-gray-500">
          {formatCurrency(ingresos)}
        </text>
        
        <text x={250} y={295} textAnchor="middle" className="text-sm fill-gray-700 font-medium">
          Gastos
        </text>
        <text x={250} y={310} textAnchor="middle" className="text-xs fill-gray-500">
          {formatCurrency(gastos)}
        </text>
      </svg>
    </div>
  );
};

const QuickStatCard: React.FC<{
  icon: React.ComponentType<any>;
  title: string;
  value: number;
  color: string;
}> = ({ icon: Icon, title, value, color }) => {
  const colorClasses = {
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </div>
    </div>
  );
};