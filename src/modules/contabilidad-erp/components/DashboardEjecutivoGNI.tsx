/**
 * DASHBOARD EJECUTIVO PARA GASTOS NO IMPACTADOS (GNI)
 * Gráficas profesionales para análisis ejecutivo
 * - Filtros por período
 * - Diseño responsivo
 */
import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Treemap
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle,
  AlertTriangle, Users, Building2, Calendar, PieChart as PieChartIcon,
  BarChart3, Activity, X, Filter
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import type { GastoNoImpactadoView } from '../types/gastosNoImpactados';

interface DashboardEjecutivoGNIProps {
  gastos: GastoNoImpactadoView[];
  onClose: () => void;
}

// Formatear moneda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Formatear porcentaje
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export const DashboardEjecutivoGNI: React.FC<DashboardEjecutivoGNIProps> = ({
  gastos,
  onClose,
}) => {
  const { paletteConfig, isDark } = useTheme();

  // Estado para filtro de período
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('todos');

  // Obtener períodos únicos de los gastos
  const periodosDisponibles = useMemo(() => {
    const periodos = [...new Set(gastos.map(g => g.periodo).filter(Boolean))];
    return periodos.sort().reverse();
  }, [gastos]);

  // Filtrar gastos por período
  const gastosFiltrados = useMemo(() => {
    if (periodoFiltro === 'todos') return gastos;
    return gastos.filter(g => g.periodo === periodoFiltro);
  }, [gastos, periodoFiltro]);

  // Colores dinámicos basados en la paleta
  const themeColors = useMemo(() => {
    const shades = paletteConfig.shades;
    return {
      primary: paletteConfig.primary,
      secondary: paletteConfig.secondary,
      accent: paletteConfig.accent,
      // Generar paleta de colores para gráficas
      chartColors: [
        shades[500],
        shades[400],
        shades[600],
        shades[300],
        shades[700],
        shades[200],
        shades[800],
        shades[100],
      ],
      // Colores para estados - usando paleta dinámica
      success: shades[700],  // Tono oscuro para "pagado/correcto"
      warning: shades[400],  // Tono medio para "pendiente"
      danger: shades[200],   // Tono claro para "revisar"
      info: shades[500],
      // Fondos
      cardBg: isDark ? '#1f2937' : '#ffffff',
      chartBg: isDark ? '#374151' : '#f9fafb',
      textPrimary: isDark ? '#f3f4f6' : '#111827',
      textSecondary: isDark ? '#9ca3af' : '#6b7280',
      border: isDark ? '#4b5563' : '#e5e7eb',
      gridColor: isDark ? '#374151' : '#e5e7eb',
    };
  }, [paletteConfig, isDark]);

  // ==================== CÁLCULOS DE DATOS ====================

  // KPIs principales (usando gastosFiltrados)
  const kpis = useMemo(() => {
    const totalGastos = gastosFiltrados.reduce((sum, g) => sum + (g.total || 0), 0);
    const totalPendientes = gastosFiltrados.filter(g => g.status_pago === 'pendiente').reduce((sum, g) => sum + (g.total || 0), 0);
    const totalPagados = gastosFiltrados.filter(g => g.status_pago === 'pagado').reduce((sum, g) => sum + (g.total || 0), 0);
    const cantidadRegistros = gastosFiltrados.length;
    const registrosPendientes = gastosFiltrados.filter(g => g.status_pago === 'pendiente').length;
    const registrosPagados = gastosFiltrados.filter(g => g.status_pago === 'pagado').length;
    const promedioGasto = cantidadRegistros > 0 ? totalGastos / cantidadRegistros : 0;
    const porcentajePagado = totalGastos > 0 ? (totalPagados / totalGastos) * 100 : 0;

    return {
      totalGastos,
      totalPendientes,
      totalPagados,
      cantidadRegistros,
      registrosPendientes,
      registrosPagados,
      promedioGasto,
      porcentajePagado,
    };
  }, [gastosFiltrados]);

  // Datos para gráfica de tendencia mensual (Área)
  const datosTendenciaMensual = useMemo(() => {
    const porMes: Record<string, { mes: string; total: number; pagado: number; pendiente: number; cantidad: number }> = {};

    gastosFiltrados.forEach(g => {
      const mes = g.periodo || g.fecha_gasto?.substring(0, 7) || 'Sin fecha';
      if (!porMes[mes]) {
        porMes[mes] = { mes, total: 0, pagado: 0, pendiente: 0, cantidad: 0 };
      }
      porMes[mes].total += g.total || 0;
      porMes[mes].cantidad += 1;
      if (g.status_pago === 'pagado') {
        porMes[mes].pagado += g.total || 0;
      } else {
        porMes[mes].pendiente += g.total || 0;
      }
    });

    return Object.values(porMes)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12); // Últimos 12 meses
  }, [gastosFiltrados]);

  // Datos para gráfica de distribución por cuenta (Dona)
  const datosPorCuenta = useMemo(() => {
    const porCuenta: Record<string, number> = {};
    gastosFiltrados.forEach(g => {
      const cuenta = g.cuenta || 'Sin clasificar';
      porCuenta[cuenta] = (porCuenta[cuenta] || 0) + (g.total || 0);
    });

    return Object.entries(porCuenta)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [gastosFiltrados]);

  // Datos para Top 10 Proveedores (Barras Horizontales)
  const datosTopProveedores = useMemo(() => {
    const porProveedor: Record<string, { name: string; total: number; cantidad: number }> = {};
    gastosFiltrados.forEach(g => {
      const proveedor = g.proveedor || 'Sin proveedor';
      if (!porProveedor[proveedor]) {
        porProveedor[proveedor] = { name: proveedor, total: 0, cantidad: 0 };
      }
      porProveedor[proveedor].total += g.total || 0;
      porProveedor[proveedor].cantidad += 1;
    });

    return Object.values(porProveedor)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [gastosFiltrados]);

  // Datos para distribución por subcuenta (Treemap)
  const datosTreemap = useMemo(() => {
    const jerarquia: Record<string, Record<string, number>> = {};
    gastosFiltrados.forEach(g => {
      const cuenta = g.cuenta || 'Sin clasificar';
      const subcuenta = g.subcuenta || 'General';
      if (!jerarquia[cuenta]) jerarquia[cuenta] = {};
      jerarquia[cuenta][subcuenta] = (jerarquia[cuenta][subcuenta] || 0) + (g.total || 0);
    });

    return Object.entries(jerarquia).flatMap(([cuenta, subcuentas], idx) =>
      Object.entries(subcuentas).map(([subcuenta, value]) => ({
        name: `${cuenta.substring(0, 15)}... - ${subcuenta.substring(0, 20)}`,
        size: value,
        cuenta,
        subcuenta,
        colorIndex: idx,
      }))
    ).sort((a, b) => b.size - a.size).slice(0, 20);
  }, [gastosFiltrados]);

  // Datos para ejecutivo responsable
  const datosPorEjecutivo = useMemo(() => {
    const porEjecutivo: Record<string, number> = {};
    gastosFiltrados.forEach(g => {
      const ejecutivo = g.ejecutivo || 'Sin asignar';
      porEjecutivo[ejecutivo] = (porEjecutivo[ejecutivo] || 0) + (g.total || 0);
    });

    return Object.entries(porEjecutivo)
      .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [gastosFiltrados]);

  // Datos para forma de pago
  const datosPorFormaPago = useMemo(() => {
    const porFormaPago: Record<string, number> = {};
    gastosFiltrados.forEach(g => {
      const forma = g.forma_pago || 'No especificada';
      porFormaPago[forma] = (porFormaPago[forma] || 0) + (g.total || 0);
    });

    return Object.entries(porFormaPago)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [gastosFiltrados]);

  // Datos para estado de validación (Radial)
  const datosValidacion = useMemo(() => {
    const estados = { correcto: 0, pendiente: 0, revisar: 0 };
    gastosFiltrados.forEach(g => {
      const val = g.validacion || 'pendiente';
      if (val in estados) {
        estados[val as keyof typeof estados] += 1;
      }
    });
    const total = Object.values(estados).reduce((a, b) => a + b, 0);

    return [
      { name: 'Correctos', value: estados.correcto, fill: themeColors.success, percent: total > 0 ? (estados.correcto / total) * 100 : 0 },
      { name: 'Pendientes', value: estados.pendiente, fill: themeColors.warning, percent: total > 0 ? (estados.pendiente / total) * 100 : 0 },
      { name: 'Por revisar', value: estados.revisar, fill: themeColors.danger, percent: total > 0 ? (estados.revisar / total) * 100 : 0 },
    ];
  }, [gastosFiltrados, themeColors]);

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="rounded-lg shadow-lg p-3 border"
        style={{
          backgroundColor: themeColors.cardBg,
          borderColor: themeColors.border,
        }}
      >
        <p className="font-semibold mb-1" style={{ color: themeColors.textPrimary }}>{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="h-full p-2 md:p-4 flex items-center justify-center">
        <div
          className="w-[90vw] h-[90vh] rounded-2xl shadow-2xl overflow-y-auto"
          style={{ backgroundColor: themeColors.cardBg }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})` }}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Dashboard Ejecutivo GNI</h2>
                <p className="text-sm text-white/80">Análisis de Gastos No Impactados</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Filtros - Compacta */}
          <div
            className="px-4 py-2 flex items-center gap-3 border-b"
            style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
          >
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" style={{ color: themeColors.textSecondary }} />
              <span className="text-xs font-medium" style={{ color: themeColors.textSecondary }}>Período:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPeriodoFiltro('todos')}
                className="px-2 py-1 text-xs rounded-md transition-all"
                style={{
                  backgroundColor: periodoFiltro === 'todos' ? themeColors.primary : 'transparent',
                  color: periodoFiltro === 'todos' ? '#fff' : themeColors.textSecondary,
                  border: `1px solid ${periodoFiltro === 'todos' ? themeColors.primary : themeColors.border}`
                }}
              >
                Todos ({gastos.length})
              </button>
              {/* Selector desplegable compacto */}
              <select
                value={periodoFiltro === 'todos' ? '' : periodoFiltro}
                onChange={(e) => setPeriodoFiltro(e.target.value || 'todos')}
                className="px-2 py-1 text-xs rounded-md transition-all cursor-pointer"
                style={{
                  backgroundColor: periodoFiltro !== 'todos' ? themeColors.primary : themeColors.cardBg,
                  color: periodoFiltro !== 'todos' ? '#fff' : themeColors.textSecondary,
                  border: `1px solid ${themeColors.border}`,
                  minWidth: '130px'
                }}
              >
                <option value="">Seleccionar mes...</option>
                {periodosDisponibles.map(periodo => (
                  <option key={periodo} value={periodo}>
                    {periodo} ({gastos.filter(g => g.periodo === periodo).length})
                  </option>
                ))}
              </select>
            </div>
            {periodoFiltro !== 'todos' && (
              <span className="ml-auto text-xs" style={{ color: themeColors.textSecondary }}>
                {gastosFiltrados.length} de {gastos.length}
              </span>
            )}
          </div>

          {/* KPIs Cards */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Gastos */}
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>Total Gastos</span>
                <DollarSign className="w-5 h-5" style={{ color: themeColors.primary }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: themeColors.textPrimary }}>
                {formatCurrency(kpis.totalGastos)}
              </p>
              <p className="text-xs mt-1" style={{ color: themeColors.textSecondary }}>
                {kpis.cantidadRegistros} registros
              </p>
            </div>

            {/* Pendientes */}
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>Pendientes</span>
                <Clock className="w-5 h-5" style={{ color: themeColors.warning }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: themeColors.warning }}>
                {formatCurrency(kpis.totalPendientes)}
              </p>
              <p className="text-xs mt-1" style={{ color: themeColors.textSecondary }}>
                {kpis.registrosPendientes} por pagar
              </p>
            </div>

            {/* Pagados */}
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>Pagados</span>
                <CheckCircle className="w-5 h-5" style={{ color: themeColors.success }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: themeColors.success }}>
                {formatCurrency(kpis.totalPagados)}
              </p>
              <p className="text-xs mt-1" style={{ color: themeColors.textSecondary }}>
                {kpis.registrosPagados} liquidados
              </p>
            </div>

            {/* % Ejecutado */}
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>% Ejecutado</span>
                {kpis.porcentajePagado >= 50 ? (
                  <TrendingUp className="w-5 h-5" style={{ color: themeColors.success }} />
                ) : (
                  <TrendingDown className="w-5 h-5" style={{ color: themeColors.danger }} />
                )}
              </div>
              <p className="text-2xl font-bold" style={{ color: themeColors.primary }}>
                {formatPercent(kpis.porcentajePagado)}
              </p>
              <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: themeColors.border }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(kpis.porcentajePagado, 100)}%`,
                    backgroundColor: themeColors.primary,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Gráficas Row 1 */}
          <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tendencia Mensual (Área) */}
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5" style={{ color: themeColors.primary }} />
                <h3 className="font-semibold" style={{ color: themeColors.textPrimary }}>Tendencia Mensual</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={datosTendenciaMensual}>
                  <defs>
                    <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={themeColors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.gridColor} />
                  <XAxis dataKey="mes" tick={{ fill: themeColors.textSecondary, fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fill: themeColors.textSecondary, fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke={themeColors.primary}
                    fill="url(#gradientArea)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="pagado"
                    name="Pagado"
                    stroke={themeColors.success}
                    fill={themeColors.success}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Distribución por Cuenta (Dona) */}
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon className="w-5 h-5" style={{ color: themeColors.primary }} />
                <h3 className="font-semibold" style={{ color: themeColors.textPrimary }}>Distribución por Cuenta</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={datosPorCuenta}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name.substring(0, 12)}... ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: themeColors.textSecondary }}
                  >
                    {datosPorCuenta.map((_, idx) => (
                      <Cell key={idx} fill={themeColors.chartColors[idx % themeColors.chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráficas Row 2 */}
          <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Proveedores (Barras Horizontales) */}
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5" style={{ color: themeColors.primary }} />
                <h3 className="font-semibold" style={{ color: themeColors.textPrimary }}>Top 10 Proveedores</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={datosTopProveedores} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.gridColor} />
                  <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fill: themeColors.textSecondary, fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fill: themeColors.textSecondary, fontSize: 10 }}
                    tickFormatter={(v) => v.length > 18 ? v.substring(0, 18) + '...' : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]}>
                    {datosTopProveedores.map((_, idx) => (
                      <Cell key={idx} fill={themeColors.chartColors[idx % themeColors.chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Por Ejecutivo (Barras) */}
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5" style={{ color: themeColors.primary }} />
                <h3 className="font-semibold" style={{ color: themeColors.textPrimary }}>Gastos por Ejecutivo</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={datosPorEjecutivo}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.gridColor} />
                  <XAxis dataKey="name" tick={{ fill: themeColors.textSecondary, fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fill: themeColors.textSecondary, fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Total" radius={[4, 4, 0, 0]}>
                    {datosPorEjecutivo.map((_, idx) => (
                      <Cell key={idx} fill={themeColors.chartColors[idx % themeColors.chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráficas Row 3 */}
          <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Forma de Pago (Barras Horizontales - mejor para muchas categorías) */}
            <div
              className="rounded-xl p-4 border lg:col-span-1"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5" style={{ color: themeColors.primary }} />
                <h3 className="font-semibold" style={{ color: themeColors.textPrimary }}>
                  Por Forma de Pago ({datosPorFormaPago.length})
                </h3>
              </div>
              <div style={{ height: Math.max(220, datosPorFormaPago.length * 28 + 40), maxHeight: 400, overflowY: 'auto' }}>
                <ResponsiveContainer width="100%" height={Math.max(200, datosPorFormaPago.length * 28)}>
                  <BarChart data={datosPorFormaPago} layout="vertical" margin={{ left: 5, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={themeColors.gridColor} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                      tick={{ fill: themeColors.textSecondary, fontSize: 9 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fill: themeColors.textSecondary, fontSize: 9 }}
                      tickFormatter={(v) => v.length > 14 ? v.substring(0, 14) + '...' : v}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Total" radius={[0, 4, 4, 0]}>
                      {datosPorFormaPago.map((_, idx) => (
                        <Cell key={idx} fill={themeColors.chartColors[idx % themeColors.chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Estado de Validación (Radial) */}
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" style={{ color: themeColors.primary }} />
                <h3 className="font-semibold" style={{ color: themeColors.textPrimary }}>Estado de Validación</h3>
              </div>
              <div className="space-y-3">
                {datosValidacion.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm" style={{ color: themeColors.textSecondary }}>{item.name}</span>
                      <span className="text-sm font-medium" style={{ color: item.fill }}>
                        {item.value} ({formatPercent(item.percent)})
                      </span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: themeColors.border }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: themeColors.border }}>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: themeColors.textSecondary }}>Total registros</span>
                  <span className="text-sm font-bold" style={{ color: themeColors.textPrimary }}>
                    {datosValidacion.reduce((sum, d) => sum + d.value, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Comparativo Mensual (Barras Apiladas) */}
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: themeColors.chartBg, borderColor: themeColors.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5" style={{ color: themeColors.primary }} />
                <h3 className="font-semibold" style={{ color: themeColors.textPrimary }}>Pagado vs Pendiente</h3>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={datosTendenciaMensual.slice(-6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.gridColor} />
                  <XAxis dataKey="mes" tick={{ fill: themeColors.textSecondary, fontSize: 9 }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fill: themeColors.textSecondary, fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="pagado" name="Pagado" stackId="a" fill={themeColors.success} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pendiente" name="Pendiente" stackId="a" fill={themeColors.warning} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 border-t flex items-center justify-between"
            style={{ borderColor: themeColors.border }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: themeColors.textSecondary }} />
              <span className="text-sm" style={{ color: themeColors.textSecondary }}>
                Datos actualizados • {gastosFiltrados.length} registros analizados
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: themeColors.primary }}
            >
              Cerrar Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEjecutivoGNI;
