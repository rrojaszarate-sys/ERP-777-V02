import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle,
  AlertCircle, FileText, ArrowRight,
  BarChart3, PieChart, Activity
} from 'lucide-react';
import { supabase } from '../../core/config/supabase';
import { formatCurrency } from '../../shared/utils/formatters';
import { LoadingSpinner } from '../../shared/components/ui/LoadingSpinner';
import IngresosDetailModal from './modals/IngresosDetailModal';
import GastosDetailModal from './modals/GastosDetailModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';

interface ResumenFinanciero {
  ingresosPendientes: number;
  ingresosFacturados: number;
  ingresosCobrados: number;
  gastosPendientes: number;
  gastosComprobados: number;
  gastosPagados: number;
  countIngresosPendientes: number;
  countIngresosFacturados: number;
  countIngresosCobrados: number;
  countGastosPendientes: number;
  countGastosComprobados: number;
  countGastosPagados: number;
}

export const ContabilidadDashboard: React.FC = () => {
  const [showIngresosModal, setShowIngresosModal] = useState(false);
  const [showGastosModal, setShowGastosModal] = useState(false);
  const [ingresosType, setIngresosType] = useState<'pendientes' | 'facturados' | 'cobrados'>('pendientes');
  const [gastosType, setGastosType] = useState<'pendientes' | 'comprobados' | 'pagados'>('pendientes');

  // Fetch resumen financiero
  const { data: resumen, isLoading } = useQuery({
    queryKey: ['resumen-financiero'],
    queryFn: async (): Promise<ResumenFinanciero> => {
      // Ingresos pendientes
      const { data: ingPend } = await supabase
        .from('evt_ingresos')
        .select('total')
        .eq('activo', true)
        .eq('cobrado', false)
        .eq('facturado', false);

      // Ingresos facturados
      const { data: ingFact } = await supabase
        .from('evt_ingresos')
        .select('total')
        .eq('activo', true)
        .eq('facturado', true)
        .eq('cobrado', false);

      // Ingresos cobrados
      const { data: ingCob } = await supabase
        .from('evt_ingresos')
        .select('total')
        .eq('activo', true)
        .eq('cobrado', true);

      // Gastos pendientes
      const { data: gastPend } = await supabase
        .from('evt_gastos')
        .select('total')
        .eq('activo', true)
        .eq('pagado', false)
        .eq('comprobado', false);

      // Gastos comprobados
      const { data: gastComp } = await supabase
        .from('evt_gastos')
        .select('total')
        .eq('activo', true)
        .eq('comprobado', true)
        .eq('pagado', false);

      // Gastos pagados
      const { data: gastPag } = await supabase
        .from('evt_gastos')
        .select('total')
        .eq('activo', true)
        .eq('pagado', true);

      return {
        ingresosPendientes: ingPend?.reduce((sum, i: { total: number }) => sum + (i.total || 0), 0) || 0,
        ingresosFacturados: ingFact?.reduce((sum, i: { total: number }) => sum + (i.total || 0), 0) || 0,
        ingresosCobrados: ingCob?.reduce((sum, i: { total: number }) => sum + (i.total || 0), 0) || 0,
        gastosPendientes: gastPend?.reduce((sum, g: { total: number }) => sum + (g.total || 0), 0) || 0,
        gastosComprobados: gastComp?.reduce((sum, g: { total: number }) => sum + (g.total || 0), 0) || 0,
        gastosPagados: gastPag?.reduce((sum, g: { total: number }) => sum + (g.total || 0), 0) || 0,
        countIngresosPendientes: ingPend?.length || 0,
        countIngresosFacturados: ingFact?.length || 0,
        countIngresosCobrados: ingCob?.length || 0,
        countGastosPendientes: gastPend?.length || 0,
        countGastosComprobados: gastComp?.length || 0,
        countGastosPagados: gastPag?.length || 0,
      };
    },
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Cargando dashboard financiero..." />
      </div>
    );
  }

  const totalIngresos = (resumen?.ingresosPendientes || 0) + (resumen?.ingresosFacturados || 0) + (resumen?.ingresosCobrados || 0);
  const totalGastos = (resumen?.gastosPendientes || 0) + (resumen?.gastosComprobados || 0) + (resumen?.gastosPagados || 0);
  const utilidad = totalIngresos - totalGastos;
  const margen = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;

  // Datos para gráfico de barras
  const chartData = [
    {
      name: 'Pendientes',
      Ingresos: resumen?.ingresosPendientes || 0,
      Gastos: resumen?.gastosPendientes || 0,
    },
    {
      name: 'Proceso',
      Ingresos: resumen?.ingresosFacturados || 0,
      Gastos: resumen?.gastosComprobados || 0,
    },
    {
      name: 'Completados',
      Ingresos: resumen?.ingresosCobrados || 0,
      Gastos: resumen?.gastosPagados || 0,
    },
  ];

  // Datos para gráfico de pie (ingresos)
  const ingresosChartData = [
    { name: 'Pendientes', value: resumen?.ingresosPendientes || 0, color: '#EF4444' },
    { name: 'Facturados', value: resumen?.ingresosFacturados || 0, color: '#F59E0B' },
    { name: 'Cobrados', value: resumen?.ingresosCobrados || 0, color: '#10B981' },
  ];

  // Datos para gráfico de pie (gastos)
  const gastosChartData = [
    { name: 'Pendientes', value: resumen?.gastosPendientes || 0, color: '#EF4444' },
    { name: 'Comprobados', value: resumen?.gastosComprobados || 0, color: '#F59E0B' },
    { name: 'Pagados', value: resumen?.gastosPagados || 0, color: '#10B981' },
  ];

  const handleCardClick = (category: 'ingresos' | 'gastos', type: 'pendientes' | 'facturados' | 'cobrados' | 'comprobados' | 'pagados') => {
    if (category === 'ingresos') {
      setIngresosType(type as 'pendientes' | 'facturados' | 'cobrados');
      setShowIngresosModal(true);
    } else {
      setGastosType(type as 'pendientes' | 'comprobados' | 'pagados');
      setShowGastosModal(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Contabilidad y Finanzas</h1>
          <p className="text-gray-600 mt-1">Resumen financiero y estados de cuenta</p>
        </div>
        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow">
          <Activity className="w-5 h-5 text-green-600" />
          <span className="text-sm text-gray-600">Actualizado en tiempo real</span>
        </div>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90">Total Ingresos</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(totalIngresos)}</p>
          <p className="text-sm opacity-75 mt-2">
            {(resumen?.countIngresosPendientes || 0) + (resumen?.countIngresosFacturados || 0) + (resumen?.countIngresosCobrados || 0)} registros
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90">Total Gastos</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(totalGastos)}</p>
          <p className="text-sm opacity-75 mt-2">
            {(resumen?.countGastosPendientes || 0) + (resumen?.countGastosComprobados || 0) + (resumen?.countGastosPagados || 0)} registros
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`bg-gradient-to-br ${utilidad >= 0 ? 'from-green-500 to-green-600' : 'from-orange-500 to-orange-600'} rounded-lg shadow-lg p-6 text-white`}
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90">Utilidad</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(utilidad)}</p>
          <p className="text-sm opacity-75 mt-2">
            {utilidad >= 0 ? 'Positivo' : 'Negativo'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90">Margen</h3>
          <p className="text-3xl font-bold mt-2">{margen.toFixed(1)}%</p>
          <p className="text-sm opacity-75 mt-2">
            {margen >= 50 ? 'Excelente' : margen >= 30 ? 'Bueno' : 'Bajo'}
          </p>
        </motion.div>
      </div>

      {/* Ingresos - Cards Clickeables */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-green-600" />
          Estados de Ingresos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => handleCardClick('ingresos', 'pendientes')}
            className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 text-red-600" />
              <span className="text-xs font-medium text-red-700 bg-red-200 px-2 py-1 rounded">
                {resumen?.countIngresosPendientes || 0} registros
              </span>
            </div>
            <h3 className="text-sm font-medium text-red-900">🔴 Pendientes</h3>
            <p className="text-2xl font-bold text-red-700 mt-2">{formatCurrency(resumen?.ingresosPendientes || 0)}</p>
            <div className="flex items-center mt-2 text-xs text-red-600">
              <span>Ver detalles</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => handleCardClick('ingresos', 'facturados')}
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-6 h-6 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700 bg-yellow-200 px-2 py-1 rounded">
                {resumen?.countIngresosFacturados || 0} registros
              </span>
            </div>
            <h3 className="text-sm font-medium text-yellow-900">🟡 Facturados</h3>
            <p className="text-2xl font-bold text-yellow-700 mt-2">{formatCurrency(resumen?.ingresosFacturados || 0)}</p>
            <div className="flex items-center mt-2 text-xs text-yellow-600">
              <span>Ver detalles</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => handleCardClick('ingresos', 'cobrados')}
            className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="text-xs font-medium text-green-700 bg-green-200 px-2 py-1 rounded">
                {resumen?.countIngresosCobrados || 0} registros
              </span>
            </div>
            <h3 className="text-sm font-medium text-green-900">🟢 Cobrados</h3>
            <p className="text-2xl font-bold text-green-700 mt-2">{formatCurrency(resumen?.ingresosCobrados || 0)}</p>
            <div className="flex items-center mt-2 text-xs text-green-600">
              <span>Ver detalles</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Gastos - Cards Clickeables */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingDown className="w-6 h-6 mr-2 text-red-600" />
          Estados de Gastos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => handleCardClick('gastos', 'pendientes')}
            className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 text-red-600" />
              <span className="text-xs font-medium text-red-700 bg-red-200 px-2 py-1 rounded">
                {resumen?.countGastosPendientes || 0} registros
              </span>
            </div>
            <h3 className="text-sm font-medium text-red-900">🔴 Pendientes</h3>
            <p className="text-2xl font-bold text-red-700 mt-2">{formatCurrency(resumen?.gastosPendientes || 0)}</p>
            <div className="flex items-center mt-2 text-xs text-red-600">
              <span>Ver detalles</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => handleCardClick('gastos', 'comprobados')}
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700 bg-yellow-200 px-2 py-1 rounded">
                {resumen?.countGastosComprobados || 0} registros
              </span>
            </div>
            <h3 className="text-sm font-medium text-yellow-900">🟡 Comprobados</h3>
            <p className="text-2xl font-bold text-yellow-700 mt-2">{formatCurrency(resumen?.gastosComprobados || 0)}</p>
            <div className="flex items-center mt-2 text-xs text-yellow-600">
              <span>Ver detalles</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => handleCardClick('gastos', 'pagados')}
            className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="text-xs font-medium text-green-700 bg-green-200 px-2 py-1 rounded">
                {resumen?.countGastosPagados || 0} registros
              </span>
            </div>
            <h3 className="text-sm font-medium text-green-900">🟢 Pagados</h3>
            <p className="text-2xl font-bold text-green-700 mt-2">{formatCurrency(resumen?.gastosPagados || 0)}</p>
            <div className="flex items-center mt-2 text-xs text-green-600">
              <span>Ver detalles</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras Comparativo */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Comparativo de Estados
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="Ingresos" fill="#10B981" />
              <Bar dataKey="Gastos" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Pie - Distribución Ingresos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-green-600" />
            Distribución de Ingresos
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie
                data={ingresosChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: unknown) => {
                  const data = entry as { name: string; value: number };
                  return `${data.name}: ${formatCurrency(data.value)}`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {ingresosChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </RechartsPie>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Pie - Distribución Gastos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-red-600" />
            Distribución de Gastos
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie
                data={gastosChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: unknown) => {
                  const data = entry as { name: string; value: number };
                  return `${data.name}: ${formatCurrency(data.value)}`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {gastosChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modals */}
      <IngresosDetailModal
        isOpen={showIngresosModal}
        onClose={() => setShowIngresosModal(false)}
        type={ingresosType}
      />

      <GastosDetailModal
        isOpen={showGastosModal}
        onClose={() => setShowGastosModal(false)}
        type={gastosType}
      />
    </div>
  );
};
